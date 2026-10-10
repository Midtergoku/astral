/* ═══════════════════════════════════════════════════════════════════════════
   DUAS ETAPAS -- o codigo do aplicativo autenticador (TOTP) depois da senha
   (10/10/2026, roadmap 4.4 -- lista dos videos dele: "MFA")

   Quem ATIVOU (Minha conta) passa a precisar do codigo de 6 numeros do
   aplicativo (Google Authenticator, Microsoft Authenticator...) cada vez que
   entra -- por senha OU pelo Google. Quem nao ativou nao ve nada disto.

   Por que importa: a conta do DONO abre o painel do negocio e o importador. O
   servidor (sou_administrador, migration 20261010200000) so reconhece o dono
   com o codigo confirmado nesta sessao, quando ele tem as duas etapas ativas --
   quem roubar a senha dele fica do lado de fora, e nem consegue desligar o
   codigo (desligar exige o proprio codigo).

   A conferencia do nivel e LOCAL (le a sessao do navegador, sem ida ao
   servidor): quem nao ativou nao espera nada.
   ═══════════════════════════════════════════════════════════════════════════ */

const CSS_ID = 'astral-duas-etapas-css';

function garantirCss() {
  if (document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    .de-fundo { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 16px;
      background: color-mix(in srgb, var(--breu, #0E1620) 90%, transparent); }
    .de-caixa { width: min(100%, 420px); background: var(--casco, #17222E); border: 1px solid var(--linha, #2A3947);
      border-top: 3px solid var(--latao, #C08A2E); border-radius: var(--r-g, 6px); padding: 24px; color: var(--texto, #DDE4EA); }
    .de-caixa h2 { font-family: var(--display, Arial, sans-serif); font-size: 1.15rem; margin: 0 0 8px; }
    .de-caixa p { color: var(--texto-2, #8FA0AE); font-size: .92rem; line-height: 1.55; margin: 0 0 16px; }
    .de-caixa label { display: block; font-size: .85rem; color: var(--texto-2, #8FA0AE); margin-bottom: 6px; }
    .de-codigo { width: 100%; box-sizing: border-box; font-family: var(--dado, monospace); font-size: 1.6rem; letter-spacing: .4em;
      text-align: center; padding: 10px; border-radius: var(--r-p, 3px); border: 1px solid var(--linha, #2A3947);
      background: var(--breu, #0E1620); color: var(--texto, #DDE4EA); }
    .de-codigo:focus { outline: 2px solid var(--latao, #C08A2E); outline-offset: 2px; }
    .de-erro { min-height: 1.4em; color: var(--brasa-c, #E0705A); font-size: .88rem; margin: 8px 0 0; }
    .de-acoes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .de-acoes button { min-height: 44px; padding: 10px 16px; border-radius: var(--r-p, 3px); font: inherit; font-weight: 700; cursor: pointer; }
    .de-ok { background: var(--latao, #C08A2E); color: var(--breu, #0E1620); border: 1px solid var(--latao, #C08A2E); }
    .de-ok:disabled { opacity: .5; cursor: not-allowed; }
    .de-sair { background: transparent; color: var(--texto-2, #8FA0AE); border: 1px solid var(--linha, #2A3947); }
  `;
  document.head.appendChild(s);
}

/** O fator TOTP verificado da pessoa (ou null). */
async function fatorVerificado(supabase) {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp || []).find((f) => f.status === 'verified') || null;
}

/** Confere um codigo de 6 numeros e sobe a sessao para o nivel 2. Devolve true/false. */
export async function confirmarCodigo(supabase, fatorId, codigo) {
  const limpo = String(codigo || '').replace(/\D/g, '');
  if (limpo.length !== 6) return false;
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fatorId, code: limpo });
  return !error;
}

/**
 * O PORTAO: se a pessoa tem as duas etapas ativas e esta sessao ainda nao confirmou o codigo, a tela pede o codigo
 * e so libera depois. Sem duas etapas: devolve na hora. Nunca derruba a pagina por erro de rede -- mas tambem nao
 * libera sem o codigo: quem tem as duas etapas e nao confirma, fica no portao (ou sai).
 */
export async function garantirSegundaEtapa(supabase, { sair } = {}) {
  let nivel = null;
  try { nivel = (await supabase.auth.mfa.getAuthenticatorAssuranceLevel())?.data; } catch { return true; }
  if (!nivel || nivel.nextLevel !== 'aal2' || nivel.currentLevel === 'aal2') return true;

  let fator = null;
  try { fator = await fatorVerificado(supabase); } catch { /* sem rede: o portao pede de novo ao tentar */ }
  garantirCss();
  return new Promise((resolver) => {
    const fundo = document.createElement('div');
    fundo.className = 'de-fundo';
    fundo.innerHTML = `
      <div class="de-caixa" role="dialog" aria-modal="true" aria-labelledby="de-titulo">
        <h2 id="de-titulo">Verificação em duas etapas</h2>
        <p>Abra o aplicativo autenticador no seu celular e digite o código de 6 números do Astral.</p>
        <label for="de-codigo">Código</label>
        <input class="de-codigo" id="de-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*">
        <p class="de-erro" id="de-erro" role="alert"></p>
        <div class="de-acoes">
          <button type="button" class="de-ok" id="de-ok" disabled>Confirmar</button>
          <button type="button" class="de-sair" id="de-sair">Sair</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    const campo = fundo.querySelector('#de-codigo'), ok = fundo.querySelector('#de-ok'), erro = fundo.querySelector('#de-erro');
    campo.focus();
    campo.addEventListener('input', () => {
      campo.value = campo.value.replace(/\D/g, '').slice(0, 6);
      ok.disabled = campo.value.length !== 6;
      erro.textContent = '';
      if (campo.value.length === 6) ok.click();   // codigo completo: confere sem precisar apertar
    });
    ok.addEventListener('click', async () => {
      if (ok.disabled) return;
      ok.disabled = true; erro.textContent = '';
      try {
        if (!fator) fator = await fatorVerificado(supabase);
        if (fator && await confirmarCodigo(supabase, fator.id, campo.value)) {
          fundo.remove();
          resolver(true);
          return;
        }
        erro.textContent = 'Código errado ou vencido. Confira no aplicativo e digite o código que está na tela agora.';
      } catch {
        erro.textContent = 'Não consegui conferir agora. Tente de novo em instantes.';
      }
      campo.value = ''; campo.focus();
    });
    fundo.querySelector('#de-sair').addEventListener('click', () => { if (sair) sair(); });
  });
}

/** Para a Minha conta: as duas etapas estao ativas? */
export async function duasEtapasAtivas(supabase) {
  return !!(await fatorVerificado(supabase));
}

/**
 * Comeca a ativacao: tira um fator antigo nao confirmado (de uma tentativa abandonada) e cria um novo.
 * Devolve { id, qr, segredo } -- o QR e a imagem que o aplicativo le; o segredo e para digitar a mao.
 */
export async function comecarAtivacao(supabase) {
  const { data } = await supabase.auth.mfa.listFactors();
  for (const f of (data?.all || [])) if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data: novo, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Astral ${new Date().toISOString().slice(0, 10)}` });
  if (error) throw error;
  return { id: novo.id, qr: novo.totp?.qr_code, segredo: novo.totp?.secret };
}

/** Desliga as duas etapas (o Supabase exige que a sessao ja esteja no nivel 2). */
export async function desativar(supabase) {
  const fator = await fatorVerificado(supabase);
  if (!fator) return true;
  const { error } = await supabase.auth.mfa.unenroll({ factorId: fator.id });
  if (error) throw error;
  return true;
}
