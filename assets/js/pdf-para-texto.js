// PDF-PARA-TEXTO -- le o PDF DENTRO do navegador e devolve as tres leituras.
//
// 🔴 POR QUE E UM MODULO: desde 22/09/2026 duas telas precisam disto --
// `importar.html` (a bancada do Lucas, que publica no acervo) e `banco.html`
// (onde o aluno sobe a prova dele, so para ele). Duas copias divergiriam, e a
// divergencia so apareceria meses depois numa questao torta.
//
// No terminal quem faz este trabalho e o `pdftotext`; aqui e o pdf.js, que
// mora em `assets/js/` e nao num CDN -- mesma razao do supabase-js: a CSP so
// autoriza script do proprio dominio, e se o CDN cair o Astral nao cai junto.
//
// ── POR QUE TRES LEITURAS, e nao uma ────────────────────────────────────────
// Prova e impressa em DUAS COLUNAS. Quando a pergunta fica no pe de uma coluna
// e as alternativas no alto da outra, a leitura em fluxo separa as duas e a
// questao se perde. Entao le-se em fluxo, so a coluna esquerda e so a direita,
// e quem usa fica com a melhor versao de cada questao (ver assets/js/prova.js).
//
// O arquivo NAO sai do computador de quem o soltou. Nada e enviado para
// servidor nenhum nesta etapa -- e isso importa especialmente na aba
// particular, onde o material pode ter dono.

const VERSAO = "4.10.38";

let pdfjsPromise = null;
function carregarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(`./pdf-${VERSAO}.min.mjs`).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `./pdf-worker-${VERSAO}.min.mjs`;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Recebe o File do <input type="file"> e devolve [fluxo, esquerda, direita].
 * @param {File} arquivo
 * @returns {Promise<string[]>}
 */
export async function pdfParaLeituras(arquivo) {
  const pdfjs = await carregarPdfjs();
  const buf = await arquivo.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const fluxo = [], esquerda = [], direita = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const largura = pagina.getViewport({ scale: 1 }).width;
    const corte = largura * 0.5;
    const itens = (await pagina.getTextContent()).items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str }));

    const emLinhas = (lista) => {
      const porY = new Map();
      // Arredonda o Y: itens da mesma linha impressa variam meio ponto.
      for (const i of lista) {
        const chave = Math.round(i.y / 3);
        if (!porY.has(chave)) porY.set(chave, []);
        porY.get(chave).push(i);
      }
      return [...porY.entries()]
        .sort((a, b) => b[0] - a[0])                 // de cima para baixo
        .map(([, itens]) => itens.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")
          .replace(/\s{2,}/g, " ").trim())
        .filter(Boolean).join("\n");
    };

    fluxo.push(emLinhas(itens));
    esquerda.push(emLinhas(itens.filter((i) => i.x < corte)));
    direita.push(emLinhas(itens.filter((i) => i.x >= corte * 0.96)));
  }
  return [fluxo.join("\n"), esquerda.join("\n"), direita.join("\n")];
}

/**
 * Liga o arrastar-e-soltar na JANELA INTEIRA.
 *
 * 🔴 22/09/2026 -- ELE TENTOU ARRASTAR E NAO FUNCIONOU. A caixa tracejada
 * tinha 924x133px, uma faixa fina, e fora dela o `dragover` do documento nao
 * impedia o padrao: o navegador ABRIA o PDF numa aba e a pessoa saia da
 * pagina. Parecia que nada acontecia.
 *
 * O modo de falhar era pior que o defeito: silencioso, e tirando a pessoa do
 * lugar. Numa area de soltar, o alvo tem de ser a janela toda, e o padrao do
 * navegador tem de morrer no DOCUMENTO, nao so no retangulo bonito.
 */
export function ligarArrastar({ aoSoltar, aoAcender }) {
  if (document.body.dataset.arrastarLigado) return;
  document.body.dataset.arrastarLigado = "1";

  let dentro = 0;
  const temArquivo = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  const acender = (lig) => {
    document.body.classList.toggle("arrastando-arquivo", lig);
    if (aoAcender) aoAcender(lig);
  };

  // preventDefault no dragover do DOCUMENTO e o que impede o navegador de
  // abrir o arquivo. Sem esta linha, nada mais aqui importa.
  document.addEventListener("dragover", (e) => {
    if (!temArquivo(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });

  document.addEventListener("dragenter", (e) => {
    if (!temArquivo(e)) return;
    e.preventDefault(); dentro++; acender(true);
  });

  // `dragleave` dispara tambem ao passar de um filho para outro, entao contar
  // entradas e saidas evita a tela piscar durante o percurso.
  document.addEventListener("dragleave", (e) => {
    if (!temArquivo(e)) return;
    dentro = Math.max(0, dentro - 1);
    if (dentro === 0) acender(false);
  });

  document.addEventListener("drop", (e) => {
    if (!temArquivo(e)) return;
    e.preventDefault(); dentro = 0; acender(false);
    aoSoltar(e.dataTransfer?.files?.[0] || null);
  });
}
