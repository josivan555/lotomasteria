# Plan - Sistema de Bolões LotoMaster IA

Implementação do sistema completo de bolões, integrado à estrutura atual de geração de jogos, permitindo a criação, venda e conferência de cotas.

## Banco de Dados

Criação das tabelas para gestão de bolões, participantes e transações, com RLS e GRANTs apropriados.

```sql
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
    status text NOT NULL DEFAULT 'rascunho', -- rascunho, publicado, em_vendas, esgotado, encerrado, sorteado, conferido, cancelado
    game_snapshot jsonb NOT NULL, -- Cópia congelada dos jogos no momento da criação
    resultado_oficial integer[], -- Dezenas sorteadas (após o sorteio)
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
    status text NOT NULL DEFAULT 'reservado', -- reservado, pago, expirado, cancelado
    codigo_referencia text UNIQUE NOT NULL, -- Ex: RES-YYYYMMDD-XXXX
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    payment_id text, -- ID do Mercado Pago
    payment_method text
);

-- Habilitar RLS
ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolao_participantes ENABLE ROW LEVEL SECURITY;

-- Políticas: Qualquer um lê bolões 'em_vendas' ou 'encerrados'. Apenas admin cria/edita.
CREATE POLICY "Leitura pública de bolões ativos" ON public.boloes FOR SELECT USING (status IN ('publicado', 'em_vendas', 'esgotado', 'encerrado', 'sorteado', 'conferido'));
CREATE POLICY "Admins gerenciam bolões" ON public.boloes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Políticas participantes: Usuário vê suas próprias reservas/compras (baseado no ID ou celular/sessão se não logado, mas aqui seguiremos a regra de privacidade).
-- Admin vê tudo.
CREATE POLICY "Admins gerenciam participantes" ON public.bolao_participantes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.boloes TO anon, authenticated;
GRANT ALL ON public.boloes TO service_role;
GRANT SELECT, INSERT ON public.bolao_participantes TO anon, authenticated;
GRANT ALL ON public.bolao_participantes TO service_role;
```

## Backend (Server Functions)

- `criarBolao`: Função administrativa para converter jogos selecionados em um bolão (com snapshot).
- `listarBoloesPublicos`: Lista bolões para a página inicial (filtrados por status).
- `reservarCota`: Cria registro em `bolao_participantes` com prazo de expiração.
- `confirmarPagamentoBolao`: Handler para webhook do Mercado Pago (atualiza status e cota).
- `conferirBolaoIA`: Executa a lógica de comparação entre o snapshot e o resultado oficial.

## Frontend

- **Aba Meus Jogos**: Adição de checkboxes e botão "🎟️ Gerar Bolão" (visível apenas para admin).
- **Modal Gerar Bolão**: Formulário completo com cálculos automáticos de valor total.
- **Área Pública (`/boloes`)**: Nova rota pública com cards coloridos (estilo Mega, Loto, Quina).
- **Detalhe do Bolão (`/bolao/$slug`)**: Página com info do concurso, botão de reserva/compra e visualização dos jogos.
- **Painel Administrativo de Bolões**: Dashboard para gerenciar vendas, participantes (com link WhatsApp) e registrar resultados.

## Integrações

- **Mercado Pago**: Checkout transparente ou Pro para compra de cotas.
- **PDF**: Geração de lista de jogos do bolão e relatório de conferência.
- **WhatsApp**: Links dinâmicos para cobrança de reservas e compartilhamento de resultados.
