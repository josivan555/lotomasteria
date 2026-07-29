import { createFileRoute, useRouter, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarJogosSalvos, excluirJogo } from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { classificarScore } from "@/lib/loteria-utils";
import { toast } from "sonner";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Meus Jogos · {cfg.nome}</h2>
        <p className="text-sm text-muted-foreground">{jogos.length} jogos salvos</p>
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
