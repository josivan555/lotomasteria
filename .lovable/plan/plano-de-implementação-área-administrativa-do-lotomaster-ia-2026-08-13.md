# Plano de Implementação: Área Administrativa do LotoMaster IA

Este plano descreve a criação de uma seção administrativa restrita para gestão de bolões e usuários.

## Alterações Sugeridas

### Frontend e Rotas

- **Nova Rota:** Criar `src/routes/_authenticated/admin/route.tsx` para gerenciar o layout e proteção da área admin (apenas para usuários com role 'admin').
- **Página Principal Admin:** Criar `src/routes/_authenticated/admin/index.tsx` com visão geral de bolões e usuários.
- **Navegação:** Adicionar link "Admin" no cabeçalho (AuthedLayout) visível apenas para administradores.
- **Interface de Bolões:** Listagem detalhada de todos os bolões, status de vendas, e lista de participantes por bolão.

### Lógica de Servidor (Functions)

- **Novas Funções em `src/lib/admin.functions.ts`:**
    - `listarTodosBoloes`: Para visualização administrativa completa.
    - `listarUsuarios`: Para gestão de usuários (perfis e créditos).
    - `atualizarStatusBolao`: Para mudar status (ex: de 'em_vendas' para 'sorteado').
    - `listarParticipantesBolao`: Para ver quem comprou cotas de um bolão específico.

### Segurança e RLS

- A proteção será feita via TanStack Router (`beforeLoad`) e validada em todas as novas funções de servidor via `public.has_role(auth.uid(), 'admin')`.

## Detalhes Técnicos

- Utilização da função `meuPerfil` já existente para identificar o status de admin no cliente.
- Separação clara de responsabilidades: `boloes.functions.ts` para operações públicas/gerais e `admin.functions.ts` para operações privilegiadas.

---
**Nota:** A funcionalidade de criar bolões já existe no Gerador, mas a nova área admin permitirá a gestão contínua desses bolões após a criação.
