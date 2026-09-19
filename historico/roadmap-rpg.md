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
| 🔮 | **adiado de propósito**, com gatilho escrito |
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
| ✅ | **R6** | **CATÁLOGO** — condecorações e divisas | **ESCRITO em 19/09/2026 e AMPLIADO no mesmo dia** a pedido dele (*"eu quero bem mais, e mais secretas também"*): `assets/js/catalogo.js` com **74 condecorações** (22 secretas) e **33 divisas** (10 secretas), cada divisa com raridade e **cor por token**. Prova: `node tools/testa-catalogo.js` |
| ✅ | **R13** | **MOTOR DE CONDECORAÇÕES** | **FEITO em 19/09/2026.** Os **fatos** saem do servidor (`fatos_do_usuario`, 11 consultas sobre `sessoes_estudo` e `progresso`); a **conferência** acontece no navegador; e **nada é gravado** — a lista é função pura dos fatos. A sala está em `conquistas.html`, com placar, "falta pouco" e as secretas como `???`. Provas: `testa-motor` (21) · `testa-fatos` (17) · `testa-sala` (9) |
| 🔮 | **R14** | **PORCENTAGEM DE RARIDADE** — *"3,1% dos candidatos têm"* | **adiado por ele em 19/09**, não descartado. Gatilho: **mais de 100 usuários ativos** — abaixo disso uma pessoa move o número em mais de 1 ponto e vira ruído |
| 🔴 | **R5** | **LOOT COM RARIDADE** — comum · incomum · rara · lendária, com a raridade visível na cor | 🔒 aprovado |
| 🔴 | **R12** | **MISSÕES** — as **gerais** (permanentes, nunca expiram) e as **DIÁRIAS** | pedido dele em 18/09: *"todo bom RPG tem missões diárias"*. ⚠️ ver o aviso do cassino abaixo |
| 🔴 | **R3** | **O CHEFE TEM DATA** — a prova vira o chefe da campanha, com contagem regressiva; cada simulado é um sub-chefe | aprovado |
| 🔴 | **R9** | **REENGAJAMENTO NARRADO** — "enferrujada/suspensa" (que já existe) vira *fora de serviço*, com missão de retorno | aprovado |

---

### 🏅 O SISTEMA DE CONDECORAÇÕES — ideia dele, 19/09/2026

> *"Sabe quando a pessoa joga um jogo no PlayStation? Lá tem várias conquistas até você
> platinar. Isso faz com que a pessoa busque para fazer."*
>
> E a observação que deu origem a tudo, sobre a janela de 30 dias da DISCIPLINA:
> *"isso é um lugar perfeito para colocar um troféu. Pode ter até uma tag escondida aí."*

**Ele está certo, e a razão é mecânica:** um atributo da ficha já é um número que sobe com
esforço real e tem **teto conhecido**. Número com teto é gatilho pronto — não é preciso inventar
condição nenhuma, basta dizer em que altura a medalha cai. As três condecorações de ouro
**Disciplina de Ferro**, **Fôlego de Combate** e **Doutrina Consolidada** nasceram exatamente daí.

#### O que está escrito (`assets/js/catalogo.js`)

| | Quantas | O que são |
|---|---|---|
| 🥉 **Bronze** | 19 | primeiros passos — dias |
| 🥈 **Prata** | 29 | constância — semanas |
| 🥇 **Ouro** | 25 | compromisso — meses |
| 🏆 **Platina** | 1 | **todas as outras 73** |
| 🔒 **Secretas** | 22 das 74 | não aparecem até disparar |
| 🎖️ **Divisas (tags)** | 33 | 10 secretas, cada uma com raridade e cor |

> ⚠️ **Ampliado em 19/09, no mesmo dia, por ordem dele:** *"eu quero mais, tá? Eu quero bem
> mais. E mais secretas também, óbvio."* Saiu de 28 para 74 condecorações e de 7 para 22
> secretas. **Platinar passou a exigir 73.**

**Por que 25% de secretas, e não mais:** secreta demais deixa a tela vazia — a pessoa abre e não
vê o que perseguir. Secreta de menos e não há surpresa nenhuma. A mistura é o que faz a caçada
existir. O `testa-catalogo.js` trava se a proporção sair da faixa.

#### As três regras que o catálogo se impõe, e o teste que as cobra

