/* ═══════════════════════════════════════════════════════════════════════════
   CONSENTIMENTO — ninguem usa o Astral sem o aceite GRAVADO

   Auditoria pre-lancamento, achado LGL-01 (S0), Lote 1 do roadmap (02/10/2026).
   Antes: a caixa "Li e aceito" so valia no cadastro por e-mail, so no navegador,
   e nada ficava gravado. "Cadastrar com Google" nem olhava a caixa. Pela LGPD
   (art. 8, par. 2) o Astral precisa PROVAR quem aceitou, quando e qual versao.

   COMO FUNCIONA
   - `exigirSessao()` (astral.js), que toda pagina logada chama, chama
     `garantirConsentimento()` antes de devolver a sessao.
   - O servidor responde se a pessoa aceitou as versoes VIGENTES
     (`meu_consentimento`, migration 20261002100000). Se sim, a pagina segue.
   - Se o aceite foi marcado no cadastro (e-mail ou Google, em criar-conta.html),
     ele chega aqui como "pendente" e e gravado sem perguntar de novo.
   - Senao, aparece a tela de aceite: sem aceitar, nao entra (ou sai da conta).
   - Aceite ja conferido fica lembrado neste navegador: a proxima pagina nao
     ESPERA o servidor -- a conferencia roda por tras e, se a versao dos
     documentos mudou, a tela de aceite aparece por cima.

   03/10/2026 (auditoria LGL-02, roadmap 3.6): o portao pede tambem a DATA DE
   NASCIMENTO (idade minima 16, decisao dele). Menos de 16: nao entra, e o
   servidor NAO grava a data. 16 e 17: entra; o servidor marca `menor`, e o
   pagamento (5.3) vai exigir o responsavel. A data dada no cadastro chega aqui
   como pendente, como o aceite. Servidor antigo (sem o campo): nao pergunta.

   Sem import de proposito: recebe o cliente `supabase` de quem chama, para nao
   carregar uma segunda copia do astral.js (modulo -> modulo nao leva carimbo).
   ═══════════════════════════════════════════════════════════════════════════ */

const PENDENTE = 'astral_aceite_pendente';
const NASC_PENDENTE = 'astral_nascimento_pendente';   // AAAA-MM-DD, do formulario de cadastro
const VALIDADE_PENDENTE_MS = 3600 * 1000;           // marcou no cadastro ha menos de 1 hora
/* Uma chave por usuario, com as versoes aceitas como valor. Serve so para a
   pagina nao ESPERAR o servidor a cada abertura: a conferencia roda sempre, por
   tras, e uma versao nova dos documentos faz a tela de aceite aparecer. */
const chaveDe = (uid) => `astral_aceite_${uid}`;
const lembrar = (uid, v) => gravarLocal(chaveDe(uid), `${v.termos}|${v.politica}`);
const lerLocal = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* aba anonima */ } };
const apagarLocal = (k) => { try { localStorage.removeItem(k); } catch { /* aba anonima */ } };

/** Chamado por criar-conta.html quando a pessoa marca a caixa e se cadastra.
 *  `email` (cadastro por e-mail): o aceite so vale para ESSA conta -- se o
 *  cadastro falhar e outra conta entrar neste navegador, ela nao herda o aceite. */
export function marcarAceiteNoCadastro(origem, email = null) {
  gravarLocal(PENDENTE, JSON.stringify({ origem, email: email ? String(email).toLowerCase() : null, em: Date.now() }));
}

/** O cadastro falhou: o aceite marcado nao vale para mais ninguem. */
export function esquecerAceiteDoCadastro() { apagarLocal(PENDENTE); apagarLocal(NASC_PENDENTE); }

/** A data de nascimento dada no formulario de cadastro (AAAA-MM-DD). */
export function marcarNascimentoNoCadastro(data) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) gravarLocal(NASC_PENDENTE, data);
}

/** Grava a data no servidor. Devolve 'ok', 'menor16', 'invalida' ou 'falhou'. */
async function enviarNascimento(supabase, data) {
  const r = await supabase.rpc('registrar_nascimento', { p_data: data });
  if (!r.error) return 'ok';
  if (r.error.hint === 'idade_minima' || /menor de 16/.test(r.error.message || '')) return 'menor16';
  if (r.error.code === '22023') return 'invalida';
  return 'falhou';
}

