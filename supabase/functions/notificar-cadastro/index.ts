import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { nome, email, concurso } = payload.record;

    const { data, error } = await resend.emails.send({
      from: "Astral <onboarding@resend.dev>",
      to:"lherdy2003@gmail.com",
      subject: `🎉 Novo cadastro no Astral: ${nome}`,
      html: `
        <h2>Novo concurseiro na lista de espera!</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Concurso:</strong> ${concurso}</p>
      `,
    });

    console.log("Resposta do Resend - data:", JSON.stringify(data));
    console.log("Resposta do Resend - error:", JSON.stringify(error));

    if (error) {
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro inesperado:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});