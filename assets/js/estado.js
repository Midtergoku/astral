// ============================================================================
// Astral — estado de estudo, agora no banco.
//
// Ate aqui tudo vivia no localStorage: estudar no computador e abrir no celular
// mostrava a tela zerada. Este modulo passa a guardar no Supabase, mantendo o
// navegador como espelho para o app continuar respondendo offline e nao perder
// nada se a rede cair no meio de um salvamento.
//
// O formato do objeto e IGUAL ao que as paginas ja usavam
// ({ xp, streak, horas, materias, cronogramaHoje, edital, badges }), de
// proposito: assim cada pagina troca so o carregar/salvar, e nao a logica.
// ============================================================================

import { supabase, SUPABASE_URL, SUPABASE_KEY } from './astral.js';
import { carregarEstatisticas, invalidarEstatisticas, sessoesDoDia, ultimosDias } from './estatisticas.js';
/* As paginas pegam a fonte unica de estatisticas POR AQUI, nunca importando
   estatisticas.js direto: pagina -> modulo leva `?v=`, modulo -> modulo nao, e
   URL diferente e modulo diferente -- haveria duas copias do que esta guardado,
   e gravar uma sessao invalidaria so uma delas (.claude/rules/paginas.md, sec. 9). */
export { carregarEstatisticas, invalidarEstatisticas, sessoesDoDia, ultimosDias, ultimasSemanas, dataDoDia } from './estatisticas.js';

const VAZIO = () => ({
  xp: 0,
  streak: 0,
  horas: 0,
  materias: [],
  cronogramaHoje: [],
  edital: null,
  badges: [],
  tagEscolhida: null,   // nulo = o Astral escolhe. Ver skills/astral-gamificacao.
  rotina: null,         // nulo = nunca respondeu o questionario. Ver assets/js/cronograma.js.
});

const chaveLocal = (uid) => `astral_dados_${uid}`;

function lerLocal(uid) {
  try {
    const bruto = localStorage.getItem(chaveLocal(uid));
    return bruto ? JSON.parse(bruto) : null;
  } catch { return null; }
}

function gravarLocal(uid, estado) {
  try { localStorage.setItem(chaveLocal(uid), JSON.stringify(estado)); }
  catch { /* cota cheia ou modo restrito: o banco ja tem, segue o jogo */ }
}

/** Normaliza o que veio do banco ou do navegador para o formato das paginas. */
function normalizar(bruto) {
  const v = VAZIO();
  if (!bruto || typeof bruto !== 'object') return v;
  return {
    xp:             Number(bruto.xp) || 0,
    streak:         Number(bruto.streak) || 0,
    horas:          Number(bruto.horas) || 0,
    materias:       Array.isArray(bruto.materias) ? bruto.materias : v.materias,
    cronogramaHoje: Array.isArray(bruto.cronogramaHoje ?? bruto.cronograma_hoje)
                      ? (bruto.cronogramaHoje ?? bruto.cronograma_hoje) : v.cronogramaHoje,
    edital:         bruto.edital ?? null,
    badges:         Array.isArray(bruto.badges) ? bruto.badges : v.badges,
    // aceita os dois nomes: o do banco (tag_escolhida) e o do app (tagEscolhida).
    // Sem isto, quem escolheu a tag num aparelho a perderia ao abrir noutro.
    tagEscolhida:   (typeof (bruto.tagEscolhida ?? bruto.tag_escolhida) === 'string')
                      ? (bruto.tagEscolhida ?? bruto.tag_escolhida) : null,
    rotina:         (bruto.rotina && typeof bruto.rotina === 'object') ? bruto.rotina : null,
  };
}

const paraBanco = (uid, e) => ({
  usuario_id:      uid,
  xp:              Math.max(0, Math.round(Number(e.xp) || 0)),
  streak:          Math.max(0, Math.round(Number(e.streak) || 0)),
  horas:           Math.max(0, Number(e.horas) || 0),
  edital:          e.edital ?? null,
  materias:        Array.isArray(e.materias) ? e.materias : [],
  cronograma_hoje: Array.isArray(e.cronogramaHoje) ? e.cronogramaHoje : [],
  badges:          Array.isArray(e.badges) ? e.badges : [],
  // A tag que o usuario escolheu vestir. NULO = deixa o Astral escolher,
  // que e o padrao e o comportamento de quem nunca abriu a tela de tags.
  tag_escolhida:   typeof e.tagEscolhida === "string" && e.tagEscolhida.trim()
                     ? e.tagEscolhida.trim().slice(0, 60) : null,
});

