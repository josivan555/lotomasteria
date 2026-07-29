import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarJogosSalvos, excluirJogo } from "@/lib/lotofacil.functions";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { classificarScore } from "@/lib/lotofacil-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jogos")({
  head: () => ({
    meta: [
      { title: "Meus jogos salvos · LotoMaster IA" },
      { name: "description", content: "Gerencie seus jogos favoritados da Lotofácil, com Score IA de cada combinação salva para acompanhamento e revisão." },
      { property: "og:title", content: "Meus jogos · LotoMaster IA" },
      { property: "og:description", content: "Gerencie sua carteira de jogos salvos da Lotofácil com o Score IA de cada combinação." },
    ],
    links: [{ rel: "canonical", href: "https://lotomasteria.lovable.app/jogos" }],
  }),
  component: Jogos,
});

function Jogos() {
  const listar = useServerFn(listarJogosSalvos);
  const excluir = useServerFn(excluirJogo);
  const router = useRouter();

  const { data: jogos = [], isLoading } = useQuery({
    queryKey: ["jogos-salvos"],
    queryFn: () => listar(),
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
        <h1 className="text-2xl font-bold">Meus Jogos</h1>
        <p className="text-sm text-muted-foreground">{jogos.length} jogos salvos</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : jogos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhum jogo salvo ainda. Gere jogos e clique no ícone de marcador.
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
                      <DezenaBall key={n} n={n} className="h-8! w-8! text-xs!" />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c && j.score != null && (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${c.color}`}>{Number(j.score).toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                    </div>
                  )}
                  <Button size="sm" variant="ghost" aria-label="Excluir jogo" onClick={() => del.mutate(j.id)}>
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
