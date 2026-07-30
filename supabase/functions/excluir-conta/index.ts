// ============================================================================
// Exclusao de conta — "direito ao esquecimento" da LGPD.
//
// A politica de privacidade do Astral promete esse direito desde sempre, e o
// app nunca ofereceu o botao. Promessa nao cumprida em documento publico e
// risco juridico real, e vira obrigacao formal no dia em que houver cobranca.
//
// Apagar de auth.users so e possivel com a service_role, entao tem de ser aqui:
// o navegador nao pode ter essa chave. As duas tabelas do projeto referenciam
// auth.users com ON DELETE CASCADE (verificado em 30/07/2026), entao perfis e
// uso_ia somem junto, sem passo extra.
// ============================================================================

import { autenticar, admin, cabecalhosCors, json, erro, FalhaHttp } from "../_shared/comum.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors(req) });
  }
  if (req.method !== "POST") {
    return erro(req, "Metodo nao suportado.", 405);
  }

  try {
    const usuario = await autenticar(req);

    // Exigir que a pessoa digite a propria confirmacao evita que um clique
    // acidental -- ou um CSRF -- destrua a conta. O texto vem do frontend.
    const corpo = await req.json().catch(() => ({}));
    if (String(corpo?.confirmacao ?? "").trim().toUpperCase() !== "EXCLUIR") {
      throw new FalhaHttp(400, "Confirmacao invalida.");
    }

    // Log antes de apagar: depois nao ha mais de quem falar.
    console.log(`Exclusao de conta solicitada: ${usuario.id} (${usuario.email ?? "sem e-mail"})`);

    const { error } = await admin().auth.admin.deleteUser(usuario.id);
    if (error) {
      console.error("Falha ao excluir usuario:", error);
      throw new FalhaHttp(500, "Nao foi possivel excluir a conta agora. Tente de novo em alguns minutos.");
    }

    return json(req, {
      success: true,
      mensagem: "Conta e dados removidos.",
    });
  } catch (e) {
    if (e instanceof FalhaHttp) return erro(req, e.message, e.status);
    return erro(req, "Nao foi possivel excluir a conta.", 500, e);
  }
});
