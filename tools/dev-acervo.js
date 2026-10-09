// DEV-ACERVO (04/10/2026, veio do rascunho da sessao): depois da bateria (o testa-migrations-do-zero
// apaga o astral-dev), devolve ao dev as questoes publicadas. Rodar ANTES do dev-semear.js.
// Copia o ACERVO publico (questoes publicadas) e materias_conhecidas da producao para o DEV.
// So conteudo de prova, nenhum dado de aluno. A producao e so lida.
//
// 09/10/2026 (COD-02, a bateria passou a rodar no dev): a copia agora MANTEM O NUMERO (id) de
// cada questao. Antes o dev dava numeros novos, e as imagens (img/questoes/<id>-<hash>.webp)
// apontavam para outra questao -- o testa-acervo-limpo acusou 165. O id e "generated always",
// entao a carga vai por SQL com "overriding system value". E o acervo do dev e ZERADO antes
// (truncate em cascata: respostas e relatos de TESTE juntos) -- so no dev, conferido abaixo.
const { execSync, execFileSync } = require("child_process");
const path = require("path");
const PROD = "jjogmcacbdefwiwcyjxp", DEV = "vtluuezwfpqgryixaaea";
if (PROD === DEV) throw new Error("dev e producao iguais: recusado");
const chave = (ref) => JSON.parse(execSync(`supabase projects api-keys --project-ref ${ref} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).find((k) => k.name === "service_role").api_key;
const KP = chave(PROD), KD = chave(DEV);
const cab = (k) => ({ apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" });
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sqlNoDev(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${DEV}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL HTTP ${r.status}: ${t.slice(0, 200)}`); return JSON.parse(t);
}
(async () => {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`https://${PROD}.supabase.co/rest/v1/questoes?publicada=eq.true&select=*&order=id`, { headers: { ...cab(KP), Range: `${de}-${de + 999}` } });
    const p = await r.json(); todas.push(...p); if (p.length < 1000) break;
  }
  // so as colunas que aceitam valor (as calculadas ficam de fora; o id entra pelo overriding)
  const cols = (await sqlNoDev(`select column_name c from information_schema.columns
     where table_schema = 'public' and table_name = 'questoes' and is_generated = 'NEVER' order by ordinal_position`)).map((x) => x.c);
  const lista = cols.map((c) => `"${c}"`).join(", ");
  await sqlNoDev("truncate table public.questoes restart identity cascade");
  let ok = 0;
  for (let i = 0; i < todas.length; i += 200) {
    const lote = JSON.stringify(todas.slice(i, i + 200));
    if (lote.includes("$acervo$")) throw new Error("o texto de uma questao tem a marca $acervo$ -- trocar a marca");
    await sqlNoDev(`insert into public.questoes (${lista}) overriding system value
      select ${lista} from jsonb_populate_recordset(null::public.questoes, $acervo$${lote}$acervo$::jsonb)`);
    ok += Math.min(200, todas.length - i);
  }
  await sqlNoDev("select setval(pg_get_serial_sequence('public.questoes', 'id'), (select max(id) from public.questoes))");
  const mc = await (await fetch(`https://${PROD}.supabase.co/rest/v1/materias_conhecidas?select=*&order=ordem`, { headers: cab(KP) })).json();
  const r2 = await fetch(`https://${DEV}.supabase.co/rest/v1/materias_conhecidas`, { method: "POST", headers: { ...cab(KD), Prefer: "return=minimal,resolution=merge-duplicates" }, body: JSON.stringify(mc) });
  console.log(`questoes copiadas (com o mesmo numero da producao): ${ok} de ${todas.length} · materias_conhecidas: ${mc.length} (HTTP ${r2.status})`);
})().catch((e) => { console.log("FALHOU:", e.message); process.exit(1); });
