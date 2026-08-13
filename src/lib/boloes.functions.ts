import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { LOTERIA_IDS, type LoteriaId } from "./loterias-config";

const loteriaEnum = z.enum(LOTERIA_IDS as [LoteriaId, ...LoteriaId[]]);

export const criarBolao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        nome: z.string().min(3).max(100),
        loteriaId: loteriaEnum,
        concursoNumero: z.number().int().positive(),
        dataSorteio: z.string(),
        horarioSorteio: z.string(),
        prazoVendas: z.string(),
        totalCotas: z.number().int().positive(),
        valorCota: z.number().positive(),
        premioEstimado: z.number().optional(),
        jogos: z.array(z.object({
          dezenas: z.array(z.number()),
          score: z.number().optional(),
        })).min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Verificar se é admin
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw new Error("Apenas administradores podem criar bolões.");

    const { data: bolao, error } = await context.supabase
      .from("boloes")
      .insert({
        nome: data.nome,
        loteria_id: data.loteriaId,
        criador_id: context.userId,
        concurso_numero: data.concursoNumero,
        data_sorteio: data.dataSorteio,
        horario_sorteio: data.horarioSorteio,
        prazo_vendas: data.prazoVendas,
        total_jogos: data.jogos.length,
        total_cotas: data.totalCotas,
        valor_cota: data.valorCota,
        valor_total: data.totalCotas * data.valorCota,
        premio_estimado: data.premioEstimado,
        status: "em_vendas",
        game_snapshot: data.jogos as any,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return bolao;
  });

export const listarBoloesPublicos = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("boloes")
      .select("*")
      .in("status", ["publicado", "em_vendas", "esgotado", "encerrado", "sorteado", "conferido"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    
    const boloesComInfo = await Promise.all((data ?? []).map(async (b: any) => {
      const { data: p } = await supabase
        .from("bolao_participantes")
        .select("quantidade_cotas, status")
        .eq("bolao_id", b.id);
      
      const compradas = (p ?? [])
        .filter((x: any) => x.status === 'pago')
        .reduce((acc: number, curr: any) => acc + curr.quantidade_cotas, 0);
      const reservadas = (p ?? [])
        .filter((x: any) => x.status === 'reservado')
        .reduce((acc: number, curr: any) => acc + curr.quantidade_cotas, 0);
      
      return {
        ...b,
        cotas_compradas: compradas,
        cotas_reservadas: reservadas,
        cotas_disponiveis: b.total_cotas - compradas - reservadas,
      };
    }));

    return boloesComInfo;
  });

export const obterBolao = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { data: bolao, error } = await supabase
      .from("boloes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!bolao) throw new Error("Bolão não encontrado");

    const { data: p } = await supabase
      .from("bolao_participantes")
      .select("quantidade_cotas, status")
      .eq("bolao_id", bolao.id);

    const compradas = (p ?? [])
      .filter((x: any) => x.status === "pago")
      .reduce((acc: number, curr: any) => acc + curr.quantidade_cotas, 0);
    const reservadas = (p ?? [])
      .filter((x: any) => x.status === "reservado")
      .reduce((acc: number, curr: any) => acc + curr.quantidade_cotas, 0);

    return {
      ...bolao,
      cotas_compradas: compradas,
      cotas_reservadas: reservadas,
      cotas_disponiveis: bolao.total_cotas - compradas - reservadas,
    };
  });

export const comprarCotasBolao = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        bolaoId: z.string().uuid(),
        nome: z.string().min(3),
        celular: z.string().min(10),
        cotas: z.number().int().min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    // 1. Verificar disponibilidade
    const bolao = await obterBolao({ data: { id: data.bolaoId } });
    if (data.cotas > bolao.cotas_disponiveis) {
      throw new Error(`Apenas ${bolao.cotas_disponiveis} cotas disponíveis.`);
    }

    const valorTotal = data.cotas * bolao.valor_cota;

    // 2. Criar registro de participante (status reservado)
    const { data: participante, error } = await supabase
      .from("bolao_participantes")
      .insert({
        bolao_id: data.bolaoId,
        nome_completo: data.nome,
        celular: data.celular,
        quantidade_cotas: data.cotas,
        valor_total: valorTotal,
        status: "reservado",
        codigo_referencia: `BOL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      })
      .select("id, codigo_referencia")
      .single();

    if (error) throw new Error(error.message);

    return {
      id: participante.id,
      codigoReferencia: participante.codigo_referencia,
      valorTotal,
    };
  });

