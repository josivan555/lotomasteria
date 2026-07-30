const MP_API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("Pagamento indisponível: credencial não configurada.");
  return t;
}

export type PreferenceResult = { id: string; init_point: string };

export async function criarPreferencia(input: {
  orderId: string;
  title: string;
  amount: number;
  origin: string;
  payerEmail?: string;
}): Promise<PreferenceResult> {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.orderId,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.orderId,
          title: input.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(input.amount.toFixed(2)),
        },
      ],
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      external_reference: input.orderId,
      notification_url: `${input.origin}/api/public/mercadopago-webhook`,
      back_urls: {
        success: `${input.origin}/creditos?pedido=${input.orderId}`,
        pending: `${input.origin}/creditos?pedido=${input.orderId}`,
        failure: `${input.origin}/creditos?pedido=${input.orderId}`,
      },
      auto_return: "approved",
      statement_descriptor: "LOTOMASTER",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("mercadopago preference error", res.status, body);
    throw new Error("Não foi possível iniciar o pagamento. Tente novamente.");
  }
  const json = (await res.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const url = json.init_point ?? json.sandbox_init_point;
  if (!url) throw new Error("Checkout indisponível no momento.");
  return { id: String(json.id), init_point: url };
}

export type MpPayment = {
  id: string;
  status: string;
  external_reference: string | null;
};

export async function consultarPagamento(paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) {
    console.error("mercadopago payment lookup failed", res.status);
    return null;
  }
  const json = (await res.json()) as {
    id: number | string;
    status: string;
    external_reference: string | null;
  };
  return {
    id: String(json.id),
    status: json.status,
    external_reference: json.external_reference ?? null,
  };
}
