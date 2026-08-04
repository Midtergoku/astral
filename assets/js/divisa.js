/* ═══════════════════════════════════════════════════════════════════════════
   A DIVISA — nivel + tag, a identificacao do usuario
   ═══════════════════════════════════════════════════════════════════════════
   Bloco V7 do design, 02/08/2026. Detalhe em .claude/skills/astral-gamificacao.

   SAO DOIS SISTEMAS SEPARADOS, e o Lucas foi explicito: "tag e tag, nivel e
   nivel". Junta-los foi um erro meu que ele corrigiu.

     NIVEL   quanto voce estudou   XP acumulado, muda conforme o EDITAL
             -> Bombeiro 3a Classe, Cabo BM, 3o Sargento, Capitao BM
     TAG     no que voce e         conquistada
             -> Orador de Guerra, Estrategista, Alquimista

   Lidos juntos formam identificacao militar de verdade: tempo de servico e
   especialidade. Nenhum concorrente do nicho tem isso.

   POR QUE ESTE ARQUIVO EXISTE:
   As tabelas de patente moravam DENTRO do dashboard.html. Enquanto so o
   dashboard mostrava a patente, tudo bem. A divisa vai para a barra do topo
   das 10 paginas -- copiar as 80 linhas em cada uma repetiria exatamente o
   defeito que ja custou tres correcoes neste projeto (:root, HTML do menu,
   CSS do menu). Uma fonte, dez leitores.

   DE ONDE VEM A TAG:
   Das habilidades de conquistas.html, que desbloqueiam com 70% de dominio na
   materia. Elas sao SECRETAS de proposito -- a pessoa descobre por acaso, e
   e ai que esta o valor (ver a skill). Depois de descoberta, a habilidade
   vira a tag que ela veste. Foi o que o Lucas autorizou com "voce tambem
   pode colocar elas pra serem tags".

   QUEM NAO TEM TAG AINDA nao ganha uma de brinde: aparece so o nivel, e o
   espaco ao lado fica vazio. Se todo mundo nascesse com tag, ela nao valeria
   nada -- e o vazio ao lado do nivel e, ele proprio, um convite.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══ AS CARREIRAS ═════════════════════════════════════════════════════════

   PEDIDO DO LUCAS em 04/08/2026, e a razao de ser disto:
   *"conforme ela fosse subindo de nivel, a patente fosse crescendo de acordo
   com o concurso que ele quer prestar (...) isso traz satisfacao, porque e o
   que ele pretende fazer na vida real. Nao adianta ele comecar de Grumete com
   o concurso da Marinha e logo em seguida ir pra uma coisa nada a ver."*

   Por isso cada lista abaixo e a CARREIRA INTEIRA daquela forca, na ordem
   real, e nao uma escadinha generica com o nome trocado.

   FONTES (pesquisadas em 04/08/2026, duas que batem entre si):
     - Hierarquia militar do Brasil, Wikipedia
     - portal.estrategia.com/concursos/seguranca/como-funciona-a-hierarquia-militar-brasileira
   Ordem confirmada nas duas: praca sobe Soldado/Marinheiro -> Cabo -> 3o, 2o e
   1o Sargento -> Subtenente/Suboficial; oficial sobe 2o Tenente -> 1o Tenente
   -> Capitao -> Major -> Tenente-Coronel -> Coronel.

   ⚠️ HONESTIDADE SOBRE O QUE ISTO E: na vida real praca e oficial sao carreiras
   SEPARADAS -- um Sargento nao vira Tenente por promocao, ele presta outro
   concurso. Aqui as duas viram uma escada so, de proposito, porque o produto e
   um jogo de progressao e a pessoa quer ver para onde da para ir. Os NOMES e a
   ORDEM sao reais; a passagem de praca para oficial e licenca de jogo.

   ⚠️ PM e BOMBEIROS variam de estado para estado (o CBMERJ usa "Bombeiro 3a
   Classe" onde a maioria usa "Soldado BM"). Por isso a patente de ENTRADA vem
   da IA, que leu o edital daquele estado, e a escada comeca no degrau dela. */

