import { createFileRoute, useRouter, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listarJogosSalvos, excluirJogo, excluirTodosJogos } from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Printer, Trash } from "lucide-react";
import { classificarScore } from "@/lib/loteria-utils";
import { toast } from "sonner";
import { exportarJogosPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/l/$loteria/jogos")({
  component: Jogos,
});

function Jogos() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/jogos" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];
  const ballVariant = cfg.ballVariant === "green" ? "default" : cfg.ballVariant;

  const listar = useServerFn(listarJogosSalvos);
  const excluir = useServerFn(excluirJogo);
  const router = useRouter();

  const { data: jogos = [], isLoading } = useQuery({
    queryKey: ["jogos-salvos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Jogo excluído");
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const jogosFiltrados = useMemo(() => {
    if (!dateFrom && !dateTo) return jogos;
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : -Infinity;
    const to = dateTo ? new Date(dateTo + "T23:59:59.999").getTime() : Infinity;
    return jogos.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [jogos, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Meus Jogos · {cfg.nome}</h2>
          <p className="text-sm text-muted-foreground">
            {jogosFiltrados.length} de {jogos.length} jogos
            {(dateFrom || dateTo) ? " (filtrados)" : " salvos"}
          </p>
        </div>
        {jogos.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="jogos-from" className="text-xs text-muted-foreground">De</Label>
              <Input
                id="jogos-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="jogos-to" className="text-xs text-muted-foreground">Até</Label>
              <Input
                id="jogos-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Limpar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={jogosFiltrados.length === 0}
              onClick={() =>
                exportarJogosPDF({
                  loteriaNome: cfg.nome,
                  cor: cfg.cor,
                  jogos: jogosFiltrados.map((j) => ({
                    dezenas: j.dezenas,
                    score: j.score,
                    created_at: j.created_at,
                  })),
                })
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button size="sm" asChild>
              <Link to="/l/$loteria/volante" params={{ loteria }}>
                <Printer className="mr-2 h-4 w-4" />
                Gerar volante
              </Link>
            </Button>
          </div>
        )}
      </div>


      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : jogos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhum jogo salvo ainda. Gere jogos no Gerador e clique no ícone de marcador.
        </div>
      ) : (
        <ol className="space-y-2">
          {jogos.map((j) => {
            const c = j.score != null ? classificarScore(Number(j.score)) : null;
            return (
              <li
                key={j.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(j.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {j.dezenas.map((n) => (
                      <DezenaBall
                        key={n}
                        n={n}
                        variant={ballVariant}
                        className="h-8! w-8! text-xs!"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c && j.score != null && (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${c.color}`}>
                        {Number(j.score).toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Excluir jogo"
                    onClick={() => del.mutate(j.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
