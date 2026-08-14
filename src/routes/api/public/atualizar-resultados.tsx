import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { buscarResumoOficial } from '@/lib/caixa.server';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/atualizar-resultados')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const agora = new Date();
          const hojeIso = agora.toISOString().split('T')[0];

          // Bolões onde data_sorteio <= hoje E resultado_oficial É NULO
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
            const dataSorteio = new Date(`${bolao.data_sorteio}T${bolao.horario_sorteio}`);
            const trintaMinutosDepois = new Date(dataSorteio.getTime() + 30 * 60 * 1000);

            if (agora < trintaMinutosDepois) continue;

            const resumo = await buscarResumoOficial(bolao.loteria_id as any);
            
            // Se o resumo retornado é exatamente o concurso do bolão
            if (resumo && resumo.numero === bolao.concurso_numero) {
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

          return new Response(JSON.stringify({ 
            message: resultadosProcessados.length > 0 ? 'Resultados atualizados com sucesso.' : 'Sorteio ainda não disponível nos sistemas oficiais.', 
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
