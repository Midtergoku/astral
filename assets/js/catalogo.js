/* ═══════════════════════════════════════════════════════════════════════════
   CATALOGO — as condecoracoes e as divisas do Astral

   Ordem do Lucas em 19/09/2026, depois de ver a ficha:

     "Sabe quando a pessoa joga um jogo no Playstation? Lá tem várias conquistas
      até você platinar. Isso faz com que a pessoa busque para fazer."

   E a observacao dele que deu origem a este arquivo, sobre a janela de 30 dias
   da DISCIPLINA: "isso é um lugar perfeito para colocar um troféu. Pode ter até
   uma tag escondida aí."

   Ele esta certo, e a razao e mecanica: um atributo da ficha ja e um numero que
   sobe com esforco real e tem teto conhecido. Numero com teto e gatilho pronto
   -- nao e preciso inventar condicao nenhuma, basta dizer em que altura a
   medalha cai.

   ── O QUE ESTE ARQUIVO E ─────────────────────────────────────────────────────
   Dado, nao logica. Aqui moram os NOMES e as CONDICOES; quem confere e concede
   e o motor, que vem depois. Separado de proposito: mexer no catalogo (que vai
   acontecer muito) nao pode exigir mexer no motor (que tem de ficar quieto).

   ── AS REGRAS QUE VALEM PARA TUDO AQUI ───────────────────────────────────────

   1. 🔴 TODA condicao tem de ser conferivel com dado que JA EXISTE:
      `sessoes_estudo` (materia, segundos, xp, modo, criado_em), `progresso`
      (xp, streak, horas, materias[], edital) e os atributos da ficha. Se uma
      ideia bonita nao puder ser medida hoje, ela nao entra -- conquista que
      nunca dispara e pior que conquista nenhuma, porque a pessoa persegue algo
      que nao existe.

   2. 🔴 NADA SE CUMPRE SEM ESTUDAR. Ordem dele: "não queremos transformar o
      site em um cassino". Nao existe aqui nenhuma condecoracao por abrir o
      aplicativo, por sequencia de login ou por estar presente. O teste e
      simples: se da para cumprir sem estudar, esta errada e sai.

   3. MILITAR, nao fantasia. A decisao de tema e de 01/08 e continua valendo.
      Bronze, prata, ouro e platina servem aos dois mundos ao mesmo tempo --
      medalha de verdade e feita desses metais.

   4. COR SO POR TOKEN. O Lucas pediu "um campo em cor" nas tags. A cor vem dos
      tokens do design system (base.css), nunca de um hex solto: assim mudar a
      paleta muda as tags junto, em vez de deixar 24 hexes orfaos para tras.

   ── SOBRE RARIDADE, e por que NAO e porcentagem ─────────────────────────────
   No PlayStation a raridade e medida ("3,1% dos jogadores tem"). Aqui isso seria
   ruim por dois motivos: com 8 usuarios cadastrados qualquer porcentagem e
   ruido, e ela contaria a cada pessoa o que as outras fizeram. Entao raridade
   aqui e PROJETADA -- uma propriedade da condecoracao, decidida por quanto
   esforco ela pede -- e nao uma medicao da base. */

/* ── Os quatro metais ───────────────────────────────────────────────────────
   Nao e so enfeite: o metal diz quanto tempo a coisa leva, e e isso que deixa
   a pessoa escolher o que perseguir hoje e o que perseguir no mes. */
export const METAIS = {
  bronze:  { nome: 'Bronze',  cor: 'var(--brasa)',   ordem: 1, ideia: 'primeiros passos — dias' },
  prata:   { nome: 'Prata',   cor: 'var(--texto-2)', ordem: 2, ideia: 'constância — semanas' },
  ouro:    { nome: 'Ouro',    cor: 'var(--latao)',   ordem: 3, ideia: 'compromisso — meses' },
  platina: { nome: 'Platina', cor: 'var(--papel)',   ordem: 4, ideia: 'a condecoração máxima — tudo' },
};

