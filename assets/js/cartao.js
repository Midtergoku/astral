/* ═══════════════════════════════════════════════════════════════════════════
   O CARTAO DA DIVISA -- uma imagem para os stories  (item 10, 30/09/2026)

   Pedido dele: "um cartao compartilhavel da divisa/patente (ex.: 'Subtenente
   BM · Orador de Guerra') para stories". Aprovado no mesmo dia.

   Desenhado NO NAVEGADOR, num <canvas> de 1080x1920 (o formato do story):
   - custo zero, nenhum servidor envolvido;
   - nada sai do aparelho ate a pessoa apertar "Compartilhar" -- e ela ve a
     imagem antes;
   - texto vindo do edital (nome de materia que virou tag) e desenhado como
     TEXTO no canvas, nunca como HTML: nao ha onde injetar nada.

   As cores saem dos tokens do base.css (lidos na hora), com o valor do token
   como reserva -- mudar a paleta muda o cartao junto.

   So o PRIMEIRO nome vai para a imagem. O resto do nome e o e-mail nunca.
*/

const L = 1080, A = 1920;

function token(nome, reserva) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return v || reserva;
  } catch { return reserva; }
}

/* Quebra o texto em linhas que cabem na largura. */
function linhas(ctx, texto, largura) {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const saida = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else { saida.push(atual); atual = p; }
  }
  if (atual) saida.push(atual);
  return saida;
}

