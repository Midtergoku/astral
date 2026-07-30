/* Transicao suave entre paginas.
   Intercepta links internos, aplica a classe .saindo no body e navega
   apos a animacao. Compartilhado por todas as paginas do app.
   O CSS correspondente (.saindo) vive em assets/css/app.css. */

// Transição suave entre páginas
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('javascript')) return;
    link.addEventListener('click', function(e) {
      e.preventDefault();
      document.body.classList.add('saindo');
      setTimeout(() => { window.location.href = href; }, 230);
    });
  });
