
# Suporte a múltiplas loterias (Lotofácil, Mega-Sena, Quina)

Hoje o sistema é 100% Lotofácil. Vou generalizar para suportar as três modalidades, cada uma com histórico, estatísticas, gerador e jogos salvos independentes, e uma tela de seleção para o usuário escolher com qual trabalhar.

## Experiência do usuário

1. **Seletor de loteria** — nova tela `/loterias` (rota autenticada) como novo "hub". Três cartões grandes:
   - Lotofácil (verde) — 15 dezenas de 1 a 25
   - Mega-Sena (azul) — 6 dezenas de 1 a 60
   - Quina (roxo) — 5 dezenas de 1 a 80
   Cada cartão mostra o último resultado e o prêmio da faixa principal (buscados ao vivo na API da Caixa) e leva ao dashboard daquela loteria.

2. **Navegação por loteria** — as rotas passam a ser prefixadas:
   - `/l/$loteria/dashboard`
   - `/l/$loteria/gerador`
   - `/l/$loteria/historico`
   - `/l/$loteria/jogos`
   `$loteria` ∈ `lotofacil | megasena | quina`. Um seletor no topo do layout permite trocar de loteria a qualquer momento, mantendo a mesma aba.

3. **Dashboard por loteria** — mesmo layout atual do dashboard, adaptado à loteria selecionada:
   - Cartão do último sorteio (nome, número, data, dezenas, prêmio faixa principal, estimativa próximo concurso).
   - Score IA, mais atrasadas, quentes/frias e frequência histórica calculadas com as regras da loteria (tamanho do jogo e intervalo de dezenas específicos).

4. **Gerador por loteria** — mesma UI, mas com filtros e limites adequados a cada modalidade (soma esperada, pares/ímpares, moldura, primos etc. reescalados). Filtros irrelevantes ficam ocultos por loteria.

5. **Meus jogos** — lista jogos salvos filtrados pela loteria ativa, com aba/atalho para ver todas.

6. **Página pública `/resultados`** — passa a mostrar as três loterias em abas, com últimos concursos de cada uma. `/resultados/lotofacil`, `/resultados/megasena`, `/resultados/quina` para deep links / SEO independente.

## Modelo de dados

- Nova tabela `loterias` (catálogo estático): `id text pk` (`lotofacil`/`megasena`/`quina`), `nome`, `total_numeros`, `tamanho_jogo`, `cor_tema`.
- Nova tabela `concursos_v2` com coluna `loteria text` (FK para `loterias.id`), `numero`, `data_apuracao`, `dezenas int[]`, `soma`, PK composta `(loteria, numero)`. Migração copia a `concursos` atual para `('lotofacil', ...)`.
- `jogos_salvos` ganha coluna `loteria text not null default 'lotofacil'` (mantém dados existentes).
- Índices em `(loteria, numero desc)` para leitura rápida.
- RLS: leitura pública em `concursos_v2` e `loterias`; `jogos_salvos` continua escopo por `user_id`.
- GRANTs: `select` para `anon`/`authenticated` nas tabelas públicas; escrita apenas via `service_role`/RLS por usuário nos jogos salvos.

## Backend (server functions)

Refatorar `src/lib/lotofacil.functions.ts` → `src/lib/loterias.functions.ts`:

- `listarConcursos({ loteria })` — SELECT filtrado por loteria.
- `sincronizarConcursos({ loteria, limite })` — puxa da API oficial da Caixa (`/portaldeloterias/api/{loteria}` e `/{loteria}/{n}`). Já suporta as três — mesmo formato de payload.
- `ultimoResultadoCaixa({ loteria })` — resultado ao vivo com prêmio da faixa principal (15/6/5 acertos) e estimativa do próximo.
- `salvarJogo({ loteria, dezenas, ... })` — valida `dezenas` contra as regras da loteria antes de gravar.
- `listarJogosSalvos({ loteria? })` / `excluirJogo({ id })` — filtro opcional por loteria.

