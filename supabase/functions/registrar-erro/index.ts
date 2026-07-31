// ============================================================================
// Recebe erros de JavaScript do navegador e guarda em `erros_cliente`.
//
// Por que existe: sem isto, falha em producao e invisivel. O beta tester ve a
// tela quebrar, vai embora, e ninguem descobre. Nao ha servico de
// monitoramento contratado e nao da para eu abrir conta em servico de terceiro
// em nome do Lucas -- entao o registro fica no banco que ja existe, de graca.
//
// ⚠️ NAO exige login, de proposito: metade dos erros que importam acontecem na
// tela de login, onde ninguem esta autenticado ainda. Isso abre uma porta
// publica, e por isso ela e estreita:
//   - corpo limitado, todo campo truncado
//   - teto global por hora, para um script nao encher a tabela
//   - responde 204 sempre, mesmo quando descarta: um relator de erro nao pode
//     virar mais uma fonte de erro na tela do usuario
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { cabecalhosCors } from "../_shared/comum.ts";

const TETO_POR_HORA = 500;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Corta e limpa. Devolve null quando nao sobra nada util. */
function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().slice(0, max);
  return limpo.length ? limpo : null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors(req) });
  }
  // Sempre 204, nunca um erro visivel. Ver o cabecalho do arquivo.
  const ok = () => new Response(null, { status: 204, headers: cabecalhosCors(req) });
  if (req.method !== "POST") return ok();

  try {
    const bruto = await req.text();
    // 16 KB ja e generoso para mensagem + pilha. Acima disso e abuso.
    if (bruto.length > 16_000) return ok();

    const corpo = JSON.parse(bruto);
    const mensagem = texto(corpo?.mensagem, 2000);
    if (!mensagem) return ok();

    const bd = admin();

    // Teto global: protege contra um script em loop enchendo a tabela. E por
    // hora e no total (nao por usuario) justamente porque quem reporta pode
    // nao estar logado.
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await bd
      .from("erros_cliente")
      .select("id", { count: "exact", head: true })
      .gte("criado_em", desde);

    if ((count ?? 0) >= TETO_POR_HORA) {
      console.warn(`Teto de ${TETO_POR_HORA} erros/hora atingido; descartando.`);
      return ok();
    }

    // O usuario e opcional. Quando vier token, extrai o id -- mas um token
    // invalido nao pode impedir o registro do erro.
    let usuario_id: string | null = null;
    const cabecalho = req.headers.get("Authorization") ?? "";
    const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
    if (token) {
      const { data } = await bd.auth.getUser(token);
      usuario_id = data?.user?.id ?? null;
    }

    const { error } = await bd.from("erros_cliente").insert({
      usuario_id,
      mensagem,
      pagina: texto(corpo?.pagina, 300),
      origem: texto(corpo?.origem, 300),
      pilha: texto(corpo?.pilha, 4000),
      navegador: texto(req.headers.get("user-agent"), 400),
    });
    if (error) console.error("Falha ao gravar erro do cliente:", error);

    return ok();
  } catch (e) {
    console.error("registrar-erro falhou:", e);
    return ok();
  }
});
