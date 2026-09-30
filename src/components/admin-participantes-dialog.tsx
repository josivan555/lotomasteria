import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, UserPlus, Trophy, Users } from "lucide-react";
import { relatorioParticipantesBolao, adicionarParticipanteManual } from "@/lib/admin.functions";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Relatorio = Awaited<ReturnType<typeof relatorioParticipantesBolao>>;

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d: string) => {
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
};
const dataHoraBR = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const hora = (h?: string | null) => String(h ?? "").slice(0, 5);
const nomeLoteria = (id: string) => LOTERIAS[id as LoteriaId]?.nome ?? id;

async function baixarPDF(r: Relatorio) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const b = r.bolao;

  doc.setFillColor("#16a34a");
  doc.rect(0, 0, W, 24, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("LotoMaster IA", 14, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de participantes do bolão", W - 14, 15, { align: "right" });

  doc.setTextColor("#111827");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(b.nome, 14, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  const linhas: [string, string][] = [
    ["Loteria", b.is_combo ? `Combo (${r.partes.map((p) => nomeLoteria(p.loteria_id)).join(" + ")})` : nomeLoteria(b.loteria_id)],
    ["Concurso(s)", r.partes.map((p) => `${nomeLoteria(p.loteria_id)} ${p.concurso_numero}`).join(" · ")],
    ["Sorteio", `${dataBR(b.data_sorteio)} às ${hora(b.horario_sorteio)}`],
    ["Vendas até", `${dataBR(b.prazo_vendas)} às ${hora(b.horario_encerramento) || "20:00"}`],
    ["Jogos do bolão", String(b.total_jogos)],
    ["Cotas", `${r.cotasVendidas} pagas de ${b.total_cotas} · ${brl(b.valor_cota)} por cota`],
    ["Prêmio estimado", brl(b.premio_estimado)],
    ["Resultado", r.resultadoCompleto
      ? r.partes.map((p) => `${nomeLoteria(p.loteria_id)}: ${p.resultado.map((n) => String(n).padStart(2, "0")).join(" ")}`).join(" | ")
      : "Aguardando sorteio"],
  ];
  if (r.resultadoCompleto) {
    const acertos = r.partes.map((p) => {
      const pr = Object.entries(p.premiados).map(([a, q]) => `${q} jogo(s) com ${a} acertos`).join(", ");
      return `${nomeLoteria(p.loteria_id)}: melhor ${p.melhor_acerto} acertos${pr ? ` — ${pr}` : ""}`;
    });
    linhas.push(["Acertos", acertos.join(" | ")]);
    linhas.push(["Prêmio total do bolão", r.valoresLiberados ? brl(r.premioTotal) : "Liberado no dia seguinte ao sorteio"]);
    if (r.valoresLiberados) linhas.push(["Valor por cota", brl(r.valorPorCota)]);
  }

  autoTable(doc, {
    startY: 38,
    body: linhas,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 42, textColor: "#166534" } },
  });

  const y = (doc as any).lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: y,
    head: [["#", "Participante", "Cotas", "Compra(s)", "Situação", "Vai receber"]],
    body: r.participantes.map((p, i) => [
      String(i + 1),
      p.nome,
      String(p.cotas),
      p.compras.map((c: any) => `${dataHoraBR(c.data)} (${c.cotas})`).join("\n"),
      p.cotas_pagas === p.cotas ? "Pago" : p.cotas_pagas > 0 ? `Pago ${p.cotas_pagas}/${p.cotas}` : "Reservado",
      p.receber == null ? "—" : brl(p.receber),
    ]),
    foot: [["", "Total", String(r.participantes.reduce((s, p) => s + p.cotas, 0)), "", "",
      r.valoresLiberados ? brl(r.participantes.reduce((s, p) => s + (p.receber ?? 0), 0)) : "—"]],
    headStyles: { fillColor: "#16a34a", textColor: "#ffffff" },
    footStyles: { fillColor: "#dcfce7", textColor: "#14532d", fontStyle: "bold" },
    styles: { fontSize: 8.5, valign: "middle" },
    columnStyles: { 0: { cellWidth: 8 }, 2: { halign: "center", cellWidth: 14 }, 5: { halign: "right", fontStyle: "bold" } },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor("#6b7280");
    const H = doc.internal.pageSize.getHeight();
    doc.text(
      "Valor de cada participante = prêmio total ÷ total de cotas do bolão × cotas pagas. Cotas não vendidas ficam com a organização.",
      14, H - 12, { maxWidth: W - 50 },
    );
    doc.text(`LotoMaster IA · gerado em ${dataHoraBR(new Date().toISOString())} · pág. ${i}/${pages}`, W - 14, H - 6, { align: "right" });
  }

  const slug = b.nome.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
  doc.save(`participantes-${slug}-${b.concurso_numero}.pdf`);
}

