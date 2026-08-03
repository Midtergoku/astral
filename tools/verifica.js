#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICA — a rede de seguranca antes de publicar
   ═══════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE (03/08/2026)

   Pedido do Lucas, e ele estava certo em pedir:
     "tem acontecido alguns erros bobos (...) eu nao posso que qualquer
      mudanca que va fazer o codigo quebre. Corrija essa situacao para que eu
      possa continuar trabalhando com a seguranca de que voce nao ira quebrar
      o codigo toda vez que eu pedir uma mudanca."

   O padrao dos erros da semana nao foi falta de cuidado pontual -- foi FALTA
   DE REDE. Eu edito 11 arquivos de uma vez com script, o script erra em um
   detalhe, e nada me avisa ate o Lucas abrir a tela e reclamar.

   Cada checagem aqui nasceu de um erro REAL que aconteceu:

     1. $1$2 literal ......... trocou o elemento do nome em 11 paginas
     2. divs desbalanceadas .. quase quebrei o dashboard inteiro
     3. ids duplicados ....... conquistas tinha dois "user-name"
     4. chaves de CSS ........ .hero::before ficou aberto e matou o CSS abaixo
     5. sintaxe de JS ........ modulo com erro derruba a pagina toda
     6. carimbo defasado ..... o Lucas via versao velha e eu consertava o que
                               ja estava consertado
     7. acento corrompido .... PowerShell ja destruiu dois HTMLs
     8. link morto ........... "Cronograma" apontava para pagina inexistente
     9. elemento fantasma .... JS escrevendo em id que nao existe mais
    10. import quebrado ...... modulo importando funcao que nao e exportada

   USO:
     node tools/verifica.js          roda tudo e resume
     node tools/verifica.js -v       mostra cada achado em detalhe

   Sai com codigo 1 se achar qualquer coisa -- serve para travar um commit.
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const VERBOSO = process.argv.includes('-v');

const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
const jsFiles = fs.existsSync(path.join(RAIZ, 'assets/js'))
  ? fs.readdirSync(path.join(RAIZ, 'assets/js')).filter((f) => f.endsWith('.js')).map((f) => 'assets/js/' + f)
  : [];
const cssFiles = fs.existsSync(path.join(RAIZ, 'assets/css'))
  ? fs.readdirSync(path.join(RAIZ, 'assets/css')).filter((f) => f.endsWith('.css')).map((f) => 'assets/css/' + f)
  : [];

const achados = [];
const anota = (grupo, arquivo, msg) => achados.push({ grupo, arquivo, msg });
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

/* ── 1. RESIDUO DE SUBSTITUICAO ─────────────────────────────────────────────
   Em String.replace, "$1" so e substituido quando o segundo argumento e uma
   STRING. Sendo funcao, vira texto literal. Foi assim que "$1$2" entrou em 11
   paginas no lugar do elemento do nome do usuario. */
