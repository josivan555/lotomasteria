import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listarConcursos } from "@/lib/lotofacil.functions";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const resultadosQuery = queryOptions({
  queryKey: ["resultados-publicos"],
  queryFn: () => listarConcursos(),
  staleTime: 1000 * 60 * 30,
});

export const Route = createFileRoute("/resultados")({
  head: () => ({
    meta: [
      { title: "Resultados da Lotofácil — Últimos concursos | LotoMaster IA" },
      {
        name: "description",
        content:
          "Confira os resultados oficiais dos últimos concursos da Lotofácil: dezenas sorteadas, data de apuração e soma. Histórico completo atualizado direto da Caixa.",
      },
      { property: "og:title", content: "Resultados da Lotofácil — Últimos concursos" },
      {
        property: "og:description",
        content:
          "Resultados oficiais da Lotofácil com dezenas sorteadas, datas e estatísticas. Atualizado a partir do histórico oficial da Caixa.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lotomasteria.lovable.app/resultados" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Resultados da Lotofácil — LotoMaster IA" },
      {
        name: "twitter:description",
        content: "Últimos resultados oficiais da Lotofácil com dezenas, datas e soma.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lotomasteria.lovable.app/resultados" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resultadosQuery),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { data: concursos } = useSuspenseQuery(resultadosQuery);
  const ultimos = concursos.slice(0, 50);
  const ultimo = ultimos[0];

  const jsonLd = ultimo
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "Resultados da Lotofácil",
        description:
          "Histórico oficial da Lotofácil com dezenas sorteadas, datas de apuração e soma por concurso.",
        creator: { "@type": "Organization", name: "LotoMaster IA" },
        url: "https://lotomasteria.lovable.app/resultados",
        temporalCoverage: `../${ultimo.data_apuracao}`,
      }
    : null;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="ball ball-gold h-8! w-8! text-sm!">L</span>
          LotoMaster <span className="text-primary">IA</span>
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth" search={{ mode: "login" }}>Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="py-10">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Resultados da <span className="text-primary">Lotofácil</span>
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Consulte os últimos concursos da Lotofácil com as 15 dezenas sorteadas, a data de
            apuração e a soma. Os dados são sincronizados a partir do histórico oficial da Caixa
            Econômica Federal e alimentam as análises estatísticas do{" "}
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
              <Link to="/auth" search={{ mode: "login" }}>Acessar dashboard</Link>
            </Button>
          </div>
        </section>

        {ultimo && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Último concurso
            </h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-black">Concurso {ultimo.numero}</span>
              <span className="text-muted-foreground">
                {formatDate(ultimo.data_apuracao)} · Soma {ultimo.soma}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ultimo.dezenas.map((d) => (
                <span key={d} className="ball ball-gold">
                  {String(d).padStart(2, "0")}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Últimos 50 concursos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tabela cronológica com as dezenas sorteadas em cada sorteio recente.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Concurso</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Dezenas</th>
                  <th className="px-4 py-3 font-semibold">Soma</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((c) => (
                  <tr key={c.numero} className="border-t border-border/40">
                    <td className="px-4 py-3 font-semibold">{c.numero}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(c.data_apuracao)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.dezenas.map((d) => (
                          <span
                            key={d}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                          >
                            {String(d).padStart(2, "0")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.soma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-border/60 bg-card/60 p-6">
            <h2 className="text-xl font-bold">Como funciona a Lotofácil</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A Lotofácil sorteia 15 dezenas entre 01 e 25. O apostador marca de 15 a 20 números
              e pode ganhar acertando 11, 12, 13, 14 ou 15 dezenas. Sorteios ocorrem de segunda
              a sábado.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-card/60 p-6">
            <h2 className="text-xl font-bold">Analise os resultados com IA</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O LotoMaster IA usa todo o histórico oficial para calcular Score IA por dezena,
              frequência, atraso e tendência.{" "}
              <Link to="/auth" search={{ mode: "signup" }} className="text-primary hover:underline">
                Crie sua conta grátis
              </Link>{" "}
              e gere jogos com filtros estatísticos avançados.
            </p>
          </article>
        </section>

        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        LotoMaster IA · Resultados baseados no histórico oficial da Caixa. Loteria é jogo de azar
        — jogue com responsabilidade.
      </footer>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
