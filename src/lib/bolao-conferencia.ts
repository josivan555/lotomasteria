type BolaoConferencia = {
  is_combo?: boolean | null;
  combo_loterias?: unknown;
  resultado_oficial?: unknown;
};

function temResultadoOficial(resultado: unknown): boolean {
  return Array.isArray(resultado) && resultado.length > 0;
}

// O status pode ser alterado manualmente. Só os resultados oficiais persistidos
// pela conferência automática autorizam a entrada no Histórico.
export function bolaoConferidoOficial(bolao: BolaoConferencia | null | undefined): boolean {
  if (!bolao) return false;
  if (bolao.is_combo) {
    const partes = Array.isArray(bolao.combo_loterias) ? bolao.combo_loterias : [];
    return partes.length > 0 && partes.every((parte) => temResultadoOficial(parte?.resultado_oficial));
  }
  return temResultadoOficial(bolao.resultado_oficial);
}
