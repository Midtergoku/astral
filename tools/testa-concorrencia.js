/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-CONCORRENCIA — duas telas abertas apagam o trabalho uma da outra?

   POR QUE EXISTE (05/08/2026)
   Ate hoje o app gravava o progresso substituindo a linha inteira. Celular e
   computador abertos ao mesmo tempo, e a ultima gravacao apagava a outra --
   como duas pessoas editando a mesma planilha.

   Este teste ENCENA exatamente isso, com um usuario descartavel:
     - a tela A carrega o estado e estuda (ganha XP e uma conquista)
     - a tela B carrega o MESMO estado inicial e estuda outra coisa
     - as duas salvam, B por ultimo
     - se o trabalho de A sobreviveu, a mesclagem funciona

   ⚠️ ELE SABE REPROVAR: com `--upsert` ele grava do jeito ANTIGO
   (substituindo) e mostra o dado sumindo. Teste que nunca reprovou nao prova
   conserto nenhum -- e a licao dos 3 dias.

   USO
     node tools/testa-concorrencia.js
     node tools/testa-concorrencia.js --upsert    (mostra o defeito antigo)
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REF = 'jjogmcacbdefwiwcyjxp';
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, '..');
const MODO_ANTIGO = process.argv.includes('--upsert');

const chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
const SERVICE = chaves.find((k) => k.name === 'service_role').api_key;
const PUB = (fs.readFileSync(path.join(RAIZ, 'assets/js/astral.js'), 'utf8')
  .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];

const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
const req = async (c, o = {}) => {
  const r = await fetch(BASE + c, { ...o, headers: { ...admin, ...(o.headers || {}) } });
  const t = await r.text();
  try { return { status: r.status, corpo: t ? JSON.parse(t) : null }; } catch { return { status: r.status, corpo: t }; }
};

let falhas = 0;
const ok = (t, e) => console.log('  OK    ' + t.padEnd(52) + (e ?? ''));
const nok = (t, e) => { console.log('  FALHA ' + t.padEnd(52) + (e ?? '')); falhas++; };

