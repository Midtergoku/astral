// DEPOIMENTOS -- "Quem passou estudando com o Astral", na pagina inicial (10/10/2026, guardado 2)
//
// Busca depoimentos_publicos() (servidor): so o que a pessoa AUTORIZOU no "Passei!" -- o texto e o primeiro nome --
// e so quando ha 3 ou mais. Sem isso a lista vem vazia e a secao continua escondida: a pagina nunca mostra
// "nenhum depoimento ainda".
//
// Sem o supabase-js de proposito: a pagina inicial e a 1a impressao de quem chega pelo WhatsApp, e a biblioteca
// (73 KB) so para uma leitura publica seria peso a toa. O endereco e a chave PUBLICA sao os mesmos do
// assets/js/astral.js -- o tools/testa-depoimentos.js falha se divergirem.
//
// O texto e de quem escreveu: entra por textContent, NUNCA como HTML.
export const SUPABASE_URL = 'https://jjogmcacbdefwiwcyjxp.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_n-PClIEGglZWhoEySjB8PA_z7KEgHfJ';

async function mostrarDepoimentos() {
  const secao = document.getElementById('depoimentos');
  const grade = document.getElementById('dep-grade');
  if (!secao || !grade) return;
  let lista = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/depoimentos_publicos`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!r.ok) return;
    lista = await r.json();
  } catch { return; }   // sem rede: a secao simplesmente nao aparece
  if (!Array.isArray(lista) || lista.length < 3) return;
  for (const d of lista) {
    const cartao = document.createElement('figure');
    cartao.className = 'dep-cartao';
    const texto = document.createElement('blockquote');
    texto.textContent = String(d.depoimento || '');
    const quem = document.createElement('figcaption');
    quem.textContent = `${String(d.nome || 'Aluno')}, aprovado(a)`;
    cartao.append(texto, quem);
    grade.append(cartao);
  }
  secao.hidden = false;
}

if (typeof document !== 'undefined') mostrarDepoimentos();
