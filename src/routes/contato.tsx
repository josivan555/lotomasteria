import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato e comentários — LotoMaster IA" },
      { name: "description", content: "Fale com a LotoMaster IA: deixe sua mensagem, dúvida ou comentário e converse com outros participantes em tempo real." },
      { property: "og:title", content: "Contato e comentários — LotoMaster IA" },
      { property: "og:description", content: "Deixe sua mensagem, dúvida ou comentário e converse com outros participantes em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContatoPage,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(60, "Nome muito longo"),
  mensagem: z.string().trim().min(2, "Escreva uma mensagem").max(1000, "Máximo de 1000 caracteres"),
});

type Comentario = { id: string; nome: string; mensagem: string; created_at: string };

const CORES = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
function corDoNome(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

function ContatoPage() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: comentarios = [], isLoading } = useQuery({
    queryKey: ["comentarios-contato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comentarios_contato")
        .select("id, nome, mensagem, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Comentario[];
    },
  });

  useEffect(() => {
    const salvo = localStorage.getItem("lotomaster:contato-nome");
    if (salvo) setNome(salvo);
    const ch = supabase
      .channel("comentarios-contato")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comentarios_contato" }, () => {
        qc.invalidateQueries({ queryKey: ["comentarios-contato"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse({ nome, mensagem });
    if (!r.success) {
      toast.error(r.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setEnviando(true);
    const { error } = await (supabase.from("comentarios_contato") as any).insert(r.data);
    setEnviando(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    localStorage.setItem("lotomaster:contato-nome", r.data.nome);
    setMensagem("");
    toast.success("Mensagem enviada!");
    qc.invalidateQueries({ queryKey: ["comentarios-contato"] });
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-6 flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-black uppercase">
              <span className="neon-text">Contato</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Deixe sua dúvida, sugestão ou comentário. As mensagens aparecem na hora para todos.
            </p>
          </div>
        </div>

        <form onSubmit={enviar} className="app-panel mb-6 space-y-3 rounded-xl p-4">
          <Input placeholder="Seu nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
          <Textarea
            placeholder="Escreva sua mensagem..."
            value={mensagem}
            maxLength={1000}
            rows={3}
            onChange={(e) => setMensagem(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{mensagem.length}/1000</span>
            <Button type="submit" disabled={enviando}>
              <Send className="h-4 w-4" /> {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>

        <section className="app-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-muted-foreground">
            Comentários ({comentarios.length})
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seja o primeiro a comentar!</p>
          ) : (
            <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {comentarios.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-primary-foreground ${corDoNome(c.nome)}`}
                  >
                    {c.nome.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <strong>{c.nome}</strong>{" "}
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{c.mensagem}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
