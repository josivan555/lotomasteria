import { createFileRoute, useRouter, useParams, Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/info-label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  listarJogosSalvos,
  excluirJogo,
  excluirJogosPorIds,
  ultimoResultadoCaixa,
  meuPerfil,
} from "@/lib/loterias.functions";
import { criarBolao } from "@/lib/boloes.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Printer, Trash, ChevronDown, History } from "lucide-react";
import { classificarScore } from "@/lib/loteria-utils";
import { toast } from "sonner";
import { exportarJogosPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/l/$loteria/jogos")({
  component: Jogos,
});

function Jogos() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/jogos" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];
  const ballVariant = cfg.ballVariant === "green" ? "default" : cfg.ballVariant;

  const listar = useServerFn(listarJogosSalvos);
  const excluir = useServerFn(excluirJogo);
  const excluirLote = useServerFn(excluirJogosPorIds);
  const meuPerfilFn = useServerFn(meuPerfil);
  const criarBolaoFn = useServerFn(criarBolao);
  const router = useRouter();

  const { data: userProfile } = useQuery({
    queryKey: ["meu-perfil"],
    queryFn: () => meuPerfilFn(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: jogos = [], isLoading } = useQuery({
    queryKey: ["jogos-salvos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const ultimoFn = useServerFn(ultimoResultadoCaixa);
  const { data: oficial } = useQuery({
    queryKey: ["ultimo-resultado", loteria],
    queryFn: () => ultimoFn({ data: { loteria } }),
    staleTime: 60_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Jogo excluído");
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const delLote = useMutation({
    mutationFn: (ids: string[]) => excluirLote({ data: { ids } }),
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} jogo${ids.length === 1 ? "" : "s"} removido${ids.length === 1 ? "" : "s"}`);
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const mutationCriarBolao = useMutation({
    mutationFn: (payload: any) => criarBolaoFn({ data: payload }),
    onSuccess: () => {
      toast.success("Bolão criado com sucesso!");
      setModalBolao(false);
      setJogosSelecionados([]);
    },
    onError: (e) => toast.error("Erro ao criar bolão: " + e.message),
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(5);

  const [jogosSelecionados, setJogosSelecionados] = useState<string[]>([]);
  const [modalBolao, setModalBolao] = useState(false);
  const [formBolao, setFormBolao] = useState({
    nome: "",
    concursoNumero: 0,
    dataSorteio: "",
    horarioSorteio: "20:00",
    prazoVendas: "",
    totalCotas: 10,
    valorCota: 10,
    premioEstimado: 0,
    horarioEncerramento: "18:00",
  });

  useEffect(() => {
    if (oficial) {
      setFormBolao(prev => ({
        ...prev,
        concursoNumero: (oficial.numero || 0) + 1,
        dataSorteio: oficial.proximoData || "",
        prazoVendas: oficial.proximoData || "",
        premioEstimado: oficial.estimativaProximo || 0,
      }));
    }
  }, [oficial]);


  const jogosFiltrados = useMemo(() => {
    if (!dateFrom && !dateTo) return jogos;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : -Infinity;
    const to = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : Infinity;
    return jogos.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [jogos, dateFrom, dateTo]);

  // Concurso já sorteado mais recente (jogos com alvo <= a esse número vão para o histórico)
  const ultimoSorteado = oficial?.numero ?? null;

  const jogoVigente = (alvo: number | null) =>
    ultimoSorteado == null ? true : alvo != null && alvo > ultimoSorteado;

  const vigentes = useMemo(
    () => jogosFiltrados.filter((j) => jogoVigente(j.concurso_alvo)),
    [jogosFiltrados, ultimoSorteado],
  );

  const historico = useMemo(() => {
    const map = new Map<number, typeof jogos>();
    for (const j of jogosFiltrados) {
      if (jogoVigente(j.concurso_alvo)) continue;
      const key = j.concurso_alvo ?? ultimoSorteado ?? 0;
      const arr = map.get(key) ?? [];
      arr.push(j);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([numero, itens]) => ({ numero, itens }))
      .sort((a, b) => b.numero - a.numero);
  }, [jogosFiltrados, ultimoSorteado]);

  const totalPaginas = Math.max(1, Math.ceil(historico.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const historicoPagina = historico.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina,
  );



  const renderJogo = (j: (typeof jogos)[number], index: number) => {
    const c = j.score != null ? classificarScore(Number(j.score)) : null;
    const isSelected = jogosSelecionados.includes(j.id);

    return (
      <li
        key={j.id}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 backdrop-blur transition-colors ${
          isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-card/60"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  setJogosSelecionados((prev) => Array.from(new Set([...prev, j.id])));
                } else {
                  setJogosSelecionados((prev) => prev.filter((id) => id !== j.id));
                }
              }}
            />
            <span className="w-8 text-center font-mono text-xs font-bold text-muted-foreground">
              #{String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(j.created_at).toLocaleDateString("pt-BR")}
          </span>
          <div className="flex flex-wrap gap-1">
            {j.dezenas.map((n) => (
              <DezenaBall
                key={n}
                n={n}
                variant={ballVariant}
                className="h-7! w-7! text-[11px]! sm:h-8! sm:w-8! sm:text-xs!"
              />
            ))}
            {(() => {
              const md = (j as { metadata?: { mes_sorte?: number; time_coracao?: string } | null }).metadata;
              const MES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
              return (
                <>
                  {md?.mes_sorte ? (
                    <span title="Mês de Sorte (escolhido por estatística)" className="self-center rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                      📅 {MES[md.mes_sorte - 1]}
                    </span>
                  ) : null}
                  {md?.time_coracao ? (
                    <span title="Time do Coração (escolhido por estatística)" className="self-center rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                      ⚽ {md.time_coracao}
                    </span>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {c && j.score != null && (
            <div className="text-right">
              <div className={`text-lg font-bold ${c.color}`}>{Number(j.score).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            aria-label="Excluir jogo"
            onClick={() => del.mutate(j.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </li>
    );
  };

  const handleCriarBolao = () => {
    const gamesToInclude = vigentes
      .filter((j) => jogosSelecionados.includes(j.id))
      .map((j) => ({ dezenas: j.dezenas, score: j.score || undefined }));

    if (gamesToInclude.length === 0) {
      toast.error("Selecione pelo menos um jogo para criar o bolão.");
      return;
    }

    mutationCriarBolao.mutate({
      ...formBolao,
      loteriaId: loteria,
      jogos: gamesToInclude,
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {userProfile?.isAdmin && (
              <Checkbox
                className="h-5 w-5"
                checked={vigentes.length > 0 && jogosSelecionados.length === vigentes.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setJogosSelecionados(vigentes.map((j) => j.id));
                  } else {
                    setJogosSelecionados([]);
                  }
                }}
              />
            )}
            <h2 className="text-xl font-bold md:text-2xl">Meus Jogos · {cfg.nome}</h2>
            <InfoDot
              title="Meus jogos"
              description="Todo jogo gerado é salvo aqui automaticamente e fica ligado ao concurso alvo. Em aberto ficam os concursos ainda não sorteados; os demais vão para o histórico."
              exemplo="Use Gerar volante para imprimir os jogos em aberto no cartão oficial."
              dica="Você pode exportar em PDF ou limpar todos os jogos a qualquer momento."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {jogosFiltrados.length} de {jogos.length} jogos
            {(dateFrom || dateTo) ? " (filtrados)" : " salvos"}
          </p>
        </div>
        {jogos.length > 0 && (
          <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <Label htmlFor="jogos-from" className="text-xs text-muted-foreground">De</Label>
              <Input
                id="jogos-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-full sm:w-[150px]"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <Label htmlFor="jogos-to" className="text-xs text-muted-foreground">Até</Label>
              <Input
                id="jogos-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-full sm:w-[150px]"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Limpar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              disabled={vigentes.length === 0}
              onClick={() =>
                exportarJogosPDF({
                  loteriaNome: cfg.nome,
                  cor: cfg.cor,
                  titulo: "Jogos em aberto",
                  sufixoArquivo: "em-aberto",
                  jogos: vigentes.map((j) => ({
                    dezenas: j.dezenas,
                    score: j.score,
                    created_at: j.created_at,
                  })),
                })
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF (abertos)
            </Button>
            <Button size="sm" asChild className="flex-1 sm:flex-none">
              <Link to="/l/$loteria/volante" params={{ loteria }}>
                <Printer className="mr-2 h-4 w-4" />
                Gerar volante
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 sm:flex-none"
              disabled={vigentes.length === 0 || delLote.isPending}
              onClick={() => {
                if (
                  confirm(
                    `Remover os ${vigentes.length} jogos em aberto da ${cfg.nome}?\n\nO histórico de concursos já sorteados será mantido.`,
                  )
                ) {
                  delLote.mutate(vigentes.map((j) => j.id));
                }
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              Limpar abertos
            </Button>

          </div>
        )}
      </div>

      <Dialog open={modalBolao} onOpenChange={setModalBolao}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Novo Bolão — {cfg.nome}</DialogTitle>
            <DialogDescription>
              Configurar detalhes do bolão para os {jogosSelecionados.length} jogos selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Bolão</Label>
              <Input
                id="nome"
                placeholder="Ex: Bolão da Virada"
                value={formBolao.nome}
                onChange={(e) => setFormBolao({ ...formBolao, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concurso">Concurso</Label>
              <Input
                id="concurso"
                type="number"
                placeholder={oficial ? `Atual: ${oficial.numero}` : "Número do concurso"}
                value={formBolao.concursoNumero || ""}
                onChange={(e) => setFormBolao({ ...formBolao, concursoNumero: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data do Sorteio</Label>
              <Input
                id="data"
                type="date"
                value={formBolao.dataSorteio}
                onChange={(e) => setFormBolao({ ...formBolao, dataSorteio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario">Horário do Sorteio</Label>
              <Input
                id="horario"
                type="time"
                value={formBolao.horarioSorteio}
                onChange={(e) => setFormBolao({ ...formBolao, horarioSorteio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo para Vendas (Data)</Label>
              <Input
                id="prazo"
                type="date"
                value={formBolao.prazoVendas}
                onChange={(e) => setFormBolao({ ...formBolao, prazoVendas: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horarioEncerramento">Horário de Encerramento (Vendas)</Label>
              <Input
                id="horarioEncerramento"
                type="time"
                value={formBolao.horarioEncerramento}
                onChange={(e) => setFormBolao({ ...formBolao, horarioEncerramento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premio">Prêmio Estimado (R$)</Label>
              <Input
                id="premio"
                type="number"
                value={formBolao.premioEstimado}
                onChange={(e) => setFormBolao({ ...formBolao, premioEstimado: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cotas">Total de Cotas</Label>
              <Input
                id="cotas"
                type="number"
                value={formBolao.totalCotas}
                onChange={(e) => setFormBolao({ ...formBolao, totalCotas: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor por Cota (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formBolao.valorCota}
                onChange={(e) => setFormBolao({ ...formBolao, valorCota: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 p-4 border border-border/40">
            <h4 className="mb-2 text-sm font-medium">Jogos Incluídos</h4>
            <ScrollArea className="h-[120px] pr-4">
              <div className="space-y-1">
                {vigentes
                  .filter((j) => jogosSelecionados.includes(j.id))
                  .map((j) => (
                    <div key={j.id} className="flex gap-1">
                      {j.dezenas.map((n) => (
                        <div key={n} className="h-4 w-4 rounded-full bg-primary/20 text-[8px] flex items-center justify-center font-bold">
                          {n}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalBolao(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarBolao} disabled={mutationCriarBolao.isPending}>
              {mutationCriarBolao.isPending ? "Criando..." : "Criar Bolão Público"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : jogos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhum jogo salvo ainda. Gere jogos no Gerador e clique no ícone de marcador.
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                {vigentes.length > 0 && (
                  <Checkbox
                    id="select-all-vigentes"
                    checked={jogosSelecionados.length === vigentes.length && vigentes.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setJogosSelecionados(vigentes.map((j) => j.id));
                      } else {
                        setJogosSelecionados([]);
                      }
                    }}
                  />
                )}
                <h3 className="text-lg font-semibold">Jogos em aberto</h3>
              </div>
              {ultimoSorteado != null && (
                <span className="rounded-md border border-border/60 bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  Concurso atual: {ultimoSorteado + 1}
                </span>
              )}
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {jogosSelecionados.length > 0 && (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {jogosSelecionados.length} selecionado{jogosSelecionados.length === 1 ? "" : "s"}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {vigentes.length} jogo{vigentes.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            {jogosSelecionados.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2">
                <span className="px-2 text-xs text-muted-foreground">Ações em lote:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={delLote.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        `Remover os ${jogosSelecionados.length} jogos selecionados?\n\nEssa ação não pode ser desfeita.`,
                      )
                    ) {
                      delLote.mutate(jogosSelecionados);
                    }
                  }}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Excluir selecionados
                </Button>
                {userProfile?.isAdmin && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 border-primary/40 text-xs"
                    onClick={() => setModalBolao(true)}
                  >
                    <div className="mr-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Gerar Bolão
                  </Button>
                )}
              </div>
            )}
            {vigentes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                Nenhum jogo para o concurso atual. Os jogos de concursos já sorteados ficam no
                histórico abaixo.
              </div>
            ) : (
              <ol className="space-y-2">{vigentes.map((j, i) => renderJogo(j, i))}</ol>
            )}
          </section>

          {historico.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Histórico por concurso</h3>
                <span className="text-xs text-muted-foreground">
                  {historico.length} concurso{historico.length === 1 ? "" : "s"}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Label htmlFor="hist-pp" className="text-xs text-muted-foreground">
                    Por página
                  </Label>
                  <select
                    id="hist-pp"
                    value={porPagina}
                    onChange={(e) => {
                      setPorPagina(Number(e.target.value));
                      setPagina(1);
                    }}
                    className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                {historicoPagina.map((g) => {
                  const open = aberto === g.numero;
                  const datas = g.itens.map((j) => new Date(j.created_at).getTime());
                  const dataRef = datas.length ? new Date(Math.min(...datas)) : null;
                  return (
                    <div
                      key={g.numero}
                      className="overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur"
                    >
                      <div className="flex items-center gap-1 pr-2 hover:bg-secondary/50">
                        <button
                          type="button"
                          onClick={() => setAberto(open ? null : g.numero)}
                          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                        >
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                          />
                          <span className="font-semibold" style={{ color: cfg.cor }}>
                            Concurso {g.numero || "—"}
                          </span>
                          {dataRef && (
                            <span className="text-xs text-muted-foreground">
                              {dataRef.toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {g.itens.length} jogo{g.itens.length === 1 ? "" : "s"}
                          </span>
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Baixar PDF do concurso ${g.numero}`}
                          onClick={() =>
                            exportarJogosPDF({
                              loteriaNome: cfg.nome,
                              cor: cfg.cor,
                              titulo: `Concurso ${g.numero}`,
                              sufixoArquivo: `concurso-${g.numero}`,
                              jogos: g.itens.map((j) => ({
                                dezenas: j.dezenas,
                                score: j.score,
                                created_at: j.created_at,
                              })),
                            })
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Apagar histórico do concurso ${g.numero}`}
                          disabled={delLote.isPending}
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (
                              confirm(
                                `Apagar os ${g.itens.length} jogos do concurso ${g.numero}?\n\nEssa ação não pode ser desfeita.`,
                              )
                            ) {
                              delLote.mutate(g.itens.map((j) => j.id));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {open && (
                        <ol className="space-y-2 border-t border-border/60 p-3">
                          {g.itens.map((j, i) => renderJogo(j, i))}
                        </ol>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-3 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPagina(paginaAtual - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => setPagina(paginaAtual + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </section>
          )}

        </div>
      )}
    </div>

  );
}
