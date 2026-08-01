import {
  createFileRoute,
  Outlet,
  Link,
  notFound,
  useParams,
} from "@tanstack/react-router";
import { BarChart3, Bookmark, ClipboardCheck, Dice5, History, Printer, Coins, BookOpen } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatCreditos } from "@/lib/credits-config";
import { meuSaldo } from "@/lib/credits.functions";

import { isLoteriaId, LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
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
      className="h-9 shrink-0 gap-1.5 rounded-full px-3 shadow-lg shadow-primary/25 md:h-9 md:gap-2 md:px-4"
    >
      <Link to="/creditos" className="justify-center md:min-w-[5.5rem]">
        <Coins className="h-4 w-4" />
        <span className="flex flex-col items-start leading-none">
          <span className="hidden text-[10px] opacity-90 sm:block">Créditos</span>
          <span className="text-sm font-bold md:text-base">{formatCreditos(saldo)}</span>
        </span>
      </Link>
    </Button>
  );
}

function LoteriaLayout() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria" });

  useEffect(() => {
    if (!isLoteriaId(loteria)) return;
    document.documentElement.setAttribute("data-loteria", loteria);
    return () => document.documentElement.removeAttribute("data-loteria");
  }, [loteria]);

  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];


  return (
    <div className="space-y-6">
      <div className="sticky top-[96px] z-20 -mx-4 border-b border-border/50 bg-card/85 px-3 py-2 backdrop-blur md:-mx-8 md:top-[61px] md:px-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <img src={cfg.logo} alt="" className="h-6 w-auto shrink-0 rounded" />
              <span className="truncate text-sm font-semibold">{cfg.nome}</span>
            </div>
            <SaldoBadge />
          </div>

          <nav className="grid grid-cols-3 gap-1.5 md:flex md:min-w-0 md:flex-1 md:flex-wrap md:gap-2">
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
            <NavPill to="/l/$loteria/ajuda" loteria={loteria} cor={cfg.cor} icon={<BookOpen className="h-4 w-4" />}>
              Como usar
            </NavPill>
          </nav>
          <div className="hidden md:block">
            <SaldoBadge />
          </div>
        </div>
      </div>


      <div className="hidden rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur md:block md:p-4">
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
        </div>
      </div>


      <Outlet />
    </div>
  );
}

function NavPill({
  to,
  loteria,
  cor,
  icon,
  children,
}: {
  to: "/l/$loteria/dashboard" | "/l/$loteria/gerador" | "/l/$loteria/historico" | "/l/$loteria/jogos" | "/l/$loteria/resultados" | "/l/$loteria/volante" | "/l/$loteria/ajuda";
  loteria: LoteriaId;
  cor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const ativoBase =
    "inline-flex w-full shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border-2 px-2 py-1.5 text-[11px] font-semibold shadow-md transition md:w-auto md:justify-start md:gap-2 md:px-4 md:py-2 md:text-sm";
  return (
    <Link
      to={to}
      params={{ loteria }}
      className={ativoBase}
      inactiveProps={{
        className:
          "border-border/70 bg-secondary/60 text-foreground hover:bg-secondary hover:border-[color-mix(in_oklab,var(--loteria-cor)_45%,transparent)]",
        style: { ["--loteria-cor" as string]: cor },
      }}
      activeProps={{
        className: "text-white hover:brightness-110",
        style: {
          borderColor: cor,
          backgroundColor: `${cor}33`,
          boxShadow: `0 4px 14px ${cor}40`,
        },
      }}
    >
      {icon}
      {children}
    </Link>
  );
}
