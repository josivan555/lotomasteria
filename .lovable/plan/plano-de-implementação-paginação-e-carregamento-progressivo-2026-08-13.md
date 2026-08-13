# Plano de Implementação: Paginação e Carregamento Progressivo (Bolão)

Implementar paginação na lista de participantes dos bolões para otimizar a performance quando houver muitos usuários.

## Alterações Técnicas

### Backend (`src/lib/admin.functions.ts`)
- Atualizar `listarParticipantesBolao` para aceitar parâmetros `page` e `pageSize`.
- Retornar o total de registros para controle da paginação no frontend.

### Frontend (`src/routes/boloes.$bolaoId.tsx`)
- Modificar o componente `ParticipantesList` para utilizar `useInfiniteQuery` ou gerenciar estado de página.
- Adicionar botão "Carregar mais" ou rolagem infinita.
- Garantir que a lógica funcione tanto para usuários comuns quanto para administradores.

## Detalhes
- **Tamanho da página inicial:** 20 participantes.
- **Interface:** Botão discreto de carregamento ao final da lista.
