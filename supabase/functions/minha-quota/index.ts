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
  FUNCOES,
  consumoDoDia,
  admin,
  limiteDe,
} from "../_shared/comum.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors(req) });
  }
  // GET tambem serve: e uma leitura, e nao muda nada.
  if (req.method !== "POST" && req.method !== "GET") {
    return erro(req, "Método não suportado.", 405);
  }

  try {
    const usuario = await autenticar(req);
    const usado = await consumoDoDia(usuario);

    // 01/10/2026: os limites vem de regras_do_plano(), a tabela unica de regras.
    // null = sem limite (nenhum plano tem isso hoje nas funcoes de IA).
    const funcoes: Record<string, { limite: number | null; usado: number; restante: number | null }> = {};
    for (const f of FUNCOES) {
      const limite = limiteDe(usuario, f);
      funcoes[f] = {
        limite,
        usado: usado[f],
        restante: limite === null ? null : Math.max(0, limite - usado[f]),
      };
    }

    /* 29/09/2026: a leitura de edital passou a ser limitada por 30 dias (o 1o
       edital + 1 troca no gratis, + 2 no Pro), nao por dia. Mostrar "2 de 2
       hoje" seria mentir a regra. Conta so o que custou (unidades > 0): edital
       ja guardado nao entra. */
    const desde30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: editaisNoMes } = await admin().from("uso_ia")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuario.id).eq("funcao", "processar-edital")
      .gt("unidades", 0).gte("criado_em", desde30);
    const limiteMes = limiteDe(usuario, "editais_30_dias");
    funcoes["processar-edital"] = {
      limite: limiteMes,
      usado: editaisNoMes ?? 0,
      restante: limiteMes === null ? null : Math.max(0, limiteMes - (editaisNoMes ?? 0)),
      janela: "30d",
    } as typeof funcoes[string];

    // O envelope { success, data } e o contrato que chamarIA/buscarQuota
    // esperam, e que as outras 4 funcoes ja usam. Devolver o objeto cru aqui
    // faria buscarQuota() retornar null em silencio.
    return json(req, {
      success: true,
      data: {
        plano: usuario.plano,
        // beta e promessa vitalicia de acesso pro. Quem consome esta resposta
        // nao precisa saber a regra -- basta ler `completo`.
        completo: usuario.regras.completo,
        funcoes,
        // A janela e movel: 24h para tras a partir de agora, nao "meia-noite".
        janela: "24h",
      },
    });
  } catch (e) {
    if (e instanceof FalhaHttp) return erro(req, e.message, e.status);
    return erro(req, "Não consegui ler o seu limite de uso agora. Tente de novo em instantes.", 500, e);
  }
});
