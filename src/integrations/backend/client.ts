import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BACKEND_PUBLISHABLE_KEY, BACKEND_URL, createKeyFetch } from "./config";

function createBrowserClient() {
  return createClient<Database>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
    global: { fetch: createKeyFetch(BACKEND_PUBLISHABLE_KEY) },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _client: ReturnType<typeof createBrowserClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop, receiver) {
    if (!_client) _client = createBrowserClient();
    return Reflect.get(_client, prop, receiver);
  },
});
