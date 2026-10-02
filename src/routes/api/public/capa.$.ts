import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/capa/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = String((params as any)._splat ?? "");
        if (!/^[\w-]+\/[\w.-]+$/.test(path)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Vídeos precisam de uma URL assinada do Storage para que o navegador
        // consiga usar streaming/range requests normalmente.
        if (/\.(mp4|webm|mov|m4v)$/i.test(path)) {
          const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from("bolao-capas")
            .createSignedUrl(path, 60 * 60 * 24);

          if (signedError || !signed?.signedUrl) return new Response("Not found", { status: 404 });

          return Response.redirect(signed.signedUrl, 302);
        }

        const { data, error } = await supabaseAdmin.storage.from("bolao-capas").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        const contentType =
          /\.gif$/i.test(path)
            ? "image/gif"
            : /\.png$/i.test(path)
              ? "image/png"
              : /\.webp$/i.test(path)
                ? "image/webp"
                : "image/jpeg";

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(data.size),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
