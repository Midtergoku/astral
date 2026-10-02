# 💰 Valores — tudo o que é dinheiro no Astral

> Criado em 29/09/2026, a pedido dele: *"tudo relacionado a dinheiro daqui para frente você vai
> colocar nessa .md"*. **Regra: custo, preço, crédito, câmbio, cobrança — entra aqui.** Os
> números antigos continuam onde estavam (`decisoes.md` 10.4, `roadmap-ate-a-primeira-assinatura.md`
> Anexo B); este arquivo passa a ser o lugar onde se consulta e se atualiza.

---

## ⚠️ Antes de qualquer número: NADA disto foi medido ainda

A IA do Astral **nunca rodou de verdade com crédito**. A única vez (04/08/2026) foi um teste com
defeito que gastou os US$ 5 de uma vez e deixou a conta em −US$ 0,96 — e naquele dia ainda não se
gravava o custo de cada chamada. Então:

- os **R$ 0,99 por edital** e **R$ 0,68 por busca de professores** de `decisoes.md` são **conta de
  planilha**, apesar de a seção dizer "medido em 30/07" (ver a correção lá);
- tudo abaixo é **estimativa pelos preços oficiais**, com a fórmula aberta para conferir;
- **o primeiro edital real vai trocar estimativa por medição**: as duas funções de IA gravam no log
  o custo exato de cada chamada (`processar-edital custo` e `buscar-recursos custo`, com `custo_usd`
  calculado dos tokens que a própria Anthropic informa). **O primeiro número real entra aqui.**

---

## 1. Os preços de base

| Item | Preço | Fonte |
|---|---|---|
| Modelo `claude-sonnet-4-6` — entrada | **US$ 3,00** por 1 milhão de tokens | documentação oficial, conferida em 04/08/2026 |
| Modelo `claude-sonnet-4-6` — saída | **US$ 15,00** por 1 milhão de tokens | idem |
| Busca na web (usada pelo guia de estudo) | **US$ 10** por 1.000 buscas (US$ 0,01 cada) | idem |
| PDF enviado à IA | **~1.500 a 3.000 tokens por página** (texto + imagem da página) | idem |
| Câmbio usado nas contas | **US$ 1 = R$ 5,50** | ⚠️ **assumido**, não é a cotação do dia |

> 🔁 **Conferir de novo antes de pôr crédito**: preço e câmbio mudam. Quando conferir, trocar a
> linha acima e anotar a data.

---

## 2. O que gasta — são só DUAS coisas, e as duas acontecem UMA VEZ por aluno

| Ação | Quando acontece | Por que custa |
|---|---|---|
| **Leitura do edital** (`processar-edital`) | quando o aluno envia o PDF | a IA lê o PDF **inteiro** (até 150 páginas) e devolve matérias, pesos e data |
| **Guia de estudo** (`buscar-recursos`) | logo depois, sozinho, **uma vez por matéria** | a IA faz até 2 buscas na web por matéria e monta professores + materiais |
| Banco de questões, caderno de erros, cronograma, questionário de rotina, RPG | todo dia | **R$ 0** — nada disso chama IA |
| Aluno sobe a própria prova/gabarito | quando quiser | **R$ 0** — o PDF é lido no navegador dele (medido em 27/09) |
| Gerar questões por IA | — | **desligado desde 31/07** (era o único custo recorrente) |

> **Resposta à pergunta dele (29/09):** os "R$ 6 por aluno" que eu disse eram **só o guia de
> estudo** (9 matérias × R$ 0,68), **sem a leitura do edital**. A conta certa soma as duas —
> e está nas tabelas abaixo.

---

## 3. Leitura do edital — quanto custa por tamanho

**Fórmula:** páginas × (1.500 a 3.000 tokens) × US$ 3/milhão **+** ~1.500 tokens de instrução
**+** até 1.000 tokens de resposta × US$ 15/milhão.

| Tamanho do edital | Tokens de entrada | Custo (US$) | **Custo (R$)** |
|---|---|---|---|
| 30 páginas | 45 mil a 90 mil | 0,15 a 0,29 | **R$ 0,85 a 1,60** |
| 60 páginas | 90 mil a 180 mil | 0,29 a 0,56 | **R$ 1,60 a 3,10** |
| 100 páginas | 150 mil a 300 mil | 0,47 a 0,92 | **R$ 2,60 a 5,10** |
| 150 páginas (o teto do Astral) | 225 mil a 450 mil | 0,70 a 1,37 | **R$ 3,80 a 7,50** |

