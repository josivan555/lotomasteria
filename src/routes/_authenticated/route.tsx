import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Dice5, History, Bookmark, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border/50 bg-card/40 backdrop-blur md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-6 text-lg font-bold">
          <span className="ball ball-gold h-8! w-8! text-sm!">L</span>
          LotoMaster
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <NavItem to="/dashboard" icon={<BarChart3 className="h-4 w-4" />}>Dashboard</NavItem>
          <NavItem to="/gerador" icon={<Dice5 className="h-4 w-4" />}>Gerador</NavItem>
          <NavItem to="/historico" icon={<History className="h-4 w-4" />}>Histórico</NavItem>
          <NavItem to="/jogos" icon={<Bookmark className="h-4 w-4" />}>Meus Jogos</NavItem>
        </nav>
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="border-b border-border/40 px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <span className="font-bold">LotoMaster IA</span>
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          <MobileNav to="/dashboard">Dashboard</MobileNav>
          <MobileNav to="/gerador">Gerador</MobileNav>
          <MobileNav to="/historico">Histórico</MobileNav>
          <MobileNav to="/jogos">Jogos</MobileNav>
        </div>
      </div>

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary" }}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNav({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="whitespace-nowrap rounded-full border border-border/60 px-3 py-1 text-xs"
      activeProps={{ className: "border-primary bg-primary/15 text-primary" }}
    >
      {children}
    </Link>
  );
}
