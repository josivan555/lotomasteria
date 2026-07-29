import { createFileRoute, useRouter, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, salvarJogo } from "@/lib/loterias.functions";
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
import { Bookmark, Dice5, Download } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

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
  const salvar = useServerFn(salvarJogo);
  const router = useRouter();

  const { data: concursos = [] } = useQuery({
    queryKey: ["concursos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const stats = useMemo(
    () => (concursos.length ? computeNumberStats(cfg, concursos) : null),
    [concursos, cfg],
  );

  const [qtd, setQtd] = useState(10);
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

  function gerar() {
    if (!stats) {
      toast.error("Sincronize o histórico primeiro.");
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
    const jogos = gerarJogos(cfg, qtd, stats.scores, filtros, anterior);
    if (!jogos.length) {
      toast.error("Nenhum jogo passou nos filtros. Afrouxe algum parâmetro.");
      return;
    }
    setResultados(jogos.map((j) => ({ dezenas: j.dezenas, score: j.score })));
    toast.success(`${jogos.length} jogos gerados.`);
  }

  const salvarMut = useMutation({
    mutationFn: (r: Result) =>
      salvar({
        data: {
          loteria,
          dezenas: r.dezenas,
          score: r.score,
          nome: `${cfg.nome} · Score ${r.score}`,
        },
      }),
    onSuccess: () => {
      toast.success("Jogo salvo!");
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function exportarCSV() {
    if (!resultados.length) return;
    const csv =
      "score," +
      Array.from({ length: cfg.tamanho }, (_, i) => `d${i + 1}`).join(",") +
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
        <h2 className="text-2xl font-bold">Gerador Inteligente · {cfg.nome}</h2>
        <p className="text-sm text-muted-foreground">
          Jogos de {cfg.tamanho} dezenas ponderados pelo Score IA, filtrados e ranqueados.{" "}
          <Link to="/resultados" className="text-primary hover:underline">
            Ver últimos resultados
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur">
          <div>
            <Label>Quantidade</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[10, 50, 100, 500].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={qtd === v ? "default" : "outline"}
                  onClick={() => setQtd(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          <RangeRow label="Soma" min={somaMin} max={somaMax} setMin={setSomaMin} setMax={setSomaMax} />
          <RangeRow
            label="Pares"
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
            min={repetirMin}
            max={repetirMax}
            setMin={setRepetirMin}
            setMax={setRepetirMax}
            minLimit={0}
            maxLimit={cfg.tamanho}
          />
          <div>
            <Label>Máx. consecutivas</Label>
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
            <Label className="mb-2 block">Incluir sempre</Label>
            <NumbersPicker
              numbers={nums}
              selected={incluir}
              onToggle={(n) => toggle(incluir, setIncluir, n)}
              disabled={excluir}
            />
          </div>

          <div>
            <Label className="mb-2 block">Excluir sempre</Label>
            <NumbersPicker
              numbers={nums}
              selected={excluir}
              onToggle={(n) => toggle(excluir, setExcluir, n)}
              disabled={incluir}
              variant="danger"
            />
          </div>

          <Button className="w-full" size="lg" onClick={gerar}>
            <Dice5 className="mr-2 h-4 w-4" /> Gerar {qtd} jogos
          </Button>
        </div>

        <div className="space-y-3">
          {resultados.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportarCSV}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
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
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-sm text-muted-foreground tabular-nums">#{i + 1}</span>
                      <div className="flex flex-wrap gap-1">
                        {r.dezenas.map((n) => (
                          <DezenaBall key={n} n={n} variant={ballVariant} className="h-8! w-8! text-xs!" />
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
  min,
  max,
  setMin,
  setMax,
  minLimit = 0,
  maxLimit = 400,
}: {
  label: string;
  min: number;
  max: number;
  setMin: (n: number) => void;
  setMax: (n: number) => void;
  minLimit?: number;
  maxLimit?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
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
