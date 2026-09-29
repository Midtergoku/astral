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
| Vercel (site) | Hobby | **R$ 0** |
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

## 📒 Registro de mudanças deste arquivo

| Data | O que mudou |
|---|---|
| 29/09/2026 | Criado. Estimativas pelos preços oficiais; correção dos "R$ 6 por aluno" (eram só o guia) |
| 29/09/2026 | **8 editais reais medidos** (páginas, texto, matérias lidas no edital). Custo por aluno calculado sobre eles: **R$ 4,00 a R$ 6,75** (ainda estimativa: a IA não rodou). Descoberta: o Bombeiro do Rio tem 11 disciplinas — o guia pesa mais que o edital |
