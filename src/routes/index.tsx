import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, BarChart3, Filter, Trophy, Clock, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarBoloesPublicos } from "@/lib/boloes.functions";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://lotomasteria.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "LotoMaster IA",
          applicationCategory: "StatisticalApplication",
          operatingSystem: "All",
          url: "https://lotomasteria.lovable.app/",
          description:
            "Análise estatística inteligente da Lotofácil com Score IA, filtros avançados e geração de jogos.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "LotoMaster IA",
          url: "https://lotomasteria.lovable.app/",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 md:px-6 md:py-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="ball ball-gold h-8! w-8! text-sm!">L</span>
          LotoMaster <span className="text-primary">IA</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/resultados">Resultados</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "login" }}>Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <section className="py-12 text-center md:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> Análise estatística inteligente
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Veja também os{" "}
            <Link to="/resultados" className="text-primary hover:underline">
              últimos resultados oficiais da Lotofácil
            </Link>
            .
          </p>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl md:text-6xl">
            Domine a{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Lotofácil, Mega-Sena e Quina
            </span>
            <br />
            com IA estatística
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            O LotoMaster IA analisa todo o histórico oficial das três loterias, calcula um{" "}
            <strong className="text-foreground">Score IA</strong> para cada dezena e gera jogos
            equilibrados com dezenas de filtros estatísticos — dashboards e geradores dedicados
            para cada modalidade.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "login" }}>Já tenho conta</Link>
            </Button>
          </div>
        </section>


        <section className="pb-24">
          <h2 className="mb-6 text-center text-2xl font-bold tracking-tight md:text-3xl">
            Recursos do LotoMaster IA
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={<BarChart3 className="h-5 w-5" />}
            title="Estatísticas completas"
            desc="Frequência, atraso, tendência e ciclos de cada dezena, com janelas de 10 até o histórico completo."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Score IA por dezena"
            desc="Nota de 0 a 100 combinando 6 indicadores estatísticos com pesos calibrados."
          />
          <Feature
            icon={<Filter className="h-5 w-5" />}
            title="Gerador com filtros"
            desc="Soma, pares/ímpares, moldura, consecutivas, incluir/excluir — gere 10 a 500 jogos ranqueados."
          />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        LotoMaster IA · Ferramenta de análise estatística. Loteria é um jogo de azar — jogue com responsabilidade.
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
