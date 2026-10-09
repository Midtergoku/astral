/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-RESTAURACAO — o backup volta mesmo?

   POR QUE EXISTE (05/08/2026)
   O plano gratuito do Supabase nao faz backup nenhum, entao tools/backup.js
   passou a exportar tudo. Mas exportar nao e a mesma coisa que conseguir
   voltar: **backup que nunca foi restaurado e fe, nao e backup.**

   COMO ELE PROVA, sem arriscar nada
     1. cria um esquema DESCARTAVEL no proprio banco (restauracao_teste_<hora>)
     2. recria cada tabela ali com `LIKE public.x INCLUDING ALL` -- mesma
        estrutura, mesmos tipos, mesmas restricoes
     3. carrega o JSON do backup com json_populate_recordset, que faz a
        conversao de tipo DE VERDADE (data, jsonb, numerico)
     4. compara linha a linha com a tabela viva
     5. apaga o esquema, sempre -- inclusive se algo falhar no meio

   NADA e escrito em `public`. A producao nao e tocada em momento nenhum.

   ⚠️ Precisa da API de gerenciamento (a unica que roda SQL de estrutura), e
   por isso do token do Windows -- ver tools/token-supabase.ps1.

   USO
     node tools/testa-restauracao.js            usa o backup mais recente
     node tools/testa-restauracao.js <pasta>    usa um backup especifico
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { REF, reescrever } = require("./testes/alvo");   // 09/10/2026 (COD-02): ASTRAL_DEV=1 -> astral-dev (tools/testes/alvo.js)
const RAIZ = path.resolve(__dirname, '..');
const BACKUPS = path.resolve(RAIZ, '..', 'ASTRAL-BACKUPS');

/* ── o token, lido pelo script isolado; nunca vai para arquivo ──────────── */
let TOKEN;
try {
  TOKEN = execFileSync('powershell', ['-NoProfile', '-File', path.join(__dirname, 'token-supabase.ps1')],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
} catch (e) {
  console.log('Nao consegui o token de gerenciamento.');
  console.log((e.stderr || e.message || '').toString().split('\n')[0]);
  process.exit(1);
}

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error('SQL falhou (HTTP ' + r.status + '): ' + texto.slice(0, 300));
  try { return JSON.parse(texto); } catch { return texto; }
}

/* ── qual backup usar ───────────────────────────────────────────────────── */
let pasta = process.argv[2];
if (!pasta) {
  if (!fs.existsSync(BACKUPS)) { console.log('Nao ha backups em ' + BACKUPS); process.exit(1); }
  // 🔴 30/09/2026: so pastas com DATA no nome. A pasta `simulacao/` (copias do
  // simula-edital.js, desde 27/09) vem depois das datas na ordem alfabetica, e o
  // teste passou a "restaurar" um arquivo com id de usuario como se fosse tabela.
  const dirs = fs.readdirSync(BACKUPS)
    .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d) && fs.statSync(path.join(BACKUPS, d)).isDirectory()).sort();
  if (!dirs.length) { console.log('Nao ha backups em ' + BACKUPS); process.exit(1); }
  pasta = path.join(BACKUPS, dirs[dirs.length - 1]);
}
if (!fs.existsSync(pasta)) { console.log('Pasta nao existe: ' + pasta); process.exit(1); }

const ESQUEMA = 'restauracao_teste_' + Date.now();
let falhas = 0;
const ok = (t, extra) => console.log('  OK    ' + t.padEnd(46) + (extra ?? ''));
const nok = (t, extra) => { console.log('  FALHA ' + t.padEnd(46) + (extra ?? '')); falhas++; };