1. **🔴 Nada se cumpre sem estudar.** Não existe medalha por abrir o aplicativo, por sequência de
   login ou por presença. O teste varre nome, descrição e condição atrás disso e falha se achar.
   **E ele já pegou uma falha minha, no dia em que o catálogo dobrou de tamanho:** eu tinha
   escrito quatro condecorações que se ganhavam com **um clique** — marcar um prazo no calendário
   e buscar professores. São ações úteis, mas não exigem estudar um minuto, e como medalha seriam
   o primeiro passo do cassino que ele proibiu. Trocadas por condecorações de dias estudados e
   de matérias no mesmo dia. **A lista de tipos permitidos é fechada de propósito:** tipo novo
   derruba o teste e obriga a decidir na mão, em vez de escorregar para dentro.
2. **Toda condição é conferível com dado que já temos** — `sessoes_estudo`, `progresso` e os
   atributos da ficha. Ideia bonita que não dá para medir hoje **não entra**: conquista que nunca
   dispara é pior que conquista nenhuma, porque a pessoa persegue algo que não existe.
3. **Cor só por token do design system.** Mudar a paleta muda as tags junto, em vez de deixar 23
   códigos de cor órfãos para trás.

#### 🔮 R14 — a porcentagem de raridade, adiada (não descartada)

> Decisão dele em 19/09: *"não mostre essa porcentagem agora. Talvez no futuro, quando o site
> estiver com muitos usuários, aí fica interessante esse estilo de porcentagem de troféu."*

No PlayStation cada troféu mostra quantos jogadores o têm (*"3,1%"*), e isso é metade da graça:
é o que transforma uma medalha em **raridade de verdade**, medida, não prometida.

**Por que não hoje, em número:** com **8 usuários cadastrados**, uma pessoa sozinha move a
porcentagem em **12,5 pontos**. Um troféu que dois usuários têm apareceria como "25% dos
candidatos" — e isso não é raridade, é ruído. Pior: contaria a cada pessoa o que as outras
fizeram.

| | |
|---|---|
| **Gatilho para revisitar** | uma base em que **uma pessoa mude menos de 1 ponto** — ou seja, **mais de 100 usuários ativos** |
| **O que já está pronto para isso** | nada precisa mudar no catálogo: a raridade projetada continua valendo como classificação, e a porcentagem entra **ao lado** dela, não no lugar |
| **O que precisa de cuidado** | a conta tem de sair de uma função no servidor que devolve **só o número agregado**, nunca a lista de quem tem o quê |

**Enquanto isso, raridade é projetada** — propriedade da divisa, decidida por quanto esforço ela
pede. Comum · Incomum · Rara · Lendária.

> ✏️ **E uma correção, de 19/09:** o roadmap dizia que o catálogo estava *"aprovado por você,
> código nunca escrito"*. Fui procurar o conteúdo para não refazer trabalho e **ele não existia
> em lugar nenhum** — nem em `historico/`, nem na skill, nem no caderno de 2.989 linhas. O que
> foi aprovado em 02/08 foram as **contagens e o formato**. Escrever os nomes e as condições era
> o trabalho inteiro, e estava descrito como se fosse o resto dele.

---

### ⚙️ Como o motor ficou, e por que dividido assim

O catálogo tem 74 condições e vai crescer — dobrou no dia em que nasceu. Traduzir as 74 para SQL
criaria **duas cópias** do mesmo catálogo, e duas cópias divergem: é questão de tempo até uma
medalha existir na tela e não existir no banco.

Então a divisão separa **o que não pode ser forjado** do que não precisa de proteção:

| Onde | O quê | Por quê |
|---|---|---|
| **Servidor** | os **fatos** — *"estudou 47 dias, maior sessão 92 min, domínio mínimo 38%"* | vêm de `sessoes_estudo` e `progresso`, com RLS. O navegador não inventa nenhum |
| **Navegador** | comparar fato com limiar — *"47 ≥ 30, logo ganhou"* | é aritmética sobre números que ele não escolheu |

**E nada é gravado.** A lista é **função pura dos fatos**: recalcular dá sempre a mesma resposta,
então não há estado para guardar — e o que não se guarda não se falsifica. Isso resolve de graça
o furo medido em 17/09, quando gravei a conquista `conquista_que_nao_existe` e o banco aceitou.

