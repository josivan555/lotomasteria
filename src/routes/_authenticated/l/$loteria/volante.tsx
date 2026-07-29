import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarJogosSalvos } from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { VolanteCanvas } from "@/components/volante-canvas";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/l/$loteria/volante")({
  component: VolantePage,
});

function VolantePage() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/volante" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];

  const listar = useServerFn(listarJogosSalvos);
  const { data: jogos = [], isLoading } = useQuery({
    queryKey: ["jogos-salvos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Volante · {cfg.nome}</h2>
          <p className="text-sm text-muted-foreground">
            Ajuste a calibração, salve e imprima os jogos direto no volante oficial.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/l/$loteria/jogos" params={{ loteria }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Meus jogos
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando jogos...</p>
      ) : (
        <VolanteCanvas
          cfg={cfg}
          jogos={jogos.map((j) => ({
            id: j.id,
            dezenas: j.dezenas,
            created_at: j.created_at,
          }))}
        />
      )}
    </div>
  );
}