/* A insignia: tres divisas (os "V" do galao), em latao. */
function insignia(ctx, cx, cy, tam, latao, lataoC) {
  const g = ctx.createLinearGradient(cx - tam, cy - tam, cx + tam, cy + tam);
  g.addColorStop(0, lataoC);
  g.addColorStop(1, latao);
  ctx.save();
  ctx.fillStyle = g;
  const passo = tam * 0.42;
  for (let i = 0; i < 3; i++) {
    const y = cy - tam * 0.55 + i * passo;
    ctx.beginPath();
    ctx.moveTo(cx - tam, y);
    ctx.lineTo(cx, y + tam * 0.5);
    ctx.lineTo(cx + tam, y);
    ctx.lineTo(cx + tam, y + tam * 0.2);
    ctx.lineTo(cx, y + tam * 0.7);
    ctx.lineTo(cx - tam, y + tam * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Desenha o cartao e devolve um Blob PNG.
 * @param d { patente, tag, forca, nome, xp, sequencia, condecoracoes, totalCondecoracoes }
 */
export async function desenharCartao(d = {}) {
  const cor = {
    breu: token('--breu', '#0E1620'), casco: token('--casco', '#17222E'), linha: token('--linha', '#2A3947'),
    latao: token('--latao', '#C08A2E'), lataoC: token('--latao-c', '#E0AE55'),
    papel: token('--papel', '#E7E4DB'), texto2: token('--texto-2', '#8FA0AE'), texto3: token('--texto-3', '#7A8C9F'),
  };
  // As fontes do site precisam estar prontas, senao o canvas desenha na reserva.
  try {
    await Promise.all(['800 90px Archivo', '600 40px Archivo', '500 44px "JetBrains Mono"', '400 40px "Source Serif 4"']
      .map((f) => document.fonts.load(f)));
  } catch { /* sem a fonte, desenha na reserva -- o cartao sai assim mesmo */ }

  const c = document.createElement('canvas');
  c.width = L; c.height = A;
  const ctx = c.getContext('2d');

  // Fundo: breu, com o reticulado discreto do Quadro.
  ctx.fillStyle = cor.breu; ctx.fillRect(0, 0, L, A);
  ctx.strokeStyle = cor.linha; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
  for (let x = 0; x <= L; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, A); ctx.stroke(); }
  for (let y = 0; y <= A; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = cor.latao; ctx.fillRect(0, 0, L, 10);

  // Marca
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = cor.papel;
  ctx.font = '800 56px Archivo, Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Astral', 90, 170);
  ctx.fillStyle = cor.texto3;
  ctx.font = '500 30px "JetBrains Mono", monospace';
  ctx.fillText('CAMPANHA DE ESTUDO', 90, 220);

  // Insignia
  insignia(ctx, L / 2, 560, 170, cor.latao, cor.lataoC);

  // Patente (grande, pode quebrar em duas linhas)
  ctx.textAlign = 'center';
  ctx.fillStyle = cor.papel;
  ctx.font = '800 104px Archivo, Arial';
  let y = 930;
  for (const l of linhas(ctx, String(d.patente || 'Recruta').toUpperCase(), L - 160).slice(0, 2)) {
    ctx.fillText(l, L / 2, y); y += 118;
  }

  // Tag
  if (d.tag) {
    ctx.fillStyle = cor.lataoC;
    ctx.font = '500 52px "JetBrains Mono", monospace';
    for (const l of linhas(ctx, String(d.tag).toUpperCase(), L - 200).slice(0, 2)) {
      ctx.fillText(l, L / 2, y + 10); y += 64;
    }
    y += 10;
  }

  // Forca
  if (d.forca) {
    ctx.fillStyle = cor.texto2;
    ctx.font = '600 40px Archivo, Arial';
    ctx.fillText(String(d.forca).toUpperCase(), L / 2, y + 40);
  }

  // Os numeros
  const numeros = [
    [d.xp != null ? Number(d.xp).toLocaleString('pt-BR') : '—', 'XP'],
    [d.sequencia != null ? String(d.sequencia) : '—', d.sequencia === 1 ? 'DIA SEGUIDO' : 'DIAS SEGUIDOS'],
    [d.condecoracoes != null ? `${d.condecoracoes}/${d.totalCondecoracoes ?? '?'}` : '—', 'CONDECORAÇÕES'],
  ];
  const yN = 1460, larg = (L - 180) / 3;
  numeros.forEach(([valor, rotulo], i) => {
    const cx = 90 + larg * i + larg / 2;
    ctx.fillStyle = cor.casco; ctx.fillRect(90 + larg * i + 8, yN - 110, larg - 16, 190);
    ctx.fillStyle = cor.papel; ctx.font = '800 64px Archivo, Arial';
    ctx.fillText(valor, cx, yN);
    ctx.fillStyle = cor.texto3; ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillText(rotulo, cx, yN + 50);
  });

  // Nome e rodape
  if (d.nome) {
    ctx.fillStyle = cor.texto2;
    ctx.font = '400 44px "Source Serif 4", Georgia, serif';
    ctx.fillText(String(d.nome).split(/\s+/)[0].slice(0, 30), L / 2, 1710);
  }
  ctx.fillStyle = cor.lataoC;
  ctx.font = '500 30px "JetBrains Mono", monospace';
  ctx.fillText('astral-psi.vercel.app', L / 2, 1820);

  return await new Promise((ok) => c.toBlob(ok, 'image/png'));
}

/**
 * Mostra a imagem e oferece compartilhar (celular) ou baixar (computador).
 * A pessoa ve exatamente o que vai sair antes de qualquer coisa sair.
 */
export async function abrirCartao(dados) {
  const blob = await desenharCartao(dados);
  if (!blob) throw new Error('Não consegui montar a imagem.');
  const url = URL.createObjectURL(blob);
  const arquivo = new File([blob], 'minha-divisa-astral.png', { type: 'image/png' });
  const podeCompartilhar = !!(navigator.canShare && navigator.canShare({ files: [arquivo] }));

  const fundo = document.createElement('div');
  fundo.className = 'cartao-fundo';
  fundo.setAttribute('role', 'dialog');
  fundo.setAttribute('aria-label', 'Sua divisa para compartilhar');
  fundo.innerHTML = `
    <div class="cartao-caixa">
      <img class="cartao-img" alt="Prévia do cartão da sua divisa">
      <div class="cartao-acoes">
        ${podeCompartilhar ? '<button type="button" class="cartao-btn primario" data-c="compartilhar">Compartilhar</button>' : ''}
        <a class="cartao-btn${podeCompartilhar ? '' : ' primario'}" data-c="baixar" download="minha-divisa-astral.png">Baixar imagem</a>
        <button type="button" class="cartao-btn" data-c="fechar">Fechar</button>
      </div>
    </div>`;
  fundo.querySelector('.cartao-img').src = url;
  fundo.querySelector('[data-c="baixar"]').href = url;

  const fechar = () => { fundo.remove(); URL.revokeObjectURL(url); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', esc);
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  fundo.querySelector('[data-c="fechar"]').addEventListener('click', fechar);
  fundo.querySelector('[data-c="compartilhar"]')?.addEventListener('click', async () => {
    try { await navigator.share({ files: [arquivo], title: 'Minha divisa no Astral' }); }
    catch { /* cancelou o compartilhamento: nada a fazer */ }
  });

  if (!document.getElementById('cartao-estilo')) {
    const st = document.createElement('style');
    st.id = 'cartao-estilo';
    st.textContent = `
      .cartao-fundo { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center;
        background: color-mix(in srgb, var(--breu) 82%, transparent); padding: 1rem; }
      .cartao-caixa { display: grid; gap: var(--e3); justify-items: center; max-height: 100%; }
      .cartao-img { max-height: min(70vh, 640px); max-width: 100%; border-radius: var(--r-g);
        border: 1px solid var(--linha); }
      .cartao-acoes { display: flex; gap: var(--e2); flex-wrap: wrap; justify-content: center; }
      .cartao-btn { font-family: var(--display); font-weight: 700; font-size: var(--t-sm);
        padding: .7rem 1.1rem; border-radius: var(--r-p); border: 1px solid var(--linha);
        background: var(--casco); color: var(--texto); cursor: pointer; text-decoration: none; min-height: 44px;
        display: inline-flex; align-items: center; }
      .cartao-btn.primario { background: var(--latao); color: var(--breu); border-color: var(--latao); }`;
    document.head.appendChild(st);
  }
  document.body.appendChild(fundo);
  fundo.querySelector('.cartao-btn').focus();
}