export function AdminParticipantesDialog({ bolaoId, onClose }: { bolaoId: string | null; onClose: () => void }) {
  const fetchRel = useServerFn(relatorioParticipantesBolao);
  const { data: r, isLoading, error } = useQuery({
    queryKey: ["admin-relatorio-participantes", bolaoId],
    queryFn: () => fetchRel({ data: { bolaoId: bolaoId! } }),
    enabled: !!bolaoId,
  });

  return (
    <Dialog open={!!bolaoId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Participantes {r ? `· ${r.bolao.nome}` : ""}</DialogTitle>
          <DialogDescription>
            Cada pessoa aparece uma vez (identificada pelo celular), com todas as cotas somadas.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

        {r && (
          <div className="space-y-4">
            <AdicionarManual bolaoId={bolaoId!} valorCota={r.bolao.valor_cota} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Info label="Sorteio" value={`${dataBR(r.bolao.data_sorteio)} ${hora(r.bolao.horario_sorteio)}`} />
              <Info label="Cotas pagas" value={`${r.cotasVendidas}/${r.bolao.total_cotas}`} />
              <Info label="Prêmio do bolão" value={r.valoresLiberados ? brl(r.premioTotal) : "—"} />
              <Info label="Por cota" value={r.valoresLiberados ? brl(r.valorPorCota) : "—"} />
            </div>

            {r.resultadoCompleto ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
                {r.partes.map((p) => (
                  <p key={p.loteria_id + p.concurso_numero} className="flex items-center gap-2 flex-wrap">
                    <Trophy className="h-4 w-4 text-primary" />
                    <b>{nomeLoteria(p.loteria_id)}</b> — melhor jogo: {p.melhor_acerto} acertos
                    {Object.entries(p.premiados).map(([a, q]) => <Badge key={a} variant="secondary">{q}× {a} acertos</Badge>)}
                    {p.sem_valores && <span className="text-muted-foreground">(valores da Caixa indisponíveis)</span>}
                  </p>
                ))}
                {!r.valoresLiberados && (
                  <p className="text-muted-foreground">Os valores de cada participante aparecem a partir de {dataHoraBR(r.liberacao)}.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">O valor que cada um vai receber aparece no dia seguinte ao sorteio.</p>
            )}

            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2 text-left">Participante</th><th className="p-2">Cotas</th><th className="p-2 text-left">Compras</th><th className="p-2 text-right">Vai receber</th></tr>
                </thead>
                <tbody>
                  {r.participantes.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum participante ainda.</td></tr>}
                  {r.participantes.map((p) => (
                    <tr key={p.celular + p.nome} className="border-t border-border/30">
                      <td className="p-2"><div className="font-semibold">{p.nome}</div><div className="text-xs text-muted-foreground">{p.celular}</div></td>
                      <td className="p-2 text-center font-bold">{p.cotas}{p.cotas_pagas < p.cotas && <div className="text-[10px] font-normal text-amber-500">{p.cotas_pagas} paga(s)</div>}</td>
                      <td className="p-2 text-xs">{p.compras.map((c: any, i: number) => <div key={i}>{dataHoraBR(c.data)} · {c.cotas} cota(s) · {c.status}</div>)}</td>
                      <td className="p-2 text-right font-bold text-primary">{p.receber == null ? "—" : brl(p.receber)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button className="w-full" onClick={() => baixarPDF(r)} disabled={r.participantes.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Baixar lista em PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function AdicionarManual({ bolaoId, valorCota }: { bolaoId: string; valorCota: number }) {
  const qc = useQueryClient();
  const add = useServerFn(adicionarParticipanteManual);
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [cotas, setCotas] = useState(1);
  const [pago, setPago] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 2) return toast.error("Informe o nome do participante.");
    setSalvando(true);
    try {
      await add({ data: { bolaoId, nome: nome.trim(), celular: celular.trim(), cotas, pago } });
      toast.success(`${nome.trim()} adicionado com ${cotas} cota(s).`);
      setNome(""); setCelular(""); setCotas(1);
      qc.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSalvando(false); }
  };
  return (
    <form onSubmit={enviar} className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold"><UserPlus className="h-4 w-4 text-primary" /> Adicionar participante manualmente (sem PIX)</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_6rem]">
        <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
        <Input placeholder="Celular (opcional)" value={celular} onChange={(e) => setCelular(e.target.value)} maxLength={30} />
        <Input type="number" min={1} value={cotas} onChange={(e) => setCotas(Math.max(1, Number(e.target.value) || 1))} aria-label="Cotas" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Já pagou</label>
        <span className="text-muted-foreground">Total: {brl(cotas * valorCota)}</span>
        <Button type="submit" size="sm" disabled={salvando}>{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}</Button>
      </div>
    </form>
  );
}
