import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const pad = (n: number) => String(n).padStart(2, "0");

const MESES_ABREV = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
export const mesAbrev = (m?: number | null) => (m ? MESES_ABREV[m - 1] ?? "" : "");

type Extras = { mes?: number | null; time?: string | null };
type JogoPDF = { dezenas: number[]; score?: number | null; created_at: string } & Extras;


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
  jogos: JogoPDF[];
  titulo?: string;
  sufixoArquivo?: string;
}) {
  const doc = new jsPDF();
  header(
    doc,
    `${opts.titulo ?? "Meus Jogos"} · ${opts.loteriaNome}`,
    `${opts.jogos.length} jogos · Gerado em ${new Date().toLocaleString("pt-BR")}`,
    opts.cor,
  );

  const temMes = opts.jogos.some((j) => j.mes);
  const temTime = opts.jogos.some((j) => j.time);
  const head = ["#", "Data", "Dezenas", ...(temMes ? ["Mês"] : []), ...(temTime ? ["Time"] : []), "Score"];
  const body = opts.jogos.map((j, i) => [
    String(i + 1),
    new Date(j.created_at).toLocaleDateString("pt-BR"),
    j.dezenas.map(pad).join("  "),
    ...(temMes ? [mesAbrev(j.mes) || "-"] : []),
    ...(temTime ? [j.time || "-"] : []),
    j.score != null ? Number(j.score).toFixed(1) : "-",
  ]);

  let col = 2;
  const columnStyles: Record<number, Record<string, string>> = {
    2: { font: "courier", fontStyle: "bold" },
  };
  if (temMes) columnStyles[++col] = { halign: "center" };
  if (temTime) columnStyles[++col] = { fontStyle: "bold" };
  columnStyles[++col] = { halign: "right" };

  autoTable(doc, {
    startY: 36,
    head: [head],
    body,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: opts.cor, textColor: "#ffffff" },
    columnStyles,
  });

  doc.save(
    `meus-jogos-${opts.loteriaNome.toLowerCase().replace(/\s+/g, "-")}${opts.sufixoArquivo ? `-${opts.sufixoArquivo}` : ""}.pdf`,
  );
}

export function exportarResultadosPDF(opts: {
  loteriaNome: string;
  cor: string;
  concurso?: { numero: number; data: string; dezenas: number[] } | null;
  sorteadas: number[];
  itens: ({ nums: number[]; hits: number } & Extras)[];
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

  const temMes = opts.itens.some((it) => it.mes);
  const temTime = opts.itens.some((it) => it.time);
  const head = ["#", "Dezenas do jogo", "Acertos", "Faixa", ...(temMes ? ["Mês"] : []), ...(temTime ? ["Time"] : [])];
  const body = opts.itens.map((it, i) => [
    String(i + 1),
    it.nums.map((n) => (opts.sorteadas.includes(n) ? `[${pad(n)}]` : pad(n))).join("  "),
    String(it.hits),
    opts.tierLabel(it.hits) || "-",
    ...(temMes ? [mesAbrev(it.mes) || "-"] : []),
    ...(temTime ? [it.time || "-"] : []),
  ]);

  let col = 3;
  const columnStyles: Record<number, Record<string, string>> = {
    1: { font: "courier", fontStyle: "bold" },
  };
  if (temMes) columnStyles[++col] = { halign: "center" };
  if (temTime) columnStyles[++col] = { fontStyle: "bold" };

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: opts.cor, textColor: "#ffffff" },
    columnStyles,
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
