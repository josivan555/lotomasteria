import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  meuSaldo,
  minhasTransacoes,
  criarPedidoCreditos,
  statusPedido,
} from "@/lib/credits.functions";
import { CREDIT_PACKAGES, JOGOS_POR_CREDITO, formatBRL, formatCreditos } from "@/lib/credits-config";

export const Route = createFileRoute("/_authenticated/creditos")({
  component: CreditosPage,
  head: () => ({
    meta: [
      { title: "Créditos | LotoMaster IA" },
      {
        name: "description",
        content:
          "Compre créditos com PIX e gere jogos inteligentes de Lotofácil, Mega-Sena e Quina no LotoMaster IA.",
      },
      { property: "og:title", content: "Créditos | LotoMaster IA" },
      {
        property: "og:description",
        content: "Compre créditos com PIX e gere jogos inteligentes no LotoMaster IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const LABELS: Record<string, string> = {
  bonus: "Bônus",
  purchase: "Compra",
  consumption: "Uso",
  adjustment: "Ajuste",
};

function CreditosPage() {
  const saldoFn = useServerFn(meuSaldo);
  const transFn = useServerFn(minhasTransacoes);
  const criarFn = useServerFn(criarPedidoCreditos);
  const statusFn = useServerFn(statusPedido);
  const queryClient = useQueryClient();
  const [conferindo, setConferindo] = useState(false);

  const { data: saldo } = useQuery({ queryKey: ["saldo"], queryFn: () => saldoFn({}) });
  const { data: transacoes = [] } = useQuery({
    queryKey: ["credit-transactions"],
    queryFn: () => transFn({}),
  });

  const comprar = useMutation({
    mutationFn: (packageId: string) => criarFn({ data: { packageId } }),
    onSuccess: (r) => {
      window.location.href = r.checkoutUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Após voltar do checkout, verifica o pedido por alguns segundos (PIX pode demorar).
  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search).get("pedido");
    if (!pedido) return;
    let tentativas = 0;
    setConferindo(true);
    const timer = setInterval(async () => {
      tentativas++;
      try {
        const r = await statusFn({ data: { orderId: pedido } });
        if (r?.status === "paid") {
          clearInterval(timer);
          setConferindo(false);
          toast.success(`${r.credits} créditos adicionados!`);
          queryClient.invalidateQueries({ queryKey: ["saldo"] });
          queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
          window.history.replaceState({}, "", "/creditos");
          return;
        }
      } catch {
        /* segue tentando */
      }
      if (tentativas >= 15) {
        clearInterval(timer);
        setConferindo(false);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [statusFn, queryClient]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Seu saldo</p>
            <p className="flex items-center gap-2 text-3xl font-bold">
              <Coins className="h-7 w-7 text-primary" />
              {formatCreditos(saldo?.balance ?? 0)}
              <span className="text-base font-normal text-muted-foreground">créditos</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              1 crédito = {JOGOS_POR_CREDITO} jogos gerados (cada jogo custa{" "}
              {formatCreditos(1 / JOGOS_POR_CREDITO)} crédito) · equivale a{" "}
              {Math.floor((saldo?.balance ?? 0) * JOGOS_POR_CREDITO)} jogos
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/loterias">Voltar às loterias</Link>
          </Button>
        </div>
        {conferindo && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirmando seu pagamento...
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CREDIT_PACKAGES.map((p) => (
          <Card
            key={p.id}
            className={p.destaque ? "border-primary/60 shadow-lg shadow-primary/10" : ""}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                {p.credits} créditos
                {p.destaque && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <Sparkles className="h-3 w-3" /> Popular
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-bold">{formatBRL(p.price)}</p>
              <p className="text-sm text-muted-foreground">
                Até {p.credits * JOGOS_POR_CREDITO} jogos gerados ·{" "}
                {formatBRL(p.price / (p.credits * JOGOS_POR_CREDITO))} por jogo
              </p>
              <Button
                className="w-full"
                disabled={comprar.isPending}
                onClick={() => comprar.mutate(p.id)}
              >
                {comprar.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Comprar com PIX
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Pagamento processado pelo Mercado Pago (PIX, cartão ou boleto). Os créditos entram
        automaticamente assim que o pagamento é aprovado.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de créditos</CardTitle>
        </CardHeader>
        <CardContent>
          {transacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {transacoes.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{t.description ?? LABELS[t.kind] ?? t.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("pt-BR")} · {LABELS[t.kind] ?? t.kind}
                    </p>
                  </div>
                  <span
                    className={
                      t.amount >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"
                    }
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {formatCreditos(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
