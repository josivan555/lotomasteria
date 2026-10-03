import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarTodosBoloes, listarUsuarios, atualizarStatusBolao, excluirBolao, atualizarBolao } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Ticket, ShieldCheck, Clock, CheckCircle2, AlertCircle, Trash2, Edit2, Check, X, Search, UserCircle2, Layers, History } from "lucide-react";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { toast } from "sonner";
import { useRouter, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AdminParticipantesDialog } from "@/components/admin-participantes-dialog";
import { AdminAdicionarParticipante } from "@/components/admin-adicionar-participante";
import { supabase } from "@/integrations/supabase/client";
import { capaUrl, capaMediaType } from "@/lib/capa";

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
  const [participantesBolaoId, setParticipantesBolaoId] = useState<string | null>(null);
  const [editBolaoForm, setEditBolaoForm] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [abaBoloes, setAbaBoloes] = useState<"ativos" | "historico">("ativos");

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

  // Bolões conferidos saem da lista principal e ficam disponíveis no Histórico.
  const bolõesVisiveis = useMemo(() => {
    return filteredBoloes.filter((b: any) =>
      abaBoloes === "historico" ? b.status === "conferido" : b.status !== "conferido"
    );
  }, [filteredBoloes, abaBoloes]);

  const totalHistorico = useMemo(
    () => boloes.filter((b: any) => b.status === "conferido").length,
    [boloes]
  );

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u: any) => 
      (u.username || "").toLowerCase().includes(searchUser.toLowerCase()) ||
      u.id.toLowerCase().includes(searchUser.toLowerCase())
    );
  }, [usuarios, searchUser]);

  return (
    <div className="space-y-6 px-4 py-6 md:px-0">
      <AdminParticipantesDialog bolaoId={participantesBolaoId} onClose={() => setParticipantesBolaoId(null)} />
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <div className="flex gap-2">
              <Button asChild size="sm" className="gap-2 text-[10px] font-black uppercase tracking-wider">
                <Link to="/admin/combo">
                  <Layers className="h-3.5 w-3.5" />
                  Criar Combo
                </Link>
              </Button>
            </div>

            <div className="relative flex-1">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar bolão por nome ou concurso..." 
                className="pl-10 bg-background/40 border-border/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-[10px] font-black uppercase tracking-wider border-primary/40 hover:bg-primary/10"
              onClick={async () => {
                const loadingToast = toast.loading("Atualizando resultados oficiais...");
                try {
                  const res = await fetch('/api/public/atualizar-resultados');
                  const data = await res.json();
                  if (res.ok) {
                    toast.success(data.message || "Resultados atualizados!");
                    router.invalidate();
                  } else {
                    toast.error(data.error || "Erro ao atualizar resultados.");
                  }
                } catch (err) {
                  toast.error("Erro na requisição.");
                } finally {
                  toast.dismiss(loadingToast);
                }
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Sincronizar Resultados
            </Button>
          </div>

          <AdminAdicionarParticipante boloes={boloes} />

          <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
            <button
              type="button"
              onClick={() => setAbaBoloes("ativos")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${abaBoloes === "ativos" ? "bg-primary text-primary-foreground shadow-sm" : "bg-background/40 text-muted-foreground hover:bg-muted/50"}`}
            >
              <Ticket className="h-3.5 w-3.5" />
              Bolões Ativos
              <span className="rounded-full bg-background/30 px-1.5 py-0.5 text-[9px]">
                {boloes.filter((b: any) => b.status !== "conferido").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAbaBoloes("historico")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${abaBoloes === "historico" ? "bg-primary text-primary-foreground shadow-sm" : "bg-background/40 text-muted-foreground hover:bg-muted/50"}`}
            >
              <History className="h-3.5 w-3.5" />
              Histórico
              <span className="rounded-full bg-background/30 px-1.5 py-0.5 text-[9px]">
                {totalHistorico}
              </span>
            </button>

            {abaBoloes === "historico" && (
              <span className="ml-1 text-[10px] font-bold text-muted-foreground">
                Bolões com status <strong className="text-foreground">Conferido</strong>
              </span>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden mt-4">
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
                  ) : bolõesVisiveis.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs uppercase tracking-widest font-black">Nenhum bolão encontrado.</td></tr>
                  ) : bolõesVisiveis.map((b: any) => {
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

                              <div className="space-y-1.5 pt-1 border-t border-border/30">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground uppercase font-black w-16 shrink-0">Sorteio</span>
                                  <Input 
                                    type="date"
                                    value={editBolaoForm.data_sorteio} 
                                    onChange={e => setEditBolaoForm({...editBolaoForm, data_sorteio: e.target.value})}
                                    className="h-7 text-xs"
                                  />
                                  <Input 
                                    type="time"
                                    value={editBolaoForm.horario_sorteio} 
                                    onChange={e => setEditBolaoForm({...editBolaoForm, horario_sorteio: e.target.value})}
                                    className="h-7 text-xs w-24"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground uppercase font-black w-16 shrink-0">Vendas até</span>
                                  <Input 
                                    type="date"
                                    value={editBolaoForm.prazo_vendas} 
                                    onChange={e => setEditBolaoForm({...editBolaoForm, prazo_vendas: e.target.value})}
                                    className="h-7 text-xs"
                                  />
                                  <Input 
                                    type="time"
                                    value={editBolaoForm.horario_encerramento} 
                                    onChange={e => setEditBolaoForm({...editBolaoForm, horario_encerramento: e.target.value})}
                                    className="h-7 text-xs w-24"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground uppercase font-black w-16 shrink-0">Prêmio R$</span>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    value={editBolaoForm.premio_estimado ?? ""} 
                                    onChange={e => setEditBolaoForm({...editBolaoForm, premio_estimado: e.target.value ? parseFloat(e.target.value) : undefined})}
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                                  <span className="text-[10px] text-muted-foreground uppercase font-black w-16 shrink-0">Mídia</span>

                                  {editBolaoForm.capa_url && (
                                    capaMediaType(editBolaoForm.capa_url) === "video" ? (
                                      <video
                                        src={capaUrl(editBolaoForm.capa_url)!}
                                        className="h-12 w-24 rounded object-cover border border-border bg-black"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                    ) : (
                                      <img
                                        src={capaUrl(editBolaoForm.capa_url)!}
                                        alt="Mídia da capa"
                                        className="h-12 w-24 rounded object-cover border border-border"
                                      />
                                    )
                                  )}

                                  <select
                                    className="h-8 rounded border border-border bg-background px-2 text-[11px] font-bold"
                                    value={editBolaoForm.capa_media_type || capaMediaType(editBolaoForm.capa_url)}
                                    onChange={e => setEditBolaoForm({ ...editBolaoForm, capa_media_type: e.target.value })}
                                  >
                                    <option value="image">Imagem</option>
                                    <option value="gif">GIF animado</option>
                                    <option value="video">Vídeo</option>
                                  </select>

                                  <label className="cursor-pointer rounded border border-primary/40 bg-primary/5 px-3 py-1.5 text-[11px] font-black hover:bg-primary/10">
                                    {editBolaoForm.capa_url ? "Trocar mídia" : "Enviar mídia"}
                                    <input
                                      type="file"
                                      accept={
                                        (editBolaoForm.capa_media_type || capaMediaType(editBolaoForm.capa_url)) === "video"
                                          ? "video/mp4,video/webm"
                                          : (editBolaoForm.capa_media_type || capaMediaType(editBolaoForm.capa_url)) === "gif"
                                            ? "image/gif"
                                            : "image/png,image/jpeg,image/webp"
                                      }
                                      className="hidden"
                                      onChange={async e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const mediaType = editBolaoForm.capa_media_type || capaMediaType(editBolaoForm.capa_url);

                                        if (mediaType === "video") {
                                          if (!/^video\/(mp4|webm)$/.test(file.type)) {
                                            toast.error("Selecione um vídeo MP4 ou WebM.");
                                            return;
                                          }
                                          if (file.size > 30 * 1024 * 1024) {
                                            toast.error("O vídeo deve ter até 30MB.");
                                            return;
                                          }
                                        } else if (mediaType === "gif") {
                                          if (file.type !== "image/gif") {
                                            toast.error("Selecione um arquivo GIF.");
                                            return;
                                          }
                                          if (file.size > 10 * 1024 * 1024) {
                                            toast.error("O GIF deve ter até 10MB.");
                                            return;
                                          }
                                        } else {
                                          if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
                                            toast.error("Selecione JPG, PNG ou WEBP.");
                                            return;
                                          }
                                          if (file.size > 5 * 1024 * 1024) {
                                            toast.error("A imagem deve ter até 5MB.");
                                            return;
                                          }
                                        }

                                        // Imagem continua com a otimização existente para compartilhamento.
                                        if (mediaType === "image") {
                                          const dim = await new Promise<{ w: number; h: number } | null>(resolve => {
                                            const url = URL.createObjectURL(file);
                                            const img = new Image();
                                            img.onload = () => {
                                              resolve({ w: img.naturalWidth, h: img.naturalHeight });
                                              URL.revokeObjectURL(url);
                                            };
                                            img.onerror = () => {
                                              resolve(null);
                                              URL.revokeObjectURL(url);
                                            };
                                            img.src = url;
                                          });

                                          if (dim && dim.w < 600) {
                                            toast.error(`Arte pequena demais (${dim.w}px de largura). Envie pelo menos 1200 × 630 px.`);
                                            return;
                                          }
                                          if (dim && (dim.w / dim.h < 1.25 || dim.w / dim.h > 3)) {
                                            toast.warning("Formato fora do ideal: a arte vai ser recortada nas bordas. O recomendado é 1200 × 630 px.");
                                          }

                                          const t = toast.loading("Otimizando e enviando arte...");
                                          const blob = await new Promise<Blob | null>(resolve => {
                                            const url = URL.createObjectURL(file);
                                            const img = new Image();
                                            img.onload = () => {
                                              const scale = Math.min(1, 1200 / img.naturalWidth);
                                              const canvas = document.createElement("canvas");
                                              canvas.width = Math.round(img.naturalWidth * scale);
                                              canvas.height = Math.round(img.naturalHeight * scale);
                                              const ctx = canvas.getContext("2d")!;
                                              ctx.fillStyle = "#000";
                                              ctx.fillRect(0, 0, canvas.width, canvas.height);
                                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                              URL.revokeObjectURL(url);
                                              const tryQ = (q: number) => canvas.toBlob(bl => {
                                                if (bl && bl.size > 280 * 1024 && q > 0.5) tryQ(q - 0.1);
                                                else resolve(bl);
                                              }, "image/jpeg", q);
                                              tryQ(0.85);
                                            };
                                            img.onerror = () => {
                                              URL.revokeObjectURL(url);
                                              resolve(null);
                                            };
                                            img.src = url;
                                          });

                                          if (!blob) {
                                            toast.error("Não foi possível processar a imagem.");
                                            return;
                                          }

                                          const path = `${b.id}/${Date.now()}.jpg`;
                                          const { error } = await supabase.storage.from("bolao-capas").upload(path, blob, {
                                            contentType: "image/jpeg",
                                          });

                                          if (error) {
                                            toast.error("Erro ao enviar: " + error.message);
                                            return;
                                          }

                                          setEditBolaoForm((f: any) => ({ ...f, capa_url: path, capa_media_type: "image" }));
                                          toast.success("Imagem enviada. Clique em salvar.");
                                          return;
                                        }

                                        // GIF e vídeo são enviados no formato original para preservar animação/reprodução.
                                        const extension = mediaType === "gif"
                                          ? "gif"
                                          : file.type === "video/webm" ? "webm" : "mp4";
                                        const path = `${b.id}/${Date.now()}.${extension}`;
                                        const t = toast.loading(mediaType === "gif" ? "Enviando GIF..." : "Enviando vídeo...");
                                        const { error } = await supabase.storage.from("bolao-capas").upload(path, file, {
                                          contentType: file.type,
                                        });
                                        toast.dismiss(t);

                                        if (error) {
                                          toast.error("Erro ao enviar: " + error.message);
                                          return;
                                        }

                                        setEditBolaoForm((f: any) => ({ ...f, capa_url: path, capa_media_type: mediaType }));
                                        toast.success(mediaType === "gif" ? "GIF enviado. Clique em salvar." : "Vídeo enviado. Clique em salvar.");
                                      }}
                                    />
                                  </label>

                                  {editBolaoForm.capa_url && (
                                    <button
                                      type="button"
                                      className="text-[11px] font-bold text-destructive"
                                      onClick={() => setEditBolaoForm({ ...editBolaoForm, capa_url: null, capa_media_type: "image" })}
                                    >
                                      Remover
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] leading-tight text-muted-foreground sm:col-span-2">
                                  <span className="font-black text-foreground">Imagem:</span> JPG/PNG/WEBP até 5MB ·
                                  <span className="font-black text-foreground"> GIF:</span> até 10MB ·
                                  <span className="font-black text-foreground"> Vídeo:</span> MP4/WebM até 30MB.
                                  A mídia é exibida automaticamente em loop na área superior do bolão.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-black text-foreground uppercase tracking-tight">{b.nome}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Concurso {b.concurso_numero}</span>
                              {b.data_sorteio && (
                                <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
                                  Sorteio: {String(b.data_sorteio).slice(0, 10).split("-").reverse().join("/")}
                                </span>
                              )}
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
                                  title="Ver participantes"
                                  aria-label="Ver participantes"
                                  onClick={() => setParticipantesBolaoId(b.id)}
                                >
                                  <Users className="h-4 w-4" />
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
                                      premio_estimado: b.premio_estimado,
                                      data_sorteio: b.data_sorteio,
                                      horario_sorteio: String(b.horario_sorteio ?? "").slice(0, 5),
                                      prazo_vendas: String(b.prazo_vendas ?? "").slice(0, 10),
                                      horario_encerramento: String(b.horario_encerramento ?? "").slice(0, 5),
                                      capa_url: (b as any).capa_url ?? null,
                                      capa_media_type: capaMediaType((b as any).capa_url),
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
