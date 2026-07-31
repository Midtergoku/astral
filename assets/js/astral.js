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

// ── Plano e quota ───────────────────────────────────────────────────────────
/**
 * `beta` e acesso pro VITALICIO, prometido a pessoas reais que entraram pelo
 * grupo de WhatsApp em troca de feedback. Os dois andam sempre juntos e nenhuma
 * mudanca futura pode rebaixar essas contas. Toda checagem de "tem acesso
 * completo?" no app passa por aqui -- justamente para essa regra existir num
 * lugar so e nao divergir entre paginas.
 */
export function ehCompleto(perfil) {
  const plano = perfil?.tipo_plano || 'free';
  return plano === 'pro' || plano === 'beta';
}

export function nomeDoPlano(perfil) {
  return (perfil?.tipo_plano || 'free').toUpperCase();
}

/**
 * Le quanto resta da quota do dia. Nao gasta quota nem credito da Anthropic.
 *
 * Devolve `null` em qualquer falha em vez de estourar: isto alimenta um aviso
 * na tela, e um aviso que nao carrega nunca pode impedir a pessoa de usar o
 * produto. Quem manda no limite e o servidor, nao esta tela.
 */
export async function buscarQuota() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const resposta = await fetch(`${SUPABASE_URL}/functions/v1/minha-quota`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: '{}',
    });
    if (!resposta.ok) return null;

    const json = await resposta.json();
    return json?.success ? json.data : null;
  } catch {
    return null;
  }
}

// ── Captcha ─────────────────────────────────────────────────────────────────
/**
 * Sitekey do hCaptcha. VAZIO = captcha desligado, e tudo abaixo vira no-op --
 * as telas funcionam exatamente como antes.
 *
 * Preencher aqui liga o widget nas telas de login, criar conta e lista de
 * espera. A sitekey NAO e segredo (aparece no HTML de qualquer jeito); o que e
 * segredo e a secret key, que vai no painel do Supabase, nunca neste arquivo.
 *
 * ⚠️ Ligar aqui SEM configurar a secret no Supabase quebra o login: o servidor
 * passaria a exigir um token que ele nao sabe validar. A ordem correta e:
 * 1) secret no Supabase  2) sitekey aqui. Ver CLAUDE.md 13.5.
 */
export const HCAPTCHA_SITEKEY = '';

let promessaScript = null;

function carregarScriptCaptcha() {
  if (promessaScript) return promessaScript;
  promessaScript = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Nao foi possivel carregar o captcha.'));
    document.head.appendChild(s);
  });
  return promessaScript;
}

/**
 * Desenha o captcha dentro do elemento indicado. Devolve o id do widget, ou
 * null se o captcha estiver desligado (ou se o script nao carregar).
 *
 * Falha em silencio de proposito: um captcha que nao carregou nao pode ser
 * motivo para a pessoa nao conseguir entrar na propria conta. Enquanto a
 * sitekey estiver vazia, o Supabase tambem nao exige token nenhum.
 */
export async function montarCaptcha(idDoElemento) {
  if (!HCAPTCHA_SITEKEY) return null;
  const alvo = document.getElementById(idDoElemento);
  if (!alvo) return null;

  try {
    await carregarScriptCaptcha();
    return window.hcaptcha.render(alvo, {
      sitekey: HCAPTCHA_SITEKEY,
      theme: 'dark',
      size: 'normal',
    });
  } catch (e) {
    console.error('Captcha nao carregou:', e);
    return null;
  }
}

/** Token para mandar junto do login/cadastro. `undefined` quando desligado. */
export function tokenCaptcha(idDoWidget) {
  if (!HCAPTCHA_SITEKEY || idDoWidget === null || idDoWidget === undefined) return undefined;
  try {
    return window.hcaptcha.getResponse(idDoWidget) || undefined;
  } catch {
    return undefined;
  }
}

/** Depois de um erro, o token queima. Sem isto, a segunda tentativa falha. */
export function resetarCaptcha(idDoWidget) {
  if (!HCAPTCHA_SITEKEY || idDoWidget === null || idDoWidget === undefined) return;
  try { window.hcaptcha.reset(idDoWidget); } catch { /* widget ja foi embora */ }
}