> O que manda é o **tamanho do PDF**, não o concurso. ✏️ **29/09, depois de medir:** conta o
> número de páginas **e** a quantidade de texto — a ESA tem 19 páginas densas de Diário Oficial e
> lê como um edital de ~50 páginas comuns. A fórmula exata está na seção 5.

---

## 4. Guia de estudo — quanto custa por matéria

Por matéria: até 2 buscas (US$ 0,02) + o que a busca traz entra como entrada (~10 a 15 mil tokens)
+ a resposta (~1.200 tokens, teto 2.500).

| Caso | O que acontece | **Custo por matéria** |
|---|---|---|
| **Normal** | uma rodada, busca e resposta | **~R$ 0,45** |
| **Pior caso** | a IA "pausa" a busca e o Astral retoma 2 vezes (cada retomada reenvia tudo) | **até ~R$ 1,90** |

---

## 5. 🎖️ A tabela por concurso militar — com os editais REAIS medidos (29/09/2026)

Baixei os editais oficiais e **medi** o número de páginas, a quantidade de texto e as matérias
da prova, lendo o próprio edital (não de memória). O que ainda é estimativa está marcado.

### Como se calcula a leitura de um edital

A IA recebe cada página duas vezes: o **texto** e a **imagem** da página. Então:

> tokens de entrada ≈ **caracteres ÷ 3,8** (o texto) **+ páginas × 1.600** (as imagens)
> custo = tokens × US$ 3/milhão **+** US$ 0,02 (instrução e resposta) → × R$ 5,50

O número de páginas sozinho engana: o edital da **ESA tem 19 páginas mas 258 mil caracteres**
(página de Diário Oficial, densa) — lê mais caro que um de 40 páginas espaçado.
⚠️ Os dois fatores (3,8 e 1.600) são a média da documentação; o custo real pode variar **±30%**.
**O primeiro edital lido de verdade confirma ou corrige isto** (o log grava o `custo_usd` exato).

### ✅ Edital medido — páginas, texto e matérias lidos no PDF oficial (o custo é calculado sobre eles)

| Força | Concurso (edital medido) | Páginas | Texto | Matérias da prova **(lidas no edital)** | Leitura do edital | Guia (normal) | **Total por aluno** | Pior caso |
|---|---|---|---|---|---|---|---|---|
| Aeronáutica | **EEAR — CFS 1/2026** | 79 | 172 mil car. | **4** — Português, Inglês, Matemática, Física | R$ 2,95 | R$ 1,80 | **R$ 4,75** | R$ 11,40 |
| Exército | **ESA** — edital no DOU | 19 | 258 mil car. | **5** — Matemática, Português (+ redação), História, Geografia, Inglês · Saúde e Música: **6** | R$ 1,75 | R$ 2,25 | **R$ 4,00** | R$ 11,75 |
| Exército | **ESA** — manual do candidato 2026 | 59 | 123 mil car. | (o mesmo concurso, se o aluno subir este PDF) | R$ 2,20 | R$ 2,25 | **R$ 4,45** | R$ 12,35 |
| Exército | **EsPCEx 2026** | 49 | 158 mil car. | **8** — Português, Redação, Física, Química, Matemática, Geografia, História, Inglês | R$ 2,10 | R$ 3,60 | **R$ 5,70** | R$ 17,90 |
| Marinha | **Colégio Naval 2026** | 49 | 153 mil car. | **6** — Matemática, Inglês, Estudos Sociais, Ciências, Português, Redação | R$ 2,05 | R$ 2,70 | **R$ 4,75** | R$ 14,10 |
| Marinha | **EAM 2026** | 65 | 189 mil car. | **4** — Matemática, Português, Ciências (Física e Química), Inglês | R$ 2,65 | R$ 1,80 | **R$ 4,45** | R$ 11,00 |
| Bombeiro | **CBMERJ 2024 — soldado (FGV)** | 43 | 128 mil car. | **11** — Português, Inglês, Literatura, Matemática, História, Geografia, Filosofia, Sociologia, Química, Física, Biologia | R$ 1,80 | R$ 4,95 | **R$ 6,75** | R$ 23,25 |
| Polícia | **PM-SP 2025 — soldado (Vunesp)** | 58 | 163 mil car. | **6** — Português, Matemática, Conhecimentos Gerais, Informática, Administração Pública, Redação | R$ 2,35 | R$ 2,70 | **R$ 5,05** | R$ 14,45 |

