const HISTORICO_APOS_SORTEIO_MS = 12 * 60 * 60 * 1000;

// Datas e horários cadastrados são de Brasília, inclusive no servidor em UTC.
export function bolaoNoHistorico(bolao: any, agora: number): boolean {
  const partes = bolao.is_combo && Array.isArray(bolao.combo_loterias) && bolao.combo_loterias.length > 0
    ? bolao.combo_loterias
    : [bolao];
  const sorteios = partes.map((parte: any) => {
    const data = String(parte.data_sorteio ?? bolao.data_sorteio ?? "").slice(0, 10);
    const horarioRaw = String(parte.horario_sorteio || bolao.horario_sorteio || "23:59:59");
    const horario = horarioRaw.length === 5 ? horarioRaw + ":00" : horarioRaw.slice(0, 8);
    return new Date(data + "T" + horario + "-03:00").getTime();
  });
  // Sem uma data válida, não arquivar antes de conhecer o horário do sorteio.
  return sorteios.every(Number.isFinite) &&
    agora >= Math.max(...sorteios) + HISTORICO_APOS_SORTEIO_MS;
}

