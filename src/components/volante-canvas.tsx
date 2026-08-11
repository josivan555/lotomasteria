import { useEffect, useMemo, useRef, useState } from "react";
import type { LoteriaConfig, LoteriaId } from "@/lib/loterias-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Printer, RotateCcw, Move, Save, Maximize2, Minimize2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import volanteLoto from "@/assets/volante-loto.asset.json";
import volanteMega from "@/assets/volante-mega_sena.asset.json";
import volanteQuina from "@/assets/volante-quina.asset.json";
import { toast } from "sonner";


/* ---------------- layout do volante por loteria ---------------- */

type VolanteLayout = {
  cols: number;
  rows: number;
  /** posicao (col, row) de cada numero, 0-indexado */
  pos: (n: number) => { col: number; row: number };
};

export function volanteLayout(cfg: LoteriaConfig): VolanteLayout {
  if (cfg.id === "lotofacil") {
    // Volante oficial: 5 colunas, da direita para a esquerda (01-05 na ultima coluna)
    return {
      cols: 5,
      rows: 5,
      pos: (n) => ({ col: 4 - Math.floor((n - 1) / 5), row: (n - 1) % 5 }),
    };
  }
  if (cfg.id === "megasena") {
    return { cols: 10, rows: 6, pos: (n) => ({ col: (n - 1) % 10, row: Math.floor((n - 1) / 10) }) };
  }
  // quina: 80 numeros em 10 colunas x 8 linhas
  return { cols: 10, rows: 8, pos: (n) => ({ col: (n - 1) % 10, row: Math.floor((n - 1) / 10) }) };
}

/** arte oficial do volante de cada loteria (apenas guia visual, nao e impressa) */
export const VOLANTE_ART: Record<LoteriaId, { url: string; ratio: number }> = {
  lotofacil: { url: volanteLoto.url, ratio: 1857 / 847 },
  megasena: { url: volanteMega.url, ratio: 1798 / 875 },
  quina: { url: volanteQuina.url, ratio: 992 / 450 },
};

/* ---------------- calibracao ---------------- */

export type Calibracao = {
  /** margem esquerda ate o centro da 1a coluna (cm) */
  offsetX: number;
  /** margem superior ate o centro da 1a linha (cm) */
  offsetY: number;
  /** distancia entre centros de colunas (cm) */
  passoX: number;
  /** distancia entre centros de linhas (cm) */
  passoY: number;
  /** largura da marca (cm) */
  marcaW: number;
  /** altura da marca (cm) */
  marcaH: number;
  /** posicao do cartao guia na folha (cm) */
  cartaoX: number;
  cartaoY: number;
  /** largura do cartao guia (cm) */
  cartaoW: number;
  /** exibir a arte do volante como guia */
  mostrarCartao: boolean;
  /** ajuste fino horizontal da impressora (cm, pode ser negativo) */
  ajusteEsquerda: number;
  /** ajuste fino vertical da impressora (cm, pode ser negativo) */
  ajusteTopo: number;
  /** usar a 2a secao de jogos do mesmo volante */
  usarSecao2: boolean;
  /** distancia vertical do inicio da 1a secao ate a 2a (cm) */
  secao2Y: number;
  /** usar a 3a secao de jogos do mesmo volante */
  usarSecao3: boolean;
  /** distancia vertical do inicio da 1a secao ate a 3a (cm) */
  secao3Y: number;
  /** posicao da marca de quantidade de dezenas (cm) */
  qtdX: number;
  qtdY: number;
  papel: "A4" | "Letter";
};

