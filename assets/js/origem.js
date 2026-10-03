/* ═══════════════════════════════════════════════════════════════════════════
   ORIGEM -- de onde a pessoa veio (03/10/2026, auditoria NEG-01, roadmap 2.14)

   Decisao dele (pergunta 16 da auditoria): "comece agora". Sem servico de fora
   e sem custo: este arquivo so ANOTA, no navegador, o primeiro contato --
     ?utm_source=instagram&utm_medium=story&utm_campaign=lancamento
     ou o site que trouxe a pessoa (so o dominio, nunca o endereco inteiro)
   -- e, quando ela entra na conta pela primeira vez, manda UMA vez para
   registrar_origem() (migration 20261003160000). O resto do funil (edital,
   rotina, 1a sessao) e marcado pelo proprio servidor.

   Sem dependencia nenhuma: a pagina inicial nao carrega o astral.js, e este
   arquivo tem de caber nela sem pesar. Primeiro contato vence: quem ja tem
   origem anotada nao a troca por uma visita nova.
   ═══════════════════════════════════════════════════════════════════════════ */
const CHAVE = 'astral_origem';
const corta = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : undefined);

export function anotarOrigem() {
  try {
    if (localStorage.getItem(CHAVE)) return;
    const q = new URLSearchParams(location.search);
    let ref;
    try {
      const h = document.referrer ? new URL(document.referrer).hostname : '';
      if (h && h !== location.hostname) ref = h;
    } catch { /* referrer estranho: fica sem */ }
    const o = {
      utm_source: corta(q.get('utm_source')),
      utm_medium: corta(q.get('utm_medium')),
      utm_campaign: corta(q.get('utm_campaign')),
      ref: corta(ref),
      pagina: corta(location.pathname),
      em: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(CHAVE, JSON.stringify(o));
  } catch { /* navegador sem armazenamento: a pessoa segue, sem origem */ }
}

/** Uma vez por conta, depois do login. Nunca atrapalha a pagina. */
export async function enviarOrigem(supabase, uid) {
  try {
    const enviada = `${CHAVE}_enviada_${uid}`;
    if (!uid || localStorage.getItem(enviada)) return;
    const o = JSON.parse(localStorage.getItem(CHAVE) || 'null') || { direto: 'true' };
    const { error } = await supabase.rpc('registrar_origem', { p_origem: o });
    if (!error) localStorage.setItem(enviada, '1');
  } catch { /* sem origem, sem drama */ }
}

anotarOrigem();
