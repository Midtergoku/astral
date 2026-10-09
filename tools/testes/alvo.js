/* ═══════════════════════════════════════════════════════════════════════════
   ALVO -- contra qual banco o teste roda (09/10/2026, auditoria COD-02, roadmap 3.15)

   Os testes criavam e apagavam contas NA PRODUCAO. Com alunos de verdade, uma
   falha no meio deixa conta falsa e distorce contagens (funil, lista de
   espera). O astral-dev e uma copia do banco feita so das migrations
   (testa-migrations-do-zero prova que e igual), com as mesmas funcoes.

     ASTRAL_DEV=1   -> astral-dev (vtluuezwfpqgryixaaea)
     sem nada       -> producao (para conferir o que esta no ar)

   O roda-testes.js liga ASTRAL_DEV=1 sozinho em todo teste que usa este
   modulo (ou que ja lia ASTRAL_DEV), menos os que existem para olhar o SITE NO
   AR (testa-site, testa-vitrine, testa-lighthouse) -- o site publicado fala com
   a producao.

   reescrever(arquivo, conteudo): as paginas servidas pelo teste trazem o
   endereco e a chave publica da PRODUCAO (assets/js/astral.js). No dev, troca
   pelos do dev antes de entregar ao navegador -- o arquivo no disco nao muda.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROD = "jjogmcacbdefwiwcyjxp";
const DEV = "vtluuezwfpqgryixaaea";
const NO_DEV = process.env.ASTRAL_DEV === "1";
const REF = NO_DEV ? DEV : PROD;
const BASE = `https://${REF}.supabase.co`;

const PUB_PROD = (fs.readFileSync(path.join(__dirname, "..", "..", "assets", "js", "astral.js"), "utf8").match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
let chaves = null;
function chavesDoProjeto() {
  if (!chaves) chaves = JSON.parse(execSync(`supabase projects api-keys --project-ref ${REF} -o json`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  return chaves;
}
const PUB = NO_DEV ? (chavesDoProjeto().find((k) => k.type === "publishable") || chavesDoProjeto().find((k) => k.name === "anon")).api_key : PUB_PROD;

function reescrever(arquivo, conteudo) {
  if (!NO_DEV || !/\.(js|mjs|html)$/i.test(String(arquivo))) return conteudo;
  return Buffer.from(conteudo.toString("utf8").split(PROD).join(DEV).split(PUB_PROD).join(PUB), "utf8");
}

module.exports = { NO_DEV, PROD, DEV, REF, BASE, PUB, PUB_PROD, reescrever, chavesDoProjeto, onde: NO_DEV ? "astral-dev" : "producao" };
