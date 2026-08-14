import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function createNotification(userId: string, title: string, message: string, type = 'info', link?: string) {
  // Usando cast para any para contornar a falta dos tipos gerados no momento
  const { error } = await (supabaseAdmin
    .from('notifications' as any) as any)
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link
    });
  
  if (error) console.error('Error creating notification:', error);
}

export async function notifyBolaoSorteado(bolaoId: string, bolaoNome: string) {
  // Buscar todos os participantes pagos do bolão
  const { data: participantes, error } = await (supabaseAdmin
    .from('bolao_participantes' as any) as any)
    .select('celular, nome_completo, user_id');

  if (error) {
    console.error('Error fetching participants for notification:', error);
    return;
  }

  // Notificar usuários que possuem conta no sistema
  const filtered = (participantes || []).filter((p: any) => p.bolao_id === bolaoId && p.status === 'pago');

  for (const p of filtered) {
    if (p.user_id) {
      await createNotification(
        p.user_id,
        'Resultado Disponível! 🎉',
        `O bolão "${bolaoNome}" foi sorteado. Confira os acertos agora!`,
        'success',
        `/boloes/${bolaoId}?tab=conferir`
      );
    }
  }
}
