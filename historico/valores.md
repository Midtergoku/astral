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

> O que manda é o **número de páginas**, não o concurso. Um PDF escaneado (imagem) fica no topo da
> faixa; um PDF de texto, na parte de baixo.

---

## 4. Guia de estudo — quanto custa por matéria

Por matéria: até 2 buscas (US$ 0,02) + o que a busca traz entra como entrada (~10 a 15 mil tokens)
+ a resposta (~1.200 tokens, teto 2.500).

| Caso | O que acontece | **Custo por matéria** |
|---|---|---|
| **Normal** | uma rodada, busca e resposta | **~R$ 0,45** |
| **Pior caso** | a IA "pausa" a busca e o Astral retoma 2 vezes (cada retomada reenvia tudo) | **até ~R$ 1,90** |

---

## 5. 🎖️ A tabela por concurso militar

**Leitura do edital** calculada com **60 páginas** (o meio da faixa — ⚠️ o tamanho real de cada
edital **ainda não foi medido**; a coluna "Páginas" fica "a medir" até eu baixar cada um).
**Guia** = matérias × R$ 0,45 (normal) — o pior caso está na última coluna.

| Força | Concurso | Matérias da prova (típico) | Páginas | Leitura do edital | Guia de estudo | **Total por aluno** | Pior caso |
|---|---|---|---|---|---|---|---|
| Aeronáutica | **EEAR — CFS** (sargento) | 4 — Português, Inglês, Matemática, Física | a medir | R$ 1,60–3,10 | R$ 1,80 | **R$ 3,40–4,90** | R$ 10,70 |
| Aeronáutica | **EEAR — EAGS** (sargento, áreas técnicas/saúde) | 2–3 — Português + conhecimentos da área | a medir | R$ 1,60–3,10 | R$ 0,90–1,35 | **R$ 2,50–4,45** | R$ 8,80 |
| Aeronáutica | **EPCAR** (preparatória de cadetes) | 3 — Português, Matemática, Inglês | a medir | R$ 1,60–3,10 | R$ 1,35 | **R$ 2,95–4,45** | R$ 8,80 |
| Aeronáutica | **AFA** (oficial aviador) | 4–5 — Português, Matemática, Física, Inglês (+ redação) | a medir | R$ 1,60–3,10 | R$ 1,80–2,25 | **R$ 3,40–5,35** | R$ 12,60 |
| Aeronáutica | **CIAAR** (oficiais de apoio/saúde) | 2–3 — Português + área | a medir | R$ 1,60–3,10 | R$ 0,90–1,35 | **R$ 2,50–4,45** | R$ 8,80 |
| Aeronáutica | **ITA** | 5 — Matemática, Física, Química, Português, Inglês | a medir | R$ 1,60–3,10 | R$ 2,25 | **R$ 3,85–5,35** | R$ 12,60 |
| Exército | **ESA** (sargento — CFGS) | 5 — Matemática, Português, História, Geografia, Inglês | a medir | R$ 1,60–3,10 | R$ 2,25 | **R$ 3,85–5,35** | R$ 12,60 |
| Exército | **EsPCEx** (cadetes) | 7 — Português, Matemática, Física, Química, História, Geografia, Inglês | a medir | R$ 1,60–3,10 | R$ 3,15 | **R$ 4,75–6,25** | R$ 16,40 |
| Exército | **IME** | 5 — Matemática, Física, Química, Português, Inglês | a medir | R$ 1,60–3,10 | R$ 2,25 | **R$ 3,85–5,35** | R$ 12,60 |
| Marinha | **EAM** (aprendiz-marinheiro) | 4 — Matemática, Português, Ciências, Inglês | a medir | R$ 1,60–3,10 | R$ 1,80 | **R$ 3,40–4,90** | R$ 10,70 |
| Marinha | **Colégio Naval** | 5 — Matemática, Português, Inglês, Ciências, Estudos Sociais | a medir | R$ 1,60–3,10 | R$ 2,25 | **R$ 3,85–5,35** | R$ 12,60 |
| Marinha | **Escola Naval** | 4–5 — Matemática, Física, Português, Inglês (+ redação) | a medir | R$ 1,60–3,10 | R$ 1,80–2,25 | **R$ 3,40–5,35** | R$ 12,60 |
| Marinha | **CFN** (soldado fuzileiro naval) | 4 — Matemática, Português, Ciências, Estudos Sociais | a medir | R$ 1,60–3,10 | R$ 1,80 | **R$ 3,40–4,90** | R$ 10,70 |
| Marinha Mercante | **EFOMM** | 4 — Matemática, Física, Português, Inglês | a medir | R$ 1,60–3,10 | R$ 1,80 | **R$ 3,40–4,90** | R$ 10,70 |
| Estadual | **Polícia Militar** (soldado) | 6–9 — Português, Matemática, Informática, Legislação, Direitos Humanos, Conhecimentos gerais… | a medir | R$ 1,60–3,10 | R$ 2,70–4,05 | **R$ 4,30–7,15** | R$ 20,20 |
| Estadual | **Bombeiro Militar** (soldado) | 7–9 — Português, Matemática, Física, Química, Biologia, História, Geografia… | a medir | R$ 1,60–3,10 | R$ 3,15–4,05 | **R$ 4,75–7,15** | R$ 20,20 |

> ⚠️ **As matérias acima são a estrutura TÍPICA da prova, de memória — não foram conferidas no
> edital de cada ano.** A banca muda de um ano para o outro. Para o custo o que importa é a
> quantidade, e ela está numa faixa estreita (2 a 9); mesmo errando por 2 matérias, a diferença é
> de ~R$ 1 por aluno.

### O resumo da tabela

- **Um aluno custa, uma vez só, entre ~R$ 2,50 e ~R$ 7** — conforme o tamanho do edital e o
  número de matérias. O maior custo é de **Polícia e Bombeiro** (muitas matérias).
- **Depois disso, ~R$ 0 por mês.** Tudo que ele usa no dia a dia é gratuito para o Astral.
- **Contra R$ 19,90 por mês**, o assinante se paga **no primeiro mês** no caso normal. No pior caso
  (R$ 20) ele **empata** com a primeira mensalidade — e ainda falta descontar a taxa do Mercado
  Pago, que não está medida aqui.

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
| 29/09/2026 | Criado. Estimativas pelos preços oficiais; páginas dos editais "a medir"; correção dos "R$ 6 por aluno" (eram só o guia) |
