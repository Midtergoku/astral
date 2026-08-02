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

const TABELAS_NIVEIS = {
    bombeiros: [
      { nome: 'Bombeiro 3ª Classe', xp: 0     },
      { nome: 'Bombeiro 2ª Classe', xp: 500   },
      { nome: 'Bombeiro 1ª Classe', xp: 1200  },
      { nome: 'Cabo BM',            xp: 2500  },
      { nome: '3º Sargento BM',     xp: 4500  },
      { nome: '2º Sargento BM',     xp: 7000  },
      { nome: '1º Sargento BM',     xp: 10000 },
      { nome: 'Subtenente BM',      xp: 14000 },
      { nome: 'Aspirante BM',       xp: 19000 },
      { nome: 'Tenente BM',         xp: 25000 },
      { nome: 'Capitão BM',         xp: 35000 },
    ],
    marinha: [
      { nome: 'Grumete',            xp: 0     },
      { nome: 'Marinheiro',         xp: 500   },
      { nome: 'Cabo',               xp: 1200  },
      { nome: '3º Sargento',        xp: 2500  },
      { nome: '2º Sargento',        xp: 4500  },
      { nome: '1º Sargento',        xp: 7000  },
      { nome: 'Suboficial',         xp: 10000 },
      { nome: 'Guarda-Marinha',     xp: 14000 },
      { nome: 'Aspirante',          xp: 19000 },
      { nome: 'Tenente',            xp: 25000 },
      { nome: 'Capitão-Tenente',    xp: 35000 },
    ],
    aeronautica: [
      { nome: 'Recruta',            xp: 0     },
      { nome: 'Soldado',            xp: 500   },
      { nome: 'Cabo',               xp: 1200  },
      { nome: '3º Sargento',        xp: 2500  },
      { nome: '2º Sargento',        xp: 4500  },
      { nome: '1º Sargento',        xp: 7000  },
      { nome: 'Suboficial',         xp: 10000 },
      { nome: 'Aspirante-a-Oficial',xp: 14000 },
      { nome: '2º Tenente',         xp: 19000 },
      { nome: '1º Tenente',         xp: 25000 },
      { nome: 'Capitão',            xp: 35000 },
    ],
    exercito: [
      { nome: 'Recruta',            xp: 0     },
      { nome: 'Soldado',            xp: 500   },
      { nome: 'Cabo',               xp: 1200  },
      { nome: '3º Sargento',        xp: 2500  },
      { nome: '2º Sargento',        xp: 4500  },
      { nome: '1º Sargento',        xp: 7000  },
      { nome: 'Subtenente',         xp: 10000 },
      { nome: 'Aspirante-a-Oficial',xp: 14000 },
      { nome: '2º Tenente',         xp: 19000 },
      { nome: '1º Tenente',         xp: 25000 },
      { nome: 'Capitão',            xp: 35000 },
    ],
    pm: [
      { nome: 'Soldado PM',         xp: 0     },
      { nome: 'Cabo PM',            xp: 500   },
      { nome: '3º Sargento PM',     xp: 1200  },
      { nome: '2º Sargento PM',     xp: 2500  },
      { nome: '1º Sargento PM',     xp: 4500  },
      { nome: 'Subtenente PM',      xp: 7000  },
      { nome: 'Aspirante PM',       xp: 10000 },
      { nome: '2º Tenente PM',      xp: 14000 },
      { nome: '1º Tenente PM',      xp: 19000 },
      { nome: 'Capitão PM',         xp: 25000 },
      { nome: 'Major PM',           xp: 35000 },
    ],
    default: [
      { nome: 'Recruta',            xp: 0     },
      { nome: 'Soldado',            xp: 500   },
      { nome: 'Cabo',               xp: 1200  },
      { nome: 'Sargento',           xp: 2500  },
      { nome: 'Subtenente',         xp: 4500  },
      { nome: 'Tenente',            xp: 7000  },
      { nome: 'Capitão',            xp: 10000 },
      { nome: 'Major',              xp: 14000 },
      { nome: 'Tenente-Coronel',    xp: 19000 },
      { nome: 'Coronel',            xp: 25000 },
      { nome: 'General',            xp: 35000 },
    ],
  }
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

/* O nivel a partir do XP e do nome do edital.
   Devolve tambem o proximo e o quanto falta, para a barra de progresso. */
export function nivelDe(xp = 0, nomeEdital = '') {
  const tipo = detectarTipoConcurso(nomeEdital);
  const tabela = TABELAS_NIVEIS[tipo] || TABELAS_NIVEIS.default;

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

/* Devolve o HTML da divisa. `esc` vem de astral.js: o nome da materia sai do
   edital, que e dado NAO CONFIAVEL (regra 4 do CLAUDE.md). */
export function divisaHTML({ xp = 0, edital = '', materias = [], tagEscolhida = null }, esc = (s) => s) {
  const n = nivelDe(xp, edital);
  const t = tagVestida(materias, tagEscolhida);
  const p = t ? null : proximaTag(materias);

  const nivel = `<span class="nivel">${esc(n.nome)}</span>`;

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
       + `<span class="tag vazia">sem especialidade</span></span>`;
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

    const d = await carregarProgresso(uid);
    aplicarDivisa({
      xp: d?.xp || 0,
      edital: d?.edital?.nome || d?.edital || '',
      materias: d?.materias || [],
      tagEscolhida: d?.tagEscolhida || null,
    }, esc);
  } catch (e) {
    /* silencio proposital -- ver comentario acima */
  }
})();
