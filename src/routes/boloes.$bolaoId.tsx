import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterBolao, comprarCotasBolao } from "@/lib/boloes.functions";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { formatBRL } from "@/lib/credits-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Trophy, ChevronLeft, CheckCircle2, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/boloes/$bolaoId")({
  component: DetalheBolao,
});

function DetalheBolao() {
  const { bolaoId } = useParams({ from: "/boloes/$bolaoId" });
  const getBolao = useServerFn(obterBolao);
  const comprarCotas = useServerFn(comprarCotasBolao);

  const [form, setForm] = useState({ nome: "", celular: "", cotas: 1 });
  const [sucesso, setSucesso] = useState<{ ref: string; total: number } | null>(null);

  const { data: bolao, isLoading, error } = useQuery({
    queryKey: ["bolao", bolaoId],
    queryFn: () => getBolao({ data: { id: bolaoId } }),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => comprarCotas({ data: payload }),
    onSuccess: (res) => {
      setSucesso({ ref: res.codigoReferencia, total: res.valorTotal });
      toast.success("Reserva realizada! Siga as instruções para pagamento.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-20 text-center text-muted-foreground">Carregando detalhes do bolão...</div>;
  if (error || !bolao) return <div className="p-20 text-center text-destructive">Bolão não encontrado.</div>;

  const cfg = LOTERIAS[bolao.loteria_id as LoteriaId];
  const progresso = (bolao.cotas_compradas / bolao.total_cotas) * 100;
  const esgotado = bolao.cotas_disponiveis <= 0;

  if (sucesso) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 md:py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black mb-4">Reserva Realizada!</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Olá <span className="text-foreground font-bold">{form.nome}</span>, sua reserva para o bolão 
          <span className="text-foreground font-bold"> {bolao.nome}</span> foi registrada com sucesso.
        </p>

        <div className="rounded-2xl border border-border/60 bg-card p-8 mb-8 text-left shadow-xl">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <span className="text-sm text-muted-foreground">Código de Referência:</span>
            <span className="font-mono font-bold text-primary">{sucesso.ref}</span>
          </div>
          
          <div className="flex justify-between items-center mb-8">
            <span className="text-sm text-muted-foreground">Total a pagar:</span>
            <span className="text-2xl font-black text-foreground">{formatBRL(sucesso.total)}</span>
          </div>

          <div className="bg-secondary/30 rounded-xl p-6 text-center space-y-4">
            <p className="text-sm font-medium">Instruções para pagamento via PIX</p>
            <div className="mx-auto w-32 h-32 bg-white rounded-lg flex items-center justify-center p-2">
              <QrCode className="w-full h-full text-slate-900" />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider">
              Copie o código PIX acima ou escaneie o QR Code no seu aplicativo do banco.
              O prazo para compensação é de até 30 minutos.
            </p>
            <Button className="w-full" variant="outline">Copiar Código PIX</Button>
          </div>
        </div>

        <Button asChild variant="ghost">
          <Link to="/">Voltar para a página inicial</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Button asChild variant="ghost" className="mb-6">
        <Link to="/"><ChevronLeft className="mr-2 h-4 w-4" /> Voltar</Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: cfg.cor }} />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="ball h-10 w-10 text-sm font-bold" style={{ backgroundColor: cfg.cor }}>{cfg.nome[0]}</div>
                  <div>
                    <h1 className="text-2xl font-black leading-tight">{bolao.nome}</h1>
                    <Badge variant="secondary" className="mt-1">Concurso {bolao.concurso_numero}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl bg-secondary/30 p-4 border border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Estimativa de Prêmio</p>
                  <p className="text-lg font-black text-foreground">{formatBRL(bolao.premio_estimado || 0)}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Valor da Cota</p>
                  <p className="text-xl font-black text-primary">{formatBRL(bolao.valor_cota)}</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso de vendas</span>
                  <span className="font-bold">{bolao.cotas_compradas} de {bolao.total_cotas} cotas</span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progresso}%` }} />
                </div>
                <p className="text-center text-xs text-muted-foreground font-medium">
                  {bolao.cotas_disponiveis} cotas ainda disponíveis para compra
                </p>
              </div>

              <div className="grid gap-3 text-sm border-t border-border pt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Sorteio: <strong>{new Date(bolao.data_sorteio).toLocaleDateString('pt-BR')} às {bolao.horario_sorteio}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Bolão com <strong>{bolao.total_jogos} jogos</strong> otimizados por IA</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span>Participação proporcional por cota</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/60 p-6 bg-muted/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Por que participar?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nossos bolões são gerados utilizando o motor de inteligência do LotoMaster IA. 
              Selecionamos apenas os jogos com o melhor <strong>Score Estatístico</strong>, 
              equilibrando dezenas quentes, frias e padrões de sorteio reais para maximizar suas chances.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Comprar Cotas</h2>
              <Button variant="link" size="sm" asChild className="text-primary font-bold p-0 h-auto">
                <Link to="/boloes/reserva">Já tenho uma reserva</Link>
              </Button>
            </div>
            
            {esgotado ? (
              <div className="bg-destructive/10 text-destructive rounded-xl p-6 text-center">
                <p className="font-bold">Bolão Esgotado</p>
                <p className="text-sm mt-1">Todas as cotas já foram vendidas. Fique atento para os próximos lançamentos!</p>
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
                    <span className="text-primary">{formatBRL(form.cotas * bolao.valor_cota)}</span>
                  </div>
                </div>

                <Button 
                  className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20" 
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
      </div>
    </div>
  );
}
