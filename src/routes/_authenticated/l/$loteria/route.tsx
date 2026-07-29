import {
  createFileRoute,
  Outlet,
  Link,
  notFound,
  useParams,
} from "@tanstack/react-router";
import { BarChart3, Bookmark, ClipboardCheck, Dice5, History } from "lucide-react";
import { isLoteriaId, LOTERIAS, type LoteriaId } from "@/lib/loterias-config";

export const Route = createFileRoute("/_authenticated/l/$loteria")({
  beforeLoad: ({ params }) => {
    if (!isLoteriaId(params.loteria)) throw notFound();
    return { loteria: params.loteria as LoteriaId };
  },
  component: LoteriaLayout,
});

function LoteriaLayout() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span
            className={`ball ${
              cfg.ballVariant === "blue"
                ? "ball-blue"
                : cfg.ballVariant === "purple"
                  ? "ball-purple"
                  : ""
            } h-11! w-11! text-sm!`}
          >
            {cfg.tamanho}
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Modalidade
            </p>
            <h1 className="text-xl font-bold leading-tight">{cfg.nome}</h1>
          </div>
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
  to: "/l/$loteria/dashboard" | "/l/$loteria/gerador" | "/l/$loteria/historico" | "/l/$loteria/jogos";
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
