import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { LOTERIA_IDS, LOTERIAS, type LoteriaId } from "./loterias-config";

const loteriaEnum = z.enum(LOTERIA_IDS as [LoteriaId, ...LoteriaId[]]);

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

function apiPath(loteria: LoteriaId): string {
  // Endpoints da API portaldeloterias/api usam o mesmo id.
  return loteria;
}

function parseData(dd: string): string {
  const [d, m, y] = dd.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export const listarConcursos = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ loteria: loteriaEnum }).parse(raw),
  )
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    const { data: rows, error } = await sb
      .from("concursos")
      .select("numero, data_apuracao, dezenas, soma, especial")
      .eq("loteria", data.loteria)
      .order("numero", { ascending: false })
      .limit(3500);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((c) => ({
      numero: c.numero,
      data_apuracao: c.data_apuracao,
      dezenas: (c.dezenas as unknown as number[]) ?? [],
      soma: c.soma,
      especial: c.especial === true,
    }));
  });

export const statusSincronizacao = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ loteria: loteriaEnum }).parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    const [ultimoRes, recenteRes] = await Promise.all([
      sb
        .from("concursos")
        .select("numero, data_apuracao, created_at")
        .eq("loteria", data.loteria)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("concursos")
        .select("created_at")
        .eq("loteria", data.loteria)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let ultimoOficial: number | null = null;
    try {
      const { buscarResumoOficial } = await import("./caixa.server");
      const r = await buscarResumoOficial(data.loteria);
      ultimoOficial = r?.numero ?? null;
    } catch {
      ultimoOficial = null;
    }

    return {
      ultimoNumero: ultimoRes.data?.numero ?? null,
      ultimaDataApuracao: ultimoRes.data?.data_apuracao ?? null,
      ultimaAtualizacao: recenteRes.data?.created_at ?? null,
      ultimoOficial,
    };
  });

export const resumoOficialTodas = createServerFn({ method: "GET" }).handler(async () => {
  const { buscarResumoTodas } = await import("./caixa.server");
  return buscarResumoTodas();
});


