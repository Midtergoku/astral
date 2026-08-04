/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-ROLAGEM — a barra de rolagem pisca ao trocar de pagina?

   POR QUE EXISTE (04/08/2026)
   O Lucas: "quando clico em outro menu, rapidamente aparece aquela barra dos
   cantos, tanto na horizontal quanto na vertical".

   Ele estava vendo a animacao de troca de pagina. O miolo entra deslizando
   34px para o lado e sai deslizando 26px -- e conteudo empurrado para fora da
   janela faz o navegador mostrar a barra, mesmo que por um instante.

   COMO MEDE
   Observa quadro a quadro se a pagina passou a ter conteudo alem da janela,
   durante toda a animacao. Nao adianta olhar o estado final: no fim tudo volta
   ao lugar, e o defeito ja aconteceu.

   USO
     node tools/testa-rolagem.js
   ═══════════════════════════════════════════════════════════════════════════ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const TESTES = path.join(__dirname, 'testes');
const PORTA = 8805;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const iAntigo = process.argv.indexOf('--antigo');
const ANTIGO = iAntigo >= 0;
const REF = ANTIGO && process.argv[iAntigo + 1] && !process.argv[iAntigo + 1].startsWith('--')
  ? process.argv[iAntigo + 1] : 'HEAD';

function acharPlaywright() {
  try { return require('playwright'); } catch { /* segue */ }
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
    : path.join(require('os').homedir(), '.npm', '_npx');
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base)) {
    const alvo = path.join(base, d, 'node_modules', 'playwright');
    if (fs.existsSync(alvo)) { try { return require(alvo); } catch { /* proximo */ } }
  }
  return null;
}
const pw = acharPlaywright();
if (!pw) { console.log('TESTA-ROLAGEM — pulado: playwright nao encontrado.'); process.exit(0); }
const { chromium } = pw;

/* Em modo --antigo, o CSS vem do git: e assim que se prova que o teste
   reprova a versao com o defeito. */
let cssAntigo = null;
if (ANTIGO) {
  try {
    cssAntigo = execFileSync('git', ['show', REF + ':assets/css/base.css'],
      { cwd: RAIZ, maxBuffer: 1 << 24, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { console.log('nao consegui ler o base.css de ' + REF); process.exit(1); }
}

const servidor = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let corpo, tipo = 'application/octet-stream';
  if (u === '/assets/js/astral.js') { corpo = fs.readFileSync(path.join(TESTES, 'astral-duble.js')); tipo = TIPOS['.js']; }
  else if (ANTIGO && u === '/assets/css/base.css') { corpo = cssAntigo; tipo = TIPOS['.css']; }
  else {
    const f = path.join(RAIZ, u);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('404'); }
    corpo = fs.readFileSync(f);
    tipo = TIPOS[path.extname(f)] || tipo;
  }
  r.writeHead(200, { 'Content-Type': tipo });
  r.end(corpo);
});

const PAGINAS = ['dashboard.html', 'cronograma.html', 'progresso.html', 'conta.html'];

(async () => {
  await new Promise((r) => servidor.listen(PORTA, r));
  const b = await chromium.launch();
  console.log('TESTA-ROLAGEM' + (ANTIGO ? '  [CSS de ' + REF + ']' : '  [CSS do disco]') + '\n');

  let ruim = 0;
  for (const pagina of PAGINAS) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });

    /* Vigia quadro a quadro se sobra conteudo fora da janela. Comeca ANTES de
       a pagina montar, para nao perder o primeiro instante -- que e justamente
       quando a animacao de entrada roda. */
    await ctx.addInitScript(() => {
      localStorage.setItem('sb-jjogmcacbdefwiwcyjxp-auth-token', JSON.stringify({
        access_token: 'falso', token_type: 'bearer', expires_in: 3600,
        user: { id: 'u-teste', email: 'l@x.com', user_metadata: { full_name: 'Lucas Herdy' } },
      }));
      localStorage.setItem('astral_dados_u-teste', JSON.stringify({
        xp: 900, streak: 1, horas: 2, materias: [], cronogramaHoje: [],
        edital: 'PMERJ', badges: [], tagEscolhida: null,
      }));
      window.__SOBRA = { horizontal: 0, vertical: 0, quadros: 0, maiorH: 0, maiorV: 0, vFinal: 0 };
      const olhar = () => {
        const e = document.documentElement;
        if (e) {
          const h = e.scrollWidth - e.clientWidth;
          const v = e.scrollHeight - e.clientHeight;
          window.__SOBRA.quadros++;
          // 1px de folga: arredondamento de zoom nao e defeito
          if (h > 1) { window.__SOBRA.horizontal++; window.__SOBRA.maiorH = Math.max(window.__SOBRA.maiorH, h); }
          if (v > 1) { window.__SOBRA.vertical++; window.__SOBRA.maiorV = Math.max(window.__SOBRA.maiorV, v); }
          window.__SOBRA.vFinal = v;   // no fim: pagina longa de verdade rola mesmo
        }
        requestAnimationFrame(olhar);
      };
      requestAnimationFrame(olhar);
    });

    const pg = await ctx.newPage();
    await pg.goto('http://localhost:' + PORTA + '/' + pagina, { waitUntil: 'load' }).catch(() => {});
    await pg.waitForTimeout(1500);   // cobre a animacao inteira (420ms) com folga

    const s = await pg.evaluate(() => window.__SOBRA);
    /* Vertical de verdade e normal: pagina longa rola mesmo. O que se procura e
       a barra HORIZONTAL, que nenhuma tela do Astral deveria ter. */
    const ok = s.horizontal === 0;
    if (!ok) ruim++;
    /* Vertical PASSAGEIRA e o defeito: a pagina cresce durante a animacao e
       encolhe depois. Vertical que fica no fim e so pagina longa, normal. */
    const vPassageira = s.vertical > 0 && s.vFinal <= 1;

    console.log('  ' + (ok ? 'OK   ' : 'FALHA') + ' ' + pagina.padEnd(18)
      + 'horizontal: ' + String(s.horizontal).padStart(3) + '/' + s.quadros + ' quadros'
      + (s.maiorH ? ' (ate ' + s.maiorH + 'px)' : '')
      + '  |  vertical: ' + (s.vFinal > 1 ? 'a pagina rola mesmo (' + s.vFinal + 'px)'
        : vPassageira ? '⚠️ PASSAGEIRA, ate ' + s.maiorV + 'px' : 'nenhuma'));
    await ctx.close();
  }

  console.log('\n' + '='.repeat(72));
  if (ANTIGO) {
    console.log(ruim
      ? 'Correto: o CSS de ' + REF + ' reprova. O teste sabe distinguir.'
      : 'O CSS de ' + REF + ' tambem passou -- se ele JA tem o conserto, e esperado.');
    process.exitCode = 0;
  } else {
    console.log(ruim ? ruim + ' pagina(s) fazem a barra piscar.' : 'Nenhuma barra de rolagem indevida.');
    process.exitCode = ruim ? 1 : 0;
  }

  await b.close();
  servidor.close();
})();
