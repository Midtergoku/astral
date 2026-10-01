/* ═══════════════════════════════════════════════════════════════════════════
   FIXAR O DOMINIO NUM TESTE -- desde 30/09/2026 o dominio e do servidor.

   A migration 20260930120000 fez o servidor recalcular `materias[].progresso`
   em toda gravacao do SITE (questoes do Banco + tempo de estudo). Os testes
   antigos plantavam o dominio pelo `salvar_progresso`, como o navegador -- e
   isso agora e exatamente o que o servidor recusa (o valor volta calculado).

   Para testar o que DEPENDE do dominio (tags, condecoracoes de dominio,
   Doutrina, o chefe, o decaimento), o teste fixa o valor com a CHAVE DE
   SERVICO, que o gatilho respeita de proposito (`gravacao_pelo_site` = falso).
   E o mesmo caminho do `tools/simula-edital.js`.

   ⚠️ Fixe DEPOIS da ultima gravacao feita como o aluno: um `salvar_progresso`
   ou uma sessao inserida pelo aluno depois disso recalcula tudo de novo.
   ═══════════════════════════════════════════════════════════════════════════ */

async function fixarDominio(BASE, SK, uid, materias) {
  const r = await fetch(`${BASE}/rest/v1/progresso?usuario_id=eq.${uid}`, {
    method: "PATCH",
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ materias }),
  });
  if (r.status >= 300) throw new Error(`fixarDominio: HTTP ${r.status} ${await r.text()}`);
}

/* Quando a TELA grava o progresso ao abrir (o painel grava), o valor fixado
   acima e recalculado na hora -- como deve. Para esses testes, plante
   EVIDENCIA: respostas reais do acervo, `certas` de primeira e o resto errado.
   `materia` e o nome do BANCO ("Matemática"), nao o do edital.
   Depois recalcula pela mesma conta do servidor. */
async function plantarAcertos(BASE, SK, uid, materia, quantas, certas = quantas) {
  const cab = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
  const qs = await (await fetch(`${BASE}/rest/v1/questoes?materia=eq.${encodeURIComponent(materia)}&publicada=eq.true&select=id&order=id&limit=${quantas}`, { headers: cab })).json();
  if (!Array.isArray(qs) || qs.length < quantas) throw new Error(`plantarAcertos: o acervo de ${materia} tem ${qs?.length} questoes`);
  const linhas = qs.map((q, i) => ({ usuario_id: uid, questao_id: q.id, letra: "a", acertou: i < certas,
    vezes_errou: i < certas ? 0 : 1, vezes_acertou: i < certas ? 1 : 0 }));
  const r = await fetch(`${BASE}/rest/v1/respostas`, { method: "POST", headers: { ...cab, Prefer: "return=minimal" }, body: JSON.stringify(linhas) });
  if (r.status >= 300) throw new Error(`plantarAcertos: HTTP ${r.status} ${await r.text()}`);
  await recalcularDominio(BASE, SK, uid);
}

async function recalcularDominio(BASE, SK, uid) {
  const cab = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
  const p = (await (await fetch(`${BASE}/rest/v1/progresso?usuario_id=eq.${uid}&select=materias`, { headers: cab })).json())[0];
  const medidas = await (await fetch(`${BASE}/rest/v1/rpc/dominio_calculado`, { method: "POST", headers: cab,
    body: JSON.stringify({ p_uid: uid, p_materias: p?.materias || [] }) })).json();
  await fixarDominio(BASE, SK, uid, medidas);
  return medidas;
}

module.exports = { fixarDominio, plantarAcertos, recalcularDominio };
