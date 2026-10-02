// Mídia opcional dos bolões. O caminho fica no armazenamento privado
// e é servido por uma rota pública estável.
export type CapaMediaType = "image" | "gif" | "video";

export function capaMediaType(path?: string | null): CapaMediaType {
  const value = String(path ?? "").toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(value)) return "video";
  if (/\.gif$/.test(value)) return "gif";
  return "image";
}

export function capaUrl(path?: string | null, absolute = false): string | null {
  if (!path) return null;
  const rel = `/api/public/capa/${path}`;
  return absolute ? `https://lotomasteria.lovable.app${rel}` : rel;
}
