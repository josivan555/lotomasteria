## Objetivo

Vender créditos via Mercado Pago (PIX, cartão e boleto pelo Checkout Pro), creditar automaticamente após confirmação do pagamento e consumir créditos ao gerar jogos.

## Regras de negócio definidas

- 1 crédito = 10 jogos gerados (arredondado para cima por geração)
- Novos usuários ganham 5 créditos grátis (50 jogos)
- Pacotes: 10 créditos R$ 9,90 · 30 créditos R$ 24,90 · 100 créditos R$ 69,90
- Sem créditos, o gerador bloqueia e leva para a página de compra

## Banco de dados

- `user_credits`: saldo por usuário. Leitura só do próprio usuário; alterações apenas pelo servidor.
- `credit_transactions`: histórico (compra, bônus inicial, consumo) com quantidade, motivo e referência do pedido.
- `credit_orders`: pedido de compra com pacote, valor, status (pendente/pago/expirado), id da preferência e do pagamento no Mercado Pago.
- Gatilho no cadastro concede os 5 créditos iniciais e registra a transação de bônus.
- Função no banco para debitar de forma atômica (impede saldo negativo em cliques simultâneos).

## Backend

- `src/lib/credits.functions.ts` — funções autenticadas: consultar saldo, listar histórico, criar pedido de pagamento (chama a API do Mercado Pago e devolve a URL do checkout), consultar status de um pedido.
- `src/lib/mercadopago.server.ts` — chamadas à API do Mercado Pago (preferência de pagamento e consulta de pagamento) usando o Access Token guardado como segredo.
- `src/routes/api/public/mercadopago-webhook.ts` — recebe a notificação, consulta o pagamento na API do Mercado Pago (nunca confia no corpo recebido), e, se aprovado, credita uma única vez (idempotente pelo id do pagamento).
- Débito de créditos feito no servidor dentro da própria função de geração/salvamento, nunca só na interface.

## Frontend

- Nova rota `/creditos`: saldo atual, os três pacotes, botão de compra que abre o checkout do Mercado Pago, e histórico de transações.
- Página de retorno após pagamento com verificação de status (o PIX pode levar alguns segundos) e atualização automática do saldo.
- Indicador de saldo no cabeçalho das telas da loteria, com link para comprar.
- No Gerador: aviso de quantos créditos a quantidade escolhida vai consumir e bloqueio amigável quando o saldo for insuficiente.

## Configuração necessária

Vou pedir com segurança dois valores: o **Access Token do Mercado Pago** e um **segredo de webhook** (assinatura), para validar as notificações recebidas.

## Detalhes técnicos

- Webhook em `/api/public/*` (sem autenticação de site), com validação da assinatura `x-signature` do Mercado Pago e reconsulta do pagamento pela API antes de creditar.
- Crédito e mudança de status do pedido em uma função `SECURITY DEFINER` idempotente, chamada com service role apenas dentro do webhook.
- RLS: usuário lê apenas o próprio saldo, transações e pedidos; nenhuma escrita direta pelo cliente.
