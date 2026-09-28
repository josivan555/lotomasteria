# Redesign completo — LotoMaster IA

## Objetivo
Aplicar em todas as telas a identidade visual da referência: fundo azul-marinho com universo de loteria, verde neon, painéis profundos com contornos luminosos, tipografia forte e navegação mais clara — preservando todas as funções e os dados atuais.

## O que será alterado
- Criar um fundo original inspirado na referência, com bolas de loteria desfocadas nas bordas e detalhes geométricos sutis, sem reutilizar a captura enviada como imagem do site.
- Unificar cores, tipografia, sombras, bordas, campos, botões, tabelas, abas, avisos e cartões por meio do estilo global.
- Remodelar os cabeçalhos público e autenticado com a marca completa, navegação escura e estados ativos em verde neon.
- Atualizar a página inicial, seleção de loterias, dashboards, geradores, histórico, jogos, resultados, volante, créditos, autenticação e área administrativa para a mesma linguagem visual.
- Dar tratamento especial às páginas de bolões: cabeçalho visual da modalidade, painel principal destacado, progresso, compra de cotas, participantes e comprovantes.
- Preservar as cores oficiais de cada modalidade como identificação secundária, mantendo o verde neon como identidade principal do produto.
- Ajustar o conjunto para celular e computador, sem alterar regras, pagamentos, filtros ou permissões.

## Direção visual
- Base azul-marinho quase preta, superfícies azul-petróleo e linhas azul-ciano.
- Verde elétrico para ações principais, indicadores, preços e estados ativos.
- Branco frio para títulos e azul-claro para textos secundários.
- Painéis compactos com cantos moderados, profundidade por luz interna e contraste nítido com o fundo.
- Tipografia sans-serif robusta nos títulos e legível nos dados; textos existentes serão mantidos, com ajustes apenas de apresentação e hierarquia.

## Implementação técnica
- Centralizar novos tokens e utilidades em `src/styles.css`.
- Atualizar os componentes compartilhados de botão e cartão para propagar o estilo a todas as telas.
- Ajustar os layouts globais e as rotas que usam estilos próprios ou cores diretas.
- Gerar e integrar um novo background otimizado como ativo do projeto.
- Validar as telas principais em larguras desktop e celular, incluindo a página do bolão exibida na referência.
