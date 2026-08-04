/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-VELOCIDADE — a tela espera o banco para mostrar quem e o usuario?

   POR QUE EXISTE (03/08/2026)
   O Lucas disse: "clico em outro menu e ele carrega demoradamente". Medido:
   cada pagina do app fazia DUAS idas ao banco em Sao Paulo (52ms a 553ms cada)
   para ler a MESMA linha -- uma da divisa.js, outra da propria pagina -- e o
   nome do usuario, que vem da SESSAO e ja esta no navegador, esperava as duas.

   Este teste tranca as tres coisas que foram consertadas:
     1. o nome aparece sem esperar o banco
     2. a divisa aparece com a copia do navegador e se corrige depois
     3. dois leitores no mesmo carregamento viram UMA leitura

   COMO ELE CONSEGUE MEDIR ISSO SEM LOGIN
   O captcha impede login automatizado, entao o `astral.js` e substituido por
   um duble (tools/testes/astral-duble.js) que finge uma sessao e um banco
   LENTO de proposito, 800ms. Com o banco lento, esperar ou nao esperar deixa
   de ser sutileza e vira 800ms de diferenca.

   ⚠️ ELE SABE REPROVAR, e isso foi verificado:
        node tools/testa-velocidade.js --antigo
      roda o mesmo teste contra a versao anterior dos dois arquivos (tirada do
      git) e ela FALHA, com 865ms e 2 leituras. Um teste que nunca reprovou nao
      prova conserto nenhum -- foi assim que se perderam 3 dias no bug do nome.

   USO
     node tools/testa-velocidade.js            testa o codigo do disco
     node tools/testa-velocidade.js --antigo   testa o codigo do ultimo commit

   Precisa do playwright (npx playwright install chromium). Sai com codigo 1
   se qualquer checagem falhar.
   ═══════════════════════════════════════════════════════════════════════════ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/* O projeto NAO tem package.json nem node_modules, de proposito -- e essa
   decisao nao vai mudar por causa de um teste. Entao o playwright e procurado
   onde o `npx` o deixa, no cache do npm. Se nao houver, o teste se declara
   pulado em vez de quebrar quem so queria rodar as outras ferramentas. */
function acharPlaywright() {
  try { return require('playwright'); } catch { /* segue procurando */ }

  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
    : path.join(require('os').homedir(), '.npm', '_npx');
  if (!fs.existsSync(base)) return null;

  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, 'node_modules', 'playwright');
    if (fs.existsSync(alvo)) {
      try { return require(alvo); } catch { /* tenta o proximo */ }
    }
  }
  return null;
}

const pw = acharPlaywright();
if (!pw) {
  console.log('TESTA-VELOCIDADE — pulado: playwright nao encontrado.');
  console.log('Para habilitar (nao instala nada no projeto):');
  console.log('  npx --yes playwright install chromium');
  process.exit(0);
}
const { chromium } = pw;

const RAIZ = path.resolve(__dirname, '..');
const TESTES = path.join(__dirname, 'testes');
const PORTA = 8799;
const ANTIGO = process.argv.includes('--antigo');
const ATRASO_BANCO = 800;   // tem de bater com o duble
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

/* Quando se pede --antigo, os dois arquivos vem do ultimo commit. */
const doGit = {};
if (ANTIGO) {
  for (const f of ['divisa.js', 'estado.js']) {
    doGit[f] = execFileSync('git', ['show', 'HEAD:assets/js/' + f], { cwd: RAIZ, maxBuffer: 1 << 24 });
  }
}

const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let corpo, tipo = 'application/octet-stream';

  if (u === '/teste.html') { corpo = fs.readFileSync(path.join(TESTES, 'pagina-duble.html')); tipo = TIPOS['.html']; }
  else if (u === '/assets/js/astral.js') { corpo = fs.readFileSync(path.join(TESTES, 'astral-duble.js')); tipo = TIPOS['.js']; }
  else {
    const base = path.basename(u);
    if (ANTIGO && doGit[base] && u.startsWith('/assets/js/')) { corpo = doGit[base]; tipo = TIPOS['.js']; }
    else {
      const f = path.join(RAIZ, u);
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('404'); }
      corpo = fs.readFileSync(f);
      tipo = TIPOS[path.extname(f)] || tipo;
    }
  }
  r.writeHead(200, { 'Content-Type': tipo });
  r.end(corpo);
});

