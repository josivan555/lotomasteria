import {
  createFileRoute,
  Outlet,
  Link,
  notFound,
  useParams,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { BarChart3, Bookmark, ClipboardCheck, Dice5, History, Printer, ChevronsUpDown } from "lucide-react";
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <img
            src={cfg.logo}
            alt={`Logo ${cfg.nome}`}
            className="h-11 w-auto rounded-md shadow-sm"
          />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Modalidade
            </p>
            <h1 className="text-xl font-bold leading-tight">{cfg.nome}</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-1 gap-1.5">
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

        <nav className="flex flex-wrap gap-1">
          <NavPill to="/l/$loteria/dashboard" loteria={loteria} icon={<BarChart3 className="h-4 w-4" />}>
            Dashboard
          </NavPill>
          <NavPill to="/l/$loteria/gerador" loteria={loteria} icon={<Dice5 className="h-4 w-4" />}>
            Gerador
          </NavPill>
          <NavPill to="/l/$loteria/historico" loteria={loteria} icon={<History className="h-4 w-4" />}>
            Histórico
          </NavPill>
          <NavPill to="/l/$loteria/jogos" loteria={loteria} icon={<Bookmark className="h-4 w-4" />}>
            Meus jogos
          </NavPill>
          <NavPill to="/l/$loteria/resultados" loteria={loteria} icon={<ClipboardCheck className="h-4 w-4" />}>
            Resultados
          </NavPill>
          <NavPill to="/l/$loteria/volante" loteria={loteria} icon={<Printer className="h-4 w-4" />}>
            Volante
          </NavPill>
        </nav>
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{
        className: "border-primary bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
      }}
    >
      {icon}
      {children}
    </Link>
  );
}
