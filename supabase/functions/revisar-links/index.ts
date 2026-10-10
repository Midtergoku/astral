// ============================================================================
// REVISAR-LINKS -- os links do guia, conferidos toda semana
// (10/10/2026 -- auditoria CE-08, roadmap 3.24; decisao P8 dele: "sim")
//
// Quem chama: o despertador do banco (pg_cron 'astral-revisar-links', segunda 06h
// de SP) via chamar_revisao_links(), com o MESMO segredo do vigia no cabecalho
// x-astral-vigia. Sem o segredo: 401, nada e lido.
//
// O que faz: pega os guias revisados ha mais tempo (os nunca revisados primeiro),
// poucos por vez, e passa o conferidor de 30/09 (_shared/links.ts -- oEmbed e feed
// do YouTube, SEM chave de API). So sai o link MORTO COM CERTEZA; duvida fica.
// Grava o guia limpo (so se algo saiu) e o revisado_em.
//
// Limite por rodada: o plano gratis da 150 s por funcao, e cada link leva ate
// alguns segundos. 12 guias por tabela por semana; o que nao coube entra na
// proxima (ordem: revisado_em mais antigo).
//
// verify_jwt = false (config.toml): quem chama e o banco, nao um aluno.
// ============================================================================
import { admin } from "../_shared/comum.ts";
import { conferirLinks } from "../_shared/links.ts";

const LISTAS = ["professores", "materiais_gratuitos", "cursos_pagos"];
const POR_RODADA = 12;

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}
function igual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

async function revisarTabela(tabela: "guias_por_edital" | "recursos_salvos", chave: string[]) {
  const total = { guias: 0, ok: 0, morto: 0, incerto: 0, mudados: 0 };
  const { data, error } = await admin().from(tabela)
    .select([...chave, "dados"].join(","))
    .order("revisado_em", { ascending: true, nullsFirst: true })
    .limit(POR_RODADA);
  if (error) { console.error(`revisar-links: ler ${tabela}:`, error.message); return total; }
  for (const linha of (data ?? []) as Record<string, unknown>[]) {
    const dados = (linha.dados && typeof linha.dados === "object") ? linha.dados as Record<string, unknown> : {};
    const { dados: limpo, conta } = await conferirLinks(dados, LISTAS);
    total.guias++; total.ok += conta.ok; total.morto += conta.morto; total.incerto += conta.incerto;
    const mudou = conta.morto > 0;
    if (mudou) total.mudados++;
    let q = admin().from(tabela).update(mudou ? { dados: limpo, revisado_em: new Date().toISOString() } : { revisado_em: new Date().toISOString() });
    for (const c of chave) q = q.eq(c, linha[c] as string);
    const { error: e2 } = await q;
    if (e2) console.error(`revisar-links: gravar ${tabela}:`, e2.message);
    if (conta.cortados.length) console.log("revisar-links cortados", JSON.stringify({ tabela, cortados: conta.cortados.slice(0, 10) }));
  }
  return total;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta({ error: "Método não suportado." }, 405);
  const esperado = Deno.env.get("VIGIA_SEGREDO");
  if (!esperado) return resposta({ error: "Revisão não configurada." }, 503);
  if (!igual(req.headers.get("x-astral-vigia") ?? "", esperado)) return resposta({ error: "Não autorizado." }, 401);

  const compartilhados = await revisarTabela("guias_por_edital", ["edital_hash", "materia"]);
  const dosAlunos = await revisarTabela("recursos_salvos", ["id"]);
  console.log("revisar-links", JSON.stringify({ compartilhados, dosAlunos }));
  return resposta({ compartilhados, dosAlunos });
});
