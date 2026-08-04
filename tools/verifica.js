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

/* Codigo de TERCEIRO nao passa pelas checagens de estilo (03/08/2026).
   Ao trazer o supabase-js para dentro do projeto, este verificador acusou 13
   falhas nele -- todas falso positivo: em codigo minificado, trechos como
   "/=2),a+c>=u?" tem a cara de uma expressao regular e a checagem de barra
   invertida mordia a isca. O mesmo valia para acento e nome de variavel.

   A licao ja tinha aparecido no ID duplicado do edital.html: quando o
   verificador acusa algo que esta certo, quem se conserta e a REGRA. Um
   verificador que da alarme falso e pior que nenhum, porque ensina a ignorar.

   A checagem de SINTAXE continua valendo para eles -- essa nao e questao de
   estilo: prova que o arquivo baixado nao veio truncado. */
const ehDeTerceiro = (rel) => /(^|\/)(supabase-\d|vendor\/)/.test(rel);

const jsFiles = fs.existsSync(path.join(RAIZ, 'assets/js'))
  ? fs.readdirSync(path.join(RAIZ, 'assets/js')).filter((f) => f.endsWith('.js')).map((f) => 'assets/js/' + f)
  : [];
/* Lista para as checagens de estilo: so o que e NOSSO. */
const jsNossos = jsFiles.filter((f) => !ehDeTerceiro(f));
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
for (const p of [...paginas, ...jsNossos, ...cssFiles]) {
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
for (const f of jsNossos) {
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

/* ── 12. ESPACO RESERVADO QUE MENTE ──────────────────────────────────────────
   O Lucas em 03/08/2026: "clico em cronograma e o simbolo da minha foto fica
   com interrogacao". Era um "?" escrito no HTML das 11 paginas, que aparecia
   na PRIMEIRA pintura e so virava a inicial certa depois.

   A licao vale alem deste caso: informacao ERRADA por um instante e pior que
   informacao nenhuma. O usuario nao sabe que e temporario -- ele so ve errado.
   Quem nao sabe o valor ainda deve mostrar espera (data-esperando), nao chutar.

   Cada par abaixo nasceu de algo que o Lucas viu na tela. */
const MENTIRAS = [
  ['id="user-avatar">?', 'o "?" no lugar da inicial'],
  ['id="greeting">Carregando', 'o "Carregando..." na saudacao'],
  ['id="user-name">Carregando', 'o "Carregando..." no nome'],
];
for (const p of paginas) {
  const t = ler(p);
  for (const [agulha, oque] of MENTIRAS) {
    if (t.includes(agulha)) {
      anota('espera', p, oque + ' voltou -- use data-esperando e deixe o identidade.js preencher');
    }
  }
  /* Toda pagina com avatar precisa do identidade.js, e CLASSICO: como modulo
     ele seria adiado e a pagina pintaria antes de ele rodar -- que e
     exatamente o defeito. */
  if (t.includes('id="user-avatar"')) {
    const tag = (t.match(/<script[^>]*src="[^"]*identidade\.js[^"]*"[^>]*>/) || [])[0];
    if (!tag) anota('espera', p, 'tem avatar mas nao carrega o identidade.js');
    else if (/type=["']module["']/.test(tag)) anota('espera', p, 'carrega o identidade.js como module -- seria adiado');
  }
}

/* ── 13. BOTAO QUE CHAMA FUNCAO QUE SO EXISTE DEPOIS ─────────────────────────
   Achado em 04/08/2026 lendo a tabela erros_cliente: o botao "Entrar com
   Google" do login.html usava onclick="loginGoogle()", e a funcao nascia dentro
   de um <script type="module"> -- que o navegador SEMPRE adia.

   Entre a pagina aparecer e o modulo rodar existe uma janela em que o botao ja
   esta clicavel e a funcao ainda nao existe. Quem clicava ali recebia
   "loginGoogle is not defined" e o botao NAO FAZIA NADA -- sem aviso, sem erro
   visivel. Aconteceu 4 vezes com usuarios reais, no botao por onde entram 6 dos
   8 usuarios do Astral.

   O silencio e o que torna isto perigoso: nao quebra a tela, so nao funciona.

   REGRA: se a funcao mora num modulo, o ouvinte se prende por addEventListener
   dentro do proprio modulo. onclick no HTML so vale para funcao definida em
   script classico. */
for (const p of paginas) {
  const t = ler(p);

  // separa o que e modulo (adiado) do que e script classico (roda na hora)
  const modulos = [...t.matchAll(/<script[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('\n');
  const classicos = [...t.matchAll(/<script(?![^>]*type=["']module["'])[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('\n');

  // tira comentarios do HTML para nao acusar exemplo escrito em comentario
  const semComentario = t.replace(/<!--[\s\S]*?-->/g, '');

  const chamadas = new Set();
  for (const m of semComentario.matchAll(/\bon(?:click|change|submit|input)=["']\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
    chamadas.add(m[1]);
  }

  const arriscadas = [...chamadas].filter((fn) => {
    const definePor = (corpo) =>
      new RegExp('(?:function\\s+' + fn + '\\b|window\\.' + fn + '\\s*=|(?:const|let|var)\\s+' + fn + '\\b)').test(corpo);
    if (definePor(classicos)) return false;          // script classico roda antes: seguro
    return definePor(modulos);                       // so no modulo: janela perigosa
  });

  if (!arriscadas.length) continue;

  /* Consertar 39 botoes a mao seria muita superficie para errar, e nao
     impediria o 40o de nascer torto. A rede (assets/js/cedo.js) segura o
     clique que chega cedo e o refaz quando a funcao existe. O que se exige
     aqui e que a rede ESTEJA na pagina -- e que nao seja module, senao ela
     mesma seria adiada e nao serviria para nada. */
  const rede = (t.match(/<script[^>]*src="[^"]*cedo\.js[^"]*"[^>]*>/) || [])[0];
  if (!rede) {
    anota('adiado', p, arriscadas.length + ' handler(s) inline chamam funcao que so existe dentro de <script type="module">, e a pagina NAO carrega assets/js/cedo.js: ' + arriscadas.slice(0, 4).join(', '));
  } else if (/type=["']module["']/.test(rede)) {
    anota('adiado', p, 'carrega o cedo.js como module -- ele mesmo seria adiado e nao protegeria nada');
  }
}

/* ── 14. SEGREDO PRESTES A SER PUBLICADO ─────────────────────────────────────
   ESTE REPOSITORIO E PUBLICO. Qualquer coisa commitada aqui fica visivel para
   o mundo inteiro, para sempre -- apagar depois nao resolve, porque o historico
   do git guarda.

   Em 04/08/2026 o Lucas pediu um arquivo com os logins do projeto. Ele foi
   para a AREA DE TRABALHO, fora daqui. O .gitignore cobre os nomes obvios;
   esta checagem cobre o resto: ela procura o FORMATO das chaves, entao pega
   mesmo que o arquivo se chame "anotacoes.txt".

   So olha o que o git realmente vai publicar (arquivos rastreados). */
{
  const ASSINATURAS = [
    [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'chave da Anthropic (sk-ant-...)'],
    [/\bsbp_[a-f0-9]{40,}/, 'token de gerenciamento do Supabase (sbp_...)'],
    [/\bsb_secret_[A-Za-z0-9_-]{20,}/, 'chave SECRETA do Supabase'],
    [/\bre_[A-Za-z0-9]{20,}/, 'chave do Resend (re_...)'],
    [/\bES_[a-f0-9]{32}/, 'secret do hCaptcha (ES_...)'],
    [/\bAPP_USR-[A-Za-z0-9-]{20,}/, 'token do Mercado Pago'],
    [/\bghp_[A-Za-z0-9]{30,}/, 'token do GitHub (ghp_...)'],
    [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, 'JWT (pode ser a service_role)'],
    /* ⚠️ Esta linha ja foi mais frouxa e acusou 4 falsos positivos em 04/08/2026.
       O melhor deles: o texto do botao 'Mostrar senha' : 'Esconder senha' -- um
       ternario que, lido por regex, tem a cara de "senha = valor".
       Por isso agora sao duas formas EXPLICITAS e nada mais:
         chave nua .... senha: "..."   |  password = "..."
         chave citada . "senha": "..." |  'password': "..."
       Palavra solta dentro de texto que o usuario le nao casa mais. */
    /* O `(?!\s*\+)` no fim NAO e detalhe: sem ele, a regra acusava a propria
       correcao dela. `password: "nao-existe-" + crypto.randomUUID()` tem uma
       cadeia de texto no comeco, mas o valor final e SORTEADO -- nao ha segredo
       nenhum ali. Valor montado por concatenacao nao e senha fixa. */
    [/(?:^|[\s{,(])(?:senha|password|passwd)\s*[:=]\s*["'][^"']{6,}["'](?!\s*\+)/i, 'senha escrita em texto'],
    [/["'](?:senha|password|passwd)["']\s*:\s*["'][^"']{6,}["'](?!\s*\+)/i, 'senha escrita em texto'],
  ];

  let rastreados = [];
  try {
    rastreados = require('child_process')
      .execSync('git ls-files', { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { /* sem git: pula a checagem em vez de quebrar */ }

  for (const rel of rastreados) {
    // binario e historico ficam de fora: historico/ narra os erros e cita formatos
    if (/^historico\//.test(rel)) continue;
    if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|woff2?)$/i.test(rel)) continue;

    let t;
    try { t = fs.readFileSync(path.join(RAIZ, rel), 'utf8'); } catch { continue; }

    for (const [re, oque] of ASSINATURAS) {
      const m = t.match(re);
      if (!m) continue;
      // a publishable key e publica DE PROPOSITO -- esta no codigo de todas as paginas
      if (/sb_publishable_/.test(m[0])) continue;
      anota('segredo', rel, oque + ' — este repositorio e PUBLICO. Tire daqui antes de commitar.');
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
  espera:   'Espaco reservado que mostra informacao errada',
  adiado:   'Botao chama funcao que so existe depois (modulo adiado)',
  segredo:  'SEGREDO prestes a ser publicado num repositorio PUBLICO',
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
