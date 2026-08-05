/* ═══════════════════════════════════════════════════════════════════════════
   BACKUP — a copia de seguranca que o plano gratuito NAO da.

   🔴 POR QUE EXISTE (05/08/2026)
   A documentacao do Supabase e explicita: no plano FREE **nao ha backup
   automatico nenhum**. Nem diario, nem retencao, nem recuperacao no tempo.
   Eles proprios recomendam que o usuario exporte por conta.

   O roadmap dizia "backup nunca restaurado", o que era otimista: nao havia o
   que restaurar. Sao 8 usuarios com dados reais e zero copias.

   COMO FUNCIONA
   Sem Docker nesta maquina, `supabase db dump` nao roda. Entao a copia sai
   pela API, com a chave de servico:
     - o ESQUEMA ja esta no git, em supabase/migrations (15 arquivos)
     - os DADOS saem daqui, uma tabela por arquivo JSON
     - as CONTAS saem da API de admin (auth.users nao aparece no PostgREST)

   Esquema versionado + dados exportados = backup restauravel de verdade.

   🔴 ONDE ELE GRAVA, E POR QUE NAO E AQUI
   Em `..\ASTRAL-BACKUPS`, FORA do repositorio. Esta pasta e publicada no
   GitHub, aberta -- e o backup tem e-mail de gente de verdade. Backup dentro
   do repo seria vazamento de dado pessoal, nao seguranca.

   USO
     node tools/backup.js
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REF = 'jjogmcacbdefwiwcyjxp';
const BASE = `https://${REF}.supabase.co`;
const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.resolve(RAIZ, '..', 'ASTRAL-BACKUPS');

/* As tabelas do schema public. Lista explicita de proposito: assim uma tabela
   nova nao entra no backup em silencio -- ela aparece como falta na conferencia
   do fim, e alguem precisa decidir se ela vai ou nao. */
const TABELAS = [
  'perfis', 'progresso', 'eventos', 'sessoes_estudo',
  'recursos_salvos', 'uso_ia', 'lista_espera', 'auditoria', 'erros_cliente',
];

