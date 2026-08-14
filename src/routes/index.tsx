import { createFileRoute, Link } from "@tanstack/react-router";

import { Sparkles, BarChart3, Filter, Trophy, Clock, Users, ChevronRight, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarBoloesPublicos } from "@/lib/boloes.functions";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/notification-bell";

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
  const listarBoloesFn = useServerFn(listarBoloesPublicos);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: boloes = [], isLoading: isLoadingBoloes } = useQuery({
    queryKey: ["boloes-publicos"],
    queryFn: () => listarBoloesFn(),
  });

  const { data: userSession } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const isLoggedIn = !!userSession;

  const filteredBoloes = (boloes ?? []).filter((b: any) => 
    b.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6 md:py-6">
        <Link to={isLoggedIn ? "/loterias" : "/"} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <div className="ball h-8! w-8! text-sm! bg-primary text-primary-foreground font-black flex items-center justify-center rounded-full">L</div>
          <span>LotoMaster <span className="text-primary">IA</span></span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-4">
            <Link to="/resultados">Resultados</Link>
          </Button>
          {!isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="px-2 sm:px-4 hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "login" }}>Entrar</Link>
              </Button>
              <Button asChild size="sm" className="px-3 sm:px-6">
                <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
              </Button>
            </div>
          ) : (
              <NotificationBell />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button asChild size="sm" className="px-3 sm:px-6">
                <Link to="/loterias">Minha Área</Link>
              </Button>
            </div>
          )}
        </nav>
      </header>


      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <section className="py-10 text-center md:py-20 overflow-hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] sm:text-xs text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="h-3 w-3" /> Análise estatística inteligente
          </div>
          <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
            Veja também os{" "}
            <Link to="/resultados" className="text-primary hover:underline">
              últimos resultados oficiais da Lotofácil
            </Link>
            .
          </p>
          <h1 className="mt-6 text-2xl font-black tracking-tight sm:text-5xl md:text-6xl px-2 leading-[1.1]">
            Domine a{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent block sm:inline">
              Lotofácil, Mega-Sena e Quina
            </span>
            <span className="block sm:inline mt-1 sm:mt-0"> com IA estatística</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base text-muted-foreground md:text-lg px-4 leading-relaxed">

            O LotoMaster IA analisa todo o histórico oficial das três loterias, calcula um{" "}
            <strong className="text-foreground">Score IA</strong> para cada dezena e gera jogos
            equilibrados com dezenas de filtros estatísticos — dashboards e geradores dedicados
            para cada modalidade.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {!isLoggedIn ? (
              <>
                <Button asChild size="lg">
                  <Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth" search={{ mode: "login" }}>Já tenho conta</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="lg">
                <Link to="/loterias">Acessar Painel IA</Link>
              </Button>
            )}
          </div>
        </section>
        <section className="py-12 md:py-20 border-y border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Bolões LotoMaster</h2>
              <p className="text-muted-foreground mt-1">Participe de apostas coletivas geradas com nossa inteligência</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar bolão pelo nome..."
                  className="pl-9 bg-card/50 border-border/40"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="sm" asChild className="flex-1 sm:flex-none">
                  <Link to="/boloes/reserva">Minhas Reservas</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="flex-1 sm:flex-none">
                  <Link to="/auth" search={{ mode: "signup" }}>Ver todos <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>

          {isLoadingBoloes ? (
            <div className="text-center py-10 text-muted-foreground">Carregando bolões...</div>
          ) : filteredBoloes.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-border/60 text-muted-foreground">
              {searchTerm 
                ? `Nenhum bolão encontrado com o nome "${searchTerm}".`
                : "Nenhum bolão disponível no momento. Volte em breve!"}
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

              {filteredBoloes.slice(0, 6).map((b: any) => {
                const cfg = LOTERIAS[b.loteria_id as LoteriaId];
                const progresso = (b.cotas_compradas / b.total_cotas) * 100;
                
                return (
                  <div key={b.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur hover:border-primary/50 transition-all hover:shadow-lg">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: cfg.cor }} />
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <img src={cfg.logo} alt={cfg.nome} className="h-6 w-auto" />
                          <span className="font-bold text-sm">{cfg.nome}</span>
                        </div>
                        <div className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Concurso {b.concurso_numero}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{b.nome}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <Clock className="h-3 w-3" />
                        <span>Sorteio: {new Date(b.data_sorteio).toLocaleDateString('pt-BR')} às {b.horario_sorteio}</span>
                      </div>

                      <div className="bg-primary/5 rounded-xl p-4 mb-4 text-center border border-primary/10">
                        <p className="text-[10px] uppercase tracking-widest text-primary font-black mb-1">Prêmio Estimado</p>
                        <p className="text-2xl font-black text-foreground">{b.premio_estimado ? `R$ ${b.premio_estimado.toLocaleString('pt-BR')}` : '---'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="rounded-lg bg-secondary/30 p-2 text-center border border-border/40">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Valor Cota</p>
                          <p className="text-sm font-black text-primary">R$ {b.valor_cota.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/30 p-2 text-center border border-border/40">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Disponível</p>
                          <p className="text-sm font-black text-foreground">{b.cotas_disponiveis} / {b.total_cotas}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6 mt-auto">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progresso}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                          <span>{b.total_jogos} jogos IA</span>
                          <span>{progresso.toFixed(0)}% preenchido</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mt-auto">
                        <Button className="w-full font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 order-1 sm:order-none" asChild>
                          <Link to="/boloes/$bolaoId" params={{ bolaoId: b.id }} search={{ tab: 'participantes' }}>
                            Ver Reservas
                          </Link>
                        </Button>
                        <Button variant="outline" className="w-full font-bold border-primary/30 text-primary hover:bg-primary/5 order-2 sm:order-none" asChild>
                          <Link to="/boloes/$bolaoId" params={{ bolaoId: b.id }} search={{ tab: 'jogos' }}>
                            Ver Jogos
                          </Link>
                        </Button>
                      </div>

                    </div>
                  </div>

                );
              })}

            </div>
          )}
        </section>


        <section className="pb-24 pt-12">
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
