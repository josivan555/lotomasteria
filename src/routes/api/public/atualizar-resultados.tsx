import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { buscarResumoOficial } from '@/lib/caixa.server';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/atualizar-resultados')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // 1. Buscar bolões que ainda não têm resultado oficial mas o sorteio já passou
          const agora = new Date();
          const hojeIso = agora.toISOString().split('T')[0];
          const horaIso = agora.toTimeString().split(' ')[0];

          // Bolões onde data_sorteio <= hoje AND resultado_oficial IS NULL
          const { data: boloes, error } = await supabaseAdmin
            .from('boloes')
            .select('id, loteria_id, concurso_numero, data_sorteio, horario_sorteio')
            .is('resultado_oficial', null)
            .lte('data_sorteio', hojeIso);

          if (error) throw error;
          if (!boloes || boloes.length === 0) {
            return new Response(JSON.stringify({ message: 'Nenhum bolão pendente de resultado.' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const resultadosProcessados = [];

          for (const bolao of boloes) {
            // Verificar se o horário do sorteio já passou (margem de segurança de 30 min)
            const dataSorteio = new Date(`${bolao.data_sorteio}T${bolao.horario_sorteio}`);
            const trintaMinutosDepois = new Date(dataSorteio.getTime() + 30 * 60 * 1000);

            if (agora < trintaMinutosDepois) continue;

            // 2. Buscar resultado oficial na API da Caixa
            const resumo = await buscarResumoOficial(bolao.loteria_id as any);
            
            if (resumo && resumo.numero >= bolao.concurso_numero) {
              // Se o resumo retornado é o concurso do bolão ou um mais recente
              // (Caso seja mais recente, tentamos buscar o específico ou usamos a lógica de que o sorteio ocorreu)
              
              // Para garantir que pegamos o resultado do concurso exato do bolão
              // A API da caixa por padrão retorna o último. Se o último for > que o do bolão,
              // precisaríamos de um endpoint histórico, mas aqui vamos focar em automatizar o encerramento do atual.
              
              if (resumo.numero === bolao.concurso_numero) {
                const { error: updateError } = await supabaseAdmin
                  .from('boloes')
                  .update({ 
                    resultado_oficial: resumo.dezenas,
                    status: 'sorteado' 
                  })
                  .eq('id', bolao.id);

                if (!updateError) {
                  resultadosProcessados.push({ id: bolao.id, concurso: bolao.concurso_numero, status: 'atualizado' });
                }
              }
            }
          }

          return new Response(JSON.stringify({ 
            message: 'Processamento concluído', 
            processados: resultadosProcessados 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error('Erro ao atualizar resultados:', err);
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
});