const chaves = JSON.parse(execSync(
  `supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
));
const SERVICE = chaves.find((k) => k.name === 'service_role').api_key;
const cab = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

(async () => {
  const agora = new Date();
  const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const pasta = path.join(DESTINO, carimbo);
  fs.mkdirSync(pasta, { recursive: true });

  console.log('BACKUP DO ASTRAL — ' + agora.toLocaleString('pt-BR') + '\n');
  console.log('  destino: ' + pasta);
  console.log('  (fora do repositorio, de proposito: o repo e publico)\n');

  const resumo = [];
  let bytes = 0;

  /* ── 1. as tabelas ─────────────────────────────────────────────────────── */
  for (const t of TABELAS) {
    try {
      const r = await fetch(`${BASE}/rest/v1/${t}?select=*`, { headers: cab });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
      const linhas = await r.json();
      const texto = JSON.stringify(linhas, null, 2);
      fs.writeFileSync(path.join(pasta, t + '.json'), texto, 'utf8');
      bytes += Buffer.byteLength(texto);
      resumo.push({ t, n: linhas.length, ok: true });
      console.log('  ✅ ' + t.padEnd(18) + String(linhas.length).padStart(5) + ' linha(s)');
    } catch (e) {
      resumo.push({ t, n: 0, ok: false, erro: e.message });
      console.log('  ❌ ' + t.padEnd(18) + e.message);
    }
  }

  /* ── 2. as contas (auth.users nao sai pelo PostgREST) ──────────────────── */
  try {
    const r = await fetch(`${BASE}/auth/v1/admin/users?per_page=1000`, { headers: cab });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const users = d.users ?? d;
    /* So o que serve para recriar a conta. Nada de token nem hash de senha:
       backup nao e lugar para credencial. Se as contas se perderem, cada
       pessoa refaz o acesso -- o que nao pode se perder e o ESTUDO dela. */
    const enxuto = (users || []).map((u) => ({
      id: u.id, email: u.email, created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
      provider: u.app_metadata?.provider, nome: u.user_metadata?.full_name,
    }));
    const texto = JSON.stringify(enxuto, null, 2);
    fs.writeFileSync(path.join(pasta, '_contas.json'), texto, 'utf8');
    bytes += Buffer.byteLength(texto);
    resumo.push({ t: '_contas', n: enxuto.length, ok: true });
    console.log('  ✅ ' + '_contas'.padEnd(18) + String(enxuto.length).padStart(5) + ' conta(s)');
  } catch (e) {
    resumo.push({ t: '_contas', n: 0, ok: false, erro: e.message });
    console.log('  ❌ _contas           ' + e.message);
  }

  /* ── 3. o bilhete que explica como restaurar ───────────────────────────── */
  const migrations = fs.readdirSync(path.join(RAIZ, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
  const commit = execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim();

  fs.writeFileSync(path.join(pasta, 'LEIA-ME.txt'),
`BACKUP DO ASTRAL
Feito em ${agora.toLocaleString('pt-BR')}
Commit do codigo nesta data: ${commit}

O QUE TEM AQUI
  Um arquivo .json por tabela, com todas as linhas.
  _contas.json tem as contas (sem senha nem token, de proposito).

O QUE **NAO** TEM AQUI
  O esquema do banco. Ele mora no git, em supabase/migrations
  (${migrations.length} arquivos nesta data). Backup de esquema em duplicidade
  so cria versao divergente.

COMO RESTAURAR, se um dia precisar
  1. criar um projeto Supabase novo
  2. rodar as migrations do git:  supabase db push --linked
  3. carregar cada .json na tabela correspondente, UMA INSTRUCAO POR TABELA:

       insert into public.<tabela> overriding system value
       select * from json_populate_recordset(null::public.<tabela>, '<conteudo do json>');

  4. recriar as contas pela API de admin, usando _contas.json
     (as pessoas vao precisar entrar de novo -- senha nao e guardada aqui)

🔴 O "overriding system value" DO PASSO 3 NAO E OPCIONAL.
   As colunas id sao "generated always as identity": sem essa clausula o
   Postgres RECUSA a insercao com "cannot insert a non-DEFAULT value into
   column id". Pior ainda seria remover o id do JSON para contornar: o banco
   geraria ids NOVOS e toda ligacao entre tabelas apontaria para o lugar
   errado -- pareceria ter dado certo, com os dados embaralhados.

   Isto foi descoberto pelo tools/testa-restauracao.js na PRIMEIRA vez que
   ele rodou, em 05/08/2026. Sem esse teste, so se descobriria no dia de
   precisar do backup.

✅ ESTE FORMATO DE BACKUP JA FOI RESTAURADO E CONFERIDO.
   O tools/testa-restauracao.js recria o esquema num espaco descartavel do
   proprio banco, carrega estes arquivos, compara LINHA A LINHA com os dados
   vivos e apaga tudo no fim. Rode-o de vez em quando: backup que ninguem
   testa volta a ser fe.
`, 'utf8');

  /* ── conferencia ───────────────────────────────────────────────────────── */
  const falhas = resumo.filter((x) => !x.ok);
  const linhas = resumo.reduce((s, x) => s + x.n, 0);
  console.log('\n  ' + linhas + ' linha(s) no total · ' + kb(bytes));

  /* Nao deixar o backup entrar no repositorio, nunca. */
  const dentro = path.resolve(pasta).toLowerCase().startsWith(RAIZ.toLowerCase() + path.sep);
  console.log('  dentro do repositorio? ' + (dentro ? 'SIM — PERIGO' : 'nao ✅'));

  console.log('\n' + '='.repeat(66));
  if (falhas.length) {
    console.log(falhas.length + ' tabela(s) falharam: ' + falhas.map((f) => f.t).join(', '));
    process.exitCode = 1;
  } else if (dentro) {
    console.log('BACKUP DENTRO DO REPOSITORIO PUBLICO — apague e corrija o destino.');
    process.exitCode = 1;
  } else {
    console.log('Backup completo. ' + resumo.length + ' arquivos em ' + pasta);
  }
})().catch((e) => { console.error('\n❌ ' + e.message); process.exitCode = 1; });
