# Migração do LotoMaster para Supabase próprio

Migração concluída e publicada em 23/10/2026 em https://lotomasteria.lovable.app.
Navegador e funções do servidor usam `jcztmhswceeudezrfpid` (LotoMaster, São Paulo).
A origem `syniwjbzskbeejgghhrw` permanece preservada, com bloqueio de gravações
nas 12 tabelas públicas e nas duas tabelas de contas, autorizado pelo proprietário.
O aplicativo usa o commit `9da75a6`; `levantamento.json` registra as validações.
As seções de preparação abaixo documentam o procedimento utilizado.

## Acessos e exportação necessários

1. Conectar Lovable e Supabase para consultar a origem e identificar o destino.
   Confirmar o ID do destino: não presumir que o projeto mostrado anteriormente
   no painel pode receber dados, pois ele pode pertencer a outro sistema.
2. Com a origem ativa, exportar o banco completo pelo Lovable. Na documentação
   consultada: More → Database → Manage → Settings → Export project data →
   Export data → Database → Export → Start export. A interface pode variar;
   em versões anteriores a opção fica em Cloud → Overview → Advanced settings.
3. Baixar o arquivo pronto e os arquivos de Storage separadamente. O banco
   completo inclui contas e hashes de senhas; tratar o arquivo como confidencial.
   Não colocar exportações, senhas ou chaves administrativas neste repositório.

## Escopo levantado

- 12 tabelas públicas esperadas pelos tipos gerados, incluindo reservas,
  participantes, bolões, jogos, perfis, permissões e créditos.
- Autenticação por e-mail; preservar UUIDs, contas e hashes na importação
  compatível. As sessões atuais não devem ser tratadas como portáveis.
- Bucket `bolao-capas`, referenciado pelo código. O download do banco não contém
  os arquivos binários. Verificar também buckets adicionais na origem.
- Políticas RLS, funções SQL, gatilhos e permissões devem ser comparados.
- Mercado Pago roda nas rotas do servidor da aplicação. Manter sua configuração
  e conferir os webhooks durante a troca; não gerar cobranças reais para teste.
- Não há código de Edge Functions versionado em `supabase/functions` nesta
  revisão. Isso não prova ausência de funções ou tarefas criadas diretamente
  no ambiente; consultar o painel da origem.

## Preparação e restauração

Usar destino vazio e dedicado, ou conferir explicitamente que não há dados de
outro sistema. Não importar por cima do projeto exibido no print sem identificá-lo.

Inspecionar o arquivo de exportação, sua integridade, formato e lista de objetos
antes de escolher os comandos de restauração. Confrontar versões de PostgreSQL,
objetos gerenciados por Supabase e o procedimento oficial de importação. Não
executar restauração com opções de limpeza indiscriminadas.

O histórico SQL do repositório não substitui a exportação da origem. Existem
migrações sobrepostas para `notifications` e políticas semelhantes; não aplicar
todos esses scripts às cegas por cima de uma restauração completa.

Importar contas, dados e relações preservando IDs. Migrar os objetos de Storage
mantendo seus caminhos e configurações de acesso. Reconfigurar autenticação,
URLs de redirecionamento, provedores, SMTP, segredos, funções e tarefas existentes.

## Configuração da aplicação

Inventário de nomes, sem valores:

