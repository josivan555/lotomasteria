-- Inserir alguns bolões de teste para o histórico e para a home
-- Bolão de Quina Encerrado (passado)
INSERT INTO public.boloes (
    loteria_id, 
    criador_id, 
    nome, 
    concurso_numero, 
    data_sorteio, 
    horario_sorteio, 
    prazo_vendas, 
    horario_encerramento,
    total_jogos, 
    total_cotas, 
    valor_cota, 
    valor_total, 
    premio_estimado, 
    status, 
    game_snapshot, 
    resultado_oficial
) VALUES (
    'quina', 
    (SELECT id FROM auth.users WHERE email = 'informaticadojosy@gmail.com' LIMIT 1), 
    'Mega Quina das Estrelas', 
    6500, 
    '2026-08-12', 
    '20:00:00', 
    '2026-08-12 19:00:00+00', 
    '19:00:00',
    5, 
    100, 
    10.00, 
    1000.00, 
    5000000.00, 
    'sorteado', 
    '[{"dezenas": [10, 25, 34, 42, 58], "score": 85}, {"dezenas": [5, 12, 33, 44, 55], "score": 70}, {"dezenas": [11, 22, 33, 44, 55], "score": 60}, {"dezenas": [1, 2, 3, 4, 5], "score": 40}, {"dezenas": [10, 20, 30, 40, 50], "score": 90}]'::jsonb,
    ARRAY[10, 25, 33, 42, 55]
);

-- Bolão de Lotofácil Ativo
INSERT INTO public.boloes (
    loteria_id, 
    criador_id, 
    nome, 
    concurso_numero, 
    data_sorteio, 
    horario_sorteio, 
    prazo_vendas, 
    horario_encerramento,
    total_jogos, 
    total_cotas, 
    valor_cota, 
    valor_total, 
    premio_estimado, 
    status, 
    game_snapshot
) VALUES (
    'lotofacil', 
    (SELECT id FROM auth.users WHERE email = 'informaticadojosy@gmail.com' LIMIT 1), 
    'Loto IA Expert', 
    3150, 
    '2026-08-20', 
    '20:00:00', 
    '2026-08-20 19:00:00+00', 
    '19:00:00',
    10, 
    50, 
    25.00, 
    1250.00, 
    1500000.00, 
    'em_vendas', 
    '[{"dezenas": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "score": 95}]'::jsonb
);

-- Bolão de Mega-Sena Ativo
INSERT INTO public.boloes (
    loteria_id, 
    criador_id, 
    nome, 
    concurso_numero, 
    data_sorteio, 
    horario_sorteio, 
    prazo_vendas, 
    horario_encerramento,
    total_jogos, 
    total_cotas, 
    valor_cota, 
    valor_total, 
    premio_estimado, 
    status, 
    game_snapshot
) VALUES (
    'megasena', 
    (SELECT id FROM auth.users WHERE email = 'informaticadojosy@gmail.com' LIMIT 1), 
    'Mega IA Milionária', 
    2760, 
    '2026-08-22', 
    '20:00:00', 
    '2026-08-22 19:00:00+00', 
    '19:00:00',
    3, 
    20, 
    50.00, 
    1000.00, 
    45000000.00, 
    'em_vendas', 
    '[{"dezenas": [5, 12, 28, 33, 45, 59], "score": 88}]'::jsonb
);