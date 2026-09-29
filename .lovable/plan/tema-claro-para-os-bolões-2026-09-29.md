# Tema claro para os bolões

## Objetivo
Recriar as telas dos bolões seguindo a referência enviada: painéis claros, verde vibrante, abas bem destacadas e leitura mais limpa, sem alterar reservas, pagamentos, jogos ou conferência.

## Alterações
- Aplicar uma área visual própria para bolões, com fundo temático verde e painéis claros de alto contraste.
- Reorganizar a página interna em duas colunas: conteúdo e participantes à esquerda; compra de cotas à direita.
- Estilizar as abas como uma faixa clara, com a aba ativa em verde.
- Atualizar resumo de cotas, lista de participantes, estados pago/reservado, campos, seletor de quantidade e total da compra.
- Levar o mesmo acabamento para jogos e conferência, preservando as cores da modalidade quando ajudarem na identificação.
- Ajustar o resultado para computador e celular, sem alterar regras ou dados existentes.

## Validação
- Conferir um bolão real nas abas Jogos, Conferir e Participantes.
- Testar o formulário de compra e os controles de quantidade sem concluir pagamento.
- Verificar legibilidade e ausência de sobreposição no computador e celular.
- Confirmar que a aplicação continua sem erros.

## Detalhes técnicos
- Centralizar o novo tema em `src/styles.css` e aplicar classes compartilhadas na página do bolão.
- Manter os componentes e ações atuais; a mudança será apenas visual e estrutural.
