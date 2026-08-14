import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function createNotification(userId: string, title: string, message: string, type = 'info', link?: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
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
  const { data: participantes, error } = await supabaseAdmin
    .from('bolao_participantes')
    .select('celular, nome_completo, user_id') // Assumindo que pode haver user_id se logado
    .eq('bolao_id', bolaoId)
    .eq('status', 'pago');

  if (error) {
    console.error('Error fetching participants for notification:', error);
    return;
  }

  // Se houver sistema de envio de WhatsApp/SMS, seria aqui.
  // Como temos uma tabela de notificações interna:
  for (const p of (participantes || [])) {
    // Se o participante tiver um user_id (vinculado a uma conta)
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
