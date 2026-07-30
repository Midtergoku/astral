// ============================================================================
// Codigo compartilhado pelas edge functions do Astral.
//
// Concentra o que estava faltando ou duplicado nas 4 funcoes: identificacao
// real do usuario, quota por plano, CORS restrito e resposta padronizada.
// ============================================================================

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────────────────────────
// Antes era "*", ou seja, qualquer site na internet podia chamar estas funcoes
// direto do navegador da vitima. Agora e uma lista fechada.
const ORIGENS_PERMITIDAS = new Set([
  "https://astral-psi.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
]);

export function cabecalhosCors(req: Request): Record<string, string> {
  const origem = req.headers.get("origin") ?? "";
  const permitida = ORIGENS_PERMITIDAS.has(origem);
  return {
    // Sem origem conhecida nao devolvemos ACAO nenhum: o navegador bloqueia.
    ...(permitida ? { "Access-Control-Allow-Origin": origem } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// ── Respostas ───────────────────────────────────────────────────────────────
export function json(req: Request, corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), "Content-Type": "application/json" },
  });
}

/** Erro para o cliente. `detalhe` vai só para o log, nunca para a resposta. */
export function erro(req: Request, mensagem: string, status: number, detalhe?: unknown): Response {
  if (detalhe !== undefined) console.error(`[${status}] ${mensagem}`, detalhe);
  return json(req, { error: mensagem }, status);
}

export class FalhaHttp extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

// ── Cliente administrativo ──────────────────────────────────────────────────
let _admin: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}

// ── Identificacao do usuario ────────────────────────────────────────────────
// IMPORTANTE: `verify_jwt = true` no gateway do Supabase NAO garante que quem
// chamou seja um usuario. O gateway aceita qualquer chave valida do projeto --
// inclusive a publishable key, que esta no codigo-fonte de todas as paginas.
// Medido em 30/07/2026: as 3 funcoes de IA atravessavam a autenticacao usando
// so a chave publica. Por isso a verificacao de verdade tem de ser esta aqui.

export interface Usuario {
  id: string;
  email: string | null;
  plano: "free" | "beta" | "pro";
}

/** Chaves do projeto que jamais podem valer como identidade de usuario. */
function chavesDoProjeto(): string[] {
  const brutas = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    ...(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "").split(","),
  ];
  return brutas.map((k) => (k ?? "").trim()).filter(Boolean);
}

export async function autenticar(req: Request): Promise<Usuario> {
  const cabecalho = req.headers.get("Authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new FalhaHttp(401, "Faca login para usar esta funcao.");
  }

  // Recusa explicita da chave publica. E o caso que estava passando.
  if (chavesDoProjeto().includes(token)) {
    console.warn("Tentativa de usar a chave publica do projeto como identidade.");
    throw new FalhaHttp(401, "Faca login para usar esta funcao.");
  }

  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) {
    throw new FalhaHttp(401, "Sessao invalida ou expirada. Entre de novo.");
  }

  const { data: perfil } = await admin()
    .from("perfis")
    .select("tipo_plano")
    .eq("id", data.user.id)
    .maybeSingle();

  const plano = (perfil?.tipo_plano ?? "free") as Usuario["plano"];
  return { id: data.user.id, email: data.user.email ?? null, plano };
}

// ── Quota ───────────────────────────────────────────────────────────────────
// Limites por dia. Valores conservadores de propósito: o custo por chamada sai
// da conta Anthropic do Lucas, e e mais facil afrouxar depois do que explicar
// uma fatura inesperada.
type Funcao = "processar-edital" | "gerar-questoes" | "buscar-recursos";

const LIMITE_DIARIO: Record<Usuario["plano"], Record<Funcao, number>> = {
  free: { "processar-edital": 2, "gerar-questoes": 3, "buscar-recursos": 5 },
  beta: { "processar-edital": 10, "gerar-questoes": 20, "buscar-recursos": 30 },
  pro: { "processar-edital": 20, "gerar-questoes": 50, "buscar-recursos": 60 },
};

