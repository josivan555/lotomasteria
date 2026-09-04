import { useCallback, useEffect, useState } from "react";
import type { LoteriaId } from "./loterias-config";

/**
 * Seleção das bases de sorteios usadas nas análises:
 * - regulares: concursos comuns
 * - especiais: concursos especiais (ex.: Lotofácil da Independência)
 */
export type BaseSorteios = { regular: boolean; especial: boolean };

export const BASE_PADRAO: BaseSorteios = { regular: true, especial: true };

const key = (loteria: LoteriaId) => `lm:base-sorteios:${loteria}`;

export function useBaseSorteios(loteria: LoteriaId) {
  const [base, setBaseState] = useState<BaseSorteios>(BASE_PADRAO);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key(loteria));
    if (!raw) return setBaseState(BASE_PADRAO);
    try {
      const parsed = JSON.parse(raw) as Partial<BaseSorteios>;
      const next = {
        regular: parsed.regular !== false,
        especial: parsed.especial !== false,
      };
      setBaseState(next.regular || next.especial ? next : BASE_PADRAO);
    } catch {
      setBaseState(BASE_PADRAO);
    }
  }, [loteria]);

  const setBase = useCallback(
    (next: BaseSorteios) => {
      // Pelo menos uma base precisa estar ativa.
      const safe = next.regular || next.especial ? next : BASE_PADRAO;
      setBaseState(safe);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key(loteria), JSON.stringify(safe));
      }
    },
    [loteria],
  );

  return { base, setBase };
}

export function aplicarBase<T extends { especial?: boolean }>(
  lista: T[],
  base: BaseSorteios,
): T[] {
  if (base.regular && base.especial) return lista;
  if (base.especial) return lista.filter((c) => c.especial === true);
  return lista.filter((c) => c.especial !== true);
}
