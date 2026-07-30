// Compara o CSS resolvido de cada pagina ANTES (git HEAD) e DEPOIS (disco).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const RAIZ = 'c:/Users/Lucas/Desktop/ASTRAL';
const GIT = process.env.LOCALAPPDATA + '\\Programs\\PortableGit\\cmd\\git.exe';
const APP = ['dashboard','progresso','conquistas','edital','calendario','recursos','questoes','cronometro'];

function splitRules(css) {
  const rules = []; let depth = 0, start = 0, inC = false;
  for (let i = 0; i < css.length; i++) {
    if (!inC && css[i] === '/' && css[i+1] === '*') { inC = true; i++; continue; }
    if (inC) { if (css[i] === '*' && css[i+1] === '/') { inC = false; i++; } continue; }
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { rules.push(css.slice(start, i+1)); start = i+1; } }
  }
  return rules.filter(r => r.trim());
}
const sem = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
                  .replace(/\s*([{}:;,>+~])\s*/g, '$1').trim().toLowerCase();

// Resolve: para cada seletor, o valor final de cada propriedade (ultima vence)
function resolver(regras) {
  const out = new Map();
  for (const r of regras) {
    const i = r.indexOf('{'); if (i < 0) continue;
    const s = sem(r.slice(0, i));
    const corpo = r.slice(i + 1, r.lastIndexOf('}'));
    // At-rules: identidade e o NOME (keyframes) ou a QUERY (media), nao a posicao.
    // Extrair moveu os compartilhados para o topo do app.css; a ordem muda, o
    // efeito nao — @keyframes resolve por nome, e o inline continua vindo depois
    // do compartilhado, entao a precedencia de @media se mantem.
    if (s.startsWith('@')) { out.set(s, sem(corpo)); continue; }
    if (!out.has(s)) out.set(s, new Map());
    const alvo = out.get(s);
    for (const d of sem(corpo).split(';')) {
      if (!d.trim()) continue;
      const j = d.indexOf(':'); if (j < 0) continue;
      alvo.set(d.slice(0, j), d.slice(j + 1));
    }
  }
  const linhas = [];
  for (const [s, v] of out) {
    linhas.push(v instanceof Map
      ? s + '{' + [...v.entries()].map(([k, x]) => k + ':' + x).sort().join(';') + '}'
      : s + '{' + v + '}');
  }
  return linhas.sort();
}
const cssDe = html => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

const compartilhado = splitRules(fs.readFileSync(path.join(RAIZ, 'assets/css/app.css'), 'utf8'));
let ok = true;
for (const f of APP) {
  const antes = execSync(`"${GIT}" show HEAD:${f}.html`, { cwd: RAIZ, maxBuffer: 20e6 }).toString('utf8');
  const depois = fs.readFileSync(path.join(RAIZ, f + '.html'), 'utf8');
  const a = resolver(splitRules(cssDe(antes)));
  const b = resolver([...compartilhado, ...splitRules(cssDe(depois))]);
  const soA = a.filter(x => !b.includes(x));
  const soB = b.filter(x => !a.includes(x));
  const igual = soA.length === 0 && soB.length === 0;
  if (!igual) ok = false;
  console.log(`${igual ? 'OK   ' : 'FALHA'} ${f.padEnd(12)} ${a.length} seletores resolvidos`);
  soA.slice(0, 3).forEach(d => console.log('        so no original: ' + d.slice(0, 110)));
  soB.slice(0, 3).forEach(d => console.log('        so no novo:     ' + d.slice(0, 110)));
}
console.log(`\n${ok ? 'CSS RESOLVIDO IDENTICO AO ORIGINAL EM TODAS AS 8 PAGINAS' : 'DIVERGENCIA DETECTADA'}`);
