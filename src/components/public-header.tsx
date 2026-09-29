import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Home, MessageCircle, Search, TicketCheck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/lotomaster-logo.png.asset.json";

export function PublicHeader({ showSearch = false }: { showSearch?: boolean }) {
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });
  const isLoggedIn = !!session;

  return (
    <header className="app-header sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src={logoAsset.url} alt="LotoMaster IA" className="h-10 w-10 shrink-0 object-contain" />
          <span className="hidden font-black sm:block">
            Loto<span className="neon-text">Master</span>
            <small className="block text-[8px] font-semibold uppercase text-muted-foreground">Sonhe · escolha · ganhe</small>
          </span>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2" aria-label="Navegação principal">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to={isLoggedIn ? "/loterias" : "/"}><Home /> Início</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/"><TicketCheck /> Bolões</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/resultados"><BarChart3 /> Resultados</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/contato"><MessageCircle /> Contato</Link>
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          {showSearch && <Search className="hidden h-4 w-4 text-muted-foreground lg:block" />}
          <Button asChild variant="outline" size="icon" aria-label="Entrar na conta">
            <Link to={isLoggedIn ? "/loterias" : "/auth"} search={isLoggedIn ? undefined : { mode: "login" }}>
              {isLoggedIn ? <Home /> : <UserRound />}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
