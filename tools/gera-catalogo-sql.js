// GERA-CATALOGO-SQL -- leva o catalogo para o banco, sem criar uma segunda fonte
//
//   node tools/gera-catalogo-sql.js            confere se o banco esta em dia
//   node tools/gera-catalogo-sql.js --escrever grava a migration de semente
//
// ── O PROBLEMA QUE ISTO RESOLVE ────────────────────────────────────────────
// Decisao dele em 20/09/2026: "o servidor vai gravar, nao quero ninguem
// alterando isso a nao ser nos". Para o SERVIDOR decidir quem ganhou o que, ele
// precisa conhecer as 74 condicoes -- e elas moram em `assets/js/catalogo.js`.
//
// A saida obvia seria escrever as condicoes de novo em SQL. Seria a pior
// escolha possivel: duas copias do mesmo catalogo DIVERGEM, e nao e questao de
// disciplina, e questao de tempo. Uma medalha passaria a existir na tela e nao
// no banco, ou o contrario, e ninguem perceberia ate alguem reclamar.
//
// ── A SOLUCAO: UMA FONTE, UMA DERIVADA ────────────────────────────────────
// `catalogo.js` continua sendo o unico lugar que se ESCREVE -- e e onde o
// Lucas mexe. Este programa LE esse arquivo e gera a semente SQL. O banco
// nunca e editado a mao.
//
// E ha uma trava: sem `--escrever`, o programa CONFERE se o que esta no disco
// bate com o catalogo atual, e falha se nao bater. Assim, mexer no catalogo e
// esquecer de regerar vira erro no `verifica.js`, e nao um bug silencioso tres
// semanas depois.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const RAIZ = path.resolve(__dirname, "..");
const DESTINO = path.join(RAIZ, "supabase", "migrations", "20260920180000_catalogo_no_banco.sql");

/* Escapa texto para dentro de literal SQL. Aspas simples dobram -- e o unico
   escape que o Postgres exige aqui. Nomes e descricoes tem apostrofo
   ("Condecoracao Maxima" nao, mas "Ordem de Servico" pode ganhar um amanha). */
const lit = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;

