import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BACKEND_PUBLISHABLE_KEY, BACKEND_URL, createKeyFetch } from "./config";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const authHeader = getRequest()?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: No authorization header provided");
  const token = authHeader.slice(7);
  if (token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

  const supabase = createClient<Database>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
    global: {
      fetch: createKeyFetch(BACKEND_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: Invalid token");

  return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } });
});
