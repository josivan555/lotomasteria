// Configuração PÚBLICA central do backend externo (destino da migração).
// Contém apenas valores públicos. A chave administrativa NUNCA fica aqui:
// ela é lida somente em ./client.server.ts a partir do segredo
// LOTOMASTER_TARGET_SERVICE_ROLE_KEY.
export const BACKEND_PROJECT_REF = "jcztmhswceeudezrfpid";
export const BACKEND_URL = `https://${BACKEND_PROJECT_REF}.supabase.co`;
export const BACKEND_PUBLISHABLE_KEY = "sb_publishable_zYTfyb5E8gcPvx2kYsmiRQ_5wneCVkU";

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** fetch que envia `apikey` e remove o Bearer quando a chave é opaca (sb_*). */
export function createKeyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}