// ── Carregar ────────────────────────────────────────────────────────────────

/* UMA leitura por carregamento de pagina (03/08/2026).
 *
 * MEDIDO depois de o Lucas reclamar de lentidao ao trocar de menu: cada pagina
 * do app lia a MESMA linha do banco DUAS vezes -- a divisa.js, para a patente
 * do topo, e a propria pagina, para o conteudo. Duas idas a Sao Paulo, medidas
 * entre 52ms e 553ms cada, para buscar exatamente a mesma linha.
 *
 * Aqui a segunda chamada pega carona na primeira. A janela e curta de proposito:
 * ela cobre o carregamento de uma pagina e nada alem disso. Guardar por mais
 * tempo economizaria mais e comecaria a mentir -- uma pagina que le de novo
 * depois de salvar precisa ver o valor novo. */
const emVoo = new Map();
const JANELA_CARONA = 2000;

/* Contas cujo progresso NAO veio (banco fora e nada no navegador): a tela
   tem de dizer isso, e ninguem salva o vazio por cima do verdadeiro. */
const leituraFalhou = new Set();
export const progressoIndisponivel = (uid) => leituraFalhou.has(uid);

function lerDoBanco(uid) {
  if (emVoo.has(uid)) return emVoo.get(uid);

  const tarefa = (async () => {
    const local = lerLocal(uid);
    /* 03/10/2026 (auditoria NUM-14): a sequencia vem calculada NA HORA
       (minha_sequencia), junto com o progresso. O progresso.streak guardado
       so muda quando a pagina salva: na 1a abertura do dia, quem ja tinha
       perdido a sequencia via "2 dias" no topo -- e o certo so na 2a. */
    const [{ data, error }, seq] = await Promise.all([
      supabase.from('progresso').select('*').eq('usuario_id', uid).maybeSingle(),
      // Sem a sequencia de hoje, vale a guardada -- a leitura do progresso
      // NUNCA cai por causa dela (o testa-velocidade pegou: um erro aqui
      // derrubava o progresso inteiro).
      Promise.resolve().then(() => supabase.rpc('minha_sequencia')).catch(() => ({ error: true })),
    ]);

    if (error) {
      console.error('Falha ao ler o progresso; usando a cópia do navegador.', error);
      /* 03/10/2026 (auditoria UX-01, roadmap 3.2): sem o banco E sem copia no
         navegador, o que volta e um progresso VAZIO -- e a tela mostrava
         "0 dias, Recruta, 0h" como se fosse real. Pior: se a pessoa marcasse
         uma sessao, o vazio seria SALVO por cima do verdadeiro. Agora a falha
         fica marcada: a tela avisa, e salvarProgresso se recusa. */
      if (!local) { leituraFalhou.add(uid); return VAZIO(); }
      return normalizar(local);
    }
    leituraFalhou.delete(uid);

    if (data) {
      if (!seq?.error && Number.isFinite(Number(seq?.data))) data.streak = Number(seq.data);
      const doBanco = normalizar(data);
      gravarLocal(uid, doBanco);
      return doBanco;
    }

    // Primeira vez neste usuário: migra o que houver no navegador.
    const inicial = local ? normalizar(local) : VAZIO();
    const { error: erroCriar } = await supabase.from('progresso').insert(paraBanco(uid, inicial));
    if (erroCriar) console.error('Falha ao criar o progresso inicial.', erroCriar);
    else if (local) console.info('Progresso do navegador migrado para a conta.');

    gravarLocal(uid, inicial);
    return inicial;
  })();

  emVoo.set(uid, tarefa);
  const soltar = () => setTimeout(() => { if (emVoo.get(uid) === tarefa) emVoo.delete(uid); }, JANELA_CARONA);
  tarefa.then(soltar, soltar);
  return tarefa;
}

