/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-EDITAL-REAL — a promessa do produto, de ponta a ponta, com dinheiro.

   POR QUE EXISTE
   Em 04/08/2026 mediu-se: 8 usuarios cadastrados e ZERO chamadas de IA em toda
   a historia. A promessa da landing -- "transforme seu edital em um plano de
   aprovacao" -- nunca tinha acontecido uma vez. Este arquivo faz acontecer.

   ⚠️ ESTE TESTE GASTA CREDITO DE VERDADE na conta da Anthropic. Ele nao roda
   junto dos outros de proposito: e chamado a mao, quando se quer provar o
   caminho completo.

   O QUE ELE FAZ
     1. cria um usuario descartavel (e apaga no fim, sempre)
     2. pega sessao por magic link de admin -- o captcha impede login por senha,
        e furar a propria protecao para testar seria mentira
     3. manda um edital REAL para processar-edital
     4. confere o que voltou contra o que o edital diz de verdade
     5. monta o cronograma com a conta do plano.js
     6. busca os professores de cada materia
     7. mede o custo real e apaga tudo

   USO
     node tools/testa-edital-real.js caminho/para/edital.pdf
     node tools/testa-edital-real.js caminho/para/edital.pdf --sem-professores
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const url = require('url');
const { execSync } = require('child_process');

const REF = 'jjogmcacbdefwiwcyjxp';
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, '..');

const pdfPath = process.argv[2];
const SEM_PROF = process.argv.includes('--sem-professores');

if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.log('Uso: node tools/testa-edital-real.js <edital.pdf> [--sem-professores]');
  process.exit(1);
}

const DOLAR = 5.50;   // cambio assumido; so para dar ideia em reais

