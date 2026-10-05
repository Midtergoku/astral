// DEV-ACERVO (04/10/2026, veio do rascunho da sessao): depois da bateria (o testa-migrations-do-zero
// apaga o astral-dev), devolve ao dev as questoes publicadas. Rodar ANTES do dev-semear.js.
// Copia o ACERVO publico (questoes publicadas) e materias_conhecidas da producao para o DEV.
// So conteudo de prova, nenhum dado de aluno. A producao e so lida.
const { execSync } = require("child_process");
const PROD = "jjogmcacbdefwiwcyjxp", DEV = "vtluuezwfpqgryixaaea";
const chave = (ref) => JSON.parse(execSync(`supabase projects api-keys --project-ref ${ref} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const KP = chave(PROD), KD = chave(DEV);
const cab = (k) => ({ apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" });
(async () => {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`https://${PROD}.supabase.co/rest/v1/questoes?publicada=eq.true&select=*&order=id`, { headers: { ...cab(KP), Range: `${de}-${de + 999}` } });
    const p = await r.json(); todas.push(...p); if (p.length < 1000) break;
  }
  const semId = todas.map(({ id, ...q }) => q);
  let ok = 0;
  for (let i = 0; i < semId.length; i += 200) {
    const r = await fetch(`https://${DEV}.supabase.co/rest/v1/questoes`, { method: "POST", headers: { ...cab(KD), Prefer: "return=minimal" }, body: JSON.stringify(semId.slice(i, i + 200)) });
    if (r.status < 300) ok += Math.min(200, semId.length - i); else console.log("lote", i, r.status, (await r.text()).slice(0, 150));
  }
  const mc = await (await fetch(`https://${PROD}.supabase.co/rest/v1/materias_conhecidas?select=*&order=ordem`, { headers: cab(KP) })).json();
  const r2 = await fetch(`https://${DEV}.supabase.co/rest/v1/materias_conhecidas`, { method: "POST", headers: { ...cab(KD), Prefer: "return=minimal,resolution=merge-duplicates" }, body: JSON.stringify(mc) });
  console.log(`questoes copiadas: ${ok} de ${todas.length} · materias_conhecidas: ${mc.length} (HTTP ${r2.status})`);
})();
