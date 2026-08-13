import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LOTERIA_IDS, type LoteriaId } from "./loterias-config";

const loteriaEnum = z.enum(LOTERIA_IDS as [LoteriaId, ...LoteriaId[]]);

async function checkAdmin(context: { userId: string, supabase: any }) {
  const { data: roleRow } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) throw new Error("Acesso negado: apenas administradores.");
}

export const listarTodosBoloes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkAdmin(context);

    const { data, error } = await context.supabase
      .from("boloes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Adicionar contagem de cotas vendidas para cada bolão
    const boloesComVendas = await Promise.all((data ?? []).map(async (b: any) => {
      const { data: p } = await context.supabase
        .from("bolao_participantes")
        .select("quantidade_cotas")
        .eq("bolao_id", b.id)
        .eq("status", "pago");
      
      const compradas = (p ?? []).reduce((acc: number, curr: any) => acc + curr.quantidade_cotas, 0);
      
      return {
        ...b,
        cotas_compradas: compradas,
      };
    }));

    return boloesComVendas;
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkAdmin(context);

    // Como o supabase client normal pode não ter acesso direto a auth.users,
    // usamos a tabela profiles se ela existir ou buscamos via admin se necessário.
    // Para simplificar agora, listamos os perfis e roles.
    const { data: profiles, error: pError } = await context.supabase
      .from("profiles")
      .select("*");

    if (pError) throw new Error(pError.message);

    const { data: roles, error: rError } = await context.supabase
      .from("user_roles")
      .select("*");

    if (rError) throw new Error(rError.message);

    return (profiles ?? []).map(p => ({
      ...p,
      roles: roles?.filter(r => r.user_id === p.id).map(r => r.role) ?? []
    }));
  });

export const atualizarStatusBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => 
    z.object({ 
      id: z.string().uuid(), 
      status: z.enum(["em_vendas", "esgotado", "encerrado", "sorteado", "conferido"]) 
    }).parse(raw)
  )
  .handler(async ({ data, context }) => {
    await checkAdmin(context);

    const { error } = await context.supabase
      .from("boloes")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await checkAdmin(context);

    // RLS e constraints de banco (on delete cascade) devem lidar com participantes se configurado,
    // caso contrário, removemos o bolão.
    const { error } = await context.supabase
      .from("boloes")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarParticipantesBolao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ 
    bolaoId: z.string().uuid(),
    page: z.number().default(1),
    pageSize: z.number().default(20)
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: participantes, error, count } = await context.supabase
      .from("bolao_participantes")
      .select("id, nome_completo, quantidade_cotas, status, created_at, celular", { count: 'exact' })
      .eq("bolao_id", data.bolaoId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    return { 
      items: participantes || [], 
      total: count || 0,
      hasMore: (count || 0) > to + 1
    };
  });

export const atualizarParticipanteBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => 
    z.object({ 
      id: z.string().uuid(),
      nome_completo: z.string().optional(),
      status: z.enum(["reservado", "pago"]).optional(),
    }).parse(raw)
  )
  .handler(async ({ data, context }) => {
    await checkAdmin(context);

    const updateData: any = {};
    if (data.nome_completo !== undefined) updateData.nome_completo = data.nome_completo;
    if (data.status !== undefined) updateData.status = data.status;

    const { error } = await context.supabase
      .from("bolao_participantes")
      .update(updateData)
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirParticipanteBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await checkAdmin(context);

    const { error } = await context.supabase
      .from("bolao_participantes")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
