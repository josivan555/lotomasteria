import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LOTERIA_IDS, LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { resumoOficialTodas } from "@/lib/loterias.functions";
import { listarBoloesPublicos } from "@/lib/boloes.functions";
import { Sparkles, CalendarDays, Trophy, Users } from "lucide-react";

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
          const resumo = resumoPorLoteria.get(id);
          const premioPrincipal = resumo?.faixas?.[0]?.premio ?? 0;
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

              {resumo && (
                <div className="mt-4 space-y-1.5 rounded-lg border border-border/50 bg-background/40 p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      Concurso {resumo.numero} · {formatarData(resumo.data_apuracao)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-primary" />
                    {premioPrincipal > 0 ? (
                      <span className="font-bold text-primary">
                        {brl.format(premioPrincipal)}
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({resumo.faixas[0].faixa})
                        </span>
                      </span>
                    ) : (
                      <span className="font-bold text-primary">
                        {resumo.acumulou ? "Acumulou!" : "Sem ganhadores"}
                      </span>
                    )}
                  </div>
                  {resumo.estimativaProximo > 0 && (
                    <p className="text-muted-foreground">
                      Próximo prêmio estimado:{" "}
                      <span className="font-semibold text-foreground">
                        {brl.format(resumo.estimativaProximo)}
                      </span>
                      {resumo.proximoData ? ` · ${formatarData(resumo.proximoData)}` : ""}
                    </p>
                  )}
                </div>
              )}

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

      <BoloesAbertos />
    </div>
  );
}

function BoloesAbertos() {
  const listarFn = useServerFn(listarBoloesPublicos);
  const { data: boloes = [], isLoading } = useQuery({
    queryKey: ["boloes-publicos", "ativos"],
    queryFn: () => listarFn(),
    staleTime: 60_000,
  });
  const abertos = (boloes as any[]).filter((b) => {
    const horario = b.horario_encerramento || "23:59:59";
    const prazo = new Date(`${b.prazo_vendas}T${horario}`);
    return b.cotas_disponiveis > 0 && new Date() <= prazo && !["encerrado", "sorteado", "conferido"].includes(b.status);
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
          <Users className="h-5 w-5 text-primary" /> Bolões abertos
        </h2>
        <Link to="/boloes/reserva" className="text-sm font-semibold text-primary hover:underline">
          Minhas reservas →
        </Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando bolões...</p>
      ) : abertos.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Nenhum bolão aberto no momento.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {abertos.map((b) => {
            const cfg = LOTERIAS[b.loteria_id as LoteriaId];
            const pct = Math.min(100, (b.cotas_compradas / b.total_cotas) * 100);
            return (
              <Link
                key={b.id}
                to="/boloes/$bolaoId"
                params={{ bolaoId: b.id }}
                search={{ tab: "participantes" } as any}
                className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:border-primary/50"
                style={{ borderTopColor: b.is_combo ? "#FFD700" : cfg?.cor, borderTopWidth: 3 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{b.is_combo ? "COMBO ESPECIAL" : cfg?.nome}</span>
                  {!b.is_combo && (
                    <span className="text-xs text-muted-foreground">Concurso {b.concurso_numero}</span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm">{b.nome}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{b.cotas_disponiveis} cotas livres</span>
                  <span className="font-bold text-foreground">
                    {Number(b.valor_cota).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/cota
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary group-hover:underline">Participar →</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
