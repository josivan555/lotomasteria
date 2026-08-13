import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { buscarReservaBolao } from "@/lib/boloes.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { formatBRL } from "@/lib/credits-config";
import { 
  ChevronLeft, 
  CheckCircle2, 
  QrCode, 
  Clock, 
  Copy,
  RefreshCw,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/boloes/pagamento/$codigo")({
  component: PagamentoReserva,
});

function PagamentoReserva() {
  const { codigo } = useParams({ from: "/boloes/pagamento/$codigo" });
  const buscarReserva = useServerFn(buscarReservaBolao);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: reserva, isLoading, error } = useQuery({
    queryKey: ["reserva-pagamento", codigo, refreshKey],
    queryFn: () => buscarReserva({ data: { codigo } }),
    refetchInterval: (query) => (query.state.data?.status === 'reservado' ? 5000 : false),
  });

  const handleCopy = (text: string | null | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (isLoading && !reserva) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Carregando detalhes do pagamento...</p>
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Info className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black mb-2">Ops! Reserva não encontrada.</h1>
        <p className="text-muted-foreground mb-8">
          Não conseguimos localizar a reserva com o código informado.
        </p>
        <Button asChild>
          <Link to="/boloes/reserva">Voltar para Consulta</Link>
        </Button>
      </div>
    );
  }

  const bolao = reserva.boloes;
  const cfg = LOTERIAS[bolao.loteria_id as LoteriaId];
  const isPago = reserva.status === 'pago';
  const pixData = reserva.pix_data as any;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
      <div className="mb-8 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/boloes/reserva">
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <Badge variant={isPago ? "default" : "outline"} className={isPago ? "bg-green-500 hover:bg-green-600" : "animate-pulse"}>
          {isPago ? "PAGAMENTO CONFIRMADO" : "AGUARDANDO PAGAMENTO"}
        </Badge>
      </div>

      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2">Pagamento do Bolão</h1>
          <p className="text-muted-foreground">
            Escaneie o código abaixo ou copie a chave PIX para finalizar sua compra.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-2xl relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full h-2" 
            style={{ backgroundColor: cfg.cor }} 
          />
          
          <div className="mb-8 text-center space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Valor Total</p>
            <p className="text-4xl font-black text-primary">{formatBRL(reserva.valor_total)}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 text-[11px] font-bold">
              <Badge variant="secondary" className="h-5">{reserva.quantidade_cotas} cotas</Badge>
              <span>{bolao.nome}</span>
            </div>
          </div>

          {!isPago ? (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-6 mx-auto w-fit shadow-inner border-4 border-secondary/20">
                {pixData?.qrCodeBase64 ? (
                  <img 
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                    alt="QR Code PIX" 
                    className="w-56 h-56"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-300">
                    <QrCode className="w-20 h-20 opacity-20" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-center">Código Copia e Cola</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-secondary/30 rounded-xl p-3 text-[11px] font-mono break-all line-clamp-2 border border-border/40 text-muted-foreground">
                      {pixData?.qrCode || "Código PIX não disponível"}
                    </div>
                    <Button 
                      size="icon" 
                      className="shrink-0 h-auto" 
                      onClick={() => handleCopy(pixData?.qrCode, "Código PIX")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 py-4 border-t border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>O PIX expira em 30 min (reemissão automática)</span>
                  </div>
                  <div className="h-4 w-[1px] bg-border" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                    <span>Verificação automática</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center animate-in zoom-in duration-500">
              <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-green-600">Pagamento Recebido!</h2>
              <p className="text-muted-foreground mb-8">
                Sua participação no bolão foi confirmada com sucesso. Boa sorte!
              </p>
              <div className="grid gap-3">
                <Button className="w-full font-black h-12" asChild>
                  <Link to="/boloes/reserva">Ver Minha Reserva</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/">Voltar para Início</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            <span>Ref: {reserva.codigo_referencia}</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isPago ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
              {isPago ? 'Confirmado' : 'Processando'}
            </div>
          </div>
        </div>

        {!isPago && (
          <div className="rounded-2xl bg-primary/5 p-6 border border-primary/10 flex gap-4">
            <Info className="h-6 w-6 text-primary shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Dica importante</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você não precisa nos enviar o comprovante. O sistema identifica o pagamento via PIX automaticamente e atualiza sua reserva em poucos segundos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

