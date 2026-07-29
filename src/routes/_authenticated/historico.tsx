import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, sincronizarConcursos } from "@/lib/lotofacil.functions";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de concursos · LotoMaster IA" },
      { name: "description", content: "Consulte o histórico completo dos concursos da Lotofácil com busca, dezenas sorteadas e sincronização com a base oficial da Caixa." },
      { property: "og:title", content: "Histórico de concursos · LotoMaster IA" },
      { property: "og:description", content: "Histórico completo dos concursos da Lotofácil com busca e sincronização com a base oficial." },
    ],
    links: [{ rel: "canonical", href: "https://lotomasteria.lovable.app/historico" }],
  }),
  component: Historico,
});

function Historico() {
  const listar = useServerFn(listarConcursos);
  const sync = useServerFn(sincronizarConcursos);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: concursos = [], isLoading } = useQuery({
    queryKey: ["concursos"],
    queryFn: () => listar(),
  });

  const syncMut = useMutation({
    mutationFn: () => sync({ data: { limite: 100 } }),
    onSuccess: (r) => {
      toast.success(
        r.inseridos === 0
          ? "Já está atualizado!"
          : `+${r.inseridos} concursos sincronizados${r.faltam ? ` — faltam ${r.faltam}` : ""}`,
      );
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtrados = query
    ? concursos.filter((c) => String(c.numero).includes(query))
    : concursos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-sm text-muted-foreground">{concursos.length} concursos importados</p>
        </div>
        <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
          Sincronizar próximos 100
        </Button>
      </div>

      <Input
        placeholder="Buscar por número do concurso..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Concurso</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Dezenas</th>
                  <th className="px-4 py-3 text-right">Soma</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 200).map((c) => (
                  <tr key={c.numero} className="border-b border-border/30">
                    <td className="px-4 py-3 font-semibold">{c.numero}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(c.data_apuracao).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.dezenas.map((n) => (
                          <span
                            key={n}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                          >
                            {String(n).padStart(2, "0")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.soma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length > 200 && (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Mostrando os 200 mais recentes de {filtrados.length}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