const CARREIRAS = {
  marinha: [
    'Grumete', 'Marinheiro', 'Cabo',
    '3º Sargento', '2º Sargento', '1º Sargento', 'Suboficial',
    'Guarda-Marinha', '2º Tenente', '1º Tenente', 'Capitão-Tenente',
    'Capitão de Corveta', 'Capitão de Fragata', 'Capitão de Mar e Guerra',
  ],
  exercito: [
    'Recruta', 'Soldado', 'Cabo',
    '3º Sargento', '2º Sargento', '1º Sargento', 'Subtenente',
    'Aspirante a Oficial', '2º Tenente', '1º Tenente', 'Capitão',
    'Major', 'Tenente-Coronel', 'Coronel',
  ],
  aeronautica: [
    'Recruta', 'Soldado', 'Cabo',
    '3º Sargento', '2º Sargento', '1º Sargento', 'Suboficial',
    'Aspirante a Oficial', '2º Tenente', '1º Tenente', 'Capitão',
    'Major', 'Tenente-Coronel', 'Coronel',
  ],
  pm: [
    'Aluno-Soldado', 'Soldado PM', 'Cabo PM',
    '3º Sargento PM', '2º Sargento PM', '1º Sargento PM', 'Subtenente PM',
    'Aspirante a Oficial PM', '2º Tenente PM', '1º Tenente PM', 'Capitão PM',
    'Major PM', 'Tenente-Coronel PM', 'Coronel PM',
  ],
  bombeiros: [
    'Aluno-Soldado BM', 'Soldado BM', 'Cabo BM',
    '3º Sargento BM', '2º Sargento BM', '1º Sargento BM', 'Subtenente BM',
    'Aspirante a Oficial BM', '2º Tenente BM', '1º Tenente BM', 'Capitão BM',
    'Major BM', 'Tenente-Coronel BM', 'Coronel BM',
  ],
  default: [
    'Recruta', 'Soldado', 'Cabo',
    '3º Sargento', '2º Sargento', '1º Sargento', 'Subtenente',
    'Aspirante a Oficial', '2º Tenente', '1º Tenente', 'Capitão',
    'Major', 'Tenente-Coronel', 'Coronel',
  ],
};

/* Quanto XP cada degrau custa, pela POSICAO na escada -- nao pela patente.
   Assim quem entra como Aluno-Sargento comeca do zero igual a quem entra como
   Soldado: os dois estao no comeco da carreira DELES. Antes o XP era colado na
   patente, e comecar mais alto significava comecar ja devendo XP. */
const XP_POR_DEGRAU = [
  0, 500, 1200, 2500, 4500, 7000, 10000, 14000,
  19000, 25000, 32000, 42000, 55000, 70000, 90000,
];
/* Traduz o que a IA respondeu para a chave da tabela daqui.
   A IA usa "exercito"/"outro"; aqui a tabela generica se chama "default". */
const FORCA_PARA_TABELA = {
  exercito: 'exercito', marinha: 'marinha', aeronautica: 'aeronautica',
  pm: 'pm', bombeiros: 'bombeiros', outro: 'default',
};

/* ⚠️ ISTO E O PLANO B, e so isso (04/08/2026).
   Ate hoje ele era o plano A: a forca era adivinhada por palavra no NOME do
   edital. Um edital chamado "Concurso de Admissao ao Curso de Formacao de
   Sargentos" nao casava com nada e caia em Recruta, mesmo sendo Exercito.

   Agora quem responde e a IA, que LEU o PDF (processar-edital devolve `forca`).
   Esta funcao so entra em acao para edital antigo, lido antes desta mudanca, e
   que por isso nao tem o campo gravado. */
function detectarTipoConcurso(nomeEdital) {
    if (!nomeEdital) return 'default';
    const nome = nomeEdital.toLowerCase();
    if (nome.includes('bomb') || nome.includes('cbm') || nome.includes('cbmerj') || nome.includes('bombeiro')) return 'bombeiros';
    if (nome.includes('marinha') || nome.includes('naval') || nome.includes('en ') || nome.includes('eamcn')) return 'marinha';
    if (nome.includes('aeronáutica') || nome.includes('aeronautica') || nome.includes('afa') || nome.includes('eear') || nome.includes('epcar')) return 'aeronautica';
    if (nome.includes('exército') || nome.includes('exercito') || nome.includes('espcex') || nome.includes('essa') || nome.includes('aman')) return 'exercito';
    if (nome.includes('policia militar') || nome.includes('polícia militar') || nome.includes(' pm ') || nome.includes('pmes') || nome.includes('pmrj') || nome.includes('pmsp')) return 'pm';
    return 'default';
  }