const PADROES: Record<LoteriaId, Calibracao> = {
  lotofacil: {
    offsetX: 7.85, offsetY: 4.95, passoX: 1.26, passoY: 0.45,
    marcaW: 0.38, marcaH: 0.22,
    cartaoX: 6.5, cartaoY: 0.5, cartaoW: 8.2, mostrarCartao: true,
    ajusteEsquerda: -0.1, ajusteTopo: 0, usarSecao2: true, secao2Y: 2.5,
    usarSecao3: true, secao3Y: 5.05, papel: "A4",
    qtdX: 7.85, qtdY: 13.5,
  },
  megasena: {
    offsetX: 8, offsetY: 5.05, passoX: 0.63, passoY: 0.32,
    marcaW: 0.3, marcaH: 0.17,
    cartaoX: 6.6, cartaoY: 0.6, cartaoW: 8.1, mostrarCartao: true,
    ajusteEsquerda: -0.15, ajusteTopo: 0, usarSecao2: true, secao2Y: 2.5,
    usarSecao3: true, secao3Y: 5, papel: "A4",
    qtdX: 8, qtdY: 13.5,
  },
  quina: {
    offsetX: 8, offsetY: 4, passoX: 0.63, passoY: 0.32,
    marcaW: 0.33, marcaH: 0.19,
    cartaoX: 6.4, cartaoY: 0.3, cartaoW: 8.1, mostrarCartao: true,
    ajusteEsquerda: -0.15, ajusteTopo: 0, usarSecao2: true, secao2Y: 3.2,
    usarSecao3: true, secao3Y: 6.35, papel: "A4",
    qtdX: 8, qtdY: 13.5,
  },
};

const storageKey = (id: LoteriaId) => `lotomaster:volante:${id}`;

function carregar(id: LoteriaId): Calibracao {
  if (typeof window === "undefined") return PADROES[id];
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return PADROES[id];
    return { ...PADROES[id], ...(JSON.parse(raw) as Partial<Calibracao>) };
  } catch {
    return PADROES[id];
  }
}

/* ---------------- componente ---------------- */

const PAPEL_CM = { A4: { w: 21, h: 29.7 }, Letter: { w: 21.59, h: 27.94 } };

