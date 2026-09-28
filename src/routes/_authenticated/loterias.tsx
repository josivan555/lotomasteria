import type { CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LOTERIA_IDS, LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { resumoOficialTodas } from "@/lib/loterias.functions";
import { listarBoloesPublicos } from "@/lib/boloes.functions";
import { CalendarDays, Clock3, Coins, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/lotomaster-logo.png.asset.json";

/** Cor dos bolões combo (várias modalidades juntas). */
const COR_COMBO = "#f5c542";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      <section className="lottery-hub-hero">
        <div className="lottery-hub-emblem">
          <img src={logoAsset.url} alt="LotoMaster IA" />
        </div>
        <div className="lottery-hub-copy">
          <h1>
            Qual <span>loteria</span> você quer analisar?
          </h1>
          <p>
            Cada modalidade tem seu próprio dashboard, gerador inteligente com filtros dedicados,
            histórico oficial e coleção de jogos salvos.
          </p>
        </div>
        <div className="lottery-hub-balls" aria-hidden="true">
          <span>15</span><span>42</span><span>33</span>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {LOTERIA_IDS.map((id) => {
          const cfg = LOTERIAS[id];
          const resumo = resumoPorLoteria.get(id);
          const premioPrincipal = resumo?.faixas?.[0]?.premio ?? 0;
          return (
            <article
              key={id}
              data-loteria={id}
              className="lottery-choice-card group"
            >
              <div className="lottery-choice-banner">
                <img
                  src={cfg.banner}
                  alt={cfg.nome}
                  className="h-full w-full object-cover object-left"
                  loading="lazy"
                />
                <div className="lottery-choice-banner-title">
                  <h2>{cfg.nome}</h2>
                </div>
              </div>
              <div className="lottery-choice-body">
                <p className="lottery-choice-short">
                  <Clock3 /> {cfg.descricaoCurta}
                </p>

                <p className="lottery-choice-description">{cfg.descricaoLonga}</p>

                <div className="lottery-prize-box">
                  {resumo ? (
                    <>
                      <div className="lottery-prize-row">
                        <Trophy />
                        <div>
                          <p>Concurso {resumo.numero} · {formatarData(resumo.data_apuracao)}</p>
                          {premioPrincipal > 0 ? (
                            <strong>
                              {brl.format(premioPrincipal)} <small>({resumo.faixas[0].faixa})</small>
                            </strong>
                          ) : (
                            <strong>{resumo.acumulou ? "Acumulou!" : "Sem ganhadores"}</strong>
                          )}
                        </div>
                      </div>
                      {resumo.estimativaProximo > 0 && (
                        <div className="lottery-prize-row lottery-prize-next">
                          <Coins />
                          <div>
                            <p>Próximo prêmio estimado:</p>
                            <strong>
                              {brl.format(resumo.estimativaProximo)}
                              {resumo.proximoData ? ` · ${formatarData(resumo.proximoData)}` : ""}
                            </strong>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="lottery-prize-row">
                      <CalendarDays />
                      <div><p>Dados do concurso</p><strong>Carregando resultado...</strong></div>
                    </div>
                  )}
                </div>

                <div className="lottery-choice-footer">
                  <span className="lottery-number-chip">
                    <Users /> {cfg.total} números
                  </span>
                  <Button asChild size="sm" className="lottery-open-button">
                    <Link to="/l/$loteria/dashboard" params={{ loteria: id }}>
                      Abrir análise →
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
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
    const prazo = new Date(`${String(b.prazo_vendas).slice(0, 10)}T${horario}`);
    return b.cotas_disponiveis > 0 && new Date() <= prazo && !["encerrado", "sorteado", "conferido"].includes(b.status);
  });

  return (
    <section className="app-panel lottery-grid space-y-4 rounded-lg p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/50 bg-primary/15 text-primary shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_20%,transparent)]">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-black text-primary md:text-xl">
              Bolões abertos
            </h2>
            <p className="text-xs text-muted-foreground">
              Escolha seu bolão e acompanhe as cotas em tempo real.
            </p>
          </div>
        </div>
        <Link
          to="/boloes/reserva"
          className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
        >
          Minhas reservas →
        </Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando bolões...</p>
      ) : abertos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gold/25 p-6 text-center text-sm text-muted-foreground">
          Nenhum bolão aberto no momento.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {abertos.map((b) => {
            const cfg = LOTERIAS[b.loteria_id as LoteriaId];
            const cor = b.is_combo ? COR_COMBO : cfg?.cor ?? COR_COMBO;
            const pct = Math.min(100, (b.cotas_compradas / b.total_cotas) * 100);
            return (
              <Link
                key={b.id}
                to="/boloes/$bolaoId"
                params={{ bolaoId: b.id }}
                search={{ tab: "participantes" } as any}
                className="bolao-card group flex flex-col gap-3 p-5"
                style={{ "--bl": cor } as CSSProperties}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="bolao-chip rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
                    {b.is_combo ? "Combo especial" : cfg?.nome ?? "Bolão"}
                  </span>
                  {!b.is_combo && (
                    <span className="text-xs text-muted-foreground">
                      Concurso {b.concurso_numero}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-semibold">{b.nome}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="bolao-bar h-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {b.cotas_disponiveis} de {b.total_cotas} cotas livres
                  </span>
                  <span className="bolao-ink text-sm font-black">
                    {brl.format(Number(b.valor_cota))}
                    <span className="text-[11px] font-medium text-muted-foreground">
                      /cota
                    </span>
                  </span>
                </div>
                <span className="bolao-ink text-sm font-semibold group-hover:underline">
                  Participar →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
