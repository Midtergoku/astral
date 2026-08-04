/* Duble do astral.js, so para teste. Finge uma sessao e um banco LENTO
   (800ms), para dar para ver a olho se a tela espera ou nao espera.
   Conta cada leitura da tabela progresso, que e como se prova a carona. */

export const SUPABASE_URL = 'https://exemplo.invalido';
export const SUPABASE_KEY = 'chave-de-teste';

const ATRASO = 800;
window.__LEITURAS = 0;
window.__LINHA = {
  usuario_id: 'u-teste', xp: 4200, streak: 3, horas: 12,
  materias: [{ nome: 'Portugues' }], cronograma_hoje: [], edital: 'PMERJ',
  badges: [], tag_escolhida: null,
};

export const supabase = {
  auth: {
    getSession: async () => ({
      data: { session: { user: { id: 'u-teste', email: 'lucas@exemplo.com',
                                 user_metadata: { full_name: 'Lucas Herdy Silva' } } } },
      error: null,
    }),
  },
  from() {
    const req = {
      select: () => req,
      eq: () => req,
      limit: () => req,
      gte: () => req,
      order: () => req,
      maybeSingle: async () => {
        window.__LEITURAS++;
        await new Promise((r) => setTimeout(r, ATRASO));
        return { data: window.__LINHA, error: null };
      },
      insert: async () => ({ data: null, error: null }),
      upsert: async () => ({ error: null }),
    };
    return req;
  },
};

export const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const att = esc;
export const urlSegura = (u) => (/^https?:/i.test(u) ? u : '#');
export const toast = () => {};
export async function exigirSessao() { return { user: { id: 'u-teste' } }; }
