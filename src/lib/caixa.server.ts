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
  mesSorte: number | null;
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
  nomeTimeCoracaoMesSorte?: string;
};

const MESES_NORMALIZADOS = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function mesDoNome(nome?: string): number | null {
  if (!nome) return null;
  const normalizado = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const indice = MESES_NORMALIZADOS.findIndex((mes) => normalizado.includes(mes));
  return indice >= 0 ? indice + 1 : null;
}

function parseData(dd: string): string {
  const [d, m, y] = dd.split("/");
  if (!d || !m || !y) return dd;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const REQUEST_HEADERS = {
  accept: "application/json, text/plain, */*",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
  origin: "https://loterias.caixa.gov.br",
  referer: "https://loterias.caixa.gov.br/",
};

type AnyCaixa = Record<string, any>;

function normalizarFaixas(j: AnyCaixa): FaixaPremio[] {
  if (Array.isArray(j.listaRateioPremio)) {
    return j.listaRateioPremio.map((f: any) => ({
      faixa: f.descricaoFaixa ?? "",
      ganhadores: Number(f.numeroDeGanhadores ?? 0),
      premio: Number(f.valorPremio ?? 0),
    }));
  }
  if (Array.isArray(j.premiacoes)) {
    return j.premiacoes.map((f: any) => ({
      faixa: f.descricao ?? f.acertos ?? String(f.faixa ?? ""),
      ganhadores: Number(f.numeroDeGanhadores ?? f.ganhadores ?? f.vencedores ?? 0),
      premio:
        typeof f.valorPremio === "number"
          ? f.valorPremio
          : Number(String(f.premio ?? 0).replace(/\\./g, "").replace(",", ".")) || 0,
    }));
  }
  return [];
}

function normalizarCaixaParaDetalhe(j: AnyCaixa): CaixaDetalhe | null {
  const numero = Number(j.numero ?? j.concurso ?? 0);
  const dezenasRaw = j.listaDezenas ?? j.dezenas ?? j.dezenasSorteadasOrdemSorteio ?? [];
  const data = j.dataApuracao ?? j.data ?? "";
  if (!numero || !Array.isArray(dezenasRaw) || dezenasRaw.length === 0 || !data) return null;
  return {
    numero,
    dataApuracao: data,
    listaDezenas: dezenasRaw.map(String),
    acumulado: Boolean(j.acumulado),
    valorAcumuladoConcurso_0_5: Number(j.valorAcumuladoConcurso_0_5 ?? 0),
    valorAcumuladoProximoConcurso: Number(j.valorAcumuladoProximoConcurso ?? 0),
    valorArrecadado: Number(j.valorArrecadado ?? 0),
    localSorteio: j.localSorteio ?? j.local ?? "",
    nomeMunicipioUFSorteio: j.nomeMunicipioUFSorteio ?? "",
    dataProximoConcurso: j.dataProximoConcurso ?? j.dataProxConcurso ?? "",
    numeroConcursoProximo:
      Number(j.numeroConcursoProximo ?? j.proximoConcurso ?? j.proxConcurso ?? 0) || undefined,
    valorEstimadoProximoConcurso: Number(j.valorEstimadoProximoConcurso ?? 0),
    listaRateioPremio: normalizarFaixas(j),
    nomeTimeCoracaoMesSorte: j.nomeTimeCoracaoMesSorte ?? j.timeCoracao ?? j.mesSorte ?? undefined,
  };
}

async function fetchJson(url: string, timeoutMs = 7000): Promise<AnyCaixa | null> {
  try {
    const res = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as AnyCaixa;
  } catch {
    return null;
  }
}

const FALLBACK_BASES = [
  "https://loteriascaixa-api.herokuapp.com/api",
  "https://loterias-gutotech.herokuapp.com/api",
  "https://loterias-caixa-gov.herokuapp.com/api",
];

async function fetchFallbackCaixa(loteria: LoteriaId, concurso?: number): Promise<CaixaDetalhe | null> {
  const endpoint = concurso ? `${loteria}/${concurso}` : `${loteria}/latest`;
  const candidates: CaixaDetalhe[] = [];

  for (const base of FALLBACK_BASES) {
    const raw = await fetchJson(`${base}/${endpoint}`, 6000);
    const normalized = raw ? normalizarCaixaParaDetalhe(raw) : null;
    if (!normalized) continue;
    if (concurso && normalized.numero !== concurso) continue;
    candidates.push(normalized);
  }

  const guidi = await fetchJson(
    `https://api.guidi.dev.br/loteria/${loteria}/${concurso ? concurso : "ultimo"}`,
    6000,
  );
  const guidiNormalized = guidi ? normalizarCaixaParaDetalhe(guidi) : null;
  if (guidiNormalized && (!concurso || guidiNormalized.numero === concurso)) {
    candidates.push(guidiNormalized);
  }

  if (!candidates.length) return null;

  return candidates.reduce((maisRecente, atual) =>
    atual.numero > maisRecente.numero ? atual : maisRecente,
  );
}

export async function buscarResumoOficial(loteria: LoteriaId): Promise<ResumoOficial | null> {
  const cfg = LOTERIAS[loteria];
  const official = await fetchJson(
    `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria}`,
    7000,
  );
  const officialData = official ? normalizarCaixaParaDetalhe(official) : null;
  const fallbackData = await fetchFallbackCaixa(loteria);

  // A fonte oficial tem prioridade em igualdade, mas nunca permitimos que
  // uma resposta antiga esconda um concurso mais novo disponível no fallback.
  const data =
    officialData && fallbackData
      ? (officialData.numero >= fallbackData.numero ? officialData : fallbackData)
      : (officialData ?? fallbackData);

  if (!data) return null;

  const dz = (data.listaDezenas ?? []).map(Number).sort((a, b) => a - b);
  return {
    loteria,
    nome: cfg.nome,
    numero: data.numero,
    data_apuracao: parseData(data.dataApuracao),
    dezenas: dz,
    soma: dz.reduce((a, b) => a + b, 0),
    acumulou: Boolean(data.acumulado),
    valorAcumulado: data.valorAcumuladoProximoConcurso ?? data.valorAcumuladoConcurso_0_5 ?? 0,
    arrecadacao: data.valorArrecadado ?? 0,
    localSorteio:
      [data.localSorteio, data.nomeMunicipioUFSorteio].filter(Boolean).join(" · ") || null,
    faixas: data.listaRateioPremio ?? [],
    proximoConcurso: data.numeroConcursoProximo ?? null,
    proximoData: data.dataProximoConcurso ? parseData(data.dataProximoConcurso) : null,
    estimativaProximo: data.valorEstimadoProximoConcurso ?? 0,
    mesSorte: loteria === "diadesorte" ? mesDoNome(data.nomeTimeCoracaoMesSorte) : null,
  };
}

export async function buscarResumoTodas(): Promise<ResumoOficial[]> {
  const all = await Promise.all(LOTERIA_IDS.map((id) => buscarResumoOficial(id)));
  return all.filter((r): r is ResumoOficial => r !== null);
}

export async function buscarConcursoOficial(
  loteria: LoteriaId,
  numero: number,
): Promise<{
  numero: number;
  dezenas: number[];
  data_apuracao: string;
  faixas: FaixaPremio[];
  mesSorte: number | null;
} | null> {
  const official = await fetchJson(
    `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria}/${numero}`,
    7000,
  );
  const data = (official ? normalizarCaixaParaDetalhe(official) : null) ??
    (await fetchFallbackCaixa(loteria, numero));

  if (!data) return null;

  const dz = (data.listaDezenas ?? [])
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  if (dz.length === 0) return null;

  return {
    numero: data.numero,
    dezenas: dz,
    data_apuracao: parseData(data.dataApuracao),
    faixas: data.listaRateioPremio ?? [],
    mesSorte: loteria === "diadesorte" ? mesDoNome(data.nomeTimeCoracaoMesSorte) : null,
  };
}
