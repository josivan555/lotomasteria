-- public.boloes: Armazena as informações principais do bolão
CREATE TABLE public.boloes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loteria_id text REFERENCES public.loterias(id) NOT NULL,
    criador_id uuid REFERENCES auth.users(id) NOT NULL,
    nome text NOT NULL,
    concurso_numero integer NOT NULL,
    data_sorteio date NOT NULL,
    horario_sorteio time NOT NULL,
    prazo_vendas timestamp with time zone NOT NULL,
    total_jogos integer NOT NULL,
    total_cotas integer NOT NULL,
    valor_cota numeric(10,2) NOT NULL,
    valor_total numeric(12,2) NOT NULL,
    premio_estimado numeric(15,2),
    status text NOT NULL DEFAULT 'rascunho',
    game_snapshot jsonb NOT NULL,
    resultado_oficial integer[],
    created_at timestamp with time zone DEFAULT now()
);

-- public.bolao_participantes: Controle de reservas e compras de cotas
CREATE TABLE public.bolao_participantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bolao_id uuid REFERENCES public.boloes(id) ON DELETE CASCADE NOT NULL,
    nome_completo text NOT NULL,
    celular text NOT NULL,
    quantidade_cotas integer NOT NULL,
    valor_total numeric(12,2) NOT NULL,
    status text NOT NULL DEFAULT 'reservado',
    codigo_referencia text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    payment_id text,
    payment_method text
);

-- Habilitar RLS
ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolao_participantes ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Leitura pública de bolões ativos" ON public.boloes FOR SELECT USING (status IN ('publicado', 'em_vendas', 'esgotado', 'encerrado', 'sorteado', 'conferido'));
CREATE POLICY "Admins gerenciam bolões" ON public.boloes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam participantes" ON public.bolao_participantes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Inserção pública de participantes" ON public.bolao_participantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Leitura de próprias reservas por código" ON public.bolao_participantes FOR SELECT USING (true);

-- Grants
GRANT SELECT ON public.boloes TO anon, authenticated;
GRANT ALL ON public.boloes TO service_role;
GRANT SELECT, INSERT ON public.bolao_participantes TO anon, authenticated;
GRANT ALL ON public.bolao_participantes TO service_role;
