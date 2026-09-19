/* ═══════════════════════════════════════════════════════════════════════════
   AS MISSÕES  (R12)

   Pedido dele em 18/09: "vamos pensar em missões, tanto missões gerais como
   missões diárias, todo bom RPG tem missões diárias".

   ── MISSAO NAO E CONDECORACAO, e a diferenca justifica existirem as duas ───

     CONDECORAÇÃO   olha para TRAS   reconhece o que voce ja fez
     MISSÃO         olha para FRENTE propoe o que fazer agora

   A sala de condecoracoes e uma vitrine que a pessoa visita. A missao vai ate
   ela e diz "hoje, isto". Sao papeis diferentes, e um nao substitui o outro:
   uma lista de 74 medalhas nao responde "o que eu faco nos proximos 25
   minutos", e e essa pergunta que faz alguem abrir o aplicativo num dia ruim.

   ── 🔴 A REGRA QUE NAO SE NEGOCIA ─────────────────────────────────────────
   Ordem dele: "não queremos transformar o site em um cassino". A missao diaria
   e EXATAMENTE onde esse vicio costuma entrar, porque e o lugar natural do
   "entre hoje e ganhe 50 XP".

     ❌ "Entre hoje e ganhe XP"        ✅ "Estude 25 minutos hoje"
     ❌ "3 dias seguidos de login"     ✅ "3 dias seguidos com uma sessão"
     ❌ "Abra o app pela manhã"        ✅ "Uma sessão antes das 9h"

   O teste e simples e esta automatizado: se da para cumprir sem estudar, esta
   errada. Toda condicao aqui le `fatos_de_hoje`, que so conhece sessao de
   estudo -- nao ha o que contar que nao seja trabalho.

   ── O SORTEIO, e por que ele NAO usa Math.random ──────────────────────────
   As missoes do dia tem de ser AS MESMAS o dia inteiro. Com sorteio aleatorio,
   recarregar a pagina daria outras tres -- e alguem a um minuto de cumprir
   "estude 40 minutos" veria a missao virar "estude 3 matérias". Pior: daria
   para recarregar ate sair a mais facil.

   Entao o sorteio e DETERMINISTICO: a semente e `uid + data`, e a data vem do
   SERVIDOR (ver o comentario na migration). Mesma pessoa, mesmo dia, mesmas
   missoes -- em qualquer aparelho, sem gravar nada.
*/

/* Embaralhador com semente. FNV-1a para virar a string em numero, e um
   gerador congruencial simples para a sequencia. Nao precisa ser bom
   criptograficamente -- precisa ser REPETIVEL, que e o oposto. */
