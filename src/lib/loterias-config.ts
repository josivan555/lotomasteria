// Client-safe catalog of supported lotteries. Any component or util can read this.

import lotofacilLogo from "@/assets/lotofacil-logo.png.asset.json";
import megasenaLogo from "@/assets/megasena-logo.png.asset.json";
import quinaLogo from "@/assets/quina-logo.png.asset.json";
import lotomaniaLogo from "@/assets/lotomania-logo.png.asset.json";
import duplasenaLogo from "@/assets/duplasena-logo.png.asset.json";
import timemaniaLogo from "@/assets/timemania-logo.png.asset.json";
import diadesorteLogo from "@/assets/diadesorte-logo.png.asset.json";
import lotofacilBanner from "@/assets/lotofacil-banner.png.asset.json";
import megasenaBanner from "@/assets/megasena-banner.png.asset.json";
import quinaBanner from "@/assets/quina-banner.png.asset.json";
import lotomaniaBanner from "@/assets/lotomania-banner.png.asset.json";
import duplasenaBanner from "@/assets/duplasena-banner.png.asset.json";
import timemaniaBanner from "@/assets/timemania-banner.png.asset.json";
import diadesorteBanner from "@/assets/diadesorte-banner.png.asset.json";

export type LoteriaId =
  | "lotofacil"
  | "megasena"
  | "quina"
  | "lotomania"
  | "duplasena"
  | "timemania"
  | "diadesorte";

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
  tamanhoMin: number;
  tamanhoMax: number;
  cor: string;
  corFundo: string;
  ballVariant: "default" | "green" | "blue" | "purple";
  faixaPrincipal: number;
  /** faixas de premiacao (acertos) da maior para a menor */
  faixas: number[];
  descricaoCurta: string;
  descricaoLonga: string;
  logo: string;
  banner: string;
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
    tamanhoMin: 15,
    tamanhoMax: 20,
    cor: "#7a1f8f",
    corFundo: "from-fuchsia-600/25 to-purple-700/10",
    ballVariant: "purple",
    faixaPrincipal: 15,
    faixas: [15, 14, 13, 12, 11],
    descricaoCurta: "15 dezenas entre 01 e 25.",
    descricaoLonga:
      "Sorteios de segunda a sábado. Aposte de 15 a 20 dezenas e ganhe acertando 11, 12, 13, 14 ou 15 números.",
    logo: lotofacilLogo.url,
    banner: lotofacilBanner.url,
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
    tamanhoMin: 6,
    tamanhoMax: 20,
    cor: "#067d3f",
    corFundo: "from-emerald-600/25 to-green-700/10",
    ballVariant: "green",
    faixaPrincipal: 6,
    faixas: [6, 5, 4],
    descricaoCurta: "6 dezenas entre 01 e 60.",
    descricaoLonga:
      "Sorteios às quartas e sábados. Aposte de 6 a 20 dezenas e ganhe acertando 4, 5 ou 6 números.",
    logo: megasenaLogo.url,
    banner: megasenaBanner.url,
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
    tamanhoMin: 5,
    tamanhoMax: 15,
    cor: "#236ec7",
    corFundo: "from-blue-400/25 to-blue-600/10",
    ballVariant: "blue",
    faixaPrincipal: 5,
    faixas: [5, 4, 3, 2],
    descricaoCurta: "5 dezenas entre 01 e 80.",
    descricaoLonga:
      "Sorteios de segunda a sábado. Aposte de 5 a 15 dezenas e ganhe acertando 2, 3, 4 ou 5 números.",
    logo: quinaLogo.url,
    banner: quinaBanner.url,
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
  lotomania: {
    id: "lotomania",
    nome: "Lotomania",
    slug: "lotomania",
    total: 100,
    tamanho: 50,
    tamanhoMin: 50,
    tamanhoMax: 50,
    cor: "#ef7c0b",
    corFundo: "from-orange-500/25 to-amber-600/10",
    ballVariant: "default",
    faixaPrincipal: 20,
    faixas: [20, 19, 18, 17, 16, 15],
    descricaoCurta: "50 dezenas entre 01 e 100.",
    descricaoLonga:
      "Sorteios às segundas, quartas e sextas. Marque 50 dezenas e ganhe acertando 15, 16, 17, 18, 19, 20 ou nenhuma dezena.",
    logo: lotomaniaLogo.url,
    banner: lotomaniaBanner.url,
    filtrosDefault: {
      somaMin: 2200,
      somaMax: 2850,
      paresMin: 20,
      paresMax: 30,
      maxConsecutivas: 8,
      repetirAnteriorMin: 6,
      repetirAnteriorMax: 16,
    },
  },
  duplasena: {
    id: "duplasena",
    nome: "Dupla Sena",
    slug: "duplasena",
    total: 50,
    tamanho: 6,
    tamanhoMin: 6,
    tamanhoMax: 15,
    cor: "#a61324",
    corFundo: "from-red-700/25 to-rose-800/10",
    ballVariant: "default",
    faixaPrincipal: 6,
    faixas: [6, 5, 4, 3],
    descricaoCurta: "6 dezenas entre 01 e 50, com dois sorteios.",
    descricaoLonga:
      "Sorteios às terças, quintas e sábados, com dois sorteios por concurso. Aposte de 6 a 15 dezenas e ganhe acertando 3, 4, 5 ou 6 números.",
    logo: duplasenaLogo.url,
    banner: duplasenaBanner.url,
    filtrosDefault: {
      somaMin: 110,
      somaMax: 200,
      paresMin: 2,
      paresMax: 4,
      maxConsecutivas: 3,
      repetirAnteriorMin: 0,
      repetirAnteriorMax: 2,
    },
  },
  timemania: {
    id: "timemania",
    nome: "Timemania",
    slug: "timemania",
    total: 80,
    tamanho: 10,
    tamanhoMin: 10,
    tamanhoMax: 10,
    cor: "#d8c400",
    corFundo: "from-yellow-400/25 to-lime-600/10",
    ballVariant: "default",
    faixaPrincipal: 7,
    faixas: [7, 6, 5, 4, 3],
    descricaoCurta: "10 dezenas entre 01 e 80.",
    descricaoLonga:
      "Sorteios às terças, quintas e sábados. Marque 10 dezenas e ganhe acertando 3, 4, 5, 6 ou 7 números (além do Time do Coração).",
    logo: timemaniaLogo.url,
    banner: timemaniaBanner.url,
    filtrosDefault: {
      somaMin: 320,
      somaMax: 490,
      paresMin: 3,
      paresMax: 7,
      maxConsecutivas: 3,
      repetirAnteriorMin: 0,
      repetirAnteriorMax: 3,
    },
  },
  diadesorte: {
    id: "diadesorte",
    nome: "Dia de Sorte",
    slug: "diadesorte",
    total: 31,
    tamanho: 7,
    tamanhoMin: 7,
    tamanhoMax: 15,
    cor: "#cb852b",
    corFundo: "from-amber-500/25 to-yellow-700/10",
    ballVariant: "default",
    faixaPrincipal: 7,
    faixas: [7, 6, 5, 4],
    descricaoCurta: "7 dezenas entre 01 e 31.",
    descricaoLonga:
      "Sorteios às terças, quintas e sábados. Aposte de 7 a 15 dezenas e ganhe acertando 4, 5, 6 ou 7 números (além do Mês de Sorte).",
    logo: diadesorteLogo.url,
    banner: diadesorteBanner.url,
    filtrosDefault: {
      somaMin: 85,
      somaMax: 140,
      paresMin: 2,
      paresMax: 5,
      maxConsecutivas: 3,
      repetirAnteriorMin: 0,
      repetirAnteriorMax: 3,
    },
  },
};

export const LOTERIA_IDS: LoteriaId[] = [
  "lotofacil",
  "megasena",
  "quina",
  "lotomania",
  "duplasena",
  "timemania",
  "diadesorte",
];

export function isLoteriaId(x: unknown): x is LoteriaId {
  return typeof x === "string" && (LOTERIA_IDS as string[]).includes(x);
}

export function getLoteria(id: LoteriaId): LoteriaConfig {
  return LOTERIAS[id];
}

/** Na Lotomania a dezena 100 representa o "00" do volante oficial. */
export function formatDezena(n: number): string {
  return n === 100 ? "00" : String(n).padStart(2, "0");
}
