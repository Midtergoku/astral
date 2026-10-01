# Auditoria pré-lançamento — Fase 3: integridade dos números (seção 5) e economia de gamificação (seção 6)

> **01/10/2026** · Só investigação: **nenhuma correção foi feita**.
>
> **Onde rodou.** Tudo no projeto de **desenvolvimento** (`astral-dev`, `vtluuezwfpqgryixaaea`,
> plano grátis, R$ 0), o mesmo da Fase 2, agora com o **acervo público copiado da produção**
> (1.980 questões publicadas e as 39 `materias_conhecidas` — só conteúdo de prova, nenhum dado
> de aluno). Na produção, nada foi lido nem gravado nesta fase. **Nenhuma chamada de IA.**
>
> **Como.** 10 usuários de teste com históricos conhecidos (os 8 da seção 13, mais `folga` e
> `farm`). Para cada um: (1) o **valor esperado**, calculado por um script meu que lê só as
> sessões brutas e **não usa nenhuma função do servidor**; (2) o valor que o **servidor**
> devolve, chamando as RPCs **como o próprio usuário**; (3) o que a **tela** mostra — as 9
> páginas principais abertas num navegador de verdade (Playwright), apontado para o dev,
> **72 páginas, 0 erros de JavaScript**. As condecorações foram conferidas pelo que a
> **descrição promete ao aluno**, não pelo que o código faz.

---

## Resumo por severidade

| | Quantos | Quais |
|---|---|---|
| **S0** | **0** | — |
| **S1** — quebra a confiança | **10** | NUM-01 Amplitude conta matéria fora do edital · NUM-02 cinco condecorações contradizem a própria descrição · NUM-03 o aviso de desequilíbrio afirma algo falso sobre o cronograma · NUM-04 cronômetro e cronograma contam a mesma sessão duas vezes · GAM-01 bônus da Instrução vale para o passado (patente sobe sem estudar, e desce no "Recomeçar") · GAM-02 tempo declarado vale como estudo para tudo (22 condecorações em 3 minutos) · GAM-03 o gabarito chega ao navegador antes da resposta · GAM-04 a folga que a rotina manda quebra a sequência · GAM-05 Platina e "Condecorado" impossíveis na prática · GAM-06 a lista de matérias do edital é do navegador |
| **S2** — atrapalha | **11** | NUM-05 fuso do aparelho × fuso de Brasília · NUM-06 sessão que passa da meia-noite · NUM-07 "31 dias nos últimos 30" · NUM-08 dois "domínios médios" · NUM-09 nove formatos de hora · NUM-10 estados vazios com números falsos · GAM-07 a escada de patentes depende do edital · GAM-08 4× de diferença de XP sem aviso · GAM-09 condecoração secreta revelada · GAM-10 sessão de 20 segundos mantém a sequência · GAM-11 cronômetro sem checagem de presença |
| **S3** — polimento | **5** | NUM-11 "estudada há 30 dias" · NUM-12 "Sua semana" com letras repetidas · NUM-13 tag "em formação" sem aviso · GAM-12 bônus empilhados até +150% · GAM-13 divisas impossíveis no "de 33" |
| **Redundâncias (6.2)** | 7 | RED-01 a RED-07 |
| **Nomes (6.3)** | 9 colisões | tabela na seção 6 |
| **PERGUNTAR AO LUCAS** | 6 | seção 8 |

**O que está CERTO, medido:** XP, horas, sequência atual e domínio por matéria **bateram com o
cálculo à mão nos 7 usuários com dados** (servidor = esperado = tela). Barra de XP, "x / y XP
neste posto", pontos de Instrução, preparo, contagem de condecorações e de divisas são
**iguais em todas as telas** (painel, Conquistas, Quadro, Minhas tags, Instrução) e iguais ao
servidor. O gráfico da semana é proporcional. "Pontos percentuais" está usado certo.

---

## 1. Os usuários de teste (seção 13) e os valores conferidos

| Usuário | Histórico semeado (fuso de SP) | Observação |
|---|---|---|
| `novo` | nada | — |
| `constante` | 45 dias seguidos (18/08 a 01/10), 3 sessões de 40 min por dia (2 h), as 9 matérias em rodízio, pomodoro · 30 questões de Português (24 certas) e 30 de Matemática (15 certas) | |
| `quebrou` | 32 dias seguidos (26/08 a 26/09), falhou 27/09, voltou 29 e 30/09 · 1 h por dia | |
| `sumido` | 20 dias (27/08 a 15/09), nada há 15 dias | |
| `desequilibrado` | 20 dias, só Português e Matemática (1 h cada) · 30 questões de Português, todas certas | |
| `fim_de_trial` | 1 sessão de 30 min ontem | **trial não existe no produto** (Fase 2, PAG-01): o usuário foi criado, o cenário é N/A |
| `trocou_edital` | Bombeiros (9 matérias) por 30 dias (22/08 a 20/09), depois trocou para EEAR/Aeronáutica (4 matérias, com Inglês) | |
| `madrugada` | 10 noites: Física 23h10→23h50 e Química 23h50→00h40 | |
| `folga` *(extra)* | 5 semanas obedecendo a rotina: segunda a sábado, domingo de folga | criado para testar a sequência |
| `farm` *(extra)* | nenhum estudo: só chamadas diretas ao servidor | criado para a seção 6.1 |

Sessões semeadas pela chave de serviço (único jeito de pôr data no passado — o gatilho de
confiança vale para o site, não para nós), sempre com o XP pela regra do cronômetro. O
progresso foi gravado **pelo próprio usuário** (`salvar_progresso`), então XP, horas,
sequência e domínio foram **recalculados pelo servidor**, como no uso real.

### Esperado × servidor × tela

| | XP | Horas | Seq. atual / melhor | Patente · barra | Domínio (esperado) | Preparo | Condecorações: descrição × gravadas |
|---|---|---|---|---|---|---|---|
| novo | 0 = 0 = 0 | 0 | 0 / 0 | Recruta · 0/500 | — | — | 0 × 0 ✅ |
| constante | 10.800 ✅ | 90 ✅ | 45 / 45 ✅ | Subtenente BM · 800/4.000 (20%) ✅ | Port 88 · Mat 70 · Leg 47 · demais 40 ✅ | 64 ✅ | **39 × 40** ❌ |
| quebrou | 4.080 ✅ | 34 ✅ | 2 / 32 ✅ | 3º Sgt BM · 1.580/2.000 (79%) ✅ | 16 / Leg 19 / Geo e Inf 12 ✅ | 41 ✅ | **28 × 27** ❌ |
| sumido | 2.400 ✅ | 20 ✅ | 0 / 20 ✅ | Cabo BM · 1.200/1.300 (92%) ✅ | 12 / 9 / 8 ✅ | 36 ✅ | **21 × 20** ❌ |
| desequilibrado | 4.800 ✅ | 40 ✅ | 20 / 20 ✅ | 2º Sgt BM · 300/2.500 (12%) ✅ | Port 100 · Mat 40 · demais 0 ✅ | 18 ✅ | **30 × 28** ❌ |
| fim_de_trial | 60 ✅ | 0,5 ✅ | 1 / 1 ✅ | Aluno-Soldado BM · 60/500 ✅ | Port 2 ✅ | 3 ✅ | 3 × 3 ✅ |
| trocou_edital | 3.600 ✅ | 30 ✅ | 0 / 30 ✅ | 3º Sargento (FAB) · 1.100/2.000 ✅ | Port/Mat/Fís 16 · Inglês 0 ✅ | **38 (esperado 31)** ❌ | 27 × 27, mas **2 trocadas** ❌ |
| madrugada | 1.800 ✅ | 15 ✅ | **11 / 11 (eram 10 noites)** ⚠️ | Cabo BM · 600/1.300 (46%) ✅ | Fís 27 · Quí 33 ✅ | 12 ✅ | 21 × 21, mas **2 trocadas** ❌ |
| folga | 3.600 | 30 | **4 / 6** ⚠️ | — | — | — | ver GAM-04 |

