# Implementação de Busca e Pagamento de Reservas de Bolão

Adicionar funcionalidade para que usuários que reservaram cotas de um bolão possam buscar sua reserva pelo código de referência e visualizar as instruções de pagamento novamente.

## Backend (Supabase)
- Nenhuma alteração de schema necessária (usaremos `bolao_participantes`).
- Garantir que as políticas de RLS permitam a busca por `codigo_referencia` para usuários anônimos (já deve estar configurado para leitura básica, mas revisaremos).

## Novas Funções (Server Functions)
- `buscarReservaBolao`: Busca uma reserva pelo código de referência.

## Frontend
- Criar página `/boloes/reserva` com formulário de busca por código.
- Integrar a busca no cabeçalho ou landing page para fácil acesso.
- Atualizar a página de detalhes do bolão para oferecer um link "Já tenho uma reserva".

## Plano Técnico
1. Criar `buscarReservaBolao` em `src/lib/boloes.functions.ts`.
2. Criar a rota `src/routes/boloes.reserva.tsx`.
3. Adicionar link para consulta de reserva na `src/routes/index.tsx` e `src/routes/boloes.$bolaoId.tsx`.
