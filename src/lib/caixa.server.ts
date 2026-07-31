import { LOTERIAS, LOTERIA_IDS, type LoteriaId } from "./loterias-config";

export type FaixaPremio = {
  faixa: string;
  ganhadores: number;
  premio: number;
};

export type ResumoOficial = {
  loteria: LoteriaId;
  nome: string;
  numero: number;
  data_apuracao: string;
  dezenas: number[];
  soma: number;
  acumulou: boolean;
  valorAcumulado: number;
  arrecadacao: number;
  localSorteio: string | null;
  faixas: FaixaPremio[];
  proximoConcurso: number | null;
  proximoData: string | null;
  estimativaProximo: number;
};

type CaixaDetalhe = {
  numero: number;
  dataApuracao: string;
  listaDezenas: string[];
  acumulado?: boolean;
  valorAcumuladoConcurso_0_5?: number;
  valorAcumuladoProximoConcurso?: number;
  valorArrecadado?: number;
  localSorteio?: string;
  nomeMunicipioUFSorteio?: string;
  dataProximoConcurso?: string;
  numeroConcursoProximo?: number;
  valorEstimadoProximoConcurso?: number;
  listaRateioPremio?: {
    descricaoFaixa: string;
    numeroDeGanhadores: number;
    valorPremio: number;
  }[];
};

function parseData(dd: string): string {
  const [d, m, y] = dd.split("/");
  if (!d || !m || !y) return dd;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export async function buscarResumoOficial(loteria: LoteriaId): Promise<ResumoOficial | null> {
  const cfg = LOTERIAS[loteria];
  try {
    const res = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as CaixaDetalhe;
    const dz = (j.listaDezenas ?? []).map(Number).sort((a, b) => a - b);
    return {
      loteria,
      nome: cfg.nome,
      numero: j.numero,
      data_apuracao: parseData(j.dataApuracao),
      dezenas: dz,
      soma: dz.reduce((a, b) => a + b, 0),
      acumulou: Boolean(j.acumulado),
      valorAcumulado: j.valorAcumuladoProximoConcurso ?? j.valorAcumuladoConcurso_0_5 ?? 0,
      arrecadacao: j.valorArrecadado ?? 0,
      localSorteio:
        [j.localSorteio, j.nomeMunicipioUFSorteio].filter(Boolean).join(" · ") || null,
      faixas: (j.listaRateioPremio ?? []).map((f) => ({
        faixa: f.descricaoFaixa,
        ganhadores: f.numeroDeGanhadores ?? 0,
        premio: f.valorPremio ?? 0,
      })),
      proximoConcurso: j.numeroConcursoProximo ?? null,
      proximoData: j.dataProximoConcurso ? parseData(j.dataProximoConcurso) : null,
      estimativaProximo: j.valorEstimadoProximoConcurso ?? 0,
    };
  } catch {
    return null;
  }
}

export async function buscarResumoTodas(): Promise<ResumoOficial[]> {
  const all = await Promise.all(LOTERIA_IDS.map((id) => buscarResumoOficial(id)));
  return all.filter((r): r is ResumoOficial => r !== null);
}
