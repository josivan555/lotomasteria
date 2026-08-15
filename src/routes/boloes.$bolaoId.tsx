import { createFileRoute, useParams, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterBolao, comprarCotasBolao } from "@/lib/boloes.functions";
import { listarParticipantesBolao, atualizarParticipanteBolao, excluirParticipanteBolao } from "@/lib/admin.functions";
import { meuPerfil } from "@/lib/loterias.functions";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/credits-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConferidorJogos } from "@/components/conferidor-jogos";

import { Clock, Users, Trophy, ChevronLeft, CheckCircle2, QrCode, Download, Copy, Share2, ShieldCheck, Trash2, Edit2, Check, ExternalLink } from "lucide-react";
import { useState, useRef } from "react";
import { toPng } from 'html-to-image';
import { toast } from "sonner";

export const Route = createFileRoute("/boloes/$bolaoId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "jogos",
  }),
  component: DetalheBolao,
});

function DetalheBolao() {
  const { bolaoId } = useParams({ from: "/boloes/$bolaoId" });
  const { tab } = useSearch({ from: "/boloes/$bolaoId" });
  const getBolao = useServerFn(obterBolao);
  const comprarCotas = useServerFn(comprarCotasBolao);

  const [form, setForm] = useState({ nome: "", celular: "", cotas: 1 });
  const [sucesso, setSucesso] = useState<{ ref: string; total: number; pix?: any } | null>(null);
  const comprovanteRef = useRef<HTMLDivElement>(null);

  const { data: bolao, isLoading, error } = useQuery({
    queryKey: ["bolao", bolaoId],
    queryFn: () => getBolao({ data: { id: bolaoId } }),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => comprarCotas({ data: payload }),
    onSuccess: (res) => {
      setSucesso({ ref: res.codigoReferencia, total: res.valorTotal, pix: res.pix });
      toast.success("Reserva realizada! Siga as instruções para pagamento.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-20 text-center text-muted-foreground">Carregando detalhes do bolão...</div>;
  if (error || !bolao) return <div className="p-20 text-center text-destructive">Bolão não encontrado.</div>;

  const cfg = LOTERIAS[bolao.loteria_id as LoteriaId];
  const progresso = (bolao.cotas_compradas / bolao.total_cotas) * 100;
  const agora = new Date();
  const horario = bolao.horario_encerramento || '23:59:59';
  const dataPrazo = new Date(`${bolao.prazo_vendas}T${horario}`);
  const dataSorteioObj = new Date(bolao.data_sorteio);
  const dataSorteioPassada = dataSorteioObj < new Date(new Date().setHours(0,0,0,0));
  const prazoEncerrado = agora > dataPrazo;
  const esgotado = bolao.cotas_disponiveis <= 0 || prazoEncerrado || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status) || dataSorteioPassada;

  if (sucesso) {
    const handleDownloadImage = async () => {
      if (comprovanteRef.current === null) return;
      
      const toastId = toast.loading("Gerando imagem do comprovante...");
      try {
        const dataUrl = await toPng(comprovanteRef.current, { cacheBust: true, backgroundColor: '#020817' });
        const link = document.createElement('a');
        link.download = `comprovante-${sucesso.ref}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Comprovante salvo com sucesso!", { id: toastId });
      } catch (err) {
        console.error('Erro ao gerar imagem:', err);
        toast.error("Erro ao gerar imagem. Tente tirar um print.", { id: toastId });
      }
    };

    return (
      <div className="mx-auto max-w-xl px-4 py-12 md:py-20">
        <div className="text-center mb-8">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black mb-2">Reserva Realizada!</h1>
          <p className="text-muted-foreground">
            Guarde seu comprovante de reserva.
          </p>
        </div>

        <div 
          id="comprovante-reserva" 
          ref={comprovanteRef}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl mb-8"
        >
          <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: cfg.cor }} />
          
          <div className="p-8">
            <div className="text-center border-b border-border pb-6 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter">Comprovante de Reserva</h2>
              <p className="text-xs text-muted-foreground mt-1">LotoMaster IA · Sistema Inteligente</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cliente:</span>
                <span className="font-bold">{form.nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bolão:</span>
                <span className="font-bold">{bolao.nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cotas:</span>
                <span className="font-bold">{form.cotas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-lg font-black" style={{ color: cfg.cor }}>{formatBRL(sucesso.total)}</span>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-2xl p-6 text-center border border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Código de Referência</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl font-mono font-black tracking-wider text-foreground">{sucesso.ref}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(sucesso.ref);
                    toast.success("Código copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight uppercase tracking-widest mt-4">
                  Utilize este código para confirmar seu pagamento na área de "Minhas Reservas" ou clicando no botão abaixo.
                </p>
              </div>
          </div>
          
          <div className="bg-muted/50 p-4 border-t border-border flex justify-center">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
              Emitido em {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Button 
            variant="outline" 
            className="h-12 font-bold"
            onClick={handleDownloadImage}
          >
            <Download className="mr-2 h-4 w-4" /> Salvar Foto
          </Button>
          <Button 
            variant="outline" 
            className="h-12 font-bold"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Reserva Bolão - ${bolao.nome}`,
                  text: `Minha reserva no LotoMaster IA. Código: ${sucesso.ref}`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(`Minha reserva no LotoMaster IA. Código: ${sucesso.ref}`);
                toast.success("Informações copiadas para compartilhar!");
              }
            }}
          >
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
        </div>

        <div className="space-y-4">
          <Button className="w-full h-14 text-lg font-black bg-green-600 hover:bg-green-700 text-white" asChild>
            <Link to="/boloes/pagamento/$codigo" params={{ codigo: sucesso.ref }}>
              Ir para Pagamento <ExternalLink className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">Voltar para a página inicial</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-12">
      <div className="flex justify-between items-center mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ChevronLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
      </div>
 
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: cfg.cor }} />
            <div className="p-5 sm:p-8">

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  {bolao.is_combo ? (
                    <div className="flex -space-x-3">
                      {(bolao.combo_loterias as any[])?.map((parte, i) => (
                        <div key={i} className="ball h-10 w-10 text-sm font-bold text-white border-2 border-background shadow-lg" style={{ backgroundColor: LOTERIAS[parte.loteria_id as LoteriaId].cor, zIndex: 10 - i }}>{LOTERIAS[parte.loteria_id as LoteriaId].nome[0]}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="ball h-10 w-10 text-sm font-bold text-white" style={{ backgroundColor: cfg.cor }}>{cfg.nome[0]}</div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black leading-tight">
                      {bolao.nome}
                      {bolao.is_combo && <Badge variant="secondary" className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/20">COMBO</Badge>}
                    </h1>
                    <Badge variant="secondary" className="mt-1">{bolao.is_combo ? 'Bolão Multi-Loteria' : `Concurso ${bolao.concurso_numero}`}</Badge>
                  </div>
                </div>

              </div>

              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl bg-secondary/30 p-4 border border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Estimativa de Prêmio</p>
                  <p className="text-lg font-black text-foreground">{formatBRL(bolao.premio_estimado || 0)}</p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: `${cfg.cor}10`, borderColor: `${cfg.cor}20` }}>
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: cfg.cor }}>Valor da Cota</p>
                  <p className="text-lg sm:text-xl font-black" style={{ color: cfg.cor }}>{formatBRL(bolao.valor_cota)}</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso de vendas</span>
                  <span className="font-bold">{bolao.cotas_compradas} de {bolao.total_cotas} cotas</span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${progresso}%`, backgroundColor: cfg.cor }} />
                </div>
                <p className="text-center text-xs text-muted-foreground font-medium">
                  {bolao.cotas_disponiveis} cotas ainda disponíveis para compra
                </p>
              </div>

              <div className="grid gap-3 text-sm border-t border-border pt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-4 w-4" style={{ color: cfg.cor }} />
                  <span>Sorteio: <strong>{new Date(bolao.data_sorteio).toLocaleDateString('pt-BR')} às {bolao.horario_sorteio}</strong></span>
                </div>

                {bolao.resultado_oficial && (
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 shadow-inner space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Trophy className="h-3 w-3" style={{ color: cfg.cor }} /> Resultado Oficial Concurso {bolao.concurso_numero}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {(bolao.resultado_oficial as number[]).map(n => (
                        <div key={n} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center font-black text-sm sm:text-base shadow-lg animate-in zoom-in duration-300" style={{ backgroundColor: cfg.cor }}>
                          {n.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-4 w-4" style={{ color: cfg.cor }} />
                  <span>Bolão com <strong>{bolao.total_jogos} jogos</strong> otimizados por IA</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Trophy className="h-4 w-4" style={{ color: cfg.cor }} />
                  <span>Participação proporcional por cota</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/60 p-6 bg-muted/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: cfg.cor }} /> Por que participar?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nossos bolões são gerados utilizando o motor de inteligência do LotoMaster IA. 
              Selecionamos apenas os jogos com o melhor <strong>Score Estatístico</strong>, 
              equilibrando dezenas quentes, frias e padrões de sorteio reais para maximizar suas chances.
            </p>
          </div>

          <Tabs defaultValue={tab} className="w-full">
            <TabsList className="bg-background/40 border border-border/40 p-1 w-full grid grid-cols-3">
              <TabsTrigger value="jogos">Jogos do Bolão</TabsTrigger>
              <TabsTrigger value="conferir">Conferir</TabsTrigger>
              <TabsTrigger value="participantes">Participantes</TabsTrigger>
            </TabsList>

            
            <TabsContent value="jogos" className="mt-4 space-y-4">
              {bolao.is_combo ? (
                <div className="space-y-8">
                  {(bolao.combo_loterias as any[])?.map((parte, pIdx) => {
                    const cfgP = LOTERIAS[parte.loteria_id as LoteriaId];
                    return (
                      <div key={pIdx} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={cfgP.logo} alt={cfgP.nome} className="h-5 w-auto" />
                            <span className="text-xs font-black uppercase tracking-widest">{cfgP.nome} - Concurso {parte.concurso_numero}</span>
                          </div>
                          {parte.resultado_oficial?.length > 0 && (
                            <div className="flex gap-1">
                              {parte.resultado_oficial.map((n: number) => (
                                <div key={n} className="w-5 h-5 rounded-full bg-primary text-[8px] flex items-center justify-center text-white font-bold">{n}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-3">
                          {parte.jogos?.map((jogo: any, jIdx: number) => {
                            const acertos = parte.resultado_oficial?.length > 0
                              ? jogo.dezenas.filter((n: number) => parte.resultado_oficial.includes(n)).length
                              : null;
                            return (
                              <div key={jIdx} className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-secondary/20 border border-border/20">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: `${cfgP.cor}20`, color: cfgP.cor }}>
                                  {jIdx+1}
                                </div>
                                <div className="flex flex-wrap gap-1.5 flex-1">
                                  {jogo.dezenas.map((n: number) => {
                                    const isSorteada = parte.resultado_oficial?.includes(n);
                                    return (
                                      <div 
                                        key={n} 
                                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold transition-all ${
                                          isSorteada ? "text-white scale-110 shadow-lg" : "bg-background border-border/60"
                                        }`}
                                        style={isSorteada ? { backgroundColor: cfgP.cor, borderColor: cfgP.cor } : {}}
                                      >
                                        {n.toString().padStart(2, '0')}
                                      </div>
                                    );
                                  })}
                                </div>
                                {acertos !== null && (
                                  <div className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    {acertos} ACERTOS
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Jogos Gerados por IA
                  </div>
                  <div className="p-4 space-y-3">
                    {(bolao.game_snapshot as any[])?.map((jogo, i) => {
                      const dezenasJogo = Array.isArray(jogo.dezenas) ? jogo.dezenas : [];
                      const resultado = Array.isArray(bolao.resultado_oficial) ? (bolao.resultado_oficial as number[]) : [];
                      
                      const acertos = resultado.length > 0 
                        ? dezenasJogo.filter((n: number) => resultado.includes(n)).length
                        : null;

                      return (
                        <div key={i} className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-secondary/20 border border-border/20">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: `${cfg.cor}20`, color: cfg.cor }}>
                            {i+1}
                          </div>
                          <div className="flex flex-wrap gap-1.5 flex-1">
                            {dezenasJogo.map((n: number) => {
                              const isSorteada = resultado.includes(n);
                              return (
                                <div 
                                  key={n} 
                                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold transition-all ${
                                    isSorteada 
                                      ? "text-white scale-110 shadow-lg" 
                                      : "bg-background border-border/60"
                                  }`}
                                  style={isSorteada ? { backgroundColor: cfg.cor, borderColor: cfg.cor } : {}}
                                >
                                  {n.toString().padStart(2, '0')}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            {acertos !== null && resultado.length > 0 && (
                              <div className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 animate-in zoom-in duration-500">
                                {acertos} ACERTOS
                              </div>
                            )}
                            {jogo.score && (
                              <div className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.cor}15`, color: cfg.cor }}>
                                SCORE {jogo.score}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="conferir" className="mt-4">
              {bolao.is_combo ? (
                <div className="space-y-6">
                  {(bolao.combo_loterias as any[])?.map((parte, pIdx) => (
                    <div key={pIdx} className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-tighter text-muted-foreground ml-2">
                        {LOTERIAS[parte.loteria_id as LoteriaId].nome}
                      </h3>
                      <ConferidorJogos
                        jogos={parte.jogos ?? []}
                        loteriaId={parte.loteria_id as LoteriaId}
                        resultadoOficial={Array.isArray(parte.resultado_oficial) ? parte.resultado_oficial : null}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <ConferidorJogos
                  jogos={(bolao.game_snapshot as any[]) ?? []}
                  loteriaId={bolao.loteria_id as LoteriaId}
                  resultadoOficial={Array.isArray(bolao.resultado_oficial) ? (bolao.resultado_oficial as number[]) : null}
                />
              )}
            </TabsContent>


            <TabsContent value="participantes" className="mt-4">
              <ParticipantesList bolaoId={bolao.id} bolao={bolao} />
            </TabsContent>
          </Tabs>

        </div>

        {tab !== "conferir" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Comprar Cotas</h2>
                <Button variant="link" size="sm" asChild className="font-bold p-0 h-auto" style={{ color: cfg.cor }}>
                  <Link to="/boloes/reserva">Já tenho uma reserva</Link>
                </Button>
              </div>
              
              {esgotado ? (
                <div className="bg-destructive/10 text-destructive rounded-xl p-6 text-center">
                  <p className="font-bold">{prazoEncerrado || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status) || dataSorteioPassada ? "Bolão Encerrado" : "Bolão Esgotado"}</p>
                  <p className="text-sm mt-1">
                    {prazoEncerrado || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status) || dataSorteioPassada
                      ? "Este bolão não aceita mais novas participações." 
                      : "Todas as cotas já foram vendidas. Fique atento para os próximos lançamentos!"}
                  </p>
                </div>
              ) : (
                <form 
                  className="space-y-5" 
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate({ bolaoId, ...form });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                    <Input 
                      id="nome" 
                      placeholder="Seu nome para o bolão" 
                      required 
                      className="h-12 text-base"
                      value={form.nome}
                      onChange={e => setForm({...form, nome: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="celular" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">WhatsApp / Celular</Label>
                    <Input 
                      id="celular" 
                      type="tel" 
                      placeholder="(00) 00000-0000" 
                      required 
                      className="h-12 text-base"
                      value={form.celular}
                      onChange={e => setForm({...form, celular: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cotas" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantidade de Cotas</Label>
                    <div className="flex items-center gap-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-12 w-12 rounded-xl text-xl font-bold"
                        onClick={() => setForm({...form, cotas: Math.max(1, form.cotas - 1)})}
                      >
                        -
                      </Button>
                      <Input 
                        id="cotas" 
                        type="number" 
                        readOnly 
                        className="h-12 flex-1 text-center text-lg font-black"
                        value={form.cotas}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-12 w-12 rounded-xl text-xl font-bold"
                        onClick={() => setForm({...form, cotas: Math.min(bolao.cotas_disponiveis, form.cotas + 1)})}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground font-medium">
                      Máximo disponível: {bolao.cotas_disponiveis} cotas
                    </p>
                  </div>

                  <div className="mt-8 rounded-2xl bg-secondary/50 p-6 space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal ({form.cotas}x)</span>
                      <span>{formatBRL(form.cotas * bolao.valor_cota)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black border-t border-border pt-3">
                      <span>Total a pagar</span>
                      <span style={{ color: cfg.cor }}>{formatBRL(form.cotas * bolao.valor_cota)}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-14 text-lg font-black shadow-xl text-white" 
                    style={{ backgroundColor: cfg.cor }}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Processando..." : "Confirmar e Pagar"}
                  </Button>
                  
                  <p className="text-[10px] text-center text-muted-foreground">
                    Ao clicar em confirmar, você reserva suas cotas e será direcionado para as instruções de pagamento. 
                    Sua reserva expira em 30 minutos caso o pagamento não seja confirmado.
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantesList({ bolaoId, bolao }: { bolaoId: string; bolao: any }) {
  const queryClient = useQueryClient();
  const getParticipantes = useServerFn(listarParticipantesBolao);
  const getPerfil = useServerFn(meuPerfil);
  const updatePart = useServerFn(atualizarParticipanteBolao);
  const removePart = useServerFn(excluirParticipanteBolao);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: perfil } = useQuery({
    queryKey: ["perfil"],
    queryFn: async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return { isAdmin: false };
        return await getPerfil();
      } catch (e) {
        console.warn("Failed to fetch profile (likely not authenticated):", e);
        return { isAdmin: false };
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const isAdmin = perfil?.isAdmin;

  const [page, setPage] = useState(1);
  const [allParticipantes, setAllParticipantes] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["bolao-participantes", bolaoId, page],
    queryFn: async () => {
      const res = await getParticipantes({ data: { bolaoId, page, pageSize: 20 } });
      if (page === 1) {
        setAllParticipantes(res.items);
      } else {
        setAllParticipantes(prev => [...prev, ...res.items]);
      }
      setHasMore(res.hasMore);
      return res;
    },
  });

  const mutationUpdate = useMutation({
    mutationFn: (payload: any) => updatePart({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bolao-participantes", bolaoId] });
      setPage(1); // Reset to first page to see updates
      setEditingId(null);
      toast.success("Participante atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => removePart({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bolao-participantes", bolaoId] });
      setPage(1); // Reset to first page
      toast.success("Participante removido");
    },
    onError: (e) => toast.error(e.message),
  });

  const renderItem = (p: any) => {
    const statusBadge = (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
        p.status === 'pago' 
          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      }`}>
        <div className={`h-1.5 w-1.5 rounded-full ${p.status === 'pago' ? 'bg-green-500' : 'bg-amber-500'}`} />
        {p.status === 'pago' ? 'PAGO' : 'RESERVADO'}
      </div>
    );

    if (!isAdmin) {
      return (
        <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/60 backdrop-blur">
          <div className="flex-1 min-w-0 pr-4">
            <p className="font-bold truncate">{p.nome_completo}</p>
            <p className="text-[10px] text-muted-foreground">{p.quantidade_cotas} cota(s)</p>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
          </div>
        </div>
      );
    }

    return (
      <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/60 backdrop-blur">
        <div className="flex-1 min-w-0 pr-4">
          {editingId === p.id ? (
            <div className="flex items-center gap-2">
              <Input 
                size={20}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-green-500"
                onClick={() => mutationUpdate.mutate({ id: p.id, nome_completo: editName })}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="font-bold truncate">{p.nome_completo}</p>
              <p className="text-[10px] text-muted-foreground">{p.celular} · {p.quantidade_cotas} cota(s)</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button 
              onClick={() => mutationUpdate.mutate({ id: p.id, status: p.status === 'pago' ? 'reservado' : 'pago' })}
              className="transition-transform active:scale-95"
            >
              {statusBadge}
            </button>
          ) : (
            statusBadge
          )}

          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-muted-foreground"
                onClick={() => {
                  setEditingId(p.id);
                  setEditName(p.nome_completo);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm(`Excluir a reserva de ${p.nome_completo}?`)) {
                    mutationDelete.mutate(p.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Total de Cotas</p>
            <p className="text-2xl font-black">{bolao?.total_cotas || 0}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-black mb-1">Cotas Faltantes</p>
            <p className="text-2xl font-black text-primary">{bolao?.cotas_disponiveis || 0}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
      {allParticipantes.length === 0 && !isLoading ? (
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl bg-muted/20 text-muted-foreground">
          Nenhum participante ainda.
        </div>
      ) : (
        <>
          {allParticipantes.map(renderItem)}
          
          {hasMore && (
            <div className="py-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(prev => prev + 1)}
                disabled={isLoading}
                className="rounded-full px-8 font-bold text-xs"
              >
                {isLoading ? "Carregando..." : "Carregar mais participantes"}
              </Button>
            </div>
          )}

          {isLoading && page === 1 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Carregando participantes...
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
