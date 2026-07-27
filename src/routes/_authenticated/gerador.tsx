import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, salvarJogo } from "@/lib/lotofacil.functions";
import {
  computeNumberStats,
  gerarJogos,
  classificarScore,
  ALL_NUMBERS,
  type Filtros,
} from "@/lib/lotofacil-utils";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Dice5, Download } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/gerador")({
  head: () => ({ meta: [{ title: "Gerador · LotoMaster IA" }] }),
  component: Gerador,
});

type Result = { dezenas: number[]; score: number };

function Gerador() {
  const listar = useServerFn(listarConcursos);
  const salvar = useServerFn(salvarJogo);
  const router = useRouter();

  const { data: concursos = [] } = useQuery({
    queryKey: ["concursos"],
    queryFn: () => listar(),
  });

  const stats = useMemo(
    () => (concursos.length ? computeNumberStats(concursos) : null),
    [concursos],
  );

  const [qtd, setQtd] = useState(10);
  const [somaMin, setSomaMin] = useState(170);
  const [somaMax, setSomaMax] = useState(210);
  const [paresMin, setParesMin] = useState(6);
  const [paresMax, setParesMax] = useState(9);
  const [maxConsecutivas, setMaxConsecutivas] = useState(5);
  const [molduraMin, setMolduraMin] = useState(7);
  const [molduraMax, setMolduraMax] = useState(12);
  const [incluir, setIncluir] = useState<number[]>([]);
  const [excluir, setExcluir] = useState<number[]>([]);
  const [repetirMin, setRepetirMin] = useState(6);
  const [repetirMax, setRepetirMax] = useState(11);

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
      molduraMin,
      molduraMax,
      incluir,
      excluir,
      repetirAnteriorMin: repetirMin,
      repetirAnteriorMax: repetirMax,
    };
    const anterior = concursos[0]?.dezenas;
    const jogos = gerarJogos(qtd, stats.scores, filtros, anterior);
    if (!jogos.length) {
      toast.error("Nenhum jogo passou nos filtros. Afrouxe algum parâmetro.");
      return;
    }
    setResultados(jogos.map((j) => ({ dezenas: j.dezenas, score: j.score })));
    toast.success(`${jogos.length} jogos gerados.`);
  }

  const salvarMut = useMutation({
    mutationFn: (r: Result) =>
      salvar({ data: { dezenas: r.dezenas, score: r.score, nome: `Score ${r.score}` } }),
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
      Array.from({ length: 15 }, (_, i) => `d${i + 1}`).join(",") +
      "\n" +
      resultados.map((r) => [r.score, ...r.dezenas].join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lotomaster-jogos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!concursos.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 text-center text-muted-foreground">
        Sincronize o histórico no Dashboard antes de gerar jogos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerador Inteligente</h1>
        <p className="text-sm text-muted-foreground">
          Jogos ponderados pelo Score IA, filtrados e ranqueados.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur">
          <FieldRow>
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
          </FieldRow>

          <RangeRow label="Soma" min={somaMin} max={somaMax} setMin={setSomaMin} setMax={setSomaMax} />
          <RangeRow label="Pares" min={paresMin} max={paresMax} setMin={setParesMin} setMax={setParesMax} minLimit={0} maxLimit={15} />
          <RangeRow label="Moldura" min={molduraMin} max={molduraMax} setMin={setMolduraMin} setMax={setMolduraMax} minLimit={0} maxLimit={15} />
          <RangeRow label="Repetir do anterior" min={repetirMin} max={repetirMax} setMin={setRepetirMin} setMax={setRepetirMax} minLimit={0} maxLimit={15} />
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
            <NumbersPicker selected={incluir} onToggle={(n) => toggle(incluir, setIncluir, n)} disabled={excluir} />
          </div>

          <div>
            <Label className="mb-2 block">Excluir sempre</Label>
            <NumbersPicker selected={excluir} onToggle={(n) => toggle(excluir, setExcluir, n)} disabled={incluir} variant="danger" />
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
                          <DezenaBall key={n} n={n} className="h-8! w-8! text-xs!" />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${c.color}`}>{r.score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => salvarMut.mutate(r)}>
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

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
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
  selected,
  onToggle,
  disabled = [],
  variant = "primary",
}: {
  selected: number[];
  onToggle: (n: number) => void;
  disabled?: number[];
  variant?: "primary" | "danger";
}) {
  return (
    <div className="grid grid-cols-9 gap-1">
      {ALL_NUMBERS.map((n) => {
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
