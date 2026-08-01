import { createFileRoute, useRouter, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, sincronizarConcursos, statusSincronizacao } from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useJanelaAnalise } from "@/lib/janela-analise";
import { JanelaAnalise } from "@/components/janela-analise";

export const Route = createFileRoute("/_authenticated/l/$loteria/historico")({
  component: Historico,
});

function Historico() {
  const { loteria } = useParams({ from: "/_authenticated/l/$loteria/historico" });
  if (!isLoteriaId(loteria)) return null;
  const cfg = LOTERIAS[loteria];
  const ballVariant = cfg.ballVariant === "green" ? "default" : cfg.ballVariant;

  const listar = useServerFn(listarConcursos);
  const sync = useServerFn(sincronizarConcursos);
  const status = useServerFn(statusSincronizacao);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: concursos = [], isLoading } = useQuery({
    queryKey: ["concursos", loteria],
    queryFn: () => listar({ data: { loteria } }),
  });

  const { data: statusSync, refetch: refetchStatus } = useQuery({
    queryKey: ["status-sync", loteria],
    queryFn: () => status({ data: { loteria } }),
  });

  const syncMut = useMutation({
    mutationFn: () => sync({ data: { loteria, limite: 100 } }),
    onSuccess: (r) => {
      toast.success(
        r.inseridos === 0
          ? "Já está atualizado!"
          : `+${r.inseridos} concursos sincronizados${r.faltam ? ` — faltam ${r.faltam}` : ""}`,
      );
      queryClient.invalidateQueries({ queryKey: ["concursos", loteria] });
      refetchStatus();
      router.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const emDia =
    statusSync?.ultimoOficial != null && statusSync?.ultimoNumero != null
      ? statusSync.ultimoNumero >= statusSync.ultimoOficial
      : null;


  const filtrados = query ? concursos.filter((c) => String(c.numero).includes(query)) : concursos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold md:text-2xl">Histórico · {cfg.nome}</h2>
          <p className="text-sm text-muted-foreground">{concursos.length} concursos importados</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
          Sincronizar 100 mais recentes
        </Button>

      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Último concurso sincronizado
            </p>
            <p className="text-lg font-bold">
              {statusSync?.ultimoNumero ?? "—"}
              {statusSync?.ultimaDataApuracao && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {new Date(statusSync.ultimaDataApuracao + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Última atualização</p>
            <p className="text-lg font-bold">
              {statusSync?.ultimaAtualizacao
                ? new Date(statusSync.ultimaAtualizacao).toLocaleString("pt-BR")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Situação</p>
            {emDia === null ? (
              <p className="text-sm text-muted-foreground">Não foi possível consultar a Caixa</p>
            ) : emDia ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> Em dia (oficial: {statusSync?.ultimoOficial})
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                Faltam {(statusSync!.ultimoOficial ?? 0) - (statusSync!.ultimoNumero ?? 0)} concursos (oficial:{" "}
                {statusSync?.ultimoOficial})
              </p>
            )}
          </div>
        </div>
      </div>

      <JanelaAnalise total={concursos.length} janela={janela} onChange={setJanela} />

      <Input
        placeholder="Buscar por número do concurso..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-xs"
      />


      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/60 text-left text-[10px] uppercase text-muted-foreground md:text-xs">
                  <th className="px-2 py-3 md:px-4">Conc.</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Data</th>
                  <th className="px-2 py-3 md:px-4">Dezenas</th>
                  <th className="px-2 py-3 text-right md:px-4">Soma</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 200).map((c) => (
                  <tr key={c.numero} className="border-b border-border/30">
                    <td className="px-2 py-3 text-sm font-semibold md:px-4">{c.numero}</td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                      {new Date(c.data_apuracao + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-2 py-3 md:px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.dezenas.map((n) => (
                          <DezenaBall
                            key={n}
                            n={n}
                            variant={ballVariant}
                            className="h-6! w-6! text-[10px]! md:h-7! md:w-7! md:text-xs!"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right text-sm md:px-4">{c.soma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
