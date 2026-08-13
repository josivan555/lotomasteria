import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarTodosBoloes, listarUsuarios, atualizarStatusBolao, excluirBolao, atualizarBolao } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Ticket, ShieldCheck, Clock, CheckCircle2, AlertCircle, Trash2, Edit2, Check, X, Search, UserCircle2 } from "lucide-react";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { toast } from "sonner";
import { useRouter, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const router = useRouter();
  const getBoloes = useServerFn(listarTodosBoloes);
  const getUsuarios = useServerFn(listarUsuarios);
  const updateStatus = useServerFn(atualizarStatusBolao);
  const removeBolao = useServerFn(excluirBolao);
  const updateBolao = useServerFn(atualizarBolao);

  const [editingBolaoId, setEditingBolaoId] = useState<string | null>(null);
  const [editBolaoForm, setEditBolaoForm] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchUser, setSearchUser] = useState("");

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

  const mutationExcluir = useMutation({
    mutationFn: (id: string) => removeBolao({ data: { id } }),
    onSuccess: () => {
      toast.success("Bolão excluído com sucesso");
      router.invalidate();
    },
    onError: (e) => toast.error("Erro ao excluir: " + e.message),
  });

  const mutationUpdateBolao = useMutation({
    mutationFn: (data: any) => updateBolao({ data }),
    onSuccess: () => {
      toast.success("Bolão atualizado com sucesso");
      setEditingBolaoId(null);
      router.invalidate();
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
  });

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    em_vendas: { label: "Em Vendas", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: Clock },
    esgotado: { label: "Esgotado", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
    encerrado: { label: "Encerrado", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Ticket },
    sorteado: { label: "Sorteado", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Ticket },
    conferido: { label: "Conferido", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: CheckCircle2 },
  };

  const filteredBoloes = useMemo(() => {
    return boloes.filter((b: any) => 
      b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.concurso_numero.toString().includes(searchTerm)
    );
  }, [boloes, searchTerm]);

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u: any) => 
      (u.username || "").toLowerCase().includes(searchUser.toLowerCase()) ||
      u.id.toLowerCase().includes(searchUser.toLowerCase())
    );
  }, [usuarios, searchUser]);

  return (
    <div className="space-y-6 px-4 py-6 md:px-0">
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar bolão por nome ou concurso..." 
                className="pl-10 bg-background/40 border-border/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

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
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs uppercase tracking-widest font-black">Carregando bolões...</td></tr>
                  ) : filteredBoloes.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs uppercase tracking-widest font-black">Nenhum bolão encontrado.</td></tr>
                  ) : filteredBoloes.map((b: any) => {
                    const cfg = LOTERIAS[b.loteria_id as LoteriaId] || LOTERIAS.lotofacil;
                    const st = statusMap[b.status] || statusMap.encerrado;
                    const StatusIcon = st.icon;
                    const isEditing = editingBolaoId === b.id;

                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <div className="space-y-2 max-w-[200px]">
                              <Input 
                                value={editBolaoForm.nome} 
                                onChange={e => setEditBolaoForm({...editBolaoForm, nome: e.target.value})}
                                className="h-7 text-xs font-bold"
                              />

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-black">Conc.</span>
                                <Input 
                                  type="number"
                                  value={editBolaoForm.concurso_numero} 
                                  onChange={e => setEditBolaoForm({...editBolaoForm, concurso_numero: parseInt(e.target.value)})}
                                  className="h-7 text-xs w-20"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-black text-foreground uppercase tracking-tight">{b.nome}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Concurso {b.concurso_numero}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="ball h-5 w-5 text-[9px] font-black" style={{ backgroundColor: cfg.cor }}>{cfg.nome[0]}</div>
                            <span className="text-[10px] font-black uppercase tracking-wider">{cfg.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input 
                                  type="number"
                                  value={editBolaoForm.total_cotas} 
                                  onChange={e => setEditBolaoForm({...editBolaoForm, total_cotas: parseInt(e.target.value)})}
                                  className="h-7 text-xs w-16"
                                />
                                <span className="text-[10px] text-muted-foreground font-black">COTAS</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black">{b.cotas_compradas} / {b.total_cotas}</span>
                                  <span className="text-[9px] text-muted-foreground font-bold">{Math.round((b.cotas_compradas / b.total_cotas) * 100)}%</span>
                                </div>
                                <div className="w-24 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                                    style={{ width: `${(b.cotas_compradas / b.total_cotas) * 100}%` }} 
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground font-black">R$</span>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  value={editBolaoForm.valor_cota} 
                                  onChange={e => setEditBolaoForm({...editBolaoForm, valor_cota: parseFloat(e.target.value)})}
                                  className="h-7 text-xs w-20"
                                />
                              </div>
                            ) : (
                              <Badge variant="outline" className={`gap-1 h-6 text-[9px] font-black uppercase tracking-wider ${st.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {st.label}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                                  onClick={() => mutationUpdateBolao.mutate({ id: b.id, ...editBolaoForm })}
                                  disabled={mutationUpdateBolao.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                  onClick={() => setEditingBolaoId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <select 
                                  className="bg-background/60 border border-border/40 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider outline-none h-8 cursor-pointer hover:border-primary/40 transition-colors"
                                  value={b.status}
                                  onChange={(e) => mutationStatus.mutate({ id: b.id, status: e.target.value as any })}
                                >
                                  {Object.keys(statusMap).map(s => (
                                    <option key={s} value={s}>{statusMap[s].label.toUpperCase()}</option>
                                  ))}
                                </select>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  asChild
                                >
                                  <Link to="/boloes/$bolaoId" params={{ bolaoId: b.id }} search={{ tab: 'participantes' }}>
                                    <Users className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                  onClick={() => {
                                    setEditingBolaoId(b.id);
                                    setEditBolaoForm({
                                      nome: b.nome,
                                      concurso_numero: b.concurso_numero,
                                      total_cotas: b.total_cotas,
                                      valor_cota: b.valor_cota,
                                      premio_estimado: b.premio_estimado
                                    });
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Excluir o bolão "${b.nome}"? Esta ação removerá todos os participantes e não pode ser desfeita.`)) {
                                      mutationExcluir.mutate(b.id);
                                    }
                                  }}

                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuário por nome ou ID..." 
                className="pl-10 bg-background/40 border-border/40"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
          </div>

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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs uppercase tracking-widest font-black">Carregando usuários...</td></tr>
                  ) : filteredUsuarios.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs uppercase tracking-widest font-black">Nenhum usuário encontrado.</td></tr>
                  ) : filteredUsuarios.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <UserCircle2 className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-foreground uppercase tracking-tight">{u.username || "Usuário"}</span>
                            <span className="text-[9px] font-bold text-muted-foreground font-mono">{u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 font-mono font-black text-primary">
                          <span className="text-[10px] text-muted-foreground">CRÉD:</span>
                          {u.credits?.toFixed(1) || "0.0"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {u.roles.includes('admin') ? (
                          <Badge className="bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)] text-primary-foreground border-0 gap-1 h-6 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck className="h-3 w-3" /> Administrador
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-border/40 h-6 text-[9px] font-black uppercase tracking-widest">Membro</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          Gerenciar
                        </Button>
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
