import type { LoteriaId } from "./loterias-config";

// Versões leves (< 300 KB) dos banners, só para preview de link (WhatsApp etc.)
import lotofacil from "@/assets/og/lotofacil.jpg";
import megasena from "@/assets/og/megasena.jpg";
import quina from "@/assets/og/quina.jpg";
import lotomania from "@/assets/og/lotomania.jpg";
import duplasena from "@/assets/og/duplasena.jpg";
import timemania from "@/assets/og/timemania.jpg";
import diadesorte from "@/assets/og/diadesorte.jpg";

export const OG_BANNERS: Record<LoteriaId, string> = {
  lotofacil,
  megasena,
  quina,
  lotomania,
  duplasena,
  timemania,
  diadesorte,
};
