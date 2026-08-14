import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { buscarResumoOficial } from '@/lib/caixa.server';
import { notifyBolaoSorteado } from '@/lib/notifications.server';
import { createFileRoute } from '@tanstack/react-router';


export const Route = createFileRoute('/api/public/atualizar-resultados')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const agora = new Date();
          const hojeIso = agora.toISOString().split('T')[0];

          // 1. Encerrar bolões que passaram do prazo de vendas
          const { error: encErr } = await supabaseAdmin
            .from('boloes')
            .update({ status: 'encerrado' })
            .eq('status', 'em_vendas')
            .lt('prazo_vendas', hojeIso);

          if (encErr) console.error('Erro ao encerrar bolões expirados:', encErr);

          // 2. Busca bolões pendentes de sorteio
          const { data: boloes, error } = await supabaseAdmin
            .from('boloes')
            .select('id, nome, loteria_id, concurso_numero, data_sorteio, horario_sorteio')
            .is('resultado_oficial', null)
            .lte('data_sorteio', hojeIso);

          if (error) throw error;
          if (!boloes || boloes.length === 0) {
            return new Response(JSON.stringify({ message: 'Nenhum bolão pendente.' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          let atualizados = 0;

          for (const bolao of boloes) {
            const dataSorteio = new Date(`${bolao.data_sorteio}T${bolao.horario_sorteio}`);
            
            // Log para debug interno (apenas no console do servidor)
            console.log(`Verificando bolão ${bolao.nome} (#${bolao.concurso_numero}) da loteria ${bolao.loteria_id}`);

            // Margem de 10 min após o horário previsto (reduzido de 30 para 10 para ser mais responsivo)
            if (agora < new Date(dataSorteio.getTime() + 10 * 60 * 1000)) {
              console.log(`Bolão ${bolao.nome} ainda no prazo de sorteio.`);
              continue;
            }

            const resumo = await buscarResumoOficial(bolao.loteria_id as any);
            
            if (resumo) {
              console.log(`Resultado da Caixa para ${bolao.loteria_id}: Concurso #${resumo.numero}`);
              
              // Se o concurso da Caixa for o mesmo ou mais recente que o do bolão
              if (resumo.numero >= bolao.concurso_numero) {
                // Se for exatamente o mesmo concurso
                if (resumo.numero === bolao.concurso_numero) {
                  const { error: updErr } = await supabaseAdmin
                    .from('boloes')
                    .update({ 
                      resultado_oficial: resumo.dezenas,
                      status: 'sorteado' 
                    })
                    .eq('id', bolao.id);
                  
                  if (!updErr) {
                    atualizados++;
                    console.log(`Bolão ${bolao.nome} atualizado com sucesso!`);
                    await notifyBolaoSorteado(bolao.id, bolao.nome);
                  } else {
                    console.error(`Erro ao atualizar bolão ${bolao.id}:`, updErr);
                  }
                } else {
                  // Se o concurso da Caixa já é maior, o sorteio do concurso do bolão com certeza já ocorreu.
                  // Em produção, aqui buscaríamos o histórico específico do concurso.
                  // Para este MVP, marcamos como encerrado se não tiver resultado.
                  console.log(`Concurso da Caixa (${resumo.numero}) já passou do bolão (${bolao.concurso_numero}).`);
                  
                  // Tentar forçar o status para encerrado para permitir conferência manual se necessário
                  await supabaseAdmin
                    .from('boloes')
                    .update({ status: 'encerrado' })
                    .eq('id', bolao.id)
                    .eq('status', 'em_vendas');
                }
              }
            }
          }

          return new Response(JSON.stringify({ 
            message: atualizados > 0 ? `${atualizados} bolão(ões) atualizado(s).` : 'Nenhum resultado novo disponível ainda.' 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
});
