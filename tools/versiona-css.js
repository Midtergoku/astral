#!/usr/bin/env node
/* Carimba a versao do CSS nos links das paginas.
   RODAR SEMPRE QUE MEXER EM assets/css/*.css, ANTES DE COMMITAR.

   POR QUE ISTO EXISTE (02/08/2026):
   O vercel.json manda `Cache-Control: public, max-age=3600` para /assets/*.
   O navegador entao guarda o CSS por UMA HORA e nao pergunta de novo.
   Resultado medido: o Lucas abriu a pagina depois do deploy e viu a versao
   velha -- layout quebrado, menu sem estilo -- enquanto o arquivo em
   producao ja estava certo. Ele reclamou de uma pagina que eu ja tinha
   consertado, e estava com razao: para ELE, nao tinha.

   O problema nao e o cache longo -- cache longo e bom, deixa o site rapido.
   O problema e a URL nao mudar quando o conteudo muda. A correcao classica
   e carimbar um pedaco do hash do arquivo na URL: conteudo novo = URL nova =
   o navegador busca na hora. E continua guardando por uma hora o que nao
   mudou.

   Nao adianta so mandar o usuario "atualizar a pagina": o usuario final
   nunca vai fazer isso, e o Lucas nao executa nada (regra 4). */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const CSS = ['assets/css/base.css', 'assets/css/app.css'];

const hash = (rel) =>
  crypto.createHash('md5')
    .update(fs.readFileSync(path.join(RAIZ, rel)))
    .digest('hex')
    .slice(0, 8);

const versoes = Object.fromEntries(CSS.map((c) => [c, hash(c)]));

const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
let tocados = 0;
const detalhe = [];

for (const pag of paginas) {
  const alvo = path.join(RAIZ, pag);
  let txt = fs.readFileSync(alvo, 'utf8');
  const antes = txt;

  for (const [rel, v] of Object.entries(versoes)) {
    const nome = rel.split('/').pop();
    // pega href de base.css/app.css com ou sem ?v= anterior, relativo ou absoluto
    const re = new RegExp('(href="[^"]*' + nome.replace('.', '\\.') + ')(\\?v=[a-f0-9]+)?(")', 'g');
    txt = txt.replace(re, `$1?v=${v}$3`);
  }

  if (txt !== antes) { fs.writeFileSync(alvo, txt, 'utf8'); tocados++; detalhe.push(pag); }
}

console.log('versoes calculadas a partir do conteudo:');
for (const [rel, v] of Object.entries(versoes)) console.log(`  ${rel}  ->  ?v=${v}`);
console.log(`\n${tocados} de ${paginas.length} paginas atualizadas`);
if (tocados) console.log('  ' + detalhe.join(' '));
console.log('\nCommitar junto com a mudanca do CSS.');
