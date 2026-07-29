import { supabase } from "@/integrations/supabase/client";

const FLAG = "lotomaster:browser-session";

let running: Promise<void> | null = null;

/**
 * A sessão só vale enquanto a aba/navegador estiver aberto.
 * Ao fechar a página, o sessionStorage é descartado — na próxima abertura
 * encerramos a sessão persistida e o usuário precisa fazer login de novo.
 */
export function ensureBrowserSession(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (running) return running;

  running = (async () => {
    try {
      if (window.sessionStorage.getItem(FLAG) === "1") return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.auth.signOut();
      }
    } catch {
      // ignora falhas de storage/rede
    } finally {
      try {
        window.sessionStorage.setItem(FLAG, "1");
      } catch {
        /* noop */
      }
    }
  })();

  return running;
}
