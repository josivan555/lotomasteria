import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function validarAssinatura(request: Request, dataId: string | null): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id") ?? "";
  if (!signature) return false;

  let ts = "";
  let v1 = "";
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=").map((s) => s?.trim());
    if (k === "ts") ts = v ?? "";
    if (k === "v1") v1 = v ?? "";
  }
  if (!ts || !v1 || !dataId) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const raw = await request.text();
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          return new Response("bad request", { status: 400 });
        }

        const dataId =
          (body.data?.id != null ? String(body.data.id) : null) ??
          url.searchParams.get("data.id") ??
          url.searchParams.get("id");

        if (!validarAssinatura(request, dataId)) {
          return new Response("invalid signature", { status: 401 });
        }

        const tipo = body.type ?? url.searchParams.get("type") ?? "";
        if (tipo !== "payment" || !dataId) return new Response("ignored", { status: 200 });

        const { consultarPagamento } = await import("@/lib/mercadopago.server");
        const pagamento = await consultarPagamento(dataId);
        if (!pagamento) return new Response("payment not found", { status: 200 });
        if (pagamento.status !== "approved" || !pagamento.external_reference) {
          return new Response("not approved", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("apply_paid_order", {
          _order_id: pagamento.external_reference,
          _payment_id: pagamento.id,
        });
        if (error) {
          console.error("apply_paid_order failed", error.message);
          return new Response("error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
