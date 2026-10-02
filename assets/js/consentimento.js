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

   Sem import de proposito: recebe o cliente `supabase` de quem chama, para nao
   carregar uma segunda copia do astral.js (modulo -> modulo nao leva carimbo).
   ═══════════════════════════════════════════════════════════════════════════ */

const PENDENTE = 'astral_aceite_pendente';
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
export function esquecerAceiteDoCadastro() { apagarLocal(PENDENTE); }

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
  if (estado.aceito) { lembrar(uid, v); apagarLocal(PENDENTE); return true; }

  // Marcou a caixa no cadastro (e-mail ou Google): grava sem perguntar de novo.
  let pend = null;
  try { pend = JSON.parse(lerLocal(PENDENTE) || 'null'); } catch { pend = null; }
  const contaCerta = !pend?.email || pend.email === String(session.user.email || '').toLowerCase();
  if (pend && contaCerta && Date.now() - Number(pend.em) < VALIDADE_PENDENTE_MS
      && ['cadastro_email', 'google'].includes(pend.origem)) {
    const r = await supabase.rpc('registrar_consentimento', {
      p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: pend.origem });
    apagarLocal(PENDENTE);
    if (!r.error && r.data?.aceito) { lembrar(uid, v); return true; }
  }

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
      </style>
      <div class="aceite-caixa">
        <h2 id="aceite-titulo">Antes de continuar</h2>
        <p>Para usar o Astral, você precisa aceitar os
          <a href="termos.html" target="_blank" rel="noopener">Termos de Uso</a> (versão de ${dataBR(v.termos)}) e a
          <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a> (versão de ${dataBR(v.politica)}).
          O aceite fica registrado na sua conta, com a data.</p>
        <label class="aceite-marca"><input type="checkbox" id="aceite-caixa"> <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span></label>
        <div class="aceite-erro" id="aceite-erro" role="alert"></div>
        <div class="aceite-acoes">
          <button type="button" class="aceite-sair" id="aceite-sair">Sair</button>
          <button type="button" class="aceite-ok" id="aceite-ok" disabled>Aceitar e continuar</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    const caixa = fundo.querySelector('#aceite-caixa');
    const ok = fundo.querySelector('#aceite-ok');
    const erro = fundo.querySelector('#aceite-erro');
    caixa.addEventListener('change', () => { ok.disabled = !caixa.checked; });
    caixa.focus();
    fundo.querySelector('#aceite-sair').addEventListener('click', () => { if (sair) sair(); });
    ok.addEventListener('click', async () => {
      ok.disabled = true; erro.textContent = '';
      const r = await supabase.rpc('registrar_consentimento', {
        p_versao_termos: v.termos, p_versao_politica: v.politica, p_origem: 'tela_de_aceite' });
      if (r.error || !r.data?.aceito) {
        erro.textContent = 'Não consegui registrar agora. Tente de novo em instantes.';
        ok.disabled = !caixa.checked;
        return;
      }
      lembrar(uid, v);
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
