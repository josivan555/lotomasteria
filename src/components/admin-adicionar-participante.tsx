import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, UserPlus, Ticket } from "lucide-react";
import { adicionarParticipanteManual } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AdminAdicionarParticipante({ boloes }: { boloes: any[] }) {
  const qc = useQueryClient();
  const add = useServerFn(adicionarParticipanteManual);

  const padrao = boloes.find((b) => b.status === "em_vendas") ?? boloes[0];
  const [bolaoId, setBolaoId] = useState<string>(padrao?.id ?? "");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [cotas, setCotas] = useState(1);
  const [pago, setPago] = useState(true);

  const selecionado = boloes.find((b) => b.id === bolaoId);
  const disponiveis = selecionado ? Math.max(0, selecionado.total_cotas - selecionado.cotas_compradas) : 0;

  const mutation = useMutation({
    mutationFn: (data: { bolaoId: string; nome: string; celular: string; cotas: number; pago: boolean }) =>
      add({ data }),
    onSuccess: (_res, vars) => {
      toast.success(`${vars.nome} adicionado com ${vars.cotas} cota(s).`);
      setNome("");
      setCelular("");
      setCotas(1);
      qc.invalidateQueries({ queryKey: ["admin-boloes"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (boloes.length === 0) return null;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bolaoId) return toast.error("Selecione o bolão.");
    if (nome.trim().length < 2) return toast.error("Informe o nome do participante.");
    if (cotas > disponiveis) return toast.error(`Apenas ${disponiveis} cota(s) disponível(is).`);
    mutation.mutate({ bolaoId, nome: nome.trim(), celular: celular.trim(), cotas, pago });
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
        <UserPlus className="h-4 w-4 text-primary" /> Adicionar participante manualmente (sem PIX)
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bolão</span>
          <select
            value={bolaoId}
            onChange={(e) => setBolaoId(e.target.value)}
            className="h-9 w-full rounded-md border border-border/40 bg-background/60 px-3 text-sm outline-none cursor-pointer hover:border-primary/40 transition-colors"
            aria-label="Escolher bolão"
          >
            {boloes.map((b) => {
              const cfg = LOTERIAS[b.loteria_id as LoteriaId] || LOTERIAS.lotofacil;
              return (
                <option key={b.id} value={b.id}>
                  {cfg.nome} · {b.nome} (Conc. {b.concurso_numero})
                </option>
              );
            })}
          </select>
        </label>
        {selecionado && (
          <div className="flex items-end">
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/60 px-3 h-9 text-xs font-bold">
              <Ticket className="h-3.5 w-3.5 text-primary" />
              {disponiveis} cota(s) livre(s) · {brl(Number(selecionado.valor_cota))}/cota
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_6rem]">
        <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
        <Input placeholder="Celular (opcional)" value={celular} onChange={(e) => setCelular(e.target.value)} maxLength={30} />
        <Input type="number" min={1} value={cotas} onChange={(e) => setCotas(Math.max(1, Number(e.target.value) || 1))} aria-label="Cotas" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Já pagou
        </label>
        <span className="text-muted-foreground">
          Total: {selecionado ? brl(cotas * Number(selecionado.valor_cota)) : "—"}
        </span>
        <Button type="submit" size="sm" disabled={mutation.isPending || !bolaoId}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