| Variáveis | Onde são usadas |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Build do navegador |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | Servidor / configuração do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente servidor, nunca prefixar com `VITE_` |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SITE_URL` | Pagamentos e webhooks no servidor |

O código usa URL e chaves no navegador e no servidor. Trocar apenas `.env` ou
apenas a chave pública não conclui a mudança. Os clientes ativos estão em `src/integrations/backend/*`; o navegador utiliza
configuração pública do destino e o servidor usa o segredo
`LOTOMASTER_TARGET_SERVICE_ROLE_KEY`. O `supabase/config.toml`, clientes gerados
e segredos Cloud antigos foram preservados para recuperação e não determinam
a conexão da aplicação publicada. Build, tipos e publicação foram verificados.

## Validação e troca

Executar `auditoria-somente-leitura.sql` com acesso administrativo na origem e no
destino. Ele retorna contagens e totais agregados, não nomes, e-mails, telefones,
tokens ou hashes. Comparar também esquema completo, vínculos por UUID e arquivos
por caminho/tamanho/conteúdo; contagens isoladas não garantem integridade.

Testar login, conta administrativa, isolamento entre usuários, bolões ativos e
histórico, reservas, número de cotas, jogos e mídia. Testar pagamentos em ambiente
de teste apropriado e conferir configuração dos webhooks, sem cobranças reais.

Antes da troca definitiva, combinar janela curta sem novas gravações e copiar
as alterações feitas desde a exportação inicial. Registrar o ponto de corte e
conferir novamente os totais. Só então trocar navegador e servidor juntos.

Manter origem e backup até concluir a validação. Se o destino já receber novas
reservas ou pagamentos, reconciliar essas gravações antes de qualquer retorno à
origem, para não perder ou duplicar dados. Não remover o Cloud automaticamente.

## Referências consultadas

- https://docs.lovable.dev/features/database-backups
- https://supabase.com/kb/troubleshooting/cant-access-supabase-project-lovable-cloud

## Etapas concluídas

- [x] Conexões confirmadas com os serviços.
- [x] Projeto de destino identificado e disponibilidade de espaço confirmada.
- [x] Exportação completa recebida e inspecionada.
- [x] Arquivos, configurações de autenticação e segredos inventariados na origem.
- [x] Restauração e validações concluídas em teste.
- [x] Sincronização final e troca verificadas.


## Resultado da restauração inicial

- ZIP verificado e arquivo PostgreSQL custom/zstd inspecionado com pg_restore 18.
- 12 tabelas públicas restauradas; auth.users e auth.identities preservados.
- Checksums de todas as 14 tabelas iguais à origem na conferência realizada.
- Conferência: 5 usuários, 14 bolões, 183 participantes, 8.011 concursos,
  1.439 jogos salvos, 7 loterias, 5 perfis, 5 saldos, 1 permissão,
  2 pedidos de créditos, 4 transações; notificações e comentários vazios.
- Gatilhos de criação de perfil/créditos e regras do Storage restaurados.
- RLS preservada. Privilégios amplos do dump para anon/authenticated e
  privilégios padrão sobre objetos futuros não importados; usados privilégios
  explícitos por tabela. Funções financeiras restritas ao serviço do servidor.
- Advisor de segurança não apontou problemas de RLS na restauração; retornou
  apenas configuração de proteção contra senhas vazadas desativada:
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Bucket privado bolao-capas criado; transferência dos arquivos e configuração
  de autenticação concluídas nas etapas seguintes.


## Validação do preview (commit 9da75a6)

- Clientes da aplicação centralizados em src/integrations/backend; navegador,
  middleware de Auth, clientes públicos e administrativos apontam ao destino.
- Chave administrativa somente em LOTOMASTER_TARGET_SERVICE_ROLE_KEY no servidor.
- Arquivos gerados e variáveis da origem preservados para rollback.
- Build, tipos, login sintético, páginas públicas, crédito, leitura do painel
  administrativo e permissões de upload de capas testados no preview.
- 18 capas (11.699.842 bytes) copiadas; SHA-256 de cada arquivo conferido na origem
  e no destino. Bucket privado. Contas, papéis e arquivos sintéticos removidos.
- Listagem de usuários no admin mantém limitação já existente na origem:
  RLS permite somente o próprio perfil. Não ampliamos essa permissão.
- Origem sem pg_cron ou pg_net; nada encontrado no banco que agende chamadas HTTP.
- Cadastro por e-mail e senha sem confirmação, conforme escolha do proprietário.
  Site URL informada como configurada pelo proprietário; cadastro público com
  sessão imediata e login foram confirmados nos testes.


## Sincronização final e publicação

- Bloqueio de gravações aplicado na origem após autorização específica do
  proprietário. Script `bloquear-gravacoes-origem.sql`; 14 gatilhos confirmados.
  O destino não contém esses bloqueios.
- Dados e contas comparados novamente antes da publicação. Ajuste final de
  `auth.users.updated_at` sincronizado; IDs e hashes de senha preservados.
- O teste de leitura disparou a conferência automática de um bolão, conforme
  comportamento existente de `obterBolao`: registro
  `c5fcb17d-f196-4b85-b991-c355f4792d40`, concurso 3073, passou de `encerrado`
  para `conferido`, com resultado `[4,13,23,28,41,58]`. Resultado derivado
  preservado no destino. As demais 13 tabelas têm checksums iguais; a tabela
  `boloes` também coincide ao excluir esses dois campos desse único registro.
- Publicação `c262dacd-78a2-47cc-b3ee-15f0f580c35d`; bundle público
  `/assets/index-DVjvF_rV.js` verificado com a referência do destino.
- Teste no endereço público confirmou cadastro sem confirmação, login em outra
  sessão, perfil, dois créditos iniciais, painel administrativo, bolões e capas.
  Requisições do navegador usaram somente o destino; 19 chamadas às funções do
  servidor responderam sem erro. Conta e registros sintéticos foram removidos.
- Conferência após limpeza: 5 contas, 5 perfis, 1 permissão, 4 transações,
  14 bolões, 183 reservas e 18 capas. Nenhuma compra ou cobrança real executada.
  Configuração existente de pagamentos preservada; fluxo financeiro completo
  não foi exercitado nesta migração.
- Usuários devem atualizar a página e entrar com o mesmo e-mail e senha; sessões
  da origem não são transportadas. O cadastro continua sem confirmação de e-mail.
- Banco antigo e backup preservados. Não reativar gravações na origem sem
  reconciliar as alterações recebidas pelo destino após a publicação. O script
  `reativar-gravacoes-origem.sql` destina-se apenas a retorno planejado.
