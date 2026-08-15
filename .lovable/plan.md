# Plano de Implementação: Bolão Combo LotoMaster

Este plano detalha a finalização do sistema de **Bolão Combo**, que permite criar um único bolão contendo jogos de múltiplas loterias (ex: Mega-Sena, Quina e Lotofácil juntas) com um valor de cota único.

## Etapas de Implementação

### 1. Interface Administrativa para Criação de Combos
- Criar a rota `src/routes/_authenticated/admin/combo.tsx`.
- Implementar formulário para:
  - Definir nome do combo, valor da cota e total de cotas.
  - Selecionar jogos salvos para cada loteria (Mega, Quina, Loto).
  - Buscar automaticamente os números dos próximos concursos via API da Caixa.
  - Preview do prêmio total estimado (soma de todas as loterias).
- Adicionar botão de acesso "Criar Combo" no dashboard administrativo principal.

### 2. Exibição do Combo na Home (Landing Page)
- Adicionar badge visual "COMBO 3x" ou similar nos cards de bolão que possuem `is_combo: true`.
- Ajustar a exibição do prêmio para mostrar a soma total.
- Garantir que bolões individuais que façam parte de um combo (se implementado como referência) ou a própria natureza do combo seja clara para o usuário.

### 3. Página de Detalhes do Bolão Combo
- Modificar `src/routes/boloes.$bolaoId.tsx` para detectar se o bolão é um combo.
- Renderizar blocos distintos para cada loteria incluída no combo:
  - Aba de Jogos: Listar jogos agrupados por loteria.
  - Aba de Conferência: Exibir o resultado oficial de cada concurso e os acertos correspondentes para cada parte do combo.
  - Aba de Participantes: Mantém a lógica global (compra de cota do combo inteiro).

### 4. Refinamentos de Backend e Segurança
- Validar no servidor se o admin está selecionando concursos válidos.
- Garantir que a conferência automática (`obterBolao`) continue funcionando para cada parte do JSON `combo_loterias`.

## Detalhes Técnicos

- **Tecnologias**: TanStack Start, TanStack Query, Shadcn UI, Lucide Icons.
- **Dados**: Uso intensivo do campo `combo_loterias` (JSONB) para evitar mudanças drásticas no esquema da tabela `boloes`.
- **API**: Integração contínua com `buscarConcursoOficial` para validar resultados.

---
**Nota**: O backend básico (migração SQL e função `criarBolaoCombo`) já foi implementado na etapa anterior. Este plano foca na experiência do usuário e interface administrativa.
