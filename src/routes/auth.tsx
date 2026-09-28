import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ensureBrowserSession } from "@/lib/session-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import logoAsset from "@/assets/lotomaster-logo.png.asset.json";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar · LotoMaster IA" },
      { name: "description", content: "Acesse sua conta LotoMaster IA para gerar jogos inteligentes da Lotofácil." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setIsSignup(mode === "signup"), [mode]);

  useEffect(() => {
    ensureBrowserSession().then(() =>
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) navigate({ to: "/loterias", replace: true });
      }),
    );
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const displayName = String(data.get("name") ?? "").trim();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Agora entre com seus dados.");
        setEmail("");
        setPassword("");
        setDisplayName("");
        setIsSignup(false);
        navigate({ to: "/auth", search: { mode: "login" }, replace: true });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/loterias", replace: true });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          ← LotoMaster IA
        </Link>
        <div className="app-panel relative overflow-hidden rounded-lg p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-primary shadow-[0_0_18px_var(--primary)]" />
          <div className="mb-6 flex items-center gap-3">
            <img src={logoAsset.url} alt="LotoMaster IA" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-xl font-black">Loto<span className="neon-text">Master</span></p>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Sonhe · escolha · ganhe</p>
            </div>
          </div>
          <h1 className="text-2xl font-black">{isSignup ? "Criar conta" : "Entrar"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Comece a gerar jogos inteligentes." : "Acesse suas análises e jogos salvos."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como quer ser chamado"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <button
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setIsSignup((v) => !v)}
          >
            {isSignup ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
