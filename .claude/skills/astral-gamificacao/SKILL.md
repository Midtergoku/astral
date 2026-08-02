---
name: astral-gamificacao
description: "Use ao mexer em tag, nivel, patente, quest, conquista secreta, XP, badge ou habilidade oculta do Astral. Le ANTES de tratar qualquer coisa da gamificacao como bug: varias sao deliberadas."
---

# Gamificacao do Astral

> Skill: carrega em tarefa de gamificacao.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

## 6. Gamificação

- **Patentes dinâmicas** por tipo de concurso, detectado por palavra-chave no nome do edital
  (`detectarTipoConcurso()` em [dashboard.html:1030](dashboard.html#L1030)).
  Tabelas: bombeiros, marinha, aeronautica, exercito, pm, default — 11 níveis cada, 0 → 35.000 XP.
- **XP:** sessão marcada = `peso × 5` | cronômetro = 2 XP/min | questão certa = 15 XP
- **Badges:** primeiro_dia, primeira_hora, sequencia_3, sequencia_7, nivel_3, nivel_5,
  primeiro_edital, maratonista
- **Habilidades ocultas:** desbloqueiam com domínio ≥ 70% na matéria
  (ex.: Português → "Orador de Guerra"). Degradam: 7d sem estudar = enferrujada, 14d = suspensa.
- Confete + banner de level up já implementados no dashboard.

---

---

## 9.2. A TAG e a gamificação — o V7 detalhado (01/08/2026)

> Ordem do Lucas: *"vamos aprofundar mais ela já também... quero acrescentar mais também, mexer
> mais nessa gamificação do site"*. O V7 era uma linha na tabela; virou esta seção.

> 🔴 **ESTA SEÇÃO FOI REESCRITA EM 01/08/2026, no mesmo dia, porque a primeira versão estava
> errada em três pontos.** Eu tinha encontrado as habilidades no código e concluído que estavam
> na página errada, trancadas por engano, e que eram "a tag". **Nada disso.** As correções dele
> estão em 9.2.1; o texto abaixo já está corrigido. As três linhas de erro foram para a 0.1.

### Os TRÊS sistemas, que eu tinha juntado num só

> *"Tag é tag, nível é nível."* — Lucas, 01/08/2026, corrigindo o relatório anterior

| Sistema | O que mede | De onde vem | Onde aparece |
|---|---|---|---|
| **NÍVEL** (patente) | **quanto** você estudou — XP acumulado | automático; muda conforme o **edital** (bombeiro ≠ PM) | já existe, 11 níveis por força |
| **TAG** | **no que** você é | ganha, escolhe, veste | topbar, no lugar do badge de plano |
| **CONQUISTA SECRETA** | descoberta | escondida até disparar | `conquistas.html` — **e está certo assim** |
| **QUEST** | tarefa cumprida | *"se estudar tanto, libera isso"* | a construir |

São quatro caixas separadas e **elas se alimentam**: cumprir uma quest ou descobrir um secreto
pode **entregar uma tag** — foi o que ele disse com *"você também pode colocar elas pra serem
tags"*. O que não pode é tratar tudo como a mesma coisa, que foi o meu erro.

### As conquistas secretas — eu chamei de bug, e é o oposto

O Lucas descreveu a tag assim:

> *"ali onde fica isso hoje, na página inicial, ali vai ter a tag dele (...) com a matéria que
> ele escolher, ele vai ser, sei lá, um mago, um piromante, um necromante, essas coisas assim.
> Não necessariamente isso, mas você consegue se basear mais ou menos nisso."*

**Isso está construído no código desde antes de eu chegar.** `HABILIDADES_MILITARES` em
[conquistas.html:465](conquistas.html#L465) — medido: **51 entradas**.

```
português          -> Orador de Guerra        matemática      -> Calculista
química            -> Alquimista              raciocínio lóg. -> Estrategista
biologia           -> Médico de Combate       informática     -> Operador Cyber
geografia          -> Navegador               física          -> Engenheiro de Campo
direito const.     -> Guardião da Lei         história        -> Memória da Nação
```

Cada uma tem nome, ícone e uma frase de personagem. Trancadas atrás de 70% de domínio
([conquistas.html:507](conquistas.html#L507): `if (progresso < 70) return 'bloqueada'`).

**Eu escrevi que isso era um defeito em três camadas** — página errada, tranca alta demais,
ninguém vê. **A resposta dele:**

> *"isso não são tags, isso aí são secretas (...) ela não está na página errada, ela está na
> página certa. (...) Ela foi feita pra ser secreta. Então só vou descobrir ela por acaso,
> então vai ser um pico de dopamina sim. 'Oh meu Deus, descobri uma!' Então é proposital."*

**Ele está certo, e a pesquisa que ele mandou fazer me contradiz diretamente:**

> *"Surprise rewards often create stronger dopamine responses than expected ones, and
> unexpected achievements can feel more satisfying than those deliberately pursued."*
> — [Simply Put Psych](https://simplyputpsych.co.uk/gaming-psych/3l1sb9syu0313770n7n3ip4e4u1x6b),
> [COGconnected](https://cogconnected.com/2025/10/gaming-achievement-dopamine-hits-and-their-real-effects/)

Ou seja: **a tranca não é o defeito, é o mecanismo.** Uma conquista anunciada de véspera vira
tarefa; uma que aparece sozinha vira surpresa. O valor está na descoberta.

> 🧠 **A lição, e ela é maior que este caso:** eu medi o código certo e **interpretei a
> intenção errado**. Achei algo que parecia quebrado e perguntei *"quem quebrou isso?"* em vez
> de *"por que fizeram assim?"*. A seção 11 já mandava perguntar antes de mexer em código
> antigo — eu não perguntei, concluí, e escrevi a conclusão errada no caderno como se fosse
> lição. **Instrução minha errada é pior que instrução nenhuma** (0.1), e eu quase repeti isso.
>
> Regra prática: **antes de chamar qualquer coisa de bug, escrever a frase "isto foi feito de
> propósito porque ____" e ver se ela fecha.** Aqui fechava.

**O que ele quer daqui pra frente:** *"eu também quero mais tags secretas, mas vou mexer nisso
mais pra frente"*. Fica registrado como pedido, não como tarefa aberta.

### O que o Lucas decidiu sobre o lugar da tag

| Onde | Hoje | Depois |
|---|---|---|
| **Topbar do dashboard** | badge `FREE` / `BETA` / `PRO` ([dashboard.html:1051](dashboard.html#L1051)) | **a tag do usuário** |
| **Minha conta** | card "Meu plano" com limites (8.13) | continua lá — **é o único lugar do plano** |

Ele foi explícito: *"lá onde hoje fica escrito free/profissional, eu não quero que aquilo fique
lá (...) ele vai saber se é free ou profissional [em Minha conta]"*. E: *"não precisa fazer isso
agora, vamos fazer depois."*

> 💡 **Por que isso é bom produto, e não só gosto:** o badge de plano é informação **da
> empresa para o usuário** ("você é o cliente barato"). A tag é informação **do usuário sobre
> ele mesmo** ("você é o Estrategista"). O lugar mais nobre da tela — canto superior, visto em
> toda página — estava ocupado pela menos interessante das duas. Trocar é ganho puro.
>
> Efeito colateral que vale dizer: some da cara do usuário `free` o lembrete permanente de que
> ele é free. Isso **não** enfraquece a conversão — o convite ao Pro continua onde ele decide
> (limite atingido, tela de conta), e sai de onde ele só atrapalha.

### Como se escreve a tag — regra dele, curta e literal

> *"Não quero que seja tipo 'eu sou'. Só vai estar lá assim: Estrategista. Não vai ter isso de
> 'eu sou'. Não tem."*

```
ERRADO   "Eu sou Estrategista"   "Voce e um Estrategista"   "Especialidade: Estrategista"
CERTO    ESTRATEGISTA
```

**A palavra sozinha.** Sem verbo, sem rótulo, sem frase. É insígnia, não legenda — e insígnia
não se explica. Vale para a tela e vale para o `estilo.html` do V1.

### O NÍVEL, que é outra coisa, e que já está pronto

> *"O nível vai ser essa parte recruta, e isso vai variar de edital pra edital, porque as
> patentes dos bombeiros é diferente das patentes do policial militar. (...) Se a pessoa subir
> um edital dos bombeiros, as patentes serão dos bombeiros. (...) Esse é o nome do nível dele:
> recruta. E aí no futuro ele vai subir para major, coronel."*

**Isso já funciona.** `detectarTipoConcurso()` lê o nome do edital e escolhe a tabela;
são 6 tabelas (bombeiros, marinha, aeronáutica, exército, PM, padrão) × 11 níveis, de 0 a
35.000 XP (seção 6). É exatamente o comportamento que ele descreveu — ele estava me explicando
uma coisa que ele mesmo pediu para outra IA e que **está construída e correta**.

O que **não** existe: o nível e a tag lado a lado, na topbar, como identificação.

```
NIVEL   quanto voce estudou    XP acumulado, muda conforme o edital   -> Recruta, Cabo BM, Major
TAG     no que voce e          ganha por quest / secreto / dominio    -> Estrategista, Sapador
```

Lidos juntos: **`RECRUTA · ESTRATEGISTA`**. Um é tempo de serviço, o outro é especialidade —
é assim que identificação militar de verdade funciona.

> ❓ **A única pergunta em aberto da tag, e eu não vou inventar a resposta:** o usuário que
> acabou de entrar **não tem tag nenhuma** — tag se ganha. O que aparece na topbar dele?
>
> Minha recomendação: **só o nível** (`RECRUTA`), e o espaço da tag vazio até ele conquistar a
> primeira. Motivo: se todo mundo já nasce com uma tag, ela deixa de valer alguma coisa — e o
> vazio ao lado do nível é, ele próprio, um convite. Mas isso é recomendação, não decisão.

### 🎖️ A decisão de estilo — militar, não fantasia

O Lucas citou *"mago, piromante, necromante"* e completou *"não necessariamente isso"*.
**Fico com o mundo militar**, e o motivo importa:

1. **Não cabe junto.** "Necromante Cabo BM" quebra os dois. As patentes são militares e são o
   esqueleto da gamificação — a tag tem de morar no mesmo mundo.
2. **O militar já tem classes, e são reais.** Sniper, Sapador, Calculista de Tiro,
   Comunicações, Inteligência, Mergulhador de Combate. São as "classes de RPG" de um mundo que
   **existe** — e o usuário está literalmente tentando entrar nele. É mais forte do que
   fantasia genérica, não mais fraco.
3. **Resolve o pedido central dele.** *"Menos cara de IA possível"*: IA nenhuma gera insígnia
   militar por padrão; gera mago e dragão o dia inteiro.
4. **Já está escrito.** 51 nomes prontos, com frase de personagem cada um.

**O que eu levo da ideia dele, porque é o que importa:** o *sabor*. "Mago" carrega orgulho e
especificidade — "eu sou ISSO". Os 51 nomes atuais entregam isso; alguns só precisam de mais
sangue no olho na revisão do V7.

> ↩️ **Reversível.** Se ele olhar pronto e preferir fantasia, é uma tabela de nomes — troca em
> uma tarde. O que não se troca barato é a paleta e a tipografia, e por isso a direção visual
> (V0/V1) vem antes desta decisão, não depois.

### O V7 destrinchado

| Passo | O quê | Depende de |
|---|---|---|
| ✅ **V7.1** | **NÍVEL + TAG nas 10 páginas** — feito em 02/08/2026 | — |
| ✅ **V7.2** | Badge de plano **saiu**; só existe em Minha conta — feito em 02/08 | — |
| **V7.3** | **Catálogo de tags** — muitas, por área de matéria. Ordem dele: *"eu quero várias (...) isso aí é com você também"* | — |
| **V7.4** | Sistema de **quests** — permanentes, nunca expiram (9.2.2) | V7.3 |
| **V7.5** | A tag como **divisa** (forma de galão/insígnia), não retângulo arredondado | V1 |
| **V7.6** | **Mais conquistas secretas** — *"vou mexer nisso mais pra frente"* | adiado por ele |
| **V7.7** | **Ranking pessoal** — você contra você, ver os dois avisos abaixo | V7.4 |

> 🔴 **Ranking é PESSOAL.** Ele disse isso em 30/07. Ranking entre usuários desmotiva quem está
> atrás, e a base é pequena demais para fazer sentido.

> 🔴 **Se o ranking der prêmio, desconto ou qualquer vantagem, o XP precisa ser validado no
> servidor ANTES** (8.19). Hoje qualquer um abre o console e escreve o XP que quiser. Enquanto
> for "você contra você", é autoengano e não faz mal a ninguém. No instante em que valer algo,
> vira fraude.

---

---

## 9.2.2. Quests — o que são, depois de eu errar e ele mandar pesquisar

Eu tinha proposto **missão semanal que expira no domingo**. A resposta:

> *"Não, esse negócio, a missão não some, entendeu? Não é isso que você está pensando.
> Quests são literalmente quests. Por exemplo: se você estudar tanto, você libera isso. Se
> você fizer isso, você vai liberar uma quest (...) tipo, se você estudar quinze minutos.
> Pesquisa, faz uma pesquisa sobre quests de jogos e conquistas recebidas por elas, você vai
> ter uma noção maior sobre o que é isso."*

### O que a pesquisa mostrou — e ela confirma ele, não a mim

| Achado | Fonte |
|---|---|
| *"Bootleg quests convert temporary pressure into **permanent rewards** — the user endures a challenge, hits a milestone, and unlocks a capability they **keep forever**"* | [Yu-kai Chou](https://yukaichou.com/gamification-analysis/quest-design-gamification-bootleg-quests-boss-fights/) |
| **Duolingo: Daily Quests → +25% de usuários ativos por dia** | [Strivecloud](https://www.strivecloud.io/play/duolingo) |
| Separar a manutenção do streak da meta diária → **+40%** de gente com 7 dias ou mais | [Orizon](https://www.orizon.co/blog/duolingos-gamification-secrets) |
| *"Surprise rewards often create **stronger dopamine responses** than expected ones"* | [Simply Put Psych](https://simplyputpsych.co.uk/gaming-psych/3l1sb9syu0313770n7n3ip4e4u1x6b) |
| Streak funciona por **aversão à perda**, não por prêmio: o medo de perder 10 dias pesa mais que qualquer recompensa | [AppStorys](https://appstorys.com/blog-Streaks-Milestones-Habit-Gamification) |

**A distinção que eu tinha embaralhado** — são coisas diferentes e o Astral quer a primeira:

| | Expira? | Exemplo | Serve para |
|---|---|---|---|
| **QUEST** ✅ o que ele pediu | ❌ **nunca** | "estude 15 min" → cumpriu, é seu para sempre | dar objetivo e entregar desbloqueio |
| Liga / desafio semanal | ✅ zera toda semana | ranking de XP da semana | competição — **ele não pediu** |
| Missão diária | ✅ some à meia-noite | "estude hoje" | frequência — cria culpa em quem falha |

> 🔴 **Missão que expira é dívida, não jogo.** Para um concurseiro que já vive com culpa de
> não ter estudado, uma tarefa que some sozinha e vira "você falhou" é o pior mecanismo
> possível. **Quest que espera** é o oposto: ela fica lá, e no dia em que ele volta, ela ainda
> está esperando. Isso é acolhimento, não cobrança — e é exatamente o que ele descreveu sem
> usar essas palavras.

### O formato que a pesquisa recomenda para o caso do Astral

```
QUEST = condicao verificavel  ->  desbloqueio permanente

  "Estude 15 minutos seguidos"           -> primeira quest, cumpre-se no dia 1
  "Complete 10 sessoes de uma materia"   -> desbloqueia a TAG daquela area
  "Estude 7 dias seguidos"               -> nivel de XP + insignia
  "Termine todas as sessoes da semana"   -> avanca uma etapa da cadeia
```

**Duas regras que saem da pesquisa e que valem escrever no código:**

1. **Encadear, não empilhar.** Quest fechada abre a próxima. Uma lista de 40 tarefas soltas
   paralisa; uma corrente onde só a próxima aparece puxa. É o *"se você fizer isso, você vai
   liberar uma quest"* que ele descreveu.
2. **A recompensa da quest é a TAG.** Assim os quatro sistemas se fecham: quest dá tag, tag
   aparece na topbar, nível sobe por XP, e o secreto continua sendo surpresa. Nenhum deles
   duplica o outro.

> ⚠️ **O que ainda não está definido:** a lista concreta de quests. A pesquisa deu o *formato*,
> não o *conteúdo*. Isso é V7.4 e vem depois do catálogo de tags — não faz sentido escrever a
> recompensa antes de existir o que recompensar.

---

## 9.2.3. O que foi construído no V7.1/7.2/7.5 (02/08/2026)

**`assets/js/divisa.js`** — a fonte única. As tabelas de patente moravam **dentro** do
`dashboard.html`; foram extraídas por script (não copiadas à mão: são 80 linhas onde um erro de
digitação passaria despercebido) e conferidas — **6 forças × 11 níveis**.

```
nivelDe(xp, edital)   -> { nome, indice, proximo, faltam, fracao, tipo }
tagDe(materias)       -> a materia mais dominada acima de 70%, ou null
proximaTag(materias)  -> o alvo mais proximo e quanto falta
divisaHTML(dados,esc) -> o HTML pronto, com o nome da materia escapado
aplicarDivisa(...)    -> preenche todo [data-divisa] da pagina
```

**Medido com o módulo real, não afirmado:**

| Entrada | Saída |
|---|---|
| 5.000 XP · edital "CBMERJ" | `3º Sargento BM` |
| 5.000 XP · edital "Polícia Militar SP" | `1º Sargento PM` |
| 40.000 XP · edital "Marinha do Brasil" | `Capitão-Tenente` |
| 82% em Português | tag `Orador de Guerra` |
| 45% em Matemática | sem tag · em formação `Calculista · 45%` |

**Os quatro estados existem e foram vistos na tela:** conquistada · em formação · recém-chegado
· enferrujada.

> ⚠️ **A armadilha que quase passou:** ao tirar o `#user-plan` da barra lateral, **6 páginas
> continuavam escrevendo nele por JS**. `planoEl.textContent = x` em `null` estoura e derruba
> **todo o resto do bloco** — inclusive o carregamento do nome do usuário, que vinha logo
> depois. 12 referências protegidas. Isso não apareceria lendo o HTML: o elemento sumiu de um
> trecho e a referência ficou em outro, no mesmo arquivo.

### A regra que fecha o sistema

**Tag se ganha.** Quem acabou de entrar vê só o nível e um espaço marcado *"sem especialidade"*.
Se todo mundo nascesse com tag, ela não valeria nada — e o vazio ao lado do nível é, ele
próprio, um convite.

**"Em formação" é a peça que impede o vazio de ser pior que o badge antigo.** `Calculista · 45%`
mostra o alvo **e** a distância. Um cadeado não mostra nem um nem outro.

---

## 9.2.4. MISSÃO ≠ CONQUISTA — definido pelo Lucas em 02/08/2026

Eu tinha perguntado se "Missões" e "Conquistas" eram a mesma coisa com dois nomes. **Não são.**
A resposta dele, com o exemplo que fecha a dúvida:

> *"A Sony da PlayStation, cada jogo dela tem várias conquistas. São missões que você
> desbloqueia e depois que você cumpre elas, você recebe uma conquista. Por exemplo, se você
> lavar a sua louça da sua casa, você está cumprindo uma missão. Depois que você completa ela,
> você desbloqueia uma conquista (...) é como se fosse uma medalha que você recebe e fica lá,
> por você ter completado isso."*

```
MISSAO      a TAREFA          "estude 15 minutos seguidos"      -> some da lista quando cumprida
CONQUISTA   a MEDALHA         "Primeira Sessao"                 -> FICA PARA SEMPRE na estante
```

**As duas existem e são telas diferentes:**

| | Missões | Conquistas |
|---|---|---|
| O que mostra | o que **fazer agora** | o que **já foi feito** |
| Ciclo de vida | sai da lista ao ser cumprida | **nunca sai** |
| Sentimento | objetivo | orgulho |
| Analogia dele | a louça na pia | o troféu na estante |

> 🔗 **É o que fecha os quatro sistemas:** cumprir a **missão** entrega a **conquista**; a
> conquista pode entregar a **tag**; a tag aparece na divisa ao lado do **nível**. Cada peça
> alimenta a seguinte e nenhuma duplica a outra.

> ⚠️ **Consequência imediata:** a `conquistas.html` de hoje tem título "Missões" e mostra
> conquistas. Está trocado. Mas **não corrigir isoladamente** — o Lucas disse *"vamos completar
> o V6 e depois eu vou olhando parte por parte"*. A tela de Missões ainda nem existe; renomear
> antes de construí-la só troca uma confusão por outra.
