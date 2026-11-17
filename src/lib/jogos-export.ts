import type { LoteriaConfig } from "./loterias-config";

export type JogoExportavel = {
  dezenas: number[];
  mes?: number | null;
  mes_sorte?: number | null;
  time?: string | null;
  time_coracao?: string | null;
  metadata?: unknown;
};

type Modalidade = Pick<LoteriaConfig, "id" | "nome" | "total" | "tamanhoMin" | "tamanhoMax">;

/** Exporta somente dados da aposta; nunca score, credenciais ou participantes. */
export function prepararExportacao(cfg: Modalidade, jogos: readonly JogoExportavel[]) {
  if (!jogos.length) throw new Error("Selecione pelo menos um jogo para exportar.");
  return jogos.map((jogo, i) => {
    const metadata = typeof jogo.metadata === "object" && jogo.metadata !== null && !Array.isArray(jogo.metadata)
      ? jogo.metadata as Record<string, unknown> : {};
    const erro = (motivo: string): never => { throw new Error(`Jogo ${i + 1}: ${motivo}`); };
    const dezenas = jogo.dezenas;
    if (!Array.isArray(dezenas) || dezenas.length < cfg.tamanhoMin || dezenas.length > cfg.tamanhoMax) {
      return erro(`a quantidade de dezenas deve estar entre ${cfg.tamanhoMin} e ${cfg.tamanhoMax}.`);
    }
    if (dezenas.some((n) => !Number.isInteger(n) || n < 1 || n > cfg.total)) {
      return erro("há dezenas fora do intervalo da modalidade.");
    }
    if (new Set(dezenas).size !== dezenas.length) return erro("há dezenas repetidas na mesma aposta.");
    const resultado: { dezenas: number[]; mes_sorte?: number; time_coracao?: string } = {
      // No sistema, 100 representa o 00 oficial da Lotomania.
      dezenas: dezenas.map((n) => cfg.id === "lotomania" && n === 100 ? 0 : n).sort((a, b) => a - b),
    };
    if (cfg.id === "diadesorte") {
      const mes = jogo.mes ?? jogo.mes_sorte ?? metadata.mes_sorte;
      if (typeof mes !== "number" || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return erro("informe um Mês de Sorte válido antes de exportar.");
      }
      resultado.mes_sorte = mes;
    }
    if (cfg.id === "timemania") {
      const time = jogo.time ?? jogo.time_coracao ?? metadata.time_coracao;
      if (typeof time !== "string" || !time.trim() || /[\r\n|]/.test(time)) {
        return erro("informe um Time do Coração válido antes de exportar.");
      }
      resultado.time_coracao = time.trim();
    }
    return resultado;
  });
}

export function serializarJogos(cfg: Modalidade, jogos: readonly JogoExportavel[], formato: "txt" | "json") {
  const apostas = prepararExportacao(cfg, jogos);
  if (formato === "json") {
    return JSON.stringify({ formato: "lotomasteria-jogos", versao: 1, loteria: cfg.id, quantidade: apostas.length, jogos: apostas }, null, 2);
  }
  return apostas.map((jogo) => {
    const numeros = jogo.dezenas.map((n) => String(n).padStart(2, "0")).join(" ");
    const complemento = jogo.mes_sorte != null ? ` | mes=${String(jogo.mes_sorte).padStart(2, "0")}`
      : jogo.time_coracao ? ` | time=${jogo.time_coracao}` : "";
    return numeros + complemento;
  }).join("\n");
}
