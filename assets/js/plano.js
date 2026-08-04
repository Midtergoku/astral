/* ═══════════════════════════════════════════════════════════════════════════
   PLANO — o que fazer depois que a IA lê o edital.

   Duas coisas moram aqui porque as duas nascem do mesmo momento: a pessoa
   subiu o edital e o Astral precisa devolver um plano de estudo pronto.

     1. montarCronograma()  quanto tempo dar a cada matéria
     2. gerarGuiaCompleto() os professores de TODAS as matérias, de uma vez

   Ficam num arquivo só, compartilhado, porque `edital.html` e `dashboard.html`
   fazem exatamente o mesmo trabalho. Antes eram duas cópias -- e cópia
   diverge, é a quinta vez que isso aparece neste projeto.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ O import do astral.js é DINÂMICO, dentro de gerarGuiaCompleto().
   Motivo: as contas deste arquivo (necessidadeDe, montarCronograma) são
   matemática pura e precisam ser testáveis fora do navegador. Um import no
   topo arrastaria o supabase-js junto, que precisa de `window` e `localStorage`
   e derrubaria qualquer teste em Node.
   Assim `node tools/testa-plano.js` roda a lógica de verdade, sem navegador. */

/* ═══ 1. O CRONOGRAMA ═══════════════════════════════════════════════════════

   A REGRA, em uma linha:  necessidade = peso × (100 − progresso)

   O Lucas descreveu duas coisas que parecem separadas e são a mesma:

   "as matérias que valem mais ponto são as que a pessoa vai estudar mais"
       -> no começo todo progresso é 0, então necessidade = peso × 100.
          A ordem sai exatamente pelo peso. É o que ele pediu.

   "se ela vai muito bem numa matéria de peso alto, não tem por que ajudar
    tanto ela; e sim a outra em que é muito ruim"
       -> conforme o progresso sobe, o (100 − progresso) derruba a
          necessidade daquela matéria sozinho. Uma matéria de peso 20 já 90%
          dominada (necessidade 200) perde para uma de peso 8 ainda em 10%
          (necessidade 720). É exatamente o que ele descreveu.

   ⚠️ O QUE ISTO SUBSTITUIU, e por quê:
   antes era `materias.slice(0, 3)` -- as três de maior peso, para sempre. Uma
   matéria de peso baixo NUNCA aparecia no cronograma, nem que a pessoa
   estivesse zerada nela. E o rebalanceamento comparava o progresso com
   `100 / número de matérias`, o que não quer dizer nada: com 8 matérias,
   qualquer uma acima de 12,5% era declarada "adiantada" e mandada desacelerar.

   Não é IA -- é conta. E é de propósito: instantânea, de graça, e a IA não
   saberia o progresso da pessoa melhor que os números dela. */

export function necessidadeDe(materia) {
  const peso = Number(materia?.peso) || 0;
  const progresso = Math.min(100, Math.max(0, Number(materia?.progresso) || 0));
  return peso * (100 - progresso);
}

/**
 * Monta as sessões do dia.
 *
 * @param materias  do edital, com peso e progresso
 * @param quantas   quantas sessões cabem no dia (3 é o padrão da tela)
 * @param minutos   quanto tempo total distribuir (120 = 2h)
 */
export function montarCronograma(materias = [], { quantas = 3, minutos = 120 } = {}) {
  const vivas = (materias || []).filter((m) => m && m.nome);
  if (!vivas.length) return [];

  /* Matéria já 100% dominada sai da fila -- necessidade zero. Se TODAS
     estiverem zeradas de necessidade (a pessoa terminou tudo), volta a lista
     por peso, senão a tela ficaria vazia e pareceria defeito. */
  const comNecessidade = vivas
    .map((m) => ({ m, n: necessidadeDe(m) }))
    .sort((a, b) => b.n - a.n);

  const usaveis = comNecessidade.some((x) => x.n > 0)
    ? comNecessidade.filter((x) => x.n > 0)
    : vivas.map((m) => ({ m, n: Number(m.peso) || 1 })).sort((a, b) => b.n - a.n);

  const escolhidas = usaveis.slice(0, Math.max(1, quantas));
  const somaN = escolhidas.reduce((s, x) => s + x.n, 0) || 1;

  return escolhidas.map((x) => {
    /* O tempo é a fatia da necessidade dela no total do dia.
       Piso de 20 minutos: sessão menor que isso não é sessão de estudo. */
    const fatia = x.n / somaN;
    const tempo = Math.max(20, Math.round((minutos * fatia) / 5) * 5);   // múltiplo de 5
    return {
      materia: x.m.nome,
      tempo,
      // XP acompanha o esforço, não o peso: quem estuda a matéria difícil e
      // esquecida merece o mesmo reconhecimento de quem estuda a pesada.
      xp: Math.max(10, Math.round(tempo / 2)),
      feito: false,
    };
  });
}