(async () => {
  console.log('TESTA-RESTAURACAO\n');
  console.log('  backup: ' + pasta);
  console.log('  esquema descartavel: ' + ESQUEMA + '\n');

  const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  if (!arquivos.length) { console.log('  Nenhuma tabela no backup.'); process.exit(1); }

  try {
    await sql(`create schema "${ESQUEMA}";`);

    for (const arq of arquivos) {
      const tabela = arq.replace(/\.json$/, '');
      const linhas = JSON.parse(fs.readFileSync(path.join(pasta, arq), 'utf8'));

      /* Estrutura identica a da tabela viva -- tipos, restricoes, padroes.
         Se o backup nao couber aqui, tambem nao caberia num banco novo. */
      await sql(`create table "${ESQUEMA}"."${tabela}" (like public."${tabela}" including all);`);

      /* 03/10/2026: so as colunas que o BACKUP tem. Uma coluna criada depois da
         foto (ex.: sessoes_estudo.habilidades, roadmap 3.7, NOT NULL com padrao)
         viria nula pelo json_populate_recordset e derrubaria a restauracao --
         descoberto na bateria, com o backup feito minutos antes da migration.
         Coluna que o arquivo nao tem pega o PADRAO da tabela. */
      /* 04/10/2026: e MENOS as colunas CALCULADAS pelo banco (`generated always as
         (...) stored` -- sessoes_estudo.dia, roadmap 3.9). O banco RECUSA valor vindo
         de fora ("cannot insert a non-DEFAULT value into column dia") e as recalcula
         sozinho. Descoberto pela bateria no primeiro backup feito depois da 3.9. */
      const calculadas = (await sql(`select column_name as c from information_schema.columns where table_schema = 'public' and table_name = '${tabela}' and is_generated = 'ALWAYS';`)).map((x) => x.c);
      const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))].filter((c) => !calculadas.includes(c)).map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");

      if (linhas.length) {
        /* json_populate_recordset faz a conversao de tipo DE VERDADE: texto
           vira data, objeto vira jsonb, numero vira numeric. E exatamente aqui
           que um backup ruim quebraria. */
        const json = JSON.stringify(linhas).replace(/'/g, "''");

        /* 🔴 `overriding system value` NAO E DETALHE, e foi este teste que
           descobriu (05/08/2026, primeira execucao).

           As colunas `id` sao `generated always as identity`: o banco RECUSA
           que se escreva um id vindo de fora. Sem esta clausula, a restauracao
           falha com "cannot insert a non-DEFAULT value into column id".

           E isso importa muito: sem ela, restaurar geraria ids NOVOS, e toda
           ligacao entre tabelas apontaria para o lugar errado. O backup pareceria
           ter funcionado e os dados estariam embaralhados -- pior que falhar.

           Esta linha esta repetida no LEIA-ME de cada backup, porque quem for
           restaurar de verdade talvez nao tenha esta ferramenta em maos. */
        await sql(
          `insert into "${ESQUEMA}"."${tabela}" (${colunas}) overriding system value ` +
          `select ${colunas} from json_populate_recordset(null::"${ESQUEMA}"."${tabela}", '${json}'::json);`,
        );
      }

      /* ── a conferencia: mesma quantidade E mesmo conteudo ── */
      const [{ n: nRest }] = await sql(`select count(*)::int as n from "${ESQUEMA}"."${tabela}";`);
      const [{ n: nVivo }] = await sql(`select count(*)::int as n from public."${tabela}";`);

      if (nRest !== linhas.length) {
        nok(tabela, 'inseriu ' + nRest + ' de ' + linhas.length + ' linhas do backup');
        continue;
      }
      if (nRest !== nVivo) {
        /* Diferenca aqui nao e necessariamente defeito: o backup e uma foto de
           um instante, e a vida continuou. Aviso, nao falha. */
        ok(tabela, nRest + ' linhas restauradas  (⚠️ a tabela viva tem ' + nVivo + ' agora)');
        continue;
      }

      /* Comparacao de conteudo, em DUAS perguntas diferentes.

         🔴 30/09/2026: ate aqui so havia a segunda, e ela dava FALHA sempre
         que alguem estudava depois do backup -- o backup e de um dia, o banco
         vivo e de hoje, e `progresso` muda toda vez que alguem estuda. Era
         alarme falso, e alarme falso ensina a ignorar o alarme.

         1. O que o teste promete -- O BACKUP VOLTA IGUAL? -- se responde
            comparando o restaurado com o PROPRIO ARQUIVO, nos dois sentidos.
            Isto e falha de verdade: o backup perdeu ou trocou algo.
         2. Restaurado x banco de hoje: so informa quanto mudou desde a foto. */
      const fonte = `json_populate_recordset(null::"${ESQUEMA}"."${tabela}", '${JSON.stringify(linhas).replace(/'/g, "''")}'::json)`;
      const [{ n: perdidas }] = await sql(
        `select count(*)::int as n from (select ${colunas} from ${fonte} except select ${colunas} from "${ESQUEMA}"."${tabela}") d;`);
      const [{ n: trocadas }] = await sql(
        `select count(*)::int as n from (select ${colunas} from "${ESQUEMA}"."${tabela}" except select ${colunas} from ${fonte}) d;`);
      if (perdidas > 0 || trocadas > 0) {
        nok(tabela, `o backup NAO voltou igual: ${perdidas} linha(s) do arquivo sumiram, ${trocadas} voltaram trocadas`);
        continue;
      }
      const [{ n: mudouDepois }] = await sql(
        `select count(*)::int as n from (` +
        `  select * from "${ESQUEMA}"."${tabela}" except select * from public."${tabela}"` +
        `) d;`,
      );
      ok(tabela, nRest + ' linha(s), voltaram iguais ao arquivo'
        + (mudouDepois ? `  (${mudouDepois} mudaram no banco depois do backup -- esperado)` : ', e iguais ao banco de hoje'));
    }

    /* ── as contas: nao dá para recriar aqui, mas dá para conferir ── */
    const arqContas = path.join(pasta, '_contas.json');
    if (fs.existsSync(arqContas)) {
      const contas = JSON.parse(fs.readFileSync(arqContas, 'utf8'));
      const comEmail = contas.filter((c) => c.email && c.id).length;
      if (comEmail === contas.length && contas.length > 0) {
        ok('_contas', contas.length + ' conta(s) com id e e-mail — dá para recriar');
      } else {
        nok('_contas', comEmail + ' de ' + contas.length + ' utilizáveis');
      }
    }
  } catch (e) {
    nok('erro no meio da restauracao', e.message.slice(0, 200));
  } finally {
    /* Apagar SEMPRE. Esquema de teste esquecido no banco de producao e sujeira
       que ninguem lembra de onde veio seis meses depois. */
    try {
      await sql(`drop schema if exists "${ESQUEMA}" cascade;`);
      console.log('\n  (esquema descartavel apagado)');
    } catch (e) {
      console.log('\n  🔴 NAO CONSEGUI APAGAR o esquema ' + ESQUEMA + ' — apague a mao: ' + e.message.slice(0, 120));
      falhas++;
    }
  }

  console.log('\n' + '='.repeat(70));
  if (falhas) {
    console.log(falhas + ' problema(s). O BACKUP NAO ESTA CONFIAVEL — resolver antes de precisar dele.');
    process.exitCode = 1;
  } else {
    console.log('O backup foi restaurado e conferido linha a linha. Ele funciona.');
  }
})().catch((e) => { console.error('\n❌ ' + e.message); process.exitCode = 1; });