export async function conferirQuota(usuario: Usuario, funcao: Funcao): Promise<void> {
  const limite = LIMITE_DIARIO[usuario.plano][funcao];
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await admin()
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuario.id)
    .eq("funcao", funcao)
    .gte("criado_em", desde);

  if (error) {
    // Falhar fechado seria pior: um problema no log de uso deixaria o produto
    // inteiro fora do ar. Registra e deixa passar.
    console.error("Falha ao conferir quota, liberando a chamada:", error);
    return;
  }

  if ((count ?? 0) >= limite) {
    throw new FalhaHttp(
      429,
      `Voce atingiu o limite de ${limite} usos por dia desta funcao no plano ${usuario.plano}.`,
    );
  }
}

export async function registrarUso(usuario: Usuario, funcao: Funcao): Promise<void> {
  const { error } = await admin()
    .from("uso_ia")
    .insert({ usuario_id: usuario.id, funcao });
  if (error) console.error("Falha ao registrar uso:", error);
}

// ── Resposta da IA ──────────────────────────────────────────────────────────
/**
 * O modelo as vezes devolve o JSON cercado de texto ou de cercas de codigo.
 * Antes o codigo fazia JSON.parse direto e uma resposta fora do formato
 * quebrava a tela do usuario -- e o credito ja tinha sido gasto.
 */
export function extrairJson<T = unknown>(texto: string): T {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(limpo) as T;
  } catch {
    // Recorte pelo primeiro { ate o ultimo } — resolve o caso de o modelo
    // acrescentar uma frase antes ou depois do objeto.
    const i = limpo.indexOf("{");
    const f = limpo.lastIndexOf("}");
    if (i >= 0 && f > i) {
      try {
        return JSON.parse(limpo.slice(i, f + 1)) as T;
      } catch { /* cai no throw abaixo */ }
    }
    throw new FalhaHttp(502, "A IA devolveu uma resposta fora do formato esperado. Tente de novo.");
  }
}

/**
 * Roda a operacao e, se ela falhar POR FORMATO da resposta (502), tenta uma
 * segunda vez. Modelo de linguagem e nao-deterministico: a mesma pergunta que
 * saiu torta agora costuma sair certa na repeticao.
 *
 * So repete no 502. Erro de credito, de quota ou de rede repetir nao adianta --
 * e gastaria o dobro a toa.
 *
 * Custo: a chamada repetida consome creditos da Anthropic de novo. A quota do
 * usuario, porem, conta uma vez so, porque `servir()` registra o uso pelo
 * resultado final. O usuario nao paga pelo erro do modelo.
 */
export async function comSegundaChance<T>(operacao: (tentativa: number) => Promise<T>): Promise<T> {
  try {
    return await operacao(1);
  } catch (e) {
    if (e instanceof FalhaHttp && e.status === 502) {
      console.warn("Resposta fora de formato; repetindo uma vez:", e.message);
      return await operacao(2);
    }
    throw e;
  }
}

// ── Envelope padrao ─────────────────────────────────────────────────────────
/** Cuida de OPTIONS, metodo, autenticacao, quota, registro e erros. */
export function servir(
  funcao: Funcao,
  handler: (req: Request, usuario: Usuario) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cabecalhosCors(req) });
    }
    if (req.method !== "POST") {
      return erro(req, "Metodo nao suportado.", 405);
    }

    try {
      const usuario = await autenticar(req);
      await conferirQuota(usuario, funcao);

      const resposta = await handler(req, usuario);

      // So conta o uso se a chamada deu certo. Cobrar quota por erro nosso
      // seria punir o usuario por um problema que nao e dele.
      if (resposta.ok) await registrarUso(usuario, funcao);

      return resposta;
    } catch (e) {
      if (e instanceof FalhaHttp) return erro(req, e.message, e.status);
      // Mensagem generica para o cliente: o texto de erro da Anthropic ja
      // vazou detalhe de billing numa resposta HTTP publica antes.
      return erro(req, "Nao foi possivel completar a operacao. Tente de novo.", 500, e);
    }
  };
}