export function VolanteCanvas({
  cfg,
  jogos,
}: {
  cfg: LoteriaConfig;
  jogos: { id: string; dezenas: number[]; created_at: string }[];
}) {
  const layout = useMemo(() => volanteLayout(cfg), [cfg]);
  const [cal, setCal] = useState<Calibracao>(PADROES[cfg.id]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [expandido, setExpandido] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number; type: "grade" | "qtd" } | null>(null);
  const [art, setArt] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!expandido) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandido(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandido]);

  useEffect(() => {
    const info = VOLANTE_ART[cfg.id];
    const im = new Image();
    im.src = info.url;
    im.onload = () => setArt(im);
    setArt(null);
  }, [cfg.id]);

  useEffect(() => {
    setCal(carregar(cfg.id));
    setSelecionados(jogos[0] ? [jogos[0].id] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.id]);

  const listaSel = jogos.filter((j) => selecionados.includes(j.id));
  const jogoPreview = listaSel[0] ?? jogos[0];
  const jogoPreview2 = listaSel[1];
  const jogoPreview3 = listaSel[2];
  const paper = PAPEL_CM[cal.papel];
  const jogosPorVolante = 1 + (cal.usarSecao2 ? 1 : 0) + (cal.usarSecao3 ? 1 : 0);
  const volantesNecessarios = Math.ceil(selecionados.length / jogosPorVolante);
  const sobra = selecionados.length % jogosPorVolante;

  const [previaAberta, setPreviaAberta] = useState(false);
  // ordem de impressao: mesma ordem da lista de jogos, fatiada por volante/pagina
  const paginasPrevia = useMemo(() => {
    const out: { dezenas: number[]; created_at: string }[][] = [];
    for (let i = 0; i < listaSel.length; i += jogosPorVolante) {
      out.push(listaSel.slice(i, i + jogosPorVolante));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionados, jogos, jogosPorVolante]);



  // desenho
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = canvas.width / paper.w; // px por cm
    canvas.height = Math.round(paper.h * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cm = (v: number) => v * scale;
    const ox = cal.offsetX + cal.ajusteEsquerda;
    const oy = cal.offsetY + cal.ajusteTopo;

    // arte do volante como guia
    if (cal.mostrarCartao && art) {
      const w = cm(cal.cartaoW);
      const h = w * VOLANTE_ART[cfg.id].ratio;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(art, cm(cal.cartaoX), cm(cal.cartaoY), w, h);
      ctx.globalAlpha = 1;
    }

    // regua
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.font = "9px sans-serif";
    ctx.fillStyle = "#9ca3af";
    for (let x = 1; x < paper.w; x++) {
      ctx.beginPath();
      ctx.moveTo(cm(x), 0);
      ctx.lineTo(cm(x), canvas.height);
      ctx.stroke();
    }
    for (let y = 1; y < paper.h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, cm(y));
      ctx.lineTo(canvas.width, cm(y));
      ctx.stroke();
      if (y % 5 === 0) ctx.fillText(`${y}cm`, 2, cm(y) - 2);
    }

    const secoes: { oy: number; dezenas: number[] }[] = [
      { oy, dezenas: jogoPreview?.dezenas ?? [] },
    ];
    if (cal.usarSecao2) {
      secoes.push({ oy: oy + cal.secao2Y, dezenas: jogoPreview2?.dezenas ?? [] });
    }
    if (cal.usarSecao3) {
      secoes.push({ oy: oy + cal.secao3Y, dezenas: jogoPreview3?.dezenas ?? [] });
    }


    for (const sec of secoes) {
      const marcados = new Set(sec.dezenas);
      for (let n = 1; n <= cfg.total; n++) {
        const { col, row } = layout.pos(n);
        const cx = cm(ox + col * cal.passoX);
        const cy = cm(sec.oy + row * cal.passoY);
        const w = cm(cal.marcaW);
        const h = cm(cal.marcaH);
        const x = cx - w / 2;
        const y = cy - h / 2;
        if (marcados.has(n)) {
          ctx.fillStyle = "#111827";
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.strokeStyle = "#cbd5e1";
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          ctx.fillStyle = "#94a3b8";
          ctx.font = `${Math.max(7, h * 0.6)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(n).padStart(2, "0"), cx, cy);
          ctx.textAlign = "start";
          ctx.textBaseline = "alphabetic";
        }
      }

      // moldura da area do volante
      ctx.strokeStyle = cfg.cor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        cm(ox - cal.passoX / 2),
        cm(sec.oy - cal.passoY / 2),
        cm(layout.cols * cal.passoX),
        cm(layout.rows * cal.passoY),
      );
    }

    // Desenha a marca de quantidade (qtd)
    const qx = cm(cal.qtdX + cal.ajusteEsquerda);
    const qy = cm(cal.qtdY + cal.ajusteTopo);
    const qw = cm(cal.marcaW);
    const qh = cm(cal.marcaH);
    ctx.fillStyle = "#111827";
    ctx.fillRect(qx - qw / 2, qy - qh / 2, qw, qh);

    // Destaque visual para indicar que e arrastavel
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(qx - qw / 2 - 2, qy - qh / 2 - 2, qw + 4, qh + 4);
    
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QTD", qx, qy - qh / 2 - 6);

  }, [cal, cfg, layout, jogoPreview, jogoPreview2, jogoPreview3, paper, art]);

  function set<K extends keyof Calibracao>(k: K, v: Calibracao[K]) {
    setCal((c) => ({ ...c, [k]: v }));
  }

  function salvar() {
    window.localStorage.setItem(storageKey(cfg.id), JSON.stringify(cal));
    toast.success("Calibração salva para " + cfg.nome);
  }

  function resetar() {
    setCal(PADROES[cfg.id]);
    toast("Calibração restaurada ao padrão");
  }

  /* arrastar a grade no canvas (mouse ou toque) */
  function startDrag(x: number, y: number) {
    dragRef.current = { x, y, ox: cal.offsetX, oy: cal.offsetY };
  }
  function moveDrag(x: number, y: number) {
    const d = dragRef.current;
    const canvas = canvasRef.current;
    if (!d || !canvas) return;
    const scale = canvas.getBoundingClientRect().width / paper.w;
    const dx = (x - d.x) / scale;
    const dy = (y - d.y) / scale;
    setCal((c) => ({
      ...c,
      offsetX: +(d.ox + dx).toFixed(2),
      offsetY: +(d.oy + dy).toFixed(2),
    }));
  }
  function onDown(e: React.MouseEvent<HTMLCanvasElement>) {
    startDrag(e.clientX, e.clientY);
  }
  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    moveDrag(e.clientX, e.clientY);
  }
  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    const t = e.touches[0];
    if (t) startDrag(t.clientX, t.clientY);
  }
  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    const t = e.touches[0];
    if (!t || !dragRef.current) return;
    e.preventDefault();
    moveDrag(t.clientX, t.clientY);
  }
  function onUp() {
    dragRef.current = null;
  }


  /* impressao */
  function imprimir() {
    const lista = jogos.filter((j) => selecionados.includes(j.id));
    if (!lista.length) {
      toast.error("Selecione ao menos um jogo para imprimir.");
      return;
    }
    const ox = cal.offsetX + cal.ajusteEsquerda;
    const oy = cal.offsetY + cal.ajusteTopo;

    // agrupa os jogos conforme as secoes ativas do volante
    const offsetsSecao = [0, ...(cal.usarSecao2 ? [cal.secao2Y] : []), ...(cal.usarSecao3 ? [cal.secao3Y] : [])];
    const porPagina = offsetsSecao.length;
    const grupos: (typeof lista)[] = [];
    for (let i = 0; i < lista.length; i += porPagina) grupos.push(lista.slice(i, i + porPagina));

    const paginas = grupos
      .map((grupo) => {
        const marcas = grupo
          .map((j, idx) => {
            const oySec = oy + (offsetsSecao[idx] ?? 0);
            return j.dezenas
              .map((n) => {
                const { col, row } = layout.pos(n);
                const left = ox + col * cal.passoX - cal.marcaW / 2;
                const top = oySec + row * cal.passoY - cal.marcaH / 2;
                // usa border (em vez de background) para garantir a impressao
                // mesmo quando o navegador desativa impressao de cores de fundo
                const bw = (cal.marcaH / 2).toFixed(3);
                const bh = (cal.marcaW / 2).toFixed(3);
                return `<div class="m" style="left:${left.toFixed(3)}cm;top:${top.toFixed(3)}cm;width:${cal.marcaW}cm;height:${cal.marcaH}cm;border-width:${bw}cm ${bh}cm"></div>`;
              })
              .join("");
          })
          .join("");
        return `<div class="pg">${marcas}</div>`;
      })
      .join("");

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Volantes ${cfg.nome}</title>
<style>
  @page { size: ${cal.papel === "A4" ? "A4" : "letter"}; margin: 0; }
  html,body { margin:0; padding:0; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .pg { position:relative; width:${paper.w}cm; height:${paper.h}cm; page-break-after:always; overflow:hidden; }
  .pg:last-child { page-break-after:auto; }
  .m { position:absolute; box-sizing:border-box; background:#000; border-style:solid; border-color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .bar { position:fixed; top:8px; right:8px; z-index:99; font:14px sans-serif; }
  @media print { .bar { display:none; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Imprimir</button></div>
${paginas}
<script>window.onload=function(){window.focus();setTimeout(function(){window.print();},300);}<\/script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o volante.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }


  const num = (
    label: string,
    k: keyof Calibracao,
    step = 0.05,
    min = 0,
    max = 30,
  ) => {
    const val = cal[k] as number;
    const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(2)));
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={val}
          onChange={(e) => set(k, (Number.isFinite(+e.target.value) ? +e.target.value : 0) as never)}
          className="h-9"
        />
        <Slider
          value={[Math.min(max, Math.max(min, val || 0))]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => set(k, clamp(v ?? min) as never)}
          className="py-1.5"
          aria-label={label}
        />
      </div>
    );
  };


  return (
    <section
      className={
        expandido
          ? "fixed inset-0 z-50 space-y-4 overflow-auto bg-background p-4 md:p-6"
          : "space-y-4 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur md:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold md:text-lg">Volante para impressão · {cfg.nome}</h3>
          <p className="text-sm text-muted-foreground">
            Ajuste a posição dos quadradinhos até coincidirem com o volante oficial, salve a
            calibração e imprima direto no volante.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <Button variant="ghost" size="sm" onClick={resetar}>
            <RotateCcw className="mr-2 h-4 w-4" /> Padrão
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 md:flex-none"
            onClick={() => setExpandido((v) => !v)}
          >
            {expandido ? (
              <>
                <Minimize2 className="mr-2 h-4 w-4" /> Sair da tela cheia
              </>
            ) : (
              <>
                <Maximize2 className="mr-2 h-4 w-4" /> Tela cheia
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 md:flex-none" onClick={salvar}>
            <Save className="mr-2 h-4 w-4" /> Salvar calibração
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 md:flex-none"
            onClick={() => {
              if (!selecionados.length) {
                toast.error("Selecione ao menos um jogo para ver a prévia.");
                return;
              }
              setPreviaAberta(true);
            }}
          >
            <Eye className="mr-2 h-4 w-4" /> Prévia da impressão
          </Button>
          <Button size="sm" className="flex-1 md:flex-none" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir ({selecionados.length} jogos ·{" "}
            {volantesNecessarios} volante{volantesNecessarios === 1 ? "" : "s"})
          </Button>


        </div>
      </div>

      <div className={`grid gap-5 ${expandido ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-[1fr_320px]"}`}>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Move className="h-3.5 w-3.5" /> Arraste a grade sobre a folha para posicionar
          </div>
          <canvas
            ref={canvasRef}
            width={620}
            className="w-full cursor-move touch-none rounded-lg border border-border bg-white"
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onUp}
            onTouchCancel={onUp}
          />
        </div>


        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Papel</Label>
            <div className="mt-1 flex gap-2">
              {(["A4", "Letter"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={cal.papel === p ? "default" : "outline"}
                  onClick={() => set("papel", p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">Cartão guia</p>
              <Button
                size="sm"
                variant={cal.mostrarCartao ? "default" : "outline"}
                className="h-7"
                onClick={() => set("mostrarCartao", !cal.mostrarCartao)}
              >
                {cal.mostrarCartao ? "Visível" : "Oculto"}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {num("X (cm)", "cartaoX", 0.1, 0, paper.w)}
              {num("Y (cm)", "cartaoY", 0.1, 0, paper.h)}
              {num("Largura", "cartaoW", 0.1, 3, paper.w)}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              O cartão é apenas guia na tela — não é impresso.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {num("Margem esquerda (cm)", "offsetX", 0.05, 0, paper.w)}
            {num("Margem superior (cm)", "offsetY", 0.05, 0, paper.h)}
            {num("Passo horizontal (cm)", "passoX", 0.01, 0.1, 3)}
            {num("Passo vertical (cm)", "passoY", 0.01, 0.1, 3)}
            {num("Largura da marca (cm)", "marcaW", 0.01, 0.05, 2)}
            {num("Altura da marca (cm)", "marcaH", 0.01, 0.05, 2)}
          </div>


          <div className="rounded-lg border border-dashed border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">2ª seção do volante</p>
              <Button
                size="sm"
                variant={cal.usarSecao2 ? "default" : "outline"}
                className="h-7"
                onClick={() => set("usarSecao2", !cal.usarSecao2)}
              >
                {cal.usarSecao2 ? "Ativa" : "Desativada"}
              </Button>
            </div>
            {cal.usarSecao2 && num("Distância da 1ª p/ 2ª seção (cm)", "secao2Y", 0.05, 0, paper.h)}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Com a 2ª seção ativa, o 2º jogo é marcado na seção do meio do volante.
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">3ª seção do volante</p>
              <Button
                size="sm"
                variant={cal.usarSecao3 ? "default" : "outline"}
                className="h-7"
                onClick={() => set("usarSecao3", !cal.usarSecao3)}
              >
                {cal.usarSecao3 ? "Ativa" : "Desativada"}
              </Button>
            </div>
            {cal.usarSecao3 && num("Distância da 1ª p/ 3ª seção (cm)", "secao3Y", 0.05, 0, paper.h)}
            <p className="mt-2 text-[11px] text-muted-foreground">
              O volante da Quina tem 3 seções: com ela ativa, cada volante recebe 3 jogos.
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-border/60 p-3">
            <p className="mb-2 text-xs font-semibold">Ajuste da impressora</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {num("Deslocar horizontal (cm)", "ajusteEsquerda", 0.05, -5, 5)}
              {num("Deslocar vertical (cm)", "ajusteTopo", 0.05, -5, 5)}
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Valores negativos movem para a esquerda/cima. Imprima um teste em papel comum,
              sobreponha ao volante e corrija.
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Jogos a imprimir ({jogosPorVolante} por volante)
            </Label>
            <div className="mt-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">
                {selecionados.length} jogo{selecionados.length === 1 ? "" : "s"} selecionado
                {selecionados.length === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · vai usar{" "}
                <span className="font-semibold text-foreground">
                  {volantesNecessarios} volante{volantesNecessarios === 1 ? "" : "s"}
                </span>{" "}
                ({jogosPorVolante} jogos por volante)
                {sobra > 0 && ` · último volante com ${sobra} jogo${sobra === 1 ? "" : "s"}`}
              </span>
            </div>

            <div className="mt-2 max-h-56 space-y-1 overflow-auto rounded-lg border border-border/60 p-2">
              {jogos.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">Nenhum jogo salvo.</p>
              )}
              {jogos.map((j) => {
                const on = selecionados.includes(j.id);
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() =>
                      setSelecionados((s) =>
                        s.includes(j.id) ? s.filter((x) => x !== j.id) : [...s, j.id],
                      )
                    }
                    className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition ${
                      on ? "bg-primary/15 text-foreground" : "hover:bg-secondary/60"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 shrink-0 rounded-sm border ${on ? "border-primary bg-primary" : "border-border"}`}
                    />
                    <span className="truncate font-mono">
                      {j.dezenas.map((n) => String(n).padStart(2, "0")).join(" ")}
                    </span>
                  </button>
                );
              })}
            </div>
            {jogos.length > 0 && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelecionados(jogos.map((j) => j.id))}
                >
                  Selecionar todos
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={previaAberta} onOpenChange={setPreviaAberta}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Prévia da impressão · {cfg.nome}</DialogTitle>
            <DialogDescription>
              {paginasPrevia.length} volante{paginasPrevia.length === 1 ? "" : "s"} (páginas) ·{" "}
              {selecionados.length} jogo{selecionados.length === 1 ? "" : "s"} ·{" "}
              {jogosPorVolante} por volante. Ordem de saída na impressora, de cima para baixo.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-auto pr-1">
            {paginasPrevia.map((grupo, pi) => (
              <div key={pi} className="rounded-lg border border-border/60 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold">
                    Volante {pi + 1} de {paginasPrevia.length}
                  </span>
                  <span className="text-muted-foreground">
                    {grupo.length} de {jogosPorVolante} seções preenchidas
                  </span>
                </div>
                <div className="space-y-1">
                  {Array.from({ length: jogosPorVolante }).map((_, si) => {
                    const j = grupo[si];
                    return (
                      <div key={si} className="flex items-start gap-2 text-xs">
                        <span className="w-16 shrink-0 text-muted-foreground">{si + 1}ª seção</span>
                        {j ? (
                          <span className="font-mono font-semibold">
                            {j.dezenas
                              .slice()
                              .sort((a, b) => a - b)
                              .map((n) => String(n).padStart(2, "0"))
                              .join(" ")}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">vazia (não marcada)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPreviaAberta(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setPreviaAberta(false);
                imprimir();
              }}
            >
              <Printer className="mr-2 h-4 w-4" /> Confirmar e imprimir {paginasPrevia.length}{" "}
              volante{paginasPrevia.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>

  );
}
