import { createFileRoute, useRouter, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useJanelaAnalise, aplicarJanela, BASE_ALVO } from "@/lib/janela-analise";
import { JanelaAnalise } from "@/components/janela-analise";

import { useServerFn } from "@tanstack/react-start";
import {
  listarConcursos,
  sincronizarConcursos,
  ultimoResultadoCaixa,
} from "@/lib/loterias.functions";
import { computeNumberStats, allNumbers } from "@/lib/loteria-utils";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, Flame, Snowflake, Clock, Trophy } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/l/$loteria/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/dashboard" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];
  const ballVariant = cfg.ballVariant === "green" ? "default" : cfg.ballVariant;

  const listar = useServerFn(listarConcursos);
  const sync = useServerFn(sincronizarConcursos);
  const ultimoCaixa = useServerFn(ultimoResultadoCaixa);
  const router = useRouter();
  const queryClient = useQueryClient();


  const { data: concursosAll = [], isLoading } = useQuery({
    queryKey: ["concursos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const { janela, setJanela } = useJanelaAnalise(loteria);
  const concursos = useMemo(() => aplicarJanela(concursosAll, janela), [concursosAll, janela]);

  const { data: ultimoOficial } = useQuery({
    queryKey: ["ultimo-caixa", loteria],
    queryFn: () => ultimoCaixa({ data: { loteria } }),
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(
    () => (concursos.length ? computeNumberStats(cfg, concursos) : null),
    [concursos, cfg],
  );


  const syncMut = useMutation({
    mutationFn: async () => {
      let inseridos = 0;
      let faltam = 0;
      // Preenche a base ate ~BASE_ALVO concursos, em lotes de 200
      for (let i = 0; i < 5; i++) {
        const r = await sync({ data: { loteria, limite: 200 } });
        inseridos += r.inseridos;
        faltam = r.faltam;
        const total = concursosAll.length + inseridos;
        if (r.inseridos === 0 || total >= BASE_ALVO) break;
      }
      return { inseridos, faltam };
    },
    onSuccess: (r) => {
      toast.success(
        r.inseridos === 0
          ? "Já está atualizado!"
          : `+${r.inseridos} concursos sincronizados${r.faltam ? ` — faltam ${r.faltam}` : ""}`,
      );
      queryClient.invalidateQueries({ queryKey: ["concursos", loteria] });
      router.invalidate();
    },

    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Carregando...</div>;

  if (!concursos.length) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
        <h2 className="text-xl font-semibold">Sem histórico da {cfg.nome} ainda</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sincronize os concursos oficiais para começar a análise.
        </p>
        <Button className="mt-4" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
          Sincronizar histórico
        </Button>
      </div>
    );
  }

  const scores = stats!.scores;
  const nums = allNumbers(cfg);
  const topScore = [...nums].sort((a, b) => scores[b] - scores[a]).slice(0, 8);
  const maisAtrasadas = [...nums].sort((a, b) => stats!.atrasos[b] - stats!.atrasos[a]).slice(0, 8);
  const quentes = [...nums].sort((a, b) => stats!.frequencia30[b] - stats!.frequencia30[a]).slice(0, 8);
  const frias = [...nums].sort((a, b) => stats!.frequencia30[a] - stats!.frequencia30[b]).slice(0, 8);
  const latest = concursos[0];
  const shown = ultimoOficial ?? latest;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {concursos.length} concursos analisados · último salvo #{latest.numero}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link to="/l/$loteria/gerador" params={{ loteria }}>
              Gerar jogos
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={cfg.banner}
              alt={`${cfg.nome} — arte oficial`}
              className="h-12 w-auto shrink-0 drop-shadow-md md:h-16"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground md:text-xs">Último sorteio</p>
              <p className="text-lg font-bold md:text-xl">{cfg.nome}</p>
              <p className="text-xs text-muted-foreground md:text-sm">
                Concurso {shown.numero} ·{" "}
                {new Date(shown.data_apuracao + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {shown.dezenas.map((n) => (
              <DezenaBall key={n} n={n} variant="gold" className="h-8! w-8! text-xs! md:h-10! md:w-10! md:text-sm!" />
            ))}
          </div>

          <div className="md:text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground md:text-xs">
              Prêmio {cfg.faixaPrincipal} acertos
            </p>
            <p className="text-lg font-bold text-primary">
              {ultimoOficial
                ? ultimoOficial.premioPrincipal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ultimoOficial
                ? `${ultimoOficial.ganhadoresPrincipal} ganhador${ultimoOficial.ganhadoresPrincipal === 1 ? "" : "es"}`
                : `Soma ${latest.soma}`}
            </p>
            {ultimoOficial && ultimoOficial.estimativaProximo > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Próximo:{" "}
                <span className="font-semibold text-foreground">
                  {ultimoOficial.estimativaProximo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </p>
            )}
          </div>
        </div>
      </Card>


      <div className="grid gap-4 md:grid-cols-2">
        <ListCard icon={<TrendingUp className="h-4 w-4 text-primary" />} title="Score IA — Top 8">
          <div className="space-y-2">
            {topScore.map((n) => (
              <ScoreRow key={n} n={n} score={scores[n]} variant={ballVariant} />
            ))}
          </div>
        </ListCard>

        <ListCard icon={<Clock className="h-4 w-4 text-accent" />} title="Mais atrasadas">
          <div className="space-y-2">
            {maisAtrasadas.map((n) => (
              <div key={n} className="flex items-center justify-between">
                <DezenaBall n={n} variant="muted" />
                <span className="text-sm">{stats!.atrasos[n]} concursos</span>
              </div>
            ))}
          </div>
        </ListCard>

        <ListCard icon={<Flame className="h-4 w-4 text-hot" />} title="Quentes (últimos 30)">
          <div className="flex flex-wrap gap-2">
            {quentes.map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <DezenaBall n={n} variant={ballVariant} />
                <span className="text-xs text-muted-foreground">{stats!.frequencia30[n]}x</span>
              </div>
            ))}
          </div>
        </ListCard>

        <ListCard icon={<Snowflake className="h-4 w-4 text-cold" />} title="Frias (últimos 30)">
          <div className="flex flex-wrap gap-2">
            {frias.map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <DezenaBall n={n} variant="muted" />
                <span className="text-xs text-muted-foreground">{stats!.frequencia30[n]}x</span>
              </div>
            ))}
          </div>
        </ListCard>
      </div>

      <ListCard title="Frequência histórica (todas as dezenas)">
        <div className="grid grid-cols-5 gap-2 md:grid-cols-10 md:gap-3">

          {nums.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <DezenaBall n={n} variant={ballVariant} />
              <span className="text-xs text-muted-foreground">{stats!.frequenciaHist[n]}</span>
            </div>
          ))}
        </div>
      </ListCard>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur">{children}</div>;
}

function ListCard({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function ScoreRow({
  n,
  score,
  variant,
}: {
  n: number;
  score: number;
  variant: "default" | "blue" | "purple";
}) {
  return (
    <div className="flex items-center gap-3">
      <DezenaBall n={n} variant={variant} />
      <div className="flex-1">
        <div className="h-2 rounded-full bg-secondary">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${Math.max(2, score)}%` }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-sm font-semibold tabular-nums">{score.toFixed(1)}</span>
    </div>
  );
}
