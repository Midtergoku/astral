#!/usr/bin/env node
// Dispara sozinho no inicio de toda sessao (ver .claude/settings.json).
// O que ele imprime entra direto no contexto do Claude, antes do primeiro prompt.
//
// POR QUE ISSO EXISTE: a reorganizacao de 01/08/2026 tirou 2850 linhas do
// CLAUDE.md e as espalhou em historico/. O indice do CLAUDE.md diz onde cada
// coisa esta -- mas depender de eu LEMBRAR de abrir e disciplina minha, e
// disciplina minha ja falhou neste projeto. Isto nao depende de disciplina.
//
// Manter CURTO: cada linha aqui e paga em token em TODA sessao.

const { execSync } = require("child_process");

const linhas = [
  "== ASTRAL: lembrete automatico de inicio de sessao ==",
  "",
  "1. PRIMEIRA ACAO, antes de qualquer outra coisa (regra 4 do CLAUDE.md):",
  "     node tools/checa-saude.js",
  "   O Lucas nao executa nada. Se quebrou, eu detecto e conserto sozinho.",
  "",
  "2. O CLAUDE.md tem 139 linhas. O RESTO NAO SUMIU -- mudou de arquivo.",
  "   Consultar ANTES de trabalhar, nao depois:",
  "",
  "     historico/erros.md ............. antes de AFIRMAR qualquer coisa",
  "     historico/blocos-executados.md . antes de CONSERTAR algo que parece",
  "                                      estranho -- pode ser decisao deliberada",
  "     historico/auditorias.md ........ antes de AUDITAR de novo",
  "     historico/sessoes.md ........... para saber POR QUE algo foi decidido",
  "     historico/decisoes.md .......... antes de REABRIR decisao fechada",
  "     historico/ordem-de-trabalho.md . ao PLANEJAR o proximo bloco",
  "",
  "   As skills astral-* carregam sozinhas pela tarefa; as rules, pela pasta.",
  "",
  "3. As duas armadilhas que mais custaram caro aqui:",
  "     - afirmar sem medir: errei nas 9 vezes que tentei",
  "     - chamar de bug o que foi feito de proposito: escrever a frase",
  "       \"isto foi feito de proposito porque ___\" e ver se ela fecha",
];

// Estado do git ajuda a saber se sobrou trabalho da sessao passada.
try {
  const sujo = execSync("git status --porcelain", { encoding: "utf8", timeout: 5000 }).trim();
  const head = execSync("git log --oneline -1", { encoding: "utf8", timeout: 5000 }).trim();
  linhas.push("", `4. Ultimo commit: ${head}`);
  linhas.push(sujo
    ? `   ⚠️ ARVORE SUJA -- sobrou trabalho nao commitado:\n${sujo.split("\n").map((l) => "     " + l).join("\n")}`
    : "   Arvore limpa.");
} catch {
  // git indisponivel nao pode derrubar o lembrete -- o resto ainda vale
}

console.log(linhas.join("\n"));
