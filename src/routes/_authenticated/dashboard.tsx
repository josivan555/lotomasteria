import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, sincronizarConcursos, ultimoResultadoCaixa } from "@/lib/lotofacil.functions";
import { computeNumberStats, ALL_NUMBERS } from "@/lib/lotofacil-utils";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, Flame, Snowflake, Clock, Trophy } from "lucide-react";
import { useMemo } from "react";
import logoAsset from "@/assets/lotomaster-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard estatístico · LotoMaster IA" },
      { name: "description", content: "Painel com o último concurso da Lotofácil, ranking do Score IA, dezenas quentes/frias e estatísticas de frequência e atraso." },
      { property: "og:title", content: "Dashboard estatístico · LotoMaster IA" },
      { property: "og:description", content: "Último concurso, ranking do Score IA e estatísticas de frequência, atraso e tendência da Lotofácil." },
    ],
    links: [{ rel: "canonical", href: "https://lotomasteria.lovable.app/dashboard" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const listar = useServerFn(listarConcursos);
  const sync = useServerFn(sincronizarConcursos);
  const ultimoCaixa = useServerFn(ultimoResultadoCaixa);
  const router = useRouter();

  const { data: concursos = [], isLoading } = useQuery({
    queryKey: ["concursos"],
    queryFn: () => listar(),
  });

  const { data: ultimoOficial } = useQuery({
    queryKey: ["ultimo-caixa"],
    queryFn: () => ultimoCaixa(),
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(() => (concursos.length ? computeNumberStats(concursos) : null), [concursos]);
  const latest = concursos[0];

  const syncMut = useMutation({
    mutationFn: () => sync({ data: { limite: 100 } }),
    onSuccess: (r) => {
      toast.success(
        r.inseridos === 0
          ? "Já está atualizado!"
          : `+${r.inseridos} concursos sincronizados${r.faltam ? ` — faltam ${r.faltam}` : ""}`,
      );
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Carregando...</div>;

  if (!concursos.length) {
    return (
      <EmptyState onSync={() => syncMut.mutate()} loading={syncMut.isPending} />
    );
  }

  const scores = stats!.scores;
  const topScore = [...ALL_NUMBERS].sort((a, b) => scores[b] - scores[a]).slice(0, 8);
  const maisAtrasadas = [...ALL_NUMBERS].sort((a, b) => stats!.atrasos[b] - stats!.atrasos[a]).slice(0, 8);
  const quentes = [...ALL_NUMBERS].sort((a, b) => stats!.frequencia30[b] - stats!.frequencia30[a]).slice(0, 8);
  const frias = [...ALL_NUMBERS].sort((a, b) => stats!.frequencia30[a] - stats!.frequencia30[b]).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={logoAsset.url}
            alt="LotoMaster IA"
            className="h-14 w-14 rounded-xl object-contain shadow-lg ring-1 ring-border/40"
          />
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {concursos.length} concursos analisados · última atualização concurso {latest.numero}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button asChild>
            <Link to="/gerador">Gerar jogos</Link>
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Último sorteio</p>
              <p className="text-xl font-bold">Lotofácil</p>
              <p className="text-sm text-muted-foreground">
                Concurso {(ultimoOficial ?? latest).numero} ·{" "}
                {new Date((ultimoOficial ?? latest).data_apuracao + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(ultimoOficial ?? latest).dezenas.map((n) => (
              <DezenaBall key={n} n={n} variant="gold" />
            ))}
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Prêmio 15 acertos</p>
            <p className="text-lg font-bold text-primary">
              {ultimoOficial
                ? ultimoOficial.premio15.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ultimoOficial
                ? `${ultimoOficial.ganhadores15} ganhador${ultimoOficial.ganhadores15 === 1 ? "" : "es"}`
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
              <ScoreRow key={n} n={n} score={scores[n]} />
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
                <DezenaBall n={n} />
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
        <div className="grid grid-cols-5 gap-3 md:grid-cols-10">
          {ALL_NUMBERS.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <DezenaBall n={n} />
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

function ScoreRow({ n, score }: { n: number; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <DezenaBall n={n} />
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

function EmptyState({ onSync, loading }: { onSync: () => void; loading: boolean }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
      <h2 className="text-xl font-semibold">Bem-vindo ao LotoMaster IA</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ainda não há dados. Sincronize o histórico oficial da Lotofácil (API da Caixa). A primeira vez pode
        levar alguns minutos — clique várias vezes até chegar em 0 pendentes.
      </p>
      <Button onClick={onSync} disabled={loading} className="mt-6">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Sincronizar concursos
      </Button>
    </div>
  );
}