/* ═══ 2. OS PROFESSORES ═════════════════════════════════════════════════════

   Ordem do Lucas em 04/08/2026: *"o edital gerou, leu as matérias, leu o maior
   peso (...) e vai gerar lá os professores, um guia direto pra eles"*.

   Antes: a pessoa tinha de ir na tela de Recursos e pedir, uma matéria por
   vez. A maioria nunca ia -- 0 buscas em toda a história do produto.

   Agora sai junto com o edital, tudo de uma vez, e fica salvo para sempre.

   TRÊS DECISÕES QUE IMPORTAM:

   1. Uma matéria por vez, em fila -- não todas em paralelo. Oito chamadas
      simultâneas à IA estouram limite de taxa e o erro cai no colo do usuário
      justo no primeiro minuto dele no produto.

   2. Falha em uma matéria NÃO derruba as outras. Cada uma é independente; o
      que der certo é salvo. Guia com 6 de 8 matérias serve; tela de erro não.

   3. Pula o que já está salvo. `recursos_salvos` é permanente -- repetir
      gastaria crédito para reescrever a mesma coisa. */

export async function gerarGuiaCompleto(uid, concurso, materias, aoAndar) {
  const lista = (materias || []).map((m) => (typeof m === 'string' ? m : m?.nome)).filter(Boolean);
  const resultado = { feitas: [], puladas: [], falharam: [] };
  if (!uid || !concurso || !lista.length) return resultado;

  const { chamarIA, supabase } = await import('./astral.js');

  /* O que já existe para este concurso não é buscado de novo. */
  let jaTem = new Set();
  try {
    const { data } = await supabase
      .from('recursos_salvos').select('materia, concurso').eq('usuario_id', uid);
    jaTem = new Set((data || []).filter((r) => r.concurso === concurso).map((r) => r.materia));
  } catch (e) {
    // Sem essa consulta o pior que acontece é buscar de novo algo que já
    // existe. Custa crédito, mas não quebra nada -- então segue.
    console.error('Nao consegui ver o que ja estava salvo:', e);
  }

  for (let i = 0; i < lista.length; i++) {
    const materia = lista[i];
    if (typeof aoAndar === 'function') {
      try { aoAndar({ i: i + 1, total: lista.length, materia }); } catch { /* a tela não pode derrubar a busca */ }
    }

    if (jaTem.has(materia)) { resultado.puladas.push(materia); continue; }

    try {
      const dados = await chamarIA('buscar-recursos', { materia, concurso });
      const { error } = await supabase.from('recursos_salvos').upsert({
        usuario_id: uid, materia, concurso, dados,
      }, { onConflict: 'usuario_id,materia' });
      if (error) throw error;
      resultado.feitas.push(materia);
    } catch (e) {
      /* Quota estourada é o caso mais provável e não vale insistir nas
         próximas: elas falhariam igual, e cada tentativa ainda custa. */
      const msg = String(e?.message || '');
      resultado.falharam.push({ materia, erro: msg });
      if (/quota|limite|429/i.test(msg)) {
        for (let j = i + 1; j < lista.length; j++) {
          resultado.falharam.push({ materia: lista[j], erro: 'nao tentada: limite do dia atingido' });
        }
        break;
      }
    }
  }

  return resultado;
}

/* ═══ 3. A RESSALVA ═════════════════════════════════════════════════════════

   Pedido do Lucas em 04/08/2026, com as palavras dele: *"assim como temos os
   termos de responsabilidade, quero que deixe um lembrete: olha, se você
   quiser seguir por outros professores ok, mas indicamos esses baseados em
   tal coisa"*.

   Existe por honestidade, não por burocracia. A lista vem de uma IA que fez
   uma busca na web -- não é curadoria de especialista, não é ranking oficial,
   e ninguém aqui recebe para indicar ninguém. Dizer isso em voz alta é o que
   separa recomendação de propaganda disfarçada.

   Fica AQUI, num lugar só, e não copiado em cada tela: texto duplicado
   diverge, e um aviso legal que diverge é pior que aviso nenhum. */

export const RESSALVA_PROFESSORES =
  'Como montamos esta lista: a IA pesquisou na internet professores e materiais '
  + 'de cada matéria do seu edital, priorizando conteúdo gratuito e canais com boa '
  + 'reputação entre concurseiros. É uma sugestão de ponto de partida, não uma '
  + 'classificação oficial — o Astral não recebe nada de nenhum professor, canal ou '
  + 'curso para indicá-los. Se você já estuda com outro professor e se dá bem, '
  + 'continue: o que funciona para você vale mais que qualquer lista.';

export function ressalvaHTML() {
  return '<div class="ressalva-professores" role="note">'
       + '<strong>Sobre estas indicações</strong>'
       + '<p>' + RESSALVA_PROFESSORES + '</p>'
       + '</div>';
}
