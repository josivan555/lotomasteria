// Generic utilities for lottery statistics, filters, scoring and generator.
// Parameterized by LoteriaConfig — no server-only imports here.

import type { LoteriaConfig } from "./loterias-config";

export type Concurso = {
  numero: number;
  data_apuracao: string;
  dezenas: number[];
  soma: number;
};

export function allNumbers(cfg: LoteriaConfig): number[] {
  return Array.from({ length: cfg.total }, (_, i) => i + 1);
}

export function isPar(n: number) {
  return n % 2 === 0;
}

export function isMoldura(cfg: LoteriaConfig, n: number) {
  return cfg.moldura ? cfg.moldura.has(n) : false;
}

// Frequencia dentro de uma janela (ultimos N concursos, ou todos se N=0).
export function frequencia(cfg: LoteriaConfig, concursos: Concurso[], janela = 0): Record<number, number> {
  const arr = janela > 0 ? concursos.slice(0, janela) : concursos;
  const out: Record<number, number> = {};
  for (const n of allNumbers(cfg)) out[n] = 0;
  for (const c of arr) for (const d of c.dezenas) out[d] = (out[d] ?? 0) + 1;
  return out;
}

// Atraso: quantos concursos desde a ultima aparicao.
export function atrasos(cfg: LoteriaConfig, concursos: Concurso[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const n of allNumbers(cfg)) out[n] = concursos.length;
  for (let i = 0; i < concursos.length; i++) {
    for (const d of concursos[i].dezenas) {
      if (out[d] === concursos.length) out[d] = i;
    }
  }
  return out;
}

export function tendencia(cfg: LoteriaConfig, concursos: Concurso[]): Record<number, number> {
  const f30 = frequencia(cfg, concursos, 30);
  const f300 = frequencia(cfg, concursos, 300);
  const out: Record<number, number> = {};
  for (const n of allNumbers(cfg)) {
    const taxaCurta = (f30[n] ?? 0) / Math.max(1, Math.min(30, concursos.length));
    const taxaLonga = (f300[n] ?? 0) / Math.max(1, Math.min(300, concursos.length));
    out[n] = taxaCurta - taxaLonga;
  }
  return out;
}

export type NumberStats = {
  frequenciaHist: Record<number, number>;
  frequencia500: Record<number, number>;
  frequencia100: Record<number, number>;
  frequencia30: Record<number, number>;
  atrasos: Record<number, number>;
  tendencia: Record<number, number>;
  scores: Record<number, number>;
};

