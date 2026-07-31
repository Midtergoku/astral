// ============================================================================
// Quota do usuario — quanto o plano dele da por dia e quanto ja foi gasto.
//
// Existe porque o gate precisa ser VISIVEL. Antes disso o usuario so descobria
// o limite quando batia nele: clicava em gerar, esperava, e levava um 429 seco.
// Agora a tela mostra "restam 47 de 60" antes de ele clicar.
//
// Nao passa pelo servir(): consultar o proprio limite nao pode gastar limite.
// Usa autenticar() direto, que ja recusa a chave publica do projeto.
//
// So le. Nenhuma escrita, nenhum credito da Anthropic gasto aqui.
// ============================================================================

import {
  autenticar,
  cabecalhosCors,
  json,
  erro,
  FalhaHttp,
  LIMITE_DIARIO,
  FUNCOES,
  consumoDoDia,
} from "../_shared/comum.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors(req) });
  }
  // GET tambem serve: e uma leitura, e nao muda nada.
  if (req.method !== "POST" && req.method !== "GET") {
    return erro(req, "Metodo nao suportado.", 405);
  }

  try {
    const usuario = await autenticar(req);
    const limites = LIMITE_DIARIO[usuario.plano];
    const usado = await consumoDoDia(usuario);

    const funcoes: Record<string, { limite: number; usado: number; restante: number }> = {};
    for (const f of FUNCOES) {
      funcoes[f] = {
        limite: limites[f],
        usado: usado[f],
        restante: Math.max(0, limites[f] - usado[f]),
      };
    }

    // O envelope { success, data } e o contrato que chamarIA/buscarQuota
    // esperam, e que as outras 4 funcoes ja usam. Devolver o objeto cru aqui
    // faria buscarQuota() retornar null em silencio.
    return json(req, {
      success: true,
      data: {
        plano: usuario.plano,
        // beta e promessa vitalicia de acesso pro. Quem consome esta resposta
        // nao precisa saber a regra -- basta ler `completo`.
        completo: usuario.plano === "pro" || usuario.plano === "beta",
        funcoes,
        // A janela e movel: 24h para tras a partir de agora, nao "meia-noite".
        janela: "24h",
      },
    });
  } catch (e) {
    if (e instanceof FalhaHttp) return erro(req, e.message, e.status);
    return erro(req, "Nao foi possivel ler sua quota.", 500, e);
  }
});
