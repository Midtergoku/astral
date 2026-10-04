// ============================================================================
// Conferir os links do guia ANTES de mostrar -- professor e link inventados.
//
// POR QUE EXISTE (30/09/2026)
// Ele: "o risco da IA inventar professores e links -- valide cada link
// automaticamente antes de exibir". A IA escreve um canal com cara de real
// (youtube.com/@profjoaomatematica) que nao existe, e o aluno clica num 404.
//
// COMO, sem chave de API nenhuma (medido em 30/09 contra o YouTube):
//   - canal por @nome, /c/ ou /user/ inventado -> HTTP 404
//   - canal por /channel/UC... inventado       -> a pagina da 200, mas SEM o
//     <link rel="canonical">; o real o traz (ate 30/09 se usava o feed
//     feeds/videos.xml, que QUEBROU em 03/10: 500/404 ate para canal real)
//   - canal real por @nome                     -> 200 e a pagina traz
//     <link rel="canonical" href=".../channel/UC...">
//   - video ou playlist inventado              -> a pagina da 200 sempre, mas
//     o oEmbed oficial (youtube.com/oembed) da 404
//   - site comum com pagina inexistente        -> 404 (ou 403 de quem barra robo)
//
// A REGRA: so sai o que e MORTO COM CERTEZA (404/410, dominio que nao existe,
// canal sem a marca de canal). O que nao da para conferir -- 403 de site que
// barra robo, 429, 5xx, demora -- FICA: nao conferido nao e o mesmo que falso.
//
// 🔴 SE O YOUTUBE BARRAR O SERVIDOR (pagina de "confirme que nao e robo"), a
// marca de canal some de TODAS as paginas, inclusive das reais. Por isso ha um
// canal de controle, sabidamente real: se nem ele passa, o conferidor esta
// cego, e ninguem e cortado por isso -- vai para o log como "incerto".
// ============================================================================

type Veredito = "ok" | "morto" | "incerto";

const TEMPO_MS = 6000;
const CONTROLE = "https://www.youtube.com/@YouTube";
const CABECALHOS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

async function buscar(url: string): Promise<{ status: number; corpo: string } | "dns" | "falhou"> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TEMPO_MS);
  try {
    const r = await fetch(url, { headers: CABECALHOS, redirect: "follow", signal: ctl.signal });
    // Le a pagina INTEIRA: a de canal tem ~1,7 MB e a marca de canal fica
    // depois do caractere 400 mil (medido em 30/09 -- cortar ali cegava tudo).
    const corpo = r.status === 200 ? await r.text() : (await r.body?.cancel(), "");
    return { status: r.status, corpo };
  } catch (e) {
    // Dominio que nao existe e certeza; demora ou recusa de conexao, nao.
    // O Deno diz "dns error" na mensagem; o Node embrulha em e.cause (ENOTFOUND).
    const causa = String((e as { cause?: { code?: string } })?.cause?.code ?? "");
    return /dns|name|resolve|not known/i.test(String(e)) || causa === "ENOTFOUND" ? "dns" : "falhou";
  } finally {
    clearTimeout(t);
  }
}

const ehYoutube = (h: string) => /(^|\.)youtube\.com$/.test(h) || h === "youtu.be";
const temMarcaDeCanal = (html: string) =>
  /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/UC[\w-]{22}"/.test(html);

/** O que o endereco do YouTube aponta: video/playlist, canal, busca ou nada. */
function tipoYoutube(u: URL): "midia" | "canal" | "busca" | "vago" {
  const p = u.pathname;
  if (u.hostname === "youtu.be" || p === "/watch" || p.startsWith("/shorts/") || p === "/playlist") return "midia";
  if (/^\/(@[^/]+|c\/[^/]+|user\/[^/]+|channel\/UC[\w-]{22})/.test(p)) return "canal";
  if (p === "/results") return "busca";
  return "vago";                                   // youtube.com puro nao e professor nenhum
}

async function conferirUm(bruto: string, cegoNoYoutube: () => Promise<boolean>): Promise<Veredito> {
  let u: URL;
  try { u = new URL(bruto); } catch { return "morto"; }
  if (ehYoutube(u.hostname)) {
    const tipo = tipoYoutube(u);
    if (tipo === "busca") return "ok";
    if (tipo === "vago") return "morto";
    if (tipo === "midia") {
      const r = await buscar(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u.toString())}`);
      if (typeof r === "string") return "incerto";
      if (r.status === 200 || r.status === 401) return "ok";   // 401: existe, so nao deixa incorporar
      if (r.status === 404 || r.status === 400) return "morto";
      return "incerto";
    }
    /* 03/10/2026: o feed (feeds/videos.xml?channel_id=) QUEBROU do lado do
       YouTube -- 500 para canal real e 404 ate para o canal oficial do proprio
       YouTube. Com ele, todo /channel/UC... real seria cortado como "morto".
       Medido no mesmo dia: a PAGINA do canal real traz o <link rel="canonical">
       e a do inventado nao traz -- o mesmo criterio do @nome, logo abaixo. */
    const r = await buscar(u.toString());
    if (typeof r === "string") return "incerto";
    if (r.status === 404 || r.status === 410) return "morto";
    if (r.status !== 200) return "incerto";
    if (temMarcaDeCanal(r.corpo)) return "ok";
    return (await cegoNoYoutube()) ? "incerto" : "morto";
  }
  const r = await buscar(u.toString());
  if (r === "dns") return "morto";
  if (r === "falhou") return "incerto";
  if (r.status === 404 || r.status === 410) return "morto";
  return r.status < 400 ? "ok" : "incerto";
}

interface ItemComUrl { url: string; [k: string]: unknown }

/**
 * Tira do guia o que esta morto com certeza. Devolve o guia limpo e a contagem,
 * que vai para o log (e o numero que prova que isto funciona na producao).
 */
export async function conferirLinks<T extends Record<string, unknown>>(dados: T, listas: string[]) {
  // O controle roda no maximo uma vez, e so se alguem precisar dele.
  let controle: Promise<boolean> | null = null;
  const cegoNoYoutube = () => (controle ??= buscar(CONTROLE).then((r) =>
    typeof r === "string" || r.status !== 200 || !temMarcaDeCanal(r.corpo)));

  const conta = { ok: 0, morto: 0, incerto: 0, cortados: [] as string[] };
  const limpo: Record<string, unknown> = { ...dados };
  await Promise.all(listas.map(async (nome) => {
    const itens = Array.isArray(dados[nome]) ? dados[nome] as ItemComUrl[] : [];
    const vereditos = await Promise.all(itens.map((i) => conferirUm(i.url, cegoNoYoutube).catch(() => "incerto" as Veredito)));
    vereditos.forEach((v, k) => { conta[v]++; if (v === "morto") conta.cortados.push(itens[k].url.slice(0, 120)); });
    limpo[nome] = itens.filter((_, k) => vereditos[k] !== "morto");
  }));
  return { dados: limpo as T, conta };
}
