import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Retorna todos os concursos ordenados do mais recente para o mais antigo.
export const listarConcursos = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverPublicClient();
  const { data, error } = await sb
    .from("concursos")
    .select("numero, data_apuracao, dezenas, soma")
    .order("numero", { ascending: false })
    .limit(3500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    numero: c.numero,
    data_apuracao: c.data_apuracao,
    dezenas: (c.dezenas as unknown as number[]) ?? [],
    soma: c.soma,
  }));
});

// Busca o ultimo resultado oficial direto da Caixa, incluindo premio.
export const ultimoResultadoCaixa = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await fetch(
      "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil",
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      numero: number;
      dataApuracao: string;
      listaDezenas: string[];
      valorEstimadoProximoConcurso?: number;
      dataProximoConcurso?: string;
      numeroConcursoProximo?: number;
      listaRateioPremio?: { descricaoFaixa: string; numeroDeGanhadores: number; valorPremio: number }[];
    };
    const dz = (j.listaDezenas ?? []).map(Number).sort((a, b) => a - b);
    const faixa15 = (j.listaRateioPremio ?? []).find((f) =>
      /15/.test(f.descricaoFaixa),
    ) ?? j.listaRateioPremio?.[0];
    return {
      numero: j.numero,
      data_apuracao: parseData(j.dataApuracao),
      dezenas: dz,
      soma: dz.reduce((a, b) => a + b, 0),
      premio15: faixa15?.valorPremio ?? 0,
      ganhadores15: faixa15?.numeroDeGanhadores ?? 0,
      proximoConcurso: j.numeroConcursoProximo ?? null,
      proximoData: j.dataProximoConcurso ? parseData(j.dataProximoConcurso) : null,
      estimativaProximo: j.valorEstimadoProximoConcurso ?? 0,
    };
  } catch {
    return null;
  }
});

// Sincroniza concursos direto da API oficial da Caixa.
// Busca do ultimo salvo ate o mais recente, com limite por chamada.
type CaixaResp = {
  numero: number;
  dataApuracao: string; // dd/MM/yyyy
  listaDezenas: string[];
};

async function fetchCaixa(concurso?: number): Promise<CaixaResp | null> {
  const url = concurso
    ? `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}`
    : `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as CaixaResp;
  } catch {
    return null;
  }
}

function parseData(dd: string): string {
  const [d, m, y] = dd.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export const sincronizarConcursos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ limite: z.number().int().min(1).max(200).default(50) }).parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ultimo concurso salvo
    const { data: ultimo } = await supabaseAdmin
      .from("concursos")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latest = await fetchCaixa();
    if (!latest) throw new Error("Nao foi possivel acessar a API da Caixa agora. Tente novamente.");

    const alvo = latest.numero;
    const inicio = (ultimo?.numero ?? 0) + 1;
    if (inicio > alvo) return { inseridos: 0, ultimo: alvo, faltam: 0 };

    const fim = Math.min(alvo, inicio + data.limite - 1);
    const rows: { numero: number; data_apuracao: string; dezenas: number[]; soma: number }[] = [];
    for (let n = inicio; n <= fim; n++) {
      const r = n === alvo ? latest : await fetchCaixa(n);
      if (!r) continue;
      const dz = r.listaDezenas.map(Number).sort((a, b) => a - b);
      rows.push({
        numero: r.numero,
        data_apuracao: parseData(r.dataApuracao),
        dezenas: dz,
        soma: dz.reduce((a, b) => a + b, 0),
      });
    }

    if (rows.length) {
      const { error } = await supabaseAdmin.from("concursos").upsert(rows, { onConflict: "numero" });
      if (error) throw new Error(error.message);
    }

    return {
      inseridos: rows.length,
      ultimo: alvo,
      faltam: Math.max(0, alvo - fim),
    };
  });

// Salvar um jogo gerado
export const salvarJogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        nome: z.string().optional(),
        dezenas: z.array(z.number().int().min(1).max(25)).length(15),
        score: z.number().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("jogos_salvos")
      .insert({
        user_id: context.userId,
        nome: data.nome ?? null,
        dezenas: data.dezenas,
        score: data.score ?? null,
        metadata: (data.metadata ?? {}) as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listarJogosSalvos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jogos_salvos")
      .select("id, nome, dezenas, score, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((j) => ({
      ...j,
      dezenas: (j.dezenas as unknown as number[]) ?? [],
    }));
  });

export const excluirJogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jogos_salvos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
