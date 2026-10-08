/* REGRAS DE INTERFACE -- a parte das "Web Interface Guidelines" da Vercel que vale para o Astral
   e que da para MEDIR na tela (08/10/2026, roadmap 3.10b; skill web-interface-guidelines).

   Roda DENTRO da pagina (pg.evaluate), pelo testa-acessivel, que ja abre as 24 paginas logado.
   Ficaram de fora, de proposito, as regras que nao cabem aqui: as de React (hidratacao, useState,
   virtualizacao), "Title Case" (e convencao do ingles) e as de video/GIF (o site nao tem).

   Cada regra devolve uma lista de { regra, onde }. Vazio = passou. */
module.exports.regrasDeInterface = function regrasDeInterface() {
  const out = [];
  const anota = (regra, el, extra = "") => {
    const t = el && el.tagName ? `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList && el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : ""} "${(el.innerText || el.getAttribute?.("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 30)}"` : String(el);
    out.push({ regra, onde: (t + " " + extra).trim() });
  };
  const visivel = (el) => {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return false;
    return !el.closest("[hidden],[aria-hidden=true],dialog:not([open])");
  };
  const INTERATIVO = "a[href],button,input,select,textarea,summary,label,option,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=menuitem],[tabindex]";

  // 1. "<div> ou <span> com clique (deveria ser <button>)": algo com cara de clicavel que o teclado nao alcanca
  for (const el of document.querySelectorAll("body *")) {
    if (!visivel(el) || el.matches(INTERATIVO) || el.closest("a[href],button,label,summary,[role=button]")) continue;
    if (getComputedStyle(el).cursor !== "pointer") continue;
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === "pointer" && !el.parentElement.matches(INTERATIVO)) continue;   // conta so o de fora
    // cartao clicavel com um link/botao de verdade dentro: o clique no cartao e atalho do mouse, o
    // teclado chega pelo link (o "Ver tudo ->" do painel, 08/10)
    if (el.querySelector("a[href],button")) continue;
    anota("clique-sem-botao", el, "(cursor de mao, mas o teclado nao chega nele)");
  }

  // 2. foco invisivel: outline removido sem um :focus-visible no lugar
  const regras = [];
  const andar = (lista) => { for (const x of lista) { if (x.cssRules && !x.selectorText) { try { andar(x.cssRules); } catch { /* */ } } else if (x.selectorText) regras.push(x); } };
  for (const s of document.styleSheets) { try { andar(s.cssRules); } catch { /* folha de outro dominio */ } }
  const temFocoVisivel = regras.some((r) => /:focus-visible/.test(r.selectorText) && (r.style.outline || r.style.outlineStyle || r.style.boxShadow || r.style.outlineColor));
  const tiramOutline = regras.filter((r) => /^(none|0(px)?)$/.test((r.style.outline || r.style.outlineStyle || "").trim()) && !/::?(-webkit-|-moz-)/.test(r.selectorText));
  if (tiramOutline.length && !temFocoVisivel) for (const r of tiramOutline.slice(0, 8)) anota("foco-invisivel", r.selectorText, "(outline: none e nenhum :focus-visible no lugar)");

  // 3. a regiao principal e os titulos em ordem (o Lighthouse tambem cobra; aqui vale offline)
  if (!document.querySelector("main,[role=main]")) anota("sem-main", "<body>", "(sem <main>: leitor de tela nao pula para o conteudo)");
  let ultimo = 0;
  for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6")) {
    if (!visivel(h)) continue;
    const n = Number(h.tagName[1]);
    if (ultimo && n > ultimo + 1) anota("titulo-pulado", h, `(h${ultimo} -> h${n})`);
    ultimo = n;
  }

  // 4. imagem sem largura e altura declaradas (a pagina pula quando ela chega)
  for (const img of document.querySelectorAll("img")) {
    if (!visivel(img)) continue;
    if (!img.getAttribute("width") || !img.getAttribute("height")) anota("imagem-sem-tamanho", img, img.getAttribute("src")?.slice(0, 40) || "");
    if (!img.hasAttribute("alt")) anota("imagem-sem-alt", img);
  }

  // 5. formularios: autocomplete, tipo certo, corretor desligado em e-mail
  for (const el of document.querySelectorAll("input,select,textarea")) {
    if (!visivel(el) || ["hidden", "submit", "button", "checkbox", "radio", "range", "file", "color"].includes(el.type)) continue;
    if (!el.getAttribute("autocomplete")) anota("campo-sem-autocomplete", el);
    if (/e-?mail/i.test(el.name + el.id + (el.placeholder || "")) && el.type !== "email") anota("email-sem-type-email", el);
    if (el.type === "email" && el.getAttribute("spellcheck") !== "false") anota("email-com-corretor", el);
  }

  // 6. "..." no texto que o aluno le (o certo e a reticencia: …)
  const andarTexto = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = andarTexto.nextNode(); n; n = andarTexto.nextNode()) {
    if (!/\.\.\./.test(n.textContent) || !n.parentElement || !visivel(n.parentElement) || n.parentElement.closest("script,style,code,pre")) continue;
    anota("tres-pontos", n.parentElement, `"${n.textContent.trim().slice(0, 40)}"`);
  }
  for (const el of document.querySelectorAll("[placeholder]")) if (/\.\.\./.test(el.placeholder) && visivel(el)) anota("tres-pontos", el, `placeholder "${el.placeholder}"`);

  // 7. tema escuro de verdade: color-scheme (barra de rolagem e campos nativos escuros) e <select> com cor propria
  if (!/dark/.test(getComputedStyle(document.documentElement).colorScheme || "")) anota("sem-color-scheme-dark", "<html>", "(barra de rolagem e calendario nativo saem claros)");
  for (const sel of document.querySelectorAll("select")) {
    if (!visivel(sel)) continue;
    const bg = getComputedStyle(sel).backgroundColor;
    if (/rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/.test(bg)) anota("select-sem-cor", sel, bg);
  }

  // 8. zoom bloqueado (anti-padrao numero 1 da lista)
  const vp = document.querySelector('meta[name="viewport"]')?.content || "";
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(vp)) anota("zoom-bloqueado", "<meta viewport>", vp);

  return out;
};
