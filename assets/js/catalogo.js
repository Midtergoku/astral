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

   ⚠️ AMPLIADO no mesmo dia, a pedido dele: "eu quero mais, tá? Eu quero bem
   mais. E mais secretas também, óbvio." Saiu de 28 condecoracoes para 68, e de
   7 secretas para 22.

   ── O QUE ESTE ARQUIVO E ─────────────────────────────────────────────────────
   Dado, nao logica. Aqui moram os NOMES e as CONDICOES; quem confere e concede
   e o motor, que vem depois. Separado de proposito: mexer no catalogo (que vai
   acontecer muito) nao pode exigir mexer no motor (que tem de ficar quieto).

   ── AS REGRAS QUE VALEM PARA TUDO AQUI ───────────────────────────────────────

   1. 🔴 TODA condicao tem de ser conferivel com dado que JA EXISTE:
      `sessoes_estudo` (materia, segundos, xp, modo, criado_em), `progresso`
      (xp, streak, horas, materias[], edital), `eventos`, `recursos_salvos` e os
      atributos da ficha. Se uma ideia bonita nao puder ser medida hoje, ela nao
      entra -- conquista que nunca dispara e pior que conquista nenhuma, porque
      a pessoa persegue algo que nao existe.

   2. 🔴 NADA SE CUMPRE SEM ESTUDAR. Ordem dele: "não queremos transformar o
      site em um cassino". Nao existe aqui nenhuma condecoracao por abrir o
      aplicativo, por sequencia de login ou por estar presente. O teste e
      simples: se da para cumprir sem estudar, esta errada e sai.

   3. MILITAR, nao fantasia. A decisao de tema e de 01/08 e continua valendo.
      Bronze, prata, ouro e platina servem aos dois mundos ao mesmo tempo --
      medalha de verdade e feita desses metais.

   4. COR SO POR TOKEN. O Lucas pediu "um campo em cor" nas tags. A cor vem dos
      tokens do design system (base.css), nunca de um hex solto: assim mudar a
      paleta muda as tags junto, em vez de deixar dezenas de hexes orfaos.

   ── SOBRE RARIDADE, e por que NAO e porcentagem AINDA ───────────────────────
   No PlayStation a raridade e medida ("3,1% dos jogadores tem"). Decisao dele
   em 19/09: "não mostre essa porcentagem agora. Talvez no futuro, quando o site
   estiver com muitos usuários, aí fica interessante".

   O motivo de nao ser agora e aritmetico: com 8 usuarios cadastrados, uma
   pessoa sozinha move a porcentagem em 12,5 pontos, e o numero contaria a cada
   um o que os outros fizeram. Entao HOJE raridade e PROJETADA -- propriedade da
   condecoracao, decidida por quanto esforco ela pede.

   📌 Quando revisitar: ver `historico/roadmap-rpg.md`, item R14. */

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

     sessoes      { min }                    numero de sessoes
     horas        { min }                    horas acumuladas
     streak       { min }                    dias seguidos
     sessaoUnica  { minutosMin }             uma sessao com essa duracao
     sessoesNoDia { quantas }                N sessoes no mesmo dia
     horasNoDia   { min }                    N horas somadas num unico dia
     materias     { dominioMin, quantas }    N materias acima de X% de dominio
     dominioMinimo{ min }                    NENHUMA materia abaixo de X%
     atributo     { chave, min }             um atributo da ficha bate o valor
     horario      { deHora, ateHora, vezes } N sessoes dentro de uma faixa do dia
     diaSemana    { dias, vezes }            N sessoes em dias especificos (0=domingo)
     semanaPerfeita { vezes }                N semanas com os 7 dias estudados
     materiaSeguida { dias }                 a MESMA materia N dias seguidos
     meses        { min }                    ativo em N meses distintos
     retorno      { diasSumidoMin }          voltou depois de sumir
     viradaMateria{ dominioMin }             a materia mais atrasada subiu
     modo         { modo, vezes }            N sessoes de um modo (livre/pomodoro/cronograma)
     xp           { min }                    XP acumulado
     eventos      { min }                    eventos no calendario
     recursos     { min }                    guias de professores salvos
     edital       true                       subiu um edital
     todas        { exceto }                 a platina: todas as outras

   `secreta: true` NAO aparece na lista ate disparar. Isso e deliberado e vem
   de uma correcao dele em 01/08, quando eu tinha chamado a tranca de bug:
   "ela foi feita pra ser secreta, então só vou descobrir ela por acaso, então
   vai ser um pico de dopamina sim". Conquista anunciada vira tarefa; conquista
   que aparece sozinha vira surpresa. */
