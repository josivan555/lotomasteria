import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Copy, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { buscarReservaBolao } from "@/lib/boloes.functions";
import { Button } from "@/components/ui/button";

type Props = { codigo: string; bolaoId?: string; cor: string; onPago?: () => void };

export function PixPagamento({ codigo, bolaoId, cor, onPago }: Props) {
  const buscar = useServerFn(buscarReservaBolao);
  const { data: reserva, isFetching, refetch } = useQuery({
    queryKey: ["reserva-pagamento", codigo],
    queryFn: async () => {
      const r = await buscar({ data: { codigo, bolaoId } });
      if (r?.status === "pago") onPago?.();
      return r;
    },
    refetchInterval: (q) => (q.state.data?.status === "pago" ? false : 5000),
  });

  const pix = reserva?.pix_data as { qrCode?: string; qrCodeBase64?: string } | null | undefined;
  const pago = reserva?.status === "pago";

  if (pago) {
    return (
      <div className="app-panel rounded-lg p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <h3 className="text-2xl font-black text-green-500">Pagamento Recebido!</h3>
        <p className="mt-1 text-sm text-muted-foreground">Sua participação foi confirmada. Boa sorte!</p>
      </div>
    );
  }

  const copiar = () => {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode);
    toast.success("Código PIX copiado! Cole no app do seu banco.");
  };

  return (
    <div className="app-panel overflow-hidden rounded-lg">
      <div className="h-2 w-full" style={{ backgroundColor: cor }} />
      <div className="space-y-5 p-6">
        <div className="text-center">
          <h3 className="text-xl font-black uppercase tracking-tight">Pague com PIX</h3>
          <p className="text-xs text-muted-foreground">Escaneie o QR Code ou use o Copia e Cola no app do seu banco.</p>
        </div>

        <div className="mx-auto w-fit rounded-2xl bg-white p-4">
          {pix?.qrCodeBase64 ? (
            <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" className="h-48 w-48 sm:h-56 sm:w-56" />
          ) : (
            <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 text-center text-xs text-slate-500 sm:h-56 sm:w-56">
              {reserva ? <QrCode className="h-14 w-14 opacity-30" /> : <RefreshCw className="h-10 w-10 animate-spin opacity-40" />}
              {reserva ? "Gerando PIX..." : "Carregando..."}
            </div>
          )}
        </div>

        {pix?.qrCode ? (
          <Button className="h-14 w-full text-base font-black text-white" style={{ backgroundColor: cor }} onClick={copiar}>
            <Copy className="mr-2 h-5 w-5" /> Copiar código PIX
          </Button>
        ) : (
          <Button variant="outline" className="h-12 w-full font-bold" disabled={isFetching} onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Gerar PIX novamente
          </Button>
        )}

        <div className="flex flex-col items-center justify-center gap-2 border-t border-border/40 pt-4 text-xs text-muted-foreground sm:flex-row sm:gap-4">
          <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> PIX válido por 30 min</span>
          <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" style={{ color: cor }} /> Confirmação automática</span>
        </div>
      </div>
    </div>
  );
}
