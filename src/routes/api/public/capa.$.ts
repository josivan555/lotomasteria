import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/capa/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = String((params as any)._splat ?? "");
        if (!/^[\w-]+\/[\w.-]+$/.test(path)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("bolao-capas").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