/**
 * Ordem importa. Se o banco ainda nao tem linha para este usuario mas o
 * navegador tem dados, esses dados SOBEM antes de qualquer coisa. Sem isso,
 * quem ja usava o Astral abriria o app depois da mudanca e veria tudo zerado --
 * que e exatamente o problema que este modulo existe para resolver.
 *
 * ── O SEGUNDO PARAMETRO, e por que ele NAO e o padrao ──────────────────────
 *
 * Sem `aoAtualizar`, esta funcao espera o banco. E o comportamento de sempre,
 * e continua sendo o certo para toda tela que DEPOIS GRAVA: quem le uma copia
 * velha do navegador, soma XP em cima dela e salva, apaga o que a pessoa fez
 * no celular meia hora antes. Perder dado e muito pior que esperar 300ms.
 *
 * Com `aoAtualizar`, devolve na hora o que ja esta no navegador e chama de
 * volta quando o banco responder. So para tela de LEITURA -- hoje, a divisa
 * do topo. Se algum dia uma tela que grava usar isto, tem de rebasear o que
 * escreve em cima do valor fresco, nao do que ela desenhou.
 */
export async function carregarProgresso(uid, aoAtualizar) {
  const local = lerLocal(uid);
  const doBanco = lerDoBanco(uid);

  if (typeof aoAtualizar === 'function' && local) {
    const agora = normalizar(local);
    doBanco.then((fresco) => {
      // so incomoda a tela se o valor realmente mudou
      if (JSON.stringify(fresco) !== JSON.stringify(agora)) {
        try { aoAtualizar(fresco); } catch (e) { console.error('Falha ao atualizar a tela.', e); }
      }
    }, () => { /* ja reportado la dentro */ });
    return agora;
  }

  return doBanco;
}

// ── Salvar ──────────────────────────────────────────────────────────────────
let tarefaSalvar = null;
let ultimoEstado = null;
// Guardado para a gravacao final ao fechar a aba, que nao recebe parametros.
let ultimoUid = null;

/**
 * Grava no navegador na hora (para a tela nunca mentir) e no banco com um
 * respiro de 600ms. Marcar cinco sessoes seguidas vira uma escrita, nao cinco.
 */
export function salvarProgresso(uid, estado, { imediato = false } = {}) {
  // 03/10/2026 (UX-01): o progresso nao veio -- salvar seria gravar o VAZIO
  // por cima do verdadeiro. Nem no navegador: a copia vazia viraria "o ultimo
  // valor conhecido" na proxima falha.
  if (leituraFalhou.has(uid)) {
    console.warn('Progresso nao carregado: nada foi salvo, para nao apagar os dados reais.');
    return Promise.resolve();
  }
  ultimoEstado = estado;
  ultimoUid = uid;
  gravarLocal(uid, estado);

  const enviar = async () => {
    tarefaSalvar = null;

    /* 🔴 MESCLA, nao substitui (05/08/2026).
       Antes isto era um upsert que trocava a linha inteira -- e duas telas
       abertas (celular e computador) apagavam o trabalho uma da outra. Medido
       em tools/testa-concorrencia.js: o XP caía de 1500 para 1200, o progresso
       de uma matéria voltava de 70% para 40% e uma conquista sumia.

       A função no banco fica com o MAIOR xp, as MAIORES horas, a união das
       conquistas e o maior progresso de cada matéria. Ver a migration
       20260805200000. */
    const b = paraBanco(uid, ultimoEstado);
    const { error } = await supabase.rpc('salvar_progresso', {
      p_xp: b.xp,
      p_streak: b.streak,
      p_horas: b.horas,
      p_edital: b.edital,
      p_materias: b.materias,
      p_cronograma_hoje: b.cronograma_hoje,
      p_badges: b.badges,
      p_tag_escolhida: b.tag_escolhida,
    });
    if (error) console.error('Falha ao salvar o progresso no banco.', error);
  };

  if (imediato) {
    if (tarefaSalvar) { clearTimeout(tarefaSalvar); tarefaSalvar = null; }
    return enviar();
  }

  if (tarefaSalvar) clearTimeout(tarefaSalvar);
  tarefaSalvar = setTimeout(enviar, 600);
}

