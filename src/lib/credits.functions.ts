import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_PACKAGES, creditosNecessarios, getPackage } from "./credits-config";
import { LOTERIA_IDS, LOTERIAS, type LoteriaId } from "./loterias-config";

const loteriaEnum = z.enum(LOTERIA_IDS as [LoteriaId, ...LoteriaId[]]);

export const meuSaldo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow) return { balance: 0, unlimited: true };
    const { data, error } = await context.supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { balance: data?.balance ?? 0, unlimited: false };
  });

export const minhasTransacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("credit_transactions")
      .select("id, amount, kind, description, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarPedidoCreditos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ packageId: z.string().min(1).max(40) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const pkg = getPackage(data.packageId);
    if (!pkg) throw new Error("Pacote inválido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("credit_orders")
      .insert({
        user_id: context.userId,
        package_id: pkg.id,
        credits: pkg.credits,
        amount_brl: pkg.price,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const origin =
      getRequestHeader("origin") ??
      (getRequestHeader("host") ? `https://${getRequestHeader("host")}` : "");

    const { criarPreferencia } = await import("./mercadopago.server");
    const pref = await criarPreferencia({
      orderId: order.id,
      title: `${pkg.credits} créditos LotoMaster IA`,
      amount: pkg.price,
      origin,
      payerEmail: (context.claims as { email?: string } | undefined)?.email,
    });

    await supabaseAdmin
      .from("credit_orders")
      .update({ preference_id: pref.id, init_point: pref.init_point })
      .eq("id", order.id);

    return { orderId: order.id, checkoutUrl: pref.init_point };
  });

export const statusPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("credit_orders")
      .select("id, status, credits")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const salvarJogosComCreditos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        loteria: loteriaEnum,
        concurso: z.number().int().positive().optional(),
        jogos: z
          .array(
            z.object({
              dezenas: z.array(z.number().int().min(1).max(80)).min(3).max(20),
              score: z.number().optional(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const cfg = LOTERIAS[data.loteria];
    const minLen = cfg.tamanhoMin ?? cfg.tamanho;
    const maxLen = cfg.tamanhoMax ?? cfg.tamanho;
    for (const j of data.jogos) {
      if (j.dezenas.length < minLen || j.dezenas.length > maxLen) {
        throw new Error(`Jogo da ${cfg.nome} precisa de ${minLen} a ${maxLen} dezenas.`);
      }
      for (const d of j.dezenas) {
        if (d < 1 || d > cfg.total) throw new Error(`Dezena ${d} fora do intervalo da ${cfg.nome}.`);
      }
    }

    const custo = creditosNecessarios(data.jogos.length);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saldoNovo, error: debErr } = await supabaseAdmin.rpc("consume_credits", {
      _user_id: context.userId,
      _amount: custo,
      _description: `${data.jogos.length} jogos gerados (${cfg.nome})`,
    });
    if (debErr) {
      if (debErr.message.includes("insufficient_credits")) {
        throw new Error("Créditos insuficientes. Compre mais créditos para continuar gerando jogos.");
      }
      throw new Error(debErr.message);
    }

    const rows = data.jogos.map((j) => ({
      user_id: context.userId,
      loteria: data.loteria,
      nome: `${cfg.nome} · Score ${j.score ?? 0}`,
      dezenas: j.dezenas,
      score: j.score ?? null,
      concurso_alvo: data.concurso ?? null,
      metadata: {} as never,
    }));
    const { error } = await context.supabase.from("jogos_salvos").insert(rows);
    if (error) throw new Error(error.message);

    return { salvos: rows.length, custo, saldo: (saldoNovo as unknown as number) ?? 0 };
  });

export const pacotesCreditos = createServerFn({ method: "GET" }).handler(async () => CREDIT_PACKAGES);
