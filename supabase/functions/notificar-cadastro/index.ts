import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const DESTINO = Deno.env.get("EMAIL_NOTIFICACAO") ?? "lherdy2003@gmail.com";

/**
 * O nome vem de um formulario publico e era interpolado cru no HTML do e-mail.
 * Quem preenchesse a lista de espera escrevia markup na caixa de entrada do
 * dono -- link falso, imagem remota rastreadora, o que quisesse.
 */
function escapar(v: unknown): string {
  return String(v ?? "")
    .slice(0, 300)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A funcao roda com verify_jwt = false porque quem chama e o webhook do banco.
 * Sem nenhuma checagem, porem, qualquer um faz POST aqui e dispara e-mail
 * direto, sem nem passar pela tabela.
 *
 * A conferencia so entra em vigor quando WEBHOOK_SECRET existir nos secrets.
 * Isso e proposital: deployar exigindo o segredo antes de o webhook mandar o
 * cabecalho derrubaria a notificacao de cadastro em silencio. Passos para
 * ativar estao na secao 8.7 do CLAUDE.md.
 */
function autorizado(req: Request): boolean {
  const esperado = Deno.env.get("WEBHOOK_SECRET");
  if (!esperado) {
    console.warn("WEBHOOK_SECRET nao configurado: funcao aceita qualquer chamada. Ver CLAUDE.md 8.7.");
    return true;
  }
  return req.headers.get("x-astral-webhook-secret") === esperado;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao suportado" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!autorizado(req)) {
    console.warn("Chamada recusada: segredo de webhook ausente ou incorreto.");
    return new Response(JSON.stringify({ error: "Nao autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => null);
    const registro = payload?.record;

    if (!registro || typeof registro !== "object" || !registro.email) {
      return new Response(JSON.stringify({ error: "Payload invalido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nome = escapar(registro.nome);
    const email = escapar(registro.email);
    const concurso = escapar(registro.concurso);
    const whatsapp = escapar(registro.whatsapp);

    const { data, error } = await resend.emails.send({
      from: "Astral <onboarding@resend.dev>",
      to: DESTINO,
      subject: `Novo cadastro no Astral: ${nome || email}`,
      html: `
        <h2>Novo concurseiro na lista de espera</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Concurso:</strong> ${concurso}</p>
        ${whatsapp ? `<p><strong>WhatsApp:</strong> ${whatsapp}</p>` : ""}
      `,
    });

    if (error) {
      console.error("Resend recusou o envio:", error);
      return new Response(JSON.stringify({ success: false }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro inesperado:", e);
    // Sem e.message na resposta: ela ja vazou detalhe interno antes.
    return new Response(JSON.stringify({ error: "Falha ao processar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
