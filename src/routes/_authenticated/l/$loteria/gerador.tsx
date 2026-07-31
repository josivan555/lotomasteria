import { createFileRoute, useRouter, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, ultimoResultadoCaixa } from "@/lib/loterias.functions";
import { salvarJogosComCreditos, meuSaldo } from "@/lib/credits.functions";
import { creditosNecessarios, formatCreditos } from "@/lib/credits-config";

import {
  computeNumberStats,
  gerarJogos,
  classificarScore,
  allNumbers,
  type Filtros,
} from "@/lib/loteria-utils";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bookmark, Dice5, Download, Sparkles, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

const QTD_KEY = "lotomaster:qtd-personalizada";

function lerQtdSalva(loteria: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QTD_KEY);
    if (!raw) return null;
    const v = (JSON.parse(raw) as Record<string, number>)[loteria];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(1, Math.min(500, v)) : null;
  } catch {
    return null;
  }
}

function salvarQtd(loteria: string, qtd: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(QTD_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[loteria] = qtd;
    window.localStorage.setItem(QTD_KEY, JSON.stringify(map));
  } catch {
    /* ignora */
  }
}

export const Route = createFileRoute("/_authenticated/l/$loteria/gerador")({
  component: Gerador,
});

type Result = { dezenas: number[]; score: number };

function InfoLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground transition hover:text-foreground"
            aria-label={`Informações sobre ${label}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-[min(18rem,calc(100vw-2rem))] md:w-72"
        >
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>

        </PopoverContent>
      </Popover>
    </div>
  );
}


function Gerador() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/gerador" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];
  const ballVariant = cfg.ballVariant === "green" ? "default" : cfg.ballVariant;
  const nums = allNumbers(cfg);
  const defaults = cfg.filtrosDefault;

  const listar = useServerFn(listarConcursos);
  const salvarLote = useServerFn(salvarJogosComCreditos);
  const saldoFn = useServerFn(meuSaldo);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: saldo } = useQuery({ queryKey: ["saldo"], queryFn: () => saldoFn({}) });


  const { data: concursos = [] } = useQuery({
    queryKey: ["concursos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const ultimoFn = useServerFn(ultimoResultadoCaixa);
  const { data: ultimoOficial } = useQuery({
    queryKey: ["ultimo-resultado", loteria],
    queryFn: () => ultimoFn({ data: { loteria } }),
    staleTime: 60_000,
  });
  const concursoAlvo =
    ultimoOficial?.proximoConcurso ??
    (ultimoOficial?.numero ? ultimoOficial.numero + 1 : undefined);

  const stats = useMemo(
    () => (concursos.length ? computeNumberStats(cfg, concursos) : null),
    [concursos, cfg],
  );

  const [qtd, setQtd] = useState(10);

  // Carrega a quantidade salva desta loteria e mantém o valor por modalidade
  useEffect(() => {
    setQtd(lerQtdSalva(loteria) ?? 10);
  }, [loteria]);

  function alterarQtd(v: number) {
    const n = Math.max(1, Math.min(500, Math.round(v)));
    setQtd(n);
    salvarQtd(loteria, n);
  }

  const [tamanho, setTamanho] = useState(cfg.tamanho);
  const [somaMin, setSomaMin] = useState(defaults.somaMin);
  const [somaMax, setSomaMax] = useState(defaults.somaMax);
  const [paresMin, setParesMin] = useState(defaults.paresMin);
  const [paresMax, setParesMax] = useState(defaults.paresMax);
  const [maxConsecutivas, setMaxConsecutivas] = useState(defaults.maxConsecutivas);
  const [molduraMin, setMolduraMin] = useState(defaults.molduraMin ?? 0);
  const [molduraMax, setMolduraMax] = useState(defaults.molduraMax ?? cfg.tamanho);
  const [incluir, setIncluir] = useState<number[]>([]);
  const [excluir, setExcluir] = useState<number[]>([]);
  const [repetirMin, setRepetirMin] = useState(defaults.repetirAnteriorMin);
  const [repetirMax, setRepetirMax] = useState(defaults.repetirAnteriorMax);

  const [resultados, setResultados] = useState<Result[]>([]);

  function toggle(list: number[], set: (v: number[]) => void, n: number) {
    set(list.includes(n) ? list.filter((x) => x !== n) : [...list, n]);
  }

  function autoConfigurarIA() {
    if (!concursos.length) {
      toast.error("Sincronize o histórico primeiro.");
      return;
    }
    // Coleta métricas históricas
    const somas: number[] = [];
    const pares: number[] = [];
    const repeats: number[] = [];
    const molduras: number[] = [];
    const consecs: number[] = [];
    const molduraSet = new Set(cfg.moldura ?? []);
    for (let i = 0; i < concursos.length; i++) {
      const d = [...concursos[i].dezenas].sort((a, b) => a - b);
      somas.push(d.reduce((s, n) => s + n, 0));
      pares.push(d.filter((n) => n % 2 === 0).length);
      if (molduraSet.size) molduras.push(d.filter((n) => molduraSet.has(n)).length);
      let maxSeq = 1, cur = 1;
      for (let k = 1; k < d.length; k++) {
        if (d[k] === d[k - 1] + 1) { cur++; maxSeq = Math.max(maxSeq, cur); } else cur = 1;
      }
      consecs.push(maxSeq);
      if (i < concursos.length - 1) {
        const prev = new Set(concursos[i + 1].dezenas);
        repeats.push(d.filter((n) => prev.has(n)).length);
      }
    }
    const mean = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
    const std = (a: number[]) => {
      const m = mean(a);
      return Math.sqrt(a.reduce((s, n) => s + (n - m) ** 2, 0) / a.length);
    };
    // Tolerância aumenta com a quantidade (mais jogos = filtros mais amplos)
    const tol =
      qtd <= 2 ? 0.6 : qtd <= 5 ? 0.9 : qtd <= 10 ? 1.2 : qtd <= 50 ? 1.6 : qtd <= 100 ? 2.0 : 2.5;

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
    const somaM = mean(somas), somaS = std(somas);
    setSomaMin(clamp(somaM - tol * somaS, 1, 9999));
    setSomaMax(clamp(somaM + tol * somaS, 1, 9999));

    const parM = mean(pares), parS = std(pares);
    setParesMin(clamp(parM - tol * parS, 0, cfg.tamanho));
    setParesMax(clamp(parM + tol * parS, 0, cfg.tamanho));

    if (cfg.moldura && molduras.length) {
      const mM = mean(molduras), mS = std(molduras);
      setMolduraMin(clamp(mM - tol * mS, 0, cfg.tamanho));
      setMolduraMax(clamp(mM + tol * mS, 0, cfg.tamanho));
    }

    if (repeats.length) {
      const rM = mean(repeats), rS = std(repeats);
      setRepetirMin(clamp(rM - tol * rS, 0, cfg.tamanho));
      setRepetirMax(clamp(rM + tol * rS, 0, cfg.tamanho));
    }

    const cM = mean(consecs), cS = std(consecs);
    setMaxConsecutivas(clamp(cM + tol * cS, 2, 10));

    setIncluir([]);
    setExcluir([]);
    toast.success(`Filtros ajustados pela IA para ${qtd} jogo(s).`);
  }



  const custoCreditos = creditosNecessarios(qtd);
  const saldoAtual = saldo?.balance ?? 0;
  const semSaldo = saldoAtual + 1e-9 < custoCreditos;

  function gerar() {
    if (!stats) {
      toast.error("Sincronize o histórico primeiro.");
      return;
    }
    if (semSaldo) {
      toast.error(
        `Você precisa de ${formatCreditos(custoCreditos)} crédito(s) e tem ${formatCreditos(saldoAtual)}. Compre mais créditos.`,
      );
      return;
    }

    const filtros: Filtros = {
      somaMin,
      somaMax,
      paresMin,
      paresMax,
      maxConsecutivas,
      molduraMin: cfg.moldura ? molduraMin : undefined,
      molduraMax: cfg.moldura ? molduraMax : undefined,
      incluir,
      excluir,
      repetirAnteriorMin: repetirMin,
      repetirAnteriorMax: repetirMax,
    };
    const anterior = concursos[0]?.dezenas;
    const jogos = gerarJogos(cfg, qtd, stats.scores, filtros, anterior, tamanho);
    if (!jogos.length) {
      toast.error("Nenhum jogo passou nos filtros. Afrouxe algum parâmetro.");
      return;
    }
    const lista = jogos.map((j) => ({ dezenas: j.dezenas, score: j.score }));
    setResultados(lista);
    toast.success(`${jogos.length} jogos gerados. Salvando em Meus Jogos...`);
    salvarTodosMut.mutate(lista);
  }

  const salvarMut = useMutation({
    mutationFn: (r: Result) =>
      salvarLote({
        data: {
          loteria,
          concurso: concursoAlvo,
          jogos: [{ dezenas: r.dezenas, score: r.score }],
        },
      }),
    onSuccess: () => {
      toast.success("Jogo salvo!");
      queryClient.invalidateQueries({ queryKey: ["jogos-salvos"] });
      queryClient.invalidateQueries({ queryKey: ["saldo"] });
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const salvarTodosMut = useMutation({
    mutationFn: (lista: Result[]) =>
      salvarLote({
        data: {
          loteria,
          concurso: concursoAlvo,
          jogos: lista.map((r) => ({ dezenas: r.dezenas, score: r.score })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`${r.salvos} jogos salvos · ${r.custo} crédito(s) usado(s)`);
      queryClient.invalidateQueries({ queryKey: ["jogos-salvos"] });
      queryClient.invalidateQueries({ queryKey: ["saldo"] });
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });



  function exportarCSV() {
    if (!resultados.length) return;
    const csv =
      "score," +
      Array.from({ length: tamanho }, (_, i) => `d${i + 1}`).join(",") +
      "\n" +
      resultados.map((r) => [r.score, ...r.dezenas].join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lotomaster-${cfg.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!concursos.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 text-center text-muted-foreground">
        Sincronize o histórico no{" "}
        <Link to="/l/$loteria/dashboard" params={{ loteria }} className="text-primary hover:underline">
          Dashboard
        </Link>{" "}
        antes de gerar jogos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold md:text-2xl">Gerador Inteligente · {cfg.nome}</h2>
        <p className="text-sm text-muted-foreground">
          Jogos de {cfg.tamanho} dezenas ponderados pelo Score IA, filtrados e ranqueados.{" "}
          <Link to="/resultados" className="text-primary hover:underline">
            Ver últimos resultados
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur md:p-5">

          <div>
            <div className="flex items-center justify-between gap-2">
              <InfoLabel
                label="Quantidade"
                description="Define quantos jogos serão gerados de uma só vez, de 1 até 500."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={autoConfigurarIA}
                className="h-7 gap-1 border-primary/50 text-primary hover:bg-primary/10"
                title="Ajusta os filtros automaticamente com base no histórico e na quantidade escolhida"
              >
                <Sparkles className="h-3.5 w-3.5" /> IA configurar
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[1, 2, 5, 10, 50, 100, 500].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={qtd === v ? "default" : "outline"}
                  onClick={() => alterarQtd(v)}
                >
                  {v}
                </Button>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={qtd}
                  onChange={(e) => {
                    const v = +e.target.value;
                    if (Number.isFinite(v)) alterarQtd(v);
                  }}
                  className="max-w-24 text-center"
                  aria-label="Quantidade personalizada de jogos"
                />
                <span className="text-xs text-muted-foreground">personalizado</span>
              </div>
            </div>
          </div>

          <div>
            <InfoLabel
              label="Dezenas por jogo"
              description={`Quantos números cada jogo terá. Mínimo ${cfg.tamanhoMin}, máximo ${cfg.tamanhoMax}. O padrão da ${cfg.nome} é ${cfg.tamanho}.`}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTamanho((t) => Math.max(cfg.tamanhoMin, t - 1))}
                disabled={tamanho <= cfg.tamanhoMin}
                aria-label="Diminuir dezenas"
              >
                −
              </Button>
              <Input
                type="number"
                value={tamanho}
                min={cfg.tamanhoMin}
                max={cfg.tamanhoMax}
                onChange={(e) => {
                  const v = +e.target.value;
                  if (Number.isFinite(v)) setTamanho(Math.max(cfg.tamanhoMin, Math.min(cfg.tamanhoMax, v)));
                }}
                className="max-w-20 text-center"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTamanho((t) => Math.min(cfg.tamanhoMax, t + 1))}
                disabled={tamanho >= cfg.tamanhoMax}
                aria-label="Aumentar dezenas"
              >
                +
              </Button>
              <span className="text-xs text-muted-foreground">
                {cfg.tamanhoMin}–{cfg.tamanhoMax}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p>
                Aumentar as dezenas por jogo aumenta suas chances de acerto, mas também multiplica o valor que a loteria cobra por esse jogo. Cada dezena extra tem custo adicional.
              </p>
            </div>
          </div>


          <RangeRow
            label="Soma"
            info="Limita a soma total das dezenas do jogo. Apenas jogos cuja soma esteja dentro do intervalo mínimo e máximo são aceitos."
            min={somaMin}
            max={somaMax}
            setMin={setSomaMin}
            setMax={setSomaMax}
          />
          <RangeRow
            label="Pares"
            info="Define quantos números pares devem aparecer em cada jogo, ajudando no equilíbrio entre pares e ímpares."
            min={paresMin}
            max={paresMax}
            setMin={setParesMin}
            setMax={setParesMax}
            minLimit={0}
            maxLimit={cfg.tamanho}
          />
          {cfg.moldura && (
            <RangeRow
              label="Moldura"
              info="Lotofácil: quantas dezenas do jogo devem estar na borda do volante (moldura), um padrão estatístico recorrente nos sorteios."
              min={molduraMin}
              max={molduraMax}
              setMin={setMolduraMin}
              setMax={setMolduraMax}
              minLimit={0}
              maxLimit={cfg.tamanho}
            />
          )}
          <RangeRow
            label="Repetir do anterior"
            info="Quantas dezenas do último concurso oficial devem se repetir no próximo jogo gerado."
            min={repetirMin}
            max={repetirMax}
            setMin={setRepetirMin}
            setMax={setRepetirMax}
            minLimit={0}
            maxLimit={cfg.tamanho}
          />
          <div>
            <InfoLabel
              label="Máx. consecutivas"
              description="Limita o maior grupo de números seguidos permitido no jogo (exemplo: no máximo 3 números consecutivos)."
            />
            <Input
              type="number"
              value={maxConsecutivas}
              min={2}
              max={10}
              onChange={(e) => setMaxConsecutivas(+e.target.value)}
              className="mt-2 max-w-24"
            />
          </div>

          <div>
            <InfoLabel
              label="Incluir sempre"
              description="Dezenas obrigatórias: serão incluídas em todos os jogos gerados."
            />
            <NumbersPicker
              numbers={nums}
              selected={incluir}
              onToggle={(n) => toggle(incluir, setIncluir, n)}
              disabled={excluir}
            />
          </div>

          <div>
            <InfoLabel
              label="Excluir sempre"
              description="Dezenas bloqueadas: nunca aparecerão nos jogos gerados."
            />
            <NumbersPicker
              numbers={nums}
              selected={excluir}
              onToggle={(n) => toggle(excluir, setExcluir, n)}
              disabled={incluir}
              variant="danger"
            />
          </div>

          <Button className="w-full" size="lg" onClick={gerar} disabled={salvarTodosMut.isPending}>
            <Dice5 className="mr-2 h-4 w-4" /> Gerar {qtd} {qtd === 1 ? "jogo" : "jogos"} · {formatCreditos(custoCreditos)} crédito(s)
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Saldo: {formatCreditos(saldoAtual)} crédito(s).{" "}
            {semSaldo ? (
              <Link to="/creditos" className="font-medium text-primary underline">
                Comprar créditos
              </Link>
            ) : (
              <Link to="/creditos" className="underline">
                Gerenciar créditos
              </Link>
            )}
          </p>

        </div>

        <div className="space-y-3">
          {resultados.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={exportarCSV}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bookmark className="h-3.5 w-3.5" />
                {salvarTodosMut.isPending
                  ? "Salvando em Meus Jogos..."
                  : "Salvos automaticamente em Meus Jogos"}
              </span>
            </div>

          )}
          {resultados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              Configure os filtros e clique em Gerar.
            </div>
          ) : (
            <ol className="space-y-2">
              {resultados.map((r, i) => {
                const c = classificarScore(r.score);
                return (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <span className="w-6 shrink-0 text-sm text-muted-foreground tabular-nums sm:w-8">#{i + 1}</span>
                      <div className="flex flex-wrap gap-1">
                        {r.dezenas.map((n) => (
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
                      <div className="text-right">
                        <div className={`text-lg font-bold ${c.color}`}>{r.score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Salvar jogo"
                        onClick={() => salvarMut.mutate(r)}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function RangeRow({
  label,
  info,
  min,
  max,
  setMin,
  setMax,
  minLimit = 0,
  maxLimit = 400,
}: {
  label: string;
  info?: string;
  min: number;
  max: number;
  setMin: (n: number) => void;
  setMax: (n: number) => void;
  minLimit?: number;
  maxLimit?: number;
}) {
  return (
    <div>
      {info ? (
        <InfoLabel label={label} description={info} />
      ) : (
        <Label>{label}</Label>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          value={min}
          min={minLimit}
          max={maxLimit}
          onChange={(e) => setMin(+e.target.value)}
        />
        <span className="text-muted-foreground">até</span>
        <Input
          type="number"
          value={max}
          min={minLimit}
          max={maxLimit}
          onChange={(e) => setMax(+e.target.value)}
        />
      </div>
    </div>
  );
}

function NumbersPicker({
  numbers,
  selected,
  onToggle,
  disabled = [],
  variant = "primary",
}: {
  numbers: number[];
  selected: number[];
  onToggle: (n: number) => void;
  disabled?: number[];
  variant?: "primary" | "danger";
}) {
  return (
    <div className="grid grid-cols-9 gap-1">
      {numbers.map((n) => {
        const isSel = selected.includes(n);
        const isDis = disabled.includes(n);
        return (
          <button
            key={n}
            type="button"
            disabled={isDis}
            onClick={() => onToggle(n)}
            className={`h-8 rounded text-xs font-semibold transition disabled:opacity-30 ${
              isSel
                ? variant === "danger"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70"
            }`}
          >
            {String(n).padStart(2, "0")}
          </button>
        );
      })}
    </div>
  );
}