export const ultimoResultadoCaixa = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ loteria: loteriaEnum }).parse(raw),
  )
  .handler(async ({ data }) => {
    const cfg = LOTERIAS[data.loteria];
    try {
      const res = await fetch(
        `https://servicebus2.caixa.gov.br/portaldeloterias/api/${apiPath(data.loteria)}`,
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
      const faixaAlvo = String(cfg.faixaPrincipal);
      const faixaPrincipal =
        (j.listaRateioPremio ?? []).find((f) => f.descricaoFaixa?.includes(faixaAlvo)) ??
        j.listaRateioPremio?.[0];
      return {
        loteria: data.loteria,
        nome: cfg.nome,
        numero: j.numero,
        data_apuracao: parseData(j.dataApuracao),
        dezenas: dz,
        soma: dz.reduce((a, b) => a + b, 0),
        premioPrincipal: faixaPrincipal?.valorPremio ?? 0,
        ganhadoresPrincipal: faixaPrincipal?.numeroDeGanhadores ?? 0,
        proximoConcurso: j.numeroConcursoProximo ?? null,
        proximoData: j.dataProximoConcurso ? parseData(j.dataProximoConcurso) : null,
        estimativaProximo: j.valorEstimadoProximoConcurso ?? 0,
      };
    } catch {
      return null;
    }
  });

type CaixaResp = {
  numero: number;
  dataApuracao: string;
  listaDezenas: string[];
  indicadorConcursoEspecial?: number;
};

async function fetchCaixa(loteria: LoteriaId, concurso?: number): Promise<CaixaResp | null> {
  const base = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${apiPath(loteria)}`;
  const url = concurso ? `${base}/${concurso}` : base;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as CaixaResp;
  } catch {
    return null;
  }
}

export const sincronizarConcursos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        loteria: loteriaEnum,
        limite: z.number().int().min(1).max(200).default(50),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const latest = await fetchCaixa(data.loteria);
    if (!latest) throw new Error("Nao foi possivel acessar a API da Caixa agora. Tente novamente.");
    const alvo = latest.numero;

    // Numeros ja salvos (para pular buracos e sincronizar do mais recente para o mais antigo)
    const { data: existentes } = await supabaseAdmin
      .from("concursos")
      .select("numero")
      .eq("loteria", data.loteria);
    const salvos = new Set((existentes ?? []).map((r) => r.numero));

    // Alvos: do concurso mais recente para tras, pulando os que ja temos
    const pendentes: number[] = [];
    for (let n = alvo; n >= 1 && pendentes.length < data.limite; n--) {
      if (!salvos.has(n)) pendentes.push(n);
    }
    if (pendentes.length === 0) {
      return { inseridos: 0, ultimo: alvo, faltam: Math.max(0, alvo - salvos.size) };
    }

    const rows: {
      loteria: LoteriaId;
      numero: number;
      data_apuracao: string;
      dezenas: number[];
      soma: number;
      especial: boolean;
    }[] = [];

    // Busca em lotes paralelos para acelerar
    const CHUNK = 8;
    for (let i = 0; i < pendentes.length; i += CHUNK) {
      const lote = pendentes.slice(i, i + CHUNK);
      const resultados = await Promise.all(
        lote.map((n) => (n === alvo ? Promise.resolve(latest) : fetchCaixa(data.loteria, n))),
      );
      for (const r of resultados) {
        if (!r || !r.listaDezenas?.length) continue;
        const dz = r.listaDezenas.map(Number).sort((a, b) => a - b);
        rows.push({
          loteria: data.loteria,
          numero: r.numero,
          data_apuracao: parseData(r.dataApuracao),
          dezenas: dz,
          soma: dz.reduce((a, b) => a + b, 0),
          especial: r.indicadorConcursoEspecial === 1,
        });
      }
    }

    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("concursos")
        .upsert(rows, { onConflict: "loteria,numero" });
      if (error) throw new Error(error.message);
    }

    return {
      inseridos: rows.length,
      ultimo: alvo,
      faltam: Math.max(0, alvo - (salvos.size + rows.length)),
    };
  });

// Meses em que a Caixa realiza concursos especiais (Independencia, Sao Joao, Virada).
const MESES_ESPECIAIS = new Set(["06", "09", "12"]);

/**
 * Marca no historico quais concursos sao especiais (ex.: Lotofacil da Independencia),
 * usando o indicador oficial da Caixa. Concursos fora dos meses de especiais sao
 * marcados como comuns sem consultar a API.
 */
export const detectarEspeciais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        loteria: loteriaEnum,
        limite: z.number().int().min(1).max(120).default(60),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pendentes, error } = await supabaseAdmin
      .from("concursos")
      .select("numero, data_apuracao")
      .eq("loteria", data.loteria)
      .is("especial", null)
      .order("numero", { ascending: false });
    if (error) throw new Error(error.message);

    const lista = pendentes ?? [];
    const candidatos = lista.filter((r) => MESES_ESPECIAIS.has((r.data_apuracao ?? "").slice(5, 7)));
    const comuns = lista.filter((r) => !MESES_ESPECIAIS.has((r.data_apuracao ?? "").slice(5, 7)));

    for (let i = 0; i < comuns.length; i += 500) {
      const lote = comuns.slice(i, i + 500).map((r) => r.numero);
      await supabaseAdmin
        .from("concursos")
        .update({ especial: false })
        .eq("loteria", data.loteria)
        .in("numero", lote);
    }

    const alvo = candidatos.slice(0, data.limite);
    let especiais = 0;
    const CHUNK = 8;
    for (let i = 0; i < alvo.length; i += CHUNK) {
      const lote = alvo.slice(i, i + CHUNK);
      const resultados = await Promise.all(lote.map((r) => fetchCaixa(data.loteria, r.numero)));
      const marcarEspecial: number[] = [];
      const marcarComum: number[] = [];
      resultados.forEach((r, idx) => {
        const numero = lote[idx].numero;
        if (!r) return;
        if (r.indicadorConcursoEspecial === 1) marcarEspecial.push(numero);
        else marcarComum.push(numero);
      });
      if (marcarEspecial.length) {
        especiais += marcarEspecial.length;
        await supabaseAdmin
          .from("concursos")
          .update({ especial: true })
          .eq("loteria", data.loteria)
          .in("numero", marcarEspecial);
      }
      if (marcarComum.length) {
        await supabaseAdmin
          .from("concursos")
          .update({ especial: false })
          .eq("loteria", data.loteria)
          .in("numero", marcarComum);
      }
    }

    return {
      verificados: alvo.length,
      especiais,
      restantes: Math.max(0, candidatos.length - alvo.length),
    };
  });


export const resultadoDoConcurso = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ loteria: loteriaEnum, numero: z.number().int().positive() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const r = await fetchCaixa(data.loteria, data.numero);
    if (!r || !r.listaDezenas?.length) return null;
    const dz = r.listaDezenas.map(Number).sort((a, b) => a - b);
    return {
      numero: r.numero,
      data_apuracao: parseData(r.dataApuracao),
      dezenas: dz,
    };
  });

export const salvarJogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        loteria: loteriaEnum,
        nome: z.string().optional(),
        dezenas: z.array(z.number().int().min(1).max(100)).min(3).max(50),
        score: z.number().optional(),
        concurso: z.number().int().positive().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const cfg = LOTERIAS[data.loteria];
    const minLen = cfg.tamanhoMin ?? cfg.tamanho;
    const maxLen = cfg.tamanhoMax ?? cfg.tamanho;
    if (data.dezenas.length < minLen || data.dezenas.length > maxLen) {
      throw new Error(`Jogo da ${cfg.nome} precisa de ${minLen} a ${maxLen} dezenas.`);
    }
    for (const d of data.dezenas) {
      if (d < 1 || d > cfg.total) {
        throw new Error(`Dezena ${d} fora do intervalo da ${cfg.nome}.`);
      }
    }
    const { error, data: row } = await context.supabase
      .from("jogos_salvos")
      .insert({
        user_id: context.userId,
        loteria: data.loteria,
        nome: data.nome ?? null,
        dezenas: data.dezenas,
        score: data.score ?? null,
        concurso_alvo: data.concurso ?? null,
        metadata: (data.metadata ?? {}) as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listarJogosSalvos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ loteria: loteriaEnum.optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("jogos_salvos")
      .select("id, loteria, nome, dezenas, score, concurso_alvo, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.loteria) q = q.eq("loteria", data.loteria);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((j) => ({
      ...j,
      concurso_alvo: (j as { concurso_alvo: number | null }).concurso_alvo ?? null,
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

export const excluirJogosPorIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("jogos_salvos")
      .delete()
      .eq("user_id", context.userId)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, removidos: data.ids.length };
  });


export const excluirTodosJogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ loteria: loteriaEnum.optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("jogos_salvos").delete().eq("user_id", context.userId);
    if (data.loteria) q = q.eq("loteria", data.loteria);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const meuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS will restrict these reads to the user's own data or admin access
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      id: context.userId,
      email: (context.claims as any)?.email,
      roles: roleRows?.map((r: any) => r.role) ?? [],
      isAdmin: roleRows?.some((r: any) => r.role === "admin") ?? false,
      profile,
    };
  });

