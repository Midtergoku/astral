// ============================================================================
// Entrada na lista de espera, com captcha verificado no servidor.
//
// POR QUE EXISTE: a `lista_espera` aceitava INSERT anonimo direto no PostgREST.
// Um script conseguia inserir milhares de linhas validas, e como existe um
// webhook que dispara e-mail a cada linha, isso entupia a caixa do Lucas e
// queimava a cota gratuita do Resend. Era o 🟠 ALTO 5 da auditoria (8.2), o
// unico critico que sobrou aberto ate 31/07/2026.
//
// O captcha do Supabase NAO cobre este caminho: ele protege os endpoints de
// AUTENTICACAO (login, cadastro de conta, recuperar senha), e a lista de
// espera nao e autenticacao. Por isso a verificacao tem de ser feita aqui,
// na mao, contra a API do hCaptcha.
//
// Fluxo: navegador resolve o captcha -> manda token -> esta funcao confere o
// token com o hCaptcha -> so entao insere, com service_role.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { cabecalhosCors, json, erro, FalhaHttp } from "../_shared/comum.ts";

const VERIFICA_HCAPTCHA = "https://api.hcaptcha.com/siteverify";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function texto(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

/**
 * Confere o token com o hCaptcha.
 *
 * Se HCAPTCHA_SECRET nao estiver configurada, LIBERA e registra no log. Isso e
 * deliberado e segue a mesma logica do WEBHOOK_SECRET (8.7): exigir um segredo
 * que ainda nao existe derrubaria a captacao de leads em silencio, que e pior
 * que o spam que estamos tentando evitar.
 */
async function captchaValido(token: string): Promise<boolean> {
  const secret = Deno.env.get("HCAPTCHA_SECRET");
  if (!secret) {
    console.warn("HCAPTCHA_SECRET ausente — liberando sem verificar captcha.");
    return true;
  }
  if (!token) return false;

  try {
    const corpo = new URLSearchParams({ secret, response: token });
    const r = await fetch(VERIFICA_HCAPTCHA, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
    });
    const resultado = await r.json();
    if (!resultado?.success) {
      console.warn("Captcha recusado:", resultado?.["error-codes"]);
    }
    return resultado?.success === true;
  } catch (e) {
    // hCaptcha fora do ar nao pode derrubar o cadastro. Registra e libera --
    // a alternativa e perder leads reais por causa de um servico de terceiro.
    console.error("Nao consegui falar com o hCaptcha, liberando:", e);
    return true;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors(req) });
  }
  if (req.method !== "POST") return erro(req, "Metodo nao suportado.", 405);

  try {
    const corpo = await req.json().catch(() => ({}));

    const nome     = texto(corpo?.nome, 120);
    const email    = texto(corpo?.email, 200).toLowerCase();
    const concurso = texto(corpo?.concurso, 120);
    const whatsapp = texto(corpo?.whatsapp, 40);

    // Validacao aqui TAMBEM, nao so no banco: mensagem de erro melhor, e uma
    // camada a menos de confianca no que chega de fora.
    if (nome.length < 2)  throw new FalhaHttp(400, "Digite seu nome completo.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new FalhaHttp(400, "Digite um e-mail valido.");
    }
    if (!concurso) throw new FalhaHttp(400, "Escolha o concurso.");

    if (!(await captchaValido(texto(corpo?.captchaToken, 4000)))) {
      throw new FalhaHttp(400, "Nao consegui confirmar que voce nao e um robo. Tente de novo.");
    }

    const { error } = await admin()
      .from("lista_espera")
      .insert({ nome, email, concurso, whatsapp: whatsapp || null });

    if (error) {
      // 23505 = e-mail repetido. Nao e falha: e alguem que ja se cadastrou.
      if (error.code === "23505") {
        return json(req, { success: true, data: { repetido: true } });
      }
      console.error("Falha ao inserir na lista de espera:", error);
      throw new FalhaHttp(400, "Confira os dados e tente de novo.");
    }

    return json(req, { success: true, data: { repetido: false } });
  } catch (e) {
    if (e instanceof FalhaHttp) return erro(req, e.message, e.status);
    return erro(req, "Nao foi possivel salvar sua vaga. Tente de novo.", 500, e);
  }
});