// Fechar a aba com um salvamento pendente perderia o ultimo passo do usuario.
//
// 🐛 CORRIGIDO em 31/07/2026: a versao anterior apenas CANCELAVA o salvamento
// pendente -- o comentario dizia proteger e o codigo fazia o oposto. Quem
// marcasse uma sessao e fechasse a aba em menos de 600ms perdia aquele passo
// no banco (ficava so no localStorage, e sumia ao trocar de aparelho).
//
// Agora despacha de verdade, com `keepalive`: a requisicao sobrevive ao
// fechamento da aba. O cliente supabase-js nao expoe keepalive, entao a
// gravacao final vai direto no PostgREST.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (!tarefaSalvar || !ultimoEstado || !ultimoUid) return;
    clearTimeout(tarefaSalvar);
    tarefaSalvar = null;

    try {
      const chaveSessao = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
      const token = chaveSessao && JSON.parse(localStorage.getItem(chaveSessao))?.access_token;
      if (!token) return; // sem sessao nao ha o que gravar; o local ja tem

      /* A mesma funcao de mesclagem do caminho normal -- ver `enviar()` acima.
         Se a gravacao ao fechar a aba usasse o upsert antigo, ela seria
         justamente a que apagaria o trabalho da OUTRA aba, que continua
         aberta. Fechar uma aba nao pode desfazer o estudo feito na outra. */
      const b = paraBanco(ultimoUid, ultimoEstado);
      fetch(`${SUPABASE_URL}/rest/v1/rpc/salvar_progresso`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_xp: b.xp, p_streak: b.streak, p_horas: b.horas,
          p_edital: b.edital, p_materias: b.materias,
          p_cronograma_hoje: b.cronograma_hoje, p_badges: b.badges,
          p_tag_escolhida: b.tag_escolhida,
        }),
        keepalive: true,
      }).catch(() => { /* aba fechando: nao ha a quem reportar */ });
    } catch { /* jamais atrapalhar o fechamento da aba */ }
  });
}

// ── Eventos do calendario ───────────────────────────────────────────────────
export async function carregarEventos(uid) {
  const { data, error } = await supabase
    .from('eventos').select('*').eq('usuario_id', uid).order('data', { ascending: true });

  if (error) {
    console.error('Falha ao ler eventos.', error);
    return [];
  }

  if (data.length === 0) {
    // Migra o calendario que estava so no navegador.
    let antigos = [];
    try { antigos = JSON.parse(localStorage.getItem(`astral_eventos_${uid}`) || '[]'); } catch { /* ignora */ }
    if (Array.isArray(antigos) && antigos.length) {
      const linhas = antigos
        .filter(e => e && e.nome && e.data)
        .map(e => ({
          usuario_id: uid,
          nome: String(e.nome).slice(0, 200),
          data: e.data,
          categoria: String(e.categoria || 'personalizado').slice(0, 40),
          obs: e.obs ? String(e.obs).slice(0, 1000) : null,
        }));
      if (linhas.length) {
        const { data: criados, error: erroMigrar } = await supabase.from('eventos').insert(linhas).select();
        if (erroMigrar) console.error('Falha ao migrar eventos.', erroMigrar);
        else { console.info(`${criados.length} evento(s) migrados para a conta.`); return criados; }
      }
    }
  }

  return data;
}

export async function criarEvento(uid, evento) {
  const { data, error } = await supabase.from('eventos').insert({
    usuario_id: uid,
    nome: String(evento.nome || '').slice(0, 200),
    data: evento.data,
    categoria: String(evento.categoria || 'personalizado').slice(0, 40),
    obs: evento.obs ? String(evento.obs).slice(0, 1000) : null,
    /* 28/09/2026: a origem era descartada aqui. O calendario marca a prova
       importada do edital com origem 'edital_prova' e confere essa marca
       antes de importar -- sem ela, CADA visita importava a prova de novo,
       e o indice unico (usuario_id, origem) nunca agia. So essa origem
       existe; qualquer outra coisa vira evento comum. */
    origem: evento.origem === 'edital_prova' ? 'edital_prova' : null,
  }).select().single();
  if (error) throw new Error('Não consegui salvar o evento. Tente de novo.');
  return data;
}

export async function atualizarEvento(uid, id, evento) {
  const { data, error } = await supabase.from('eventos').update({
    nome: String(evento.nome || '').slice(0, 200),
    data: evento.data,
    categoria: String(evento.categoria || 'personalizado').slice(0, 40),
    obs: evento.obs ? String(evento.obs).slice(0, 1000) : null,
  }).eq('id', id).eq('usuario_id', uid).select().single();
  if (error) throw new Error('Não consegui atualizar o evento.');
  return data;
}

