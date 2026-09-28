# Aplicar o estilo aos jogos de todas as loterias

## Objetivo
Levar o mesmo visual azul-marinho, luminoso e temático da tela de escolha para todas as áreas de cada loteria, preservando funções, dados e identidade de cor de cada modalidade.

## Alterações
- Recriar o cabeçalho interno de cada modalidade com banner, logotipo, nome e detalhes da loteria.
- Padronizar a navegação de Dashboard, Gerador, Histórico, Meus Jogos, Resultados, Volante e Ajuda com acabamento luminoso e estado ativo na cor da modalidade.
- Aplicar painéis escuros com contornos coloridos, destaques, botões, números e indicadores coerentes em todas as telas compartilhadas.
- Manter as cores individuais: Lotofácil roxo, Mega-Sena verde, Quina azul, Lotomania laranja, Dupla Sena vermelho, Timemania amarelo-verde e Dia de Sorte dourado.
- Ajustar a apresentação para computador e celular sem alterar cálculos, filtros, salvamento ou conferência.

## Validação
- Conferir as páginas internas de mais de uma modalidade para garantir que o tema muda corretamente.
- Verificar navegação, legibilidade e ausência de sobreposição no computador e no celular.
- Confirmar que a aplicação continua sem erros.

## Detalhes técnicos
- Centralizar o acabamento visual em `src/styles.css`.
- Aplicar a estrutura compartilhada em `src/routes/_authenticated/l/$loteria/route.tsx`, evitando alterações repetidas em cada modalidade.
- Reaproveitar os banners e logotipos já cadastrados para cada loteria.
