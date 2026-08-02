/* ═══════════════════════════════════════════════════════════════════════════
   ICONES DO ASTRAL
   ═══════════════════════════════════════════════════════════════════════════
   Substitui os 121 emojis que o site usava como icone (bloco V3 do design).

   POR QUE EMOJI NAO SERVE COMO ICONE:
   - muda de desenho conforme o aparelho -- o mesmo 🔥 e um no iPhone, outro no
     Android, outro no Windows. O produto nunca tem a mesma cara duas vezes.
   - nao herda a cor do texto: fica colorido no meio de uma paleta fechada, o
     que estraga a direcao visual inteira.
   - tamanho e alinhamento variam por fonte do sistema.
   - e o sinal mais reconhecivel de "feito as pressas".

   COMO ESTES FUNCIONAM:
   - SVG de traco, 24x24, `currentColor` -- ficam da cor do texto ao redor,
     entao respeitam a paleta sozinhos.
   - mesmo desenho em qualquer aparelho.
   - nada de biblioteca externa: sao poucos bytes e nao dependem de CDN.
   - o traco de 1.75 combina com a Archivo em peso; 2 fica pesado ao lado dela.

   USO:
     import { icone } from './assets/js/icones.js';
     elemento.innerHTML = icone('chama');            // 20px, padrao
     elemento.innerHTML = icone('medalha', 32);      // tamanho em px
     elemento.innerHTML = icone('alvo', 20, 'var(--latao-c)');

   Icone que nao existe devolve um losango neutro em vez de quebrar a tela --
   pagina meio montada e pior que icone generico.
   ═══════════════════════════════════════════════════════════════════════════ */