(async () => {
  await new Promise((r) => servidor.listen(PORTA, r));
  const b = await chromium.launch();
  const ctx = await b.newContext();

  /* Semeia a copia do navegador, como teria quem ja usou o app.
     XP proposital diferente do "banco": e assim que se ve a correcao chegar. */
  await ctx.addInitScript(() => {
    localStorage.setItem('astral_dados_u-teste', JSON.stringify({
      xp: 900, streak: 1, horas: 2, materias: [{ nome: 'Portugues' }],
      cronogramaHoje: [], edital: 'PMERJ', badges: [], tagEscolhida: null,
    }));
  });

  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', (e) => erros.push(e.message));

  const t0 = Date.now();
  await pg.goto('http://localhost:' + PORTA + '/teste.html');

  const quando = async (sel, cond) => {
    await pg.waitForFunction(([s, c]) => {
      const el = document.querySelector(s);
      return el && new Function('t', 'return ' + c)(el.textContent.trim());
    }, [sel, cond], { timeout: 8000 }).catch(() => {});
    return Date.now() - t0;
  };

  const tNome = await quando('#user-name', 't && t !== "Carregando…"');
  const tDivisa = await quando('[data-divisa]', 't && t.length > 0');
  const cedo = ((await pg.textContent('[data-divisa]')) || '').replace(/\s+/g, ' ').trim();

  await pg.waitForTimeout(ATRASO_BANCO + 800);
  const tarde = ((await pg.textContent('[data-divisa]')) || '').replace(/\s+/g, ' ').trim();
  const leituras = await pg.evaluate(() => window.__LEITURAS);
  const nome = ((await pg.textContent('#user-name')) || '').trim();
  const saud = ((await pg.textContent('#greeting')) || '').trim();

  const LIMITE = 500;   // metade do atraso do banco, com folga
  const checagens = [
    ['nome aparece sem esperar o banco', tNome < LIMITE, tNome + 'ms (banco leva ' + ATRASO_BANCO + 'ms)'],
    ['nome completo, com o "s" final', nome === 'Lucas', '"' + nome + '"'],
    ['saudacao preenchida', /Lucas\.$/.test(saud), '"' + saud + '"'],
    ['divisa aparece sem esperar o banco', tDivisa < LIMITE, tDivisa + 'ms'],
    ['divisa se corrige quando o banco chega', cedo !== tarde, cedo + ' -> ' + tarde],
    ['dois leitores, UMA leitura (carona)', leituras === 1, leituras + ' leitura(s)'],
    ['nenhum erro de JavaScript', erros.length === 0, erros.join(' | ') || 'nenhum'],
  ];

  console.log('TESTA-VELOCIDADE' + (ANTIGO ? '  [codigo do ultimo commit]' : '  [codigo do disco]') + '\n');
  for (const [n, ok, extra] of checagens) console.log('  ' + (ok ? 'OK    ' : 'FALHA ') + n.padEnd(40) + extra);

  const todas = checagens.every((c) => c[1]);
  console.log('\n' + '='.repeat(66));
  if (ANTIGO) {
    console.log(todas
      ? 'ATENCAO: a versao antiga PASSOU -- entao este teste nao esta medindo\n'
        + 'o que deveria. Teste que nao sabe reprovar nao prova conserto nenhum.'
      : 'Correto: a versao antiga reprova. O teste sabe distinguir.');
    process.exitCode = todas ? 1 : 0;
  } else {
    console.log(todas ? 'TUDO CERTO — a tela nao espera o banco para mostrar quem e o usuario.'
                      : 'FALHOU — a tela voltou a esperar o banco.');
    process.exitCode = todas ? 0 : 1;
  }

  await b.close();
  servidor.close();
})();
