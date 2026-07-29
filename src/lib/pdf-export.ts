import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const pad = (n: number) => String(n).padStart(2, "0");

function header(doc: jsPDF, title: string, subtitle?: string, cor?: string) {
  doc.setFillColor(cor ?? "#7a1f8f");
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LotoMaster IA", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, doc.internal.pageSize.getWidth() - 14, 14, { align: "right" });
  doc.setTextColor("#111827");
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 14, 30);
  }
}

export function exportarJogosPDF(opts: {
  loteriaNome: string;
  cor: string;
  jogos: { dezenas: number[]; score?: number | null; created_at: string }[];
}) {
  const doc = new jsPDF();
  header(
    doc,
    `Meus Jogos · ${opts.loteriaNome}`,
    `${opts.jogos.length} jogos · Gerado em ${new Date().toLocaleString("pt-BR")}`,
    opts.cor,
  );

  autoTable(doc, {
    startY: 36,
    head: [["#", "Data", "Dezenas", "Score"]],
    body: opts.jogos.map((j, i) => [
      String(i + 1),
      new Date(j.created_at).toLocaleDateString("pt-BR"),
      j.dezenas.map(pad).join("  "),
      j.score != null ? Number(j.score).toFixed(1) : "-",
    ]),
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: opts.cor, textColor: "#ffffff" },
    columnStyles: { 2: { font: "courier", fontStyle: "bold" } },
  });

  doc.save(`meus-jogos-${opts.loteriaNome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

export function exportarResultadosPDF(opts: {
  loteriaNome: string;
  cor: string;
  concurso?: { numero: number; data: string; dezenas: number[] } | null;
  sorteadas: number[];
  itens: { nums: number[]; hits: number }[];
  tierLabel: (h: number) => string;
}) {
  const doc = new jsPDF();
  header(
    doc,
    `Conferência · ${opts.loteriaNome}`,
    opts.concurso
      ? `Concurso ${opts.concurso.numero} · ${new Date(opts.concurso.data).toLocaleDateString("pt-BR")}`
      : `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    opts.cor,
  );

  let y = 36;
  if (opts.sorteadas.length) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Dezenas sorteadas:", 14, y);
    doc.setFont("courier", "bold");
    doc.text(
      opts.sorteadas.slice().sort((a, b) => a - b).map(pad).join("  "),
      50,
      y,
    );
    y += 8;
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Dezenas do jogo", "Acertos", "Faixa"]],
    body: opts.itens.map((it, i) => [
      String(i + 1),
      it.nums.map((n) => (opts.sorteadas.includes(n) ? `[${pad(n)}]` : pad(n))).join("  "),
      String(it.hits),
      opts.tierLabel(it.hits) || "-",
    ]),
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: opts.cor, textColor: "#ffffff" },
    columnStyles: { 1: { font: "courier", fontStyle: "bold" } },
  });

  doc.setFontSize(8);
  doc.setTextColor("#6b7280");
  doc.text(
    "Dezenas entre colchetes indicam acertos. Dados oficiais da Caixa Econômica Federal.",
    14,
    doc.internal.pageSize.getHeight() - 8,
  );

  doc.save(`conferencia-${opts.loteriaNome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
