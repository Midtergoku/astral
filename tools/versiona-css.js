#!/usr/bin/env node
/* Carimba a versao do CSS **e do JavaScript** nos links das paginas.
   RODAR SEMPRE QUE MEXER EM assets/, ANTES DE COMMITAR.

   POR QUE ISTO EXISTE (02/08/2026):
   O vercel.json mandava `max-age=3600` para /assets/*. O navegador guardava os
   arquivos por uma hora e nao perguntava de novo.

   Primeira vez que mordeu: o Lucas abriu a pagina depois do deploy e viu o CSS
   velho. Criei o carimbo -- so para CSS.

   SEGUNDA VEZ, e a culpa foi minha por resolver pela metade: ele mandou print
   com "sem especialidade", texto que eu tinha trocado tres commits antes. O
   JAVASCRIPT nunca foi carimbado. Todas as correcoes de comportamento ficaram
   invisiveis para ele por horas, e eu fiquei consertando coisas que ja estavam
   consertadas.

   AGORA CARIMBA OS DOIS. E o vercel.json passou a mandar `max-age=0,
   must-revalidate`: o navegador pergunta "mudou?" e recebe 304 quando nao
   mudou. Cinto e suspensorio, porque este erro ja custou duas rodadas.

   ⚠️ OS IMPORTS ENTRE MODULOS TAMBEM SAO CARIMBADOS.
   `import { x } from './assets/js/y.js'` dentro de um <script type="module">
   busca o arquivo pela URL escrita ali. Carimbar so a tag <script src> deixaria
   metade do grafo de modulos vindo do cache antigo -- que e pior que nao
   carimbar nada, porque mistura versoes. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');

/* Todo arquivo servido de assets/ entra na conta. */
function listarAssets() {
  const fora = [];
  for (const sub of ['css', 'js']) {
    const dir = path.join(RAIZ, 'assets', sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/\.(css|js)$/.test(f)) fora.push(`assets/${sub}/${f}`);
    }
  }
  return fora;
}

const hash = (rel) =>
  crypto.createHash('md5').update(fs.readFileSync(path.join(RAIZ, rel))).digest('hex').slice(0, 8);

const assets = listarAssets();
const versoes = Object.fromEntries(assets.map((a) => [a, hash(a)]));

const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
let tocados = 0;
const detalhe = [];

for (const pag of paginas) {
  const alvo = path.join(RAIZ, pag);
  let txt = fs.readFileSync(alvo, 'utf8');
  const antes = txt;

  for (const [rel, v] of Object.entries(versoes)) {
    const nome = rel.split('/').pop().replace('.', '\\.');

    // href="...x.css"  |  src="...x.js"      (com ou sem ?v= anterior)
    const emAtributo = new RegExp(
      '((?:href|src)="[^"]*' + nome + ')(\\?v=[a-f0-9]+)?(")', 'g');
    txt = txt.replace(emAtributo, `$1?v=${v}$3`);

    // from './assets/js/x.js'  |  import('/assets/js/x.js')
    const emImport = new RegExp(
      "((?:from|import\\()\\s*['\"][^'\"]*" + nome + ')(\\?v=[a-f0-9]+)?([\'"])', 'g');
    txt = txt.replace(emImport, `$1?v=${v}$3`);
  }

  if (txt !== antes) { fs.writeFileSync(alvo, txt, 'utf8'); tocados++; detalhe.push(pag); }
}

/* ⚠️ NAO carimbamos os imports DENTRO dos .js, e isso e deliberado.
   Tentei: estampar dentro de um modulo muda o conteudo dele, o que muda o
   hash dele, o que invalida o carimbo que acabou de ser escrito nos outros.
   Fica girando e nunca estabiliza -- medi tres passadas e ainda mudava.

   Para esses o que garante o frescor e o cabecalho: /assets/* agora responde
   `max-age=0, must-revalidate`, entao o navegador SEMPRE pergunta "mudou?"
   e recebe 304 quando nao mudou. Custa uma requisicao condicional minuscula
   e nunca serve versao velha. */
const modulos = 0;

console.log('versoes pelo conteudo:');
for (const [rel, v] of Object.entries(versoes)) console.log(`  ${rel.padEnd(26)} ?v=${v}`);
console.log(`\n${tocados} de ${paginas.length} paginas atualizadas`);
if (modulos) console.log(`${modulos} modulos com imports carimbados`);
console.log('\nCommitar junto com a mudanca em assets/.');
