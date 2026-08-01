import { useCallback, useEffect, useState } from "react";
import type { LoteriaId } from "./loterias-config";

/**
 * Janela de analise: quantos concursos mais recentes usar nas estatisticas.
 * null = usar todo o historico disponivel (padrao).
 */
export const BASE_ALVO = 800;

const key = (loteria: LoteriaId) => `lm:janela-analise:${loteria}`;

export function useJanelaAnalise(loteria: LoteriaId) {
  const [janela, setJanelaState] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key(loteria));
    const n = raw ? Number(raw) : NaN;
    setJanelaState(Number.isFinite(n) && n > 0 ? n : null);
  }, [loteria]);

  const setJanela = useCallback(
    (n: number | null) => {
      setJanelaState(n);
      if (typeof window === "undefined") return;
      if (n && n > 0) window.localStorage.setItem(key(loteria), String(n));
      else window.localStorage.removeItem(key(loteria));
    },
    [loteria],
  );

  return { janela, setJanela };
}

export function aplicarJanela<T>(lista: T[], janela: number | null): T[] {
  if (!janela || janela <= 0 || janela >= lista.length) return lista;
  return lista.slice(0, janela);
}