/* ── AS CONDECORACOES ───────────────────────────────────────────────────────

   `condicao` e um objeto que o motor sabe conferir. Os tipos:

     atributo   { chave, min }            um atributo da ficha bate o valor
     horas      { min }                   horas acumuladas
     streak     { min }                   dias seguidos
     sessoes    { min }                   numero de sessoes
     sessaoUnica{ minutosMin }            uma sessao com essa duracao
     materias   { dominioMin, quantas }   N materias acima de X% de dominio
     horario    { deHora, ateHora, vezes } N sessoes dentro de uma faixa do dia
     diaSemana  { dias, vezes }           N sessoes em dias especificos (0=domingo)
     retorno    { diasSumidoMin }         voltou depois de sumir
     edital     true                      subiu um edital
     todas      { exceto }                a platina: todas as outras

   `secreta: true` NAO aparece na lista ate disparar. Isso e deliberado e vem
   de uma correcao dele em 01/08, quando eu tinha chamado a tranca de bug:
   "ela foi feita pra ser secreta, então só vou descobrir ela por acaso, então
   vai ser um pico de dopamina sim". Conquista anunciada vira tarefa; conquista
   que aparece sozinha vira surpresa. */
export const CONDECORACOES = [

  // ── BRONZE — os primeiros dias ───────────────────────────────────────────
  { id: 'alistamento',     metal: 'bronze', nome: 'Alistamento',
    descricao: 'Sua primeira sessão de estudo registrada.',
    condicao: { tipo: 'sessoes', min: 1 } },

  { id: 'primeira_hora',   metal: 'bronze', nome: 'Primeira Hora',
    descricao: 'Uma hora de estudo acumulada.',
    condicao: { tipo: 'horas', min: 1 } },

  { id: 'edital_lido',     metal: 'bronze', nome: 'Ordem de Serviço',
    descricao: 'Seu primeiro edital virou plano.',
    condicao: { tipo: 'edital' } },

  { id: 'tres_dias',       metal: 'bronze', nome: 'Três Dias em Pé',
    descricao: 'Três dias seguidos de estudo.',
    condicao: { tipo: 'streak', min: 3 } },

  { id: 'duas_frentes',    metal: 'bronze', nome: 'Duas Frentes',
    descricao: 'Estudou duas matérias diferentes no mesmo mês.',
    condicao: { tipo: 'atributo', chave: 'amplitude', min: 40 } },

  { id: 'meia_hora',       metal: 'bronze', nome: 'Sentinela',
    descricao: 'Uma sessão de 30 minutos sem levantar.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 30 } },

  { id: 'dez_sessoes',     metal: 'bronze', nome: 'Rotina Estabelecida',
    descricao: 'Dez sessões de estudo registradas.',
    condicao: { tipo: 'sessoes', min: 10 } },

  // ── PRATA — semanas ──────────────────────────────────────────────────────
  { id: 'semana_cheia',    metal: 'prata', nome: 'Semana Completa',
    descricao: 'Sete dias seguidos de estudo.',
    condicao: { tipo: 'streak', min: 7 } },

  { id: 'dez_horas',       metal: 'prata', nome: 'Dez Horas de Serviço',
    descricao: 'Dez horas acumuladas.',
    condicao: { tipo: 'horas', min: 10 } },

  { id: 'hora_cheia',      metal: 'prata', nome: 'Resistência',
    descricao: 'Uma sessão de uma hora inteira.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 60 } },

  { id: 'quatro_frentes',  metal: 'prata', nome: 'Frente Ampla',
    descricao: 'Nenhuma matéria do seu edital ficou esquecida no mês.',
    condicao: { tipo: 'atributo', chave: 'amplitude', min: 100 } },

  { id: 'primeiro_dominio', metal: 'prata', nome: 'Terreno Tomado',
    descricao: 'Uma matéria passou de 70% de domínio.',
    condicao: { tipo: 'materias', dominioMin: 70, quantas: 1 } },

  { id: 'meio_caminho',    metal: 'prata', nome: 'Meio do Caminho',
    descricao: 'Domínio médio de 50% em todas as matérias.',
    condicao: { tipo: 'atributo', chave: 'doutrina', min: 50 } },

  { id: 'trinta_sessoes',  metal: 'prata', nome: 'Veterano de Campo',
    descricao: 'Trinta sessões registradas.',
    condicao: { tipo: 'sessoes', min: 30 } },

  // ── OURO — meses ─────────────────────────────────────────────────────────
  // 🎯 Estas tres nascem da ideia dele: o teto de um atributo da ficha e o
  // gatilho. Chegar a 100 em DISCIPLINA significa 20 dias de estudo em 30 --
  // nao e numero bonito, e um mes de vida organizada.
  { id: 'disciplina_total', metal: 'ouro', nome: 'Disciplina de Ferro',
    descricao: 'DISCIPLINA no máximo: vinte dias de estudo em trinta.',
    condicao: { tipo: 'atributo', chave: 'disciplina', min: 100 } },

  { id: 'resistencia_total', metal: 'ouro', nome: 'Fôlego de Combate',
    descricao: 'RESISTÊNCIA no máximo: uma sessão de hora e meia.',
    condicao: { tipo: 'atributo', chave: 'resistencia', min: 100 } },

  { id: 'doutrina_total',   metal: 'ouro', nome: 'Doutrina Consolidada',
    descricao: 'DOUTRINA no máximo: domínio pleno de todas as matérias.',
    condicao: { tipo: 'atributo', chave: 'doutrina', min: 100 } },

  { id: 'trinta_dias',     metal: 'ouro', nome: 'Trinta Dias em Pé',
    descricao: 'Um mês inteiro sem quebrar a sequência.',
    condicao: { tipo: 'streak', min: 30 } },

  { id: 'cem_horas',       metal: 'ouro', nome: 'Cem Horas',
    descricao: 'Cem horas de estudo acumuladas.',
    condicao: { tipo: 'horas', min: 100 } },

  { id: 'tres_dominios',   metal: 'ouro', nome: 'Terreno Consolidado',
    descricao: 'Três matérias acima de 70% de domínio.',
    condicao: { tipo: 'materias', dominioMin: 70, quantas: 3 } },

  // ── PLATINA — a última ───────────────────────────────────────────────────
  // Como no PlayStation: nao tem condicao propria. Ela cai quando todas as
  // outras ja cairam -- inclusive as secretas, que e o que torna a caçada
  // interessante ate o fim.
  { id: 'platina',         metal: 'platina', nome: 'Condecoração Máxima',
    descricao: 'Todas as outras condecorações conquistadas.',
    condicao: { tipo: 'todas', exceto: ['platina'] } },

  // ══ AS SECRETAS ══════════════════════════════════════════════════════════
  // Nao aparecem na lista ate dispararem. Cada uma premia um comportamento que
  // NINGUEM faria de proposito para ganhar medalha -- e por isso que a
  // descoberta funciona.

  { id: 'madrugador',      metal: 'prata', secreta: true, nome: 'Vigília',
    descricao: 'Cinco sessões começadas antes das 6 da manhã.',
    condicao: { tipo: 'horario', deHora: 4, ateHora: 6, vezes: 5 } },

  { id: 'coruja',          metal: 'prata', secreta: true, nome: 'Turno da Noite',
    descricao: 'Cinco sessões começadas depois da meia-noite.',
    condicao: { tipo: 'horario', deHora: 0, ateHora: 4, vezes: 5 } },

  { id: 'fim_de_semana',   metal: 'prata', secreta: true, nome: 'Sem Folga',
    descricao: 'Oito sessões em sábados e domingos.',
    condicao: { tipo: 'diaSemana', dias: [0, 6], vezes: 8 } },

  // A que o Lucas aprovou em 02/08: "realmente dar uma medalha quando ela volta
  // traz um impacto importante sim". Premia voltar, nao premia sumir -- a
  // diferenca esta em exigir uma SESSAO no retorno, nao so reabrir o site.
  { id: 'reintegrado',     metal: 'ouro', secreta: true, nome: 'Reintegrado',
    descricao: 'Voltou a estudar depois de mais de 14 dias sumido.',
    condicao: { tipo: 'retorno', diasSumidoMin: 14 } },

  { id: 'maratona',        metal: 'ouro', secreta: true, nome: 'Marcha Forçada',
    descricao: 'Uma sessão de três horas seguidas.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 180 } },

  { id: 'ferro_em_brasa',  metal: 'ouro', secreta: true, nome: 'Ferro em Brasa',
    descricao: 'Estudou nos sete dias da semana, a semana inteira, duas vezes.',
    condicao: { tipo: 'diaSemana', dias: [0, 1, 2, 3, 4, 5, 6], vezes: 14 } },

  { id: 'virada',          metal: 'prata', secreta: true, nome: 'Virada de Jogo',
    descricao: 'A matéria que estava mais atrasada passou de 50%.',
    condicao: { tipo: 'viradaMateria', dominioMin: 50 } },
];

/* ── AS DIVISAS (tags) ──────────────────────────────────────────────────────

   A tag e o que a pessoa VESTE. Mecanica decidida por ele em 02/08:

     ACUMULA   toda tag conquistada fica guardada, para sempre
     VESTE     uma de cada vez, escolhida por ela, e e essa que vai na divisa

   Como se escreve, regra literal dele: "Não quero que seja tipo 'eu sou'. Só
   vai estar lá assim: Estrategista." A palavra sozinha. Insignia nao se explica.

   `raridade` e projetada, nao medida (ver o cabecalho). `cor` e sempre token. */
export const RARIDADES = {
  comum:    { nome: 'Comum',    cor: 'var(--texto-2)', ordem: 1 },
  incomum:  { nome: 'Incomum',  cor: 'var(--oliva-c)', ordem: 2 },
  rara:     { nome: 'Rara',     cor: 'var(--latao-c)', ordem: 3 },
  lendaria: { nome: 'Lendária', cor: 'var(--papel)',   ordem: 4 },
};

export const DIVISAS = [
  // ── Por matéria dominada (70%) — as que ja existiam em conquistas.html,
  //    agora com raridade e cor, e passando a ser TAG de verdade.
  { id: 'orador',       nome: 'Orador de Guerra',  raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Português acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['português', 'língua portuguesa'], dominioMin: 70 } },

  { id: 'calculista',   nome: 'Calculista',        raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Matemática acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['matemática'], dominioMin: 70 } },

  { id: 'engenheiro',   nome: 'Engenheiro de Campo', raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Física acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['física'], dominioMin: 70 } },

  { id: 'interprete',   nome: 'Intérprete',        raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Inglês acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['inglês', 'língua inglesa'], dominioMin: 70 } },

  { id: 'guardiao',     nome: 'Guardião da Lei',   raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Direito acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['direito', 'direito constitucional'], dominioMin: 70 } },

  { id: 'navegador',    nome: 'Navegador',         raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Geografia acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['geografia'], dominioMin: 70 } },

  { id: 'cronista',     nome: 'Memória da Nação',  raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'História acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['história'], dominioMin: 70 } },

  { id: 'cyber',        nome: 'Operador Cyber',    raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Informática acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['informática'], dominioMin: 70 } },

  { id: 'alquimista',   nome: 'Alquimista',        raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Química acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['química'], dominioMin: 70 } },

  { id: 'medico',       nome: 'Médico de Combate', raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Biologia acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['biologia'], dominioMin: 70 } },

  { id: 'estrategista', nome: 'Estrategista',      raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Raciocínio lógico acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['raciocínio lógico'], dominioMin: 70 } },

  // ── Por hábito — vem dos atributos da ficha ─────────────────────────────
  { id: 'sentinela',    nome: 'Sentinela',         raridade: 'comum',   cor: 'var(--oliva-c)',
    comoGanha: 'DISCIPLINA acima de 60',
    condicao: { tipo: 'atributo', chave: 'disciplina', min: 60 } },

  { id: 'inabalavel',   nome: 'Inabalável',        raridade: 'rara',    cor: 'var(--latao)',
    comoGanha: 'DISCIPLINA no máximo',
    condicao: { tipo: 'atributo', chave: 'disciplina', min: 100 } },

  { id: 'sapador',      nome: 'Sapador',           raridade: 'comum',   cor: 'var(--oliva-c)',
    comoGanha: 'RESISTÊNCIA acima de 60',
    condicao: { tipo: 'atributo', chave: 'resistencia', min: 60 } },

  { id: 'incansavel',   nome: 'Incansável',        raridade: 'rara',    cor: 'var(--latao)',
    comoGanha: 'RESISTÊNCIA no máximo',
    condicao: { tipo: 'atributo', chave: 'resistencia', min: 100 } },

  { id: 'batedor',      nome: 'Batedor',           raridade: 'comum',   cor: 'var(--oliva-c)',
    comoGanha: 'AMPLITUDE no máximo — nenhuma matéria esquecida',
    condicao: { tipo: 'atributo', chave: 'amplitude', min: 100 } },

  { id: 'instrutor',    nome: 'Instrutor',         raridade: 'rara',    cor: 'var(--latao)',
    comoGanha: 'DOUTRINA acima de 80',
    condicao: { tipo: 'atributo', chave: 'doutrina', min: 80 } },

  // ── Por condecoração — a tag que vem junto com a medalha ────────────────
  { id: 'reintegrado',  nome: 'Reintegrado',       raridade: 'rara',    cor: 'var(--brasa-c)',
    comoGanha: 'Voltar depois de mais de 14 dias sumido',
    condicao: { tipo: 'condecoracao', id: 'reintegrado' } },

  { id: 'vigilia',      nome: 'Vigília',           raridade: 'rara',    cor: 'var(--oliva)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'madrugador' } },

  { id: 'turno_noite',  nome: 'Turno da Noite',    raridade: 'rara',    cor: 'var(--oliva)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'coruja' } },

  { id: 'marcha',       nome: 'Marcha Forçada',    raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'maratona' } },

  { id: 'ferro',        nome: 'Ferro em Brasa',    raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'ferro_em_brasa' } },

  // ── A ultima ────────────────────────────────────────────────────────────
  { id: 'condecorado',  nome: 'Condecorado',       raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'Conquistar a Condecoração Máxima',
    condicao: { tipo: 'condecoracao', id: 'platina' } },
];

