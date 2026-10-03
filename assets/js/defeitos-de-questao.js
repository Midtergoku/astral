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
/* 03/10/2026 (roadmap 3.4): alternativas "DE MOLDE" -- sequencias V/F ou T/F,
   numeros de relacionar colunas, "I e II.", "Somente I esta correto." -- SE
   REPETEM DE VERDADE entre questoes da mesma prova. A primeira versao desta
   regra marcava as duas e tirou do ar questoes boas (medido: 3 de Matematica
   do CFSd com "Somente I esta correto...", 4 de V/F da EAGS 2024 cod 31).
   Com molde, so e defeito a questao cujo enunciado NAO tem a forma que essas
   alternativas pedem: V/F sem nenhum "( )", "I e II" sem itens I, II...
   (Fronteira por letra Unicode, nao por \b: o \b do JavaScript nao ve "á".) */
const PALAVRAS_DE_MOLDE = /(?<!\p{L})(somente|apenas|todas|nenhuma|as|afirmações|afirmativas|está|estão|corretos?|corretas?|incorretos?|incorretas?)(?!\p{L})/giu;
// Numero sozinho NAO e molde ("150; 9000" e resposta de conta): so sequencia de colunas.
function ehMolde(alt) {
  const s = String(alt).replace(PALAVRAS_DE_MOLDE, " ");
  if (!/^[\s0-9IVXFTCEeou,.;\-–‐—]+$/.test(s)) return false;
  // so palavras de molde ("Todas as afirmações estão corretas.")
  if (/^[\s.,;]*$/.test(s)) return String(alt).trim().length > 0;
  return /[IVXFTCE]/.test(s) || /^\s*\d{1,2}(\s*[-–‐—]\s*\d{1,2}){2,}\s*\.?\s*$/.test(s);
}
function cabeNoMolde(q) {
  const e = String(q.enunciado || "") + " " + String(q.texto_apoio || "");
  const parenteses = (e.match(/\(\s*\)/g) || []).length;
  const romanos = (e.match(/(^|\s)(I|II|III|IV|V)\s*[-–‐.)]\s/g) || []).length;
  return parenteses >= 2 || romanos >= 2;
}
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
    const molde = Object.values(g[0].alternativas || {}).every(ehMolde);
    for (const q of g) {
      if (molde && cabeNoMolde(q)) continue;     // repeticao legitima de molde
      marcadas.set(q.id, "alternativas de outra questao");
    }
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

export { defeitos, simboloPerdido, dependeDeFigura, questaoColada, alternativasRepetidas, FIGURA, ehMolde, cabeNoMolde };