function dataBR(iso) {
  const [a, m, d] = String(iso || '').split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** Garante o aceite das versoes vigentes. Resolve `true` quando pode seguir. */
export async function garantirConsentimento(supabase, session, { sair } = {}) {
  const uid = session?.user?.id;
  if (!uid) return false;

  const { data: estado, error } = await supabase.rpc('meu_consentimento');
  /* Se o servidor nao responder, NAO trava o aluno fora do proprio estudo por
     uma falha nossa: segue, e a pergunta volta na proxima pagina. O aceite e
     exigido de quem o servidor diz que nao aceitou -- nao de quem a rede falhou. */
  if (error || !estado) return true;
  const v = estado.vigentes || {};
  // Servidor antigo nao manda o campo: ai nao se pergunta (ninguem fica preso).
  let precisaData = estado.nascimento === false;
  let precisaAceite = !estado.aceito;
  if (!precisaAceite) { lembrar(uid, v); apagarLocal(PENDENTE); }

  // A data dada no cadastro: grava sem perguntar de novo.
  const nascPend = lerLocal(NASC_PENDENTE);
  let bloqueio = null;
  if (precisaData && nascPend) {
    const r = await enviarNascimento(supabase, nascPend);
    apagarLocal(NASC_PENDENTE);
    if (r === 'ok') precisaData = false;
    if (r === 'menor16') bloqueio = 'menor16';
  }
  if (!precisaAceite && !precisaData && !bloqueio) return true;

  // Marcou a caixa no cadastro (e-mail ou Google): grava sem perguntar de novo.
  let pend = null;
  try { pend = JSON.parse(lerLocal(PENDENTE) || 'null'); } catch { pend = null; }
  const contaCerta = !pend?.email || pend.email === String(session.user.email || '').toLowerCase();
  if (precisaAceite && pend && contaCerta && Date.now() - Number(pend.em) < VALIDADE_PENDENTE_MS
      && ['cadastro_email', 'google'].includes(pend.origem)) {
    const r = await supabase.rpc('registrar_consentimento', {
      p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: pend.origem });
    apagarLocal(PENDENTE);
    if (!r.error && r.data?.aceito) { lembrar(uid, v); precisaAceite = false; }
  }
  if (!precisaAceite && !precisaData && !bloqueio) return true;
  const hoje = new Date().toISOString().slice(0, 10);

  // A tela de aceite.
  return await new Promise((resolver) => {
    const fundo = document.createElement('div');
    fundo.className = 'aceite-fundo';
    fundo.setAttribute('role', 'dialog');
    fundo.setAttribute('aria-modal', 'true');
    fundo.setAttribute('aria-labelledby', 'aceite-titulo');
    fundo.innerHTML = `
      <style>
        .aceite-fundo { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; padding: 1rem;
          background: color-mix(in srgb, var(--breu, #0E1620) 88%, transparent); }
        .aceite-caixa { width: min(480px, 100%); background: var(--casco, #17222E); border: 1px solid var(--linha, #2A3947);
          border-top: 3px solid var(--latao, #C08A2E); border-radius: 6px; padding: 1.5rem; color: var(--texto, #DDE4EA);
          font-family: var(--corpo, Georgia, serif); }
        .aceite-caixa h2 { font-family: var(--display, Arial, sans-serif); font-size: 1.25rem; margin: 0 0 .75rem; }
        .aceite-caixa p { font-size: 1rem; line-height: 1.5; margin: 0 0 1rem; color: var(--texto-2, #8FA0AE); }
        .aceite-caixa a { color: var(--latao-c, #E0AE55); }
        .aceite-marca { display: flex; gap: .6rem; align-items: flex-start; font-size: 1rem; margin: 0 0 1.25rem; cursor: pointer; }
        .aceite-marca input { width: 1.25rem; height: 1.25rem; margin-top: .15rem; flex: none; }
        .aceite-acoes { display: flex; gap: .75rem; justify-content: flex-end; flex-wrap: wrap; }
        .aceite-acoes button { min-height: 44px; padding: 0 1.1rem; border-radius: 3px; font-size: 1rem; cursor: pointer;
          font-family: var(--display, Arial, sans-serif); }
        .aceite-sair { background: transparent; color: var(--texto-2, #8FA0AE); border: 1px solid var(--linha, #2A3947); }
        .aceite-ok { background: var(--latao-c, #E0AE55); color: var(--breu, #0E1620); border: none; font-weight: 700; }
        .aceite-ok:disabled { opacity: .5; cursor: not-allowed; }
        .aceite-erro { color: var(--brasa-c, #E0705A); font-size: .9rem; margin: -.5rem 0 1rem; min-height: 1em; }
        .aceite-data { display: grid; gap: .35rem; margin: 0 0 1.25rem; font-size: 1rem; }
        .aceite-data input { min-height: 44px; font: inherit; padding: 0 .6rem; border-radius: 3px;
          border: 1px solid var(--linha, #2A3947); background: var(--casco-2, #1E2B39); color: var(--texto, #DDE4EA); }
        .aceite-data small { color: var(--texto-3, #5F7183); font-size: .85rem; }
        .aceite-bloqueio[hidden], .aceite-form[hidden] { display: none; }
      </style>
      <div class="aceite-caixa">
        <div class="aceite-form" id="aceite-form"${bloqueio ? ' hidden' : ''}>
        <h2 id="aceite-titulo">Antes de continuar</h2>
        ${precisaAceite ? `<p>Para usar o Astral, você precisa aceitar os
          <a href="termos.html" target="_blank" rel="noopener">Termos de Uso</a> (versão de ${dataBR(v.termos)}) e a
          <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a> (versão de ${dataBR(v.politica)}).
          O aceite fica registrado na sua conta, com a data.</p>
        <label class="aceite-marca"><input type="checkbox" id="aceite-caixa"> <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span></label>` : ''}
        ${precisaData ? `<label class="aceite-data">Sua data de nascimento
          <input type="date" id="aceite-nascimento" max="${hoje}" min="1920-01-01" required>
          <small>O Astral é para quem tem 16 anos ou mais. A data não pode ser trocada depois.</small></label>` : ''}
        <div class="aceite-erro" id="aceite-erro" role="alert"></div>
        <div class="aceite-acoes">
          <button type="button" class="aceite-sair" id="aceite-sair">Sair</button>
          <button type="button" class="aceite-ok" id="aceite-ok" disabled>${precisaAceite ? 'Aceitar e continuar' : 'Continuar'}</button>
        </div>
        </div>
        <div class="aceite-bloqueio" id="aceite-bloqueio"${bloqueio ? '' : ' hidden'}>
          <h2>O Astral é para quem tem 16 anos ou mais</h2>
          <p>Pela data informada, você ainda não pode usar o Astral. A data <strong>não foi guardada</strong>.</p>
          <div class="aceite-acoes">
            <button type="button" class="aceite-sair" id="aceite-sair-2">Sair</button>
            <button type="button" class="aceite-ok" id="aceite-errei">Errei a data</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    const caixa = fundo.querySelector('#aceite-caixa');
    const nasc = fundo.querySelector('#aceite-nascimento');
    const ok = fundo.querySelector('#aceite-ok');
    const erro = fundo.querySelector('#aceite-erro');
    const form = fundo.querySelector('#aceite-form');
    const blq = fundo.querySelector('#aceite-bloqueio');
    const pronto = () => (!caixa || caixa.checked) && (!nasc || /^\d{4}-\d{2}-\d{2}$/.test(nasc.value));
    caixa?.addEventListener('change', () => { ok.disabled = !pronto(); });
    nasc?.addEventListener('input', () => { ok.disabled = !pronto(); });
    (caixa || nasc)?.focus();
    for (const id of ['#aceite-sair', '#aceite-sair-2']) fundo.querySelector(id).addEventListener('click', () => { if (sair) sair(); });
    fundo.querySelector('#aceite-errei').addEventListener('click', () => {
      blq.hidden = true; form.hidden = false;
      if (!nasc) { location.reload(); return; }   // o bloqueio veio do cadastro: a tela inteira de novo
      nasc.value = ''; nasc.focus(); ok.disabled = true;
    });
    ok.addEventListener('click', async () => {
      ok.disabled = true; erro.textContent = '';
      if (caixa) {
        const r = await supabase.rpc('registrar_consentimento', {
          p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: 'tela_de_aceite' });
        if (r.error || !r.data?.aceito) {
          erro.textContent = 'Não consegui registrar agora. Tente de novo em instantes.';
          ok.disabled = !pronto();
          return;
        }
        lembrar(uid, v);
      }
      if (nasc) {
        const r = await enviarNascimento(supabase, nasc.value);
        if (r === 'menor16') { form.hidden = true; blq.hidden = false; return; }
        if (r !== 'ok') {
          erro.textContent = r === 'invalida' ? 'Confira a data de nascimento.' : 'Não consegui registrar agora. Tente de novo em instantes.';
          ok.disabled = !pronto();
          return;
        }
      }
      fundo.remove();
      resolver(true);
    });
  });
}

/** Ja aceitou alguma versao neste navegador? Entao a pagina nao precisa esperar
 *  a conferencia (que roda por tras e pede de novo se a versao mudou). */
export function jaAceitouAlgumaVez(uid) {
  return !!(uid && lerLocal(chaveDe(uid)));
}
