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
// ASTRAL_BACKUPS_DIR: so para o teste da faxina (tools/testa-faxina-backup.js), numa pasta de mentira
const DESTINO = process.env.ASTRAL_BACKUPS_DIR ? path.resolve(process.env.ASTRAL_BACKUPS_DIR) : path.resolve(RAIZ, '..', 'ASTRAL-BACKUPS');

/* As tabelas do schema public. Lista explicita de proposito: assim uma tabela
   nova nao entra no backup em silencio -- ela aparece como falta na conferencia
   do fim, e alguem precisa decidir se ela vai ou nao.

   🔴 30/09/2026 -- A CONFERENCIA PROMETIDA ACIMA NUNCA TINHA SIDO ESCRITA.
   Desde 19/09 nasceram 12 tabelas e NENHUMA entrava no backup: as 1.980
   questoes do Banco, as respostas e o caderno de erros dos alunos, as
   conquistas gravadas, as habilidades escolhidas, os editais e guias
   guardados. O comentario dizia "aparece como falta" e nada aparecia --
   comentario nao e codigo. Agora ha `tabelasDoBanco()`, que pergunta ao
   proprio servidor quais tabelas existem, e o backup FALHA se alguma ficar
   de fora sem estar em IGNORADAS com o motivo escrito. */
const TABELAS = [
  'perfis', 'progresso', 'eventos', 'sessoes_estudo',
  'recursos_salvos', 'uso_ia', 'lista_espera', 'auditoria', 'erros_cliente',
  // acrescentadas em 30/09/2026 (existiam desde 19-29/09 sem backup):
  'conquistas', 'habilidades_escolhidas',
  'questoes', 'questoes_minhas', 'questoes_servidas', 'respostas',
  'editais_lidos', 'guias_por_edital',
  'catalogo_condecoracoes', 'catalogo_divisas', 'catalogo_habilidades',
  'administradores', 'materias_conhecidas',
  'taf_registros',                                    // 30/09/2026, o TAF
  'consentimentos',                                   // 02/10/2026, o aceite (LGL-01)
  'questoes_reportadas',                              // 03/10/2026, "reportar erro" (BAN-02)
  'editais_reportados',                               // 03/10/2026, "a leitura esta errada" (EDI-03)
  'funil',                                            // 03/10/2026, o funil (NEG-01)
  // 09/10/2026, o vigia (3.15). Esqueci de declarar no dia -- a trava deste script pegou no 3.17.
  'falhas_servidor', 'vigia_alertas',
  'aprovacoes',                                       // 10/10/2026, o "Passei!" (3.22)
  'assuntos_estudados',                               // 10/10/2026, os assuntos marcados como estudados
];
// Tabela que existe e NAO vai para o backup, com o porque. Hoje: nenhuma.
const IGNORADAS = {
  // 03/10/2026 (roadmap 3.5): contagem de envios de erro por hora/dia. Vive 2 dias,
  // nao tem dado de ninguem (o IP vai embaralhado) e restaurar contagem velha nao serve.
  erros_cliente_limite: 'contagem efemera do registrar-erro (2 dias, sem dado pessoal)',
};

/* O PostgREST so entrega ate 1.000 linhas por pedido (max-rows do Supabase).
   Sem paginar, `questoes` (1.980) sairia CORTADA, e o arquivo pareceria
   completo. Pagina de 1.000 em 1.000 ate vir menos que isso. */
async function todasAsLinhas(t) {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`${BASE}/rest/v1/${t}?select=*`, { headers: { ...cab, Range: `${de}-${de + 999}`, 'Range-Unit': 'items' } });
    if (!r.ok && r.status !== 206) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const pagina = await r.json();
    todas.push(...pagina);
    if (pagina.length < 1000) return todas;
  }
}

/* Quais tabelas o servidor tem de verdade: o mapa que o proprio PostgREST
   publica (OpenAPI), lido com a chave de servico. */
async function tabelasDoBanco() {
  const r = await fetch(`${BASE}/rest/v1/`, { headers: cab });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const api = await r.json();
  return Object.keys(api.definitions || {}).sort();
}

const chaves = JSON.parse(execSync(
  `supabase projects api-keys --project-ref ${REF} -o json`,
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
));
const SERVICE = chaves.find((k) => k.name === 'service_role').api_key;
const cab = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