const D = {
  // ── estado e progresso ──
  chama:      '<path d="M12 22c4 0 7-2.5 7-6.5 0-4-3-6-4-8.5-1.5 1.5-1 3.5-2 4.5-1-1.5-1-3.5-3-5-1 3.5-5 5.5-5 9C5 19.5 8 22 12 22z"/>',
  raio:       '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  alvo:       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  grafico:    '<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="10"/>',
  subindo:    '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  relogio:    '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  ampulheta:  '<path d="M7 3h10M7 21h10M8 3v3.5c0 2 4 3.5 4 5.5s-4 3.5-4 5.5V21M16 3v3.5c0 2-4 3.5-4 5.5s4 3.5 4 5.5V21"/>',

  // ── conquista e patente ──
  medalha:    '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 22l5-2.8L17 22l-1.5-8.5"/>',
  estrela:    '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.95 6.75 19.7l1-5.85L3.5 9.7l5.9-.9L12 3.5z"/>',
  trofeu:     '<path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4"/><line x1="12" y1="14" x2="12" y2="18"/><path d="M8.5 21h7"/>',
  divisa:     '<polyline points="4 8 12 14 20 8"/><polyline points="4 14 12 20 20 14"/>',
  escudo:     '<path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9.5-4.8-1.3-8-5-8-9.5V6l8-3z"/>',

  // ── materias e especialidades ──
  espada:     '<path d="M20.5 3.5 12 12l-1.5 3.5L14 14l8.5-8.5z" transform="translate(-1)"/><path d="M9.5 14.5 4 20"/><path d="M6 17l1 1"/><path d="M13 11 8 6H4v4l5 5"/>',
  engrenagem: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"/>',
  frasco:     '<path d="M10 3v6.2L4.6 18.5A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.7-3L14 9.2V3"/><line x1="9" y1="3" x2="15" y2="3"/><line x1="7.4" y1="15" x2="16.6" y2="15"/>',
  saude:      '<path d="M4.5 4.5v5a5.5 5.5 0 0 0 11 0v-5"/><path d="M3 4.5h3M14 4.5h3"/><path d="M10 15v1.5a4 4 0 0 0 8 0V15"/><circle cx="18" cy="13.5" r="2"/>',
  pergaminho: '<path d="M6 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6"/><path d="M4 6a2 2 0 0 1 2-2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
  bussola:    '<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5"/>',
  globo:      '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  balanca:    '<line x1="12" y1="3" x2="12" y2="21"/><line x1="6" y1="21" x2="18" y2="21"/><line x1="5" y1="7" x2="19" y2="7"/><path d="M5 7 2.5 13h5L5 7z"/><path d="M19 7l-2.5 6h5L19 7z"/>',
  instituicao:'<line x1="3" y1="21" x2="21" y2="21"/><polyline points="3 9 12 3.5 21 9"/><line x1="6" y1="9" x2="6" y2="18"/><line x1="10" y1="9" x2="10" y2="18"/><line x1="14" y1="9" x2="14" y2="18"/><line x1="18" y1="9" x2="18" y2="18"/>',
  terminal:   '<rect x="2.5" y="4" width="19" height="16" rx="2"/><polyline points="7 9 10 12 7 15"/><line x1="12.5" y1="15" x2="17" y2="15"/>',
  estrategia: '<path d="M9 21h6"/><path d="M12 21v-4"/><path d="M8.5 17h7l-1-3.5H9.5L8.5 17z"/><circle cx="12" cy="7" r="3"/><path d="M9.6 9.3 8.8 13h6.4l-.8-3.7"/>',
  livro:      '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/>',
  corrida:    '<circle cx="15" cy="4.5" r="2"/><path d="M13.5 21l-1.5-5.5L9 13l1.5-5 4 2 2 3"/><path d="M10.5 8 6 9.5"/><path d="M9 13l-3 3-1 5"/>',

  // ── acoes e avisos ──
  aviso:      '<path d="M12 3.5 2.8 19.5h18.4L12 3.5z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r=".9" fill="currentColor"/>',
  cadeado:    '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  chave:      '<path d="M14.5 6.5a4.5 4.5 0 1 1-3.9 6.7L4 20l-1.5-1.5 6.8-6.6a4.5 4.5 0 0 1 5.2-5.4z"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/>',
  ideia:      '<path d="M9.2 17.5a6.5 6.5 0 1 1 5.6 0"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="10.5" y1="22.5" x2="13.5" y2="22.5"/>',
  marcador:   '<path d="M6 3h12v18l-6-4.5L6 21V3z"/>',
  prancheta:  '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/>',
  documento:  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>',
  ia:         '<rect x="4" y="7" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor"/><circle cx="15" cy="13" r="1.3" fill="currentColor"/><line x1="12" y1="3" x2="12" y2="7"/><circle cx="12" cy="2.5" r="1.2"/>',
  foguete:    '<path d="M12 2c3.5 2.5 5 6 5 10l-2.5 4h-5L7 12c0-4 1.5-7.5 5-10z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M9.5 16.5 8 21l3-1.5 3 1.5-1.5-4.5"/>',
  certo:      '<polyline points="4.5 12.5 9.5 17.5 19.5 6.5"/>',
  errado:     '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  duvida:     '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 4"/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>',
  gelo:       '<line x1="12" y1="3" x2="12" y2="21"/><line x1="4.2" y1="7.5" x2="19.8" y2="16.5"/><line x1="4.2" y1="16.5" x2="19.8" y2="7.5"/><path d="M12 6.5 9.5 4M12 6.5 14.5 4M12 17.5 9.5 20M12 17.5l2.5 2.5"/>',
  lapis:      '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z"/><line x1="14.5" y1="5.5" x2="17.5" y2="8.5"/>',
  carta:      '<rect x="2.5" y="5" width="19" height="14" rx="2"/><polyline points="3 6.5 12 13 21 6.5"/>',
  olho:       '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  tocar:      '<polygon points="7 4.5 19 12 7 19.5"/>',
  pasta:      '<path d="M3 6.5A2 2 0 0 1 5 4.5h4l2 2.5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5z"/>',
  trevo:      '<path d="M12 12c-1.6-2.4-5.5-2.3-5.5.6 0 1.8 2 2.9 5.5 1.9M12 12c1.6-2.4 5.5-2.3 5.5.6 0 1.8-2 2.9-5.5 1.9M12 12c-2.4-1.6-2.3-5.5.6-5.5 1.8 0 2.9 2 1.9 5.5"/><path d="M12 14.5V21"/>',
  sorriso:    '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><circle cx="9.2" cy="10" r=".9" fill="currentColor"/><circle cx="14.8" cy="10" r=".9" fill="currentColor"/>',
};

const RESERVA = '<path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5z"/>';

/** Devolve o SVG do icone como texto. Tamanho em px. */
export function icone(nome, tamanho = 20, cor = 'currentColor') {
  const corpo = D[nome] || RESERVA;
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" `
       + `stroke="${cor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" `
       + `aria-hidden="true" focusable="false" style="flex-shrink:0;vertical-align:-.15em">`
       + `${corpo}</svg>`;
}

/** Troca todo <i data-icone="chama"></i> da pagina pelo SVG correspondente.
    Serve para o HTML estatico, sem precisar mexer no JS de cada pagina. */
export function aplicarIcones(raiz = document) {
  raiz.querySelectorAll('[data-icone]').forEach((el) => {
    const t = parseInt(el.getAttribute('data-tam') || '20', 10);
    el.innerHTML = icone(el.getAttribute('data-icone'), t);
  });
}

export const NOMES = Object.keys(D);

/* Roda sozinho ao carregar. Sem isto o modulo entra na pagina, exporta a
   funcao e ninguem a chama -- as marcas <i data-icone> ficam vazias e o icone
   simplesmente nao aparece. Foi o que o teste pegou em index, criar-conta e
   cadastro: 7 marcas vazias. */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => aplicarIcones());
} else {
  aplicarIcones();
}
