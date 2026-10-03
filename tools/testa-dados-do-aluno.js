/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-DADOS-DO-ALUNO -- "baixar meus dados" entrega TUDO, e "excluir"
   nao deixa rastro? (02/10/2026 -- auditoria LGL-03 + LGL-04, roadmap 2.2)

   POR QUE EXISTE
   A tela prometia "um arquivo com tudo" e entregava 4 das 16 tabelas. E
   excluir a conta deixava o e-mail na auditoria para sempre, a inscricao na
   lista de espera e o texto dos erros. Este teste cria uma conta com dado em
   TODAS as tabelas, baixa o pacote, exclui a conta pelo botao de verdade
   (funcao excluir-conta) e conta o que sobrou.

   A checagem que mais importa e a 1: tabela NOVA com usuario_id que nao entrar
   em meus_dados() faz este teste falhar -- a lista nao envelhece calada.

   USO   node tools/testa-dados-do-aluno.js                (producao)
         ASTRAL_DEV=1 node tools/testa-dados-do-aluno.js   (astral-dev)
   Nao gasta credito. Cria 2 contas de teste e as apaga no fim.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const NO_DEV = process.env.ASTRAL_DEV === "1";
const PROD = "jjogmcacbdefwiwcyjxp";
const REF = NO_DEV ? "vtluuezwfpqgryixaaea" : PROD;
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, "..");
const CHAVES = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const SK = CHAVES.find((k) => k.name === "service_role").api_key;
const PUB_PROD = (fs.readFileSync(path.join(RAIZ, "assets/js/astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
const PUB = NO_DEV ? (CHAVES.find((k) => k.type === "publishable") || CHAVES.find((k) => k.name === "anon")).api_key : PUB_PROD;
const admin = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

async function req(c, o = {}) { const r = await fetch(BASE + c, o); const t = await r.text(); let corpo = null; try { corpo = JSON.parse(t); } catch { corpo = t; } return { status: r.status, corpo }; }
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 200)}`); return JSON.parse(t);
}

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(64)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(64)} ${d}`); falhas++; };

// Uma linha em cada tabela da pessoa. Cada insert anda sozinho: se uma regra
// da tabela recusar o valor de teste, as outras continuam -- e o teste DIZ
// qual tabela ficou sem semente, em vez de mentir que conferiu.
const SEMENTES = (u) => ({
  progresso: `insert into public.progresso (usuario_id) values ('${u}') on conflict do nothing`,
  sessoes_estudo: `insert into public.sessoes_estudo (usuario_id, segundos, materia, xp, modo, criado_em) values ('${u}', 1800, 'Matemática', 20, 'livre', now() - interval '1 day')`,
  eventos: `insert into public.eventos (usuario_id, nome, data) values ('${u}', 'Prova teste', current_date + 30)`,
  conquistas: `insert into public.conquistas (usuario_id, tipo, item_id) values ('${u}', 'condecoracao', 'teste')`,
  habilidades_escolhidas: `insert into public.habilidades_escolhidas (usuario_id, habilidade_id) select '${u}', id from public.catalogo_habilidades order by id limit 1`,
  respostas: `insert into public.respostas (usuario_id, questao_id, letra, acertou) select '${u}', id, 'a', true from public.questoes order by id limit 1`,
  questoes_minhas: `insert into public.questoes_minhas (usuario_id, origem, enunciado, alternativas) values ('${u}', 'manual', 'Questao de teste com enunciado', '{"a":"um","b":"dois","c":"tres","d":"quatro"}')`,
  questoes_servidas: `insert into public.questoes_servidas (usuario_id, questao_id) select '${u}', id from public.questoes order by id limit 1`,
  recursos_salvos: `insert into public.recursos_salvos (usuario_id, materia, concurso, dados) values ('${u}', 'Matemática', 'Teste', '{}')`,
  taf_registros: `insert into public.taf_registros (usuario_id, prova, valor) values ('${u}', 'corrida_12min', 2400)`,
  // Dois dias atras: uma linha de HOJE entraria na conta do teto global de IA
  // da producao enquanto o teste roda.
  uso_ia: `insert into public.uso_ia (usuario_id, funcao, unidades, criado_em) values ('${u}', 'buscar-recursos', 1, now() - interval '2 days')`,
  erros_cliente: `insert into public.erros_cliente (usuario_id, mensagem) values ('${u}', 'erro de teste dados-do-aluno')`,
  // o gatilho ja cria a etapa 'cadastro'; a semente acrescenta outra
  funil: `insert into public.funil (usuario_id, etapa) values ('${u}', 'rotina') on conflict do nothing`,
  questoes_reportadas: `insert into public.questoes_reportadas (usuario_id, questao_id, motivo) select '${u}', id, 'gabarito' from public.questoes order by id limit 1`,
});