*Guia normal = matérias × R$ 0,45. Pior caso = leitura +30% e guia × R$ 1,90 por matéria.*

### ⏳ Ainda não medidos — estimados com um edital de 60 páginas

| Força | Concurso | Por que não medi | Matérias (típico, de memória) | **Total por aluno** | Pior caso |
|---|---|---|---|---|---|
| Aeronáutica | EEAR — CFS 1/2027 | o site da FAB recusou o download (erro 403) | 4 | ~R$ 4,75 (igual ao de 2026) | ~R$ 11,40 |
| Aeronáutica | **AFA 2027** | erro 403 no site da FAB | 4 + redação | ~R$ 4,50–5,50 | ~R$ 13 |
| Aeronáutica | **EPCAR / CPCAR 2027** | erro 403 no site da FAB | 3 + redação | ~R$ 4–5 | ~R$ 11 |
| Aeronáutica | EEAR — EAGS · CIAAR | não procurei ainda | 2–3 | ~R$ 3,50–4,50 | ~R$ 9 |
| Aeronáutica | ITA | não procurei ainda | 5 | ~R$ 5 | ~R$ 13 |
| Exército | IME | não procurei ainda | 5 | ~R$ 5 | ~R$ 13 |
| Marinha | Escola Naval · CFN · EFOMM | não procurei ainda | 4–5 | ~R$ 4,50–5 | ~R$ 13 |
| Estadual | outras PMs e Bombeiros | variam por estado e banca | 6–11 | **~R$ 5–7** | ~R$ 23 |

### O resumo da tabela

- **Calculado sobre o tamanho REAL dos editais: um aluno custa, uma vez só, entre R$ 4,00 e
  R$ 6,75** (caso normal). O tamanho e as matérias foram medidos; o custo ainda é conta — a IA
  nunca rodou com crédito.
- **Quem mais pesa é quem tem mais matérias**, não quem tem o edital maior: o **Bombeiro do Rio**
  (11 disciplinas) custa mais que a EEAR com 79 páginas. **O guia de estudo é a maior parte da
  conta** nos concursos de muitas matérias.
- **Depois disso, ~R$ 0 por mês.** Tudo que ele usa no dia a dia é gratuito para o Astral.
- **Contra R$ 19,90 por mês**, o assinante se paga **no primeiro mês** no caso normal. No pior caso
  (até R$ 23) ele **empata ou passa um pouco** da primeira mensalidade — e ainda falta descontar a
  taxa do Mercado Pago, que não está medida aqui.

### Os editais medidos (para conferir)

| Concurso | Endereço do PDF |
|---|---|
| EEAR CFS 1/2026 | https://ingresso.eear.fab.mil.br/SOO/editais/CFS%201%202026/ie.pdf |
| ESA (DOU) | https://cdn.direcaoconcursos.com.br/uploads/2025/03/edital-ESA.pdf |
| ESA (manual 2026) | https://esa.eb.mil.br/Manual_Do_Candidato_CA_2026_aos_CFGS_2027-2028.pdf |
| EsPCEx 2026 | https://arquivos.qconcursos.com/regulamento/arquivo/98581/espcex-2026-edital-n-2-edital.pdf |
| Colégio Naval 2026 | https://cdn.blog.estrategiavestibulares.com.br/vestibulares/wp-content/uploads/2026/04/Edital-CPACN-2026.pdf |
| EAM 2026 | https://cdn.blog.estrategiavestibulares.com.br/vestibulares/wp-content/uploads/2025/12/Edital-CPAEAM-2026.pdf |
| CBMERJ 2024 soldado | https://conhecimento.fgv.br/sites/default/files/concursos/edital-cbmerj-retificado-23.01.pdf |
| PM-SP 2025 soldado | https://cdn.direcaoconcursos.com.br/uploads/2025/09/edital-PMSP-Soldado.pdf |

---

## 6. Onde o custo pode escapar — riscos que conheço no código hoje

