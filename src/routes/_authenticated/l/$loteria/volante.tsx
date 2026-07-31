import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listarJogosSalvos, ultimoResultadoCaixa } from "@/lib/loterias.functions";
import { LOTERIAS, isLoteriaId } from "@/lib/loterias-config";
import { VolanteCanvas } from "@/components/volante-canvas";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckSquare, Square } from "lucide-react";

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

  const ultimoFn = useServerFn(ultimoResultadoCaixa);
  const { data: oficial } = useQuery({
    queryKey: ["ultimo-resultado", loteria],
    queryFn: () => ultimoFn({ data: { loteria } }),
    staleTime: 60_000,
  });

  const ultimoSorteado = oficial?.numero ?? null;
  const { vigentes, antigos } = useMemo(() => {
    const vig = jogos.filter((j) =>
      ultimoSorteado == null
        ? true
        : j.concurso_alvo != null && j.concurso_alvo > ultimoSorteado,
    );
    const ant = jogos.filter((j) => !vig.includes(j));
    return { vigentes: vig, antigos: ant };
  }, [jogos, ultimoSorteado]);

  const [incluirAntigos, setIncluirAntigos] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [concursoSel, setConcursoSel] = useState<string>("todos");

  const grupos = useMemo(() => {
    const map = new Map<string, typeof antigos>();
    for (const j of antigos) {
      const k = j.concurso_alvo != null ? String(j.concurso_alvo) : "sem";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(j);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "sem") return 1;
      if (b[0] === "sem") return -1;
      return Number(b[0]) - Number(a[0]);
    });
  }, [antigos]);

  const gruposVisiveis = useMemo(
    () => (concursoSel === "todos" ? grupos : grupos.filter(([k]) => k === concursoSel)),
    [grupos, concursoSel],
  );

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGrupo = (lista: typeof antigos) => {
    const todos = lista.every((j) => selecionados.has(j.id));
    setSelecionados((prev) => {
      const next = new Set(prev);
      for (const j of lista) {
        if (todos) next.delete(j.id);
        else next.add(j.id);
      }
      return next;
    });
  };

  const visiveis = gruposVisiveis.flatMap(([, l]) => l);
  const todosSelecionados = visiveis.length > 0 && visiveis.every((j) => selecionados.has(j.id));
  const toggleTodos = () => toggleGrupo(visiveis);

  const listaFinal = useMemo(
    () => [...vigentes, ...antigos.filter((j) => selecionados.has(j.id))],
    [vigentes, antigos, selecionados],
  );

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

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Switch
            id="incluir-antigos"
            checked={incluirAntigos}
            onCheckedChange={(v) => {
              setIncluirAntigos(v);
              if (!v) setSelecionados(new Set());
            }}
          />
          <Label htmlFor="incluir-antigos" className="cursor-pointer text-sm">
            Incluir jogos de concursos já sorteados
            <span className="ml-1 text-muted-foreground">
              ({antigos.length} no histórico)
            </span>
          </Label>
        </div>

        {incluirAntigos && (
          <div className="rounded-md border border-border bg-background p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Concurso:</span>
                <Select value={concursoSel} onValueChange={setConcursoSel}>
                  <SelectTrigger className="h-9 w-[190px]">
                    <SelectValue placeholder="Todos os concursos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os concursos</SelectItem>
                    {grupos.map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        {k === "sem" ? "Sem concurso" : `Concurso ${k}`} ({l.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleTodos}
                disabled={visiveis.length === 0}
              >
                {todosSelecionados ? (
                  <>
                    <Square className="mr-1.5 h-4 w-4" /> Limpar seleção
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-4 w-4" /> Selecionar todos
                  </>
                )}
              </Button>
            </div>

            {gruposVisiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum jogo de concurso passado encontrado.
              </p>
            ) : (
              <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                {gruposVisiveis.map(([k, lista]) => {
                  const grupoTodos = lista.every((j) => selecionados.has(j.id));
                  return (
                    <div key={k} className="rounded-md border border-border p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {k === "sem" ? "Sem concurso" : `Concurso ${k}`}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({lista.filter((j) => selecionados.has(j.id)).length}/{lista.length})
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGrupo(lista)}
                        >
                          {grupoTodos ? "Limpar" : "Marcar todos"}
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {lista.map((j) => (
                          <label
                            key={j.id}
                            htmlFor={`antigo-${j.id}`}
                            className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 hover:bg-accent"
                          >
                            <Checkbox
                              id={`antigo-${j.id}`}
                              checked={selecionados.has(j.id)}
                              onCheckedChange={() => toggleSelecionado(j.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 text-sm">
                              <p className="truncate font-medium">
                                {j.nome || `Jogo ${j.dezenas.join(", ")}`}
                              </p>
                              <p className="truncate text-muted-foreground">
                                {j.dezenas.join(", ")}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              {selecionados.size} de {antigos.length} jogos passados selecionados ·{" "}
              {vigentes.length} jogos em aberto sempre incluídos
            </p>
          </div>
        )}
      </div>


      {isLoading ? (
        <p className="text-muted-foreground">Carregando jogos...</p>
      ) : (
        <VolanteCanvas
          cfg={cfg}
          jogos={listaFinal.map((j) => ({
            id: j.id,
            dezenas: j.dezenas,
            created_at: j.created_at,
          }))}
        />
      )}
    </div>
  );
}