// ── Freio de tentativas de senha ────────────────────────────────────────────
/**
 * Medido em 30/07/2026 contra a API real: o Supabase so recusa a partir da
 * 32a tentativa seguida, e o limite e por IP. Trinta chutes livres e muito
 * para uma senha fraca, e quem trocar de IP recomeca do zero.
 *
 * ⚠️ SEJA HONESTO SOBRE O QUE ISTO É. Este freio vive no navegador, entao um
 * atacante que chame a API do Supabase direto passa por cima dele sem esforco.
 * Ele resolve dois problemas reais e menores:
 *   - o chute repetido por quem esta no formulario;
 *   - a pessoa que errou a senha e fica martelando sem entender.
 *
 * A proteção que NAO se contorna e o captcha no proprio endpoint de auth
 * (`security_captcha_enabled` no Supabase). Passo a passo em CLAUDE.md 13.5.
 */
const LIMITE_TENTATIVAS = 5;
const ESPERAS_SEGUNDOS = [30, 60, 120, 300, 900]; // cresce a cada bloqueio

function chaveFreio(identificador) {
  return `astral_freio_${(identificador || '').toLowerCase().trim()}`;
}

/** Devolve os segundos que ainda faltam, ou 0 se pode tentar. */
export function segundosBloqueado(identificador) {
  try {
    const bruto = localStorage.getItem(chaveFreio(identificador));
    if (!bruto) return 0;
    const { liberaEm } = JSON.parse(bruto);
    const falta = Math.ceil((liberaEm - Date.now()) / 1000);
    return falta > 0 ? falta : 0;
  } catch { return 0; }
}

export function registrarFalha(identificador) {
  try {
    const chave = chaveFreio(identificador);
    const atual = JSON.parse(localStorage.getItem(chave) || '{}');
    const falhas = (atual.falhas || 0) + 1;
    const bloqueios = atual.bloqueios || 0;

    if (falhas >= LIMITE_TENTATIVAS) {
      const espera = ESPERAS_SEGUNDOS[Math.min(bloqueios, ESPERAS_SEGUNDOS.length - 1)];
      localStorage.setItem(chave, JSON.stringify({
        falhas: 0,
        bloqueios: bloqueios + 1,
        liberaEm: Date.now() + espera * 1000,
      }));
      return espera;
    }

    localStorage.setItem(chave, JSON.stringify({ falhas, bloqueios, liberaEm: 0 }));
    return 0;
  } catch { return 0; }
}

export function limparFreio(identificador) {
  try { localStorage.removeItem(chaveFreio(identificador)); } catch { /* ignora */ }
}

/** "1 minuto e 30 segundos" em vez de "90s" — quem lê não é técnico. */
export function emPortugues(segundos) {
  if (segundos < 60) return `${segundos} segundo${segundos === 1 ? '' : 's'}`;
  const min = Math.floor(segundos / 60);
  const resto = segundos % 60;
  const parteMin = `${min} minuto${min === 1 ? '' : 's'}`;
  return resto ? `${parteMin} e ${resto} segundo${resto === 1 ? '' : 's'}` : parteMin;
}

// ── Menu no celular ─────────────────────────────────────────────────────────
/**
 * Todas as paginas do app escondem a sidebar com translateX(-100%) abaixo de
 * 768px -- e nenhuma tinha botao para trazer de volta. Na pratica, quem abria
 * o Astral no telefone ficava preso na pagina em que caiu, sem conseguir ir
 * para Questoes, Progresso ou qualquer outra. Para um produto cujo usuario
 * estuda no celular, isso e perda direta de retencao.
 *
 * Fica aqui, e nao no CSS de cada pagina, porque sao 9 arquivos: no shared,
 * e uma implementacao so.
 */
