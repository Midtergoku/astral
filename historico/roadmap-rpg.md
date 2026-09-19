# 🎲 Roadmap do RPG — o mapa de acompanhamento

> Criado em 18/09/2026 a pedido dele: *"só me dê de novo o roadmap bonitinho, para eu ver e
> analisar ele direitinho (...) com bolinhas vermelhas o que a gente não fez ainda. E conforme
> a gente for fazendo, vai dando check, com a bolinha verde."*
>
> **Este arquivo é o painel.** O detalhe de cada item, com o porquê e a medição, continua em
> `roadmap-ate-a-primeira-assinatura.md`. Aqui é para bater o olho e saber onde estamos.

## Legenda

| Marca | Significa |
|---|---|
| 🔴 | **não começou** |
| 🟡 | em andamento |
| ✅ | **feito** |
| 💰 | é onde entra dinheiro |
| 🔒 | depende do XP estar protegido |

---

## ⚠️ O pré-requisito de tudo

| | Item | O quê | Por que vem antes |
|---|---|---|---|
| 🟡 | **R0** | **O servidor passa a calcular o XP** | Hoje o navegador informa o total, e medi que dá para escrever qualquer número — inclusive de forma **permanente**. Enquanto o XP não vale nada, é autoengano e não faz mal. **No instante em que destrancar qualquer coisa, vira furar a fila.** Regressão: `node tools/testa-xp-forjado.js` (hoje acusa 5 furos, tem de passar a acusar 0) |
| ✅ | **R0.1** | **Estudar pelo cronograma deixa rastro** | **FEITO em 19/09/2026, e sem isto o R1 quebraria o produto.** Das 5 ações que dão XP, só o cronômetro gravava em `sessoes_estudo` — marcar a sessão do dia, que é o caminho **principal**, subia o XP e sumia. Quem estuda assim teria ficha zerada, e o conserto do XP **apagaria o progresso dessa pessoa**. Foi o Lucas quem apontou. Prova: `node tools/testa-sessao-cronograma.js` (9 de 9) |

> 🎯 **A boa notícia:** o R0 e o R1 são **o mesmo trabalho**. Um atributo calculado a partir dos
> registros de estudo não pode ser informado — ele é derivado. Fazer a ficha no servidor entrega
> as duas coisas de uma vez.

---

## 🧍 O personagem

| | Item | O quê | Estado |
|---|---|---|---|
| ✅ | **R1** | **A FICHA** — 5 atributos no lugar de um XP só | **FEITA em 19/09/2026.** Os 4 primeiros calculados **pelo servidor** a partir das sessões reais; **PRECISÃO volta `null`** de propósito, porque depende do banco de questões e inventar número aqui derrubaria o crédito da ficha inteira. Cada atributo **diz de onde veio**. Prova: `node tools/testa-ficha.js` (18 de 18, incluindo a tela e o vazamento entre contas) |
| 🔴 | **R2** | **ÁRVORE DE HABILIDADES** — ponto a cada patente, gasto em Infantaria (constância) · Artilharia (volume) · Inteligência (precisão) | 🔒 aprovado por ele em 18/09. **Trava:** os ramos mudam *como* se joga, nunca *o que* se aprende |
| 🔴 | **R10** | **PRESTÍGIO** — trocar de edital ou passar não zera nada: vira **veterano**, com marca permanente | aprovado |

---

## 🎯 O que fazer no jogo

| | Item | O quê | Estado |
|---|---|---|---|
| 🔴 | **R6** | **CATÁLOGO DE TAGS** — muitas, por área de matéria | ele quer **várias**, e cada uma com **cor própria** |
| 🔴 | **R5** | **LOOT COM RARIDADE** — comum · incomum · rara · lendária, com a raridade visível na cor | 🔒 aprovado |
| 🔴 | **R12** | **MISSÕES** — as **gerais** (permanentes, nunca expiram) e as **DIÁRIAS** | pedido dele em 18/09: *"todo bom RPG tem missões diárias"*. ⚠️ ver o aviso do cassino abaixo |
| 🔴 | **R3** | **O CHEFE TEM DATA** — a prova vira o chefe da campanha, com contagem regressiva; cada simulado é um sub-chefe | aprovado |
| 🔴 | **R9** | **REENGAJAMENTO NARRADO** — "enferrujada/suspensa" (que já existe) vira *fora de serviço*, com missão de retorno | aprovado |

