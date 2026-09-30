import {
  createFileRoute,
  Outlet,
  Link,
  notFound,
  useParams,
} from "@tanstack/react-router";
import { BarChart3, Bookmark, ClipboardCheck, Dice5, History, Printer, Coins, BookOpen, ChevronRight } from "lucide-react";
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
  const ilimitado = data?.unlimited ?? false;
  return (
    <Link
      to="/creditos"
      className="group flex h-11 shrink-0 items-stretch overflow-hidden rounded-full border-2 border-gold shadow-lg shadow-gold/40 transition-transform hover:scale-[1.03] md:h-12"
    >
      <span className="flex items-center gap-1.5 bg-background px-3">
        <Coins className="h-5 w-5 text-gold" />
        <span className="text-sm font-bold text-foreground md:text-base">
          {ilimitado ? "∞" : formatCreditos(saldo)}
        </span>
      </span>
      <span className="flex items-center gap-1 bg-gold px-3 text-background md:px-4">
        <span className="text-xs font-extrabold leading-tight md:text-sm">
          Comprar<br className="hidden sm:block" /> Créditos
        </span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
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
    <div className="lottery-workspace space-y-5 md:space-y-6">
      <section className="lottery-hero relative overflow-hidden rounded-lg">
        <div className="lottery-hero-grid absolute inset-0" />
        <img
          src={cfg.banner}
          alt=""
          aria-hidden="true"
          className="absolute -right-8 top-1/2 h-28 w-auto -translate-y-1/2 opacity-35 drop-shadow-2xl sm:right-4 sm:h-36 md:right-8 md:h-44 md:opacity-55"
        />
        <div className="relative flex min-h-32 items-center gap-4 px-5 py-6 sm:min-h-36 md:px-8">
          <div className="lottery-logo-frame flex h-16 w-16 shrink-0 items-center justify-center rounded-lg md:h-20 md:w-20">
            <img src={cfg.logo} alt={`Logo ${cfg.nome}`} className="max-h-12 max-w-14 object-contain md:max-h-16 md:max-w-16" />
          </div>
          <div className="min-w-0 max-w-2xl">
            <p className="lottery-kicker text-[10px] font-black uppercase tracking-widest md:text-xs">Central de análise</p>
            <h1 className="mt-1 truncate text-2xl font-black leading-tight sm:text-3xl md:text-4xl">{cfg.nome}</h1>
            <p className="mt-1 max-w-xl text-xs font-medium text-muted-foreground sm:text-sm md:text-base">{cfg.descricaoCurta}</p>
          </div>
        </div>
      </section>

      <div className="lottery-nav sticky top-[96px] z-20 -mx-4 px-3 py-2 md:-mx-8 md:top-[65px] md:px-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <img src={cfg.logo} alt="" className="h-6 w-auto shrink-0 rounded" />
              <span className="truncate text-sm font-semibold">{cfg.nome}</span>
            </div>
            <SaldoBadge />
          </div>

          <nav className="grid grid-cols-3 gap-1.5 md:flex md:min-w-0 md:flex-1 md:flex-wrap md:gap-2">
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
            <NavPill to="/l/$loteria/ajuda" loteria={loteria} icon={<BookOpen className="h-4 w-4" />}>
              Como usar
            </NavPill>
          </nav>
          <div className="hidden md:block">
            <SaldoBadge />
          </div>
        </div>
      </div>


      <div className="lottery-content"><Outlet /></div>
    </div>
  );
}

function NavPill({
  to,
  loteria,
  icon,
  children,
}: {
  to: "/l/$loteria/dashboard" | "/l/$loteria/gerador" | "/l/$loteria/historico" | "/l/$loteria/jogos" | "/l/$loteria/resultados" | "/l/$loteria/volante" | "/l/$loteria/ajuda";
  loteria: LoteriaId;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const ativoBase =
    "inline-flex w-full shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg border px-2 py-1.5 text-[11px] font-bold shadow-md transition md:w-auto md:justify-start md:gap-2 md:px-4 md:py-2 md:text-sm";
  return (
    <Link
      to={to}
      params={{ loteria }}
      className={ativoBase}
      inactiveProps={{
        className: "border-line/35 bg-surface/70 text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-foreground",
      }}
      activeProps={{
        className: "lottery-nav-active border-primary bg-primary/20 text-foreground hover:brightness-110",
      }}
    >
      {icon}
      {children}
    </Link>
  );
}