const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const PORTA = 5175;
const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const a = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!fs.existsSync(a) || fs.statSync(a).isDirectory()) { r.writeHead(404); return r.end(); }
  let corpo = fs.readFileSync(a);
  if (NO_DEV && /\.(js|html)$/.test(a)) corpo = corpo.toString("utf8").split(PROD).join(REF).split(PUB_PROD).join(PUB);
  r.writeHead(200, { "Content-Type": tipos[path.extname(a)] || "text/plain" }); r.end(corpo);
});

(async () => {
  const contas = [];
  const criar = async (p) => {
    const email = `dados-${p}-${Date.now()}@astral-teste.local`;
    const c = await req("/auth/v1/admin/users", { method: "POST", headers: admin, body: JSON.stringify({ email, password: "T!" + crypto.randomUUID(), email_confirm: true }) });
    contas.push(c.corpo.id);
    const link = await req("/auth/v1/admin/generate_link", { method: "POST", headers: admin, body: JSON.stringify({ type: "magiclink", email }) });
    const s = (await req("/auth/v1/verify", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: link.corpo.hashed_token }) })).corpo;
    return { id: c.corpo.id, email, sessao: s, cab: { apikey: PUB, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" } };
  };
  const meusDados = (c) => req("/rest/v1/rpc/meus_dados", { method: "POST", headers: c.cab, body: "{}" });

  let nav = null;
  try {
    console.log(`\nTESTA-DADOS-DO-ALUNO -- baixar tudo, excluir sem rastro  [${NO_DEV ? "DESENVOLVIMENTO" : "PRODUCAO"}]\n`);
    const a = await criar("a");
    const b = await criar("b");

    // ---- semeia A em tudo ----
    const semente = SEMENTES(a.id); const semeadas = [], recusadas = [];
    for (const [t, q] of Object.entries(semente)) {
      try { await sql(q); semeadas.push(t); } catch (e) { recusadas.push(`${t} (${e.message.slice(0, 70)})`); }
    }
    await sql(`insert into public.lista_espera (nome, email, concurso) values ('Teste Dados', '${a.email.toUpperCase()}', 'EEAR')`);
    await sql(`update public.perfis set tipo_plano = 'pro' where id = '${a.id}'`);
    await sql(`update public.perfis set tipo_plano = 'free' where id = '${a.id}'`);
    const audAntes = await sql(`select id from public.auditoria where alvo_id = '${a.id}' order by id`);

    console.log("== 1. O PACOTE TEM TODAS AS TABELAS DA PESSOA ==");
    const comUsuario = (await sql(`select table_name t from information_schema.columns where table_schema='public' and column_name='usuario_id' order by 1`)).map((x) => x.t);
    const p = (await meusDados(a)).corpo || {};
    const faltam = comUsuario.filter((t) => !(t in p));
    faltam.length === 0 ? ok("toda tabela com usuario_id esta em meus_dados()", `${comUsuario.length} tabelas`)
      : falha("tabela com dado do aluno FORA do pacote -- acrescentar em meus_dados()", faltam.join(", "));
    const vazias = semeadas.filter((t) => !Array.isArray(p[t]) || p[t].length === 0);
    vazias.length === 0 ? ok("cada tabela semeada aparece com a linha da pessoa", `${semeadas.length} semeadas`)
      : falha("tabela semeada veio vazia no pacote", vazias.join(", "));
    // Tabela sem semente e tabela NAO conferida: o teste falha em vez de passar cego.
    recusadas.length === 0 ? ok("todas as tabelas da pessoa receberam dado de teste", `${semeadas.length} de ${Object.keys(semente).length}`)
      : falha("tabela sem dado de teste -- conferida as cegas", recusadas.join(" · "));
    const semSemente = comUsuario.filter((t) => !(t in semente) && !["consentimentos", "administradores"].includes(t));
    semSemente.length === 0 ? ok("toda tabela com usuario_id tem semente neste teste")
      : falha("tabela nova sem semente aqui -- acrescentar em SEMENTES", semSemente.join(", "));
    p.conta?.email === a.email && p.perfil?.id === a.id ? ok("conta e perfil sao os da pessoa", p.conta.forma_de_acesso)
      : falha("conta/perfil errados no pacote", JSON.stringify(p.conta).slice(0, 80));
    (p.lista_de_espera || []).length === 1 ? ok("inscricao na lista de espera entra (e-mail sem diferenciar maiuscula)")
      : falha("lista de espera fora do pacote", `${(p.lista_de_espera || []).length}`);
    (p.historico_de_plano || []).length === 2 ? ok("historico de plano entra (as 2 trocas)", JSON.stringify(p.historico_de_plano.map((x) => x.detalhe)))
      : falha("historico de plano errado", `${(p.historico_de_plano || []).length}`);

    console.log("\n== 2. NINGUEM BAIXA O DADO DE OUTRO ==");
    const pb = JSON.stringify((await meusDados(b)).corpo || {});
    !pb.includes(a.id) && !pb.includes(a.email) ? ok("o pacote de B nao contem nada de A", "nem id, nem e-mail")
      : falha("o pacote de B contem dado de A");
    const anon = await req("/rest/v1/rpc/meus_dados", { method: "POST", headers: { apikey: PUB, "Content-Type": "application/json" }, body: "{}" });
    anon.status >= 400 ? ok("anonimo nao baixa nada", `HTTP ${anon.status}`) : falha("anonimo recebeu pacote", `HTTP ${anon.status}`);

    console.log("\n== 3. O BOTAO 'BAIXAR MEUS DADOS' ENTREGA O PACOTE DO SERVIDOR ==");
    const npx = path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
    let pw = null; for (const d of fs.readdirSync(npx)) { const pp = path.join(npx, d, "node_modules", "playwright"); if (fs.existsSync(pp)) { pw = require(pp); break; } }
    if (!pw) falha("playwright nao encontrado no cache do npx");
    else {
      await new Promise((r) => servidor.listen(PORTA, r));
      nav = await pw.chromium.launch();
      const ctx = await nav.newContext({ acceptDownloads: true });
      const t = a.sessao;
      await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
      await ctx.addInitScript(`localStorage.setItem("sb-${REF}-auth-token", ${JSON.stringify(JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user: t.user }))});`);
      const pg = await ctx.newPage();
      await pg.goto(`http://localhost:${PORTA}/conta.html`); await pg.waitForTimeout(4000);
      const [dl] = await Promise.all([pg.waitForEvent("download", { timeout: 15000 }).catch(() => null), pg.click("#btn-exportar").catch(() => null)]);
      if (!dl) falha("o botao nao gerou arquivo");
      else {
        const arq = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
        const chaves = comUsuario.filter((x) => x in arq);
        chaves.length === comUsuario.length && arq.conta?.email === a.email
          ? ok("o arquivo baixado tem as mesmas tabelas do servidor", `${dl.suggestedFilename()} · ${Object.keys(arq).length} chaves`)
          : falha("o arquivo baixado esta incompleto", `${chaves.length}/${comUsuario.length}`);
      }
    }

    console.log("\n== 4. EXCLUIR A CONTA PELO BOTAO DE VERDADE ==");
    const ex = await req("/functions/v1/excluir-conta", { method: "POST", headers: a.cab, body: JSON.stringify({ confirmacao: "EXCLUIR" }) });
    ex.status === 200 ? ok("excluir-conta respondeu", "HTTP 200") : falha("excluir-conta falhou", `HTTP ${ex.status} ${JSON.stringify(ex.corpo).slice(0, 80)}`);
    contas.splice(contas.indexOf(a.id), 1);
    const sobras = [];
    for (const t of comUsuario) {
      const [{ n }] = await sql(`select count(*)::int n from public.${t} where usuario_id = '${a.id}'`);
      if (n) sobras.push(`${t}=${n}`);
    }
    sobras.length === 0 ? ok("0 linhas da pessoa nas tabelas com usuario_id", `${comUsuario.length} conferidas`) : falha("sobrou dado ligado a pessoa", sobras.join(" "));
    const [{ n: lead }] = await sql(`select count(*)::int n from public.lista_espera where lower(email) = lower('${a.email}')`);
    lead === 0 ? ok("inscricao na lista de espera apagada") : falha("a inscricao na lista de espera ficou", `${lead}`);
    const [{ n: comEmail }] = await sql(`select count(*)::int n from public.auditoria where lower(alvo_email) = lower('${a.email}') or detalhe::text ilike '%Teste Dados%'`);
    comEmail === 0 ? ok("o e-mail e o nome sumiram da auditoria", "inclusive do 'lead_removido' que a exclusao cria")
      : falha("a auditoria ainda tem o e-mail ou o nome", `${comEmail} linha(s)`);
    const ids = audAntes.map((x) => x.id).join(",") || "0";
    const [{ n: fatos }] = await sql(`select count(*)::int n from public.auditoria where id in (${ids}) and evento = 'plano_alterado' and detalhe ? 'para'`);
    fatos === audAntes.length && fatos === 2 ? ok("o FATO da troca de plano continua (prova de cobranca)", `${fatos} linhas, sem pessoa`)
      : falha("a auditoria perdeu o fato da troca de plano", `${fatos} de ${audAntes.length}`);

    console.log("\n== 5. ERROS COM MAIS DE 12 MESES SAEM SOZINHOS ==");
    const [velho] = await sql(`insert into public.erros_cliente (mensagem, criado_em) values ('erro velho de teste', now() - interval '13 months') returning id, criado_em`);
    const [novo] = await sql(`insert into public.erros_cliente (mensagem) values ('erro novo de teste') returning id`);
    const [{ expurgar_erros_antigos: n }] = await sql(`select public.expurgar_erros_antigos()`);
    const restam = await sql(`select id from public.erros_cliente where id in (${velho.id}, ${novo.id})`);
    restam.length === 1 && restam[0].id === novo.id ? ok("o de 13 meses saiu, o de hoje ficou", `${n} expurgado(s)`)
      : falha("o expurgo nao fez o que devia", `restam ${JSON.stringify(restam)} · gravado em ${velho.criado_em}`);
    await sql(`delete from public.erros_cliente where id = ${novo.id}`);
    const job = await sql(`select schedule, active from cron.job where jobname = 'astral-expurgo-erros'`);
    job.length === 1 && job[0].active ? ok("o expurgo esta agendado todo dia", `cron "${job[0].schedule}" (UTC)`) : falha("o expurgo nao esta agendado", JSON.stringify(job));
  } catch (e) {
    falha("o teste quebrou", e.message.slice(0, 160));
  } finally {
    if (nav) await nav.close();
    servidor.close();
    for (const id of contas) await req(`/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
    await sql(`delete from public.erros_cliente where mensagem in ('erro de teste dados-do-aluno', 'erro velho de teste', 'erro novo de teste')`).catch(() => {});
    console.log(`\n  (${contas.length} conta(s) de teste apagada(s))`);
    console.log("\n" + "=".repeat(78));
    console.log(falhas ? `${falhas} FALHA(S) -- os dados do aluno NAO estao completos ou a exclusao deixa rastro.`
      : "O ALUNO BAIXA TUDO, E QUEM EXCLUI A CONTA NAO DEIXA RASTRO.");
    process.exit(falhas ? 1 : 0);
  }
})();
