import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Registrado em src/start.ts: anexa o token do backend externo às server functions.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
