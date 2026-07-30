// ============================================================================
// Astral — nucleo compartilhado do frontend.
//
// Reune o que estava duplicado em ate 11 arquivos (cliente Supabase, guarda de
// sessao, logout) e acrescenta o que faltava em todos: escape de HTML e
// chamada autenticada as edge functions.
// ============================================================================

// Versao TRAVADA de proposito. Antes era "@supabase/supabase-js/+esm" sem pin:
// o jsdelivr entregava sempre a ultima versao, entao um major novo derrubaria
// o app inteiro de madrugada, sem ninguem ter tocado em nada. Tambem e
// superficie de supply chain. Para atualizar, mude AQUI, num lugar so.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';

export const SUPABASE_URL = 'https://jjogmcacbdefwiwcyjxp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n-PClIEGglZWhoEySjB8PA_z7KEgHfJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Escape ──────────────────────────────────────────────────────────────────
// O app monta HTML com template string e innerHTML em ~40 lugares. Os dados
// que entram ali vem da IA, do PDF do edital e do que o usuario digita --
// nenhum deles e confiavel. Como o token de sessao do Supabase fica no
// localStorage, um XSS aqui e sequestro de conta, nao so tela quebrada.

/** Para texto dentro de um elemento: <div>${esc(x)}</div> */
export function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Para valor de atributo: <div title="${att(x)}"> */
export const att = esc;

/**
 * Para href/src. Recusa qualquer coisa que nao seja http(s) -- em especial
 * "javascript:", que executaria codigo com um clique do usuario.
 * Devolve '#' quando a URL nao presta, para o link existir e nao fazer nada.
 */
export function urlSegura(valor) {
  const bruto = String(valor ?? '').trim();
  if (!bruto) return '#';
  try {
    const u = new URL(bruto, window.location.origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '#';
  } catch {
    return '#';
  }
}

/**
 * Para texto que vai dentro de aspas simples num atributo onclick.
 * Melhor ainda e nao usar onclick inline -- mas onde ele ja existe, isto
 * impede que o dado feche a string e injete codigo.
 */
export function escJs(valor) {
  return String(valor ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/\r?\n/g, ' ');
}

// ── Sessao ──────────────────────────────────────────────────────────────────

/** Guarda de pagina logada. Devolve a sessao ou manda para o login. */
export async function exigirSessao() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

export async function fazerLogout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

/** Nome de exibicao do usuario, com os mesmos fallbacks usados antes. */
export function nomeDoUsuario(usuario, perfil) {
  return perfil?.nome
    || usuario?.user_metadata?.full_name
    || usuario?.email?.split('@')[0]
    || 'Concurseiro';
}

// ── Chamada autenticada as edge functions ───────────────────────────────────

/**
 * Antes cada pagina mandava a publishable key no Authorization -- a mesma
 * chave que esta no codigo-fonte, visivel para qualquer um. Desde o Bloco B2
 * as funcoes recusam essa chave e exigem o access_token do usuario.
 *
 * Devolve o campo `data` da resposta, ou lanca Error com mensagem ja pronta
 * para mostrar na tela.
 */
export async function chamarIA(rota, corpo, { timeoutMs = 120000 } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    throw new Error('Sessao expirada.');
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);

  let resposta;
  try {
    resposta = await fetch(`${SUPABASE_URL}/functions/v1/${rota}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('A IA demorou demais para responder. Tente de novo.');
    throw new Error('Sem conexao com o servidor. Verifique sua internet.');
  }
  clearTimeout(timer);

  let json = null;
  try { json = await resposta.json(); } catch { /* resposta sem corpo */ }

  if (!resposta.ok) {
    if (resposta.status === 401) {
      await supabase.auth.signOut();
      window.location.href = 'login.html';
      throw new Error('Sua sessao expirou. Entre de novo.');
    }
    // 429 (quota) e 413 (PDF grande) trazem texto pronto para o usuario.
    throw new Error(json?.error || 'Nao foi possivel completar a operacao. Tente de novo.');
  }

  if (!json?.success || json?.data === undefined) {
    throw new Error(json?.error || 'Resposta inesperada do servidor.');
  }
  return json.data;
}

// ── Toast ───────────────────────────────────────────────────────────────────
/** Substitui os alert() espalhados pelo app. Cria o elemento se nao existir. */
export function toast(mensagem, tipo = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.innerHTML = '<span id="toast-msg"></span>';
    document.body.appendChild(el);
  }
  const msg = el.querySelector('#toast-msg') || el;
  msg.textContent = mensagem;
  el.classList.remove('success', 'error');
  el.classList.add('show', tipo);
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show', tipo), 4000);
}