| Risco | O que acontece | Tamanho |
|---|---|---|
| **Trocar de edital** | o guia é refeito para TODAS as matérias do edital novo (o antigo não vale para outro concurso) | um aluno que troca 3 vezes custa ~3× |
| **Falha que se repete** | se a busca de uma matéria falhar, o dashboard tenta de novo na próxima visita — e resposta fora do formato já é repetida 1 vez na hora | cada falha paga pode se repetir |
| **Cota por dia, não por mês** | o grátis pode ler **2 editais por dia**; o Pro, 10 | quem abusasse leria ~60 editais/mês no grátis |
| **Cadastro que nunca volta** | o guia é gerado sozinho para todo aluno que sobe edital, mesmo quem nunca vai olhar | com 100 cadastros e 10 interessados, paga-se por 100 |

> Nenhum desses é defeito hoje — com zero créditos, nada é gasto. **Vira assunto no dia de pôr
> crédito.** A correção mais barata para os dois últimos é a janela mensal (já prevista em
> `.claude/rules/backend.md`) e gerar o guia só das 3 matérias mais pesadas de imediato
> (proposta de 04/08, ainda sem decisão dele).

---

## 7. Custos fixos (não dependem de aluno)

| Serviço | Plano | Custo hoje |
|---|---|---|
| Supabase (banco, login) | Free (500 MB) | **R$ 0** — o acervo de 1.980 questões ocupa ~2,4 MB |
| Vercel (site) | Hobby | **R$ 0** — ✏️ **29/09: só enquanto não cobra.** Hobby proíbe uso comercial; no lançamento, Pro a US$ 20/mês (seção 10) |
| Resend (e-mail) | Free | **R$ 0** — mas exige domínio próprio |
| Domínio `.com.br` | — | **~R$ 40 por ano** ⚠️ preço do Registro.br de memória, conferir |
| Anthropic (IA) | pré-pago | **R$ 0 enquanto não houver crédito** |

---

## 8. Quanto pôr de crédito, e quando

| Objetivo | Crédito | Rende |
|---|---|---|
| **Primeiro teste de verdade** (medir o custo real) | **US$ 5 (~R$ 28)** | ~4 a 8 alunos completos, pela estimativa |
| 10 beta testers | US$ 10 a 15 (~R$ 55 a 85) | gasto único |
| 50 alunos | US$ 25 a 65 (~R$ 140 a 360) | gasto único |

> **Ordem que eu recomendo:** pôr os US$ 5, processar **um** edital real e gerar o guia dele,
> ler o custo exato no log, e **atualizar este arquivo com o número medido** antes de qualquer
> outra decisão de preço.

---

## 9. 🧾 Simulação dos planos — mensal, trimestral e anual (29/09/2026)

Pedido dele: *"quero que você faça uma simulação de valores pros planos, pensei em mensal,
trimestral e anual"*. **Proposta minha — a decisão de preço é dele.**

### As taxas que entram na conta

| Item | Valor | Fonte |
|---|---|---|
| Mercado Pago — assinatura, recebendo **na hora** | **4,49%** por cobrança | pesquisa de 29/09 (blog do Mercado Pago e guias de taxa) — ⚠️ **conferir no painel dele antes de lançar** |
| Mercado Pago — assinatura, recebendo **em 30 dias** | **3,99%** | idem |
| IA do aluno (edital + guia), **uma vez** | ~**R$ 5,50** (faixa R$ 4 a 6,75) | seção 5 |

### A proposta

| | **Mensal** | **Trimestral** | **Anual** |
|---|---|---|---|
| Preço | **R$ 19,90** / mês | **R$ 49,90** a cada 3 meses | **R$ 179,90** por ano |
| Equivale a | R$ 19,90/mês | **R$ 16,63/mês** | **R$ 14,99/mês** |
| Desconto sobre o mensal | — | **16%** (≈ "2 semanas grátis") | **25%** (≈ "3 meses grátis") |
| Taxa do Mercado Pago (4,49%) | − R$ 0,89 | − R$ 2,24 | − R$ 8,08 |
| **Fica para o Astral, por cobrança** | **R$ 19,01** | **R$ 47,66** | **R$ 171,82** |
| Menos a IA do aluno (uma vez) | − R$ 5,50 no 1º mês | − R$ 5,50 | − R$ 5,50 |
| **Sobra por mês no 1º período** | **R$ 13,51** no 1º mês, **R$ 19,01** nos seguintes | **R$ 14,05**/mês | **R$ 13,86**/mês |

