-- LotoMaster: auditoria somente leitura, executar na origem e no destino.
-- Nao importa, altera ou exclui dados. Nao retorna dados pessoais ou credenciais.
BEGIN TRANSACTION READ ONLY;

-- 1. Contagem exata das tabelas esperadas pelo codigo.
SELECT 'bolao_participantes' AS tabela, count(*) AS registros FROM public.bolao_participantes
UNION ALL
SELECT 'boloes' AS tabela, count(*) AS registros FROM public.boloes
UNION ALL
SELECT 'comentarios_contato' AS tabela, count(*) AS registros FROM public.comentarios_contato
UNION ALL
SELECT 'concursos' AS tabela, count(*) AS registros FROM public.concursos
UNION ALL
SELECT 'credit_orders' AS tabela, count(*) AS registros FROM public.credit_orders
UNION ALL
SELECT 'credit_transactions' AS tabela, count(*) AS registros FROM public.credit_transactions
UNION ALL
SELECT 'jogos_salvos' AS tabela, count(*) AS registros FROM public.jogos_salvos
UNION ALL
SELECT 'loterias' AS tabela, count(*) AS registros FROM public.loterias
UNION ALL
SELECT 'notifications' AS tabela, count(*) AS registros FROM public.notifications
UNION ALL
SELECT 'profiles' AS tabela, count(*) AS registros FROM public.profiles
UNION ALL
SELECT 'user_credits' AS tabela, count(*) AS registros FROM public.user_credits
UNION ALL
SELECT 'user_roles' AS tabela, count(*) AS registros FROM public.user_roles
ORDER BY tabela;

-- 2. Identidades e privilegios administrativos devem manter os mesmos UUIDs.
SELECT 'auth.users' AS tabela, count(*) AS registros FROM auth.users
UNION ALL SELECT 'auth.identities', count(*) FROM auth.identities;
SELECT role::text, count(*) AS registros FROM public.user_roles GROUP BY role;

-- 3. Totais financeiros e quantidade de cotas por status.
SELECT status, count(*) AS reservas, sum(quantidade_cotas) AS cotas,
       sum(valor_total) AS valor_total
FROM public.bolao_participantes GROUP BY status ORDER BY status;
SELECT status, count(*) AS boloes, sum(total_cotas) AS cotas,
       sum(valor_total) AS valor_total
FROM public.boloes GROUP BY status ORDER BY status;

-- 4. Estrutura de seguranca: comparar origem e destino, sem desabilitar RLS.
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
SELECT routine_schema, routine_name, data_type FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;
SELECT event_object_schema, event_object_table, trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'auth')
ORDER BY event_object_schema, event_object_table, trigger_name;

-- 5. Metadados nao substituem os arquivos: copiar os binarios separadamente.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets ORDER BY id;
SELECT bucket_id, count(*) AS objetos FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;
COMMIT;