Conta de domínio, por exemplo (Português do `constante`): acervo ≥ 30 → Q = 24/30 × 1 = 0,8;
S = min(1, 600 min / 600) = 1 → 100 × (0,6 × 0,8 + 0,4 × 1) = **88**. Legislação (sem Banco)
= 70 × 600/900 = 46,7 → **47**. Ficha do `constante`: Disciplina = 30/20→1 × 66 + 45/7→1 × 34
= **100**; Resistência = 40/90 = **44**; Doutrina = (88+70+47+6×40)/9 = **49**; Precisão =
39/60 = **65**. Preparo = 0,7 × 49 + 0,3 × 100 = **64**. Todos iguais na tela.

---

## 2. Seção 5 — checklist da integridade dos números

| Pergunta | Resposta | Achado |
|---|---|---|
| Fonte única por número? | **Não.** O domínio tem duas (atual e o retrato de segunda-feira, `medida.semana`, que o cronograma usa); "hoje" tem duas (fuso do aparelho × fuso de Brasília); a média de domínio tem duas (simples na ficha, ponderada no Progresso). XP, horas e sequência têm uma só (servidor) ✅ | NUM-03, NUM-05, NUM-08 |
| Mesmo conceito, mesmo valor em todas as telas? | Condecorações, divisas, pontos, XP, horas, sequência: **sim**, nas 9 páginas × 8 usuários. Domínio da mesma matéria: **não** (painel 100%, cronograma trata como 40%). "Hoje": **não** fora de UTC−3 | NUM-03, NUM-05 |
| O rótulo descreve o cálculo? | **5 condecorações não**; "no mês" é janela de 30×24 h; "acima de 70%" é `>= 70`; "Sua semana" são os últimos 7 dias | NUM-02, NUM-07, NUM-12 |
| Barras proporcionais? | **Sim** — gráfico da semana (82 px = máximo, 46 px = 50 de 90 min), barra de XP (20%, 79%, 92%, 12%, 55%, 46% conferidas) | — |
| % × pontos percentuais? | **Certo** ("48 pontos percentuais atrás") | — |
| Média simples × ponderada? | Ficha, "Meio do Caminho" e Preparo usam **simples**; Progresso mostra **ponderada** (e a simples ao lado) | NUM-08 |
| Fuso de São Paulo? | Servidor: **sim**, em todas as funções. Navegador: **5 lugares usam o relógio do aparelho** | NUM-05 |
| 23h50 e meia-noite? | Sessão conta no dia em que **terminou** | NUM-06 |
| Sequência na folga, na troca de edital, na virada? | Folga planejada **quebra**; troca de edital **não mexe** (calendário) ✅; virada correta no fuso de SP ✅ | GAM-04 |
| Arredondamento, um padrão só? | **Nove formatos** de hora | NUM-09 |
| Estado zero orienta? | Em parte; há **números falsos desfocados** e "0/0 · medido pelo Banco" | NUM-10 |

### Métrica a métrica — fórmula atual · correta · consulta · resultado

| Métrica (onde) | Fórmula atual | Fórmula correta | Consulta de verificação | Resultado nos testes |
|---|---|---|---|---|
| XP (topo, painel) | soma das sessões × (1 + bônus **das especializações de hoje**), `xp_com_bonus` | bônus só nas sessões **depois** da escolha | `select sum(xp) from sessoes_estudo where usuario_id=…` (base) | base ✅ nos 7; com bônus: **+46% retroativo** (GAM-01) |
| Horas (painel, ficha) | `sum(segundos)/3600`, 1 casa | igual, só tempo **medido** em condecorações de "sessão seguida" | `select round(sum(segundos)/3600.0,1) …` | ✅ nos 7 |
| Sequência atual | ilhas de dias com sessão, terminando hoje/ontem, dia = **fim** da sessão | dia = **início**; dia de folga da rotina não quebra (a decidir) | `sequencia_do_usuario` × script | ✅ nos 7; madrugada 11 por 10 noites; folga nunca > 6 |
| Melhor sequência | `melhorSequencia` | igual | ilhas | ✅ 45/32/20/20/1/30/11 |
| Dias nos últimos 30 (ficha) | `criado_em >= now() - 30 dias` | 30 **datas** de calendário (hoje e as 29 anteriores) | simulação SQL na seção 3 | ✅ nos 7; **31 de 30 possível** (NUM-07) |
| Amplitude | matérias distintas tocadas em 30 dias ÷ matérias do edital | só matérias **do edital** | `count(distinct materia) … where lower(materia) in (edital)` | ❌ trocou_edital: **100** ("9 de 4"), correto 75 |
| Doutrina | média **simples** do domínio | a decidir (ponderada combina com o produto) | `avg(progresso)` | ✅ 49/15/9/16/0/12/7 (simples) |
| Precisão | acertos de primeira ÷ respondidas, ≥ 20 | igual | `minha_precisao()` | ✅ 65 (39/60), 100 (30/30) |
| Domínio por matéria | `dominio_formula` (60% Banco + 40% tempo; sem Banco até 70) | igual; Banco **sem gabarito no navegador** | `meu_dominio()` | ✅ todas as matérias dos 7 |
| Domínio ponderado / simples (Progresso) | Σ dom × peso ÷ Σ peso / média | igual | — | ✅ 55% / 49% (constante) |
| Preparo (chefe) | 0,7 × Doutrina + 0,3 × Amplitude | igual, com Amplitude certa | — | ✅ 64/41/36/18/3/12; trocou 38 (certo 31) |
| Patente e barra | `nivelDe(xp, edital, força)` | igual | — | ✅ nos 8 |
| Pontos de Instrução | degraus de XP **sem** bônus em 14 limiares | 1 por patente de verdade (a escada tem 14 patentes = 13 promoções) | `pontos_de_habilidade` | ✅ 6/3/2/4/0/3/2 (iguais tela × servidor) |
| Condecorações | `avaliar_condicao` sobre `fatos_do_usuario` | o que a descrição diz | script `f3-esperado.js` | ❌ 5 regras divergem (NUM-02) |
| Sua semana (painel) | últimos 7 dias, fuso do **aparelho** | fuso de SP | — | ✅ 14h/5h/0/14h/30min/0/9h50 em UTC−3; ❌ no Acre |
| Horas por semana (Progresso) | 8 semanas de segunda | igual | — | ✅ constante 12h+14h×5+8h = 90h; madrugada 9h40 + 5h20 |
| Diário | reprodução da história, dia = fim | dia = início | — | ✅ "45º dia seguido", "Trinta dias seguidos" em 16/09; ❌ "Primeira vez em Química" no dia errado |
| Cronômetro "hoje" | `setHours(0,0,0,0)` do aparelho | fuso de SP | — | ✅ em UTC−3; ❌ no Acre: **0 min** com a missão "cumprida" |
| Missões de hoje | `fatos_de_hoje` (servidor, SP) | igual | — | ✅ |
| "Faltam N dias" | `chefe.js` com relógio do aparelho | fuso de SP | — | ✅ 66 e 170 |

