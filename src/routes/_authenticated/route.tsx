import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureBrowserSession } from "@/lib/session-guard";
import { LogOut, Home, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import logoAsset from "@/assets/lotomaster-logo.png.asset.json";
import { isLoteriaId, LOTERIAS, LOTERIA_IDS, type LoteriaId } from "@/lib/loterias-config";
import { meuPerfil } from "@/lib/loterias.functions";
import { useServerFn } from "@tanstack/react-start";


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
  const getPerfil = useServerFn(meuPerfil);

  const { data: profile } = useQuery({
    queryKey: ["meu-perfil"],
    queryFn: () => getPerfil(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 py-2 md:px-8 md:py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:flex md:justify-between md:gap-3">
            <Link
              to="/loterias"
              className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight md:text-lg"
            >
              <img
                src={logoAsset.url}
                alt="LotoMaster IA"
                className="h-8 w-8 shrink-0 rounded-lg object-contain ring-1 ring-border/40 md:h-9 md:w-9"
              />
              <span className="truncate">
                LotoMaster <span className="text-primary">IA</span>
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-1 md:gap-2">
              {loteriaAtual && (
                <div className="hidden items-center gap-1 rounded-lg border border-border/60 bg-background/40 p-1 md:flex">
                  {LOTERIA_IDS.filter((id) => id !== loteriaAtual).map((id) => {
                    const l = LOTERIAS[id];
                    return (
                      <Button
                        key={id}
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-2 rounded-md border bg-background/60 px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                        style={{ borderColor: l.cor }}
                      >
                        <Link to={trocarLoteriaUrl(id)}>
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: l.cor }}
                          />
                          <span>{l.nome}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              )}

              <NotificationBell />
              <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Loterias">
                <Link to="/loterias">
                  <Home className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={signOut}
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>

              <div className="hidden md:block">
                <NotificationBell />
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link to="/loterias">
                  <Home className="mr-1.5 h-4 w-4" /> Loterias
                </Link>
              </Button>
              {profile?.isAdmin && (
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex text-primary">
                  <Link to="/admin">
                    <ShieldCheck className="mr-1.5 h-4 w-4" /> Painel Admin
                  </Link>
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:inline-flex">
                <LogOut className="mr-1.5 h-4 w-4" /> Sair
              </Button>
            </div>
          </div>

          {loteriaAtual && (
            <div className="mt-2 flex items-center gap-1 rounded-lg border border-border/60 bg-background/40 p-1 md:hidden">
              {LOTERIA_IDS.filter((id) => id !== loteriaAtual).map((id) => {
                const l = LOTERIAS[id];
                return (
                  <Button
                    key={id}
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-8 flex-1 gap-1.5 rounded-md border bg-background/60 px-2 text-xs font-medium text-muted-foreground"
                    style={{ borderColor: l.cor }}
                  >
                    <Link to={trocarLoteriaUrl(id)}>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: l.cor }}
                      />
                      <span className="truncate">{l.nome}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          )}

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
