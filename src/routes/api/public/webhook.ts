import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/public/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          console.log('Webhook Mercado Pago recebido:', body);

          // O Mercado Pago envia o ID do recurso e o tipo (ex: payment)
          // Precisamos consultar a API do MP para pegar os detalhes se o tipo for 'payment'
          if (body.type === 'payment' || body.action === 'payment.updated') {
            const paymentId = body.data?.id || body.resource?.split('/').pop();
            
            if (!paymentId) {
              return new Response('Payment ID not found', { status: 400 });
            }

            // Buscar detalhes do pagamento no Mercado Pago
            const accessToken = process.env['MERCADOPAGO_ACCESS_TOKEN'];
            if (!accessToken) {
              console.error('MERCADOPAGO_ACCESS_TOKEN não configurado');
              return new Response('Configuration error', { status: 500 });
            }

            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              console.error('Erro ao buscar pagamento no MP:', await response.text());
              return new Response('Error fetching payment', { status: 502 });
            }

            const paymentData = await response.json();
            const externalReference = paymentData.external_reference; // Esse deve ser o ID da reserva
            const status = paymentData.status;

            console.log(`Status do pagamento ${paymentId}: ${status} (Ref: ${externalReference})`);

            if (externalReference && status === 'approved') {
              // Atualizar o status da reserva no banco de dados
              const { error } = await supabaseAdmin
                .from('bolao_participantes')
                .update({ 
                  status: 'pago',
                  payment_id: paymentId.toString(),
                  payment_method: 'mercadopago_pix'
                })
                .eq('id', externalReference)
                .eq('status', 'reservado');

              if (error) {
                console.error('Erro ao atualizar status da reserva:', error);
                return new Response('Database error', { status: 500 });
              }
              
              console.log(`Reserva ${externalReference} marcada como PAGA.`);
            }
          }

          return new Response('OK', { status: 200 });
        } catch (error) {
          console.error('Erro no processamento do webhook:', error);
          return new Response('Internal Server Error', { status: 500 });
        }
      },
    },
  },
});