/* ── Conferencias que o proprio arquivo faz de si ───────────────────────────
   Catalogo com id repetido concede medalha errada calada, e catalogo que aponta
   para condecoracao inexistente cria tag que ninguem ganha nunca. As duas coisas
   sao invisiveis a olho nu e faceis de checar por programa -- entao
   `tools/testa-catalogo.js` chama isto. */
export function conferirCatalogo() {
  const problemas = [];

  const vistos = new Set();
  for (const c of CONDECORACOES) {
    if (vistos.has(c.id)) problemas.push(`condecoração com id repetido: ${c.id}`);
    vistos.add(c.id);
    if (!METAIS[c.metal]) problemas.push(`${c.id}: metal desconhecido "${c.metal}"`);
    if (!c.nome || !c.descricao) problemas.push(`${c.id}: falta nome ou descrição`);
    if (!c.condicao?.tipo) problemas.push(`${c.id}: sem condição conferível`);
  }

  const vistasTag = new Set();
  for (const d of DIVISAS) {
    if (vistasTag.has(d.id)) problemas.push(`divisa com id repetido: ${d.id}`);
    vistasTag.add(d.id);
    if (!RARIDADES[d.raridade]) problemas.push(`${d.id}: raridade desconhecida "${d.raridade}"`);
    if (!/^var\(--[a-z0-9-]+\)$/.test(d.cor || '')) problemas.push(`${d.id}: cor fora do design system ("${d.cor}")`);
    if (d.condicao?.tipo === 'condecoracao' && !vistos.has(d.condicao.id)) {
      problemas.push(`${d.id}: aponta para condecoração que não existe (${d.condicao.id})`);
    }
  }

  return problemas;
}

export const RESUMO = {
  condecoracoes: CONDECORACOES.length,
  secretas: CONDECORACOES.filter((c) => c.secreta).length,
  divisas: DIVISAS.length,
  divisasSecretas: DIVISAS.filter((d) => d.secreta).length,
};