**Por que os três fazem sentido juntos:**
- o **mensal** é o que mais rende **se o aluno ficar** — em 12 meses dá R$ 222 contra R$ 166 do anual;
- o **anual** troca receita por **garantia**: o dinheiro entra de uma vez e o aluno não some no
  3º mês — e concurso militar tem ciclo de ~1 ano entre edital e prova, o que casa com o anual;
- o **trimestral** é a ponte para quem acha o anual caro mas não quer decidir todo mês.

> 💡 **Variante de lançamento:** anual a **R$ 149,90** (R$ 12,49/mês, 37% de desconto) só para os
> primeiros assinantes. Sobra R$ 137,67 no ano, ainda **~R$ 11/mês** depois da taxa e da IA.

### Quanto sobra no mês, por número de assinantes (todos no mensal)

| Assinantes | Receita | Taxa MP | Custo fixo (seção 10) | **Sobra no mês** |
|---|---|---|---|---|
| 10 | R$ 199 | − R$ 9 | − R$ 113 | **~R$ 77** |
| 50 | R$ 995 | − R$ 45 | − R$ 251 | **~R$ 700** |
| 100 | R$ 1.990 | − R$ 89 | − R$ 251 | **~R$ 1.650** |
| 500 | R$ 9.950 | − R$ 447 | − R$ 251 | **~R$ 9.250** |

⚠️ **Fora da conta, de propósito:** **imposto** (depende do enquadramento — pessoa física, MEI ou
empresa; é conversa com contador, não estimativa minha) e a **IA dos alunos NOVOS de cada mês**
(R$ 5,50 cada, uma vez — ver seção 11, que pode zerar isso).

**Ponto de equilíbrio:** com o custo fixo mínimo de lançamento (R$ 113/mês), **6 assinantes mensais
pagam a estrutura**. Com o banco no plano pago também (R$ 251/mês), **14**.

---

## 10. 🏗️ Custos fixos que aparecem NO DIA DE COBRAR (29/09/2026)

> 🔴 **Achado desta pesquisa: a Vercel não permite uso comercial no plano grátis.** A página de
> preços deles: *"Our Hobby plan is for personal, non-commercial use"*. No dia em que o Astral
> cobrar a primeira assinatura, o site **tem de estar no plano Pro — US$ 20/mês (~R$ 110)**. Não
> estava em nenhuma conta até hoje.

| Serviço | Hoje | No lançamento | Quando |
|---|---|---|---|
| **Vercel** (site) | grátis | **US$ 20/mês ≈ R$ 110** | **obrigatório** a partir da 1ª cobrança |
| **Supabase** (banco e login) | grátis | **US$ 25/mês ≈ R$ 138** | quando precisar: o grátis aguenta 500 MB e 50 mil usuários/mês, mas **pausa depois de 1 semana sem uso** e não faz backup (nós fazemos o nosso) |
| **Domínio** `.com.br` | — | ~R$ 40/ano ≈ **R$ 3,33/mês** | fase 6 do roadmap |
| **Resend** (e-mail) | — | grátis na faixa inicial | ⚠️ limite do plano grátis a conferir antes de ligar |
| **Anthropic** (IA) | R$ 0 | **pré-pago** — só gasta o que ele carregar | o teto real de gasto é o crédito colocado |
| **Mínimo para lançar** | | **≈ R$ 113/mês** (Vercel + domínio) | |
| **Com o banco pago** | | **≈ R$ 251/mês** | |

---

## 11. 🔒 A trava da troca de edital — PROPOSTA, aguarda a decisão dele (29/09/2026)

> Ele: *"na real precisamos pensar em uma trava para a pessoa não comer nossos créditos todos
> porque quer trocar o edital, eu não tinha pensado nisso."*

### O tamanho do buraco hoje (medido nas cotas do código)

| Plano | Leituras de edital por dia | Buscas do guia por dia | Pior caso por mês, **por pessoa** |
|---|---|---|---|
| Grátis | 2 | 12 | 60 editais + 360 buscas ≈ **R$ 300 a 340** |
| Pro | 10 | 60 | ≈ **R$ 1.500** |

Cada troca de edital refaz o **guia inteiro** (o guia de um concurso não serve para outro). E o
grátis — que não paga nada — é quem tem a porta mais larga em relação ao que rende.

> ⚠️ **Hoje o risco é zero** porque não há crédito na Anthropic: nada é gasto. **Vira real no dia
> de carregar crédito** — por isso a trava tem de entrar antes.

### As opções, da mais forte para a mais simples