function semente(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sorteador(s) {
  let estado = s || 1;
  return () => {
    estado = (Math.imul(estado, 1103515245) + 12345) >>> 0;
    return estado / 4294967296;
  };
}

/* ── AS MISSÕES DIÁRIAS ─────────────────────────────────────────────────────
   `peso` e a chance relativa de ser sorteada: as mais faceis aparecem mais,
   porque missao diaria existe para ser CUMPRIDA. Uma lista de tres coisas
   dificeis todo dia vira uma lista que ninguem olha.

   `alvo` e o numero a bater; `de(hoje)` diz quanto ja foi feito. A divisao
   permite mostrar "18 / 25 min" em vez de so "não cumprida". */
export const DIARIAS = [
  { id: 'd_25min',    peso: 5, nome: 'Vinte e cinco minutos',
    texto: 'Estude 25 minutos hoje.',
    alvo: 25,  de: (h) => h.minutos },

  { id: 'd_50min',    peso: 3, nome: 'Cinquenta minutos',
    texto: 'Estude 50 minutos hoje.',
    alvo: 50,  de: (h) => h.minutos },

  { id: 'd_90min',    peso: 1, nome: 'Hora e meia',
    texto: 'Estude 90 minutos hoje.',
    alvo: 90,  de: (h) => h.minutos },

  { id: 'd_2sessoes', peso: 4, nome: 'Dois turnos',
    texto: 'Faça duas sessões separadas hoje.',
    alvo: 2,   de: (h) => h.sessoes },

  { id: 'd_2materias', peso: 4, nome: 'Duas frentes',
    texto: 'Estude duas matérias diferentes hoje.',
    alvo: 2,   de: (h) => h.materias },

  { id: 'd_3materias', peso: 2, nome: 'Três frentes',
    texto: 'Estude três matérias diferentes hoje.',
    alvo: 3,   de: (h) => h.materias },

  { id: 'd_sessao40', peso: 3, nome: 'Sem interromper',
    texto: 'Uma sessão de 40 minutos sem parar.',
    alvo: 40,  de: (h) => h.maiorSessaoMin },

  { id: 'd_cedo',     peso: 2, nome: 'Primeiro turno',
    texto: 'Uma sessão antes das 9h.',
    alvo: 1,   de: (h) => h.antesDas9 },

  { id: 'd_noite',    peso: 2, nome: 'Turno da noite',
    texto: 'Uma sessão depois das 20h.',
    alvo: 1,   de: (h) => h.depoisDas20 },

  { id: 'd_cronometro', peso: 3, nome: 'Relógio na mão',
    texto: 'Use o cronômetro em uma sessão hoje.',
    alvo: 1,   de: (h) => (Number(h.porModo?.livre) || 0) + (Number(h.porModo?.pomodoro) || 0) },

  { id: 'd_plano',    peso: 3, nome: 'Cumpra o plano',
    texto: 'Marque uma sessão do cronograma como feita.',
    alvo: 1,   de: (h) => Number(h.porModo?.cronograma) || 0 },
];

/* ── AS MISSÕES GERAIS ──────────────────────────────────────────────────────
   Ordem dele em 01/08, corrigindo a minha ideia de missao semanal que expira:

     "Não, a missão não some. Quests são literalmente quests. Por exemplo: se
      você estudar tanto, você libera isso."

   Entao NENHUMA expira. E o que as distingue das condecoracoes e serem
   ETAPAS ENCADEADAS: a campanha mostra o caminho inteiro e onde voce esta
   nele. Condecoracao e um ponto; campanha e uma trilha.

   Cada etapa le os fatos da VIDA (`fatos_do_usuario`), nao os de hoje. */
export const CAMPANHAS = [
  {
    id: 'c_apresentacao',
    nome: 'Apresentação ao Quartel',
    texto: 'Os primeiros passos de quem acabou de chegar.',
    etapas: [
      { id: 'e_edital',  texto: 'Suba seu edital',              alvo: 1,  de: (f) => (f.temEdital ? 1 : 0) },
      { id: 'e_1sessao', texto: 'Registre a primeira sessão',   alvo: 1,  de: (f) => f.sessoes },
      { id: 'e_1hora',   texto: 'Acumule 1 hora de estudo',     alvo: 1,  de: (f) => Math.floor(f.horas) },
      { id: 'e_3dias',   texto: 'Estude 3 dias diferentes',     alvo: 3,  de: (f) => f.diasEstudados },
    ],
  },
  {
    id: 'c_constancia',
    nome: 'Operação Constância',
    texto: 'A campanha que separa quem passa de quem desiste.',
    etapas: [
      { id: 'e_7dias',   texto: '7 dias seguidos',              alvo: 7,  de: (f) => f.streak },
      { id: 'e_20dias',  texto: '20 dias estudados',            alvo: 20, de: (f) => f.diasEstudados },
      { id: 'e_disc',    texto: 'DISCIPLINA acima de 80',       alvo: 80, de: (f) => f.atributos?.disciplina?.valor || 0 },
      { id: 'e_semana',  texto: 'Uma semana com os 7 dias',     alvo: 1,  de: (f) => f.semanasPerfeitas },
    ],
  },
  {
    id: 'c_amplitude',
    nome: 'Frente Ampla',
    texto: 'Nenhuma matéria abandonada no caminho.',
    etapas: [
      { id: 'e_2mat',    texto: '2 matérias no mesmo mês',      alvo: 40, de: (f) => f.atributos?.amplitude?.valor || 0 },
      { id: 'e_todas',   texto: 'Todas as matérias no mês',     alvo: 100, de: (f) => f.atributos?.amplitude?.valor || 0 },
      { id: 'e_dom50',   texto: 'Nenhuma abaixo de 50%',        alvo: 50, de: (f) => f.dominioMinimo },
      { id: 'e_dom3',    texto: '3 matérias acima de 70%',      alvo: 3,
        de: (f) => (f.materias || []).filter((m) => Number(m?.progresso) >= 70).length },
    ],
  },
  {
    id: 'c_folego',
    nome: 'Marcha de Resistência',
    texto: 'Aguentar sentado é treino como qualquer outro.',
    etapas: [
      { id: 'e_30min',   texto: 'Uma sessão de 30 minutos',     alvo: 30,  de: (f) => f.maiorSessaoMin },
      { id: 'e_60min',   texto: 'Uma sessão de 1 hora',         alvo: 60,  de: (f) => f.maiorSessaoMin },
      { id: 'e_90min',   texto: 'Uma sessão de 1h30',           alvo: 90,  de: (f) => f.maiorSessaoMin },
      { id: 'e_4h_dia',  texto: '4 horas num único dia',        alvo: 4,   de: (f) => f.horasNoDiaMax },
    ],
  },
];

/** As três missões de hoje. Mesma pessoa + mesmo dia = mesmas missões. */
export function missoesDeHoje(uid, hoje, quantas = 3) {
  if (!uid || !hoje?.data) return [];

  const proximo = sorteador(semente(`${uid}|${hoje.data}`));

  /* Sorteio por peso SEM repetir: monta a urna, tira uma, remove todas as
     copias dela e repete. Remover so uma copia deixaria a mesma missao sair
     duas vezes, e o dia teria duas missoes iguais com nomes diferentes. */
  const urna = [];
  for (const m of DIARIAS) for (let i = 0; i < m.peso; i++) urna.push(m.id);

  const escolhidas = [];
  let restante = urna.slice();
  while (escolhidas.length < Math.min(quantas, DIARIAS.length) && restante.length) {
    const id = restante[Math.floor(proximo() * restante.length)];
    escolhidas.push(id);
    restante = restante.filter((x) => x !== id);
  }

  return escolhidas.map((id) => {
    const m = DIARIAS.find((x) => x.id === id);
    const feito = Math.max(0, Number(m.de(hoje)) || 0);
    return {
      ...m,
      feito: Math.min(feito, m.alvo),
      progresso: Math.min(1, feito / m.alvo),
      cumprida: feito >= m.alvo,
    };
  });
}

/** O estado das campanhas. A etapa só abre quando a anterior fecha. */
export function campanhas(fatos) {
  if (!fatos) return [];
  return CAMPANHAS.map((c) => {
    let travouEm = -1;
    const etapas = c.etapas.map((e, i) => {
      const feito = Math.max(0, Number(e.de(fatos)) || 0);
      const cumprida = feito >= e.alvo;
      if (!cumprida && travouEm < 0) travouEm = i;
      return { ...e, feito: Math.min(feito, e.alvo), progresso: Math.min(1, feito / e.alvo), cumprida };
    });
    const cumpridas = etapas.filter((e) => e.cumprida).length;
    return {
      ...c,
      etapas,
      cumpridas,
      completa: cumpridas === etapas.length,
      /* A etapa ATUAL é a primeira não cumprida — é ela que a tela destaca.
         Mostrar as quatro com o mesmo peso faria a pessoa ter de descobrir
         sozinha onde está, e a campanha existe justamente para dizer isso. */
      atual: travouEm >= 0 ? etapas[travouEm] : null,
    };
  });
}
