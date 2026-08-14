import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
        horarioEncerramento: z.string().optional(),
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
        horario_encerramento: data.horarioEncerramento,
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
    const hoje = new Date().toISOString().split('T')[0];
    
    // Boloes ativos: publicados, em vendas, esgotados e que ainda NÃO passaram da data de sorteio
    // (A data_sorteio >= hoje garante que eles apareçam até o dia do sorteio)
    const { data, error } = await supabase
      .from("boloes")
      .select("*")
      .in("status", ["publicado", "em_vendas", "esgotado"])
      .gte("data_sorteio", hoje)
      .order("data_sorteio", { ascending: true });

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

export const listarHistoricoBoloes = createServerFn({ method: "GET" })
  .handler(async () => {
    const hoje = new Date().toISOString().split('T')[0];
    
    // Histórico: bolões já sorteados, encerrados ou que a data de sorteio já passou
    const { data, error } = await supabase
      .from("boloes")
      .select("*")
      .or(`status.in.("encerrado","sorteado","conferido"),data_sorteio.lt.${hoje}`)
      .order("data_sorteio", { ascending: false });

    if (error) throw new Error(error.message);

    return data ?? [];
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
    
    // Verificar se o prazo de vendas expirou
    const agora = new Date();
    const horario = bolao.horario_encerramento || '23:59:59';
    const dataPrazo = new Date(`${bolao.prazo_vendas}T${horario}`);
    
    // Buscar perfil para verificar se é admin
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    
    let isAdmin = false;
    if (userId) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }

    if (agora > dataPrazo && !isAdmin) {
      throw new Error("O prazo para compra deste bolão já se encerrou.");
    }

    if (bolao.cotas_disponiveis <= 0 || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status)) {
      throw new Error("Este bolão já está esgotado ou encerrado.");
    }

    if (data.cotas > bolao.cotas_disponiveis) {
      throw new Error(`Apenas ${bolao.cotas_disponiveis} cotas disponíveis.`);
    }

    const valorTotal = data.cotas * bolao.valor_cota;

    // 2. Criar registro de participante (status reservado)
    const { data: participante, error } = await supabase
      .from("bolao_participantes")
      .insert({
        bolao_id: data.bolaoId,
        user_id: userId,
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

    // 3. Gerar PIX via Mercado Pago
    let pixData = null;
    try {
      const accessToken = process.env['MERCADOPAGO_ACCESS_TOKEN'];
      if (accessToken) {
        const response = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': participante.id,
          },
          body: JSON.stringify({
            transaction_amount: valorTotal,
            description: `Bolão LotoMaster - ${bolao.nome}`,
            payment_method_id: 'pix',
            external_reference: participante.id,
            notification_url: `${process.env['SITE_URL'] || 'https://lotomasteria.lovable.app'}/api/public/webhook`,
            payer: {
              email: `${participante.id.substring(0, 8)}@lotomasteria.app`,
              first_name: data.nome.split(' ')[0],
              last_name: data.nome.split(' ').slice(1).join(' ') || 'Cliente',
            },
          }),
        });

        if (response.ok) {
          const mpResult = await response.json();
          pixData = {
            qrCode: mpResult.point_of_interaction.transaction_data.qr_code,
            qrCodeBase64: mpResult.point_of_interaction.transaction_data.qr_code_base64,
            paymentId: mpResult.id,
          };
          
          // Salvar o ID do pagamento e os dados do PIX no participante
          await supabaseAdmin
            .from('bolao_participantes')
            .update({ 
              payment_id: mpResult.id.toString(),
              pix_data: pixData 
            })
            .eq('id', participante.id);
        }
      }
    } catch (mpError) {
      console.error('Erro ao gerar PIX MP:', mpError);
    }

    return {
      id: participante.id,
      codigoReferencia: participante.codigo_referencia,
      valorTotal,
      pix: pixData,
    };
  });

export const buscarReservaBolao = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ codigo: z.string().min(3) }).parse(raw))
  .handler(async ({ data }) => {
    // 1. Tentar busca exata por código de referência
    let { data: reserva, error } = await supabase
      .from("bolao_participantes")
      .select("*, boloes(*)")
      .eq("codigo_referencia", data.codigo.toUpperCase())
      .maybeSingle();

    if (error) throw new Error(error.message);

    // 2. Se não encontrou por código, tentar por nome completo (busca aproximada)
    if (!reserva) {
      const query = data.codigo.trim();
      // Apenas busca por nome se tiver pelo menos 3 caracteres para evitar resultados demais
      if (query.length >= 3) {
        const { data: reservasPorNome, error: nameError } = await supabase
          .from("bolao_participantes")
          .select("*, boloes(*)")
          .ilike("nome_completo", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (nameError) throw new Error(nameError.message);
        reserva = reservasPorNome?.[0] || null;
      }
    }

    if (!reserva) {
      throw new Error("Reserva não encontrada. Verifique o código ou nome informado.");
    }

    // 3. Verificar se o PIX está expirado (30 minutos) e reemitir se necessário
    const TRINTA_MINUTOS = 30 * 60 * 1000;
    const criadoEm = new Date(reserva.created_at || new Date()).getTime();
    const agora = new Date().getTime();
    const isExpirado = (agora - criadoEm) > TRINTA_MINUTOS;

    if (reserva.status === 'reservado' && isExpirado) {
      console.log(`PIX da reserva ${reserva.id} expirado. Reemitindo...`);
      
      try {
        const accessToken = process.env['MERCADOPAGO_ACCESS_TOKEN'];
        if (accessToken) {
          const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `${reserva.id}-${Math.floor(agora / TRINTA_MINUTOS)}`,
            },
            body: JSON.stringify({
              transaction_amount: reserva.valor_total,
              description: `Bolão LotoMaster (Reemissão) - ${reserva.boloes?.nome}`,
              payment_method_id: 'pix',
              external_reference: reserva.id,
              notification_url: `${process.env['SITE_URL'] || 'https://lotomasteria.lovable.app'}/api/public/webhook`,
              date_of_expiration: new Date(agora + TRINTA_MINUTOS).toISOString(),
              payer: {
                email: `${reserva.id.substring(0, 8)}@lotomasteria.app`,
                first_name: reserva.nome_completo.split(' ')[0],
                last_name: reserva.nome_completo.split(' ').slice(1).join(' ') || 'Cliente',
              },
            }),
          });

          if (response.ok) {
            const mpResult = await response.json();
            const newPixData = {
              qrCode: mpResult.point_of_interaction.transaction_data.qr_code,
              qrCodeBase64: mpResult.point_of_interaction.transaction_data.qr_code_base64,
              paymentId: mpResult.id,
            };
            
            // Atualizar no banco e na memória
            const { data: updatedReserva, error: updateError } = await supabaseAdmin
              .from('bolao_participantes')
              .update({ 
                payment_id: mpResult.id.toString(),
                pix_data: newPixData,
                created_at: new Date().toISOString() // Resetar o contador de expiração
              })
              .eq('id', reserva.id)
              .select("*, boloes(*)")
              .single();

            if (!updateError && updatedReserva) {
              return updatedReserva;
            }
          }
        }
      } catch (e) {
        console.error('Erro ao reemitir PIX:', e);
      }
    }

    return reserva;
  });

