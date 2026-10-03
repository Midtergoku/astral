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
//   - 03/10/2026 (auditoria SEG-01, roadmap 3.5): o teto global SOZINHO deixava
//     um script encher o banco em dias e, de quebra, calava o registro dos
//     alunos de verdade. Agora ha limite por ORIGEM (IP real, guardado so como
//     codigo embaralhado), por erro repetido, por hora e por dia -- contados em
//     erros_cliente_limite (migration 20261003210000). A tabela tem teto de
//     tamanho no expurgo diario.
//   - responde 204 sempre, mesmo quando descarta: um relator de erro nao pode
//     virar mais uma fonte de erro na tela do usuario
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { cabecalhosCors } from "../_shared/comum.ts";

/* Medido em 03/10/2026: 152 erros na historia inteira, pior dia 58, maior
   erro 357 caracteres. Os limites tem folga larga para uso de verdade. */
const LIMITES = {
  origemSemLogin: 15,   // por hora, por IP
  origemComLogin: 30,   // por hora, por conta
  mesmoErro: 5,         // o mesmo erro, na mesma pagina, da mesma origem, por hora
  porHora: 200,         // todos juntos
  porDia: 1000,
};

/* O IP nao vai para o banco: vai um HMAC dele, com a chave de servico (que nunca
   sai do servidor). Serve para contar, nao para identificar -- e a linha de
   contagem some em 2 dias. */
async function embaralhar(texto: string): Promise<string> {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "astral"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(assinatura)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* O IP real. Medido no dev (03/10/2026): X-Forwarded-For e X-Real-IP mandados
   pelo cliente sao descartados no caminho, e CF-Connecting-IP falso e recusado
   pelo Cloudflare -- entao este cabecalho e confiavel. */
function ipDe(req: Request): string {
  return req.headers.get("cf-connecting-ip")
    ?? (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
    ?? "desconhecido";
}

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
    // 03/10/2026: 2000 -> 500 e 4000 -> 2000. O maior erro real tinha 357.
    const mensagem = texto(corpo?.mensagem, 500);
    if (!mensagem) return ok();
    const pagina = texto(corpo?.pagina, 300);

    const bd = admin();

    // O usuario e opcional. Quando vier token, extrai o id -- mas um token
    // invalido nao pode impedir o registro do erro.
    let usuario_id: string | null = null;
    const cabecalho = req.headers.get("Authorization") ?? "";
    const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
    if (token) {
      const { data } = await bd.auth.getUser(token);
      usuario_id = data?.user?.id ?? null;
    }

    // Os limites, todos de uma vez e atomicos (contar_erro_cliente).
    const origem = usuario_id ? `u:${usuario_id}` : `ip:${await embaralhar(ipDe(req))}`;
    const { data: cabe, error: erroLimite } = await bd.rpc("contar_erro_cliente", { p_limites: [
      { chave: origem, teto: usuario_id ? LIMITES.origemComLogin : LIMITES.origemSemLogin, por: "hora" },
      { chave: `mesmo:${await embaralhar(origem + "|" + mensagem + "|" + (pagina ?? ""))}`, teto: LIMITES.mesmoErro, por: "hora" },
      // chaves DIFERENTES: a meia-noite a janela da hora e a do dia sao o mesmo instante
      { chave: "tudo:hora", teto: LIMITES.porHora, por: "hora" },
      { chave: "tudo:dia", teto: LIMITES.porDia, por: "dia" },
    ] });
    // Se a contagem falhar, NAO grava: neste caso falhar fechado e o certo --
    // perder um erro e barato; abrir a porta de novo nao.
    if (erroLimite || cabe !== true) {
      if (erroLimite) console.error("contar_erro_cliente falhou:", erroLimite);
      return ok();
    }

    const { error } = await bd.from("erros_cliente").insert({
      usuario_id,
      mensagem,
      pagina,
      origem: texto(corpo?.origem, 300),
      pilha: texto(corpo?.pilha, 2000),
      navegador: texto(req.headers.get("user-agent"), 400),
    });
    if (error) console.error("Falha ao gravar erro do cliente:", error);

    return ok();
  } catch (e) {
    console.error("registrar-erro falhou:", e);
    return ok();
  }
});