/* Nome que a materia recebe quando passa de 70% de dominio.
   Espelha HABILIDADES_MILITARES de conquistas.html. Chave em minuscula e sem
   acento, porque o nome vem do edital e chega de qualquer jeito. */
const TAGS_POR_MATERIA = {
  'lingua portuguesa': 'Orador de Guerra',   'portugues': 'Orador de Guerra',
  'redacao': 'Orador de Guerra',
  'matematica': 'Calculista',                'raciocinio logico': 'Estrategista',
  'raciocinio logico matematico': 'Estrategista',
  'fisica': 'Engenheiro de Campo',           'quimica': 'Alquimista',
  'biologia': 'Medico de Combate',           'historia': 'Memoria da Nacao',
  'historia do brasil': 'Memoria da Nacao',  'geografia': 'Navegador',
  'geografia do brasil': 'Navegador',
  'ingles': 'Interprete',                    'espanhol': 'Interprete',
  'lingua estrangeira': 'Interprete',
  'direito constitucional': 'Guardiao da Lei',
  'direito administrativo': 'Administrador de Elite',
  'direito penal': 'Guardiao da Lei',        'direito penal militar': 'Guardiao da Lei',
  'legislacao': 'Legislador',                'legislacao militar': 'Legislador',
  'legislacao especial': 'Legislador',
  'informatica': 'Operador Cyber',           'nocoes de informatica': 'Operador Cyber',
  'atualidades': 'Analista de Inteligencia',
  'etica': 'Guardiao da Lei',                'administracao': 'Administrador de Elite',
  'contabilidade': 'Calculista',             'estatistica': 'Calculista',
};

