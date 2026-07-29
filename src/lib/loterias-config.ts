// Client-safe catalog of supported lotteries. Any component or util can read this.

export type LoteriaId = "lotofacil" | "megasena" | "quina";

export type FiltrosDefault = {
  somaMin: number;
  somaMax: number;
  paresMin: number;
  paresMax: number;
  maxConsecutivas: number;
  molduraMin?: number;
  molduraMax?: number;
  repetirAnteriorMin: number;
  repetirAnteriorMax: number;
};

export type LoteriaConfig = {
  id: LoteriaId;
  nome: string;
  slug: string;
  total: number;
  tamanho: number;
  cor: string;
  corFundo: string;
  ballVariant: "default" | "green" | "blue" | "purple";
  faixaPrincipal: number;
  descricaoCurta: string;
  descricaoLonga: string;
  moldura?: Set<number>;
  filtrosDefault: FiltrosDefault;
};

// Moldura da Lotofacil (volante 5x5): borda de 16 casas.
const LOTOFACIL_MOLDURA = new Set([
  1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25,
]);

export const LOTERIAS: Record<LoteriaId, LoteriaConfig> = {
  lotofacil: {
    id: "lotofacil",
    nome: "Lotofácil",
    slug: "lotofacil",
    total: 25,
    tamanho: 15,
    cor: "#7a1f8f",
    corFundo: "from-fuchsia-600/25 to-purple-700/10",
    ballVariant: "purple",
    faixaPrincipal: 15,
    descricaoCurta: "15 dezenas entre 01 e 25.",
    descricaoLonga:
      "Sorteios de segunda a sábado. Aposte de 15 a 20 dezenas e ganhe acertando 11, 12, 13, 14 ou 15 números.",
    moldura: LOTOFACIL_MOLDURA,
    filtrosDefault: {
      somaMin: 170,
      somaMax: 210,
      paresMin: 6,
      paresMax: 9,
      maxConsecutivas: 5,
      molduraMin: 7,
      molduraMax: 12,
      repetirAnteriorMin: 6,
      repetirAnteriorMax: 11,
    },
  },
  megasena: {
    id: "megasena",
    nome: "Mega-Sena",
    slug: "megasena",
    total: 60,
    tamanho: 6,
    cor: "#067d3f",
    corFundo: "from-emerald-600/25 to-green-700/10",
    ballVariant: "green",
    faixaPrincipal: 6,
    descricaoCurta: "6 dezenas entre 01 e 60.",
    descricaoLonga:
      "Sorteios às quartas e sábados. Aposte de 6 a 20 dezenas e ganhe acertando 4, 5 ou 6 números.",
    filtrosDefault: {
      somaMin: 130,
      somaMax: 260,
      paresMin: 2,
      paresMax: 4,
      maxConsecutivas: 3,
      repetirAnteriorMin: 0,
      repetirAnteriorMax: 3,
    },
  },
  quina: {
    id: "quina",
    nome: "Quina",
    slug: "quina",
    total: 80,
    tamanho: 5,
    cor: "#a855f7",
    corFundo: "from-violet-500/20 to-violet-500/5",
    ballVariant: "purple",
    faixaPrincipal: 5,
    descricaoCurta: "5 dezenas entre 01 e 80.",
    descricaoLonga:
      "Sorteios de segunda a sábado. Aposte de 5 a 15 dezenas e ganhe acertando 2, 3, 4 ou 5 números.",
    filtrosDefault: {
      somaMin: 130,
      somaMax: 300,
      paresMin: 1,
      paresMax: 4,
      maxConsecutivas: 3,
      repetirAnteriorMin: 0,
      repetirAnteriorMax: 2,
    },
  },
};

export const LOTERIA_IDS: LoteriaId[] = ["lotofacil", "megasena", "quina"];

export function isLoteriaId(x: unknown): x is LoteriaId {
  return typeof x === "string" && (LOTERIA_IDS as string[]).includes(x);
}

export function getLoteria(id: LoteriaId): LoteriaConfig {
  return LOTERIAS[id];
}