export const CONDECORACOES = [

  // ══ BRONZE — os primeiros dias ═══════════════════════════════════════════
  { id: 'alistamento',      metal: 'bronze', nome: 'Alistamento',
    descricao: 'Sua primeira sessão de estudo registrada.',
    condicao: { tipo: 'sessoes', min: 1 } },

  { id: 'primeira_hora',    metal: 'bronze', nome: 'Primeira Hora',
    descricao: 'Uma hora de estudo acumulada.',
    condicao: { tipo: 'horas', min: 1 } },

  { id: 'edital_lido',      metal: 'bronze', nome: 'Ordem de Serviço',
    descricao: 'Seu primeiro edital virou plano.',
    condicao: { tipo: 'edital' } },

  { id: 'dois_dias',        metal: 'bronze', nome: 'Segundo Dia',
    descricao: 'Voltou no dia seguinte. É o dia que a maioria não volta.',
    condicao: { tipo: 'streak', min: 2 } },

  { id: 'tres_dias',        metal: 'bronze', nome: 'Três Dias em Pé',
    descricao: 'Três dias seguidos de estudo.',
    condicao: { tipo: 'streak', min: 3 } },

  { id: 'duas_frentes',     metal: 'bronze', nome: 'Duas Frentes',
    descricao: 'Estudou duas matérias diferentes no mesmo mês.',
    condicao: { tipo: 'atributo', chave: 'amplitude', min: 40 } },

  { id: 'meia_hora',        metal: 'bronze', nome: 'Sentinela',
    descricao: 'Uma sessão de 30 minutos sem levantar.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 30 } },

  { id: 'cinco_sessoes',    metal: 'bronze', nome: 'Pegando o Ritmo',
    descricao: 'Cinco sessões de estudo registradas.',
    condicao: { tipo: 'sessoes', min: 5 } },

  { id: 'dez_sessoes',      metal: 'bronze', nome: 'Rotina Estabelecida',
    descricao: 'Dez sessões de estudo registradas.',
    condicao: { tipo: 'sessoes', min: 10 } },

  { id: 'tres_horas',       metal: 'bronze', nome: 'Três Horas',
    descricao: 'Três horas de estudo acumuladas.',
    condicao: { tipo: 'horas', min: 3 } },

  { id: 'cinco_horas',      metal: 'bronze', nome: 'Cinco Horas',
    descricao: 'Cinco horas de estudo acumuladas.',
    condicao: { tipo: 'horas', min: 5 } },

  { id: 'plano_seguido',    metal: 'bronze', nome: 'Cumpriu a Ordem',
    descricao: 'Marcou cinco sessões do cronograma como feitas.',
    condicao: { tipo: 'modo', modo: 'cronograma', vezes: 5 } },

  { id: 'cronometro_usado', metal: 'bronze', nome: 'Relógio na Mão',
    descricao: 'Cinco sessões cronometradas de verdade.',
    condicao: { tipo: 'modo', modo: 'livre', vezes: 5 } },

  /* 🔴 AQUI HAVIA DUAS CONDECORACOES QUE VIOLAVAM A REGRA DELE, e foi o
     proprio teste que pegou, em 19/09/2026.

     "Prazo Anotado" (marcar evento no calendario) e "Reconhecimento" (buscar
     professores) se cumpriam com um CLIQUE -- sem estudar um minuto. A ordem
     dele e literal: "não queremos transformar o site em um cassino", e
     recompensar clique e exatamente o comeco disso.

     Sao tarefas uteis, e talvez caibam um dia como MISSAO (R12, que e outra
     coisa: tarefa do dia). Como condecoracao, nao. Trocadas por duas que so se
     cumprem estudando. */
  { id: 'dez_dias',         metal: 'bronze', nome: 'Dez Dias de Serviço',
    descricao: 'Dez dias diferentes com estudo registrado.',
    condicao: { tipo: 'diasEstudados', min: 10 } },

  { id: 'duas_no_dia',      metal: 'bronze', nome: 'Frente Dupla',
    descricao: 'Duas matérias diferentes no mesmo dia.',
    condicao: { tipo: 'materiasNoDia', quantas: 2 } },

  { id: 'dois_turnos',      metal: 'bronze', nome: 'Dois Turnos',
    descricao: 'Duas sessões no mesmo dia.',
    condicao: { tipo: 'sessoesNoDia', quantas: 2 } },

  // ══ PRATA — semanas ══════════════════════════════════════════════════════
  { id: 'semana_cheia',     metal: 'prata', nome: 'Semana Completa',
    descricao: 'Sete dias seguidos de estudo.',
    condicao: { tipo: 'streak', min: 7 } },

  { id: 'quinze_dias',      metal: 'prata', nome: 'Quinze Dias em Pé',
    descricao: 'Quinze dias seguidos sem quebrar a sequência.',
    condicao: { tipo: 'streak', min: 15 } },

  { id: 'dez_horas',        metal: 'prata', nome: 'Dez Horas de Serviço',
    descricao: 'Dez horas acumuladas.',
    condicao: { tipo: 'horas', min: 10 } },

  { id: 'vinte_cinco_horas', metal: 'prata', nome: 'Vinte e Cinco Horas',
    descricao: 'Vinte e cinco horas acumuladas.',
    condicao: { tipo: 'horas', min: 25 } },

  { id: 'cinquenta_horas',  metal: 'prata', nome: 'Cinquenta Horas',
    descricao: 'Cinquenta horas acumuladas.',
    condicao: { tipo: 'horas', min: 50 } },

  { id: 'hora_cheia',       metal: 'prata', nome: 'Resistência',
    descricao: 'Uma sessão de uma hora inteira.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 60 } },

  { id: 'hora_e_meia',      metal: 'prata', nome: 'Guarda Estendida',
    descricao: 'Uma sessão de uma hora e meia.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 90 } },

  { id: 'quatro_frentes',   metal: 'prata', nome: 'Frente Ampla',
    descricao: 'Nenhuma matéria do seu edital ficou esquecida no mês.',
    condicao: { tipo: 'atributo', chave: 'amplitude', min: 100 } },

  { id: 'primeiro_dominio', metal: 'prata', nome: 'Terreno Tomado',
    descricao: 'Uma matéria passou de 70% de domínio.',
    condicao: { tipo: 'materias', dominioMin: 70, quantas: 1 } },

  { id: 'dois_dominios',    metal: 'prata', nome: 'Dois Terrenos',
    descricao: 'Duas matérias acima de 70% de domínio.',
    condicao: { tipo: 'materias', dominioMin: 70, quantas: 2 } },

  { id: 'meio_caminho',     metal: 'prata', nome: 'Meio do Caminho',
    descricao: 'Domínio médio de 50% em todas as matérias.',
    condicao: { tipo: 'atributo', chave: 'doutrina', min: 50 } },

  { id: 'trinta_sessoes',   metal: 'prata', nome: 'Veterano de Campo',
    descricao: 'Trinta sessões registradas.',
    condicao: { tipo: 'sessoes', min: 30 } },

  { id: 'cinquenta_sessoes', metal: 'prata', nome: 'Serviço Prolongado',
    descricao: 'Cinquenta sessões registradas.',
    condicao: { tipo: 'sessoes', min: 50 } },

  { id: 'dia_cheio',        metal: 'prata', nome: 'Jornada Dupla',
    descricao: 'Quatro horas de estudo num único dia.',
    condicao: { tipo: 'horasNoDia', min: 4 } },

  { id: 'tres_turnos',      metal: 'prata', nome: 'Três Turnos',
    descricao: 'Três sessões no mesmo dia.',
    condicao: { tipo: 'sessoesNoDia', quantas: 3 } },

  { id: 'dois_meses',       metal: 'prata', nome: 'Dois Meses de Farda',
    descricao: 'Estudou em dois meses diferentes.',
    condicao: { tipo: 'meses', min: 2 } },

  { id: 'disciplina_meia',  metal: 'prata', nome: 'Ordem Unida',
    descricao: 'DISCIPLINA acima de 60.',
    condicao: { tipo: 'atributo', chave: 'disciplina', min: 60 } },

  { id: 'resistencia_meia', metal: 'prata', nome: 'Fôlego',
    descricao: 'RESISTÊNCIA acima de 60.',
    condicao: { tipo: 'atributo', chave: 'resistencia', min: 60 } },

  { id: 'fiel_ao_plano',    metal: 'prata', nome: 'Fiel ao Plano',
    descricao: 'Marcou vinte sessões do cronograma como feitas.',
    condicao: { tipo: 'modo', modo: 'cronograma', vezes: 20 } },

  { id: 'trinta_dias_est',  metal: 'prata', nome: 'Trinta Dias de Serviço',
    descricao: 'Trinta dias diferentes com estudo registrado.',
    condicao: { tipo: 'diasEstudados', min: 30 } },

  { id: 'tres_no_dia',      metal: 'prata', nome: 'Frente Tripla',
    descricao: 'Três matérias diferentes no mesmo dia.',
    condicao: { tipo: 'materiasNoDia', quantas: 3 } },

  // ══ OURO — meses ═════════════════════════════════════════════════════════
  // 🎯 Estas quatro nascem da ideia dele: o teto de um atributo da ficha e o
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

  { id: 'ficha_completa',   metal: 'ouro', nome: 'Ficha Impecável',
    descricao: 'Disciplina, Resistência e Amplitude no máximo ao mesmo tempo.',
    condicao: { tipo: 'atributosTodos', chaves: ['disciplina', 'resistencia', 'amplitude'], min: 100 } },

  { id: 'trinta_dias',      metal: 'ouro', nome: 'Trinta Dias em Pé',
    descricao: 'Um mês inteiro sem quebrar a sequência.',
    condicao: { tipo: 'streak', min: 30 } },

  { id: 'sessenta_dias',    metal: 'ouro', nome: 'Sessenta Dias em Pé',
    descricao: 'Dois meses seguidos sem falhar um dia.',
    condicao: { tipo: 'streak', min: 60 } },

  { id: 'cem_horas',        metal: 'ouro', nome: 'Cem Horas',
    descricao: 'Cem horas de estudo acumuladas.',
    condicao: { tipo: 'horas', min: 100 } },

  { id: 'duzentas_horas',   metal: 'ouro', nome: 'Duzentas Horas',
    descricao: 'Duzentas horas de estudo acumuladas.',
    condicao: { tipo: 'horas', min: 200 } },

  { id: 'tres_dominios',    metal: 'ouro', nome: 'Terreno Consolidado',
    descricao: 'Três matérias acima de 70% de domínio.',
    condicao: { tipo: 'materias', dominioMin: 70, quantas: 3 } },

  { id: 'cinco_dominios',   metal: 'ouro', nome: 'Domínio Amplo',
    descricao: 'Cinco matérias acima de 70% de domínio.',
    condicao: { tipo: 'materias', dominioMin: 70, quantas: 5 } },

  { id: 'ninguem_atras',    metal: 'ouro', nome: 'Ninguém Fica Para Trás',
    descricao: 'Nenhuma matéria abaixo de 50% de domínio.',
    condicao: { tipo: 'dominioMinimo', min: 50 } },

  { id: 'cem_sessoes',      metal: 'ouro', nome: 'Cem Formaturas',
    descricao: 'Cem sessões registradas.',
    condicao: { tipo: 'sessoes', min: 100 } },

  { id: 'seis_meses',       metal: 'ouro', nome: 'Meio Ano de Farda',
    descricao: 'Estudou em seis meses diferentes.',
    condicao: { tipo: 'meses', min: 6 } },

  { id: 'dez_mil_xp',       metal: 'ouro', nome: 'Dez Mil',
    descricao: 'Dez mil pontos de experiência acumulados.',
    condicao: { tipo: 'xp', min: 10000 } },

  // ══ PLATINA — a última ═══════════════════════════════════════════════════
  // Como no PlayStation: nao tem condicao propria. Ela cai quando todas as
  // outras ja cairam -- inclusive as secretas, que e o que torna a caçada
  // interessante ate o fim.
  { id: 'platina',          metal: 'platina', nome: 'Condecoração Máxima',
    descricao: 'Todas as outras condecorações conquistadas.',
    condicao: { tipo: 'todas', exceto: ['platina'] } },

  // ══ AS SECRETAS ══════════════════════════════════════════════════════════
  // Nao aparecem na lista ate dispararem. Cada uma premia um comportamento que
  // NINGUEM faria de proposito para ganhar medalha -- e por isso que a
  // descoberta funciona. Se der para "ir atras" dela, ela nao devia ser secreta:
  // devia estar na lista visivel, onde serve de objetivo.

  { id: 'madrugador',       metal: 'bronze', secreta: true, nome: 'Vigília',
    descricao: 'Cinco sessões começadas antes das 6 da manhã.',
    condicao: { tipo: 'horario', deHora: 4, ateHora: 6, vezes: 5 } },

  { id: 'coruja',           metal: 'bronze', secreta: true, nome: 'Turno da Noite',
    descricao: 'Cinco sessões começadas depois da meia-noite.',
    condicao: { tipo: 'horario', deHora: 0, ateHora: 4, vezes: 5 } },

  { id: 'hora_do_almoco',   metal: 'bronze', secreta: true, nome: 'Rancho Pulado',
    descricao: 'Dez sessões entre meio-dia e uma da tarde.',
    condicao: { tipo: 'horario', deHora: 12, ateHora: 13, vezes: 10 } },

  { id: 'fim_de_semana',    metal: 'prata', secreta: true, nome: 'Sem Folga',
    descricao: 'Oito sessões em sábados e domingos.',
    condicao: { tipo: 'diaSemana', dias: [0, 6], vezes: 8 } },

  { id: 'segunda_feira',    metal: 'prata', secreta: true, nome: 'Começo de Semana',
    descricao: 'Dez segundas-feiras estudadas. A mais difícil de todas.',
    condicao: { tipo: 'diaSemana', dias: [1], vezes: 10 } },

  { id: 'domingo_fiel',     metal: 'prata', secreta: true, nome: 'Domingo de Serviço',
    descricao: 'Dez domingos estudados.',
    condicao: { tipo: 'diaSemana', dias: [0], vezes: 10 } },

  { id: 'semana_perfeita',  metal: 'prata', secreta: true, nome: 'Semana Sem Brecha',
    descricao: 'Uma semana com os sete dias estudados.',
    condicao: { tipo: 'semanaPerfeita', vezes: 1 } },

  { id: 'quatro_perfeitas', metal: 'ouro', secreta: true, nome: 'Mês Sem Brecha',
    descricao: 'Quatro semanas com os sete dias estudados.',
    condicao: { tipo: 'semanaPerfeita', vezes: 4 } },

  // A que o Lucas aprovou em 02/08: "realmente dar uma medalha quando ela volta
  // traz um impacto importante sim". Premia VOLTAR, nao premia sumir -- a
  // diferenca esta em exigir uma SESSAO no retorno, nao so reabrir o site.
  { id: 'reintegrado',      metal: 'prata', secreta: true, nome: 'Reintegrado',
    descricao: 'Voltou a estudar depois de mais de 14 dias sumido.',
    condicao: { tipo: 'retorno', diasSumidoMin: 14 } },

  { id: 'reintegrado_longo', metal: 'ouro', secreta: true, nome: 'De Volta ao Posto',
    descricao: 'Voltou a estudar depois de mais de 30 dias sumido.',
    condicao: { tipo: 'retorno', diasSumidoMin: 30 } },

  { id: 'maratona',         metal: 'ouro', secreta: true, nome: 'Marcha Forçada',
    descricao: 'Uma sessão de três horas seguidas.',
    condicao: { tipo: 'sessaoUnica', minutosMin: 180 } },

  { id: 'maratona_dupla',   metal: 'ouro', secreta: true, nome: 'Travessia',
    descricao: 'Oito horas de estudo num único dia.',
    condicao: { tipo: 'horasNoDia', min: 8 } },

  { id: 'ferro_em_brasa',   metal: 'ouro', secreta: true, nome: 'Ferro em Brasa',
    descricao: 'Cem dias seguidos sem quebrar a sequência.',
    condicao: { tipo: 'streak', min: 100 } },

  /* ✏️ REESCRITA em 19/09/2026, ainda antes de existir motor. Eu tinha posto
     "a matéria que ESTAVA mais atrasada passou de 50%" -- e isso é
     inconferível: nao guardamos historico de dominio, so o valor de agora. A
     condecoracao nunca dispararia, e ninguem descobriria por que.

     Violava a regra 1 do proprio arquivo. Reescrita para o que o banco sabe
     responder: a materia a que a pessoa dedicou MENOS tempo (isso esta em
     sessoes_estudo) esta acima de 50%. Captura a mesma ideia -- a preterida
     nao ficou para tras -- e e mensuravel hoje. */
  { id: 'virada',           metal: 'prata', secreta: true, nome: 'Virada de Jogo',
    descricao: 'A matéria a que você dedicou menos tempo passou de 50% de domínio.',
    condicao: { tipo: 'materiaMenosEstudada', dominioMin: 50 } },

  { id: 'obstinado',        metal: 'prata', secreta: true, nome: 'Obstinado',
    descricao: 'A mesma matéria, sete dias seguidos.',
    condicao: { tipo: 'materiaSeguida', dias: 7 } },

  { id: 'especialista',     metal: 'ouro', secreta: true, nome: 'Especialista',
    descricao: 'A mesma matéria, trinta dias seguidos.',
    condicao: { tipo: 'materiaSeguida', dias: 30 } },

  { id: 'cinco_turnos',     metal: 'ouro', secreta: true, nome: 'Guarda Permanente',
    descricao: 'Cinco sessões separadas no mesmo dia.',
    condicao: { tipo: 'sessoesNoDia', quantas: 5 } },

  { id: 'pomodoro_fiel',    metal: 'prata', secreta: true, nome: 'Método',
    descricao: 'Cinquenta sessões em pomodoro.',
    condicao: { tipo: 'modo', modo: 'pomodoro', vezes: 50 } },

  { id: 'ano_de_farda',     metal: 'ouro', secreta: true, nome: 'Um Ano de Farda',
    descricao: 'Estudou em doze meses diferentes.',
    condicao: { tipo: 'meses', min: 12 } },

  { id: 'cem_dias_est',     metal: 'ouro', secreta: true, nome: 'Cem Dias de Serviço',
    descricao: 'Cem dias diferentes com estudo registrado.',
    condicao: { tipo: 'diasEstudados', min: 100 } },

  { id: 'madrugada_dupla',  metal: 'ouro', secreta: true, nome: 'Duas Pontas do Dia',
    descricao: 'Vinte sessões antes das 6 da manhã.',
    condicao: { tipo: 'horario', deHora: 4, ateHora: 6, vezes: 20 } },

  { id: 'quinhentas_horas', metal: 'ouro', secreta: true, nome: 'Quinhentas Horas',
    descricao: 'Quinhentas horas de estudo acumuladas.',
    condicao: { tipo: 'horas', min: 500 } },
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
  // ── Por matéria dominada (70%) ──────────────────────────────────────────
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

  { id: 'administrador', nome: 'Administrador de Elite', raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Administração acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['administração'], dominioMin: 70 } },

  { id: 'legislador',   nome: 'Legislador',        raridade: 'incomum', cor: 'var(--latao-c)',
    comoGanha: 'Legislação acima de 70% de domínio',
    condicao: { tipo: 'materiaDominada', materias: ['legislação', 'legislação especial'], dominioMin: 70 } },

  // ── Por hábito — vêm dos atributos da ficha ────────────────────────────
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

  { id: 'veterano',     nome: 'Veterano',          raridade: 'rara',    cor: 'var(--latao)',
    comoGanha: 'Cem horas de estudo',
    condicao: { tipo: 'horas', min: 100 } },

  { id: 'inquebrantavel', nome: 'Inquebrantável',  raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'Cem dias seguidos de estudo',
    condicao: { tipo: 'streak', min: 100 } },

  // ── Por condecoração — a tag que vem junto com a medalha ───────────────
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

  { id: 'obstinado',    nome: 'Obstinado',         raridade: 'rara',    cor: 'var(--oliva)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'obstinado' } },

  { id: 'especialista', nome: 'Especialista',      raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'especialista' } },

  { id: 'travessia',    nome: 'Travessia',         raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'maratona_dupla' } },

  { id: 'metodo',       nome: 'Método',            raridade: 'rara',    cor: 'var(--oliva)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'pomodoro_fiel' } },

  { id: 'sem_brecha',   nome: 'Sem Brecha',        raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'quatro_perfeitas' } },

  { id: 'ano_farda',    nome: 'Um Ano de Farda',   raridade: 'lendaria', cor: 'var(--papel)',
    comoGanha: 'secreta',  secreta: true,
    condicao: { tipo: 'condecoracao', id: 'ano_de_farda' } },

  // ── A última ───────────────────────────────────────────────────────────
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