let uid = null;
(async () => {
  console.log('TESTA-CONCORRENCIA' + (MODO_ANTIGO ? '  [modo ANTIGO: upsert que substitui]' : '  [mesclagem no banco]') + '\n');

  /* ── usuario descartavel + sessao ──────────────────────────────────────── */
  const email = `conc-${Date.now()}@astral-teste.local`;
  const c = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'T!' + crypto.randomUUID(), email_confirm: true }),
  });
  uid = c.corpo?.id;
  if (!uid) throw new Error('nao criei o usuario: ' + JSON.stringify(c.corpo).slice(0, 200));

  const l = await req('/auth/v1/admin/generate_link', {
    method: 'POST', body: JSON.stringify({ type: 'magiclink', email }),
  });
  const v = await fetch(`${BASE}/auth/v1/verify?token=${l.corpo.hashed_token}&type=magiclink&redirect_to=${BASE}`,
    { headers: { apikey: PUB }, redirect: 'manual' });
  const token = ((v.headers.get('location') || '').match(/access_token=([^&]+)/) || [])[1];
  if (!token) throw new Error('nao consegui a sessao');
  const comoUsuario = { apikey: PUB, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  /* ── o estado que as DUAS telas carregaram ─────────────────────────────── */
  const INICIAL = {
    xp: 1000, streak: 3, horas: 10,
    edital: { nome: 'PMERJ 2026' },
    materias: [
      { nome: 'Português', peso: 30, progresso: 40 },
      { nome: 'Matemática', peso: 25, progresso: 20 },
    ],
    cronograma_hoje: [], badges: ['primeiro_edital'], tag_escolhida: null,
  };

  const gravar = async (corpo) => {
    if (MODO_ANTIGO) {
      return fetch(`${BASE}/rest/v1/progresso?on_conflict=usuario_id`, {
        method: 'POST',
        headers: { ...comoUsuario, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ usuario_id: uid, ...corpo }),
      });
    }
    return fetch(`${BASE}/rest/v1/rpc/salvar_progresso`, {
      method: 'POST', headers: comoUsuario,
      body: JSON.stringify({
        p_xp: corpo.xp, p_streak: corpo.streak, p_horas: corpo.horas,
        p_edital: corpo.edital, p_materias: corpo.materias,
        p_cronograma_hoje: corpo.cronograma_hoje, p_badges: corpo.badges,
        p_tag_escolhida: corpo.tag_escolhida,
      }),
    });
  };

  const r0 = await gravar(INICIAL);
  if (!r0.ok) throw new Error('gravacao inicial falhou: ' + r0.status + ' ' + (await r0.text()).slice(0, 200));

  /* ── TELA A: estudou Português, ganhou XP e uma conquista ──────────────── */
  const telaA = {
    ...INICIAL,
    xp: 1500, horas: 12,
    materias: [
      { nome: 'Português', peso: 30, progresso: 70 },
      { nome: 'Matemática', peso: 25, progresso: 20 },
    ],
    badges: ['primeiro_edital', 'maratonista'],
  };

  /* ── TELA B: partiu do MESMO estado inicial, estudou Matemática ────────── */
  const telaB = {
    ...INICIAL,
    xp: 1200, horas: 11,
    materias: [
      { nome: 'Português', peso: 30, progresso: 40 },
      { nome: 'Matemática', peso: 25, progresso: 60 },
    ],
    badges: ['primeiro_edital', 'madrugador'],
  };

  await gravar(telaA);
  await gravar(telaB);   // B salva DEPOIS -- e aqui que o dado sumia

  /* ── o que sobrou no banco ─────────────────────────────────────────────── */
  const f = await req(`/rest/v1/progresso?usuario_id=eq.${uid}&select=*`);
  const d = (f.corpo || [])[0];
  if (!d) throw new Error('nao achei o progresso gravado');

  const prog = (nome) => (d.materias || []).find((m) => m.nome === nome)?.progresso ?? -1;
  const temBadge = (b) => (d.badges || []).includes(b);

  console.log('  A tela A estudou Português (40→70) e ganhou "maratonista".');
  console.log('  A tela B estudou Matemática (20→60) e ganhou "madrugador", e salvou DEPOIS.\n');

  const checagens = [
    ['o XP mais alto sobreviveu',            d.xp === 1500,                   'xp = ' + d.xp + ' (A=1500, B=1200)'],
    ['as horas mais altas sobreviveram',     Number(d.horas) === 12,          'horas = ' + d.horas],
    ['o progresso de Português (tela A)',    prog('Português') === 70,        prog('Português') + '%'],
    ['o progresso de Matemática (tela B)',   prog('Matemática') === 60,       prog('Matemática') + '%'],
    ['a conquista da tela A não se perdeu',  temBadge('maratonista'),         JSON.stringify(d.badges)],
    ['a conquista da tela B também está lá', temBadge('madrugador'),          ''],
    ['nenhuma conquista duplicada',          new Set(d.badges).size === (d.badges || []).length, (d.badges || []).length + ' badge(s)'],
  ];
  for (const [t, bom, extra] of checagens) (bom ? ok : nok)(t, extra);

  console.log('\n' + '='.repeat(72));
  if (MODO_ANTIGO) {
    console.log(falhas
      ? 'Correto: o jeito ANTIGO perde dados (' + falhas + ' de ' + checagens.length + '). Era esse o defeito.'
      : '⚠️ o jeito antigo passou -- o teste nao esta encenando a corrida direito.');
    process.exitCode = falhas ? 0 : 1;
  } else {
    console.log(falhas ? falhas + ' falha(s): a mesclagem NAO esta protegendo.'
                       : 'Nada se perdeu. Duas telas podem estudar ao mesmo tempo.');
    process.exitCode = falhas ? 1 : 0;
  }
})()
  .catch((e) => { console.error('\n❌ ' + e.message); process.exitCode = 1; })
  .finally(async () => {
    if (uid) await req(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {});
    console.log('\n  (usuario de teste apagado)');
  });