Novo módulo `src/lib/loterias-config.ts` (client-safe) com o "shape" de cada loteria: `id`, `nome`, `total`, `tamanho`, `cor`, `somaMin/somaMax`, `paresMin/paresMax`, `moldura`, etc. Todo o cálculo estatístico e o gerador passam a receber esse objeto de config, em vez de constantes de Lotofácil.

Refatorar `src/lib/lotofacil-utils.ts` → `src/lib/loteria-utils.ts`: `computeNumberStats`, `classificarScore`, `gerarJogos`, filtros e `ALL_NUMBERS` viram funções puras parametrizadas por `LoteriaConfig`.

## Frontend

- Novo `LoteriaProvider` (contexto leve) alimentado pelo `$loteria` da rota, expondo `config`, `cor`, helpers.
- `_authenticated/l/$loteria/route.tsx` como layout, validando o param e injetando o contexto. Redireciona para `/loterias` se o slug for inválido.
- Migrar/duplicar as telas atuais (`dashboard`, `gerador`, `historico`, `jogos`) para dentro de `_authenticated/l/$loteria/`. O código é praticamente o mesmo, só passa a ler a config do contexto.
- Deletar as rotas antigas `dashboard/gerador/historico/jogos` (ou redirecioná-las para `/l/lotofacil/*` por compatibilidade).
- Ajustar `DezenaBall` para aceitar variante de cor por loteria (verde/azul/roxo/gold).
- Sidebar / navegação mobile passam a mostrar a loteria ativa (com logo LotoMaster IA) e um botão "Trocar loteria".

## SEO

- `head()` distinto para cada loteria em cada rota (título e descrição mencionando "Mega-Sena", "Quina" ou "Lotofácil").
- `sitemap.xml` inclui as 3 páginas `/resultados/{loteria}` e a nova `/loterias`.
- JSON-LD `SoftwareApplication` atualizado com "análise para Lotofácil, Mega-Sena e Quina".

## Ordem de execução

1. Migração SQL: `loterias`, `concursos_v2` (com cópia da Lotofácil), coluna `loteria` em `jogos_salvos`, RLS/GRANTs.
2. Módulos `loterias-config.ts` e `loteria-utils.ts` (com testes rápidos por loteria).
3. Server functions genéricas em `loterias.functions.ts`.
4. Novo layout `_authenticated/l/$loteria/route.tsx` + migração das telas.
5. Tela `/loterias` (hub) e ajuste da home/landing para direcionar a ela após login.
6. Atualizar `/resultados` público em abas e sitemap/SEO.
7. Remoção das rotas legadas e testes finais (login → escolher loteria → sincronizar → gerar → salvar → ver em "Meus Jogos").

## Detalhes técnicos

- API da Caixa: `https://servicebus2.caixa.gov.br/portaldeloterias/api/{lotofacil|megasena|quina}` — mesmo contrato usado hoje. `listaRateioPremio` traz a faixa principal (`descricaoFaixa` contém "15", "6" ou "5" acertos conforme a loteria).
- Score IA: hoje pondera frequência 30/100/500 + atraso; a fórmula continua igual, só o universo de dezenas muda (25/60/80). A "temperatura" (quente/fria) recalibra por loteria.
- Filtros do gerador (soma, pares, moldura, primos) recebem faixas default por loteria; usuário pode ajustar.
- Backfill inicial: a migração só copia dados existentes da Lotofácil. Mega-Sena e Quina começam vazias e o usuário sincroniza pelo botão "Atualizar" (mesmo fluxo atual).
- Sem alteração no fluxo de auth, RLS de `jogos_salvos` continua `auth.uid() = user_id`, só ganha filtro adicional por `loteria` no client.

Confirma que posso seguir por esse caminho? Se preferir, posso começar já pela migração + backend e deixar a UI num segundo passo.
