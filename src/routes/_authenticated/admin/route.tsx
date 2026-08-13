import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meuPerfil } from "@/lib/loterias.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // A verificação real é feita no server fn, mas aqui fazemos uma rápida
    // antes de carregar o componente para evitar flash de UI admin para users normais.
    // Note: context.user já existe vindo do _authenticated/route.tsx
    return { user: (context as any).user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const perfilFn = useServerFn(meuPerfil);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["meu-perfil"],
    queryFn: () => perfilFn(),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm font-medium">Verificando permissões...</div>;

  if (!profile?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-3xl font-black tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gestão de bolões, usuários e configurações do sistema.</p>
      </div>
      <Outlet />
    </div>
  );
}
