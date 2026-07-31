import {
  createFileRoute,
  Outlet,
  Link,
  notFound,
  useParams,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { BarChart3, Bookmark, ClipboardCheck, Dice5, History, Printer, ChevronsUpDown, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meuSaldo } from "@/lib/credits.functions";

import { isLoteriaId, LOTERIAS, LOTERIA_IDS, type LoteriaId } from "@/lib/loterias-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/l/$loteria")({
  beforeLoad: ({ params }) => {
    if (!isLoteriaId(params.loteria)) throw notFound();
    return { loteria: params.loteria as LoteriaId };
  },
  component: LoteriaLayout,
});

function SaldoBadge() {
  const saldoFn = useServerFn(meuSaldo);
  const { data } = useQuery({ queryKey: ["saldo"], queryFn: () => saldoFn({}) });
  const saldo = data?.balance ?? 0;
  return (
    <Button
      asChild
      variant="default"
      size="sm"
      className="shrink-0 gap-2 rounded-full px-4 shadow-lg shadow-primary/25"
    >
      <Link to="/creditos" className="min-w-[5.5rem] justify-center">
        <Coins className="h-4 w-4" />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] opacity-90">Créditos</span>
          <span className="text-base font-bold">{saldo}</span>
        </span>
      </Link>
    </Button>
  );
}

function LoteriaLayout() {

  const { loteria } = useParams({ from: "/_authenticated/l/$loteria" });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];

  function trocarLoteria(destino: LoteriaId) {
    if (destino === loteria) return;
    // Mantém a mesma sub-aba (dashboard, gerador, historico, ...) ao trocar de loteria.
    const sub = pathname.split(`/l/${loteria}`)[1] ?? "";
    navigate({ to: `/l/${destino}${sub || "/dashboard"}` });
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[57px] z-20 -mx-4 border-b border-border/50 bg-card/85 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <nav className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            <NavPill to="/l/$loteria/dashboard" loteria={loteria} cor={cfg.cor} icon={<BarChart3 className="h-4 w-4" />}>
              Dashboard
            </NavPill>
            <NavPill to="/l/$loteria/gerador" loteria={loteria} cor={cfg.cor} icon={<Dice5 className="h-4 w-4" />}>
              Gerador
            </NavPill>
            <NavPill to="/l/$loteria/historico" loteria={loteria} cor={cfg.cor} icon={<History className="h-4 w-4" />}>
              Histórico
            </NavPill>
            <NavPill to="/l/$loteria/jogos" loteria={loteria} cor={cfg.cor} icon={<Bookmark className="h-4 w-4" />}>
              Meus jogos
            </NavPill>
            <NavPill to="/l/$loteria/resultados" loteria={loteria} cor={cfg.cor} icon={<ClipboardCheck className="h-4 w-4" />}>
              Resultados
            </NavPill>
            <NavPill to="/l/$loteria/volante" loteria={loteria} cor={cfg.cor} icon={<Printer className="h-4 w-4" />}>
              Volante
            </NavPill>
          </nav>
          <SaldoBadge />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur md:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={cfg.logo}
            alt={`Logo ${cfg.nome}`}
            className="h-9 w-auto shrink-0 rounded-md shadow-sm md:h-11"
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground md:text-xs">
              Modalidade
            </p>
            <h1 className="truncate text-lg font-bold leading-tight md:text-xl">{cfg.nome}</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-1 shrink-0 gap-1.5">
                Trocar
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Escolher modalidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LOTERIA_IDS.map((id) => {
                const l = LOTERIAS[id];
                return (
                  <DropdownMenuItem
                    key={id}
                    onSelect={() => trocarLoteria(id)}
                    className={id === loteria ? "bg-primary/10 text-primary" : ""}
                  >
                    <img src={l.logo} alt="" className="mr-2 h-5 w-5 rounded object-contain" />
                    {l.nome}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      <Outlet />
    </div>
  );
}

function NavPill({
  to,
  loteria,
  icon,
  children,
}: {
  to: "/l/$loteria/dashboard" | "/l/$loteria/gerador" | "/l/$loteria/historico" | "/l/$loteria/jogos" | "/l/$loteria/resultados" | "/l/$loteria/volante";
  loteria: LoteriaId;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      params={{ loteria }}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{
        className: "border-primary bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
      }}
    >
      {icon}
      {children}
    </Link>
  );
}
