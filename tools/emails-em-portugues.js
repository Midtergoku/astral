// EMAILS-EM-PORTUGUES -- os 7 e-mails do login (cadastro, senha, convite...) em portugues, com a cara do Astral
//
// 10/10/2026 (roadmap 4.1). Ao provar que o e-mail chega (tools/testa-email-chega.js), o assunto veio "You've been
// invited": os modelos eram os padroes do Supabase, em ingles. Um concurseiro que recebe "Confirm your email address"
// de um Gmail desconhecido acha que e golpe e nao clica. Este programa grava os modelos em portugues pela API de
// gerenciamento (so os campos que manda -- NAO usar `supabase config push`, que desligaria o captcha e o Google).
//
// As variaveis do Supabase ficam intactas ({{ .ConfirmationURL }}, {{ .Token }}, {{ .NewEmail }}, {{ .Email }},
// {{ .OldEmail }}) -- sao elas que levam o link. E-mail e HTML com estilo EM LINHA (cliente de e-mail ignora <style>),
// fundo claro (le em qualquer cliente), botao grande para o dedo, e o link escrito por extenso embaixo (se o botao
// nao renderizar, o aluno copia).
//
// Tambem sobe o limite de envio: era 2 por hora (o padrao do Supabase) -- o 3o aluno da mesma hora ficava sem e-mail.
// 20 por hora = 480 por dia, abaixo do teto do Gmail (~500 por dia).
//
//   node tools/emails-em-portugues.js            mostra o que esta no ar (nao muda nada)
//   node tools/emails-em-portugues.js --aplicar  grava os modelos e o limite
const { execFileSync } = require("child_process");
const path = require("path");
const REF = process.argv.includes("--dev") ? "vtluuezwfpqgryixaaea" : "jjogmcacbdefwiwcyjxp";
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8" }).trim();
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const SITE = "https://astral-psi.vercel.app";

const envelope = (titulo, corpo, botao, url) => `<div style="background:#f3f1ec;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:#1b2430">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e1ddd3;border-top:4px solid #C08A2E;border-radius:6px;padding:28px 24px">
    <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:20px;letter-spacing:-.02em;color:#0E1620;margin:0 0 18px">Ast<span style="color:#C08A2E">r</span>al</div>
    <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:#0E1620;margin:0 0 12px">${titulo}</h1>
    ${corpo}
    ${botao ? `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#C08A2E;color:#0E1620;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:16px;text-decoration:none;padding:14px 22px;border-radius:3px">${botao}</a></p>
    <p style="font-size:13px;line-height:1.5;color:#5f6b78;margin:0 0 8px">Se o botão não funcionar, copie este endereço no navegador:</p>
    <p style="font-size:12px;line-height:1.5;color:#5f6b78;word-break:break-all;margin:0 0 16px">${url}</p>` : ""}
    <p style="font-size:13px;line-height:1.5;color:#5f6b78;border-top:1px solid #e1ddd3;padding-top:14px;margin:20px 0 0">
      Você recebeu este e-mail porque alguém usou este endereço no Astral — o seu plano de estudo para concursos militares.
      Se não foi você, pode ignorar: nada acontece sem o clique. Dúvidas: responda este e-mail.</p>
  </div>
</div>`;
const p = (t) => `<p style="font-size:16px;line-height:1.6;margin:0 0 12px">${t}</p>`;
const LINK = "{{ .ConfirmationURL }}";

