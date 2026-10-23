import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BACKEND_PUBLISHABLE_KEY, BACKEND_URL, createKeyFetch } from "./config";

/** Cliente público (chave publishable, sem sessão) para leituras no servidor. */
export function createServerPublicClient(authToken?: string) {
  return createClient<Database>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
    global: {
      fetch: createKeyFetch(BACKEND_PUBLISHABLE_KEY),
      ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
