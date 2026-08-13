import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarTodosBoloes, listarUsuarios, atualizarStatusBolao } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Ticket, Settings, ShieldCheck, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const router = useRouter();
  const getBoloes = useServerFn(listarTodosBoloes);
  const getUsuarios = useServerFn(listarUsuarios);
  const updateStatus = useServerFn(atualizarStatusBolao);

  const { data: boloes = [], isLoading: loadingBoloes } = useQuery({
    queryKey: ["admin-boloes"],
    queryFn: () => getBoloes(),
  });

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => getUsuarios(),
  });

  const mutationStatus = useMutation({
    mutationFn: (data: { id: string; status: any }) => updateStatus({ data }),
    onSuccess: () => {
      toast.success("Status atualizado com sucesso");
      router.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    em_vendas: { label: "Em Vendas", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: Clock },
    esgotado: { label: "Esgotado", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
    encerrado: { label: "Encerrado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Ticket },
    sorteado: { label: "Sorteado", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Ticket },
    conferido: { label: "Conferido", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: CheckCircle2 },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/40 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Bolões</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boloes.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuarios.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="boloes" className="w-full">
        <TabsList className="bg-background/40 border border-border/40 p-1">
          <TabsTrigger value="boloes" className="gap-2">
            <Ticket className="h-4 w-4" /> Bolões
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boloes" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3">Bolão</th>
                    <th className="px-4 py-3">Loteria</th>
                    <th className="px-4 py-3">Vendas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loadingBoloes ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando bolões...</td></tr>
                  ) : boloes.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum bolão criado.</td></tr>
                  ) : boloes.map((b: any) => {
                    const cfg = LOTERIAS[b.loteria_id as LoteriaId];
                    const st = statusMap[b.status] || statusMap.encerrado;
                    const StatusIcon = st.icon;

                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold">{b.nome}</div>
                          <div className="text-xs text-muted-foreground">Concurso {b.concurso_numero}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.cor }} />
                            {cfg.nome}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{b.cotas_compradas} / {b.total_cotas}</span>
                            <div className="w-24 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${(b.cotas_compradas / b.total_cotas) * 100}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={`gap-1 ${st.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {st.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right space-x-2">
                          <select 
                            className="bg-background border border-border/60 rounded px-2 py-1 text-xs outline-none"
                            value={b.status}
                            onChange={(e) => mutationStatus.mutate({ id: b.id, status: e.target.value as any })}
                          >
                            {Object.keys(statusMap).map(s => (
                              <option key={s} value={s}>{statusMap[s].label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Créditos</th>
                    <th className="px-4 py-3">Nível</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loadingUsuarios ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando usuários...</td></tr>
                  ) : usuarios.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold">{u.username || "Usuário"}</div>
                        <div className="text-xs text-muted-foreground">{u.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-4 font-mono font-medium">
                        {u.credits?.toFixed(1) || "0.0"}
                      </td>
                      <td className="px-4 py-4">
                        {u.roles.includes('admin') ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">User</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm">Gerenciar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