---

## 📖 O que a pessoa vê

| | Item | O quê | Estado |
|---|---|---|---|
| 🔴 | **R7** | **DIÁRIO DE CAMPANHA** — o histórico vira log narrado: *"Dia 34 — 2h20 em Matemática. Domínio 58% → 61%. Desbloqueado: Calculista."* | aprovado |
| 🔴 | **R8** | **O INSTANTE DA DESCOBERTA** — a conquista secreta passa pelo confete do dashboard **na hora**, em vez de esperar a pessoa ir até a página | aprovado. Maior retorno pelo menor esforço |

---

## 💰 As questões — onde o produto cobra

| | Item | O quê | Estado |
|---|---|---|---|
| ✅ | **Q1** | **Medir o esforço de digitalizar uma prova** | **FEITO em 17/09.** 78 de 96 questões utilizáveis sozinhas (81%), 0,36 s por prova, R$ 0. `tools/prova-para-questoes.js` |
| 🔴 | **Q2** | **Juntar os PDFs e montar o acervo** | o gargalo real: é buscar prova por prova. ⚠️ testei **uma banca só** — outras podem render menos |
| 🔴 | **Q3** | **FILTROS** — banca · matéria · **assunto dentro da matéria** (funções, porcentagem, crase…) | pedido dele em 18/09. **É o filtro que os sites grandes têm e que faz o acervo servir para alguma coisa** |
| 🔴 | **Q4** | 💰 **Amostra grátis × Pro** | free: 10/dia, sorteadas, provas de 4+ anos, **1 simulado completo de degustação**. Pro: ilimitado, filtrado pelo edital dele, provas recentes, **caderno de erros** |
| 🔴 | **R4** | 💰 **MASMORRA = SIMULADO** — incursão de N questões com relatório de missão no fim | 🔒 aprovado. É onde o corte do Pro mora |

---

## As duas travas que não se negociam

> ⚠️ **Nada de cassino.** RPG recompensa *jogar*; um app de estudo tem de recompensar *estudar*.
> Toda recompensa aqui fica amarrada a **tempo real de estudo** ou **acerto real** —
> **nunca a abrir o aplicativo, nunca a sequência de login.**
>
> **Isto vale especialmente para as missões diárias (R12)**, que é exatamente onde esse vício
> costuma entrar. *"Entre hoje para ganhar 50 XP"* está proibido. *"Estude 25 minutos hoje"*
> está certo — a diferença é que a segunda só se cumpre estudando.

> 🎖️ **Militar, não fantasia.** O mundo militar já tem classes reais — Sapador, Sniper,
> Inteligência, Mergulhador de Combate. "Virar RPG" aqui é **mecânica de RPG com pele militar**.
> Se ele quiser fantasia, é trocar uma tabela de nomes — mas é decisão dele.

---

## Ordem de execução

```
R0+R1  ficha no servidor (mata o anti-fraude junto)   <- COMEÇANDO
R6     catálogo de tags, com cor
R5     raridade
R8     o instante da descoberta
R12    missões gerais e diárias
R3     o chefe tem data
R2     árvore de habilidades
R7     diário de campanha
R9     reengajamento
Q2+Q3  acervo de questões e filtros
Q4+R4  amostra grátis, Pro e masmorra
R10    prestígio
```

**Custo somado: R$ 0.** Nada disto chama IA.

---

> 📌 **Como este arquivo se mantém:** a cada item entregue, a bolinha vira ✅ **aqui** e o que
> foi feito entra em `apresentacao-do-produto.md`, **na área temática dele** — não no fim, para
> o documento não virar uma lista bagunçada em ordem de execução.
