import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { cn } from "@/lib/utils";
import { Sparkles, Eraser, Trophy } from "lucide-react";
import { formatBRL } from "@/lib/credits-config";

type Jogo = { dezenas: number[]; score?: number };

type Props = {
  jogos: Jogo[];
  loteriaId: LoteriaId;
  resultadoOficial?: number[] | null;
  premioEstimado?: number;
  rateio?: { faixa: string; ganhadores: number; premio: number }[] | null;
};

type Ordem = "order" | "hits-desc" | "hits-asc";

export function ConferidorJogos({ jogos, loteriaId, resultadoOficial, premioEstimado = 0, rateio }: Props) {
  const cfg = LOTERIAS[loteriaId];
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(resultadoOficial ?? []),
  );
  const [ordem, setOrdem] = useState<Ordem>("order");

  // Sync with official result if it arrives after initial mount
  useEffect(() => {
    if (Array.isArray(resultadoOficial) && resultadoOficial.length > 0) {
      setSelected(new Set(resultadoOficial));
    }
  }, [resultadoOficial]);

  const toggle = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else if (next.size < cfg.tamanho) next.add(n);
      return next;
    });
  };

  const conferidos = useMemo(() => {
    return jogos.map((jogo, i) => {
      const dezenas = jogo.dezenas ?? [];
      const acertos = dezenas.filter((d) => selected.has(d)).length;
      return { ...jogo, dezenas, indice: i + 1, acertos };
    });
  }, [jogos, selected]);

  const listados = useMemo(() => {
    const arr = [...conferidos];
    if (ordem === "hits-desc") arr.sort((a, b) => b.acertos - a.acertos);
    if (ordem === "hits-asc") arr.sort((a, b) => a.acertos - b.acertos);
    return arr;
  }, [conferidos, ordem]);

  const faixas = cfg.faixas;

  const resumo = useMemo(
    () =>
      faixas.map((f) => ({
        faixa: f,
        qtd: conferidos.filter((j) => j.acertos === f).length,
      })),
    [faixas, conferidos],
  );

  const completo = selected.size === cfg.tamanho;
  const progresso = Math.min(100, (selected.size / cfg.tamanho) * 100);
  const premiosPorFaixa = useMemo(() => {
    const valores = new Map<number, number>();
    for (const [indice, item] of (rateio ?? []).entries()) {
      const numero = Number(item.faixa.match(/\d+/)?.[0]);
      const faixa = cfg.faixas.includes(numero) ? numero : cfg.faixas[indice];
      if (faixa !== undefined) valores.set(faixa, item.premio);
    }
    return valores;
  }, [cfg.faixas, rateio]);
  const totalGanho = completo
    ? conferidos.reduce((total, jogo) => total + (premiosPorFaixa.get(jogo.acertos) ?? 0), 0)
    : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/40 bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black">Dezenas sorteadas</p>
            <p className="text-[11px] text-muted-foreground">
              Toque nos números para marcar o resultado oficial
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            <span className="text-primary font-black">{selected.size}</span>
            <span className="text-muted-foreground">/{cfg.tamanho} marcadas</span>
          </Badge>
        </div>

        <div className="mb-4 rounded-lg border border-border/40 bg-secondary/25 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-muted-foreground">Progresso do resultado</span>
            <span className="font-mono font-black text-primary">{selected.size}/{cfg.tamanho}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_14px_var(--primary)] transition-[width] duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: cfg.total }, (_, i) => i + 1).map((n) => {
            const on = selected.has(n);
            return (
              <Button
                key={n}
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggle(n)}
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full p-0 text-[10px] font-bold font-mono transition-all sm:h-9 sm:w-9 sm:text-[11px]",
                  on
                    ? "border-primary bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/25"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {n.toString().padStart(2, "0")}
              </Button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
          >
            <Eraser className="mr-2 h-3.5 w-3.5" /> Limpar
          </Button>
          {resultadoOficial?.length ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelected(new Set(resultadoOficial))}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" /> Usar resultado oficial
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Prêmio estimado principal</p>
              <p className="text-lg font-black text-primary">{formatBRL(premioEstimado)}</p>
            </div>
          </div>
          {completo && totalGanho > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Total ganho nos jogos</p>
              <p className="text-lg font-black text-primary">{formatBRL(totalGanho)}</p>
            </div>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {resumo.map((r) => (
            <div
              key={r.faixa}
              className="rounded-lg border border-border/40 bg-card p-3 text-center"
            >
              <div
                className={cn(
                  "font-mono text-xl font-black",
                  r.qtd > 0 ? "text-primary" : "text-muted-foreground/50",
                )}
              >
                {r.qtd}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                jogos com {r.faixa} acertos
              </div>
              <div className="mt-1 text-[10px] font-bold text-primary">
                {premiosPorFaixa.has(r.faixa)
                  ? `${formatBRL(premiosPorFaixa.get(r.faixa) ?? 0)} cada`
                  : r.faixa === cfg.faixaPrincipal && premioEstimado > 0
                    ? `estimado ${formatBRL(premioEstimado)}`
                    : "valor após o sorteio"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {jogos.length} jogos conferidos
        </p>
        <select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as Ordem)}
          className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs"
        >
          <option value="order">Ordem original</option>
          <option value="hits-desc">Mais acertos primeiro</option>
          <option value="hits-asc">Menos acertos primeiro</option>
        </select>
      </div>

      <div className="space-y-2">
        {listados.map((jogo) => {
          const premiado = completo && jogo.acertos >= Math.min(...cfg.faixas);
          const premioJogo = completo ? (premiosPorFaixa.get(jogo.acertos) ?? 0) : 0;
          return (
            <div
              key={jogo.indice}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border border-border/30 border-l-4 bg-secondary/20 p-3",
                premiado ? "border-l-primary bg-primary/5" : "border-l-border/40",
              )}
            >
              <div className="w-10 shrink-0 font-mono text-[11px] text-muted-foreground">
                #{jogo.indice.toString().padStart(2, "0")}
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {jogo.dezenas.map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold",
                      selected.has(n)
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border/60 bg-background text-muted-foreground",
                    )}
                  >
                    {n.toString().padStart(2, "0")}
                  </div>
                ))}
              </div>
              <div className="min-w-[70px] text-right">
                <div
                  className={cn(
                    "font-mono text-xl font-black",
                    premiado ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {jogo.acertos}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {premiado ? "premiado" : "acertos"}
                </div>
                {premioJogo > 0 && (
                  <div className="mt-0.5 text-[10px] font-black text-primary">
                    {formatBRL(premioJogo)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
