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
  analisarJogo,
  gridColunas,
  type Filtros,
} from "@/lib/loteria-utils";
import { LOTERIAS, isLoteriaId, type LoteriaConfig } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { useJanelaAnalise, aplicarJanela } from "@/lib/janela-analise";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoLabel, type InfoContent } from "@/components/info-label";
import {
  Bookmark,
  Dice5,
  Download,
  Sparkles,
  AlertTriangle,
  Loader2,
  Grid2x2,
  Circle,
  Calculator,
  RefreshCw,
  LayoutGrid,
  Hash,
  Activity,
  Divide,
  Rows3,
  Columns3,
  Target,
  Ban,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

/* Ícones visuais estilo infográfico para os filtros */
function IconQuantity() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {["1", "2", "5", "10", "50", "100"].map((n, i) => (
        <div
          key={i}
          className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-primary/60 bg-primary/10 text-[7px] font-bold text-primary"
        >
          {n}
        </div>
      ))}
    </div>
  );
}

function IconBalls({ count = 6 }: { count?: number }) {
  return (
    <div className="flex -space-x-1">
      {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
        <div
          key={i}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-[7px] font-bold text-primary shadow-sm"
        >
          {String(10 + i * 13).padStart(2, "0")}
        </div>
      ))}
    </div>
  );
}

function IconSigma() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h14L8 12l10 6H4" />
    </svg>
  );
}

function IconPairBalls() {
  return (
    <div className="flex items-center gap-0.5">
      <div className="h-4 w-4 rounded-full border border-primary/40 bg-primary/15" />
      <div className="h-4 w-4 rounded-full border border-primary/40 bg-primary" />
    </div>
  );
}

function IconConsecBalls() {
  return (
    <div className="flex -space-x-1">
      {[10, 11, 12].map((n) => (
        <div
          key={n}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-[7px] font-bold text-primary"
        >
          {n}
        </div>
      ))}
    </div>
  );
}

type AdvKey =
  | "primos"
  | "fibonacci"
  | "mult3"
  | "linha"
  | "coluna"
  | "miolo"
  | "ausentes"
  | "paresConsec";

type AdvState = Record<AdvKey, { on: boolean; min: number; max: number }>;

function advDefaults(cfg: LoteriaConfig): AdvState {
  const t = cfg.tamanho;
  const cols = gridColunas(cfg);
  const rows = Math.ceil(cfg.total / cols);
  const prop = (a: number, b: number) => ({
    on: false,
    min: Math.max(0, Math.round((a / 15) * t)),
    max: Math.min(t, Math.round((b / 15) * t)),
  });
  const porCel = (divisor: number) => {
    const m = t / divisor;
    return { on: false, min: Math.max(0, Math.floor(m) - 1), max: Math.ceil(m) + 1 };
  };
  return {
    primos: prop(4, 6),
    fibonacci: prop(3, 5),
    mult3: prop(4, 6),
    linha: porCel(rows),
    coluna: porCel(cols),
    miolo: prop(4, 6),
    ausentes: prop(5, 7),
    paresConsec: prop(3, 7),
  };
}


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

// ---- Persistência da configuração completa de filtros por modalidade ----
const CFG_KEY = "lotomaster:config-gerador";

type ConfigSalva = {
  tamanho: number;
  somaMin: number;
  somaMax: number;
  paresMin: number;
  paresMax: number;
  maxConsecutivas: number;
  molduraMin: number;
  molduraMax: number;
  incluir: number[];
  excluir: number[];
  repetirMin: number;
  repetirMax: number;
  adv: AdvState;
};

function lerConfig(loteria: string): Partial<ConfigSalva> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, Partial<ConfigSalva>>;
    return map[loteria] ?? null;
  } catch {
    return null;
  }
}

function salvarConfig(loteria: string, cfgSalva: ConfigSalva) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CFG_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, ConfigSalva>) : {};
    map[loteria] = cfgSalva;
    window.localStorage.setItem(CFG_KEY, JSON.stringify(map));
  } catch {
    /* ignora */
  }
}

export const Route = createFileRoute("/_authenticated/l/$loteria/gerador")({
  component: Gerador,
});

