// ============================================================================
// Astral — nucleo compartilhado do frontend.
//
// Reune o que estava duplicado em ate 11 arquivos (cliente Supabase, guarda de
// sessao, logout) e acrescenta o que faltava em todos: escape de HTML e
// chamada autenticada as edge functions.
// ============================================================================

// Copia LOCAL, versao travada no proprio nome do arquivo.
//
// Historico, porque as duas mudancas tem motivos diferentes:
//  1. Antes era "/+esm" SEM versao: o jsdelivr entregava sempre a mais nova,
//     entao um major novo derrubaria o app de madrugada sem ninguem tocar em
//     nada. Por isso a versao foi travada.
//  2. 03/08/2026 -- o Lucas reclamou de lentidao ao trocar de menu. MEDIDO:
//     o "/+esm" do jsdelivr estourava em 9 pedidos encadeados a um servidor
//     de terceiro, 2773ms so para importar, em TODA pagina do app. A copia
//     local importa em 13ms, num pedido so. Comprovado lado a lado nos 6
//     passos (sessao, consulta ao banco, login recusado, edge function).
//
// Ganho de seguranca junto: o jsdelivr saiu do script-src da CSP, e o app
// nao morre mais se aquele servidor cair.
//
// PARA ATUALIZAR: nao editar o arquivo -- gerar outro com a versao nova no
// nome e trocar esta linha. A versao no nome e o que permite cache eterno.
import { createClient } from './supabase-2.111.0.js';

export const SUPABASE_URL = 'https://jjogmcacbdefwiwcyjxp.supabase.co';
// Exportada de proposito: e a chave PUBLICAVEL, ja visivel no codigo-fonte de
// todas as paginas. Quem precisa dela e o estado.js, para a gravacao final com
// `keepalive` ao fechar a aba -- caminho que o cliente supabase-js nao cobre.
// A chave SECRETA nunca entra aqui; ela so existe no Supabase.
export const SUPABASE_KEY = 'sb_publishable_n-PClIEGglZWhoEySjB8PA_z7KEgHfJ';

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

// ── Relato de erros ─────────────────────────────────────────────────────────
/**
 * Manda para o servidor todo erro de JavaScript que escapar.
 *
 * Antes disto, falha em producao era invisivel: a tela quebrava, o beta tester
 * ia embora, e ninguem descobria. Nao ha servico de monitoramento contratado,
 * entao o registro vai para a tabela `erros_cliente` do proprio banco.
 *
 * Regras que este codigo NUNCA pode violar, porque ele roda no caminho de um
 * erro que ja aconteceu:
 *   - nao estourar (um relator de erro que quebra e pior que nenhum)
 *   - nao travar a tela (fire-and-forget, sem await)
 *   - nao virar loop (o mesmo erro repetido e enviado uma vez so)
 */
const errosJaEnviados = new Set();
let errosNestaPagina = 0;
const TETO_ERROS_POR_PAGINA = 10;