(async () => {
  // --so-faxina: nao copia nada, so aplica o prazo de 90 dias (o teste usa assim)
  if (process.argv.includes('--so-faxina')) { apagarCopiasVelhas(); return; }
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
      const linhas = await todasAsLinhas(t);
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
     (desde 02/10/2026 isto funciona num banco VAZIO -- provado por
      tools/testa-migrations-do-zero.js. Depois, recriar o aviso de lead
      novo, que leva segredo e nao mora no git:
        node tools/recria-webhook-lista.js --projeto <ref do projeto novo>)
  3. carregar cada .json na tabela correspondente, UMA INSTRUCAO POR TABELA:

       insert into public.<tabela> (<colunas do json>) overriding system value
       select <colunas do json> from json_populate_recordset(null::public.<tabela>, '<conteudo do json>');

     <colunas do json> = os nomes que aparecem nas linhas do arquivo, entre aspas
     ("id", "usuario_id", ...). NAO usar "select *": coluna criada DEPOIS deste
     backup viria nula e a carga falharia (03/10/2026, sessoes_estudo.habilidades).
     Assim ela pega o valor padrao da tabela.

     🔴 E TIRAR da lista as colunas CALCULADAS pelo banco (04/10/2026): hoje e so
     sessoes_estudo.dia. O banco recusa valor nelas ("cannot insert a non-DEFAULT
     value into column dia") e as recalcula sozinho. Para listar as de agora:
       select table_name, column_name from information_schema.columns
        where table_schema = 'public' and is_generated = 'ALWAYS';

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
  // A que faltava desde agosto: alguma tabela do servidor ficou de fora?
  try {
    const noBanco = await tabelasDoBanco();
    const fora = noBanco.filter((t) => !TABELAS.includes(t) && !(t in IGNORADAS));
    if (fora.length) {
      for (const t of fora) resumo.push({ t, n: 0, ok: false, erro: 'tabela do banco FORA do backup' });
      console.log('\n  ❌ tabela(s) do banco fora do backup: ' + fora.join(', '));
      console.log('     Acrescentar em TABELAS (ou em IGNORADAS, com o motivo).');
    } else {
      console.log(`\n  ✅ as ${noBanco.length} tabelas do banco estao no backup`);
    }
  } catch (e) {
    resumo.push({ t: '_conferencia', n: 0, ok: false, erro: e.message });
    console.log('\n  ❌ nao consegui conferir a lista de tabelas: ' + e.message);
  }
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
  /* 02/10/2026 (auditoria OPS-02): o resultado de CADA execucao fica gravado,
     para o checa-saude avisar quando o backup automatico parar. Backup que
     falha calado e o mesmo que backup nenhum. */
  registrarResultado({ ok: !falhas.length && !dentro, pasta, linhas, falhas: falhas.map((f) => f.t) });
  // So depois de um backup COMPLETO a faxina roda: copia velha nunca sai se a nova falhou.
  if (!falhas.length && !dentro) apagarCopiasVelhas();
})().catch((e) => { console.error('\n❌ ' + e.message); registrarResultado({ ok: false, erro: e.message }); process.exitCode = 1; });

/* 09/10/2026 (roadmap 3.18, decisao dele: "noventa dias e interessante (...) baseado no que as
   outras plataformas fazem"). Cada copia e o banco INTEIRO -- contas com e-mail, progresso,
   sessoes, respostas. Guardar para sempre contraria a LGPD (necessidade) e a Politica agora
   promete 90 dias. Pesquisado: ferramentas como CodeFactor e Delighted guardam 90 dias; o
   Supabase pago, 7 a 30.
   Regras: so pastas com nome de data (AAAA-MM-DD-HH-MM-SS) -- nada mais nesta pasta e tocado;
   a data vem do NOME, nao do relogio do arquivo; e as 7 mais novas ficam SEMPRE, mesmo velhas
   (se o backup parar por meses, sobra com o que restaurar). */
function apagarCopiasVelhas() {
  // dentro da funcao: no --so-faxina ela roda antes de o arquivo terminar de carregar
  const DIAS_DE_COPIA = 90, SEMPRE_FICAM = 7;
  try {
    const copias = fs.readdirSync(DESTINO)
      .filter((n) => /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(n) && fs.statSync(path.join(DESTINO, n)).isDirectory())
      .sort();                                              // nome de data: ordem alfabetica = ordem de tempo
    const limite = Date.now() - DIAS_DE_COPIA * 86400000;
    const velhas = copias.slice(0, Math.max(0, copias.length - SEMPRE_FICAM)).filter((n) => {
      const [a, m, d] = n.split('-').map(Number);
      return Date.UTC(a, m - 1, d) < limite;
    });
    for (const n of velhas) fs.rmSync(path.join(DESTINO, n), { recursive: true, force: true });
    console.log(`  faxina: ${velhas.length} copia(s) com mais de ${DIAS_DE_COPIA} dias apagada(s); ${copias.length - velhas.length} guardada(s)`);
  } catch (e) { console.log('  (faxina das copias velhas nao rodou: ' + e.message + ')'); }
}

/** Grava ..\ASTRAL-BACKUPS\ultimo-backup.json: quando foi e se deu certo. */
function registrarResultado(r) {
  try {
    fs.mkdirSync(DESTINO, { recursive: true });
    fs.writeFileSync(path.join(DESTINO, 'ultimo-backup.json'),
      JSON.stringify({ em: new Date().toISOString(), ...r }, null, 2), 'utf8');
  } catch { /* sem onde gravar: o codigo de saida ja diz que falhou */ }
}