export async function removerEvento(uid, id) {
  const { error } = await supabase.from('eventos').delete().eq('id', id).eq('usuario_id', uid);
  if (error) throw new Error('Não consegui remover o evento.');
}

/* ── A prova do edital no calendario (03/10/2026, auditoria CAL-01 e CAL-02) ──
   Antes a prova era importada UMA vez, na primeira visita ao calendario, e
   nunca mais mudava: quem trocava de edital ficava com a prova antiga -- e o
   mesmo painel dizia "faltam 170 dias" numa faixa e "66 dias restantes" no
   quadro do chefe. E apagar a prova importada nao adiantava: ela voltava na
   visita seguinte.

   Agora:
   - a linha de origem 'edital_prova' ACOMPANHA o edital (nome e data);
   - apagar a prova importada a marca como DISPENSADA (nao some do banco): ela
     sai da tela e nao volta enquanto o edital for o mesmo. Trocou de edital,
     a prova do novo aparece. Sem coluna nova: a categoria guarda a marca. */
export const PROVA_DISPENSADA = 'dispensada';
const OBS_IMPORTADA = 'Importado automaticamente do edital';

export const eventosVisiveis = (lista) => (lista || []).filter((e) => e.categoria !== PROVA_DISPENSADA);

const ehProvaImportada = (e) => e.origem === 'edital_prova' || (e.categoria === 'prova' && e.obs === OBS_IMPORTADA);