### Proposta: uma camada `user_stats` (sem implementar)

**Já existe 80% dela**: `fatos_do_usuario()` + `ficha_do_usuario()` + `meu_dominio()` + `xp_com_bonus()`
são calculadas no servidor e são a fonte do painel. O que falta é **trazer para dentro dela
o que hoje o navegador recalcula** e fixar as convenções num lugar só:

1. **Uma tabela-de-dias** (`dia_sp`, pelo **início** da sessão, `America/Sao_Paulo`): minutos
   medidos, minutos declarados, sessões, matérias. Sequência, dias nos últimos 30, semana,
   diário, revisão e "hoje" do cronômetro saem **dela** — o navegador para de usar o relógio
   do aparelho.
2. **Sequência com a regra da folga** (se o Lucas decidir assim — seção 8): dia da rotina
   marcado como folga não quebra.
3. **Amplitude e Doutrina só sobre as matérias do edital**, e um campo para cada média
   (simples e ponderada), com o nome dito na tela.
4. **XP em duas colunas gravadas**: base e bônus **no momento da sessão** — o bônus deixa
   de ser recalculado sobre o passado.
5. **Um formatador de horas** compartilhado (`assets/js/astral.js`), um padrão só.
6. **O domínio "da semana" com nome próprio** na tela do cronograma ("como você estava na
   segunda"), ou o cronograma passa a usar o atual.

---

## 3. Achados — números (seção 5)

### [NUM-01] Amplitude conta matérias que não são do edital
- **Severidade:** S1 · **Tipo:** BUG
- **Onde:** `supabase/migrations/20260928100000_xp_calculado_no_servidor.sql:227-228` e `:262-267` (`ficha_do_usuario`)
- **O que acontece:** conta `count(distinct materia)` de **qualquer** sessão dos últimos 30 dias e divide pelas matérias do edital. O `trocou_edital` (estudou as 9 do Bombeiros, hoje tem EEAR com 4, nunca estudou Inglês) vê **"AMPLITUDE 100 · 9 matéria(s) tocada(s) no mês, de 4 do edital"**, ganhou **Frente Ampla** ("nenhuma matéria do seu edital ficou esquecida") e a divisa **Batedor**, e o Preparo mostra **38** (o certo é 31). O servidor também aceita sessão de matéria fora do edital (`farm`: "Inglês" num edital de Bombeiros, HTTP 201).
- **O que deveria acontecer:** só matérias do edital atual entram; "9 de 4" não pode existir.
- **Evidência:** tela do `trocou_edital` (painel e RPC `fatos_do_usuario` como ele); `f3-esperado.js` dá 75.
- **Correção sugerida:** filtrar por `lower(materia) in (nomes do edital)`, como já faz `dominioMenosEstudada`.
- **Esforço:** P

### [NUM-02] Cinco condecorações fazem outra coisa do que dizem
- **Severidade:** S1 · **Tipo:** BUG / INCONSISTÊNCIA
- **Onde:** `assets/js/catalogo.js` (descrições) × `avaliar_condicao` (`20260930150000_…:199-296`) e `fatos_do_usuario`
- **O que acontece**, medido nos usuários de teste:

| Condecoração | A descrição diz | O código confere | Quem foi lesado ou premiado errado |
|---|---|---|---|
| **Relógio na Mão** | "Cinco sessões cronometradas de verdade" | só `modo = 'livre'` — **pomodoro não conta** | `constante` (135 sessões de pomodoro), `quebrou`, `sumido`, `desequilibrado`, `trocou_edital`: **não ganharam**. A **missão** de mesmo nome conta livre + pomodoro (`missoes.js:105-107`) |
| **Duas Frentes** | "Duas matérias diferentes no mesmo mês" | Amplitude ≥ 40 (num edital de 9, são **4** matérias) | `desequilibrado` e `madrugada` estudaram 2 no mês e **não ganharam** — e a ficha deles, na mesma tela, diz "2 matéria(s) tocada(s) no mês" |
| **Começo de Semana** | "Dez segundas-feiras estudadas" | 10 **sessões** em segundas | `constante` ganhou com **6** segundas (18 sessões) |
| **Domingo de Serviço** | "Dez domingos estudados" | 10 **sessões** em domingos | `constante` ganhou com **6** domingos |
| **Turno da Noite** (e a divisa) | "Cinco sessões **começadas** depois da meia-noite" | hora em que a sessão **terminou** (`criado_em`) | `madrugada` ganhou sem nenhuma sessão começada depois da meia-noite (todas começaram 23h10 ou 23h50). O mesmo vale para **Vigília** ("começadas antes das 6") |

- **O que deveria acontecer:** a regra é a da descrição, que é o que o aluno lê.
- **Evidência:** `f3-esperado.js` contra a tabela `conquistas` dos 8 usuários (seção 1).
- **Correção sugerida:** `modo in ('livre','pomodoro')`; `materiasNoMes >= 2`; contar **dias distintos** por dia da semana; hora de **início** (`criado_em - segundos`). As já concedidas por engano ficam (conquista é permanente) — decidir.
- **Esforço:** P

### [NUM-03] O aviso "Domínio desequilibrado" afirma uma coisa falsa sobre o cronograma
- **Severidade:** S1 · **Tipo:** INCONSISTÊNCIA / PROMESSA VAZIA
- **Onde:** `dashboard.html:2303` (frase fixa) × `assets/js/cronograma.js` (usa `medida.semana`)
- **O que acontece:** o painel do `desequilibrado` diz *"Física está 100 pontos percentuais atrás de Português. Pelo peso no edital, a que mais rende agora é Física — **e o cronograma desta semana já dá mais tempo a ela**"*. O cronograma dele dá **Português (100% de domínio) 2h00** e **Física (0%) 1h20**. No `constante`: Português (88%) 2h40, Física (40%) 1h20. A frase é texto fixo — ninguém confere. A causa: o cronograma usa o domínio "da semana" (retrato de segunda-feira, que **ignora as questões respondidas na semana**): para ele o Português do `desequilibrado` ainda vale 40%, não 100%. **A mesma matéria tem dois domínios no mesmo dia.**
- **O que deveria acontecer:** ou a frase é verdadeira (conferida), ou sai.
- **Evidência:** telas `dashboard` e `cronograma` dos dois usuários.
- **Correção sugerida:** a frase só aparece se a matéria-alvo de fato tem o maior tempo da semana; e o cronograma diz que usa "como você estava na segunda".
- **Esforço:** P

### [NUM-04] Cronômetro e cronograma não se enxergam: a mesma sessão conta duas vezes
- **Severidade:** S1 · **Tipo:** BUG
- **Onde:** `assets/js/cronograma.js:166-172` (`blocosDeHoje` só considera `modo = 'cronograma'`) · `dashboard.html:2501-2540` (`marcarFeito`)
- **O que acontece:** o `constante` estudou hoje exatamente os 3 blocos do dia (História, Geografia e Informática, 40 min cada) **pelo cronômetro** — que, desde 30/09, já vem com a próxima sessão do cronograma selecionada. O painel continua mostrando os 3 blocos **desmarcados**, convidando a marcar. Marcar grava **outra** sessão de 40 min: o tempo conta em dobro (horas, domínio, condecorações de horas) e o XP vira 80 + 20.
- **O que deveria acontecer:** sessão cronometrada da matéria do bloco marca o bloco.
- **Evidência:** captura do painel do `constante` (blocos vazios com as 3 sessões gravadas hoje); código citado.
- **Correção sugerida:** em `blocosDeHoje`, sessões medidas da mesma matéria também "pagam" o bloco.
- **Esforço:** P

### [NUM-05] Metade do site usa o relógio do aparelho, a outra metade o fuso de Brasília
- **Severidade:** S2 · **Tipo:** INCONSISTÊNCIA
- **Onde:** relógio do aparelho em `assets/js/estado.js:357` (sessões de hoje), `:379` e `:398` (semana), `assets/js/cronograma.js:162` (bloco de hoje), `assets/js/chefe.js:34` (dias até a prova). Servidor, `revisao.js` e `diario.js` usam UTC−3 fixo.
- **O que acontece:** abri o `madrugada` com o navegador no fuso do **Acre** (UTC−5). **No mesmo momento**, as Missões dizem *"Estude 50 minutos hoje — cumprida"* e o cronômetro diz *"HOJE 0m · 0 sessões"*; o gráfico da semana mostra hoje 0 min (em SP: 50 min). Seis estados ficam fora de UTC−3 (AC, AM, RO, RR, MT e MS).
- **O que deveria acontecer:** um "hoje" só.
- **Evidência:** `f3-tela-fuso.js` (Playwright com `timezoneId: America/Rio_Branco`).
- **Correção sugerida:** usar `diaDe()` de `revisao.js` (UTC−3) em todos, ou guardar o fuso do aluno.
- **Esforço:** M

### [NUM-06] Sessão que passa da meia-noite vai inteira para o dia seguinte
- **Severidade:** S2 · **Tipo:** INCONSISTÊNCIA
- **Onde:** `criado_em = now()` na gravação (`validar_sessao_estudo`) — é a hora do **fim**; todas as contas de dia usam `criado_em`.
- **O que acontece:** o `madrugada` estudou **10 noites** e tem **sequência de 11**; hoje (01/10) aparece como dia estudado por causa da Química 23h50→00h40 de ontem; o diário diz "Primeira vez em Química" em 22/09, mas ela começou em 21/09; o cronômetro conta 50 min "hoje". Pior caso: quem estuda às 20h numa noite e às 23h30→00h10 na outra **pula** um dia e **quebra** a sequência mesmo tendo estudado as duas noites.
- **O que deveria acontecer:** sessão conta no dia em que **começou** (é como o aluno pensa "a sessão de ontem à noite").
- **Correção sugerida:** dia = `(criado_em - segundos)` no fuso de SP, nas funções de dia (vale para Vigília/Turno da Noite também — NUM-02).
- **Esforço:** M

### [NUM-07] "31 dia(s) de estudo nos últimos 30"
- **Severidade:** S2 · **Tipo:** BUG
- **Onde:** `ficha_do_usuario` (`criado_em >= now() - interval '30 days'` contando **datas**)
- **O que acontece:** a janela é de 30×24 h, mas conta datas de calendário — pega um pedaço de 31 datas. Simulação no banco (31 dias seguidos, sessões às 19h50, agora 19h46): **`dias_nos_ultimos_30 = 31`**. A Amplitude diz "no mês", mas é a mesma janela de 30 dias (não o mês do calendário); "Dois Meses de Farda" usa mês do calendário.
- **Correção sugerida:** `dia_sp > hoje_sp - 30`. Rótulos: "nos últimos 30 dias" em todos.
- **Esforço:** P

### [NUM-08] Dois "domínios médios" diferentes para a mesma pessoa
- **Severidade:** S2 · **Tipo:** INCONSISTÊNCIA
- **Onde:** Doutrina (ficha, simples) × Progresso ("DOMÍNIO PELO PESO", ponderado) · `catalogo.js` "Meio do Caminho" (Doutrina) · `chefe.js` `preparoDe` (Doutrina)
- **O que acontece:** o `constante` tem **49%** na ficha ("domínio médio de 49%") e **55%** no Progresso. "Meio do Caminho — média de domínio de 50% no edital" está **trancada a 98%**, embora pela média ponderada (que o próprio produto apresenta como a certa, porque "o produto inteiro gira em torno de peso") ele já tenha 55%.
- **Correção sugerida:** escolher uma (a ponderada) para Doutrina, Preparo e as condecorações; a outra, se ficar, com nome próprio.
- **Esforço:** P

### [NUM-09] Nove formatos de hora
- **Severidade:** S2 · **Tipo:** INCONSISTÊNCIA
- **O que acontece:** na **mesma tela** do `fim_de_trial`: "TEMPO INVESTIDO **0.5h**" (ponto, à inglesa) e "Sua ficha · **0,5 h**". No site: `90h` · `90h00` · `9h50` · `2h0m` (cronômetro) · `50m` · `30min` · `0 min` · `0.5h` · `0,5 h`.
- **Correção sugerida:** um formatador só (`2h05`, `45 min`, vírgula decimal quando houver).
- **Esforço:** P

### [NUM-10] Estados vazios com números falsos e uma missão impossível
- **Severidade:** S2 · **Tipo:** UX
- **O que acontece** (usuário `novo`):
  - Painel: **"DOMÍNIO DO EDITAL 0/0 · medido pelo Banco"** sem edital.
  - Painel, "Sessão de hoje": prévia desfocada com **"Língua Portuguesa 45 min +50 XP"** (`dashboard.html:2378-2386`) — 45 min não dá 50 XP em nenhuma regra (cronograma dá 23; cronômetro, 90). Desfocado, mas está no texto da página (leitor de tela lê).
  - Progresso: prévia com **"TOTAL DE MATÉRIAS 12 · MAIS DE 50% 4 · MÉDIA GERAL 28%"** (`progresso.html:858-864`) — e com os rótulos antigos que a auditoria de 30/09 corrigiu na versão de verdade.
  - Missão do dia **"Marque uma sessão do cronograma como feita"** para quem não tem cronograma.
- **Correção sugerida:** zero vira "—" com frase; prévias com números coerentes (ou sem números); missão de cronograma só com cronograma.
- **Esforço:** P

---

## 4. Seção 6.1 — economia de gamificação

### Todas as fontes de XP

| Fonte | Quanto | Trava | Dá para farmar sem estudar? |
|---|---|---|---|
| Cronômetro (livre/pomodoro) | **2 XP por minuto** cheio | sessão ≤ tempo desde a última sessão medida + 2 min; < 1 min não grava pela tela | **Sim, deixando a aba aberta** — não há pergunta de presença (GAM-11). Abrir e fechar: 0 XP (testado: 20 s → 0) |
| Cronograma (marcar feito) | max(10, minutos ÷ 2) — **0,5 XP/min** | ≤ 4 h por sessão, ≤ 12 h por dia | **Sim, por definição**: 12 h declaradas = 360 XP/dia sem abrir livro (testado). Pela tela, só os blocos do dia |
| Bônus da Instrução | até **+150%** (3 ramos × 50%) | 1 ponto por degrau de XP sem bônus | **Sim: retroativo** (GAM-01) |
| TAF | 10 por prova por dia, **XP separado** | marca dentro de limites | não mexe na patente (decisão de 30/09, explicada na tela) |
| Questões do Banco | **0 XP** | — | — (dão domínio, ver GAM-03) |
| Missões, campanhas, condecorações | **0 XP** | — | — |

### Quanto um aluno ganha, e quando chega a cada patente (Bombeiros, a escada completa)

| Patente | XP | Cronômetro 2 h/dia, 6 dias (1.440/sem) | Só cronograma 2 h/dia (360/sem) | Cronômetro + bônus máximo (3.600/sem) |
|---|---|---|---|---|
| Soldado BM | 500 | 2 dias | 1,4 sem | 1 dia |
| 3º Sargento BM | 2.500 | 1,7 sem | 6,9 sem | 5 dias |
| Subtenente BM | 10.000 | 6,9 sem | 6,4 meses | 2,8 sem |
| Aspirante a Oficial BM | 14.000 | 2,2 meses | 9,0 meses | 3,9 sem |
| Capitão BM | 32.000 | 5,1 meses | 20,5 meses | 8,9 sem |
| **Coronel BM (topo)** | **70.000** | **11,2 meses** | **3,7 anos** | **4,5 meses** |

**Leitura:** a curva começa motivadora (patente nova a cada 1–2 semanas no primeiro mês) e
desacelera bem. O topo em ~11 meses para quem estuda 2 h/dia pelo cronômetro é razoável
para um ciclo de concurso. Os problemas são três: quem usa **só o cronograma** (o caminho
principal do produto) anda **4× mais devagar** sem que a tela diga (GAM-08); a escada
**encurta conforme o edital** (GAM-07); e o bônus pode **comprimir o topo para 4,5 meses**
e é **retroativo** (GAM-01).

### [GAM-01] O bônus da Instrução vale para o passado — a patente sobe sem estudar, e desce no "Recomeçar"
- **Severidade:** S1 · **Tipo:** BUG / INCONSISTÊNCIA
- **Onde:** `xp_com_bonus` (`20260920220000_arvore_de_habilidades.sql:144-196`) recalcula **todas** as sessões com as especializações **de hoje**; `esquecer_habilidades` (`:258-271`)
- **O que acontece**, medido no `constante` pelas mesmas RPCs da página Instrução:

| Momento | XP | Patente |
|---|---|---|
| antes | 10.800 | Subtenente BM |
| escolheu 6 especializações (Infantaria 1–4, Inteligência 1–2) e o painel salvou — **nenhum minuto estudado** | **15.756** | **Aspirante a Oficial BM** |
| "Recomeçar do zero" | 10.800 | **Subtenente BM (desceu)** |

  Conta à mão: 240 XP/dia × (2 × 1,15 + 4 × 1,20 + 8 × 1,30 + 15 × 1,45 + 16 × 1,65) = **15.756**, exato. O "Alvo Prioritário" (+20% na matéria de menor domínio) tem o mesmo defeito, e pior: quando a matéria mais fraca **muda**, o XP de **todas as sessões passadas** muda junto — sobe ou desce sem o aluno fazer nada. A condecoração "Dez Mil" continua gravada mesmo com o XP descendo (gravação é permanente).
- **O que deveria acontecer:** bônus vale da escolha em diante; patente não desce.
- **Correção sugerida:** gravar o bônus **na sessão**, no momento em que ela entra (`sessoes_estudo.xp_bonus`), e somar; "Recomeçar" só afeta o futuro.
- **Esforço:** M — **PERGUNTAR AO LUCAS** (seção 8): pode ter sido de propósito.

### [GAM-02] Tempo declarado vale como estudo para tudo: 22 condecorações em 3 minutos
- **Severidade:** S1 · **Tipo:** BUG (viola a regra 2 do próprio `catalogo.js`: *"nada se cumpre sem estudar"*)
- **Onde:** `validar_sessao_estudo` aceita até 4 h × 3 por dia de `modo = 'cronograma'`; `fatos_do_usuario` não distingue medido de declarado.
- **O que acontece:** o usuário `farm`, criado na hora, **sem estudar**, mandou direto ao servidor (o que qualquer um faz pelo console do navegador): 3 sessões de cronograma de 4 h (a 4ª foi recusada — a trava de 12 h funciona), 1 sessão de "Inglês" e 10 respostas. Entre a primeira e a última chamada: **2 min 45 s**. Resultado: **12,2 h**, **380 XP**, **22 condecorações** (3 de ouro: *Marcha Forçada* "uma sessão de três horas seguidas", *Travessia* "oito horas num único dia", *Fôlego de Combate* "duas horas seguidas"). Uma delas é **Frente Ampla** ("nenhuma matéria do seu edital ficou esquecida") com Matemática, do edital, **nunca estudada** — o "Inglês" de fora do edital entrou no lugar (NUM-01). Somando o "edital" de 1 matéria de GAM-06: **25 condecorações** (4 de ouro, com *Ninguém Fica Para Trás*) e **5 divisas** (2 **lendárias**: Marcha Forçada e Travessia; 1 rara: Incansável). Legislação foi a **56%** de domínio só com tempo declarado (12 h × 70/15 h) — a 70% (tag Legislador, "Terreno Tomado") em 15 h de cliques.
- **O que deveria acontecer:** condecoração de "sessão seguida", "horas no dia" e de resistência só com tempo **medido**; declarado conta com peso menor (já conta no XP) ou nem conta.
- **Correção sugerida:** `fatos_do_usuario` separa `maiorSessaoMedidaMin`/`horasMedidasNoDia`; o servidor só aceita sessão declarada que corresponda a um bloco do cronograma do dia (matéria e duração).
- **Esforço:** M

### [GAM-03] O gabarito chega ao navegador antes da resposta — o domínio infla sem aprender
- **Severidade:** S1 · **Tipo:** SEGURANÇA / BUG
- **Onde:** `sortear_questoes` (`20260927121000_sortear_devolve_tipo.sql`) devolve `'gabarito'` e `'explicacao'` junto com o enunciado
- **O que acontece:** o `farm` sorteou 10 questões de Português: **10 de 10 vieram com o gabarito**; respondendo com ele, **10/10 certas de primeira** → Português a **20%** em uma rodada. No plano grátis (10 por dia), 30 questões em 3 dias = os 60% do Banco cheios; com 10 h declaradas (GAM-02), **100%** sem ter lido nada. O domínio é a base de tags, Doutrina, Preparo, cronograma e de 8 condecorações. A trava do servidor (só responde questão servida, quem corrige é o servidor) está certa — o vazamento é a resposta ir antes.
- **O que deveria acontecer:** o gabarito e a explicação só voltam **depois** da resposta, pela própria `registrar_resposta`.
- **Esforço:** M (o `banco.html` mostra a explicação a partir do que já tem)

### [GAM-04] A folga que a rotina manda quebra a sequência — e tranca 15 recompensas
- **Severidade:** S1 · **Tipo:** INCONSISTÊNCIA
- **Onde:** `sequencia_do_usuario` e as ilhas de `fatos_do_usuario` contam dias do **calendário**; a rotina (`progresso.rotina.dias`) não entra.
- **O que acontece:** o `folga` obedeceu a rotina por 5 semanas (segunda a sábado, como o cronograma manda; o painel até diz *"Hoje é folga na sua rotina"*): **30 dias de estudo, sequência atual 4, melhor sequência 6**. Disciplina **85** — nunca chega a 100. Para quem tem um dia de folga por semana ficam **impossíveis 10 condecorações** — Semana Completa (7), Quinze, Trinta, Sessenta e Ferro em Brasa (100) Dias em Pé, Semana Sem Brecha, Mês Sem Brecha, Disciplina de Ferro, Ficha Impecável e a Platina — e **5 divisas**: Inabalável, Inquebrantável, Ferro em Brasa, Sem Brecha e Condecorado. As especializações Passo Constante, Pé Firme e Inquebrantável podem ser compradas, mas o bônus delas **nunca dispara**.
- **O que deveria acontecer:** decisão do Lucas (seção 8).
- **Esforço:** M

### [GAM-05] Platina e a divisa "Condecorado" são impossíveis na prática
- **Severidade:** S1 · **Tipo:** BUG / PROMESSA VAZIA ("como no PlayStation, platinar")
- **Onde:** `catalogo.js` (platina = todas as 73, **inclusive as secretas**, confirmado em `20260920230000_xp_validado_com_bonus.sql:52-58`)
- **O que acontece:** a platina exige ao mesmo tempo:
  1. **Doutrina Consolidada** (domínio médio 100%) — impossível em qualquer edital com uma matéria sem Banco, que trava em **70%** (migration `20260930130000`). O edital de teste do Bombeiros tem Legislação.
  2. **De Volta ao Posto** — **sumir 30 dias**. A platina obriga a abandonar o estudo por um mês.
  3. Sequência de **100 dias** (impossível com folga, GAM-04) e **doze meses** diferentes.
- **Correção sugerida:** Doutrina calculada só sobre matérias com Banco (ou "70% vale 100" nelas); tirar as de "retorno" da conta da platina.
- **Esforço:** P — **PERGUNTAR AO LUCAS** sobre a de retorno.

### [GAM-06] A lista de matérias do edital é do navegador
- **Severidade:** S1 · **Tipo:** SEGURANÇA / INCONSISTÊNCIA
- **Onde:** `salvar_progresso(p_edital, p_materias)` aceita a lista; o servidor recalcula o **domínio** de cada matéria, mas não **quais** matérias existem
- **O que acontece:** o `farm` gravou um "edital" de **1 matéria** (Legislação, 56%): Doutrina virou **56**, Amplitude **100** ("3 matéria(s) tocada(s) no mês, de 1 do edital"), e caíram **Meio do Caminho**, **Ninguém Fica Para Trás** (ouro) e **Virada de Jogo**. Também é o caminho para a Doutrina Consolidada que GAM-05 diz ser impossível de forma honesta.
- **O que deveria acontecer:** as matérias são as do edital lido pela IA (`editais_lidos`, que já existe desde `20260929140000`), não as que o navegador diz.
- **Esforço:** M

### [GAM-07] A escada de patentes depende do degrau inicial do edital
- **Severidade:** S2 · **Tipo:** INCONSISTÊNCIA
- **Onde:** `assets/js/divisa.js:225-272` (`nivelDe` corta a carreira no degrau do edital)
- **O que acontece:** com o mesmo XP, o topo chega em momentos muito diferentes:

| Edital | Degraus | Coronel (topo) com |
|---|---|---|
| Soldado BM / Exército / FAB sem patente inicial | 14 | 70.000 XP (~11 meses a 2 h/dia) |
| PM com "Soldado PM" · Marinha com "Marinheiro" | 13 | 55.000 |
| Exército com "Aluno-Sargento" | 12 | 42.000 |
| FAB/Exército com "3º Sargento" | 11 | 32.000 |
| Exército com **"Cadete"** | **8** | **14.000 XP (~10 semanas)** |

  Trocar de edital muda o posto com o mesmo XP (3.600 XP = 3º Sargento sem patente inicial; = **Suboficial** num edital da FAB de 3º Sargento). E os **pontos de Instrução** seguem a escada de XP de 14 limiares, não as patentes: em qualquer carreira o 14º ponto (90.000) **não tem patente** (`XP_POR_DEGRAU` tem 15 valores, as carreiras têm 14 nomes); no edital de Cadete os pontos continuam por 76.000 XP depois do topo; e com 12 especializações, os pontos 13 e 14 **não compram nada**. A tela diz "um ponto a cada patente".
- **Esforço:** M — **PERGUNTAR AO LUCAS**.

### [GAM-08] O cronograma dá 4× menos XP que o cronômetro, e a tela não conta
- **Severidade:** S2 · **Tipo:** UX
- **O que acontece:** o bloco de 40 min mostra **"+20 XP"**; os mesmos 40 min no cronômetro dão **80**. A diferença é **de propósito** (migration `20260928100000`: medido vale mais que declarado — a frase fecha), mas o aluno não sabe e o "XP POSSÍVEL · 360 + bônus" da semana subestima em 4× o que ele ganharia cronometrando.
- **Correção sugerida:** "+20 XP (ou +80 cronometrando)".
- **Esforço:** P

### [GAM-09] Uma condecoração secreta revelada pela página de tags
- **Severidade:** S2 · **Tipo:** BUG
- **O que acontece:** "Minhas tags" do `constante` lista, trancada e visível: **"REINTEGRADO · Voltar depois de mais de 14 dias sumido"** — o nome e a regra exatos da condecoração **secreta** "Reintegrado". Também: matéria sem nome de tag vira a tag **"Especialista"** (`divisa.js` `tagDe`), o mesmo nome de uma condecoração e de uma divisa **secretas**. O Quadro (`???`), a lista de condecorações e o "Falta pouco" escondem certo.
- **Correção sugerida:** a divisa "Reintegrado" vira secreta como as outras de condecoração; renomear a tag genérica.
- **Esforço:** P

### [GAM-10] Uma sessão de 20 segundos mantém a sequência
- **Severidade:** S2 · **Tipo:** INCONSISTÊNCIA
- **O que acontece:** o servidor aceitou uma sessão de **20 s** (`farm`, 0 XP, HTTP 201). Ela é uma linha em `sessoes_estudo` — conta como **dia estudado** (sequência, Disciplina) e como **sessão** (Pegando o Ritmo, Cem Formaturas, Guarda Permanente "cinco sessões no mesmo dia"). Pela tela o mínimo é 1 min (`cronometro.html:674`) — **1 minuto por dia sustenta a sequência**.
- **Correção sugerida:** o servidor recusa sessão < 1 min; "dia estudado" pede um mínimo (ex.: 15 min).
- **Esforço:** P

### [GAM-11] O cronômetro não pergunta se a pessoa ainda está lá
- **Severidade:** S2 · **Tipo:** FALTANDO
- **Onde:** `cronometro.html` (nenhuma checagem de presença, inatividade ou aba escondida); o servidor só exige que a sessão caiba no tempo desde a anterior
- **O que acontece:** medido no dev com o `farm`: **25 minutos parado, sem nada**, e uma sessão de pomodoro do tamanho inteiro foi **aceita (HTTP 201) com 48 XP**. É o que o servidor recebe de uma aba esquecida aberta. Na mesma conta, a noite toda (8 h) daria 960 XP — mais da metade do caminho de Recruta a Cabo.
- **Correção sugerida:** perguntar "ainda estudando?" a cada 50–60 min; pausar quando a aba fica escondida muito tempo.
- **Esforço:** P

### [GAM-12] Bônus empilhados até +150% (S3)
Cada ramo soma os seus degraus (Carga Dupla + Fogo Sustentado + Bateria Pesada valem juntos numa sessão de 90 min: +30%; com Barragem, +50%), e os três ramos somam: **+150%**. Com tudo, o topo cai de 11 para 4,5 meses. Não quebra, mas combinado com GAM-01 dá saltos grandes. Esforço P (teto ou só o maior degrau de cada ramo).

### [GAM-13] Divisas impossíveis no "de 33" (S3)
"Você tem 7 divisas conquistadas de 33" — o 33 inclui Intérprete, Guardião da Lei, Estrategista e Administrador de Elite (matérias que o edital de Bombeiros não tem) e Condecorado (GAM-05). A lista de trancadas já esconde as de matéria fora do edital; o total não. Esforço P.

### NUM-11, NUM-12, NUM-13 (S3)
- **NUM-11** "Revisão de hoje: Geografia · **estudada há 30 dias**" para quem estudou Geografia há 3 dias (o `revisao.js` escolhe o maior intervalo que bate). Verdade técnica, leitura errada.
- **NUM-12** "SUA SEMANA DE ESTUDO" são os últimos 7 dias corridos, com as letras **S S D S T Q Q** (três S e dois Q). No Cronograma e no domínio, "semana" é de segunda a domingo.
- **NUM-13** Quem ainda não tem tag vê **"LEGISLADOR · 19%"** no topo de toda página (borda tracejada, sem a palavra "em formação"); e a tag apontada é de uma matéria **sem Banco** — o contrário do "depender cada vez mais do banco".

### Respostas diretas às perguntas de 6.1

| Pergunta | Resposta |
|---|---|
| Fonte de XP sem estudar? | Sim: cronograma declarado (GAM-02), aba esquecida (GAM-11), escolha de especialização (GAM-01). Abrir e fechar o cronômetro: **não** (0 XP). Responder aleatório: **não dá XP**, mas dá domínio com o gabarito (GAM-03). Trocar edital para repetir conquista: **não** (conquista é por usuário, permanente) |
| XP por semana do aluno normal | 1.440 (cronômetro 2 h × 6 dias) ou 360 (só cronograma) |
| Pontos = 1 por patente? | Não exatamente (GAM-07). "Recomeçar" devolve **todos** os pontos (6 de 6, testado) — mas tira XP e patente (GAM-01) |
| Bônus quebram a economia? | Somados: +150% (GAM-12); o que quebra é a retroatividade (GAM-01) |
| Trocar edital/força | XP, sequência, horas e conquistas **ficam** ✅; domínio das matérias antigas **some** (é recalculado sobre as novas); patente troca de nome (mesmo degrau sem patente inicial); Amplitude infla (NUM-01) |
| Permanentes usam recorde? | Sequência: **sim** (`melhorSequencia`, desde 30/09) ✅. Horas e sessões: só crescem ✅. Patente: **pode descer** (GAM-01) |
| Secretas reveladas? | Uma, pela página de tags (GAM-09) |
| Conquista impossível no edital? | Sim: tags de Inglês/Direito/Raciocínio/Administração (escondidas na lista, contadas no total — GAM-13); Doutrina Consolidada e Platina (GAM-05) |
| Domínio inflável? | Sim, por três portas: gabarito (GAM-03), tempo declarado (GAM-02), lista de matérias (GAM-06) |

---

## 5. Seção 6.2 — redundâncias

| Par | Mesmo papel? | Mesmo gatilho? | Proposta |
|---|---|---|---|
| **RED-01** Tag por matéria (divisa) × Habilidade por matéria (Conquistas) | Sim | **Sim**: os mesmos 14 nomes, domínio ≥ 70 | **Fundir**: a tag ganha o estado "enferrujada" da habilidade; a seção de habilidades sai |
| **RED-02** Condecorações × Quadro de operações | Sim (o Quadro é outra vista das mesmas 74) | Sim | **Fundir** as páginas: Quadro vira uma aba de Conquistas (um item a menos no menu) |
| **RED-03** Atributo da ficha × condecoração × divisa × campanha | Sim | **Sim**, quatro vezes: Disciplina 60 = Ordem Unida + Atalaia; Disciplina 100 = Disciplina de Ferro + Inabalável; Resistência 60 = Fôlego + Sapador; Amplitude 100 = Frente Ampla + Batedor; a campanha Operação Constância pede Disciplina 80 | **Diferenciar**: a divisa vem **junto** com a condecoração (como já é com as secretas) — um gatilho, uma conquista, duas formas de mostrar |
| **RED-04** Missões do dia × condecorações | Não (diário × permanente) | Não — **mas com os mesmos nomes** e regras diferentes: Dois Turnos, Duas Frentes, Relógio na Mão, Turno da Noite | **Diferenciar** os nomes das missões |
| **RED-05** Marcos do diário × condecorações de sequência e horas | Parcial ("Sete dias seguidos" × Semana Completa) | Sim | **Manter**: o diário é história, não prêmio |
| **RED-06** Badges antigos (`progresso.badges`) | — | — | **Remover**: gravados, não mostrados desde 30/09; o painel ainda grava `primeiro_edital` |
| **RED-07** XP de estudo × XP de preparo físico (TAF) | Não | Não | **Diferenciar o nome** ("pontos de preparo"): a separação é de propósito e explicada, mas "XP" com dois sentidos confunde |

**Um usuário novo entende em 10 segundos?** Não: no painel ele vê patente, "Nível 7", "próximo
rank", tag, divisa, condecorações por metal, missões, campanha, ficha com 5 atributos e preparo —
**11 sistemas** na primeira tela, e 4 deles disparam no mesmo gatilho (RED-03).

## 6. Seção 6.3 — nomenclatura

**Termos com mais de um sentido:**

| Termo | Sentidos |
|---|---|
| patente / nível / rank / posto | a mesma coisa, com 4 nomes ("Subtenente BM · Nível 7 · próximo rank · XP neste posto") |
| **divisa** | o distintivo de patente + tag ("Compartilhar minha divisa", "NA SUA DIVISA") **e** a própria tag ("7 divisas conquistadas") |
| **habilidade** | por matéria (Conquistas) **e** a especialização da Instrução (arquivo `habilidades.html`, tabela `habilidades_escolhidas`) |
| conquista / condecoração | a página se chama "Conquistas"; o item, "condecoração" |
| missão / campanha / operação | três nomes para tarefas |
| **frente** | as 8 frentes do Quadro; Frente Ampla (condecoração **e** campanha, com regras diferentes); Frente Dupla e Frente Tripla; a missão "Duas frentes" |

**Nomes repetidos entre sistemas:**

| Nome | Onde aparece |
|---|---|
| **Frente Ampla** | condecoração (Amplitude 100) **e** campanha (nenhuma matéria abaixo de 50%) |
| **Resistência** | atributo da ficha **e** condecoração de prata |
| **Inquebrantável** | especialização (Infantaria 4) **e** divisa lendária |
| **Especialista** | tag genérica de matéria **e** condecoração e divisa secretas |
| **Relógio na Mão** | missão (livre + pomodoro) **e** condecoração (só livre) |
| **Turno da Noite** | missão (depois das 20 h) **e** condecoração/divisa secreta (depois da meia-noite) |
| Dois Turnos · Duas Frentes | missão **e** condecoração |
| Veterano × Veterano de Campo | divisa (100 h) × condecoração (30 sessões) |
| Marcha | frente do Quadro, Marcha Forçada, Marcha Firme, Marcha de Resistência |

Já resolvido em 30/09: Sentinela (condecoração) × Atalaia (divisa) ✅.

**Patentes por força** (as 6 carreiras, conferidas pela função `nivelDe`): a **ordem** está
correta dentro de cada círculo — Bombeiros e PM (Aluno-Soldado → Soldado → Cabo → 3º/2º/1º
Sargento → Subtenente → Aspirante → 2º/1º Tenente → Capitão → Major → Ten-Cel → Coronel),
Marinha (Grumete → Marinheiro → Cabo → Sargentos → **Suboficial** → **Guarda-Marinha** →
Tenentes → Capitão-Tenente → Corveta → Fragata → Mar e Guerra) e Aeronáutica
(**Suboficial**) usam os nomes próprios ✅. Duas ressalvas: **"Recruta"** não é posto (é
situação do soldado recém-incorporado); e a escada **atravessa de praça a oficial**
(Subtenente → Aspirante), o que na vida real não é promoção — exige outro concurso. É
simplificação de jogo; **PERGUNTAR AO LUCAS**.

---

## 7. PERGUNTAR AO LUCAS

1. **Folga planejada quebra a sequência?** (GAM-04) *Leitura A:* dia de folga da rotina não quebra — o produto premia quem obedece o plano que ele mesmo montou. *Leitura B:* sequência é calendário puro (como Duolingo) — então os textos e as recompensas de 7+ dias precisam dizer "sem folga".
2. **Bônus retroativo foi de propósito?** (GAM-01) *A:* bônus só da escolha em diante, patente nunca desce. *B:* manter retroativo e avisar antes de "Recomeçar" que a patente pode cair.
3. **A platina deve exigir sumir 30 dias?** (GAM-05) *A:* tirar "De Volta ao Posto" e "Reintegrado" da conta. *B:* manter (são secretas, achar é parte do jogo).
4. **Cronograma a 0,5 XP/min e cronômetro a 2 XP/min** (GAM-08) — manter os 4× e mostrar na tela, ou aproximar?
5. **A escada pelo degrau do edital** (GAM-07): quem faz um concurso de Cadete chegar a Coronel em ~10 semanas é o desejado?
6. **Praça vira oficial por XP** (6.3): manter a simplificação ou terminar a carreira de praças em Subtenente/Suboficial?

---

## 8. Seção 15 — antes de declarar a fase concluída

- **Percorri todos os itens?** Os 10 itens de 5, os 9 de 6.1, os pares de 6.2 e os 3 itens de 6.3, cada um com resposta na tabela correspondente. Não parei nos primeiros: os achados mais graves (GAM-01, GAM-02, NUM-04) apareceram depois das tabelas iniciais baterem.
- **Cada achado tem evidência?** Sim — usuário de teste, consulta ou captura de tela, e arquivo:linha.
- **Testei com dados ou só li o código?** Com dados: 10 usuários, 72 páginas abertas, 4 testes de ataque à economia (`f3-farm`, `f3-bonus`, `f3-edital1`, fuso do Acre). **Só por código** (sem teste dedicado): a mudança de "Alvo Prioritário" quando a matéria mais fraca troca (GAM-01, última frase), a soma dos pesos diferente de 100 no "vale P% da prova" do Progresso (a IA é instruída a somar perto de 100 e o servidor não normaliza — `processar-edital/index.ts:147,264-270`), e o caso de quebra de sequência por sessão depois da meia-noite em NUM-06 (o de dia extra foi medido).
- **Telas não abertas nesta fase:** `banco.html` (a rodada de questões e o "x/y" de acerto), `calendario.html`, `conta.html`, o cartão de stories e o anúncio de condecoração com confete. Os números delas vêm das mesmas fontes conferidas aqui, mas **não foram comparados na tela** — ficam para a Fase 4 (núcleo de estudo), que cobre Banco e Calendário.
- **Se o Lucas achar amanhã um problema desta área que não registrei, o motivo provável:** uma das telas acima, ou um número que depende de **dia da semana / horário** que os meus usuários não cobriram (todos estudaram em horários fixos).

---

## Como reproduzir

Os usuários continuam no **dev** (e-mails `f3-*@astral-teste.local`), para a Fase 4. Os
scripts são temporários (pasta de rascunho da sessão): `f3-semear.js` (os 8 usuários),
`f3-folga.js`, `f3-esperado.js` (o calculador independente), `f3-tela.js` /
`f3-tela-fuso.js` (as 72 páginas), `f3-bonus.js`, `f3-farm.js`, `f3-edital1.js`,
`f3-curva.mjs` e `f3-escadas.mjs`. Consultas usadas no texto:

```sql
-- XP base, horas e dias de um usuario (fuso de SP)
select sum(xp), round(sum(segundos)/3600.0, 1),
       count(distinct (criado_em at time zone 'America/Sao_Paulo')::date)
  from sessoes_estudo where usuario_id = '<id>';

-- "31 dias nos ultimos 30": 31 dias seguidos, sessoes as 19h50, agora 19h46
with s as (select ((now() at time zone 'America/Sao_Paulo')::date - k
                   + case when k = 0 then time '09:00' else time '19:50' end)
                  at time zone 'America/Sao_Paulo' as criado_em
             from generate_series(0, 30) k)
select count(distinct (criado_em at time zone 'America/Sao_Paulo')::date)
         filter (where criado_em >= now() - interval '30 days')
  from s;   -- 31
```
