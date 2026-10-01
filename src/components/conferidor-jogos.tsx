import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { cn } from "@/lib/utils";
import { Sparkles, Eraser, Trophy } from "lucide-react";
import { formatBRL } from "@/lib/credits-config";

type Jogo = { dezenas: number[]; score?: number; mes_sorte?: number | null; metadata?: { mes_sorte?: number | null } | null };

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const pad = (n: number) => n.toString().padStart(2, "0");

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
  const temMes = loteriaId === "diadesorte";
  const [mesSel, setMesSel] = useState<number | null>(null);

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
      const mes = jogo.mes_sorte ?? jogo.metadata?.mes_sorte ?? null;
      return { ...jogo, dezenas, indice: i + 1, acertos, mes, acertouMes: temMes && mesSel !== null && mes === mesSel };
    });
  }, [jogos, selected, temMes, mesSel]);

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
  const premioMes = useMemo(() => {
    const item = (rateio ?? []).find((r) => /m[eê]s/i.test(r.faixa));
    return item?.premio ?? 2.5;
  }, [rateio]);
  const maxAcertos = selected.size ? Math.max(0, ...conferidos.map((j) => j.acertos)) : -1;
  const qtdMes = conferidos.filter((j) => j.acertouMes).length;
  const totalGanho =
    (completo ? conferidos.reduce((total, jogo) => total + (premiosPorFaixa.get(jogo.acertos) ?? 0), 0) : 0) +
    qtdMes * premioMes;
  const sorteadasOrdenadas = [...selected].sort((a, b) => a - b);

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
            const bloqueado = completo && !on;
            return (
              <Button
                key={n}
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggle(n)}
                disabled={bloqueado}
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full p-0 text-[10px] font-bold font-mono transition-all sm:h-9 sm:w-9 sm:text-[11px]",
                  on
                    ? "border-primary bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/25"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  bloqueado && "opacity-30",
                )}
              >
                {n.toString().padStart(2, "0")}
              </Button>
            );
          })}
        </div>

        {temMes && (
          <div className="mx-auto mt-4 max-w-xl">
            <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mês da Sorte</p>
            <div className="grid grid-cols-6 gap-1.5">
              {MESES.map((m, i) => (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMesSel((cur) => (cur === i + 1 ? null : i + 1))}
                  className={cn(
                    "h-8 px-0 text-[11px] font-black",
                    mesSel === i + 1
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-secondary/30 text-muted-foreground",
                  )}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
        )}

        {(selected.size > 0 || mesSel !== null) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase text-muted-foreground">Sorteadas:</span>
            {sorteadasOrdenadas.map((n) => (
              <span key={n} className="grid h-7 w-7 place-items-center rounded-full bg-primary font-mono text-[11px] font-black text-primary-foreground">
                {pad(n)}
              </span>
            ))}
            {mesSel !== null && (
              <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-black text-primary-foreground">{MESES[mesSel - 1]}</span>
            )}
          </div>
        )}

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Ao completar {cfg.tamanho} dezenas, as demais ficam bloqueadas. Faixas com rateio variam conforme o número de ganhadores.
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelected(new Set());
              setMesSel(null);
            }}
            disabled={selected.size === 0 && mesSel === null}
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
          {totalGanho > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Total ganho nos jogos</p>
              <p className="text-lg font-black text-primary">{formatBRL(totalGanho)}</p>
            </div>
          )}
        </div>
      </div>

      {(selected.size > 0 || mesSel !== null) && (
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
          {temMes && (
            <div className="rounded-lg border border-border/40 bg-card p-3 text-center">
              <div className={cn("font-mono text-xl font-black", qtdMes > 0 ? "text-primary" : "text-muted-foreground/50")}>
                {mesSel !== null ? qtdMes : "–"}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Mês da sorte</div>
              <div className="mt-1 text-[10px] font-bold text-primary">{formatBRL(premioMes)} cada</div>
            </div>
          )}
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

      <div className="space-y-3">
        {listados.map((jogo) => {
          const premiado = completo && jogo.acertos >= Math.min(...cfg.faixas);
          const premioJogo =
            (completo ? (premiosPorFaixa.get(jogo.acertos) ?? 0) : 0) + (jogo.acertouMes ? premioMes : 0);
          const faixaJogo = selected.size > 0 && cfg.faixas.includes(jogo.acertos);
          const topo = selected.size > 0 && jogo.acertos === maxAcertos && jogo.acertos > 0;
          return (
            <div
              key={jogo.indice}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border border-border/50 border-l-4 bg-card p-3 sm:p-4",
                premiado ? "border-l-primary bg-primary/5" : "border-l-border/40",
              )}
            >
              <div className="grid h-9 min-w-11 shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/12 px-2 font-mono text-sm font-black text-primary shadow-sm">
                {jogo.indice.toString().padStart(2, "0")}
              </div>
              {temMes && jogo.mes ? (
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-black",
                    jogo.acertouMes ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/35 text-foreground",
                  )}
                >
                  {MESES[jogo.mes - 1]}
                </span>
              ) : null}
              <div className="flex flex-1 flex-wrap gap-1.5">
                {jogo.dezenas.map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black sm:h-9 sm:w-9",
                      selected.has(n)
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border bg-secondary/35 text-foreground",
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
                    premiado || topo ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {selected.size ? jogo.acertos : "–"}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {faixaJogo ? `${jogo.acertos} pts${premiado ? " · premiado" : ""}` : "acertos"}
                </div>
                {jogo.acertouMes && (
                  <div className="text-[10px] font-black text-primary">+ mês da sorte</div>
                )}
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
