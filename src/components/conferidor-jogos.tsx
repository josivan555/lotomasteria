import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { cn } from "@/lib/utils";
import { Sparkles, Eraser } from "lucide-react";

type Jogo = { dezenas: number[]; score?: number };

type Props = {
  jogos: Jogo[];
  loteriaId: LoteriaId;
  resultadoOficial?: number[] | null;
};

type Ordem = "order" | "hits-desc" | "hits-asc";

export function ConferidorJogos({ jogos, loteriaId, resultadoOficial }: Props) {
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

  // Faixas premiadas por loteria (mínimo premiado até o total)
  const faixas = useMemo(() => {
    const min = Math.min(...cfg.faixas);
    const out: number[] = [];
    for (let k = cfg.tamanho; k >= min; k--) out.push(k);
    return out;
  }, [cfg]);

  const resumo = useMemo(
    () =>
      faixas.map((f) => ({
        faixa: f,
        qtd: conferidos.filter((j) => j.acertos === f).length,
      })),
    [faixas, conferidos],
  );

  const completo = selected.size === cfg.tamanho;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5">
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

        <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5 sm:gap-2">
          {Array.from({ length: cfg.total }, (_, i) => i + 1).map((n) => {
            const on = selected.has(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                className={cn(
                  "aspect-square rounded-full border text-[12px] font-bold font-mono transition-all",
                  on
                    ? "border-primary bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/25"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {n.toString().padStart(2, "0")}
              </button>
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

      {selected.size > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {resumo.map((r) => (
            <div
              key={r.faixa}
              className="rounded-xl border border-border/40 bg-card p-3 text-center"
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
                {r.faixa} acertos
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