function relatarErro({ mensagem, origem, pilha }) {
  try {
    if (!mensagem) return;
    if (errosNestaPagina >= TETO_ERROS_POR_PAGINA) return;

    // Um erro dentro de um laco de render dispararia centenas de chamadas
    // identicas. A primeira basta para eu diagnosticar.
    const chave = `${mensagem}|${origem ?? ''}`;
    if (errosJaEnviados.has(chave)) return;
    errosJaEnviados.add(chave);
    errosNestaPagina++;

    // Token so se ja estiver no localStorage -- de proposito nao chama
    // getSession(), que e assincrono e poderia falhar aqui dentro.
    let autorizacao;
    try {
      const chaveSessao = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
      const token = chaveSessao && JSON.parse(localStorage.getItem(chaveSessao))?.access_token;
      if (token) autorizacao = `Bearer ${token}`;
    } catch { /* sem sessao legivel: manda anonimo mesmo */ }

    fetch(`${SUPABASE_URL}/functions/v1/registrar-erro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(autorizacao ? { Authorization: autorizacao } : {}),
      },
      body: JSON.stringify({
        mensagem: String(mensagem).slice(0, 2000),
        origem: origem ? String(origem).slice(0, 300) : undefined,
        pilha: pilha ? String(pilha).slice(0, 4000) : undefined,
        pagina: location.pathname + location.search,
      }),
      // Faz a requisicao sobreviver se a pessoa fechar a aba logo depois --
      // que e exatamente o que ela faz quando a tela quebra.
      keepalive: true,
    }).catch(() => { /* sem rede: perder o relato e aceitavel */ });
  } catch { /* jamais propagar */ }
}

window.addEventListener('error', (e) => {
  relatarErro({
    mensagem: e.message || 'Erro sem mensagem',
    origem: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
    pilha: e.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (e) => {
  const m = e.reason?.message || String(e.reason ?? 'Promise rejeitada sem motivo');
  relatarErro({ mensagem: m, origem: 'unhandledrejection', pilha: e.reason?.stack });
});

/** Para relatar de dentro de um catch, quando a tela ja tratou o erro. */
export function relatar(erro, contexto) {
  relatarErro({
    mensagem: erro?.message || String(erro),
    origem: contexto,
    pilha: erro?.stack,
  });
}

// ── Mostrar/esconder senha ──────────────────────────────────────────────────
/**
 * Coloca o "olhinho" dentro do campo de senha.
 *
 * Nao e so conforto: quem nao consegue conferir o que digitou tende a escolher
 * senha curta e obvia, ou erra e culpa o site. Em celular, com teclado que
 * corrige sozinho, o problema e pior.
 *
 * Decisoes de seguranca embutidas:
 *   - comeca SEMPRE escondido; mostrar e acao deliberada da pessoa
 *   - volta a esconder ao enviar o formulario ou ao sair da pagina, para a
 *     senha nao ficar visivel na tela num computador compartilhado
 *   - o botao e `type="button"`: sem isso ele viraria submit dentro de <form>
 *   - `aria-label` e `aria-pressed` para leitor de tela anunciar o estado
 */
export function olhinhoDeSenha(...idsDosCampos) {
  const estilo = 'estilo-olhinho-senha';
  if (!document.getElementById(estilo)) {
    const css = document.createElement('style');
    css.id = estilo;
    css.textContent = `
      .campo-com-olhinho { position: relative; }
      .campo-com-olhinho > input { padding-right: 2.85rem !important; }
      .olhinho-senha {
        position: absolute; top: 50%; right: 0.55rem;
        transform: translateY(-50%);
        display: flex; align-items: center; justify-content: center;
        width: 2rem; height: 2rem;
        background: none; border: none; padding: 0; cursor: pointer;
        color: #6B6B80; border-radius: 6px; transition: color .15s;
      }
      .olhinho-senha:hover { color: #A78BFA; }
      .olhinho-senha:focus-visible { outline: 2px solid #7C5CFC; outline-offset: 1px; }
    `;
    // Primeiro filho do <head>: o CSS da pagina vem depois e vence em caso de
    // empate de especificidade, entao paginas com estilo proprio nao quebram.
    document.head.insertBefore(css, document.head.firstChild);
  }

  const OLHO_ABERTO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OLHO_FECHADO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  const campos = [];

  for (const id of idsDosCampos) {
    const campo = document.getElementById(id);
    if (!campo || campo.dataset.temOlhinho) continue;
    campo.dataset.temOlhinho = '1';
    campos.push(campo);

    // Envolve o input sem mexer no HTML da pagina.
    const caixa = document.createElement('div');
    caixa.className = 'campo-com-olhinho';
    campo.parentNode.insertBefore(caixa, campo);
    caixa.appendChild(campo);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'olhinho-senha';
    botao.innerHTML = OLHO_FECHADO;
    botao.setAttribute('aria-label', 'Mostrar senha');
    botao.setAttribute('aria-pressed', 'false');
    botao.tabIndex = -1; // nao entra no caminho do Tab entre os campos

    botao.addEventListener('click', () => {
      const mostrando = campo.type === 'text';
      campo.type = mostrando ? 'password' : 'text';
      botao.innerHTML = mostrando ? OLHO_FECHADO : OLHO_ABERTO;
      botao.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Esconder senha');
      botao.setAttribute('aria-pressed', String(!mostrando));
      campo.focus();
    });

    caixa.appendChild(botao);
  }

  // Esconde de novo quando a pessoa sai da pagina ou muda de aba. Evita deixar
  // a senha legivel na tela de um computador compartilhado.
  const esconderTudo = () => {
    for (const c of campos) {
      if (c.type !== 'text') continue;
      c.type = 'password';
      const b = c.parentNode.querySelector('.olhinho-senha');
      if (b) {
        b.innerHTML = OLHO_FECHADO;
        b.setAttribute('aria-label', 'Mostrar senha');
        b.setAttribute('aria-pressed', 'false');
      }
    }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) esconderTudo(); });
  window.addEventListener('pagehide', esconderTudo);
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
 * ⚠️ ORDEM DE LIGAR -- eu errei isto na pratica em 30/07/2026 e derrubei o
 * login por ~2 minutos. A ordem correta e:
 *   1) sitekey AQUI, e publicar (o navegador passa a mandar token; o servidor
 *      ainda nao confere, entao o token e simplesmente ignorado -- inofensivo)
 *   2) so entao a secret no Supabase (o servidor passa a exigir o token que o
 *      navegador ja manda)
 * Inverter derruba o login de todo mundo, porque o servidor exige um token que
 * ninguem esta mandando. Ver CLAUDE.md 13.5.
 */
export const HCAPTCHA_SITEKEY = '1f644a7e-5b9e-47a2-8d3e-2c8c4b329b06';

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
