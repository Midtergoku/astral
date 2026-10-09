// ============================================================================
// VIGIA -- o alerta da operacao por e-mail (09/10/2026, auditoria OPS-03, roadmap 3.15)
//
// Quem chama: o despertador do banco (pg_cron, de hora em hora) via
// chamar_vigia(), com o segredo do cofre no cabecalho x-astral-vigia. Ninguem
// mais: sem o segredo, 401 e nada e lido.
//
// O que faz: le saude_operacao() (os numeros e os alertas, calculados no
// banco -- o checa-saude le o mesmo) e, para cada alerta que nao foi mandado
// nas ultimas 24 h, manda UM e-mail para o dono. Alerta que grita toda hora
// ensina a ignorar; um por dia por tipo, nao.
//
// { "teste": true } manda um e-mail de teste mesmo sem alerta -- para provar
// que o canal funciona (tools/liga-vigia.js --teste).
//
// verify_jwt = false (config.toml): quem chama e o banco, nao um aluno.
// ============================================================================
import { Resend } from "npm:resend@3.2.0";
import { admin } from "../_shared/comum.ts";

const DESTINO = Deno.env.get("EMAIL_NOTIFICACAO") ?? "lherdy2003@gmail.com";

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

// Comparacao em tempo constante: o tempo da resposta nao entrega o segredo letra a letra.
function igual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

function escapar(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta({ error: "Método não suportado." }, 405);
  const esperado = Deno.env.get("VIGIA_SEGREDO");
  // Sem segredo configurado, recusa tudo: um vigia aberto seria um botao publico de mandar e-mail.
  if (!esperado) return resposta({ error: "Vigia não configurado." }, 503);
  if (!igual(req.headers.get("x-astral-vigia") ?? "", esperado)) return resposta({ error: "Não autorizado." }, 401);

  const corpo = await req.json().catch(() => ({}));
  const teste = corpo?.teste === true;

  const { data: saude, error } = await admin().rpc("saude_operacao");
  if (error) {
    console.error("saude_operacao falhou:", error.message);
    return resposta({ error: "Não consegui ler a saúde da operação." }, 500);
  }
  const alertas: { tipo: string; texto: string }[] = Array.isArray(saude?.alertas) ? saude.alertas : [];

  // Quais ja foram mandados nas ultimas 24 h
  const { data: enviados } = await admin().from("vigia_alertas").select("tipo, enviado_em");
  const recente = new Set((enviados ?? [])
    .filter((x) => Date.now() - new Date(x.enviado_em).getTime() < 24 * 3600 * 1000)
    .map((x) => x.tipo));
  const novos = alertas.filter((a) => !recente.has(a.tipo));

  if (!novos.length && !teste) return resposta({ alertas: alertas.length, enviados: 0 });

  const chave = Deno.env.get("RESEND_API_KEY");
  if (!chave) {
    // o astral-dev nao tem e-mail, de proposito: responde o que TERIA mandado
    return resposta({ alertas: alertas.length, enviados: 0, semEmail: true, tipos: novos.map((a) => a.tipo) });
  }

  const linhas = (teste && !novos.length)
    ? ["<li>Teste do vigia: o canal de alerta funciona. Nenhum problema agora.</li>"]
    : novos.map((a) => `<li>${escapar(a.texto)}</li>`);
  const assunto = teste && !novos.length ? "Astral: teste do vigia" : `Astral: ${novos.length} alerta(s) da operação`;
  const html = `<p>O vigia do Astral achou isto:</p><ul>${linhas.join("")}</ul>
    <p style="color:#666">Banco: ${escapar(saude?.banco_mb)} MB · arquivos: ${escapar(saude?.arquivos_mb)} MB ·
    erros nos navegadores (24 h): ${escapar(saude?.erros_navegador_24h)}.<br>
    Cada alerta vem no máximo uma vez por dia. O Claude vê os mesmos números no começo de cada sessão (checa-saude).</p>`;

  const { data: env, error: erroEnvio } = await new Resend(chave).emails.send({
    from: "Astral <onboarding@resend.dev>", to: [DESTINO], subject: assunto, html,
  });
  if (erroEnvio) {
    console.error("Resend recusou o alerta:", erroEnvio);
    return resposta({ error: "O e-mail do alerta não saiu." }, 502);
  }
  if (novos.length) {
    await admin().from("vigia_alertas").upsert(novos.map((a) => ({ tipo: a.tipo, enviado_em: new Date().toISOString() })));
  }
  return resposta({ alertas: alertas.length, enviados: novos.length, teste, id: env?.id ?? null });
});
