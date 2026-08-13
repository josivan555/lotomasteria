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
