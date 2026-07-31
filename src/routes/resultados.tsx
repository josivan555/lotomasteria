import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listarConcursos, resumoOficialTodas } from "@/lib/loterias.functions";
import { LOTERIA_IDS, LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Users, Coins, CalendarClock, MapPin } from "lucide-react";
import { useState } from "react";
import { formatBRL } from "@/lib/credits-config";

type ConcursoDto = {
  numero: number;
  data_apuracao: string;
  dezenas: number[];
  soma: number;
};

const resultadosQuery = (loteria: LoteriaId) =>
  queryOptions({
    queryKey: ["resultados-publicos", loteria],
    queryFn: () => listarConcursos({ data: { loteria } }),
    staleTime: 1000 * 60 * 30,
  });

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
          "Confira os resultados oficiais dos últimos concursos da Lotofácil, Mega-Sena e Quina: dezenas sorteadas, data de apuração e soma. Atualizado a partir da Caixa.",
      },
      { property: "og:title", content: "Resultados Lotofácil, Mega-Sena e Quina" },
      {
        property: "og:description",
        content:
          "Resultados oficiais das três loterias com dezenas sorteadas, datas e estatísticas.",
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
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(oficiaisQuery);
    return Promise.all(
      LOTERIA_IDS.map((id) => context.queryClient.ensureQueryData(resultadosQuery(id))),
    );
  },
  component: ResultadosPage,
});

function ResultadosPage() {
  const [aba, setAba] = useState<LoteriaId>("lotofacil");
  const cfg = LOTERIAS[aba];
  const { data: concursos } = useSuspenseQuery(resultadosQuery(aba));
  const { data: oficiais } = useSuspenseQuery(oficiaisQuery);
  const ultimos = concursos.slice(0, 50);
  const ultimo = ultimos[0];


  const ballClass =
    cfg.ballVariant === "blue"
      ? "ball ball-blue"
      : cfg.ballVariant === "purple"
        ? "ball ball-purple"
        : "ball ball-gold";

  const jsonLd = ultimo
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: `Resultados da ${cfg.nome}`,
        description: `Histórico oficial da ${cfg.nome} com dezenas sorteadas, datas de apuração e soma.`,
        creator: { "@type": "Organization", name: "LotoMaster IA" },
        url: "https://lotomasteria.lovable.app/resultados",
        temporalCoverage: `../${ultimo.data_apuracao}`,
      }
    : null;

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



        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Selecione a loteria">
          {LOTERIA_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                aba === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {LOTERIAS[id].nome}
            </button>
          ))}
        </div>

        {ultimo && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Último concurso · {cfg.nome}
            </h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-black">Concurso {ultimo.numero}</span>
              <span className="text-muted-foreground">
                {formatDate(ultimo.data_apuracao)} · Soma {ultimo.soma}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ultimo.dezenas.map((d: number) => (
                <span key={d} className={ballClass}>
                  {String(d).padStart(2, "0")}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Últimos 50 concursos · {cfg.nome}</h2>
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
                {ultimos.map((c: ConcursoDto) => (
                  <tr key={c.numero} className="border-t border-border/40">
                    <td className="px-4 py-3 font-semibold">{c.numero}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(c.data_apuracao)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.dezenas.map((d: number) => (
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
            <h2 className="text-xl font-bold">Como funciona a {cfg.nome}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{cfg.descricaoLonga}</p>
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
