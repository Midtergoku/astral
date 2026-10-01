/* ═══════════════════════════════════════════════════════════════════════════
   SINCRONIZA-MATERIAS -- a lista de materias do prova.js vai para o banco.

   POR QUE EXISTE (30/09/2026)
   O dominio passou a ser medido no servidor, e para isso ele precisa casar a
   materia do edital ("Lingua Portuguesa") com a do Banco ("Portugues"). Quem
   faz isso no navegador e `MATERIAS_CONHECIDAS`, em assets/js/prova.js. Copiar
   a lista a mao para o SQL seria ter duas listas para divergir -- o defeito
   que a checagem 15 do verifica.js ja pegou uma vez. Entao a lista continua
   morando no prova.js, e esta ferramenta a ESPELHA na tabela
   `materias_conhecidas`.

   Traducao de expressao regular, JS -> Postgres: so o `\b` muda (vira `\y`).
   O resto -- classes [êe], \s+, grupos, | -- e igual nas duas.

   Depois de sincronizar, RECALCULA o dominio de quem tem edital: a lista
   mudou, o casamento de nomes pode ter mudado junto.

   USO   node tools/sincroniza-materias.js            sincroniza e recalcula
         node tools/sincroniza-materias.js --conferir so compara (sai 1 se divergir)
   ═══════════════════════════════════════════════════════════════════════════ */

const { execFileSync } = require("child_process");
const path = require("path");
const { pathToFileURL } = require("url");

const REF = "jjogmcacbdefwiwcyjxp";
const conferir = process.argv.includes("--conferir");

// O token de gerenciamento, lido pelo script isolado; nunca vai para arquivo.
const TOKEN = execFileSync("powershell", ["-NoProfile", "-File", path.join(__dirname, "token-supabase.ps1")],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error("SQL falhou (HTTP " + r.status + "): " + t.slice(0, 300));
  return JSON.parse(t);
}
const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";

(async () => {
  const { MATERIAS_CONHECIDAS } = await import(pathToFileURL(path.join(__dirname, "..", "assets/js/prova.js")).href);
  const linhas = MATERIAS_CONHECIDAS.map(([re, nome], i) => {
    if (re.flags.replace("i", "")) throw new Error(`flag que o Postgres nao tem: /${re.source}/${re.flags}`);
    return { ordem: i + 1, padrao: re.source.split("\\b").join("\\y"), nome };
  });

  const banco = await sql("select ordem, padrao, nome from public.materias_conhecidas order by ordem");
  const igual = banco.length === linhas.length &&
    linhas.every((l, i) => banco[i].ordem === l.ordem && banco[i].padrao === l.padrao && banco[i].nome === l.nome);

  if (conferir) {
    console.log(igual ? `materias_conhecidas igual ao prova.js (${linhas.length} linhas)`
                      : `🔴 DIVERGE: banco ${banco.length} linhas, prova.js ${linhas.length}. Rodar sem --conferir.`);
    // exitCode, e nao process.exit: no Windows, sair a forca logo apos um fetch
    // derruba o Node com "UV_HANDLE_CLOSING" (visto em 30/09) e o codigo vira 127.
    process.exitCode = igual ? 0 : 1;
    return;
  }

  if (!igual) {
    const valores = linhas.map((l) => `(${l.ordem}, ${lit(l.padrao)}, ${lit(l.nome)})`).join(",\n");
    await sql(`begin;
      delete from public.materias_conhecidas;
      insert into public.materias_conhecidas (ordem, padrao, nome) values ${valores};
      commit;`);
  }
  // Recalcula o dominio de quem tem materia (mesmo sem a lista ter mudado:
  // e barato, e e o que a primeira sincronizacao precisa).
  const r = await sql(`with feito as (
      update public.progresso set materias = public.dominio_calculado(usuario_id, materias)
       where jsonb_typeof(materias) = 'array' and jsonb_array_length(materias) > 0
      returning 1) select count(*)::int as n from feito`);
  console.log(`${igual ? "lista ja estava igual" : `lista sincronizada: ${linhas.length} materias`} · dominio recalculado em ${r[0].n} conta(s)`);
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