function iniciarMenuMobile() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || document.getElementById('astral-menu-btn')) return;

  const style = document.createElement('style');
  style.textContent = `
    #astral-menu-btn {
      position: fixed; top: 0.85rem; left: 0.85rem;
      z-index: 120;
      display: none;
      align-items: center; justify-content: center;
      width: 42px; height: 42px;
      border-radius: 11px;
      background: var(--surface2, #1A1A24);
      border: 1px solid var(--border, #1E1E2E);
      color: var(--text, #E8E8F0);
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    #astral-menu-fundo {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(2px);
      z-index: 45;
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s;
    }
    @media (max-width: 768px) {
      #astral-menu-btn { display: flex; }
      /* Especificidade 0,2,0 vence o .sidebar (0,1,0) que a pagina esconde,
         independentemente da ordem em que os estilos aparecem. */
      .sidebar.astral-aberta { transform: translateX(0) !important; box-shadow: 0 0 60px rgba(0,0,0,0.6); }
      body.astral-menu-aberto #astral-menu-fundo { opacity: 1; pointer-events: auto; }
      body.astral-menu-aberto { overflow: hidden; }
      /* Abre espaco para o botao nao cobrir o titulo da pagina. */
      .main { padding-top: 4.25rem !important; }
    }
    @media (prefers-reduced-motion: reduce) { #astral-menu-fundo { transition: none; } }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'astral-menu-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Abrir menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

  const fundo = document.createElement('div');
  fundo.id = 'astral-menu-fundo';

  document.body.appendChild(btn);
  document.body.appendChild(fundo);

  const definir = (aberto) => {
    sidebar.classList.toggle('astral-aberta', aberto);
    document.body.classList.toggle('astral-menu-aberto', aberto);
    btn.setAttribute('aria-expanded', String(aberto));
    btn.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  };

  btn.addEventListener('click', () => definir(!sidebar.classList.contains('astral-aberta')));
  fundo.addEventListener('click', () => definir(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') definir(false); });
  // Navegou para outra pagina: fecha, senao o menu fica aberto por cima.
  sidebar.querySelectorAll('a[href]').forEach(a => a.addEventListener('click', () => definir(false)));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarMenuMobile);
} else {
  iniciarMenuMobile();
}

// ── Toast ───────────────────────────────────────────────────────────────────

/**
 * Injeta o CSS do toast uma unica vez, como PRIMEIRO filho do <head>.
 *
 * A posicao importa: o CSS da propria pagina vem depois e, com a mesma
 * especificidade, vence. Assim as paginas que ja tinham `.toast` proprio
 * continuam exatamente como estavam, e as que nao tinham (login, cadastro,
 * criar-conta) passam a ter. Era por falta disso que sobravam 10 alert():
 * trocar sem estilo deixaria o erro invisivel, que e pior que um alert feio.
 */
function garantirCssDoToast() {
  if (document.getElementById('astral-toast-css')) return;
  const style = document.createElement('style');
  style.id = 'astral-toast-css';
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 1.5rem; left: 50%;
      transform: translateX(-50%) translateY(160%);
      background: var(--surface2, #1A1A24);
      border: 1px solid var(--border, #1E1E2E);
      border-radius: 12px;
      padding: 0.85rem 1.35rem;
      font-family: 'Inter', sans-serif;
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--white, #FFFFFF);
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
      z-index: 9999;
      max-width: min(92vw, 460px);
      text-align: center;
    }
    .toast.show  { transform: translateX(-50%) translateY(0); }
    .toast.success { border-color: rgba(52,211,153,0.45); }
    .toast.error   { border-color: rgba(248,113,113,0.5); }
    @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
  `;
  document.head.insertBefore(style, document.head.firstChild);
}

/** Substitui os alert() espalhados pelo app. Cria o elemento se nao existir. */
export function toast(mensagem, tipo = 'success') {
  garantirCssDoToast();

  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.innerHTML = '<span id="toast-msg"></span>';
    // Leitor de tela anuncia sem roubar o foco de quem esta digitando.
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  const msg = el.querySelector('#toast-msg') || el;
  msg.textContent = mensagem;
  el.classList.remove('success', 'error');
  // Reflow entre remover e adicionar: sem isso, dois toasts seguidos nao
  // reiniciam a animacao e o segundo aparece sem transicao.
  void el.offsetWidth;
  el.classList.add('show', tipo);
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show', tipo), 4500);
}
