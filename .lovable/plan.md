# Refatoração da Criação de Combos

O usuário solicitou uma mudança na forma como os combos são criados. Em vez de selecionar jogos individuais salvos anteriormente, ele deseja que o administrador possa selecionar bolões que já foram criados e juntá-los em um único combo com um valor unificado.

## Alterações Propostas

### Backend (Server Functions)
- **`src/lib/boloes.functions.ts`**:
    - Atualizar a `criarBolaoCombo` para aceitar uma lista de IDs de bolões existentes.
    - A lógica deve extrair os jogos (`game_snapshot`) e as informações de sorteio de cada bolão selecionado.
    - O status dos bolões originais deve ser alterado (opcionalmente) ou simplesmente marcados como parte de um combo para evitar vendas duplicadas se necessário (embora o usuário queira "juntar", o que implica que o combo passa a ser a unidade de venda).

### Frontend (Página de Admin)
- **`src/routes/_authenticated/admin/combo.tsx`**:
    - Substituir a lista de "Jogos Salvos" por uma lista de "Bolões Ativos".
    - O administrador seleciona os bolões (ex: um da Mega, um da Loto, um da Quina).
    - O sistema soma automaticamente os prêmios e dezenas dos bolões selecionados.
    - Mantém a configuração de valor de cota e total de cotas unificado.

## Detalhes Técnicos
- Utilizar a função `listarTodosBoloes` (já existente em `admin.functions.ts`) para alimentar a seleção.
- Garantir que apenas bolões que ainda não foram sorteados possam ser incluídos em novos combos.