type Result = { dezenas: number[]; score: number };

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


  const { data: concursosAll = [] } = useQuery({
    queryKey: ["concursos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });
  const { janela, setJanela } = useJanelaAnalise(loteria);
  const concursos = useMemo(() => aplicarJanela(concursosAll, janela), [concursosAll, janela]);


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
  const [adv, setAdv] = useState<AdvState>(() => advDefaults(cfg));

  function setAdvField(k: AdvKey, patch: Partial<{ on: boolean; min: number; max: number }>) {
    setAdv((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
  }

  const [resultados, setResultados] = useState<Result[]>([]);
  const [iaPensando, setIaPensando] = useState(false);
  const [configCarregada, setConfigCarregada] = useState<string | null>(null);

  // Ao trocar de modalidade: carrega a configuração salva dela, ou os padrões
  useEffect(() => {
    const s = lerConfig(loteria);
    setTamanho(s?.tamanho ?? cfg.tamanho);
    setSomaMin(s?.somaMin ?? defaults.somaMin);
    setSomaMax(s?.somaMax ?? defaults.somaMax);
    setParesMin(s?.paresMin ?? defaults.paresMin);
    setParesMax(s?.paresMax ?? defaults.paresMax);
    setMaxConsecutivas(s?.maxConsecutivas ?? defaults.maxConsecutivas);
    setMolduraMin(s?.molduraMin ?? defaults.molduraMin ?? 0);
    setMolduraMax(s?.molduraMax ?? defaults.molduraMax ?? cfg.tamanho);
    setIncluir(s?.incluir ?? []);
    setExcluir(s?.excluir ?? []);
    setRepetirMin(s?.repetirMin ?? defaults.repetirAnteriorMin);
    setRepetirMax(s?.repetirMax ?? defaults.repetirAnteriorMax);
    setAdv({ ...advDefaults(cfg), ...(s?.adv ?? {}) });
    setResultados([]);
    setConfigCarregada(loteria);
  }, [loteria]);

  // Salva automaticamente qualquer alteração de filtro desta modalidade
  useEffect(() => {
    if (configCarregada !== loteria) return;
    salvarConfig(loteria, {
      tamanho,
      somaMin,
      somaMax,
      paresMin,
      paresMax,
      maxConsecutivas,
      molduraMin,
      molduraMax,
      incluir,
      excluir,
      repetirMin,
      repetirMax,
      adv,
    });
  }, [
    configCarregada,
    loteria,
    tamanho,
    somaMin,
    somaMax,
    paresMin,
    paresMax,
    maxConsecutivas,
    molduraMin,
    molduraMax,
    incluir,
    excluir,
    repetirMin,
    repetirMax,
    adv,
  ]);



  function toggle(list: number[], set: (v: number[]) => void, n: number) {
    set(list.includes(n) ? list.filter((x) => x !== n) : [...list, n]);
  }

  async function autoConfigurarIA() {
    if (!concursos.length) {
      toast.error("Sincronize o histórico primeiro.");
      return;
    }
    setIaPensando(true);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    try {
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

      // Filtros avançados: faixas calculadas a partir do histórico real
      const amostra = concursos.slice(0, 300);
      const an = amostra.map((c) => analisarJogo(cfg, c.dezenas));
      const faixa = (vals: number[], lo: number, hi: number) => {
        if (!vals.length) return null;
        const m = mean(vals), s = std(vals);
        return { min: clamp(m - tol * s, lo, hi), max: clamp(m + tol * s, lo, hi) };
      };
      const aplica = (k: AdvKey, vals: number[], lo = 0, hi = cfg.tamanho) => {
        const f = faixa(vals, lo, hi);
        if (f) setAdvField(k, f);
      };
      aplica("primos", an.map((x) => x.primos));
      aplica("fibonacci", an.map((x) => x.fibonacci));
      aplica("mult3", an.map((x) => x.mult3));
      aplica("paresConsec", an.map((x) => x.paresConsecutivos));
      aplica("linha", an.flatMap((x) => x.porLinha));
      aplica("coluna", an.flatMap((x) => x.porColuna));
      if (cfg.moldura) aplica("miolo", an.map((x) => x.centro));
      if (repeats.length) aplica("ausentes", repeats.map((r) => cfg.tamanho - r));

      setIncluir([]);
      setExcluir([]);
      toast.success(`Filtros ajustados pela IA para ${qtd} jogo(s).`);

    } finally {
      setIaPensando(false);
    }
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

    const rng = (k: AdvKey) =>
      adv[k].on ? { min: adv[k].min, max: adv[k].max } : { min: undefined, max: undefined };

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
      primosMin: rng("primos").min,
      primosMax: rng("primos").max,
      fibonacciMin: rng("fibonacci").min,
      fibonacciMax: rng("fibonacci").max,
      mult3Min: rng("mult3").min,
      mult3Max: rng("mult3").max,
      linhaMin: rng("linha").min,
      linhaMax: rng("linha").max,
      colunaMin: rng("coluna").min,
      colunaMax: rng("coluna").max,
      mioloMin: cfg.moldura ? rng("miolo").min : undefined,
      mioloMax: cfg.moldura ? rng("miolo").max : undefined,
      ausentesMin: rng("ausentes").min,
      ausentesMax: rng("ausentes").max,
      paresConsecutivosMin: rng("paresConsec").min,
      paresConsecutivosMax: rng("paresConsec").max,
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
                description="Quantos jogos serão gerados de uma vez, de 1 até 500. Cada jogo consome créditos do seu saldo."
                exemplo="5 jogos = 1 crédito."
                dica="Escolha a quantidade ANTES de clicar em IA configurar: a IA ajusta os filtros conforme o volume."
                icon={<IconQuantity />}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={autoConfigurarIA}
                disabled={iaPensando}
                className="h-7 gap-1 border-primary/50 text-primary hover:bg-primary/10"
                title="Ajusta os filtros automaticamente com base no histórico e na quantidade escolhida"
              >
                {iaPensando ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {iaPensando ? "IA analisando..." : "IA configurar"}
              </Button>
            </div>
            {iaPensando && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>IA analisando o histórico e ajustando filtros...</span>
              </div>
            )}
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
              description={`Quantos números cada jogo terá. Mínimo ${cfg.tamanhoMin}, máximo ${cfg.tamanhoMax}.`}
              faixa={`Padrão da ${cfg.nome}: ${cfg.tamanho} dezenas.`}
              dica="Mais dezenas aumentam a chance de acerto, mas a loteria cobra bem mais caro por esse jogo."
              icon={<IconBalls />}
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
            info={{
              description:
                "Soma de todas as dezenas do jogo. Somas muito baixas (só números pequenos) ou muito altas (só números grandes) são raras nos sorteios reais.",
              faixa: "Use a faixa central do histórico — o botão IA configurar calcula isso pra você.",
              exemplo: "Jogo 01-02-03-04-05... tem soma baixa; 20-21-22-23... tem soma alta.",
              dica: "Faixa muito estreita descarta quase tudo e o gerador pode não achar jogos.",
            }}
            min={somaMin}
            max={somaMax}
            setMin={setSomaMin}
            setMax={setSomaMax}
          />
          <RangeRow
            label="Pares"
            info={{
              description:
                "Quantidade de números pares no jogo. O restante são ímpares. Sorteios reais quase sempre ficam próximos do equilíbrio.",
              faixa: "Perto da metade das dezenas do jogo, com 1 ou 2 de folga para cada lado.",
              exemplo: "Num jogo de 15 dezenas, algo entre 6 e 9 pares.",
              dica: "Evite exigir todos pares ou todos ímpares: praticamente nunca acontece.",
            }}
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
              info={{
                description:
                  "Moldura são as dezenas da borda do cartão. O restante é o miolo (centro). A distribuição entre borda e centro se repete bastante nos sorteios.",
                faixa: "9 a 11 dezenas na moldura, num jogo de 15.",
                exemplo: "Na Lotofácil a moldura tem 16 dezenas e o miolo 9.",
                dica: "Combine com o filtro Miolo para controlar os dois lados do volante.",
              }}
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
            info={{
              description:
                "Quantas dezenas do último concurso oficial devem aparecer de novo no jogo gerado. É comum vários números repetirem de um sorteio para o outro.",
              faixa: "Em torno da média histórica de repetições da modalidade.",
              exemplo: "Na Lotofácil costumam repetir de 8 a 10 das 15 dezenas.",
              dica: "Sincronize o histórico antes: o filtro usa o último resultado salvo.",
            }}
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
              description="Limita o tamanho da maior sequência de números seguidos dentro do jogo."
              faixa="No máximo 4 consecutivas."
              exemplo="Com o valor 3, o jogo pode ter 07-08-09, mas não 07-08-09-10."
              dica="Sequências longas são raras nos sorteios reais."
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

          <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
            <div>
              <p className="text-sm font-semibold">Filtros avançados</p>
              <p className="text-xs text-muted-foreground">
                Opcionais e desligados por padrão. Ative só os que quiser — usar muitos ao mesmo
                tempo pode deixar o gerador sem jogos válidos.
              </p>
            </div>

            <AdvRow
              k="primos"
              label="Primos"
              info={{
              description:
                "Conta quantos números primos entram no jogo — aqueles divisíveis só por 1 e por eles mesmos.",
              faixa: "4 a 6 primos em jogos de 15 dezenas.",
              exemplo: "São primos: 2, 3, 5, 7, 11, 13, 17, 19, 23...",
              dica: "É um jeito simples de evitar jogos concentrados em números do mesmo tipo.",
            }}
              state={adv.primos}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
            <AdvRow
              k="fibonacci"
              label="Fibonacci"
              info={{
              description:
                "Conta quantas dezenas pertencem à sequência de Fibonacci, em que cada número é a soma dos dois anteriores.",
              faixa: "3 a 5 dezenas em jogos de 15.",
              exemplo: "Fibonacci: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89.",
              dica: "Filtro mais restritivo: use junto com poucos outros filtros avançados.",
            }}
              state={adv.fibonacci}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
            <AdvRow
              k="mult3"
              label="Múltiplos de 3"
              info={{
              description: "Conta quantas dezenas do jogo são divisíveis por 3.",
              faixa: "4 a 6 dezenas em jogos de 15.",
              exemplo: "Múltiplos de 3: 3, 6, 9, 12, 15, 18, 21, 24...",
              dica: "Ajuda a espalhar o jogo entre grupos diferentes de números.",
            }}
              state={adv.mult3}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
            <AdvRow
              k="linha"
              label="Dezenas por linha"
              info={{
              description:
                "Controla a distribuição horizontal: define o mínimo e o máximo de dezenas em CADA linha do volante.",
              faixa: "2 a 4 dezenas por linha.",
              exemplo: "Evita jogos com 5 dezenas na primeira linha e nenhuma na última.",
              dica: "Ótimo para deixar as marcações espalhadas no cartão impresso.",
            }}
              state={adv.linha}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
            <AdvRow
              k="coluna"
              label="Dezenas por coluna"
              info={{
              description:
                "Mesma ideia da linha, só que na vertical: mínimo e máximo de dezenas em CADA coluna do volante.",
              faixa: "2 a 4 dezenas por coluna.",
              exemplo: "Impede que todo o jogo caia nas colunas da esquerda.",
              dica: "Use junto com Dezenas por linha para uma cobertura equilibrada.",
            }}
              state={adv.coluna}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
            {cfg.moldura && (
              <AdvRow
                k="miolo"
                label="Miolo"
                info={{
                description:
                  "Miolo são as dezenas do centro do cartão, fora da moldura. Este filtro define quantas delas o jogo deve conter.",
                faixa: "4 a 6 dezenas no miolo, num jogo de 15.",
                exemplo: "Se o jogo tem 10 na moldura, sobram 5 no miolo.",
                dica: "Miolo e Moldura são complementares — configure os dois com coerência.",
              }}
                state={adv.miolo}
                onChange={setAdvField}
                maxLimit={tamanho}
              />
            )}
            <AdvRow
              k="ausentes"
              label="Ausentes do último concurso"
              info={{
              description:
                "Quantas dezenas do jogo NÃO saíram no último concurso. É o oposto do filtro Repetir do anterior.",
              faixa: "5 a 7 dezenas ausentes em jogos de 15.",
              exemplo: "Se 9 dezenas repetem do último sorteio, 6 são ausentes.",
              dica: "Se usar os dois filtros, cuide para que as faixas somem o total de dezenas.",
            }}
              state={adv.ausentes}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
            <AdvRow
              k="paresConsec"
              label="Pares consecutivos"
              info={{
              description:
                "Conta as duplas de números seguidos dentro do jogo. Diferente de Máx. consecutivas, que limita o tamanho da maior sequência.",
              faixa: "3 a 7 duplas em jogos de 15 dezenas.",
              exemplo: "Em 04-05-12-13-20 há 2 pares consecutivos.",
              dica: "Sorteios reais quase sempre trazem alguns números seguidos.",
            }}
              state={adv.paresConsec}
              onChange={setAdvField}
              maxLimit={tamanho}
            />
          </div>



          <div>
            <InfoLabel
              label="Incluir sempre"
              description="Dezenas fixas: aparecem em todos os jogos gerados."
              exemplo="Marque seus números da sorte para que nunca fiquem de fora."
              dica="Fixar muitas dezenas reduz a variedade dos jogos e pode conflitar com os filtros."
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
              description="Dezenas bloqueadas: nunca entram nos jogos gerados."
              exemplo="Útil para descartar dezenas muito atrasadas ou que você não quer jogar."
              dica="Bloquear demais deixa poucas dezenas disponíveis e o gerador pode falhar."
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
  icon,
}: {
  label: string;
  info?: InfoContent;
  min: number;
  max: number;
  setMin: (n: number) => void;
  setMax: (n: number) => void;
  minLimit?: number;
  maxLimit?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      {info ? (
        <InfoLabel label={label} {...info} icon={icon} />
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

function AdvRow({
  k,
  label,
  info,
  state,
  onChange,
  maxLimit,
  icon,
}: {
  k: AdvKey;
  label: string;
  info: InfoContent;
  state: { on: boolean; min: number; max: number };
  onChange: (k: AdvKey, patch: Partial<{ on: boolean; min: number; max: number }>) => void;
  maxLimit: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <InfoLabel label={label} {...info} icon={icon} />
        <Switch
          checked={state.on}
          onCheckedChange={(v) => onChange(k, { on: v })}
          aria-label={`Ativar filtro ${label}`}
        />
      </div>
      {state.on && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            value={state.min}
            min={0}
            max={maxLimit}
            onChange={(e) => onChange(k, { min: +e.target.value })}
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="number"
            value={state.max}
            min={0}
            max={maxLimit}
            onChange={(e) => onChange(k, { max: +e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
