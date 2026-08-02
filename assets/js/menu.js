/* ═══════════════════════════════════════════════════════════════════════════
   C3 — BARRA LATERAL RECOLHIVEL
   ═══════════════════════════════════════════════════════════════════════════
   Referencias escolhidas pelo Lucas no 21st.dev: "dashboard-with-collapsible-
   sidebar" (uniquesonu) e "sidebar" (manuarora700). Nenhuma entregou codigo --
   o 21st.dev guarda o fonte, e o que ha la e React. Aqui esta a tecnica.

   O CSS vive em assets/css/base.css. Este arquivo faz tres coisas:

   1. CRIA o botao de recolher nas 11 paginas, sem editar 11 arquivos.
   2. LEMBRA a escolha entre paginas e entre sessoes. Recolher e uma
      preferencia, nao um acidente: se a barra voltasse a abrir a cada clique
      no menu, recolher nao serviria para nada.
   3. COPIA o texto de cada link para `data-dica`, que vira a etiqueta ao
      passar o mouse quando so ha icone. Sem isso, recolher trocaria espaco
      por confusao -- e isso e um mau negocio.

   A preferencia e aplicada ANTES da primeira pintura (ver o topo do arquivo):
   se fosse depois, a barra abriria larga e encolheria na frente da pessoa a
   cada carregamento. Piscada de layout e pior que nao ter o recurso.
   ═══════════════════════════════════════════════════════════════════════════ */

const CHAVE = 'astral_menu_recolhido';

/* Aplicado imediatamente, fora de qualquer espera. */
function aplicar(recolhido) {
  document.body.dataset.menu = recolhido ? 'recolhido' : 'aberto';
}

function lembrado() {
  try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; }
}

function guardar(recolhido) {
  try { localStorage.setItem(CHAVE, recolhido ? '1' : '0'); } catch { /* modo restrito */ }
}

const SETA =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<polyline points="15 6 9 12 15 18"/></svg>';

function montar() {
  const barra = document.querySelector('.sidebar');
  if (!barra) return;

  aplicar(lembrado());

  /* a etiqueta de cada link sai do proprio texto -- assim um item novo no
     menu ganha a dica sozinho, sem ninguem lembrar de escrever */
  barra.querySelectorAll('.nav-link').forEach((a) => {
    if (a.dataset.dica) return;
    const txt = (a.textContent || '').trim();
    if (txt) a.dataset.dica = txt;
  });

  if (barra.querySelector('.btn-recolher')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-recolher';
  btn.innerHTML = SETA;
  btn.setAttribute('aria-label', 'Recolher o menu');
  btn.setAttribute('aria-expanded', String(!lembrado()));
  btn.dataset.pronto = '1';        // o botoes.js nao deve mexer neste

  btn.addEventListener('click', () => {
    const novo = document.body.dataset.menu !== 'recolhido';
    aplicar(novo);
    guardar(novo);
    btn.setAttribute('aria-expanded', String(!novo));
    btn.setAttribute('aria-label', novo ? 'Expandir o menu' : 'Recolher o menu');
  });

  /* Vai no rodape da barra, junto do sair: e uma acao sobre a barra, nao um
     item de navegacao. Misturar com os links faria parecer mais uma pagina. */
  const rodape = barra.querySelector('.sidebar-bottom') || barra;
  rodape.insertBefore(btn, rodape.firstChild);
}

if (typeof document !== 'undefined') {
  // a preferencia entra ANTES da pintura, para a barra nao piscar larga
  try { if (localStorage.getItem(CHAVE) === '1') document.documentElement.dataset.menuInicial = '1'; }
  catch { /* segue */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
}

export { montar, aplicar };
