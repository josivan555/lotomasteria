import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { buscarReservaBolao } from "@/lib/boloes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LOTERIAS, type LoteriaId } from "@/lib/loterias-config";
import { formatBRL } from "@/lib/credits-config";
import { 
  Search, 
  ChevronLeft, 
  CheckCircle2, 
  QrCode, 
  Clock, 
  AlertCircle 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/boloes/reserva")({
  component: BuscaReserva,
});

function BuscaReserva() {
  const buscarReserva = useServerFn(buscarReservaBolao);
  const [codigo, setCodigo] = useState("");
  const [reserva, setReserva] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleBusca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo) return;
    
    setLoading(true);
    try {
      const data = await buscarReserva({ data: { codigo } });
      setReserva(data);
      toast.success("Reserva encontrada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
      <Button asChild variant="ghost" className="mb-8">
        <Link to="/">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>

      {!reserva ? (
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black">Consultar Reserva</h1>
            <p className="text-muted-foreground mt-2">
              Informe o código de referência ou seu nome completo para localizar sua reserva.
            </p>
          </div>

          <form onSubmit={handleBusca} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Código de Referência
              </Label>
              <Input
                id="codigo"
                placeholder="Código ou Seu Nome Completo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="h-14 text-center text-xl font-bold uppercase"
                required
              />
            </div>

            <Button type="submit" className="w-full h-14 text-lg font-black" disabled={loading}>
              {loading ? "Buscando..." : "Consultar Agora"}
            </Button>
          </form>

          <div className="mt-8 rounded-xl bg-muted/30 p-4 flex gap-3 items-start border border-border/40">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dica: O código de referência foi exibido na tela logo após você preencher seus dados de reserva. 
              Caso não tenha anotado, entre em contato com o administrador.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black">Reserva Localizada!</h1>
            <p className="text-muted-foreground">
              Olá <span className="text-foreground font-bold">{reserva.nome_completo}</span>, veja abaixo os detalhes para pagamento.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-2xl relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: LOTERIAS[reserva.boloes.loteria_id as LoteriaId].cor }} 
            />
            
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-border">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Bolão</p>
                <h3 className="text-xl font-bold">{reserva.boloes.nome}</h3>
                <Badge variant="secondary" className="mt-2">Concurso {reserva.boloes.concurso_numero}</Badge>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">Status</p>
                <Badge className={reserva.status === 'pago' ? 'bg-green-500' : 'bg-amber-500'}>
                  {reserva.status === 'pago' ? 'Confirmado' : 'Aguardando Pagamento'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="rounded-2xl bg-secondary/30 p-4 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Cotas Reservadas</p>
                <p className="text-xl font-black">{reserva.quantidade_cotas}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Valor Total</p>
                <p className="text-xl font-black text-primary">{formatBRL(reserva.valor_total)}</p>
              </div>
            </div>

            {reserva.status !== 'pago' && (
              <div className="bg-secondary/30 rounded-2xl p-6 text-center space-y-6 border border-border/60">
                <div className="space-y-2">
                  <p className="text-sm font-bold flex items-center justify-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" /> Pagar via PIX
                  </p>
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code abaixo no seu aplicativo do banco</p>
                </div>
                
                <div className="mx-auto w-40 h-40 bg-white rounded-2xl flex items-center justify-center p-3 shadow-inner">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
                
                <div className="space-y-3">
                  <Button className="w-full font-bold h-12" variant="outline" onClick={() => {
                    navigator.clipboard.writeText("CHAVE-PIX-EXEMPLO");
                    toast.success("Código PIX copiado!");
                  }}>
                    Copiar Código PIX
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <Clock className="h-3 w-3" /> Prazo de compensação: 30 min
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
              <span>Referência: <span className="font-mono font-bold text-foreground">{reserva.codigo_referencia}</span></span>
              <Button variant="ghost" size="sm" onClick={() => setReserva(null)}>
                Nova consulta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}