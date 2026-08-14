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

          // Busca bolões pendentes de sorteio
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
            // Margem de 30 min após o horário previsto
            if (agora < new Date(dataSorteio.getTime() + 30 * 60 * 1000)) continue;

            const resumo = await buscarResumoOficial(bolao.loteria_id as any);
            
            // Verifica se o concurso atual no sistema da Caixa é o mesmo ou posterior ao do bolão
            if (resumo && resumo.numero >= bolao.concurso_numero) {
              // Em um cenário real, se resumo.numero > bolao.concurso_numero, 
              // precisaríamos buscar o histórico. Aqui, assumimos que se o concurso atual
              // da Caixa coincide, atualizamos.
              if (resumo.numero === bolao.concurso_numero) {
                const { error: updErr } = await supabaseAdmin
                  .from('boloes')
                  .update({ 
                    resultado_oficial: resumo.dezenas,
                    status: 'sorteado' 
                  })
                  .eq('id', bolao.id);
                
                if (!updateError) {
                  atualizados++;
                  // Disparar notificações para os participantes
                  await notifyBolaoSorteado(bolao.id, bolao.nome);
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
