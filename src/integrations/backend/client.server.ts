// Cliente administrativo do backend externo. Ignora RLS — use apenas em
// operações confiáveis no servidor. A chave vem SOMENTE do segredo
// LOTOMASTER_TARGET_SERVICE_ROLE_KEY e nunca é registrada em log.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BACKEND_URL, createKeyFetch } from "./config";

function createAdminClient() {
  const key = process.env["LOTOMASTER_TARGET_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("Credencial administrativa do backend não configurada.");
  return createClient<Database>(BACKEND_URL, key, {
    global: { fetch: createKeyFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _admin: ReturnType<typeof createAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = createAdminClient();
    return Reflect.get(_admin, prop, receiver);
  },
});
