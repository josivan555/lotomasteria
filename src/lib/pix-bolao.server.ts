// Geração e verificação de PIX (Mercado Pago) para reservas de bolão.
const SITE = () => process.env["SITE_URL"] || "https://lotomasteria.lovable.app";

export type PixData = { qrCode: string; qrCodeBase64: string; paymentId: string | number };

export async function gerarPixReserva(input: {
  reservaId: string;
  valor: number;
  descricao: string;
  nome: string;
  idempotencyKey: string;
}): Promise<{ pix: PixData | null; erro?: string }> {
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!accessToken) return { pix: null, erro: "Pagamento indisponível no momento." };
  const nome = (input.nome || "Cliente").trim().split(/\s+/);
  try {
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: Math.round(Number(input.valor) * 100) / 100,
        description: input.descricao.slice(0, 200),
        payment_method_id: "pix",
        external_reference: input.reservaId,
        notification_url: `${SITE()}/api/public/webhook`,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payer: {
          email: `cliente.${input.reservaId.replace(/-/g, "").slice(0, 12)}@gmail.com`,
          first_name: nome[0] || "Cliente",
          last_name: nome.slice(1).join(" ") || "Cliente",
        },
      }),
    });
    if (!res.ok) {
      console.error("Erro MP ao gerar PIX:", res.status, await res.text());
      return { pix: null, erro: "Não foi possível gerar o PIX agora. Tente novamente." };
    }
    const mp = await res.json();
    const td = mp?.point_of_interaction?.transaction_data;
    if (!td?.qr_code) return { pix: null, erro: "PIX gerado sem QR Code. Tente novamente." };
    return { pix: { qrCode: td.qr_code, qrCodeBase64: td.qr_code_base64, paymentId: mp.id } };
  } catch (e) {
    console.error("Falha ao gerar PIX:", e);
    return { pix: null, erro: "Falha de conexão com o Mercado Pago." };
  }
}

/** Consulta o provedor e confere o vínculo com a reserva. */
export async function consultarPagamentoReserva(paymentId: string, reservaId: string): Promise<string | null> {
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!accessToken || !paymentId) return null;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const p = await res.json();
    return p.external_reference === reservaId ? p.status : null;
  } catch {
    return null;
  }
}

/** Consulta o status do pagamento direto no Mercado Pago (não depende do webhook). */
export async function pagamentoAprovado(paymentId: string, reservaId: string): Promise<boolean> {
  const status = await consultarPagamentoReserva(paymentId, reservaId);
  return status === "approved" || status === "authorized";
}

/** Só libera a substituição depois de confirmar que o PIX antigo não pode ser pago. */
export async function cancelarPixPendente(paymentId: string, reservaId: string): Promise<"cancelado" | "pago"> {
  const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!accessToken) throw new Error("Não foi possível verificar o PIX anterior. Tente novamente mais tarde.");
  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const resposta = await fetch(url, { headers });
  if (!resposta.ok) throw new Error("Não foi possível verificar o pagamento da reserva anterior.");
  const pagamento = await resposta.json();
  if (pagamento.external_reference !== reservaId) throw new Error("O pagamento não corresponde à reserva.");
  if (["approved", "authorized"].includes(pagamento.status)) return "pago";
  if (["cancelled", "rejected"].includes(pagamento.status)) return "cancelado";
  if (!["pending", "in_process"].includes(pagamento.status)) {
    throw new Error("Este pagamento não pode ser cancelado. Consulte sua reserva.");
  }
  const cancelamento = await fetch(url, {
    method: "PUT", headers, body: JSON.stringify({ status: "cancelled" }),
  });
  if (!cancelamento.ok) throw new Error("Não foi possível cancelar o PIX anterior. Sua reserva foi mantida. Consulte o pagamento antes de tentar novamente.");
  const resultado = await cancelamento.json();
  if (resultado.status !== "cancelled" || resultado.external_reference !== reservaId) {
    throw new Error("O cancelamento do PIX não foi confirmado. Sua reserva foi mantida.");
  }
  return "cancelado";
}