function provaDoEdital(edital) {
  const m = String(edital?.dataProva || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return { nome: ('Prova — ' + (edital.nome || 'Concurso')).slice(0, 200), data: `${m[3]}-${m[2]}-${m[1]}` };
}

/** Deixa a prova importada igual a do edital atual. Devolve a lista (inteira). */
export async function sincronizarProvaDoEdital(uid, edital, eventos) {
  const lista = [...(eventos || [])];
  const alvo = provaDoEdital(edital);
  if (!alvo) return lista;
  const i = lista.findIndex(ehProvaImportada);
  try {
    if (i < 0) {
      lista.push(await criarEvento(uid, { ...alvo, categoria: 'prova', obs: OBS_IMPORTADA, origem: 'edital_prova' }));
      return lista;
    }
    const atual = lista[i];
    if (atual.nome === alvo.nome && atual.data === alvo.data) return lista;   // mesma prova (ativa ou dispensada)
    lista[i] = await atualizarEvento(uid, atual.id, { ...alvo, categoria: 'prova', obs: OBS_IMPORTADA });
  } catch (e) {
    // Corrida entre abas (indice unico) ou data invalida: o calendario segue.
    console.warn('Prova do edital nao sincronizada.', e?.message);
  }
  return lista;
}

/** "Apagar" a prova importada: some da tela e nao volta para o MESMO edital. */
export function dispensarProvaDoEdital(uid, evento) {
  return atualizarEvento(uid, evento.id, { ...evento, categoria: PROVA_DISPENSADA });
}

export const provaImportada = (lista) => (lista || []).find(ehProvaImportada) || null;

// ── Sessoes de estudo ───────────────────────────────────────────────────────
/* Os tres modos, e a diferenca entre eles NAO e cosmetica:

     'livre' | 'pomodoro'   tempo MEDIDO -- o relogio correu de verdade
     'cronograma'           tempo DECLARADO -- a pessoa marcou a sessao do dia

   Sao graus de confianca diferentes, e o calculo de XP no servidor vai poder
   tratar cada um do seu jeito. Ate 19/09/2026 esta funcao tinha uma lista
   branca de dois nomes que convertia QUALQUER outra coisa em 'livre' -- entao
   a sessao vinda do cronograma era gravada como se o cronometro tivesse
   rodado. O teste pegou: materia certa, duracao certa, modo errado. */
const MODOS = new Set(['livre', 'pomodoro', 'cronograma']);

export async function registrarSessao(uid, { materia, segundos, xp, modo }) {
  const { data, error } = await supabase.from('sessoes_estudo').insert({
    usuario_id: uid,
    materia: materia ? String(materia).slice(0, 160) : null,
    segundos: Math.min(86400, Math.max(0, Math.round(Number(segundos) || 0))),
    xp: Math.max(0, Math.round(Number(xp) || 0)),
    modo: MODOS.has(modo) ? modo : 'livre',
  }).select().single();
  // A fonte unica de estatisticas fica velha com a sessao nova: a proxima leitura vai ao servidor.
  invalidarEstatisticas();
  if (error) { console.error('Falha ao registrar a sessão.', error); ultimoErroDeSessao = error; return null; }
  return data;
}

/* 03/10/2026 (auditoria CRN-01): o cronometro precisa saber POR QUE o servidor
   recusou -- antes a tela somava o XP mesmo assim (a 2a aba mostrava "120 XP"
   que nao existiam). Devolve { sessao } ou { erro } com frase para o aluno. */
let ultimoErroDeSessao = null;
export async function gravarSessao(uid, dados) {
  ultimoErroDeSessao = null;
  const sessao = await registrarSessao(uid, dados);
  if (sessao) return { sessao };
  const m = String(ultimoErroDeSessao?.message || '');
  const erro = /mais longa que o tempo/.test(m)
    ? 'Esta sessão não foi aceita: ela é mais longa que o tempo desde a última sessão gravada (outra aba aberta?).'
    : /menos de 1 minuto/.test(m) ? 'Sessão com menos de 1 minuto não conta.'
    : 'Não consegui gravar esta sessão agora. Tente finalizar de novo em instantes.';
  return { erro };
}

/** Sessões de hoje -- o "hoje" do SERVIDOR (fuso de Sao Paulo), da fonte unica
 *  de estatisticas (assets/js/estatisticas.js). Ate 01/10/2026 era o relogio do
 *  aparelho: no Acre, "0 min hoje" com a missao dizendo "estudou 50 min hoje". */
export async function sessoesDeHoje(uid) {
  try {
    const est = await carregarEstatisticas();
    return sessoesDoDia(est, est?.hoje?.dia);
  } catch (error) {
    console.error('Falha ao ler as sessões de hoje.', error);
    return [];
  }
}

/** Sessoes dos ultimos 7 dias, ja somadas por dia.
 *
 *  Existe para o cartao de grafico da semana (peca C2 do roadmap). O dado ja
 *  estava no banco desde que o cronometro foi feito -- nunca tinha sido
 *  mostrado em forma nenhuma.
 *
 *  Devolve SEMPRE 7 posicoes, do dia mais antigo ao de hoje, mesmo que o
 *  usuario nao tenha estudado em nenhum. Um grafico com buracos e pior que um
 *  grafico zerado: o zero conta uma historia, o buraco parece defeito.
 */
export async function sessoesDaSemana(uid) {
  /* 01/10/2026: da fonte unica de estatisticas, com o dia de cada sessao ja
     calculado no servidor (fuso de Sao Paulo). Antes cada dia era a meia-noite
     do aparelho. Falhar aqui nao pode derrubar a tela: devolve a semana zerada
     (7 dias ate hoje no aparelho), e o cartao mostra "nenhuma sessao ainda". */
  try {
    return ultimosDias(await carregarEstatisticas(), 7);
  } catch (error) {
    console.error('Falha ao ler as sessões da semana.', error);
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje); d.setDate(hoje.getDate() - (6 - i));
      return { data: d, segundos: 0, hoje: i === 6 };
    });
  }
}

// ── Rotina de estudo (28/09/2026) ───────────────────────────────────────────
/* Gravada A PARTE do resto do progresso, e de proposito: `salvar_progresso`
   nao conhece esta coluna, entao salvar XP ou materias nunca apaga a rotina,
   e a rotina nao disputa a mesma gravacao que o cronometro. Uma linha so,
   uma coluna so. Quem monta a semana com ela e assets/js/cronograma.js. */
export async function salvarRotina(uid, rotina) {
  const { error } = await supabase.from('progresso')
    .update({ rotina }).eq('usuario_id', uid);
  if (error) throw new Error('Não consegui salvar sua rotina. Tente de novo.');
  // O espelho do navegador tambem, senao a proxima leitura rapida mostraria a velha.
  const local = lerLocal(uid);
  if (local) gravarLocal(uid, { ...local, rotina });
}
