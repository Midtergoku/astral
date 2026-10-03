/* OS DEFEITOS DE QUESTAO QUE A AUDITORIA ACHOU (03/10/2026, BAN-01)

   Os itens 6 a 9 de historico/revisao-de-questoes.md, num lugar so: o
   tools/arruma-acervo.js usa para TIRAR DO AR, a tela importar.html para nao
   PUBLICAR, o tools/testa-acervo-limpo.js
   usa para FALHAR se algum estiver publicado. Duas copias da mesma regra
   divergem -- foi o que aconteceu com a lista de materias em 22/09.

   Cada detector devolve um motivo curto (vai para o campo `revisao`) ou null.

   Medido na auditoria (01/10): 113 com simbolo perdido; 21 pares confirmados
   de alternativas trocadas em 29 lidos (de 60 suspeitos); 7 a 16 dependendo
   de figura. Os detectores daqui foram calibrados contra essas contagens e
   contra amostras lidas a mao -- ver o registro do item 2.11 no ROADMAP. */

const PUA = /[-]/;
const textos = (q) => [q.enunciado, q.texto_apoio, ...Object.values(q.alternativas || {})].map((t) => String(t || ""));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/* 6. Simbolo perdido: o PDF usava fonte de simbolos e o caractere virou um
      codigo da area de uso privado (≠, ≤, π, matrizes viram quadradinho). */
function simboloPerdido(q) {
  return textos(q).some((t) => PUA.test(t)) ? "simbolo perdido" : null;
}

/* 9. Depende de figura que o Banco nao tem (nao ha coluna de imagem). */
const FIGURA = /\b(figura|desenho|gr[aá]fico|histograma|ilustra[cç][aã]o|imagem|esquema abaixo|circuito abaixo|mapa abaixo)\b/i;
function dependeDeFigura(q) {
  return FIGURA.test(String(q.enunciado || "")) || FIGURA.test(String(q.texto_apoio || "")) ? "depende de figura" : null;
}

/* 8. Pedaco de outra questao colado no enunciado ("...logotipo, 59 – Dadas
      as retas..."). So conta o numero de uma questao SEGUINTE (ate 5 a
      frente), de 7 para cima, seguido de travessao e maiuscula.
      03/10/2026: a 1a versao aceitava +-2 e pegou 6 questoes BOAS de
      "relacione as colunas" ("1 – Comum-de-dois 2 – Sobrecomum...") -- listas
      de colunas sao curtas e comecam no 1. Medido: 8 achadas -> 2 de verdade. */
function questaoColada(q) {
  const n = Number(q.numero);
  if (!Number.isFinite(n)) return null;
  const e = String(q.enunciado || "");
  const re = /(?:^|[\s.,;:])(\d{1,3})\s*[–—-]\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/g;
  let m;
  while ((m = re.exec(e))) {
    const v = Number(m[1]);
    if (m.index > 20 && v >= 7 && v > n && v - n <= 5) return "outra questao colada";
  }
  return null;
}

/* 7. Alternativas de outra questao: o MESMO conjunto de alternativas em duas
      questoes da mesma prova. Fora os conjuntos curtos (numeros, I/II/III,
      V-F, letras), que se repetem de verdade. Marca as DUAS: nao da para
      saber qual delas ficou com as alternativas certas. */
function alternativasRepetidas(todas) {
  const grupos = new Map();
  for (const q of todas) {
    if (q.tipo === "certo_errado") continue;
    const alts = Object.values(q.alternativas || {}).map(norm);
    if (alts.length < 4 || alts.every((a) => a.length <= 6)) continue;
    const chave = `${q.banca}|${q.prova}|${q.ano}|` + [...alts].sort().join("§");
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(q);
  }
  const marcadas = new Map();
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    // enunciado igual = questao repetida (outro defeito, tratado a parte)
    if (new Set(g.map((q) => norm(q.enunciado))).size < 2) continue;
    for (const q of g) marcadas.set(q.id, "alternativas de outra questao");
  }
  return marcadas;
}

/** Todos os defeitos novos de uma lista de questoes: Map id -> motivo. */
function defeitos(todas) {
  const achados = new Map();
  for (const q of todas) {
    const m = simboloPerdido(q) || questaoColada(q) || dependeDeFigura(q);
    if (m) achados.set(q.id, m);
  }
  for (const [id, m] of alternativasRepetidas(todas)) if (!achados.has(id)) achados.set(id, m);
  return achados;
}

export { defeitos, simboloPerdido, dependeDeFigura, questaoColada, alternativasRepetidas, FIGURA };
