import { createFileRoute, useRouter, useParams, Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/info-label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listarJogosSalvos,
  excluirJogo,
  excluirJogosPorIds,
  ultimoResultadoCaixa,
} from "@/lib/loterias.functions";
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
  const router = useRouter();

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

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(5);


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

  const renderJogo = (j: (typeof jogos)[number]) => {
    const c = j.score != null ? classificarScore(Number(j.score)) : null;
    return (
      <li
        key={j.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
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


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
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
              disabled={jogosFiltrados.length === 0}
              onClick={() =>
                exportarJogosPDF({
                  loteriaNome: cfg.nome,
                  cor: cfg.cor,
                  jogos: jogosFiltrados.map((j) => ({
                    dezenas: j.dezenas,
                    score: j.score,
                    created_at: j.created_at,
                  })),
                })
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
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
              <h3 className="text-lg font-semibold">Jogos em aberto</h3>
              {ultimoSorteado != null && (
                <span className="rounded-md border border-border/60 bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  Concurso atual: {ultimoSorteado + 1}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {vigentes.length} jogo{vigentes.length === 1 ? "" : "s"}
              </span>
            </div>
            {vigentes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                Nenhum jogo para o concurso atual. Os jogos de concursos já sorteados ficam no
                histórico abaixo.
              </div>
            ) : (
              <ol className="space-y-2">{vigentes.map(renderJogo)}</ol>
            )}
          </section>

          {historico.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Histórico por concurso</h3>
              </div>
              <div className="space-y-2">
                {historico.map((g) => {
                  const open = aberto === g.numero;
                  const datas = g.itens.map((j) => new Date(j.created_at).getTime());
                  const dataRef = datas.length ? new Date(Math.min(...datas)) : null;
                  return (
                    <div
                      key={g.numero}
                      className="overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur"
                    >
                      <button
                        type="button"
                        onClick={() => setAberto(open ? null : g.numero)}
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/50"
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
                      {open && (
                        <ol className="space-y-2 border-t border-border/60 p-3">
                          {g.itens.map(renderJogo)}
                        </ol>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>

  );
}
