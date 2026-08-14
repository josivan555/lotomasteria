# Plano de Correção: Resultados e Conferência de Bolões Encerrados

O objetivo é garantir que, quando um bolão estiver encerrado, os números sorteados apareçam corretamente e a conferência automática (destaque de acertos) funcione conforme esperado na página de detalhes do bolão.

## Alterações

### 1. Componente de Conferência
- Ajustar `src/components/conferidor-jogos.tsx` para sincronizar o estado inicial das dezenas selecionadas (`selected`) sempre que a prop `resultadoOficial` for alterada, garantindo que o componente reflita os dados mais recentes do servidor sem necessidade de interação manual.

### 2. Página de Detalhes do Bolão
- Melhorar a legibilidade e exibição do "Resultado Oficial" no topo da página em `src/routes/boloes.$bolaoId.tsx`.
- Garantir que a conferência automática nos cards de jogos (`TabsContent value="jogos"`) utilize o `resultado_oficial` vindo do banco de dados.

### 3. Sincronização de Resultados (Backend)
- Revisar a rota `/api/public/atualizar-resultados` para assegurar que a busca na API da Caixa seja robusta e que, ao encontrar o resultado, o status do bolão mude corretamente para `sorteado` ou `conferido`, disparando as atualizações visuais para os usuários.

## Detalhes Técnicos
- Uso de `useEffect` no `ConferidorJogos` para monitorar a prop `resultadoOficial`.
- Verificação de tipos no snapshot de jogos para evitar erros de renderização caso as dezenas não estejam no formato esperado.