export function computeNumberStats(cfg: LoteriaConfig, concursos: Concurso[]): NumberStats {
  const fH = frequencia(cfg, concursos);
  const f500 = frequencia(cfg, concursos, 500);
  const f100 = frequencia(cfg, concursos, 100);
  const f30 = frequencia(cfg, concursos, 30);
  const atr = atrasos(cfg, concursos);
  const tend = tendencia(cfg, concursos);

  const nums = allNumbers(cfg);
  const norm = (m: Record<number, number>) => {
    const vals = nums.map((n) => m[n] ?? 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const out: Record<number, number> = {};
    for (const n of nums) out[n] = ((m[n] ?? 0) - min) / range;
    return out;
  };

  const nH = norm(fH);
  const n500 = norm(f500);
  const n100 = norm(f100);
  const n30 = norm(f30);
  const nAtr = norm(atr);
  const nTend = norm(tend);

  const scores: Record<number, number> = {};
  for (const n of nums) {
    const raw =
      nH[n] * 0.2 +
      n500[n] * 0.2 +
      n100[n] * 0.15 +
      n30[n] * 0.1 +
      nAtr[n] * 0.15 +
      nTend[n] * 0.2;
    scores[n] = Math.round(raw * 1000) / 10;
  }

  return {
    frequenciaHist: fH,
    frequencia500: f500,
    frequencia100: f100,
    frequencia30: f30,
    atrasos: atr,
    tendencia: tend,
    scores,
  };
}

export function paresMaisFrequentes(concursos: Concurso[], top = 20) {
  const counts = new Map<string, number>();
  for (const c of concursos) {
    const ds = [...c.dezenas].sort((a, b) => a - b);
    for (let i = 0; i < ds.length; i++)
      for (let j = i + 1; j < ds.length; j++) {
        const key = `${ds[i]}-${ds[j]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([k, v]) => ({ par: k, count: v }));
}

export function somasMaisFrequentes(concursos: Concurso[], top = 15) {
  const counts = new Map<number, number>();
  for (const c of concursos) counts.set(c.soma, (counts.get(c.soma) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([k, v]) => ({ soma: k, count: v }));
}

export type Filtros = {
  somaMin?: number;
  somaMax?: number;
  paresMin?: number;
  paresMax?: number;
  maxConsecutivas?: number;
  molduraMin?: number;
  molduraMax?: number;
  incluir?: number[];
  excluir?: number[];
  repetirAnteriorMin?: number;
  repetirAnteriorMax?: number;
};

export function contarConsecutivas(dezenas: number[]) {
  const s = [...dezenas].sort((a, b) => a - b);
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1] + 1) {
      run++;
      if (run > maxRun) maxRun = run;
    } else run = 1;
  }
  return maxRun;
}

export function analisarJogo(cfg: LoteriaConfig, dezenas: number[]) {
  const soma = dezenas.reduce((a, b) => a + b, 0);
  const pares = dezenas.filter(isPar).length;
  const impares = dezenas.length - pares;
  const moldura = cfg.moldura ? dezenas.filter((d) => cfg.moldura!.has(d)).length : 0;
  const centro = cfg.moldura ? dezenas.length - moldura : 0;
  const consecutivas = contarConsecutivas(dezenas);
  return { soma, pares, impares, moldura, centro, consecutivas };
}

export function passaFiltros(
  cfg: LoteriaConfig,
  dezenas: number[],
  f: Filtros,
  anterior?: number[],
): boolean {
  const a = analisarJogo(cfg, dezenas);
  if (f.somaMin != null && a.soma < f.somaMin) return false;
  if (f.somaMax != null && a.soma > f.somaMax) return false;
  if (f.paresMin != null && a.pares < f.paresMin) return false;
  if (f.paresMax != null && a.pares > f.paresMax) return false;
  if (f.maxConsecutivas != null && a.consecutivas > f.maxConsecutivas) return false;
  if (cfg.moldura) {
    if (f.molduraMin != null && a.moldura < f.molduraMin) return false;
    if (f.molduraMax != null && a.moldura > f.molduraMax) return false;
  }
  if (f.incluir?.length) for (const n of f.incluir) if (!dezenas.includes(n)) return false;
  if (f.excluir?.length) for (const n of f.excluir) if (dezenas.includes(n)) return false;
  if (anterior && (f.repetirAnteriorMin != null || f.repetirAnteriorMax != null)) {
    const rep = dezenas.filter((d) => anterior.includes(d)).length;
    if (f.repetirAnteriorMin != null && rep < f.repetirAnteriorMin) return false;
    if (f.repetirAnteriorMax != null && rep > f.repetirAnteriorMax) return false;
  }
  return true;
}

export function scoreJogo(cfg: LoteriaConfig, dezenas: number[], scores: Record<number, number>) {
  const a = analisarJogo(cfg, dezenas);
  const media = dezenas.reduce((acc, d) => acc + (scores[d] ?? 0), 0) / dezenas.length;
  const f = cfg.filtrosDefault;
  let ajuste = 0;
  if (a.soma >= f.somaMin && a.soma <= f.somaMax) ajuste += 3;
  if (a.pares >= f.paresMin && a.pares <= f.paresMax) ajuste += 2;
  if (cfg.moldura && f.molduraMin != null && f.molduraMax != null) {
    if (a.moldura >= f.molduraMin && a.moldura <= f.molduraMax) ajuste += 2;
  }
  if (a.consecutivas <= Math.max(2, f.maxConsecutivas - 1)) ajuste += 1;
  if (a.consecutivas > f.maxConsecutivas) ajuste -= 3;
  const raw = Math.max(0, Math.min(100, media + ajuste));
  return Math.round(raw * 10) / 10;
}

function amostraPonderada(cfg: LoteriaConfig, scores: Record<number, number>, tamanho: number): number[] {
  const pool = allNumbers(cfg).map((n) => ({ n, w: (scores[n] ?? 0) + 5 }));
  const picked: number[] = [];
  while (picked.length < tamanho) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) {
        picked.push(pool[i].n);
        pool.splice(i, 1);
        break;
      }
    }
  }
  return picked.sort((a, b) => a - b);
}

export function gerarJogos(
  cfg: LoteriaConfig,
  qtd: number,
  scores: Record<number, number>,
  filtros: Filtros,
  anterior?: number[],
  tamanho: number = cfg.tamanho,
): { dezenas: number[]; score: number; analise: ReturnType<typeof analisarJogo> }[] {
  const out: { dezenas: number[]; score: number; analise: ReturnType<typeof analisarJogo> }[] = [];
  const seen = new Set<string>();
  const maxTentativas = qtd * 500;
  let tentativas = 0;
  while (out.length < qtd && tentativas < maxTentativas) {
    tentativas++;
    const dz = amostraPonderada(cfg, scores, tamanho);
    if (filtros.incluir?.length) for (const n of filtros.incluir) if (!dz.includes(n)) dz.push(n);
    if (dz.length > tamanho) {
      dz.sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0));
      while (dz.length > tamanho) dz.shift();
      dz.sort((a, b) => a - b);
    }
    if (!passaFiltros(cfg, dz, filtros, anterior)) continue;
    const key = dz.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ dezenas: dz, score: scoreJogo(cfg, dz, scores), analise: analisarJogo(cfg, dz) });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function classificarScore(score: number): { label: string; color: string } {
  if (score >= 95) return { label: "Excelente", color: "text-primary" };
  if (score >= 90) return { label: "Muito Bom", color: "text-cold" };
  if (score >= 80) return { label: "Bom", color: "text-gold" };
  return { label: "Fraco", color: "text-hot" };
}