> 🔴 **O limite honesto:** quem editar o próprio navegador consegue **se mostrar** uma medalha que
> não ganhou. Não há estado, não há efeito sobre ninguém, nada é gravado — é autoengano, do mesmo
> tipo do XP de hoje. **Deixa de ser aceitável no dia em que condecoração destrancar conteúdo do
> Pro:** aí a conferência sobe para o servidor também, e aí vale pagar o preço de manter o
> catálogo em dois lugares. Hoje não vale.

#### Três defeitos meus que os testes pegaram

| O que eu fiz | O que ensinou |
|---|---|
| Importei o catálogo **com carimbo de versão** de dentro de outro módulo | **URL diferente é módulo diferente.** O navegador carregaria o catálogo **duas vezes**, e cada metade do sistema falaria com uma cópia. A convenção está em `paginas.md` §9: HTML → módulo leva carimbo, módulo → módulo não |
| Escrevi "Virada de Jogo" como *"a matéria que **estava** mais atrasada"* | **Inconferível:** não guardamos histórico de domínio. A condecoração nunca dispararia, e ninguém descobriria por quê — violava a regra 1 do próprio catálogo. Reescrita para *"a matéria a que você dedicou menos tempo"*, que o banco sabe responder |
| Testei a platina com um usuário de 6 matérias | Alarme falso — mas mostrou algo real: como **nenhum edital tem as 13 matérias**, ninguém vai colecionar todas as divisas, e está certo assim. Por isso a platina depende só das **condecorações**, que são iguais para todos |

---

## 📖 O que a pessoa vê

| | Item | O quê | Estado |
|---|---|---|---|
| 🔴 | **R7** | **DIÁRIO DE CAMPANHA** — o histórico vira log narrado: *"Dia 34 — 2h20 em Matemática. Domínio 58% → 61%. Desbloqueado: Calculista."* | aprovado |
| ✅ | **R8** | **O INSTANTE DA DESCOBERTA** | **FEITO em 19/09/2026.** A medalha se anuncia **na hora**, no dashboard e na sala, com banner na cor do metal, confete e a divisa que vem junto. Prova: `node tools/testa-anuncio.js` (8 de 8) |

---

### 🎉 O anúncio — e as duas maneiras de errar

Registrado em 19/09/2026, porque a segunda é a que estraga o produto e é a menos óbvia:

| | O erro | Por que importa |
|---|---|---|
| 1 | **Não anunciar** | a pessoa nunca descobre, e a conquista secreta vira linha de tabela — era o estado até hoje |
| 2 | **Anunciar demais** | aparelho novo, 30 medalhas antigas, 30 comemorações seguidas. **Pior que a 1**, porque a 1 é só ausência e a 2 é incômodo ativo — e depois que a pessoa aprende a fechar o aviso sem ler, nenhum aviso funciona mais |

**Como o 2 foi resolvido:** a primeira carga em cada aparelho **semeia em silêncio** — grava tudo
como visto e não anuncia nada. Só o que cair depois aparece.

**Como se sabe que é nova, se nada é gravado:** não se sabe, e não é isso que se pergunta. As
condecorações são função pura dos fatos, então não existe "conquistado em". A pergunta aqui é
outra — *"eu já te MOSTREI esta?"* —, que é assunto de interface, não verdade sobre o mundo. Por
isso a resposta mora no navegador (`astral_vistas_<uid>`).

**O preço honesto:** quem ganha a medalha no celular e depois abre o computador vê o anúncio de
novo. É repetição, não invenção — e é melhor que o contrário, que seria nunca ver.

#### Dois defeitos que o teste pegou

| O que eu fiz | O que ensinou |
|---|---|
| **Misturei escolher com ordenar.** Ordenava do bronze ao ouro e cortava os 3 **primeiros** | O teto jogava fora **exatamente as medalhas mais valiosas**: caíram cinco, entre elas uma de ouro e secreta, e o anúncio mostrou três de prata. São dois passos — escolher as melhores, depois ordenar para exibir |
| **O teste media com uma foto** um processo que dura mais que o instante | Os anúncios são uma fila de 3,9s cada; contar `querySelectorAll` depois de 5 segundos pegava um só. Acusou falha com o sistema funcionando. Trocado por um observador que registra tudo que apareceu |

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
