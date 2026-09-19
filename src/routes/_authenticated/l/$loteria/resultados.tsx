import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listarJogosSalvos,
  ultimoResultadoCaixa,
  resultadoDoConcurso,
} from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Download, Clock, ChevronDown, History } from "lucide-react";
import { exportarResultadosPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/l/$loteria/resultados")({
  head: () => ({
    meta: [
      { title: "Conferência de resultados · LotoMaster IA" },
      {
        name: "description",
        content:
          "Cada jogo é conferido com o resultado do concurso para o qual ele foi gerado, assim que o sorteio acontece.",
      },
    ],
  }),
  component: Resultados,
});

const pad = (n: number) => String(n).padStart(2, "0");

function parseNumbers(str: string): number[] {
  const matches = str.match(/\d+/g) ?? [];
  return [...new Set(matches.map((n) => parseInt(n, 10)).filter((n) => n > 0))];
}

function Resultados() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/resultados" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];
  const ballVariant = cfg.ballVariant === "green" ? "default" : cfg.ballVariant;

  const listar = useServerFn(listarJogosSalvos);
  const ultimo = useServerFn(ultimoResultadoCaixa);
  const porConcurso = useServerFn(resultadoDoConcurso);

  const { data: jogos = [] } = useQuery({
    queryKey: ["jogos-salvos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const { data: oficial } = useQuery({
    queryKey: ["ultimo-resultado", loteria],
    queryFn: () => ultimo({ data: { loteria } }),
    staleTime: 60_000,
  });

  const [manual, setManual] = useState("");
  const [pdfFrom, setPdfFrom] = useState("");
  const [pdfTo, setPdfTo] = useState("");

  const manualNums = useMemo(
    () => parseNumbers(manual).filter((n) => n <= cfg.total),
    [manual, cfg.total],
  );

  // Só considera as dezenas manuais quando a digitação está completa, para os jogos
  // não serem "conferidos" (e recolhidos no histórico) no meio da digitação.
  const manualAplicado = useMemo(
    () => (manualNums.length === cfg.tamanho ? manualNums : []),
    [manualNums, cfg.tamanho],
  );

  // Concursos-alvo distintos dos jogos salvos (jogos antigos sem alvo usam o último oficial)
  const alvos = useMemo(() => {
    const set = new Set<number>();
    for (const j of jogos) {
      const alvo = j.concurso_alvo ?? oficial?.numero ?? null;
      if (alvo) set.add(alvo);
    }
    return [...set].sort((a, b) => b - a);
  }, [jogos, oficial?.numero]);

  const resultadosQueries = useQueries({
    queries: alvos.map((numero) => ({
      queryKey: ["resultado-concurso", loteria, numero],
      queryFn: () => porConcurso({ data: { loteria, numero } }),
      staleTime: 5 * 60_000,
      enabled: !!oficial && numero <= oficial.numero,
    })),
  });

  const resultadoPorNumero = useMemo(() => {
    const map = new Map<
      number,
      NonNullable<Awaited<ReturnType<typeof porConcurso>>>
    >();
    alvos.forEach((numero, i) => {
      const r = resultadosQueries[i]?.data;
      if (r) map.set(numero, r);
    });
    return map;
  }, [alvos, resultadosQueries]);

  const grupos = useMemo(() => {
    const dentroDoFiltro = (createdAt: string) => {
      if (!pdfFrom && !pdfTo) return true;
      const t = new Date(createdAt).getTime();
      const from = pdfFrom ? new Date(pdfFrom + "T00:00:00").getTime() : -Infinity;
      const to = pdfTo ? new Date(pdfTo + "T23:59:59.999").getTime() : Infinity;
      return t >= from && t <= to;
    };

    return alvos.map((numero) => {
      const doGrupo = jogos.filter(
        (j) => (j.concurso_alvo ?? oficial?.numero ?? null) === numero && dentroDoFiltro(j.created_at),
      );
      const res = resultadoPorNumero.get(numero) ?? null;
      // Marcação ao vivo: mesmo parcialmente digitadas, as dezenas já marcam os jogos.
      const sorteadas = manualNums.length ? manualNums : (res?.dezenas ?? []);
      const drawnSet = new Set(sorteadas);
      const aguardando = sorteadas.length === 0;
      // Só vai para o histórico (recolhido) quando o resultado do concurso existe
      // ou quando a digitação manual está completa.
      const noHistorico = !!res || manualAplicado.length > 0;
      const itens = doGrupo
        .map((j, i) => ({
          id: j.id,
          idx: i,
          nums: j.dezenas,
          hits: j.dezenas.filter((n) => drawnSet.has(n)).length,
        }))
        .sort((a, b) => (noHistorico ? b.hits - a.hits || a.idx - b.idx : a.idx - b.idx));
      return { numero, res, sorteadas, drawnSet, aguardando, noHistorico, itens };
    }).filter((g) => g.itens.length > 0);
  }, [alvos, jogos, oficial?.numero, resultadoPorNumero, manualNums, manualAplicado, pdfFrom, pdfTo]);

  const tierDefs = cfg.faixas;

  const tierLabel = (h: number) => {
    if (loteria === "megasena") {
      if (h === 6) return "Sena";
      if (h === 5) return "Quina";
      if (h === 4) return "Quadra";
    } else if (loteria === "quina") {
      if (h === 5) return "Quina";
      if (h === 4) return "Quadra";
      if (h === 3) return "Terno";
      if (h === 2) return "Duque";
    } else {
      if (h >= 11) return `${h} pontos`;
    }
    return "";
  };

  const tierName = (t: number) => {
    if (loteria === "megasena")
      return t === 6 ? "Sena (6)" : t === 5 ? "Quina (5)" : "Quadra (4)";
    if (loteria === "quina")
      return t === 5 ? "Quina (5)" : t === 4 ? "Quadra (4)" : t === 3 ? "Terno (3)" : "Duque (2)";
    return `${t} pontos`;
  };

  const conferidos = grupos.filter((g) => g.noHistorico);
  const emAberto = grupos.filter((g) => !g.noHistorico);
  const podeExportar = conferidos.length > 0;
  const [aberto, setAberto] = useState<number | null>(null);

  const renderGrupo = (g: (typeof grupos)[number]) => {
    const maxHits = g.itens.reduce((m, it) => Math.max(m, it.hits), 0);
    const premioPorAcerto = new Map<number, number>();
    for (const r of g.res?.rateio ?? []) {
      if (r.acertos != null && r.premio > 0) premioPorAcerto.set(r.acertos, r.premio);
    }
    const temPremios = premioPorAcerto.size > 0;
    const totalGanho = g.itens.reduce((s, it) => s + (premioPorAcerto.get(it.hits) ?? 0), 0);
    return (
      <section key={g.numero} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">Concurso {g.numero}</h3>
          {g.aguardando ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary px-2 py-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Aguardando sorteio
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Sorteadas:</span>
              {g.sorteadas
                .slice()
                .sort((a, b) => a - b)
                .map((n) => (
                  <DezenaBall key={n} n={n} variant={ballVariant} className="h-7! w-7! text-[11px]!" />
                ))}
            </div>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {g.itens.length} jogo{g.itens.length > 1 ? "s" : ""}
          </span>
        </div>

        {!g.aguardando && temPremios && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
            style={{ borderColor: `${cfg.cor}55`, backgroundColor: `${cfg.cor}12` }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total ganho neste concurso
            </span>
            <span className="font-mono text-xl font-bold" style={{ color: cfg.cor }}>
              {brl(totalGanho)}
            </span>
          </div>
        )}

        {!g.aguardando && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {tierDefs.map((t) => {
              const count = g.itens.filter((it) => it.hits === t).length;
              const premio = premioPorAcerto.get(t) ?? 0;
              return (
                <div
                  key={t}
                  className="rounded-xl border border-border/60 bg-card/60 p-3 text-center backdrop-blur"
                >
                  <div
                    className={`text-2xl font-bold ${count > 0 ? "" : "text-muted-foreground/40"}`}
                    style={count > 0 ? { color: cfg.cor } : undefined}
                  >
                    {count}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{tierName(t)}</div>
                  {premio > 0 && (
                    <>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {brl(premio)} por jogo
                      </div>
                      {count > 0 && (
                        <div className="text-[11px] font-bold" style={{ color: cfg.cor }}>
                          {brl(premio * count)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <ol className="space-y-2">
          {g.itens.map((it, i) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur"
            >
              <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">
                Jogo {pad(i + 1)}
              </span>
              <div className="flex flex-1 flex-wrap gap-1">
                {it.nums.map((n) => {
                  const hit = !g.aguardando && g.drawnSet.has(n);
                  return (
                    <DezenaBall
                      key={n}
                      n={n}
                      variant={hit ? ballVariant : "muted"}
                      className="h-7! w-7! text-[11px]!"
                    />
                  );
                })}
              </div>
              <div className="ml-auto flex w-16 shrink-0 flex-col items-center">
                <span
                  className="font-mono text-lg font-bold"
                  style={
                    !g.aguardando && it.hits === maxHits && it.hits > 0
                      ? { color: cfg.cor }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {g.aguardando ? "–" : it.hits}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: cfg.cor }}
                >
                  {g.aguardando ? "" : tierLabel(it.hits)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  };


  function baixarPDFGrupo(g: (typeof grupos)[number]) {
    exportarResultadosPDF({
      loteriaNome: cfg.nome,
      cor: cfg.cor,
      concurso: g.res
        ? { numero: g.res.numero, data: g.res.data_apuracao, dezenas: g.res.dezenas }
        : null,
      sorteadas: g.sorteadas,
      itens: g.itens.map((it) => ({ nums: it.nums, hits: it.hits })),
      tierLabel,
    });
  }

  function baixarPDF() {
    const g = conferidos[0];
    if (!g) return;
    baixarPDFGrupo(g);
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold md:text-2xl">Conferência · {cfg.nome}</h2>
          <p className="text-sm text-muted-foreground">
            Cada jogo é conferido com o resultado do concurso em que foi gerado. Jogos de concursos
            ainda não sorteados ficam aguardando.
          </p>
        </div>
        {jogos.length > 0 && (
          <div className="flex w-full flex-wrap items-end gap-2 md:w-auto">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <Label htmlFor="res-from" className="text-xs text-muted-foreground">De</Label>
              <Input
                id="res-from"
                type="date"
                value={pdfFrom}
                onChange={(e) => setPdfFrom(e.target.value)}
                className="h-9 w-full sm:w-[150px]"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
              <Label htmlFor="res-to" className="text-xs text-muted-foreground">Até</Label>
              <Input
                id="res-to"
                type="date"
                value={pdfTo}
                onChange={(e) => setPdfTo(e.target.value)}
                className="h-9 w-full sm:w-[150px]"
              />
            </div>
            {(pdfFrom || pdfTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setPdfFrom(""); setPdfTo(""); }}>
                Limpar
              </Button>
            )}
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={!podeExportar} onClick={baixarPDF}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
          </div>
        )}
      </div>


      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            Conferir com <span style={{ color: cfg.cor }}>dezenas manuais</span>
          </h3>
          {oficial && (
            <span className="rounded-md border border-border/60 bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground md:text-xs">
              Último oficial: concurso {oficial.numero} ·{" "}
              {new Date(oficial.data_apuracao).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={`Digite as ${cfg.tamanho} dezenas sorteadas (ex: ${Array.from({ length: cfg.tamanho }, (_, i) => pad(i + 1)).join(" ")})`}
            className="w-full font-mono sm:w-auto sm:min-w-[240px] sm:flex-1"
          />
          <Button variant="secondary" onClick={() => setManual("")}>
            Limpar
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Deixe em branco para conferir automaticamente cada jogo com o resultado do concurso a que
          ele pertence.
        </p>
      </div>


      {jogos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Você ainda não salvou jogos desta loteria.{" "}
          <Link to="/l/$loteria/gerador" params={{ loteria }} className="text-primary underline">
            Gerar jogos
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {emAberto.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              Nenhum jogo aguardando sorteio. Seus jogos já conferidos estão no histórico abaixo.
            </div>
          )}
          {emAberto.map(renderGrupo)}

          {conferidos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Histórico de conferências</h3>
              </div>
              <div className="space-y-2">
                {conferidos.map((g) => {
                  const open = aberto === g.numero;
                  const melhor = g.itens.reduce((m, it) => Math.max(m, it.hits), 0);
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
                            Concurso {g.numero}
                          </span>
                          {g.res && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(g.res.data_apuracao).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {g.itens.length} jogo{g.itens.length === 1 ? "" : "s"} · melhor {melhor}
                          </span>
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Baixar PDF do concurso ${g.numero}`}
                          title="Baixar PDF deste concurso"
                          onClick={() => baixarPDFGrupo(g)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>

                      {open && <div className="border-t border-border/60 p-3">{renderGrupo(g)}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

      )}

      {oficial && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" />
          Dados oficiais da Caixa Econômica Federal.
        </div>
      )}
    </div>
  );
}
