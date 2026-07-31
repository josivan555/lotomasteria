import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { resumoOficialTodas } from "@/lib/loterias.functions";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Users, Coins, CalendarClock, MapPin } from "lucide-react";
import { formatBRL } from "@/lib/credits-config";

const oficiaisQuery = queryOptions({
  queryKey: ["resumo-oficial-todas"],
  queryFn: () => resumoOficialTodas({}),
  staleTime: 1000 * 60 * 10,
});


export const Route = createFileRoute("/resultados")({
  head: () => ({
    meta: [
      { title: "Resultados Lotofácil, Mega-Sena e Quina · LotoMaster IA" },
      {
        name: "description",
        content:
          "Confira os resultados oficiais dos últimos concursos da Lotofácil, Mega-Sena e Quina: dezenas sorteadas, prêmios, ganhadores e estimativas. Atualizado a partir da Caixa.",
      },
      { property: "og:title", content: "Resultados Lotofácil, Mega-Sena e Quina" },
      {
        property: "og:description",
        content:
          "Resultados oficiais das três loterias com dezenas sorteadas, prêmios e próximos concursos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lotomasteria.lovable.app/resultados" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Resultados Lotofácil, Mega-Sena e Quina · LotoMaster IA" },
      {
        name: "twitter:description",
        content: "Últimos resultados oficiais da Lotofácil, Mega-Sena e Quina.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lotomasteria.lovable.app/resultados" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(oficiaisQuery),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { data: oficiais } = useSuspenseQuery(oficiaisQuery);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 md:px-6 md:py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="ball ball-gold h-8! w-8! text-sm!">L</span>
          LotoMaster <span className="text-primary">IA</span>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "login" }}>
              Entrar
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Criar conta
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <section className="py-10">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Resultados oficiais das <span className="text-primary">loterias</span>
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Consulte os últimos concursos da Lotofácil, Mega-Sena e Quina. Os dados são
            sincronizados a partir do histórico oficial da Caixa Econômica Federal e alimentam as
            análises estatísticas do{" "}
            <Link to="/" className="text-primary hover:underline">
              LotoMaster IA
            </Link>
            .
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Sparkles className="mr-2 h-4 w-4" /> Gerar jogos com IA
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "login" }}>
                Acessar dashboard
              </Link>
            </Button>
          </div>
        </section>

        {oficiais.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Últimos sorteios oficiais</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Prêmios, ganhadores por faixa, acumulado e próximo concurso da Mega-Sena, Lotofácil
              e Quina — direto da Caixa.
            </p>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              {oficiais.map((r) => (
                <ResumoCard key={r.loteria} r={r} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        LotoMaster IA · Resultados baseados no histórico oficial da Caixa. Loteria é jogo de azar
        — jogue com responsabilidade.
      </footer>
    </div>
  );
}

type ResumoOficialDto = Awaited<ReturnType<typeof resumoOficialTodas>>[number];

function ResumoCard({ r }: { r: ResumoOficialDto }) {
  const cfg = LOTERIAS[r.loteria as LoteriaId];
  const ball =
    cfg.ballVariant === "blue"
      ? "ball ball-blue"
      : cfg.ballVariant === "purple"
        ? "ball ball-purple"
        : "ball ball-gold";
  const principal = r.faixas[0];

  return (
    <article className="flex flex-col rounded-2xl border border-border/60 bg-card/60 p-5">
      <header className="flex items-center gap-3">
        <img src={cfg.logo} alt={`Logo ${cfg.nome}`} className="h-8 w-auto rounded" />
        <div>
          <h3 className="text-lg font-bold leading-tight">{cfg.nome}</h3>
          <p className="text-xs text-muted-foreground">
            Concurso {r.numero} · {formatDate(r.data_apuracao)}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {r.dezenas.map((d) => (
          <span key={d} className={`${ball} h-8! w-8! text-xs!`}>
            {String(d).padStart(2, "0")}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Trophy className="h-3.5 w-3.5" />
          {r.acumulou ? "Acumulou!" : "Prêmio principal"}
        </p>
        <p className="mt-1 text-xl font-black">
          {r.acumulou ? formatBRL(r.valorAcumulado) : formatBRL(principal?.premio ?? 0)}
        </p>
        {!r.acumulou && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {principal?.ganhadores ?? 0} ganhador(es) · {principal?.faixa}
          </p>
        )}
      </div>

      {r.faixas.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border/50">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Faixa</th>
                <th className="px-3 py-2 font-semibold">Ganhadores</th>
                <th className="px-3 py-2 text-right font-semibold">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {r.faixas.map((f) => (
                <tr key={f.faixa} className="border-t border-border/40">
                  <td className="px-3 py-2">{f.faixa}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {f.ganhadores.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatBRL(f.premio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        {r.localSorteio && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <dd>{r.localSorteio}</dd>
          </div>
        )}
        {r.arrecadacao > 0 && (
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 shrink-0" />
            <dd>Arrecadação: {formatBRL(r.arrecadacao)}</dd>
          </div>
        )}
        {r.proximoConcurso && (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <dd>
              Próximo concurso {r.proximoConcurso}
              {r.proximoData ? ` em ${formatDate(r.proximoData)}` : ""} · estimativa{" "}
              {formatBRL(r.estimativaProximo)}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}


function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
