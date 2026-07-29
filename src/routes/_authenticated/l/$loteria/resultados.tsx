import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listarJogosSalvos, ultimoResultadoCaixa } from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Download } from "lucide-react";
import { exportarResultadosPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/l/$loteria/resultados")({
  head: () => ({
    meta: [
      { title: "Conferência de resultados · LotoMaster IA" },
      {
        name: "description",
        content:
          "Confira seus jogos salvos contra o resultado do concurso mais recente ou digite as dezenas sorteadas.",
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

  const { data: jogos = [] } = useQuery({
    queryKey: ["jogos-salvos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const { data: resultado } = useQuery({
    queryKey: ["ultimo-resultado", loteria],
    queryFn: () => ultimo({ data: { loteria } }),
    staleTime: 60_000,
  });

  const [manual, setManual] = useState("");
  const drawn = useMemo(() => {
    const parsed = parseNumbers(manual);
    if (parsed.length) return parsed.filter((n) => n <= cfg.total);
    return resultado?.dezenas ?? [];
  }, [manual, resultado, cfg.total]);

  const drawnSet = useMemo(() => new Set(drawn), [drawn]);

  const items = useMemo(() => {
    const base = jogos.map((j, i) => ({
      id: j.id,
      idx: i,
      nome: j.nome,
      nums: j.dezenas,
      hits: j.dezenas.filter((n) => drawnSet.has(n)).length,
    }));
    return drawn.length
      ? base.slice().sort((a, b) => b.hits - a.hits || a.idx - b.idx)
      : base;
  }, [jogos, drawnSet, drawn.length]);

  const maxHits = items.reduce((m, it) => Math.max(m, it.hits), 0);

  const tierDefs =
    loteria === "lotofacil"
      ? [15, 14, 13, 12, 11]
      : loteria === "megasena"
        ? [6, 5, 4]
        : [5, 4, 3, 2];

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Conferência · {cfg.nome}</h2>
          <p className="text-sm text-muted-foreground">
            Digite as dezenas sorteadas ou confira automaticamente com o último concurso oficial.
          </p>
        </div>
        {jogos.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarResultadosPDF({
                loteriaNome: cfg.nome,
                cor: cfg.cor,
                concurso: resultado
                  ? { numero: resultado.numero, data: resultado.data_apuracao, dezenas: resultado.dezenas }
                  : null,
                sorteadas: drawn,
                itens: items.map((it) => ({ nums: it.nums, hits: it.hits })),
                tierLabel,
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            Resultado do <span style={{ color: cfg.cor }}>concurso</span>
          </h3>
          {resultado && (
            <span className="rounded-md border border-border/60 bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
              Concurso {resultado.numero} · {new Date(resultado.data_apuracao).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={`Digite as ${cfg.tamanho} dezenas sorteadas (ex: ${Array.from({ length: cfg.tamanho }, (_, i) => pad(i + 1)).join(" ")})`}
            className="flex-1 min-w-[240px] font-mono"
          />
          <Button variant="secondary" onClick={() => setManual("")}>
            Limpar
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Deixe em branco para usar o último resultado oficial da Caixa. Números em qualquer ordem, separados por espaço ou vírgula.
        </p>
        {drawn.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Sorteadas:</span>
            <div className="flex flex-wrap gap-1">
              {drawn
                .slice()
                .sort((a, b) => a - b)
                .map((n) => (
                  <DezenaBall key={n} n={n} variant={ballVariant} className="h-8! w-8! text-xs!" />
                ))}
            </div>
          </div>
        )}
      </div>

      {jogos.length > 0 && drawn.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {tierDefs.map((t) => {
            const count = items.filter((it) => it.hits === t).length;
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
              </div>
            );
          })}
        </div>
      )}

      {jogos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Você ainda não salvou jogos desta loteria.{" "}
          <Link to="/l/$loteria/gerador" params={{ loteria }} className="text-primary underline">
            Gerar jogos
          </Link>
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur"
            >
              <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">
                Jogo {pad(i + 1)}
              </span>
              <div className="flex flex-1 flex-wrap gap-1">
                {it.nums.map((n) => {
                  const hit = drawnSet.has(n);
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
                    drawn.length && it.hits === maxHits && it.hits > 0
                      ? { color: cfg.cor }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {drawn.length ? it.hits : "–"}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: cfg.cor }}
                >
                  {drawn.length ? tierLabel(it.hits) : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {resultado && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" />
          Dados oficiais da Caixa Econômica Federal.
        </div>
      )}
    </div>
  );
}
