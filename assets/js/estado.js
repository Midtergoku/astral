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

const VAZIO = () => ({
  xp: 0,
  streak: 0,
  horas: 0,
  materias: [],
  cronogramaHoje: [],
  edital: null,
  badges: [],
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
});

// ── Carregar ────────────────────────────────────────────────────────────────
/**
 * Ordem importa. Se o banco ainda nao tem linha para este usuario mas o
 * navegador tem dados, esses dados SOBEM antes de qualquer coisa. Sem isso,
 * quem ja usava o Astral abriria o app depois da mudanca e veria tudo zerado --
 * que e exatamente o problema que este modulo existe para resolver.
 */
export async function carregarProgresso(uid) {
  const local = lerLocal(uid);

  const { data, error } = await supabase
    .from('progresso').select('*').eq('usuario_id', uid).maybeSingle();

  if (error) {
    console.error('Falha ao ler o progresso; usando a cópia do navegador.', error);
    return local ? normalizar(local) : VAZIO();
  }

  if (data) {
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
  ultimoEstado = estado;
  ultimoUid = uid;
  gravarLocal(uid, estado);

  const enviar = async () => {
    tarefaSalvar = null;
    const { error } = await supabase
      .from('progresso')
      .upsert(paraBanco(uid, ultimoEstado), { onConflict: 'usuario_id' });
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

      fetch(`${SUPABASE_URL}/rest/v1/progresso?on_conflict=usuario_id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(paraBanco(ultimoUid, ultimoEstado)),
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

// ── Sessoes do cronometro ───────────────────────────────────────────────────
export async function registrarSessao(uid, { materia, segundos, xp, modo }) {
  const { data, error } = await supabase.from('sessoes_estudo').insert({
    usuario_id: uid,
    materia: materia ? String(materia).slice(0, 160) : null,
    segundos: Math.min(86400, Math.max(0, Math.round(Number(segundos) || 0))),
    xp: Math.max(0, Math.round(Number(xp) || 0)),
    modo: modo === 'pomodoro' ? 'pomodoro' : 'livre',
  }).select().single();
  if (error) { console.error('Falha ao registrar a sessão.', error); return null; }
  return data;
}

/** Sessões de hoje, do fuso do usuário. */
export async function sessoesDeHoje(uid) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('sessoes_estudo').select('*')
    .eq('usuario_id', uid)
    .gte('criado_em', inicio.toISOString())
    .order('criado_em', { ascending: false });
  if (error) { console.error('Falha ao ler as sessões de hoje.', error); return []; }
  return data;
}