| # | Trava | O que faz | Economia | Custo de fazer |
|---|---|---|---|---|
| 🥇 | **Edital compartilhado** | guarda o resultado da leitura pela "impressão digital" do PDF. O 2º aluno que subir **o mesmo edital** recebe na hora, sem IA | o edital da EsPCEx é o mesmo para milhares de alunos: **só o 1º paga** | R$ 0 · ~1 sessão |
| 🥇 | **Guia compartilhado por concurso** | os professores de "Matemática da EEAR" servem a todos os alunos da EEAR: gera uma vez, reusa | o guia é a **maior parte** do custo nos concursos de muitas matérias | R$ 0 · junto com o de cima |
| 🥈 | **Limite de troca** | grátis: a 1ª leitura + **1 troca a cada 30 dias**. Pro: **3 por 30 dias**. Troca para um edital já guardado **não conta** (não custa) | fecha o abuso de quem troca por trocar | R$ 0 · pequeno |
| 🥉 | **Cota mensal no lugar de diária** | o item 2.8 do roadmap: ninguém lê 10 editais por dia | fecha o pior caso da tabela acima | R$ 0 · pequeno |
| ➕ | **Alerta de gasto na Anthropic** | o painel deles avisa ao passar de um valor | rede de segurança | R$ 0 · 5 minutos **dele** no painel (item 2.9) |

**O que eu recomendo: as duas 🥇 + a 🥈.** Com o edital e o guia compartilhados, o gasto total de IA
deixa de crescer com o número de alunos e passa a crescer com o **número de editais diferentes** —
algumas dezenas por ano. **Estimativa:** ~15 concursos militares × R$ 5 a 7 ≈ **R$ 100 por ano de
IA, com 10 ou com 10 mil alunos.** O grátis passa a custar praticamente nada.

> ⚠️ Mudar limite de plano é decisão dele (regra 8.1). **Nada disto foi aplicado.** Os três itens
> são reversíveis e custam R$ 0 para fazer.

### ✅ APLICADA em 29/09/2026 — com as decisões dele

Ele respondeu à proposta: *"no Pro, duas trocas"*; o guia compartilhado *"certifique que seja do
mesmo edital"*; o edital compartilhado *"quero que ele tenha a experiência de jogar o edital dele
lá e aparecer que está sendo feito personalizado para ele"*.

| O que ficou | Como |
|---|---|
| **Edital guardado** | pela impressão digital (SHA-256) do PDF, tabela `editais_lidos`. O mesmo arquivo de novo: resultado na hora, **sem IA e sem contar na cota** |
| **Cara de feito na hora** | a tela segura o "lendo seu edital" por **12 s no mínimo**, com 5 etapas ("lendo o conteúdo programático… identificando as matérias… calculando o peso…"), venha da IA ou do guardado |
| ✏️ **30/09 — substituído** | decisão nova dele: **não simular a IA trabalhando**. O guardado aparece rápido (medido: 0,8 s) e seguem ~3,5 s de revelação com dados reais do edital. Custo: igual, R$ 0 — só muda a tela |
| **Guia do MESMO edital** | tabela `guias_por_edital`, chave = impressão digital + matéria. Outro PDF do mesmo concurso (retificado, do DOU) **não** compartilha |
| **Contra envenenamento** | o guia compartilhado só é gravado se a matéria **existe no edital guardado**, e o concurso da pergunta vem **do edital**, nunca do navegador |
| **Janela de 30 dias** | grátis: o 1º edital + **1 troca**; beta e Pro: o 1º + **2 trocas**. Edital já guardado não conta. Recusa **antes** da IA, dizendo a data em que libera |
| **Página Conta** | mostra "X de Y disponíveis nos próximos 30 dias" para editais |
| **Prova** | `tools/testa-trava-creditos.js` — **12 checagens, sem gastar crédito** (cada caso para antes da IA ou usa o guardado) |

**O efeito no custo:** o gasto de IA passa a crescer com o número de **editais diferentes**, não
com o número de alunos. Pior caso de uma pessoa por mês: grátis ≈ 2 editais novos (~R$ 5 a 7 de
edital + o guia deles), Pro ≈ 3 — e **só se forem editais que ninguém subiu antes**.

### Pergunta dele: o rebalanceamento de cronograma gasta dinheiro?

