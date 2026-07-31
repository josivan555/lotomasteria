import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureBrowserSession } from "@/lib/session-guard";
import { LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import logoAsset from "@/assets/lotomaster-logo.png.asset.json";
import { isLoteriaId, LOTERIAS, LOTERIA_IDS, type LoteriaId } from "@/lib/loterias-config";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    await ensureBrowserSession();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function extractLoteriaAtual(pathname: string): LoteriaId | null {
  const match = pathname.match(/^\/l\/([^/]+)/);
  const id = match?.[1];
  return isLoteriaId(id) ? id : null;
}

function AuthedLayout() {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const loteriaAtual = extractLoteriaAtual(pathname);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  function trocarLoteriaUrl(destino: LoteriaId) {
    if (!loteriaAtual) return `/l/${destino}/dashboard`;
    const sub = pathname.split(`/l/${loteriaAtual}`)[1] ?? "";
    return `/l/${destino}${sub || "/dashboard"}`;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/loterias" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <img
              src={logoAsset.url}
              alt="LotoMaster IA"
              className="h-9 w-9 rounded-lg object-contain ring-1 ring-border/40"
            />
            <span>
              LotoMaster <span className="text-primary">IA</span>
            </span>
          </Link>

          <div className="flex flex-1 items-center justify-center gap-2 px-2">
            {loteriaAtual &&
              LOTERIA_IDS.filter((id) => id !== loteriaAtual).map((id) => {
                const l = LOTERIAS[id];
                return (
                  <Button
                    key={id}
                    asChild
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-full border-2 px-3 font-semibold text-white shadow-sm transition hover:brightness-110"
                    style={{ backgroundColor: l.cor, borderColor: l.cor }}
                  >
                    <Link to={trocarLoteriaUrl(id)}>
                      <img src={l.logo} alt="" className="h-4 w-4 rounded object-contain" />
                      <span className="hidden sm:inline">{l.nome}</span>
                    </Link>
                  </Button>
                );
              })}
          </div>

          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/loterias">
                <Home className="mr-1.5 h-4 w-4" /> Loterias
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
