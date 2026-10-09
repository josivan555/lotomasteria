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

export const atualizarBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => 
    z.object({ 
      id: z.string().uuid(),
      nome: z.string().optional(),
      concurso_numero: z.number().optional(),
      data_sorteio: z.string().optional(),
      horario_sorteio: z.string().optional(),
      prazo_vendas: z.string().optional(),
      horario_encerramento: z.string().optional(),
      total_cotas: z.number().optional(),
      valor_cota: z.number().optional(),
      premio_estimado: z.number().optional(),
      capa_url: z.string().max(300).regex(/^[\w-]+\/[\w.-]+$/).nullable().optional(),
    }).parse(raw)
  )
  .handler(async ({ data, context }) => {
    await checkAdmin(context);
    const { id, ...updateData } = data;
    
    // Se mudou cota ou valor, atualiza o total
    const { data: current } = await context.supabase.from("boloes").select("total_cotas, valor_cota, prazo_vendas, horario_encerramento").eq("id", id).single();
    if (current) {
      const finalCotas = data.total_cotas ?? current.total_cotas;
      const finalValor = data.valor_cota ?? current.valor_cota;
      (updateData as any).valor_total = finalCotas * finalValor;

      // Monta o prazo de vendas (timestamp) a partir da data + horário de encerramento
      if (data.prazo_vendas || data.horario_encerramento) {
        const dataPrazo = data.prazo_vendas ?? String(current.prazo_vendas).slice(0, 10);
        const horaPrazo = data.horario_encerramento ?? current.horario_encerramento ?? "20:00:00";
        (updateData as any).prazo_vendas = `${dataPrazo}T${horaPrazo.length === 5 ? horaPrazo + ":00" : horaPrazo}`;
      }
      if (!data.horario_encerramento) delete (updateData as any).horario_encerramento;
    }

    const { error } = await context.supabase
      .from("boloes")
      .update(updateData)
      .eq("id", id);

    if (error) throw new Error(error.message);
    return { ok: true };
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
  .inputValidator((raw: unknown) => z.object({ 
    bolaoId: z.string().uuid(),
    page: z.number().default(1),
    pageSize: z.number().default(20)
  }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: participantes, error, count } = await sb
      .from("bolao_participantes")
      .select("id, nome_completo, quantidade_cotas, status, created_at, celular", { count: 'exact' })
      .eq("bolao_id", data.bolaoId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    // Removendo celular para não-admins
    const session = await sb.auth.getSession();
    const userId = session.data.session?.user.id;
    
    let isAdmin = false;
    if (userId) {
      const { data: roleRow } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }

    const items = (participantes || []).map(p => ({
      ...p,
      celular: isAdmin ? p.celular : null
    }));

    return { 
      items, 
      total: count || 0,
      hasMore: (count || 0) > to + 1
    };
  });

export const atualizarParticipanteBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => 
    z.object({ 
      id: z.string().uuid(),
      nome_completo: z.string().trim().min(2).max(100).optional(),
      quantidade_cotas: z.number().int().min(1).max(10000).optional(),
      status: z.enum(["reservado", "pago"]).optional(),
    }).parse(raw)
  )
  .handler(async ({ data, context }) => {
    await checkAdmin(context);

    const updateData: any = {};
    if (data.nome_completo !== undefined) updateData.nome_completo = data.nome_completo;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.quantidade_cotas !== undefined) {
      const { data: participante, error: participanteError } = await context.supabase
        .from("bolao_participantes").select("bolao_id, quantidade_cotas").eq("id", data.id).single();
      if (participanteError || !participante) throw new Error("Participante não encontrado.");
      const { data: bolao, error: bolaoError } = await context.supabase
        .from("boloes").select("total_cotas, valor_cota").eq("id", participante.bolao_id).single();
      if (bolaoError || !bolao) throw new Error("Bolão não encontrado.");
      const { data: outros, error: cotasError } = await context.supabase
        .from("bolao_participantes").select("quantidade_cotas").eq("bolao_id", participante.bolao_id).neq("id", data.id);
      if (cotasError) throw new Error(cotasError.message);
      const limite = bolao.total_cotas - (outros ?? []).reduce((total, p) => total + p.quantidade_cotas, 0);
      if (data.quantidade_cotas > limite) throw new Error(`Este participante pode ter no máximo ${limite} cota(s).`);
      updateData.quantidade_cotas = data.quantidade_cotas;
      updateData.valor_total = data.quantidade_cotas * Number(bolao.valor_cota);
    }

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

export const relatorioParticipantesBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ bolaoId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await checkAdmin(context);
    const { obterBolao } = await import("./boloes.functions");
    const bolao: any = await obterBolao({ data: { id: data.bolaoId } });
    if (!bolao) throw new Error("Bolão não encontrado.");

    const { data: rows, error } = await context.supabase
      .from("bolao_participantes")
      .select("nome_completo, celular, quantidade_cotas, valor_total, status, created_at")
      .eq("bolao_id", data.bolaoId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Partes (bolão simples = 1 parte; combo = cada loteria)
    const partes: any[] = bolao.is_combo
      ? (Array.isArray(bolao.combo_loterias) ? bolao.combo_loterias : [])
      : [{
          loteria_id: bolao.loteria_id,
          concurso_numero: bolao.concurso_numero,
          data_sorteio: bolao.data_sorteio,
          jogos: bolao.game_snapshot ?? [],
          resultado_oficial: bolao.resultado_oficial ?? [],
          rateio_oficial: bolao.rateio_oficial ?? [],
        }];

    let resultadoCompleto = partes.length > 0;
    let premioTotal = 0;
    const resumoPartes = partes.map((p) => {
      const res: number[] = Array.isArray(p.resultado_oficial) ? p.resultado_oficial : [];
      if (res.length === 0) resultadoCompleto = false;
      const set = new Set(res);
      const premioPorAcerto = new Map<number, number>();
      for (const f of (Array.isArray(p.rateio_oficial) ? p.rateio_oficial : [])) {
        const n = Number(String(f.faixa).match(/\d+/)?.[0]);
        if (Number.isFinite(n) && !premioPorAcerto.has(n)) premioPorAcerto.set(n, Number(f.premio) || 0);
      }
      const acertosPorJogo = (Array.isArray(p.jogos) ? p.jogos : []).map(
        (j: any) => (j.dezenas ?? []).filter((d: number) => set.has(d)).length,
      );
      const premiados: Record<number, number> = {};
      let premio = 0;
      for (const a of acertosPorJogo) {
        const v = premioPorAcerto.get(a) ?? 0;
        if (v > 0) { premiados[a] = (premiados[a] ?? 0) + 1; premio += v; }
      }
      // Dia de Sorte: prêmio do Mês da Sorte
      let acertosMes = 0;
      const mesOficial = Number(p.resultado_mes_oficial ?? bolao.resultado_mes_oficial) || 0;
      if (p.loteria_id === "diadesorte" && mesOficial && res.length > 0) {
        const faixaMes = (Array.isArray(p.rateio_oficial) ? p.rateio_oficial : []).find((f: any) => /m[eê]s/i.test(String(f.faixa)));
        const premioMes = Number(faixaMes?.premio) || 2.5;
        for (const j of (Array.isArray(p.jogos) ? p.jogos : [])) {
          const m = Number(j?.mes_sorte ?? j?.metadata?.mes_sorte) || 0;
          if (m === mesOficial) acertosMes++;
        }
        premio += acertosMes * premioMes;
      }
      premioTotal += premio;
      return {
        loteria_id: p.loteria_id as string,
        concurso_numero: p.concurso_numero as number,
        data_sorteio: p.data_sorteio as string,
        resultado: res,
        total_jogos: acertosPorJogo.length,
        melhor_acerto: acertosPorJogo.length ? Math.max(...acertosPorJogo) : 0,
        premiados,
        acertos_mes: acertosMes,
        premio,
        sem_valores: res.length > 0 && premioPorAcerto.size === 0,
      };
    });

    // Libera valores no dia seguinte ao sorteio (maior data entre as partes)
    const ultimaData = partes.map((p) => String(p.data_sorteio).slice(0, 10)).sort().at(-1) ?? String(bolao.data_sorteio).slice(0, 10);
    const liberacao = new Date(`${ultimaData}T00:00:00-03:00`);
    liberacao.setDate(liberacao.getDate() + 1);
    const valoresLiberados = resultadoCompleto && new Date() >= liberacao;

    const totalCotas = Number(bolao.total_cotas) || 1;
    const valorPorCota = premioTotal / totalCotas;

    const grupos = new Map<string, any>();
    for (const r of rows ?? []) {
      const key = String(r.celular ?? "").replace(/\D/g, "") || r.nome_completo.trim().toLowerCase();
      const g = grupos.get(key) ?? {
        nome: r.nome_completo.trim(), celular: r.celular, cotas: 0, cotas_pagas: 0,
        valor_pago: 0, compras: [] as { data: string; cotas: number; status: string }[],
      };
      g.cotas += r.quantidade_cotas;
      if (r.status === "pago") { g.cotas_pagas += r.quantidade_cotas; g.valor_pago += Number(r.valor_total) || 0; }
      g.compras.push({ data: r.created_at, cotas: r.quantidade_cotas, status: r.status });
      grupos.set(key, g);
    }
    const participantes = [...grupos.values()]
      .map((g) => ({ ...g, receber: valoresLiberados ? g.cotas_pagas * valorPorCota : null }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return {
      bolao: {
        id: bolao.id, nome: bolao.nome, is_combo: !!bolao.is_combo, loteria_id: bolao.loteria_id,
        concurso_numero: bolao.concurso_numero, data_sorteio: bolao.data_sorteio,
        horario_sorteio: bolao.horario_sorteio, prazo_vendas: bolao.prazo_vendas,
        horario_encerramento: bolao.horario_encerramento, total_cotas: bolao.total_cotas,
        valor_cota: Number(bolao.valor_cota), total_jogos: bolao.total_jogos,
        premio_estimado: Number(bolao.premio_estimado ?? 0), status: bolao.status,
      },
      partes: resumoPartes,
      resultadoCompleto,
      valoresLiberados,
      liberacao: liberacao.toISOString(),
      premioTotal,
      valorPorCota,
      cotasVendidas: participantes.reduce((s, p) => s + p.cotas_pagas, 0),
      participantes,
    };
  });

export const adicionarParticipanteManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      bolaoId: z.string().uuid(),
      nome: z.string().trim().min(2).max(100),
      celular: z.string().trim().max(30).optional().default(""),
      cotas: z.number().int().min(1).max(10000),
      pago: z.boolean().default(true),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await checkAdmin(context);
    const { data: bolao, error: bErr } = await context.supabase
      .from("boloes").select("total_cotas, valor_cota").eq("id", data.bolaoId).single();
    if (bErr || !bolao) throw new Error("Bolão não encontrado.");
    const { data: rows } = await context.supabase
      .from("bolao_participantes").select("quantidade_cotas").eq("bolao_id", data.bolaoId);
    const usadas = (rows ?? []).reduce((s: number, r: any) => s + r.quantidade_cotas, 0);
    const livres = bolao.total_cotas - usadas;
    if (data.cotas > livres) throw new Error(`Apenas ${livres} cota(s) disponível(is).`);
    const { error } = await context.supabase.from("bolao_participantes").insert({
      bolao_id: data.bolaoId,
      nome_completo: data.nome,
      celular: data.celular,
      quantidade_cotas: data.cotas,
      valor_total: data.cotas * Number(bolao.valor_cota),
      status: data.pago ? "pago" : "reservado",
      payment_method: "manual",
      codigo_referencia: `BOL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