for (const p of paginas) {
  const t = ler(p);
  const m = t.match(/\$\d(?:\$\d)*/g);
  if (m) anota('residuo', p, `${m.length} ocorrencia(s) de ${[...new Set(m)].join(', ')} -- provavel replace com funcao`);
  if (/\bundefined\b/.test(t.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')))
    anota('residuo', p, 'a palavra "undefined" aparece fora de comentario');
  if (/�/.test(t)) anota('residuo', p, 'caractere de substituicao U+FFFD -- texto corrompido');
}

/* ── 2. TAGS BALANCEADAS ──────────────────────────────────────────────────── */
for (const p of paginas) {
  const corpo = ler(p).split('<body')[1] || '';
  const semComentario = corpo.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['div', 'section', 'main', 'aside', 'nav', 'button']) {
    const abre = (semComentario.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const fecha = (semComentario.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (abre !== fecha) anota('tags', p, `<${tag}>: ${abre} abertas, ${fecha} fechadas`);
  }
}

/* ── 3. IDs DUPLICADOS ──────────────────────────────────────────────────────
   getElementById devolve so o primeiro. O segundo elemento nunca e preenchido
   e ninguem descobre -- foi o caso do chip em conquistas.html.

   ⚠️ SO CONTA O QUE ESTA NO HTML DE VERDADE, fora de <script>.
   A primeira versao desta regra contava tambem os ids escritos dentro de
   template de JS -- e acusou edital.html, onde duas telas alternativas ("sem
   edital" e "com edital") usam o mesmo id em ramos MUTUAMENTE EXCLUSIVOS.
   Nunca estao na pagina ao mesmo tempo, entao nao ha duplicata.
   Regra que acusa o que esta certo e pior que regra nenhuma: ensina a ignorar
   o aviso. */
for (const p of paginas) {
  const semScript = ler(p).replace(/<script[\s\S]*?<\/script>/g, '');
  const conta = {};
  for (const m of semScript.matchAll(/\sid="([^"]+)"/g)) conta[m[1]] = (conta[m[1]] || 0) + 1;
  for (const [id, n] of Object.entries(conta)) {
    if (n > 1) anota('ids', p, `id="${id}" aparece ${n} vezes no HTML`);
  }
}

/* ── 4. CHAVES DE CSS ───────────────────────────────────────────────────────
   Uma chave aberta a mais faz o navegador DESCARTAR todo o CSS dali para
   baixo, sem avisar. Aconteceu com .hero::before. */
for (const f of [...cssFiles]) {
  const t = ler(f).replace(/\/\*[\s\S]*?\*\//g, '');
  const a = (t.match(/\{/g) || []).length, z = (t.match(/\}/g) || []).length;
  if (a !== z) anota('css', f, `${a} chaves abertas, ${z} fechadas`);
}
for (const p of paginas) {
  const blocos = ler(p).match(/<style>([\s\S]*?)<\/style>/g) || [];
  blocos.forEach((b, i) => {
    const t = b.replace(/\/\*[\s\S]*?\*\//g, '');
    const a = (t.match(/\{/g) || []).length, z = (t.match(/\}/g) || []).length;
    if (a !== z) anota('css', p, `bloco <style> #${i + 1}: ${a} abertas, ${z} fechadas`);
  });
}

/* ── 5. SINTAXE DE JAVASCRIPT ─────────────────────────────────────────────── */
const { execFileSync } = require('child_process');
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', path.join(RAIZ, f)], { stdio: 'pipe' }); }
  catch (e) { anota('js', f, 'erro de sintaxe: ' + String(e.stderr || e).split('\n')[1]); }
}

/* ── 6. CARIMBO DE VERSAO DEFASADO ──────────────────────────────────────────
   Se o carimbo nao bate com o conteudo, o navegador serve versao velha -- e eu
   fico consertando o que ja esta consertado. */
const hashDe = {};
for (const f of [...cssFiles, ...jsFiles]) {
  hashDe[f.split('/').pop()] = crypto.createHash('md5').update(ler(f)).digest('hex').slice(0, 8);
}
for (const p of paginas) {
  for (const m of ler(p).matchAll(/assets\/(?:css|js)\/([\w.-]+\.(?:css|js))\?v=([a-f0-9]{8})/g)) {
    if (hashDe[m[1]] && hashDe[m[1]] !== m[2])
      anota('carimbo', p, `${m[1]} carimbado ${m[2]} mas o arquivo e ${hashDe[m[1]]}`);
  }
  for (const m of ler(p).matchAll(/(?:src|href)="[^"]*assets\/(?:css|js)\/([\w.-]+\.(?:css|js))"/g)) {
    anota('carimbo', p, `${m[1]} SEM carimbo de versao`);
  }
}

/* ── 7. ACENTOS ─────────────────────────────────────────────────────────────
   O PowerShell 5.1 le UTF-8 como ANSI e ja destruiu dois HTMLs. Estes pares
   sao a assinatura de acento quebrado. */
const QUEBRA = ['Ã§', 'Ã£', 'Ã¡', 'Ã©', 'Ãª', 'Ã­', 'Ã³', 'Ãµ', 'Ãº', 'Ã¢', 'Ã´', 'Â '];
for (const p of [...paginas, ...jsFiles, ...cssFiles]) {
  const t = ler(p);
  const achou = QUEBRA.filter((q) => t.includes(q));
  if (achou.length) anota('acento', p, `acento corrompido: ${achou.join(' ')}`);
}

/* ── 8. LINKS INTERNOS MORTOS ───────────────────────────────────────────────
   "Cronograma" apontava para uma ancora que so existia no dashboard: em 8
   paginas era clique sem efeito. */
for (const p of paginas) {
  for (const m of ler(p).matchAll(/href="([a-z0-9_-]+\.html)(#[\w-]+)?"/gi)) {
    if (!fs.existsSync(path.join(RAIZ, m[1]))) anota('link', p, `aponta para ${m[1]}, que nao existe`);
  }
}

/* ── 9. ELEMENTO FANTASMA ───────────────────────────────────────────────────
   JS escrevendo em id que nao existe mais na pagina. `.textContent = x` em
   null estoura e DERRUBA o resto do bloco -- inclusive o que vem depois. */
for (const p of paginas) {
  const t = ler(p);
  const existentes = new Set([...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of t.matchAll(/getElementById\((['"])([^'"]+)\1\)\s*\.\s*(\w+)\s*=/g)) {
    if (!existentes.has(m[2]))
      anota('fantasma', p, `escreve em #${m[2]}.${m[3]}, mas esse id nao existe na pagina`);
  }
}

/* ── 10. IMPORT QUEBRADO ────────────────────────────────────────────────────
   Importar algo que o modulo nao exporta derruba a pagina inteira, em
   silencio no editor. */
const exportadoPor = {};
for (const f of jsFiles) {
  const t = ler(f);
  const nomes = new Set();
  for (const m of t.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) nomes.add(m[1]);
  for (const m of t.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) nomes.add(m[1]);
  for (const m of t.matchAll(/export\s*\{([^}]+)\}/g))
    m[1].split(',').forEach((x) => nomes.add(x.split(/\s+as\s+/)[0].trim()));
  exportadoPor[f.split('/').pop()] = nomes;
}
for (const p of [...paginas, ...jsFiles]) {
  const t = ler(p);
  for (const m of t.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\/?([\w.-]+\.js)(?:\?v=[a-f0-9]+)?['"]/g)) {
    const alvo = exportadoPor[m[2]];
    if (!alvo) continue;
    for (const bruto of m[1].split(',')) {
      const nome = bruto.split(/\s+as\s+/)[0].trim();
      if (nome && !alvo.has(nome))
        anota('import', p, `importa "${nome}" de ${m[2]}, que nao exporta esse nome`);
    }
  }
}

/* ── 11. BARRA INVERTIDA PERDIDA EM EXPRESSAO REGULAR ──────────────────────
   Aconteceu TRES vezes em 03/08/2026, sempre pelo mesmo caminho: escrever
   codigo por node -e dentro de string de shell. O bash come a barra antes de
   o Node ver, e o resultado e uma regex valida que faz outra coisa.

     \s+ virou s+   -> "Lucas".split() devolvia "Luca". TRES DIAS de bug.
     \d  virou d    -> "Bombeiro 3a Classe" nunca abreviava
     $1$2 literal   -> trocou o elemento do nome em 11 paginas

   O perigo desta familia de erro e que ela NAO quebra nada: o codigo roda,
   o teste passa, e o defeito so aparece com certos dados. "Lucas" cortava;
   "Rodrigo" nao. Por isso durou tanto.

   REGRA: expressao regular nunca se escreve via node -e no shell. Vai para
   arquivo e roda de la.

   So olha arquivo .js e so dentro de literal de regex -- em HTML, /b e
   fechamento de negrito, nao classe de caractere. */
const CLASSES = [["s", "espaco"], ["d", "digito"], ["w", "letra ou numero"], ["b", "limite de palavra"]];
for (const f of jsFiles) {
  const corpoArq = ler(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const m of corpoArq.matchAll(/\/(?![*\/])((?:\\.|\[[^\]]*\]|[^\/\n\\])+)\/[gimsuy]*/g)) {
    const corpo = m[1];
    const semEscapes = corpo.replace(/\\./g, "");
    for (const [letra, oque] of CLASSES) {
      const solta = new RegExp("(^|[^a-zA-Z0-9_\\]])" + letra + "([+*?{]|$)");
      const temEscapada = corpo.indexOf("\\" + letra) >= 0;
      if (solta.test(semEscapes) && !temEscapada) {
        anota("regex", f, "/" + corpo + "/ tem \"" + letra + "\" solto -- provavelmente era \\" + letra + " (" + oque + ")");
      }
    }
  }
}

/* ── RELATORIO ─────────────────────────────────────────────────────────────── */
const GRUPOS = {
  residuo:  'Residuo de substituicao / texto corrompido',
  tags:     'Tags HTML desbalanceadas',
  ids:      'IDs duplicados',
  css:      'Chaves de CSS desbalanceadas',
  js:       'Sintaxe de JavaScript',
  carimbo:  'Carimbo de versao defasado ou ausente',
  acento:   'Acentuacao corrompida',
  link:     'Link interno morto',
  fantasma: 'JS escrevendo em elemento inexistente',
  import:   'Import de algo que nao e exportado',
  regex:    'Barra invertida perdida em expressao regular',
};

console.log('VERIFICA — rede de seguranca do Astral\n');
console.log(`${paginas.length} paginas · ${jsFiles.length} modulos JS · ${cssFiles.length} folhas CSS\n`);

let falhou = false;
for (const [g, titulo] of Object.entries(GRUPOS)) {
  const meus = achados.filter((a) => a.grupo === g);
  if (!meus.length) { console.log(`  OK     ${titulo}`); continue; }
  falhou = true;
  console.log(`  FALHA  ${titulo}  (${meus.length})`);
  const mostrar = VERBOSO ? meus : meus.slice(0, 4);
  for (const a of mostrar) console.log(`           ${a.arquivo}: ${a.msg}`);
  if (!VERBOSO && meus.length > 4) console.log(`           ... e mais ${meus.length - 4} (use -v)`);
}

console.log('\n' + '='.repeat(66));
if (falhou) {
  console.log(`ACHOU ${achados.length} PROBLEMA(S) — nao publique antes de resolver.`);
  process.exit(1);
} else {
  console.log('TUDO LIMPO — seguro para publicar.');
}