const MODELOS = {
  confirmation: ["Confirme seu cadastro no Astral", envelope("Falta um passo: confirme o seu e-mail",
    p("Sua conta no Astral foi criada. Toque no botão para confirmar que este e-mail é seu e entrar.") + p("O link vale por 1 hora."),
    "Confirmar meu e-mail", LINK)],
  recovery: ["Redefina sua senha do Astral", envelope("Redefinir a sua senha",
    p("Recebemos um pedido para trocar a senha da sua conta no Astral. Toque no botão para escolher uma nova.") + p("O link vale por 1 hora. Se você não pediu, ignore este e-mail — a sua senha continua a mesma."),
    "Escolher uma nova senha", LINK)],
  invite: ["Você foi convidado para o Astral", envelope("Você foi convidado para o Astral",
    p("Alguém liberou uma conta para você no Astral, o plano de estudo que transforma o seu edital militar em cronograma. Toque no botão para aceitar."),
    "Aceitar o convite", LINK)],
  magic_link: ["Seu link para entrar no Astral", envelope("Entrar no Astral",
    p("Toque no botão para entrar na sua conta. O link vale por pouco tempo e só funciona uma vez."),
    "Entrar no Astral", LINK)],
  email_change: ["Confirme seu novo e-mail no Astral", envelope("Confirme o seu novo e-mail",
    p("Você pediu para trocar o e-mail da sua conta no Astral para <b>{{ .NewEmail }}</b>. Toque no botão para confirmar.") + p("Se não foi você, ignore — nada muda sem esta confirmação."),
    "Confirmar o novo e-mail", LINK)],
  reauthentication: ["{{ .Token }} é o seu código do Astral", envelope("O seu código de confirmação",
    p("Use este código para confirmar que é você:") + `<p style="font-family:'Courier New',monospace;font-size:28px;letter-spacing:6px;font-weight:700;color:#0E1620;margin:8px 0 16px">{{ .Token }}</p>` + p("Ele vale por pouco tempo. Se não foi você, ignore este e-mail."),
    null, null)],
  email_changed_notification: ["O e-mail da sua conta no Astral mudou", envelope("O e-mail da sua conta mudou",
    p("O e-mail da sua conta no Astral foi trocado de <b>{{ .OldEmail }}</b> para <b>{{ .Email }}</b>.") + p("Se foi você, está tudo certo. Se <b>não</b> foi você, responda este e-mail agora."),
    null, null)],
};

async function lerConfig() {
  const r = await fetch(API, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  return r.json();
}

(async () => {
  const antes = await lerConfig();
  console.log(`\nEMAILS-EM-PORTUGUES  ${REF === "jjogmcacbdefwiwcyjxp" ? "producao" : "astral-dev"}\n`);
  for (const k of Object.keys(MODELOS)) console.log(`  ${k.padEnd(28)} ${String(antes[`mailer_subjects_${k}`]).slice(0, 60)}`);
  console.log(`  limite de envio: ${antes.rate_limit_email_sent} por hora`);
  if (!process.argv.includes("--aplicar")) { console.log("\n(so leitura -- --aplicar grava)"); return; }

  const corpo = { rate_limit_email_sent: 20 };
  for (const [k, [assunto, html]] of Object.entries(MODELOS)) {
    // a variavel do link/codigo TEM de estar no modelo -- sem ela o e-mail sai sem o que importa
    const precisa = k === "reauthentication" ? "{{ .Token }}" : (k === "email_changed_notification" ? "{{ .Email }}" : LINK);
    if (!html.includes(precisa)) throw new Error(`o modelo ${k} perdeu ${precisa}`);
    corpo[`mailer_subjects_${k}`] = assunto;
    corpo[`mailer_templates_${k}_content`] = html;
  }
  const r = await fetch(API, { method: "PATCH", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  console.log(`\nPATCH -> HTTP ${r.status}${r.ok ? "" : " " + (await r.text()).slice(0, 200)}`);
  if (!r.ok) { process.exitCode = 1; return; }
  const depois = await lerConfig();
  let certos = 0;
  for (const [k, [assunto]] of Object.entries(MODELOS)) if (depois[`mailer_subjects_${k}`] === assunto) certos++;
  console.log(`  ${certos} de ${Object.keys(MODELOS).length} assuntos em portugues · limite: ${depois.rate_limit_email_sent} por hora`);
  console.log(`  captcha ${depois.security_captcha_enabled} · Google ${depois.external_google_enabled} (nao mexidos)`);
})().catch((e) => { console.log("FALHOU:", e.message); process.exitCode = 1; });
