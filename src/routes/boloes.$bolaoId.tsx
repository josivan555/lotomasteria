import { capaUrl, capaMediaType } from "@/lib/capa";
import { createFileRoute, useParams, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterBolao, comprarCotasBolao, bolaoShareInfo, buscarReservaBolao } from "@/lib/boloes.functions";
import { OG_BANNERS } from "@/lib/og-banners";
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

import { Clock, Users, Trophy, ChevronLeft, CheckCircle2, Download, Copy, Share2, Trash2, Edit2, Check, ExternalLink, TicketCheck, CreditCard, Search, AlertCircle, QrCode } from "lucide-react";
import { useState, useRef, type CSSProperties } from "react";
import { toPng } from 'html-to-image';
import { toast } from "sonner";
import { PublicHeader } from "@/components/public-header";

export const Route = createFileRoute("/boloes/$bolaoId")({
  loader: async ({ params }) => {
    try {
      return await bolaoShareInfo({ data: { id: params.bolaoId } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const base = "https://lotomasteria.lovable.app";
    const info = loaderData;
    const cfg = info ? LOTERIAS[info.loteriaId as LoteriaId] : undefined;
    const capa = info && capaMediaType(info.capaUrl) !== "video" ? capaUrl(info.capaUrl, true) : null;
    const bannerPadrao = info ? OG_BANNERS[info.loteriaId as LoteriaId] : undefined;
    const banner = capa ?? (bannerPadrao ? `${base}${bannerPadrao}` : undefined);
    const nomeLimpo = info ? info.nome.trim().replace(/^BOL[ÃA]O\s+/i, "") : "";
    const titulo = info ? `Bolão ${nomeLimpo} — LotoMaster IA` : "Bolão | LotoMaster IA";
    const descricao = info
      ? `${nomeLimpo}${info.isCombo ? " (Combo especial)" : ""} · Concurso ${info.concurso} · Cota ${formatBRL(info.valorCota)} · Prêmio estimado ${formatBRL(info.premioEstimado)}. Garanta a sua cota!`
      : "Consulte jogos, confira resultados e participe dos bolões LotoMaster IA.";
    const paginaUrl = `${base}/boloes/${params.bolaoId}`;
    const meta: Array<Record<string, string>> = [
      { title: titulo },
      { name: "description", content: descricao },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:url", content: paginaUrl },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "LotoMaster IA" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: banner ? "summary_large_image" : "summary" },
    ];
    void params;
    if (banner) {
      const mediaType = info ? capaMediaType(info.capaUrl) : "image";
      const ogImageType =
        mediaType === "gif"
          ? "image/gif"
          : /\.png(?:[?#]|$)/i.test(banner)
            ? "image/png"
            : "image/jpeg";

      // O WhatsApp exige uma imagem real para o preview. GIF pode ser usado
      // como og:image; vídeo não pode, então usamos o banner padrão da loteria.
      const previewUrl = `${banner}${banner.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(info?.concurso ?? params.bolaoId))}`;
      meta.push({ property: "og:image", content: previewUrl });
      meta.push({ property: "og:image:secure_url", content: previewUrl });
      meta.push({ property: "og:image:type", content: ogImageType });
      meta.push({ property: "og:image:width", content: "1200" });
      meta.push({ property: "og:image:height", content: "630" });
      meta.push({ property: "og:image:alt", content: titulo });
      meta.push({ name: "twitter:image", content: banner });
      meta.push({ name: "twitter:image:alt", content: titulo });
    }
    return { meta };
  },
  validateSearch: (search: Record<string, unknown>) => ({
    tab: String(search.tab) === "jogos"
      ? "comprar"
      : ["participantes", "conferir", "comprar", "reserva"].includes(String(search.tab))
        ? String(search.tab)
      : "participantes",
  }),
  component: DetalheBolao,
});

function DetalheBolao() {
  const { bolaoId } = useParams({ from: "/boloes/$bolaoId" });
  const { tab } = useSearch({ from: "/boloes/$bolaoId" });
  const getBolao = useServerFn(obterBolao);
  const comprarCotas = useServerFn(comprarCotasBolao);
  const [activeTab, setActiveTab] = useState(tab);
  const queryClient = useQueryClient();

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
  const horarioRaw = String(bolao.horario_encerramento || '23:59:59');
  const horario = horarioRaw.length === 5 ? `${horarioRaw}:00` : horarioRaw.slice(0, 8);
  const dataPrazo = new Date(`${String(bolao.prazo_vendas).slice(0, 10)}T${horario}-03:00`);
  const dataSorteioObj = new Date(`${bolao.data_sorteio}T00:00:00`);
  const dataSorteioPassada = dataSorteioObj < new Date(new Date().setHours(0,0,0,0));
  const prazoEncerrado = agora > dataPrazo;
  const esgotado = bolao.cotas_disponiveis <= 0 || prazoEncerrado || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status) || dataSorteioPassada;
  const ledAtivo = !esgotado;

  const handleCompartilhar = async () => {
    const nomeLimpo = bolao.nome.trim().replace(/^BOL[ÃA]O\s+/i, "");
    const titulo = `Bolão ${nomeLimpo} — LotoMaster IA`;
    const texto = `${bolao.is_combo ? "Combo especial" : `Concurso ${bolao.concurso_numero}`} · Cota ${formatBRL(bolao.valor_cota)} · Prêmio estimado ${formatBRL(bolao.premio_estimado || 0)}. Garanta a sua cota!`;
    // versão da capa no link: força o WhatsApp a buscar a prévia nova quando a arte muda
    const capaPath = String((bolao as any).capa_url || "");
    const versao = capaPath ? capaPath.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "").slice(-8) : "";
    const url = `${window.location.origin}/boloes/${bolaoId}${versao ? `?c=${versao}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
      } catch {
        /* usuário cancelou */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! Cole no WhatsApp para compartilhar.");
    }
  };

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
      <div className="bolao-experience" data-loteria={bolao.is_combo ? undefined : bolao.loteria_id} style={{ "--bolao-accent": cfg.corEscura } as CSSProperties}>
      <PublicHeader />
      <main className="mx-auto max-w-xl px-4 py-12 md:py-20">
        <div className="text-center mb-8">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black mb-2 text-white">Reserva Realizada!</h1>
          <p className="text-white/85">
            Guarde seu comprovante de reserva.
          </p>
        </div>

        <div 
          id="comprovante-reserva" 
          ref={comprovanteRef}
          className="app-panel relative mb-8 overflow-hidden rounded-lg"
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
            <Link
              to="/boloes/$bolaoId"
              params={{ bolaoId }}
              search={{ tab: "participantes" }}
              onClick={() => {
                setSucesso(null);
                setActiveTab("participantes");
                queryClient.invalidateQueries({ queryKey: ["bolao-participantes", bolaoId] });
                queryClient.invalidateQueries({ queryKey: ["bolao", bolaoId] });
                setTimeout(() => {
                  document.getElementById("bolao-abas")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 80);
              }}
            >
              Voltar para o bolão
            </Link>
          </Button>
        </div>
      </main>
      </div>
    );
  }

  return (
    <div className="bolao-experience" data-loteria={bolao.is_combo ? undefined : bolao.loteria_id} style={{ "--bolao-accent": cfg.corEscura } as CSSProperties}>
    <PublicHeader showSearch />
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div className="flex justify-between items-center mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ChevronLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
        <Button variant="outline" size="sm" className="font-bold" onClick={handleCompartilhar}>
          <Share2 className="mr-2 h-4 w-4" /> Compartilhar
        </Button>
      </div>
 
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5">

        <div className="space-y-5 lg:col-span-5">
          <div className="bolao-detail-hero app-panel relative overflow-hidden rounded-lg">
            {capaMediaType((bolao as any).capa_url) === "video" ? (
              <>
                <video
                  src={capaUrl((bolao as any).capa_url)!}
                  className="bolao-detail-banner object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={bolao.nome}
                />
                <div
                  className="bolao-detail-banner pointer-events-none"
                  style={{ background: "linear-gradient(0deg, var(--surface-strong), transparent 72%)" }}
                />
              </>
            ) : (
              <div
                className="bolao-detail-banner bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(0deg, var(--surface-strong), transparent 72%), url(${capaUrl((bolao as any).capa_url) ?? cfg.banner})`
                }}
              />
            )}
            <div className="relative p-5 pt-24 sm:p-7 sm:pt-32">

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
                    <h1 className="text-2xl font-black leading-tight sm:text-3xl">
                      {bolao.nome}
                      {bolao.is_combo && <Badge variant="secondary" className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/20">COMBO</Badge>}
                    </h1>
                    <Badge variant="secondary" className="mt-1">{bolao.is_combo ? 'Bolão Multi-Loteria' : `Concurso ${bolao.concurso_numero}`}</Badge>
                  </div>
                </div>

              </div>

              <div className="mt-9 flex flex-col gap-4 sm:grid sm:grid-cols-2">
                <div className="rounded-lg border border-line/45 bg-surface/80 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Estimativa de Prêmio</p>
                  <p className="text-lg font-black text-foreground">{formatBRL(bolao.premio_estimado || 0)}</p>
                </div>
                <div className="rounded-lg border border-primary/45 bg-primary/10 p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: cfg.cor }}>Valor da Cota</p>
                  <p className="text-lg sm:text-xl font-black" style={{ color: cfg.cor }}>{formatBRL(bolao.valor_cota)}</p>
                </div>
              </div>

              <div className="my-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso de vendas</span>
                  <span className="font-bold">{bolao.cotas_compradas} de {bolao.total_cotas} cotas</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary shadow-[0_0_16px_var(--primary)] transition-all duration-700" style={{ width: `${progresso}%` }} />
                </div>
                <p className="text-center text-xs text-muted-foreground font-medium">
                  {bolao.cotas_disponiveis} cotas ainda disponíveis para compra
                </p>
              </div>

              <div className="grid gap-3 text-sm border-t border-border pt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-4 w-4" style={{ color: cfg.cor }} />
                  <span>Sorteio: <strong>{new Date(`${bolao.data_sorteio}T00:00:00`).toLocaleDateString('pt-BR')} às {bolao.horario_sorteio}</strong></span>
                </div>

                {bolao.is_combo ? (
                  <div className="space-y-4">
                    {(bolao.combo_loterias as any[])?.map((parte, idx) => parte.resultado_oficial && (
                      <div key={idx} className="p-4 rounded-2xl bg-secondary/30 border border-border/60 shadow-inner space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Trophy className="h-3 w-3" style={{ color: LOTERIAS[parte.loteria_id as LoteriaId].cor }} /> 
                          Resultado {LOTERIAS[parte.loteria_id as LoteriaId].nome} - Concurso {parte.concurso_numero}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          {(parte.resultado_oficial as number[]).map(n => (
                            <div key={n} className="w-8 h-8 rounded-full text-white flex items-center justify-center font-black text-xs shadow-lg animate-in zoom-in duration-300" style={{ backgroundColor: LOTERIAS[parte.loteria_id as LoteriaId].cor }}>
                              {n.toString().padStart(2, '0')}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : bolao.resultado_oficial && (
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

          <div className="app-panel rounded-lg p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: cfg.cor }} /> Por que participar?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nossos bolões são gerados utilizando o motor de inteligência do LotoMaster IA. 
              Selecionamos apenas os jogos com o melhor <strong>Score Estatístico</strong>, 
              equilibrando dezenas quentes, frias e padrões de sorteio reais para maximizar suas chances.
            </p>
          </div>

          <Tabs id="bolao-abas" value={activeTab} onValueChange={setActiveTab} className="bolao-shell w-full scroll-mt-4 p-4 sm:p-5">
            <TabsList className="bolao-tabs grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
              <TabsTrigger className="min-h-9" value="participantes">Participantes</TabsTrigger>
              <TabsTrigger className="min-h-9" value="conferir">Conferir</TabsTrigger>
              <TabsTrigger
                className={ledAtivo ? "bolao-tab-led min-h-9" : "min-h-9"}
                style={{ "--led-cor": cfg.cor } as CSSProperties}
                value="comprar"
              >
                Comprar Cotas
              </TabsTrigger>
              <TabsTrigger className="min-h-9" value="reserva">Ver reserva</TabsTrigger>
            </TabsList>

            <TabsContent value="comprar" className="mt-4">
              <div className="bolao-stat-strip mx-auto max-w-2xl p-5 sm:p-7">
                <div className="mb-6 flex items-center">
                  <h2 className="flex items-center gap-3 text-xl font-black sm:text-2xl"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><TicketCheck className="h-5 w-5" /></span>Comprar Cotas</h2>
                </div>

                {esgotado ? (
                  <div className="rounded-lg bg-destructive/10 p-6 text-center text-destructive">
                    <p className="font-bold">{prazoEncerrado || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status) || dataSorteioPassada ? "Bolão Encerrado" : "Bolão Esgotado"}</p>
                    <p className="mt-1 text-sm">{prazoEncerrado || ['encerrado', 'sorteado', 'conferido'].includes(bolao.status) || dataSorteioPassada ? "Este bolão não aceita mais novas participações." : "Todas as cotas já foram vendidas. Fique atento para os próximos lançamentos!"}</p>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate({ bolaoId, ...form }); }}>
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-xs font-bold uppercase text-foreground">Nome Completo</Label>
                      <Input id="nome" placeholder="Seu nome para o bolão" required className="h-12 bg-card text-base" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="celular" className="text-xs font-bold uppercase text-foreground">WhatsApp / Celular</Label>
                      <Input id="celular" type="tel" placeholder="(00) 00000-0000" required className="h-12 bg-card text-base" value={form.celular} onChange={(event) => setForm({ ...form, celular: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cotas" className="text-xs font-bold uppercase text-foreground">Quantidade de Cotas</Label>
                      <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" className="h-12 w-12 rounded-lg bg-card text-xl font-bold" onClick={() => setForm({ ...form, cotas: Math.max(1, form.cotas - 1) })}>−</Button>
                        <Input id="cotas" type="number" readOnly className="h-12 flex-1 bg-card text-center text-lg font-black" value={form.cotas} />
                        <Button type="button" variant="outline" className="h-12 w-12 rounded-lg bg-card text-xl font-bold" onClick={() => setForm({ ...form, cotas: Math.min(bolao.cotas_disponiveis, form.cotas + 1) })}>+</Button>
                      </div>
                      <p className="text-center text-[10px] font-medium text-muted-foreground">Máximo disponível: {bolao.cotas_disponiveis} cotas</p>
                    </div>
                    <div className="bolao-checkout-total mt-8 space-y-3 rounded-lg p-6">
                      <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal ({form.cotas}x)</span><span>{formatBRL(form.cotas * bolao.valor_cota)}</span></div>
                      <div className="flex justify-between border-t border-border pt-3 text-lg font-black"><span>Total a pagar</span><span className="text-primary">{formatBRL(form.cotas * bolao.valor_cota)}</span></div>
                    </div>
                    <Button className="h-14 w-full text-lg font-black" disabled={mutation.isPending}><CreditCard className="h-5 w-5" /> {mutation.isPending ? "Processando..." : "Confirmar e Pagar"}</Button>
                    <p className="text-center text-[10px] text-muted-foreground">Ao confirmar, suas cotas serão reservadas e você seguirá para o pagamento. A reserva expira em 30 minutos sem confirmação.</p>
                  </form>
                )}
              </div>
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
                        resultadoMesOficial={typeof parte.resultado_mes_oficial === "number" ? parte.resultado_mes_oficial : null}
                        premioEstimado={parte.premio_estimado ?? 0}
                        rateio={Array.isArray(parte.rateio_oficial) ? parte.rateio_oficial : null}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <ConferidorJogos
                  jogos={(bolao.game_snapshot as any[]) ?? []}
                  loteriaId={bolao.loteria_id as LoteriaId}
                  resultadoOficial={Array.isArray(bolao.resultado_oficial) ? (bolao.resultado_oficial as number[]) : null}
                  resultadoMesOficial={typeof (bolao as any).resultado_mes_oficial === "number" ? (bolao as any).resultado_mes_oficial : null}
                  premioEstimado={bolao.premio_estimado ?? 0}
                  rateio={Array.isArray((bolao as any).rateio_oficial) ? (bolao as any).rateio_oficial : null}
                />
              )}
            </TabsContent>


            <TabsContent value="participantes" className="mt-4">
              <ParticipantesList bolaoId={bolao.id} bolao={bolao} />
            </TabsContent>

            <TabsContent value="reserva" className="mt-4">
              <ConsultaReservaBolao bolaoId={bolao.id} />
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </main>
    </div>
  );
}

function ConsultaReservaBolao({ bolaoId }: { bolaoId: string }) {
  const buscarReserva = useServerFn(buscarReservaBolao);
  const [termo, setTermo] = useState("");
  const [reserva, setReserva] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);

  const consultar = async (event: React.FormEvent) => {
    event.preventDefault();
    const consulta = termo.trim();
    if (consulta.length < 3) {
      toast.error("Digite pelo menos 3 caracteres.");
      return;
    }

    setBuscando(true);
    try {
      const resultado = await buscarReserva({ data: { codigo: consulta, bolaoId } });
      setReserva(resultado);
      toast.success("Reserva encontrada!");
    } catch (error) {
      setReserva(null);
      toast.error(error instanceof Error ? error.message : "Não foi possível localizar a reserva.");
    } finally {
      setBuscando(false);
    }
  };

  if (reserva) {
    const pago = reserva.status === "pago";
    return (
      <div className="space-y-4">
        <div className="bolao-stat-strip p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                {pago ? <CheckCircle2 className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{reserva.nome_completo}</p>
                <p className="font-mono text-xs text-muted-foreground">{reserva.codigo_referencia}</p>
              </div>
            </div>
            <Badge className={pago ? "bg-primary text-primary-foreground" : "bg-amber-500 text-amber-950"}>
              {pago ? "PAGO" : "PAGAMENTO PENDENTE"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Cotas</p>
              <p className="mt-1 text-xl font-black">{reserva.quantidade_cotas}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
              <p className="text-[10px] font-black uppercase text-primary">Valor total</p>
              <p className="mt-1 text-xl font-black text-primary">{formatBRL(reserva.valor_total)}</p>
            </div>
          </div>

          {!pago && (
            <Button className="mt-5 h-12 w-full font-black" asChild>
              <Link to="/boloes/pagamento/$codigo" params={{ codigo: reserva.codigo_referencia }}>
                Pagar minha reserva <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {pago && <p className="mt-5 text-center text-sm font-bold text-primary">Pagamento confirmado. Sua participação está garantida.</p>}
        </div>

        <Button variant="outline" className="w-full" onClick={() => { setReserva(null); setTermo(""); }}>
          Fazer outra consulta
        </Button>
      </div>
    );
  }

  return (
    <div className="bolao-stat-strip p-5 sm:p-7">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <Search className="h-5 w-5" />
          </span>
          <h3 className="text-xl font-black">Encontre sua reserva</h3>
          <p className="mt-1 text-sm text-muted-foreground">Digite seu nome completo ou o código recebido ao reservar.</p>
        </div>

        <form onSubmit={consultar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="consulta-reserva" className="text-xs font-bold uppercase">Nome ou código da reserva</Label>
            <Input
              id="consulta-reserva"
              value={termo}
              onChange={(event) => setTermo(event.target.value)}
              placeholder="Ex.: Maria Silva ou BOL-XXXXXXX"
              minLength={3}
              maxLength={100}
              autoComplete="name"
              className="h-12 bg-card"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full font-black" disabled={buscando}>
            <Search className="h-4 w-4" /> {buscando ? "Buscando..." : "Buscar reserva"}
          </Button>
        </form>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          A busca é feita somente nas reservas deste bolão.
        </div>
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
      <div key={p.id} className="bolao-list-item flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="bolao-avatar">{String(p.nome_completo || "P").trim().charAt(0).toUpperCase()}</div>
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
      <div key={p.id} className="bolao-list-item flex items-center justify-between gap-3 p-3 sm:p-4">
        <div className="bolao-avatar">{String(p.nome_completo || "P").trim().charAt(0).toUpperCase()}</div>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => mutationUpdate.mutate({ id: p.id, status: p.status === 'pago' ? 'reservado' : 'pago' })}
              className="h-auto rounded-full p-0 transition-transform active:scale-95"
            >
              {statusBadge}
            </Button>
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
      <div className="bolao-stat-strip p-4 sm:p-5">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="flex items-center gap-3 px-2 sm:px-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Users className="h-5 w-5" /></span>
            <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Total de Cotas</p>
            <p className="text-2xl font-black">{bolao?.total_cotas || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 sm:px-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><TicketCheck className="h-5 w-5" /></span>
            <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-black mb-1">Cotas Faltantes</p>
            <p className="text-2xl font-black text-primary">{bolao?.cotas_disponiveis || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
      {allParticipantes.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center text-muted-foreground">
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
