import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LOTERIA_IDS, LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { resumoOficialTodas } from "@/lib/loterias.functions";
import { Sparkles, CalendarDays, Trophy } from "lucide-react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const Route = createFileRoute("/_authenticated/loterias")({
  head: () => ({
    meta: [
      { title: "Escolha sua loteria · LotoMaster IA" },
      {
        name: "description",
        content:
          "Selecione a loteria que deseja analisar: Lotofácil, Mega-Sena ou Quina. Cada uma com dashboard, gerador inteligente e histórico próprios.",
      },
      { property: "og:title", content: "Escolha sua loteria · LotoMaster IA" },
      {
        property: "og:description",
        content: "Análises e geradores dedicados para Lotofácil, Mega-Sena e Quina.",
      },
    ],
  }),
  component: LoteriasHub,
});

function LoteriasHub() {
  const resumoFn = useServerFn(resumoOficialTodas);
  const { data: resumos = [] } = useQuery({
    queryKey: ["resumo-oficial-todas"],
    queryFn: () => resumoFn(),
    staleTime: 5 * 60_000,
  });
  const resumoPorLoteria = new Map(resumos.map((r) => [r.loteria as LoteriaId, r]));

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3 w-3" /> Escolha uma modalidade
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
          Qual loteria você quer analisar?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Cada modalidade tem seu próprio dashboard, gerador inteligente com filtros dedicados,
          histórico oficial e coleção de jogos salvos.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {LOTERIA_IDS.map((id) => {
          const cfg = LOTERIAS[id];
          return (
            <Link
              key={id}
              to="/l/$loteria/dashboard"
              params={{ loteria: id }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition hover:border-primary/50 hover:shadow-lg"
            >
              <div
                className={`absolute inset-0 -z-10 bg-gradient-to-br ${cfg.corFundo} opacity-60 transition group-hover:opacity-100`}
              />
              <div className="flex flex-col gap-3">
                <img
                  src={cfg.logo}
                  alt={`Logo ${cfg.nome}`}
                  className="h-12 w-auto self-start rounded-md shadow-sm"
                  loading="lazy"
                />
                <div>
                  <h2 className="text-lg font-bold">{cfg.nome}</h2>
                  <p className="text-xs text-muted-foreground">{cfg.descricaoCurta}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{cfg.descricaoLonga}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                  {cfg.total} números
                </span>
                <span className="font-semibold text-primary group-hover:underline">
                  Abrir análise →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