/* Tira acento e caixa, para casar nome de materia que vem do edital. */
function normalizar(txt) {
  return (txt || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

/* O nivel a partir do XP e do edital.
 *
 * ORDEM DE CONFIANCA (04/08/2026), da mais para a menos:
 *   1. `forca` -- veio da IA, que LEU o edital. E a verdade.
 *   2. adivinhacao pelo nome -- so para edital lido antes desta mudanca.
 *
 * `patenteInicial` tambem vem da IA e renomeia SO o primeiro degrau. O resto
 * da carreira continua vindo da tabela: o edital diz em que posto a pessoa
 * ENTRA, nao a progressao inteira da forca. Sem isso, um edital de sargento
 * faria a pessoa comecar como "Recruta" ou pior, num posto que nao existe
 * naquela forca.
 */
/* Onde, na carreira, fica a patente que o edital oferece.
 *
 * Devolve -1 quando nao reconhece -- e ai a escada comeca do inicio, que e
 * melhor que inventar uma posicao errada.
 *
 * Duas passadas, de proposito:
 *   1. igual exato ("Soldado PM" achando "Soldado PM")
 *   2. por palavra-chave ("Aluno-Sargento" achando "3º Sargento")
 * A segunda existe porque a patente vem do edital em texto livre: "Aluno-Sargento",
 * "Cadete", "Soldado PM 2ª Classe", "Bombeiro Militar de 3ª Classe". */
function degrauDaPatente(carreira, patente) {
  if (!patente) return -1;
  const alvo = normalizar(patente);

  const exato = carreira.findIndex((p) => normalizar(p) === alvo);
  if (exato >= 0) return exato;

  /* Da mais especifica para a mais generica: "subtenente" antes de "tenente",
     senao "Subtenente" cairia em "2º Tenente". A ordem AQUI e a regra. */
  const CHAVES = [
    ['coronel', 'coronel'], ['major', 'major'], ['capitao', 'capitao'],
    ['subtenente', 'subtenente'], ['suboficial', 'suboficial'],
    ['aspirante', 'aspirante'], ['cadete', 'aspirante'],
    ['guarda-marinha', 'guarda-marinha'], ['guarda marinha', 'guarda-marinha'],
    ['tenente', 'tenente'],
    ['sargento', 'sargento'], ['cabo', 'cabo'],
    ['grumete', 'grumete'], ['marinheiro', 'marinheiro'],
    ['soldado', 'soldado'], ['bombeiro', 'soldado'], ['recruta', 'recruta'],
  ];

  for (const [naPatente, naCarreira] of CHAVES) {
    if (!alvo.includes(naPatente)) continue;
    const i = carreira.findIndex((p) => normalizar(p).includes(naCarreira));
    if (i >= 0) return i;
  }
  return -1;
}

export function nivelDe(xp = 0, nomeEdital = '', forca = null, patenteInicial = null) {
  const tipo = (forca && FORCA_PARA_TABELA[forca]) || detectarTipoConcurso(nomeEdital);
  const carreira = CARREIRAS[tipo] || CARREIRAS.default;

  /* 🔴 O CONSERTO QUE O LUCAS PEDIU (04/08/2026).
     A versao de ontem so trocava o NOME do primeiro degrau e mantinha o resto
     da lista. Resultado: um edital de sargento fazia a pessoa comecar como
     "Aluno-Sargento" e no nivel seguinte virar "Soldado" -- descendo. Era
     exatamente o "ir pra uma coisa nada a ver" que ele apontou.

     Agora a escada COMECA no degrau do edital e sobe dali para o topo da
     carreira daquela forca. Quem entra como Aluno-Sargento vai para 3º
     Sargento, 2º, 1º, Subtenente, e por ai. Ninguem desce nunca. */
  const degrau = degrauDaPatente(carreira, patenteInicial);

  let nomes;
  if (degrau < 0) {
    nomes = carreira.slice();                       // nao reconheceu: carreira inteira
  } else if (normalizar(carreira[degrau]) === normalizar(patenteInicial)) {
    nomes = carreira.slice(degrau);                 // e um degrau existente: comeca nele
  } else {
    /* Casou por palavra-chave, mas o edital chama de outro jeito ("Aluno-Sargento"
       para "3º Sargento"). O nome do edital vira o degrau zero, e a carreira
       segue a partir do que casou -- e o que a pessoa vive de verdade: ela e
       aluna primeiro, sargento depois. */
    nomes = [patenteInicial, ...carreira.slice(degrau)];
  }

  const tabela = nomes.map((nome, i) => ({
    nome,
    xp: XP_POR_DEGRAU[i] ?? (XP_POR_DEGRAU[XP_POR_DEGRAU.length - 1] + i * 20000),
  }));

  let atual = tabela[0], indice = 0;
  for (let i = 0; i < tabela.length; i++) {
    if (xp >= tabela[i].xp) { atual = tabela[i]; indice = i; }
  }
  const proximo = tabela[indice + 1] || null;
  const faltam = proximo ? proximo.xp - xp : 0;
  const fracao = proximo
    ? (xp - atual.xp) / (proximo.xp - atual.xp)
    : 1;

  return { nome: atual.nome, indice, proximo, faltam, fracao, tipo, total: tabela.length };
}

/* A tag: a materia mais dominada que ja passou de 70%.
   Abaixo disso nao ha tag -- e proposital, ver o cabecalho. */
export function tagDe(materias = []) {
  const aptas = (materias || [])
    .filter((m) => (m.progresso || 0) >= 70)
    .sort((a, b) => (b.progresso || 0) - (a.progresso || 0));

  if (!aptas.length) return null;

  for (const m of aptas) {
    const nome = TAGS_POR_MATERIA[normalizar(m.nome)];
    if (nome) return { nome, materia: m.nome, dominio: Math.round(m.progresso) };
  }
  return { nome: 'Especialista', materia: aptas[0].nome, dominio: Math.round(aptas[0].progresso) };
}

/* Quanto falta para a proxima tag -- serve ao estado "em formacao".
   Sem isto o usuario novo ve so um espaco vazio, que e pior que o badge que
   estava la antes. Uma barra dizendo "faltam 23% para virar Estrategista" e
   um motivo para estudar hoje; um vazio nao e. */
export function proximaTag(materias = []) {
  const candidatas = (materias || [])
    .filter((m) => (m.progresso || 0) < 70)
    .sort((a, b) => (b.progresso || 0) - (a.progresso || 0));
  if (!candidatas.length) return null;

  const m = candidatas[0];
  const nome = TAGS_POR_MATERIA[normalizar(m.nome)];
  if (!nome) return null;
  return { nome, materia: m.nome, dominio: Math.round(m.progresso || 0),
           faltam: Math.max(0, 70 - Math.round(m.progresso || 0)) };
}


/* Todas as tags que a pessoa JA CONQUISTOU -- a colecao.
   Ordem do Lucas em 02/08/2026: "acumular tudo e eu poder escolher realmente o
   que vai aparecer". Entao aqui devolvemos tudo, e quem decide o que veste e
   ele, nao o algoritmo. */
export function tagsConquistadas(materias = []) {
  const vistas = new Set();
  const fora = [];
  for (const m of (materias || [])) {
    const p = m.progresso || 0;
    if (p < 70) continue;
    const nome = TAGS_POR_MATERIA[normalizar(m.nome)] || "Especialista";
    if (vistas.has(nome)) continue;
    vistas.add(nome);
    fora.push({ nome, materia: m.nome, dominio: Math.round(p) });
  }
  return fora.sort((a, b) => b.dominio - a.dominio);
}

/* A tag que vai na divisa.
   A escolha do usuario ganha SEMPRE, desde que ele ainda a possua -- se ele
   escolheu uma e depois o progresso caiu abaixo de 70%, a escolha some
   sozinha em vez de exibir algo que ele nao tem mais. */
export function tagVestida(materias = [], escolhida = null) {
  const minhas = tagsConquistadas(materias);
  if (!minhas.length) return null;
  if (escolhida) {
    const achada = minhas.find((t) => t.nome === escolhida);
    if (achada) return achada;
  }
  return minhas[0];   // padrao: a de maior dominio
}


/* Patente abreviada, para onde o espaco e curto -- o cartao da barra lateral.
 *
 * Nao e apenas encurtar: INSIGNIA DE VERDADE E ABREVIADA. Ninguem borda
 * "Terceiro Sargento" num galao; borda "3o SGT". A forma curta e a forma
 * correta, e por acaso tambem e a que cabe.
 *
 * Medido antes: "3o SARGENTO BM" + "CALCULISTA" precisavam de 167px num
 * espaco de 135. Tentei alargar a divisa por baixo do avatar e o texto passou
 * a ser cortado do lado esquerdo -- pior, porque cortava o comeco.
 */
const ABREV = [
  // ⚠️ A ORDEM IMPORTA: a primeira regra que casar vence. "Capitao-Tenente"
  // precisa vir ANTES de "Tenente", senao vira "Capitao-Ten". Errei isso na
  // primeira versao e o teste mostrou.
  [/^Bombeiro (\d)[ªa] Classe$/i, "BM $1ª Cl"],
  [/Tenente-Coronel/i, "Ten-Cel"],
  [/Capit[aã]o-Tenente/i, "Cap-Ten"],
  [/Primeiro-Tenente/i, "1º Ten"],
  [/Segundo-Tenente/i, "2º Ten"],
  [/Guarda-Marinha/i, "Gd-Mar"],
  [/Sargento/i, "Sgt"],
  [/Subtenente/i, "Subten"],
  [/Aspirante/i, "Asp"],
  [/Coronel/i, "Cel"],
  [/Capit[aã]o/i, "Cap"],
  [/Tenente/i, "Ten"],
  [/Marinheiro/i, "Mar"],
  [/Soldado/i, "Sd"],
  [/Grumete/i, "Grum"],
  [/Cadete/i, "Cad"],
  [/Aluno/i, "Al"],
];

export function patenteCurta(nome = "") {
  let s = String(nome);
  for (const [de, para] of ABREV) {
    if (de.test(s)) { s = s.replace(de, para); break; }
  }
  return s;
}

/* Devolve o HTML da divisa. `esc` vem de astral.js: o nome da materia sai do
   edital, que e dado NAO CONFIAVEL (regra 4 do CLAUDE.md). */
export function divisaHTML({ xp = 0, edital = '', materias = [], tagEscolhida = null, compacta = false,
                             forca = null, patenteInicial = null }, esc = (s) => s) {
  const n = nivelDe(xp, edital, forca, patenteInicial);
  const nomeNivel = compacta ? patenteCurta(n.nome) : n.nome;
  const t = tagVestida(materias, tagEscolhida);
  const p = t ? null : proximaTag(materias);

  const nivel = `<span class="nivel">${esc(nomeNivel)}</span>`;

  if (t) {
    return `<span class="divisa" title="${esc(n.nome)} · ${esc(t.nome)}">`
         + nivel + `<span class="tag">${esc(t.nome)}</span></span>`;
  }
  if (p) {
    return `<span class="divisa" title="Faltam ${p.faltam}% em ${esc(p.materia)} para virar ${esc(p.nome)}">`
         + nivel
         + `<span class="tag emformacao">${esc(p.nome)} · ${p.dominio}%</span></span>`;
  }
  return `<span class="divisa">` + nivel
       + `<span class="tag vazia">sem tag</span></span>`;
}

/* Preenche todo elemento marcado com data-divisa. */
export function aplicarDivisa(dados, esc) {
  const html = divisaHTML(dados, esc);
  document.querySelectorAll('[data-divisa]').forEach((el) => { el.innerHTML = html; });
  return html;
}

/* ── LIGA SOZINHA ────────────────────────────────────────────────────────
   As 10 paginas carregam este arquivo e nao precisam saber de nada: ele
   acha a sessao, le o progresso e preenche todo [data-divisa].

   Escrito para NUNCA derrubar a pagina: qualquer falha aqui (sem sessao,
   rede fora, dado estranho) e engolida e a divisa apenas nao aparece. Uma
   insignia ausente e um detalhe; uma pagina em branco e um produto fora do
   ar. */
(async function ligarDivisa() {
  // fora do navegador (teste em Node) nao ha nada para ligar -- sair em silencio
  // deixa o modulo testavel sem estourar. Foi assim que eu verifiquei a logica
  // das tags antes de publicar.
  if (typeof document === 'undefined') return;
  if (!document.querySelector('[data-divisa]')) return;
  try {
    const { supabase, esc } = await import('./astral.js');
    const { carregarProgresso } = await import('./estado.js');

    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (!uid) return;

    /* IDENTIDADE -- nome e inicial, num lugar so.
       Medido em 02/08/2026 a pedido do Lucas: as 10 paginas resolviam o nome
       de CINCO jeitos diferentes. Umas mostravam o nome inteiro, outras so o
       primeiro; quatro tinham a propria cadeia de fallback repetida inline; e
       o dashboard ficava preso em "Carregando..." quando a cadeia dele
       falhava. Quinta vez que o mesmo defeito aparece neste projeto: peca
       compartilhada copiada em cada pagina.

       Aqui e uma vez so, e nao custa NENHUMA requisicao: o nome vem da sessao,
       que ja esta no navegador.

       03/08/2026 -- este bloco subiu para ANTES da leitura do banco. Antes ele
       esperava `carregarProgresso` responder para so entao escrever o nome, e
       era uma espera a toa: o nome nunca veio do banco. Nas medidas, a ida a
       Sao Paulo custava de 52ms a 553ms, e o usuario olhava "Carregando..."
       esse tempo todo a cada troca de menu, para ver um dado que ja estava
       na maquina dele.

       03/08/2026 (mesmo dia, mais tarde) -- a ESCRITA saiu daqui e foi para
       assets/js/identidade.js,
       que e script classico e roda antes da primeira pintura. Aqui ficou
       apenas a confirmacao: quando a sessao real chega do servidor, reaplica.
       Na esmagadora maioria das vezes o valor ja e o mesmo e nada muda na tela.

       ⚠️ NAO reescrever a resolucao do nome aqui. Ela mora num lugar so, de
       proposito -- ter cinco copias foi o que escondeu o bug do "Luca" por
       tres dias. Se `identidade.js` nao tiver carregado, o certo e nao mostrar
       nada, nao inventar uma segunda logica. */
    try {
      const u = data.session.user;
      if (window.Astral && window.Astral.aplicarIdentidade) {
        window.Astral.aplicarIdentidade(u);
      }
    } catch { /* a divisa nao pode cair por causa do nome */ }

    /* A DIVISA (patente + tag) depende do progresso, esta sim vem do banco.
       Mas a copia do navegador serve para desenhar AGORA: pinta com o que se
       sabe e corrige sozinha quando o banco responder.

       Isto e seguro AQUI porque esta tela so LE. Nenhuma gravacao sai daqui,
       entao nao ha risco de escrever por cima de algo mais novo -- que e a
       razao de o resto do app continuar esperando o banco (ver estado.js). */
    const pintar = (p) => aplicarDivisa({
      xp: p?.xp || 0,
      edital: p?.edital?.nome || p?.edital || '',
      materias: p?.materias || [],
      tagEscolhida: p?.tagEscolhida || null,
      compacta: true,   // e o cartao da barra lateral: espaco curto
      // Vem da IA que leu o edital (04/08/2026). Em edital antigo sao nulos e
      // a patente volta a ser adivinhada pelo nome -- o plano B de sempre.
      forca: p?.edital?.forca || null,
      patenteInicial: p?.edital?.patenteInicial || null,
    }, esc);

    pintar(await carregarProgresso(uid, pintar));
  } catch (e) {
    /* silencio proposital -- ver comentario acima */
  }
})();