**Não — R$ 0.** O botão "Rebalancear cronograma" do Progresso é conta feita no navegador
(`assets/js/plano.js`), sem IA. E desde 28/09 o cronograma já se rebalanceia sozinho a cada visita
(`assets/js/cronograma.js` distribui o tempo pela necessidade de cada matéria).

> ✏️ **30/09/2026:** continua **R$ 0**. O domínio passou a ser medido no servidor (questões do
> Banco + tempo de estudo, SQL puro, sem IA), e o cronograma se rebalanceia **toda segunda** pelo
> domínio do início da semana.

---

## 12. O que custa o que entrou em 30/09/2026

| Peça | Custo | Medido? |
|---|---|---|
| Domínio medido pelo servidor | **R$ 0** — SQL, sem IA | sim: não chama IA nenhuma |
| Revisão espaçada (1, 7 e 30 dias) | **R$ 0** — conta no navegador sobre as sessões | sim |
| Cartão da divisa para stories | **R$ 0** — desenhado no navegador | sim |
| Conferidor de links do guia | **R$ 0** — sem chave de API; ~2 s a mais por guia | sim (12/12 no servidor) |
| TAF: registro de marcas e XP físico | **R$ 0** — banco | sim |
| **TAF lido do edital pela IA** | **+~100 a 150 tokens de saída por edital ≈ US$ 0,002 (R$ 0,01)** | ⚠️ **estimativa**: a IA nunca rodou. O teto da resposta subiu de 1.000 para 1.500 tokens, mas teto não cobra — paga-se só o usado |

---

## 13. 🧯 O teto global de IA por dia (02/10/2026 — Lote 1 da auditoria, item 1.4)

Antes, os limites eram **por conta**: quem criasse contas multiplicava o gasto. Agora há um teto
para **o Astral inteiro**, por dia (fuso de SP), em `public.teto_global_de_ia()` — **um lugar só
para mudar**. Bateu no teto, a IA não é chamada e o aluno lê *"o Astral atingiu o limite de hoje"*.

| Função | Teto por dia | Custo unitário (estimativa, §3) | Pior dia possível |
|---|---|---|---|
| Ler edital | **10** | R$ 0,85 a 7,50 | **~R$ 8,50 a 75** |
| Guia (busca de professores) | **60** | ~R$ 0,68 (até ~R$ 1,90 se a busca pausar) | **~R$ 41 a 114** |
| Questões por IA | **100** (questões) | ~R$ 0,02 por questão | ~R$ 2 — e hoje **desligada** |

- ⚠️ **Os números são escolha minha, para ele confirmar.** Com crédito pré-pago de US$ 5 (~R$ 28),
  o próprio crédito acaba antes do teto num dia ruim — o teto protege é **depois** de pôr mais.
- Edital e guia **já guardados** (cache) não contam: não custam nada.
- **Junto (EDI-01):** leitura em que a IA **respondeu** e a resposta não serviu agora **conta** na
  janela de 30 dias do aluno. Antes, um PDF que não é edital custava 2 chamadas pagas e podia ser
  repetido sem fim. Falha **antes** da IA continua sem contar.
- O `checa-saude` mostra o uso do dia contra o teto e falha se bater.

---

## 📒 Registro de mudanças deste arquivo

| Data | O que mudou |
|---|---|
| 29/09/2026 | Criado. Estimativas pelos preços oficiais; correção dos "R$ 6 por aluno" (eram só o guia) |
| 29/09/2026 | Seções 9 (planos mensal/trimestral/anual), 10 (custos fixos do lançamento — **Vercel obrigatória no Pro para cobrar**) e 11 (a trava da troca de edital, proposta) |
| 29/09/2026 | **8 editais reais medidos** (páginas, texto, matérias lidas no edital). Custo por aluno calculado sobre eles: **R$ 4,00 a R$ 6,75** (ainda estimativa: a IA não rodou). Descoberta: o Bombeiro do Rio tem 11 disciplinas — o guia pesa mais que o edital |
| 30/09/2026 | §11: a "cara de feito na hora" (12 s) saiu, decisão dele. §12 novo: o custo das peças de 30/09 — tudo R$ 0, exceto o TAF lido do edital (~R$ 0,01 por edital, estimado) |
| 02/10/2026 | §13 novo: o teto global de IA por dia (10 editais, 60 guias, 100 questões) e a leitura que falha depois de a IA responder passando a contar. Backup diário agendado no PC: R$ 0, ~2 MB por cópia (~730 MB/ano) |
