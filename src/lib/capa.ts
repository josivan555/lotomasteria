// Capa (arte) opcional dos bolões. Guardamos o caminho no armazenamento privado
// e servimos via rota pública estável (necessária para o WhatsApp).
export function capaUrl(path?: string | null, absolute = false): string | null {
  if (!path) return null;
  const rel = `/api/public/capa/${path}`;
  return absolute ? `https://lotomasteria.lovable.app${rel}` : rel;
}
