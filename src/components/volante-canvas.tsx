import { useEffect, useMemo, useRef, useState } from "react";
import type { LoteriaConfig, LoteriaId } from "@/lib/loterias-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, RotateCcw, Move, Save } from "lucide-react";
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
  lotofacil: { url: volanteLoto.url, ratio: 1626 / 967 },
  megasena: { url: volanteMega.url, ratio: 645 / 453 },
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
  papel: "A4" | "Letter";
};

const PADROES: Record<LoteriaId, Calibracao> = {
  lotofacil: {
    offsetX: 3.49, offsetY: 4.53, passoX: 1.91, passoY: 0.89,
    marcaW: 0.89, marcaH: 0.6,
    cartaoX: 1.5, cartaoY: 1.0, cartaoW: 12, mostrarCartao: true,
    ajusteEsquerda: 0, ajusteTopo: 0, usarSecao2: true, secao2Y: 5.4,
    usarSecao3: false, secao3Y: 10.8, papel: "A4",
  },
  megasena: {
    offsetX: 2.33, offsetY: 3.74, passoX: 0.79, passoY: 0.6,
    marcaW: 0.58, marcaH: 0.33,
    cartaoX: 1.5, cartaoY: 1.0, cartaoW: 10.5, mostrarCartao: true,
    ajusteEsquerda: 0, ajusteTopo: 0, usarSecao2: true, secao2Y: 4.05,
    usarSecao3: false, secao3Y: 8.1, papel: "A4",
  },
  quina: {
    offsetX: 2.98, offsetY: 5.29, passoX: 0.77, passoY: 0.37,
    marcaW: 0.57, marcaH: 0.29,
    cartaoX: 1.5, cartaoY: 1.0, cartaoW: 9.5, mostrarCartao: true,
    ajusteEsquerda: 0, ajusteTopo: 0, usarSecao2: true, secao2Y: 3.6,
    usarSecao3: true, secao3Y: 7.2, papel: "A4",
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [art, setArt] = useState<HTMLImageElement | null>(null);

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

  /* arrastar a grade no canvas */
  function onDown(e: React.MouseEvent<HTMLCanvasElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: cal.offsetX, oy: cal.offsetY };
  }
  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const d = dragRef.current;
    const canvas = canvasRef.current;
    if (!d || !canvas) return;
    const scale = canvas.getBoundingClientRect().width / paper.w;
    const dx = (e.clientX - d.x) / scale;
    const dy = (e.clientY - d.y) / scale;
    setCal((c) => ({
      ...c,
      offsetX: +(d.ox + dx).toFixed(2),
      offsetY: +(d.oy + dy).toFixed(2),
    }));
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
                return `<div class="m" style="left:${left.toFixed(3)}cm;top:${top.toFixed(3)}cm;width:${cal.marcaW}cm;height:${cal.marcaH}cm"></div>`;
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
  html,body { margin:0; padding:0; background:#fff; }
  .pg { position:relative; width:${paper.w}cm; height:${paper.h}cm; page-break-after:always; overflow:hidden; }
  .pg:last-child { page-break-after:auto; }
  .m { position:absolute; background:#000; }
</style></head><body>${paginas}
<script>window.onload=function(){window.focus();window.print();}<\/script>
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
  ) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={cal[k] as number}
        onChange={(e) => set(k, (Number.isFinite(+e.target.value) ? +e.target.value : 0) as never)}
        className="h-9"
      />
    </div>
  );

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Volante para impressão · {cfg.nome}</h3>
          <p className="text-sm text-muted-foreground">
            Ajuste a posição dos quadradinhos até coincidirem com o volante oficial, salve a
            calibração e imprima direto no volante.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={resetar}>
            <RotateCcw className="mr-2 h-4 w-4" /> Padrão
          </Button>
          <Button variant="outline" size="sm" onClick={salvar}>
            <Save className="mr-2 h-4 w-4" /> Salvar calibração
          </Button>
          <Button size="sm" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir ({selecionados.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Move className="h-3.5 w-3.5" /> Arraste a grade sobre a folha para posicionar
          </div>
          <canvas
            ref={canvasRef}
            width={620}
            className="w-full cursor-move rounded-lg border border-border bg-white"
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={onUp}
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
            <div className="grid grid-cols-3 gap-2">
              {num("X (cm)", "cartaoX", 0.1)}
              {num("Y (cm)", "cartaoY", 0.1)}
              {num("Largura", "cartaoW", 0.1)}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              O cartão é apenas guia na tela — não é impresso.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {num("Margem esquerda (cm)", "offsetX")}
            {num("Margem superior (cm)", "offsetY")}
            {num("Passo horizontal (cm)", "passoX")}
            {num("Passo vertical (cm)", "passoY")}
            {num("Largura da marca (cm)", "marcaW")}
            {num("Altura da marca (cm)", "marcaH")}
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
            {cal.usarSecao2 && num("Distância da 1ª p/ 2ª seção (cm)", "secao2Y", 0.05)}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Com a 2ª seção ativa, cada volante recebe 2 jogos (o 1º na seção de cima e o 2º na de
              baixo).
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-border/60 p-3">
            <p className="mb-2 text-xs font-semibold">Ajuste da impressora</p>
            <div className="grid grid-cols-2 gap-3">
              {num("Deslocar horizontal (cm)", "ajusteEsquerda", 0.1)}
              {num("Deslocar vertical (cm)", "ajusteTopo", 0.1)}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Valores negativos movem para a esquerda/cima. Imprima um teste em papel comum,
              sobreponha ao volante e corrija.
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Jogos a imprimir ({cal.usarSecao2 ? "2 jogos" : "1 jogo"} por volante)
            </Label>
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
    </section>
  );
}