(async () => {
  const cat = await import(pathToFileURL(path.join(RAIZ, "assets", "js", "catalogo.js")).href);

  const linhas = cat.CONDECORACOES.map((c) => {
    const cond = JSON.stringify(c.condicao);
    return `  (${lit(c.id)}, ${lit(c.metal)}, ${c.secreta ? "true" : "false"}, `
         + `${lit(c.nome)}, ${lit(c.descricao)}, ${lit(cond)}::jsonb)`;
  });

  const divisas = cat.DIVISAS.map((d) => {
    const cond = JSON.stringify(d.condicao);
    return `  (${lit(d.id)}, ${lit(d.raridade)}, ${d.secreta ? "true" : "false"}, `
         + `${lit(d.nome)}, ${lit(d.comoGanha)}, ${lit(d.cor)}, ${lit(cond)}::jsonb)`;
  });

  const sql = `-- ═══════════════════════════════════════════════════════════════════════════
-- O CATALOGO NO BANCO
--
-- 🔴 ARQUIVO GERADO. Nao edite a mao.
--    Fonte: assets/js/catalogo.js
--    Gere de novo com: node tools/gera-catalogo-sql.js --escrever
--
-- Por que existe: decisao dele em 20/09/2026 -- "o servidor vai gravar, nao
-- quero ninguem alterando isso a nao ser nos". Para o servidor decidir quem
-- ganhou o que, ele precisa conhecer as condicoes.
--
-- Por que e GERADO e nao escrito: duas copias do mesmo catalogo divergem. O
-- \`catalogo.js\` continua sendo o unico lugar que se escreve; esta tabela e
-- derivada dele, e o \`verifica.js\` falha se as duas sairem de sincronia.
--
-- ${cat.CONDECORACOES.length} condecoracoes . ${cat.DIVISAS.length} divisas

create table if not exists public.catalogo_condecoracoes (
  id          text primary key,
  metal       text not null check (metal in ('bronze','prata','ouro','platina')),
  secreta     boolean not null default false,
  nome        text not null,
  descricao   text not null,
  condicao    jsonb not null
);

create table if not exists public.catalogo_divisas (
  id          text primary key,
  raridade    text not null check (raridade in ('comum','incomum','rara','lendaria')),
  secreta     boolean not null default false,
  nome        text not null,
  como_ganha  text not null,
  cor         text not null,
  condicao    jsonb not null
);

-- O catalogo e PUBLICO para quem esta logado: e a lista do que existe, nao
-- dado de ninguem. Escrita, so pelo dono do banco -- nem \`authenticated\`
-- recebe grant de insert.
alter table public.catalogo_condecoracoes enable row level security;
alter table public.catalogo_divisas       enable row level security;

drop policy if exists catalogo_cond_leitura on public.catalogo_condecoracoes;
create policy catalogo_cond_leitura on public.catalogo_condecoracoes
  for select to authenticated using (true);

drop policy if exists catalogo_div_leitura on public.catalogo_divisas;
create policy catalogo_div_leitura on public.catalogo_divisas
  for select to authenticated using (true);

revoke all on public.catalogo_condecoracoes from anon, authenticated;
revoke all on public.catalogo_divisas       from anon, authenticated;
grant select on public.catalogo_condecoracoes to authenticated;
grant select on public.catalogo_divisas       to authenticated;

-- ── A SEMENTE ──────────────────────────────────────────────────────────────
-- \`on conflict do update\` para a regeracao ser idempotente: rodar duas vezes
-- da o mesmo resultado, e alterar um nome no catalogo atualiza aqui sem
-- apagar as conquistas de ninguem (que vivem noutra tabela e apontam por id).
insert into public.catalogo_condecoracoes (id, metal, secreta, nome, descricao, condicao)
values
${linhas.join(",\n")}
on conflict (id) do update set
  metal = excluded.metal, secreta = excluded.secreta,
  nome = excluded.nome, descricao = excluded.descricao, condicao = excluded.condicao;

insert into public.catalogo_divisas (id, raridade, secreta, nome, como_ganha, cor, condicao)
values
${divisas.join(",\n")}
on conflict (id) do update set
  raridade = excluded.raridade, secreta = excluded.secreta,
  nome = excluded.nome, como_ganha = excluded.como_ganha,
  cor = excluded.cor, condicao = excluded.condicao;

-- 🔴 NAO ha \`delete\` aqui, de proposito. Se uma condecoracao sair do
-- catalogo, a linha antiga fica na tabela -- e quem ja a conquistou continua
-- com ela. Apagar seria desconquistar, que e exatamente o que a regra dele de
-- 02/08 proibe: "conquista nao se desconquista".
`;

  const escrever = process.argv.includes("--escrever");
  const existente = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, "utf8") : null;

  if (escrever) {
    fs.writeFileSync(DESTINO, sql, "utf8");
    console.log(`  semente gerada: ${cat.CONDECORACOES.length} condecoracoes, ${cat.DIVISAS.length} divisas`);
    console.log(`  ${path.relative(RAIZ, DESTINO)}`);
    process.exit(0);
  }

  if (existente === null) {
    console.log("🔴 a semente do catalogo nao existe. Rode com --escrever.");
    process.exit(1);
  }
  if (existente !== sql) {
    console.log("🔴 O CATALOGO MUDOU E A SEMENTE NAO FOI REGERADA.");
    console.log("   O banco decidiria quem ganha o que por uma lista DESATUALIZADA.");
    console.log("   Rode: node tools/gera-catalogo-sql.js --escrever");
    process.exit(1);
  }
  console.log(`  semente em dia (${cat.CONDECORACOES.length} condecoracoes, ${cat.DIVISAS.length} divisas)`);
})();