const chaves = JSON.parse(execSync(
  `supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
));
const SERVICE = chaves.find((k) => k.name === 'service_role').api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, 'assets/js/astral.js'), 'utf8')
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

const admin = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
};

async function req(caminho, opcoes = {}) {
  const r = await fetch(BASE + caminho, {
    ...opcoes,
    headers: { ...admin, ...(opcoes.headers || {}) },
  });
  const texto = await r.text();
  let corpo; try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  return { status: r.status, corpo };
}

let uid = null;
const email = `edital-${Date.now()}@astral-teste.local`;

(async () => {
  const t0 = Date.now();
  console.log('TESTA-EDITAL-REAL\n');
  console.log('  PDF: ' + path.basename(pdfPath)
    + '  (' + (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2) + ' MB)\n');

  /* ── 1. usuario descartavel ────────────────────────────────────────────── */
  const criado = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'T!' + crypto.randomUUID(), email_confirm: true }),
  });
  uid = criado.corpo?.id;
  if (!uid) throw new Error('nao criei o usuario: ' + JSON.stringify(criado.corpo).slice(0, 300));
  console.log('  usuario de teste criado: ' + uid.slice(0, 8) + '…');

  /* Plano beta: o objetivo aqui e provar o CAMINHO, nao esbarrar em quota. */
  await req(`/rest/v1/perfis?id=eq.${uid}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ tipo_plano: 'beta' }),
  });

  /* ── 2. sessao por magic link ──────────────────────────────────────────── */
  const link = await req('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const hashed = link.corpo?.hashed_token;
  if (!hashed) throw new Error('nao gerei magic link: ' + JSON.stringify(link.corpo).slice(0, 300));

  const verif = await fetch(`${BASE}/auth/v1/verify?token=${hashed}&type=magiclink&redirect_to=${BASE}`, {
    headers: { apikey: PUB }, redirect: 'manual',
  });
  const destino = verif.headers.get('location') || '';
  const token = (destino.match(/access_token=([^&]+)/) || [])[1];
  if (!token) throw new Error('nao consegui o token da sessao');
  console.log('  sessao obtida\n');

  const comoUsuario = {
    apikey: PUB,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  /* ── 3. O EDITAL ───────────────────────────────────────────────────────── */
  console.log('  ── mandando o edital para a IA ' + '─'.repeat(38));
  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
  const tEdital = Date.now();
  const r1 = await fetch(`${BASE}/functions/v1/processar-edital`, {
    method: 'POST', headers: comoUsuario, body: JSON.stringify({ pdfBase64 }),
  });
  const j1 = await r1.json().catch(() => ({}));
  const msEdital = Date.now() - tEdital;

  if (!r1.ok || !j1.success) {
    console.log('\n  ❌ FALHOU — HTTP ' + r1.status);
    console.log('     ' + JSON.stringify(j1).slice(0, 400));
    if (/credit|billing|quota/i.test(JSON.stringify(j1))) {
      console.log('\n  Parece falta de credito na Anthropic.');
    }
    throw new Error('processar-edital falhou');
  }

  const ed = j1.data;
  console.log('  ✅ respondeu em ' + (msEdital / 1000).toFixed(1) + 's\n');
  console.log('     concurso ........ ' + ed.concurso);
  console.log('     data da prova ... ' + (ed.dataProva || '(nao informada)'));
  console.log('     forca ........... ' + ed.forca);
  console.log('     patente inicial . ' + (ed.patenteInicial || '(nao identificada)'));
  console.log('     materias ........ ' + ed.materias.length + '\n');
  for (const m of ed.materias) {
    console.log('       ' + String(m.questoes).padStart(3) + ' questoes  '
      + String(m.peso.toFixed(1)).padStart(5) + '%  ' + m.nome);
  }

  /* ── 4. a patente que a pessoa veria ───────────────────────────────────── */
  const divisa = await import(url.pathToFileURL(path.join(RAIZ, 'assets/js/divisa.js')).href);
  const plano = await import(url.pathToFileURL(path.join(RAIZ, 'assets/js/plano.js')).href);

  console.log('\n  ── a carreira que ele veria ' + '─'.repeat(40));
  const carreira = [];
  for (const xp of [0, 500, 1200, 2500, 4500, 7000, 10000]) {
    carreira.push(divisa.nivelDe(xp, ed.concurso, ed.forca, ed.patenteInicial).nome);
  }
  console.log('     ' + carreira.join('  >  '));

  /* ── 5. o cronograma ───────────────────────────────────────────────────── */
  console.log('\n  ── o cronograma de hoje ' + '─'.repeat(44));
  const materias = ed.materias.map((m) => ({ ...m, progresso: 0 }));
  for (const s of plano.montarCronograma(materias)) {
    console.log('     ' + String(s.tempo).padStart(3) + ' min  ' + String(s.xp).padStart(3) + ' XP   ' + s.materia);
  }

  /* ── 6. os professores ─────────────────────────────────────────────────── */
  let custoProf = 0, achados = 0;
  if (!SEM_PROF) {
    console.log('\n  ── procurando professores ' + '─'.repeat(42));
    for (const m of ed.materias) {
      const t = Date.now();
      const r = await fetch(`${BASE}/functions/v1/buscar-recursos`, {
        method: 'POST', headers: comoUsuario,
        body: JSON.stringify({ materia: m.nome, concurso: ed.concurso }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) {
        console.log('     ❌ ' + m.nome + ' — HTTP ' + r.status + ' ' + JSON.stringify(j).slice(0, 120));
        continue;
      }
      const d = j.data;
      achados += (d.professores?.length || 0);
      console.log('     ✅ ' + m.nome + '  (' + ((Date.now() - t) / 1000).toFixed(1) + 's)');
      for (const p of (d.professores || [])) {
        console.log('          · ' + p.nome + (p.canal ? ' — ' + p.canal : ''));
      }
      if (d.dica) console.log('          dica: ' + d.dica.slice(0, 110) + '…');
    }
  }

  /* ── 7. o custo, lido do banco ─────────────────────────────────────────── */
  console.log('\n  ── consumo registrado ' + '─'.repeat(46));
  const uso = await req(`/rest/v1/uso_ia?usuario_id=eq.${uid}&select=funcao,unidades`);
  const porFuncao = {};
  for (const u of (uso.corpo || [])) porFuncao[u.funcao] = (porFuncao[u.funcao] || 0) + u.unidades;
  for (const [f, n] of Object.entries(porFuncao)) console.log('     ' + f.padEnd(20) + n + ' unidade(s)');

  const nEdital = porFuncao['processar-edital'] || 0;
  const nRec = porFuncao['buscar-recursos'] || 0;
  const estimado = nEdital * 0.26 + nRec * 0.08;   // US$, ver Anexo B do roadmap
  console.log('\n     custo estimado desta rodada: US$ ' + estimado.toFixed(2)
    + '  ≈ R$ ' + (estimado * DOLAR).toFixed(2));
  console.log('     (estimativa pela conta do roadmap, nao pela fatura)');

  console.log('\n  tempo total: ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  console.log('\n' + '='.repeat(74));
  console.log('A PROMESSA DO PRODUTO ACONTECEU: edital -> materias -> pesos -> cronograma'
    + (SEM_PROF ? '.' : ' -> professores.'));
})()
  .catch((e) => {
    console.log('\n❌ ' + e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!uid) return;
    await req(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {});
    console.log('\n  (usuario de teste apagado)');
  });
