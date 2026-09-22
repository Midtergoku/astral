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
| 🛑 | **medido e parado** — espera decisão do Lucas |
| 💰 | é onde entra dinheiro |
| 🔒 | depende do XP estar protegido |

---

## ⚠️ O pré-requisito de tudo

| | Item | O quê | Por que vem antes |
|---|---|---|---|
| ✅ | **R0** | **O servidor calcula e GRAVA** | **FEITO em 20/09/2026**, com as três respostas dele. `progresso.xp_validado` guarda o XP que o servidor calcula das sessões, e a tabela `conquistas` guarda as medalhas. **A única porta de escrita é `sincronizar_conquistas()`** — o usuário não tem grant de insert nem update em nenhuma das duas. Prova: `node tools/testa-conquistas-gravadas.js` (14 de 14, incluindo três tentativas de fraude com credencial válida) |
| ✅ | **R0.1** | **Estudar pelo cronograma deixa rastro** | **FEITO em 19/09/2026, e sem isto o R1 quebraria o produto.** Das 5 ações que dão XP, só o cronômetro gravava em `sessoes_estudo` — marcar a sessão do dia, que é o caminho **principal**, subia o XP e sumia. Quem estuda assim teria ficha zerada, e o conserto do XP **apagaria o progresso dessa pessoa**. Foi o Lucas quem apontou. Prova: `node tools/testa-sessao-cronograma.js` (9 de 9) |

> 🎯 **A boa notícia:** o R0 e o R1 são **o mesmo trabalho**. Um atributo calculado a partir dos
> registros de estudo não pode ser informado — ele é derivado. Fazer a ficha no servidor entrega
> as duas coisas de uma vez.

---

## 🧍 O personagem

| | Item | O quê | Estado |
|---|---|---|---|
| ✅ | **R1** | **A FICHA** — 5 atributos no lugar de um XP só | **FEITA em 19/09/2026.** Os 4 primeiros calculados **pelo servidor** a partir das sessões reais; **PRECISÃO volta `null`** de propósito, porque depende do banco de questões e inventar número aqui derrubaria o crédito da ficha inteira. Cada atributo **diz de onde veio**. Prova: `node tools/testa-ficha.js` (18 de 18, incluindo a tela e o vazamento entre contas) |
| ✅ | **R15** | **QUADRO DE OPERAÇÕES** — a árvore de condecorações | **FEITO em 20/09/2026**, em `arvore.html`: as 74 condecorações em **8 frentes**, cada uma um degrau ligado ao anterior. Pedido dele com uma imagem de árvore de talentos e a ordem de **não** copiar aquela forma. Prova: `node tools/testa-arvore.js` (23 de 23) |
| ✅ | **R2** | **ÁRVORE DE HABILIDADES** — ponto a cada patente, gasto em Infantaria (constância) · Artilharia (volume) · Inteligência (precisão) | **FEITO em 20/09/2026**, em `habilidades.html`: **12 habilidades em 3 ramos de 4 degraus**, escolha **gravada no servidor** e impossível de forjar. **Trava cumprida e verificada por programa:** todo bônus é positivo — nenhum ramo faz ninguém estudar pior. Provas: `testa-habilidades` (22 de 22, com 3 tentativas de fraude) · `testa-habilidades-tela` (14 de 14). ⚠️ **Não confundir com o R15:** o Quadro **mostra** o que você conquistou; a Árvore faz você **escolher** |
| ✅ | **R10** | **PRESTÍGIO** — trocar de edital não zera nada | **FECHADO em 20/09/2026**, junto com o R0 e pela mesma peça. As 4 condecorações e 3 divisas que se perdiam agora ficam gravadas: **conquista não se desconquista.** Provado no próprio teste do R0 — 29 condecorações antes da troca, 29 depois |

---

## 🎯 O que fazer no jogo

| | Item | O quê | Estado |
|---|---|---|---|
| ✅ | **R6** | **CATÁLOGO** — condecorações e divisas | **ESCRITO em 19/09/2026 e AMPLIADO no mesmo dia** a pedido dele (*"eu quero bem mais, e mais secretas também"*): `assets/js/catalogo.js` com **74 condecorações** (22 secretas) e **33 divisas** (10 secretas), cada divisa com raridade e **cor por token**. Prova: `node tools/testa-catalogo.js` |
| ✅ | **R13** | **MOTOR DE CONDECORAÇÕES** | **FEITO em 19/09/2026.** Os **fatos** saem do servidor (`fatos_do_usuario`, 11 consultas sobre `sessoes_estudo` e `progresso`); a **conferência** acontece no navegador; e **nada é gravado** — a lista é função pura dos fatos. A sala está em `conquistas.html`, com placar, "falta pouco" e as secretas como `???`. Provas: `testa-motor` (21) · `testa-fatos` (17) · `testa-sala` (9) |
| 🔮 | **R14** | **PORCENTAGEM DE RARIDADE** — *"3,1% dos candidatos têm"* | **adiado por ele em 19/09 e reafirmado em 20/09**, não descartado. Gatilho fechado em **200 usuários com login nos últimos 30 dias** (ele deu 100 como exemplo e pediu que eu estipulasse). **E o lembrete não depende de eu lembrar:** `tools/lembretes.js` mede sozinho e o `checa-saude.js` o chama toda sessão. Medido em 20/09: **1 de 200** |
| ✅ | **R5** | **LOOT COM RARIDADE** | **FEITO em 19/09/2026.** A vitrine de `tags.html` deixou de mostrar só as tags de matéria e passa a mostrar **o catálogo inteiro** — conquistadas em cima, trancadas embaixo, secretas fora. Raridade na **cor do nome** e num rótulo. Prova: `node tools/testa-tags.js` (9 de 9) |
| ✅ | **R12** | **MISSÕES** — diárias e campanhas | **FEITO em 19/09/2026.** **3 diárias por dia**, sorteadas de 11 com semente `uid + data` — recarregar não troca; **4 campanhas** de 4 etapas, que nunca expiram. Ambas no dashboard. Provas: `testa-missoes` (16, função pura) · `testa-missoes-tela` (11, ponta a ponta) |
| ✅ | **R3** | **O CHEFE TEM DATA** | **FEITO em 19/09/2026.** A prova marcada no calendário vira o chefe, no alto do dashboard: fase da campanha, dias restantes, **preparo de 0 a 100** e **o que fazer** — a matéria que custa mais caro, nomeada. Some sozinho quando não há prova. Prova: `node tools/testa-chefe.js` (18 de 18). ⚠️ Os **sub-chefes** (simulados) dependem do banco de questões — ver Q4/R4 |
| ✅ | **R9** | **REENGAJAMENTO NARRADO** | **FEITO em 19/09/2026** — e no caminho **consertou um defeito total**: o decaimento das habilidades **nunca funcionou** (ver abaixo). "Suspensa" virou *Fora de serviço*, com o tempo e o que fazer para voltar. Prova: `node tools/testa-decaimento.js` (9 de 9) |

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
| **Gatilho para revisitar** | **200 usuários com login nos últimos 30 dias** — fechado em 20/09 (ver abaixo) |
| **O que já está pronto para isso** | nada precisa mudar no catálogo: a raridade projetada continua valendo como classificação, e a porcentagem entra **ao lado** dela, não no lugar |
| **O que precisa de cuidado** | a conta tem de sair de uma função no servidor que devolve **só o número agregado**, nunca a lista de quem tem o quê |

##### 🔔 O número, fechado em 20/09/2026 — e por que ele se cobra sozinho

Ordem dele: *"vamos estipular um número de usuários (...) por exemplo, ah, com 100 usuários isso
já fica legal, e aí você me lembra disso. Não é um número fixo de 100, mas é só um exemplo."*

**O número é 200 usuários com login nos últimos 30 dias**, e não 100. A diferença importa por
duas razões, uma pequena e uma grande:

| | Com 100 | Com 200 |
|---|---|---|
| Quanto **uma pessoa** move a porcentagem | **1 ponto inteiro** — a medalha que hoje diz 3% diz 4% amanhã porque alguém entrou | **meio ponto** |

E a razão maior, que não é de precisão: **porcentagem de raridade só interessa se ela variar.**
Com pouca gente, quase toda medalha fica em 0% ou 100% e a tela vira uma coluna de números
iguais — trabalho feito para não dizer nada. É por volta de 200 pessoas ativas que as
condecorações começam a se espalhar pela curva e a porcentagem passa a **separar** uma medalha
da outra, que é a única coisa que ela existe para fazer.

**Por que "ativo nos últimos 30 dias" e não "cadastrado":** conta criada e esquecida infla o
denominador e faz toda medalha parecer mais rara do que é. A conta tem de ser sobre quem está
jogando. Medido em 20/09: **8 contas cadastradas, 1 com login nos últimos 30 dias.**

> 🔴 **E aqui está a parte que não é sobre o número.** Um combinado do tipo *"me lembre quando
> chegar a 200"* depende de **eu lembrar** — e eu não lembro. Escrever "lembrar quando der 200"
> num documento é a mesma família do erro de 17/09, em que uma contagem certa no dia em que foi
> escrita envelheceu calada e ninguém percebeu.
>
> Então o lembrete **não mora num documento**. Mora em `tools/lembretes.js`, que **mede**, e o
> `checa-saude.js` — a primeira coisa que eu rodo em toda sessão — chama ele. Enquanto está
> longe, sai uma linha discreta (`R14 1/200`). Quando chegar, abre um aviso mandando avisar você.
>
> E isso também foi provado, não prometido: `node tools/testa-lembretes.js` confere que com 199
> **não** dispara, com 200 **dispara**, acima de 200 **continua** avisando (não é evento de uma
> vez só) e que, sem conseguir medir, ele diz *"NÃO MEDI"* em vez de inventar número.


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
| ✅ | **R7** | **DIÁRIO DE CAMPANHA** | **FEITO em 19/09/2026**, em `progresso.html`: linha do tempo dos últimos 30 dias, com tempo, matérias, sequência e **marcos calculados por reprodução da história**. ⚠️ **Sem a parte do domínio** — ver abaixo. Provas: `testa-diario` (20) · `testa-diario-tela` (10) |
| ✅ | **R8** | **O INSTANTE DA DESCOBERTA** | **FEITO em 19/09/2026.** A medalha se anuncia **na hora**, no dashboard e na sala, com banner na cor do metal, confete e a divisa que vem junto. Prova: `node tools/testa-anuncio.js` (8 de 8) |

---

### 🗄️ O servidor grava — R0 e R10 fechados juntos, 20/09/2026

As três respostas dele destravaram as duas coisas de uma vez:

| Pergunta | Resposta |
|---|---|
| Gravar quando cai, ou recalcular sempre? | *"faça o que achar melhor"* → **gravar** |
| Quem grava? | *"o servidor. Não quero ninguém alterando isso a não ser nós"* |
| E quem já tem progresso? | *"não acontece nada, quando o site for lançado já terá essa mecânica"* |

#### O problema de ter o catálogo em dois lugares — e como foi evitado

Para o **servidor** decidir quem ganhou o quê, ele precisa conhecer as 74 condições — e elas
moram em `assets/js/catalogo.js`. A saída óbvia seria reescrevê-las em SQL, e seria a pior
escolha possível: **duas cópias do mesmo catálogo divergem**, e não é questão de disciplina, é
questão de tempo.

**A solução: uma fonte, uma derivada.** `catalogo.js` continua sendo o único lugar que se
escreve — e é onde o Lucas mexe. `tools/gera-catalogo-sql.js` lê esse arquivo e **gera** a
semente SQL. O banco nunca é editado à mão.

> 🔒 **E há uma trava no `verifica.js`:** mexer no catálogo sem regerar a semente **falha o
> commit**. Sem ela, alguém acrescentaria uma medalha, veria ela na tela (porque a tela lê o
> arquivo) e ela nunca seria gravada — apareceria hoje e sumiria amanhã, sem erro em lugar
> nenhum. **Testei a trava nos dois sentidos:** ela dispara quando o catálogo muda e passa quando
> está em dia.

#### Como a escrita ficou fechada

A tabela `conquistas` **não dá insert, update nem delete a ninguém** — nem a `authenticated`. A
única porta é `sincronizar_conquistas()`, que é `security definer`: roda com o dono do banco, mas
grava **somente o que ela mesma calculou**, para `auth.uid()`.

> 🔴 **O id vem de `auth.uid()`, nunca de parâmetro.** Aceitar um id de fora daria a qualquer um
> o poder de gravar conquista na conta alheia — e como a função roda como dono do banco, a RLS
> não a protegeria disso.

**E ela nunca apaga.** Só `insert ... on conflict do nothing`. Não existe `delete` nem `update`
no corpo dela — é assim que *"conquista não se desconquista"* deixa de ser promessa e vira
propriedade do código.

#### 🚨 Dois defeitos meus, em sequência, e o segundo foi grave

| | |
|---|---|
| **A coluna nova nasceu escrevível pelo usuário** | `progresso` tinha um `grant update` de **tabela inteira** desde 30/07, e **grant de tabela vale para coluna que ainda nem existe**. O teste gravou 999999 em `xp_validado` e o banco aceitou. Consertado com permissão coluna a coluna |
| 🚨 **Ao consertar, QUEBREI o salvamento de progresso** | Deixei `atualizado_em` de fora da lista, raciocinando que quem escreve é o gatilho. **`salvar_progresso` escreve essa coluna explicitamente**, e é `security invoker`. Ninguém conseguia salvar progresso. O teste pegou em menos de um minuto |

**A lição das duas é a mesma, e é a de ontem com outra roupa:** eu raciocinei sobre *intenção*
em vez de **ler o código**. Trocar grant de tabela por grant de coluna exige ler **toda função
que escreve naquela tabela**. E o agravante: o comentário que eu mesmo escrevi na migration
avisava que perder uma coluna ali quebraria o salvamento — **escrevi o aviso e caí nele na mesma
migration**.

---

### 🗺️ O Quadro de Operações — e por que não é a árvore da imagem

Ele mandou a imagem de uma **árvore de talentos de jogo de fantasia** e foi explícito:

> *"Isso é só um exemplo do que é, mas ela não vai ser dessa maneira. Quero que seja transformada
> da nossa maneira, que tenha nossas cores e alguma relação com a parte do militar."*

**O que se mantém:** a estrutura — ramos paralelos, degraus em ordem, convergência.
**O que muda:** tudo o mais. Árvore de talentos é forma de fantasia. O equivalente militar é o
**quadro onde se planeja uma campanha**: frentes que avançam em paralelo, objetivos ligados por
linha, sobre um fundo de mapa.

| Decisão | Por quê |
|---|---|
| **Hexágono**, não círculo | hexágono é a forma de **grade de mapa tático**; círculo é a forma de qualquer jogo |
| **Frentes**, não ramos | *Tempo de Serviço · Marcha · Presença · Fôlego · Volume de Fogo · Terreno · Vigília · Comando* |
| Fundo de **grade fina** | a mesa onde se planeja, não o céu estrelado da imagem |
| Cor **só por token** | o teste falha se aparecer um único hex solto na página |

#### 🔴 A árvore não foi inventada — foi revelada

As 74 condecorações **já tinham correntes dentro delas**: 9 degraus de horas
(1 → 3 → 5 → 10 → 25 → 50 → 100 → 200 → 500), 7 de sequência, 6 de sessões. Isso já era uma
árvore; estava escondida numa lista.

Então o código **não cria hierarquia**: agrupa por **tipo de esforço** e ordena por **exigência**.
A consequência que importa: **o quadro nunca desatualiza** — condecoração nova entra na frente
certa sozinha, pelo tipo da condição dela. E o teste cobra que **nenhuma fique órfã**, porque
órfã seria conquistada sem lugar para aparecer.

#### O pré-requisito que não precisou ser inventado

Numa árvore de talentos o nó de cima **exige** o de baixo. Aqui não é preciso impor: **quem tem
100 horas necessariamente passou por 50**. A ordem já é consequência. Por isso o teste procura o
que seria impossível — um degrau aceso com o anterior apagado — e falha se achar, porque isso
significaria que a ordem da frente está errada e a pessoa veria um caminho que não existe.

#### Dois defeitos meus, pegos no caminho

| | |
|---|---|
| **Escalas misturadas na mesma frente** | Comparei o número cru de cada condição, e "1 semana perfeita" ficou **antes** de "2 dias seguidos", porque 1 < 2. Cada frente passou a converter tudo para a sua unidade natural (dias, minutos, sessões) |
| 🔴 **A legenda do nó só aparecia no hover** | **No celular não existe hover.** A tela seria hexágonos com números e nenhuma forma de descobrir o que são. Agora responde ao toque (`:focus`), e no telefone vira uma barra no rodapé em vez de um balão de 13rem que não cabe em 360px |

---

### 🌳 R2 — a Árvore de Habilidades, 20/09/2026

É o último item do RPG, e o único em que a pessoa **escolhe** em vez de receber. Por isso ele
só pôde vir depois do R0: escolha permanente precisa de um lugar fechado para morar, e agora há.

**12 habilidades, 3 ramos de 4 degraus**, em `habilidades.html`:

| Ramo | O que premia | Os 4 degraus |
|---|---|---|
| **Infantaria** | constância | Marcha Firme (3 dias seguidos) → … → 30 dias seguidos |
| **Artilharia** | volume | Carga Dupla (sessão de 40 min) → … → 3 horas num dia |
| **Inteligência** | direcionamento | Reconhecimento (2 matérias no dia) → … → **Alvo Prioritário**: a matéria mais fraca |

O bônus sobe por degrau: **+5% · +10% · +15% · +20%** sobre o XP da sessão que cumprir a
condição. Os pontos chegam em **10 limiares de XP** — 500, 1.200, 2.500, 4.500, 7.000, 10.000,
14.000, 19.000, 25.000 e 35.000.

#### 🔴 A trava dele, cumprida e cobrada por programa

Ordem de 18/09: *"os ramos mudam **como** se joga, nunca **o que** se aprende."* Um ramo que
desse desconto num outro faria a escolha custar caro — e quem hesita em escolher não joga.

Então **todo bônus é positivo, e o teste recusa o contrário**: `testa-habilidades.js` percorre
as 12 linhas do catálogo e falha se alguma tiver fator negativo. Não é promessa de comentário;
é checagem que roda.

A página diz isso em letra grande — *"Nenhuma habilidade tira nada"* — e o teste de tela cobra
**a frase estar lá**. Se alguém reescrever o texto e tirar a garantia, o teste cai.

#### A circularidade, cortada antes de existir

O erro natural aqui é o bônus gerar ponto: escolhe → XP sobe → ganha ponto → escolhe de novo.
Em poucas semanas a árvore estaria toda aberta e a escolha não teria significado nenhum.

**O corte:** o ponto vem de `xp_base` — a soma crua das sessões, sem bônus algum. O bônus vai
para `xp_validado`, que é o que aparece na tela. **Habilidade não compra habilidade**, e há
um teste com esse nome.

#### A escrita é fechada, como o R0

Nem `anon` nem `authenticated` têm insert, update ou delete em `habilidades_escolhidas`.
Só passam duas funções `security definer`, e as duas leem o dono de `auth.uid()`, nunca de
parâmetro:

- `escolher_habilidade(text)` — confere **no servidor** o pré-requisito e o ponto disponível
- `esquecer_habilidades()` — devolve tudo, para quem quiser recomeçar

Três tentativas de fraude com credencial válida estão no teste: inserir escolha na mão
(**403**), pular degrau (**recusado**) e turbinar o próprio fator de bônus (**continua 0.05**).

#### Por que a página não parece o Quadro

O Quadro (R15) são hexágonos numa grade tática; a Árvore são **fichas retangulares numa
prancheta**. A diferença é de propósito: o Quadro mostra **o que já aconteceu** e a Árvore
pede **uma decisão**. Se as duas telas parecessem a mesma coisa, a pessoa não saberia que numa
delas ela tem algo a fazer.

A borda esquerda da ficha diz o estado sem depender de ícone: `--linha` trancada, `--latao`
disponível, `--oliva-c` sua.

#### A checagem que mais importa desta camada

**Depois de escolher, a página tem de continuar certa após recarregar.** Se a escolha só
existisse na tela, ninguém perceberia até a pessoa voltar no dia seguinte e ver tudo zerado.
O teste fecha a aba, abre outra e mede de novo: 1 habilidade, 2 pontos livres, vindos do
servidor.

#### Um defeito meu, pego no caminho

O `testa-celular.js` tinha a lista de páginas com barra lateral **escrita à mão**, e
`habilidades.html` não entrou nela — o teste teria passado verde sem olhar a página nova. É a
repetição exata do que aconteceu em 17/09 com `tags` e `cronograma`. Agora a lista **se
descobre sozinha**, lendo quem declara `class="sidebar"`: passou de 12 nomes fixos para
**13 páginas encontradas**, e a nova entrou junto. *Lista escrita à mão envelhece calada.*

---

### 🛑 R10 — medido, e PARADO esperando você

Antes de construir o prestígio, fui medir o que realmente se perde ao trocar de concurso — porque
a ideia é *"trocar de edital não zera nada"*, e para saber o que preservar é preciso saber o que
some. `tools/testa-troca-de-edital.js` simula alguém que estudou 20 dias para a EEAR e passa a
prestar ESA.

#### O que já sobrevive sozinho — e é a maior parte

| | |
|---|---|
| horas, dias estudados, sessões, XP, recorde de sessão | ✅ intactos |
| **o diário de campanha inteiro** | ✅ 20 dias, com as matérias do concurso antigo |
| 25 das 29 condecorações | ✅ |

**A razão é boa:** quase tudo deriva de `sessoes_estudo`, que a troca de edital **não toca**. O
passado não é reescrito.

#### 🔴 O que se perde, e não deveria

| | |
|---|---|
| **4 condecorações** | Dois Terrenos · Meio do Caminho · Terreno Consolidado · Ninguém Fica Para Trás |
| **3 divisas** de matéria | Calculista, Engenheiro de Campo, Orador de Guerra |

Todas dependem do **domínio das matérias** — e a troca substitui as matérias, então o domínio das
novas começa em zero.

**Isso contraria a regra dele de 02/08** (*"conquista não se desconquista"*), que o próprio
`salvar_progresso` já respeita para os badges antigos: lá ele faz **união**, nunca substituição.

#### Por que eu parei aqui

Consertar exige **guardar as condecorações conquistadas** — e essa é a mesma decisão de modelagem
que o R0 vai ter de tomar para o XP. **Dado permanente de usuário modelado errado não se conserta
sem migrar o dado de quem já usou**, e ele pediu para eu parar antes de "mudança muito violenta".
Esta é exatamente a fronteira.

**As duas decisões andam juntas e são dele:** onde guardar o XP validado e onde guardar as
conquistas. Fazer uma sem a outra criaria dois lugares para a mesma pergunta.

> Enquanto isso, o teste **vigia**: ele não falha pelo buraco conhecido (teste que falha sempre
> ensina a ignorar teste), mas falha **se a perda aumentar**.

---

### 🔧 O decaimento das habilidades NUNCA funcionou — achado em 19/09/2026

Fui mexer no R9 e encontrei isto: `conquistas.html` decidia se uma habilidade estava ativa,
enferrujada ou suspensa a partir de `materia.ultimoEstudo`.

**Esse campo é lido numa linha e escrito em NENHUMA** — em todo o projeto. Nunca existiu.

Consequência: `diasSemEstudar` caía sempre no valor padrão de **999**, e portanto **toda
habilidade desbloqueada aparecia como SUSPENSA** — inclusive a de quem tinha estudado a matéria
cinco minutos antes.

Não era decisão deliberada. A própria tela promete, logo acima da lista: *"Enferrujada (7 dias
sem estudar)"* e *"mantenha seus estudos em dia para não perdê-las"*. A frase *"isto foi feito de
propósito porque ___"* não fecha de jeito nenhum.

**E o dado sempre existiu:** `sessoes_estudo` grava matéria e data de cada sessão desde 30/07.
A última vez de cada matéria é uma agregação simples — **nunca foi preciso um campo novo, só
perguntar**. Agora vem em `fatos_do_usuario.ultimoEstudoPorMateria`.

> 🔴 **E a parte que é erro meu, registrada em `erros.md`:** eu escrevi em
> `apresentacao-do-produto.md`, na seção **"já está no ar"**, que as habilidades enferrujam em 7
> dias. Li a legenda da tela, li o código que calculava os três estados, e concluí que
> funcionava — **sem nunca conferir se o campo que alimenta a conta existia**. Ler o código não
> é medir. E `grep` por um nome de campo que só aparece **uma vez** é sinal de alarme: dado que
> ninguém escreve é dado que não existe.

#### O R9 em si: o castigo virou convite

O decaimento existia como **castigo** — a habilidade apagava e pronto. Castigo sozinho afasta:
quem sumiu vinte dias abre a tela, vê que perdeu coisa e fecha.

| Antes | Agora |
|---|---|
| "Suspensa" | **"Fora de serviço"** — linguagem de campanha, não de punição |
| nada mais | *"25 dias sem Física"* + *"Uma sessão traz ela de volta ao serviço."* |

**O pedido de volta é pequeno de propósito, e o teste cobra isso:** quem voltou depois de sumir
não volta para uma maratona — volta para um primeiro passo. Uma sessão.

---

### 📖 O diário — e a parte da ideia que eu NÃO pude cumprir

A ideia aprovada em 18/09 dizia:

> *"Dia 34 — 2h20 em Matemática. **Domínio 58% → 61%.** Desbloqueado: Calculista."*

**A parte do meio é impossível hoje, e é melhor dizer do que inventar:** o projeto guarda o
domínio **atual** de cada matéria, nunca o histórico dele. Não existe "58%" em lugar nenhum do
banco — existe o valor de agora, e só.

Escrever "58% → 61%" exigiria gravar histórico novo (mudança de banco) ou **inventar o número**.
Inventar seria o pior defeito possível num diário: **um diário que mente sobre o passado não vale
nada, e ninguém teria como perceber.** Há um teste que varre os textos atrás de qualquer frase
sobre domínio e falha se achar — para o caso de alguém acrescentar uma por cima depois.

#### O que o diário conta, e conta bem

| | De onde vem |
|---|---|
| tempo, matérias e sessões de cada dia | direto de `sessoes_estudo` |
| a sequência de dias **naquele momento** | recontada dia a dia |
| marcos: primeiro dia, estreia de matéria, recorde, retorno, horas acumuladas | **calculados reproduzindo a história em ordem** |

#### Por que os marcos são calculados por reprodução

*"Seu dia mais longo até então"* só é verdade contra o que veio **antes**. Um dia de 3 horas é
recorde em janeiro e rotina em junho. Percorrer a história em ordem, guardando o máximo até ali,
é a única forma de o marco ser verdadeiro **na data em que aparece** — e não um rótulo colado por
cima com o número de hoje. O teste planta 60min → 30min → 90min e exige que **só o terceiro**
seja recorde.

#### Dois defeitos que o teste pegou, e o segundo é o pior tipo

| | |
|---|---|
| Data ilegível virava o dia **`NaN-NaN-NaN`**, com tempo somado, como se fosse um dia de verdade | Errar alto é aceitável; errar em silêncio, num arquivo cujo trabalho é contar o passado, não é. Agora a sessão é descartada e o resto continua correto |
| 🔴 **Um teste meu passou pelo motivo errado** | A checagem de ordem comparava **texto**, e `"NaN-NaN-NaN"` vem depois de `"2026-08-23"` porque `N` > `2`. Ele deu verde com o diário produzindo lixo. **Teste que passa pelo motivo errado é pior que teste que falha: dá confiança sem dar cobertura.** Agora compara data de verdade |

---

### ⏳ O chefe — e por que contagem regressiva sozinha é perigosa aqui

A contagem já existia: em `calendario.html`, num cartão chamado *"Dias até a prova"*. O problema
não era falta de número — era o número estar **numa página que quase ninguém abre** e não dizer
nada além do número.

> 🔴 **E contagem regressiva sozinha faz mal neste produto.** Quem presta concurso militar já
> vive com essa data na cabeça. Um número grande dizendo *"faltam 43 dias"* não informa nada que
> a pessoa não saiba, e mexe com a única coisa que atrapalha estudo mais que preguiça:
> **ansiedade**. Concurseiro assustado estuda **menos**, não mais.

Então o chefe tem três partes, e **a terceira é a que justifica a primeira**:

| | O quê | De onde vem |
|---|---|---|
| **Quanto falta** | os dias | o evento de categoria `prova` — já existia |
| **Como você está** | **Preparo de 0 a 100** | 70% DOUTRINA + 30% AMPLITUDE, da ficha |
| **O que fazer** | a matéria que custa mais caro, **nomeada** | `peso × (100 − domínio)` |

Sem a terceira, isto seria um relógio de ansiedade com tema militar.

#### Duas decisões que o teste cobra

**O preparo mede conhecimento, não hábito.** DISCIPLINA e RESISTÊNCIA ficam **de fora** de
propósito: elas dizem *como* você estuda, não *o quanto* você sabe. Quem estuda todo dia há uma
semana tem disciplina 100 e preparo baixo — e misturar as duas faria o número mentir justamente
para quem mais precisa da verdade. O teste passa disciplina 100 e exige que o preparo **não se
mexa**.

**O ponto fraco é o que custa mais, não o menor número.** Física em 20% com peso 2 custa 160;
Português em 60% com peso 3 custa 120. Ganha Física. Se o peso virar, a resposta vira junto — e
o teste confere os dois casos.

**O tom muda com o tempo, mas nunca vira pânico.** Cinco fases, de *Campanha longa* a *O dia
chegou*, e na reta final o conselho muda de *"amplie"* para *"reforce o que já domina"* — que é
o que de fato rende. O teste varre os textos atrás de palavras de desespero e falha se achar.

> **E a cor quente é uma faixa fina na lateral, nunca o fundo inteiro.** Fundo vermelho num app
> de estudo é ansiedade com CSS.

---

### 🎖️ A vitrine de divisas, e um defeito antigo que apareceu no caminho

A tela de tags mostrava **só as tags de matéria** — as 20 divisas de hábito e de condecoração
existiam no catálogo e não apareciam em lugar nenhum. Agora ela mostra as 33: conquistadas em
cima, trancadas embaixo (apagadas, para se ver o que falta) e **as secretas fora da lista**,
porque secreta que aparece na vitrine deixa de ser secreta.

#### 🔴 O defeito que estava lá desde agosto, e contrariava uma ordem dele

`tagVestida` só aceitava a tag escolhida **se a pessoa "ainda a possuísse"** — se o domínio
caísse abaixo de 70%, a escolha sumia sozinha. Parecia zeloso. Mas a ordem dele de 02/08 é o
contrário:

> *"ACUMULA: todas as tags conquistadas ficam guardadas, **para sempre**.
> VESTE: uma de cada vez, escolhida por ele."*

E havia uma consequência pior, que o teste escancarou: como a função só sabia derivar tags de
**matéria**, quem vestisse uma divisa de **hábito** — "Sentinela", de DISCIPLINA acima de 60 —
veria a barra superior mostrar **outra coisa** em todas as páginas. O sistema pareceria quebrado
justamente no momento de exibir a conquista.

**Corrigido:** a escolha vale, desde que o nome seja do catálogo. **Tag não é habilidade** —
habilidade enferruja e suspende de propósito, porque é estado atual; tag é identidade
conquistada, e identidade não se desconquista.

> ⚠️ **O que ainda falta para o "para sempre" ser inteiro, e é honesto dizer:** as divisas são
> **derivadas dos fatos**, então uma de hábito volta a aparecer como trancada na vitrine se o
> hábito cair — só a que está **vestida** sobrevive. Fechar isso exige guardar a lista de
> conquistadas no banco, que é a mesma decisão que o R0 vai ter de tomar para o XP. Ficam juntas.

---

### 🎯 As missões — o que elas são, e o que elas não são

**Missão não é condecoração**, e a diferença justifica existirem as duas:

| | Olha para | Faz o quê |
|---|---|---|
| **Condecoração** | **trás** | reconhece o que você já fez |
| **Missão** | **frente** | propõe o que fazer agora |

Uma lista de 74 medalhas não responde *"o que eu faço nos próximos 25 minutos"* — e é essa
pergunta que faz alguém abrir o aplicativo num dia ruim.

#### O sorteio, e por que ele não usa sorte

As três missões do dia têm de ser **as mesmas o dia inteiro**. Com `Math.random`, recarregar a
página daria outras três — e alguém a um minuto de cumprir *"estude 40 minutos"* veria a missão
virar *"estude 3 matérias"*. Pior: daria para **recarregar até sair a mais fácil**.

Então o sorteio é **determinístico**: a semente é `uid + data`, e a data vem do **servidor**.
Mesma pessoa, mesmo dia, mesmas missões — em qualquer aparelho, **sem gravar nada**.

> A data vir do servidor não é detalhe: se o navegador usasse o próprio relógio, um aparelho com
> a hora errada veria as missões de ontem sendo marcadas como cumpridas pelo estudo de hoje.

#### As diárias têm peso, e o motivo é de produto

As mais fáceis aparecem mais (`peso` de 1 a 5), porque **missão diária existe para ser
cumprida**. Três coisas difíceis todo dia viram uma lista que ninguém olha.

#### As campanhas: o que as separa das medalhas

São **etapas encadeadas** — a próxima só abre quando a anterior fecha. Condecoração é um ponto;
campanha é uma trilha, e a trilha diz **onde você está**. Quatro delas: *Apresentação ao
Quartel* · *Operação Constância* · *Frente Ampla* · *Marcha de Resistência*.

Nenhuma expira, conforme a ordem dele de 01/08: *"Não, a missão não some. Quests são literalmente
quests."*

> 🔴 **A regra do cassino, verificada por programa.** A missão diária é o lugar natural do
> *"entre hoje e ganhe 50 XP"*. Toda condição aqui lê `fatos_de_hoje`, que **só conhece sessão de
> estudo** — não há o que contar que não seja trabalho. E o teste roda 200 usuários num dia em
> que ninguém estudou e exige **zero** missões cumpridas.

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
| ✅ | **Q2** | **O ACERVO ESTÁ CHEIO** — 1.532 questões | **FEITO em 21/09 e ABASTECIDO em 22/09/2026.** **56 provas da EEAR (CFS e EAGS), de 2017 a 2026**, baixadas do servidor oficial da FAB e processadas a **custo R$ 0**. Português 514 · Inglês 335 · Matemática 265 · Informática 237 · Física 181. Duas vias: `tools/baixa-provas.js` + `tools/importa-provas.js` (eu, em lote) e `importar.html` (ele, arrastando um PDF). Escrita fechada — só `publicar_questoes()`, e só para quem está em `administradores`. Provas: `testa-acervo-limpo` (12, contra o acervo REAL) · `testa-importar` (20) · `testa-acervo` (19) |
| ✅ | **Q3** | **FILTROS** — banca · matéria · **assunto dentro da matéria** (funções, porcentagem, crase…) | **FEITO em 21/09/2026**, em `banco.html`. O assunto **depende da matéria**: escolher Matemática abre Logaritmo, Porcentagem, Funções — e trocar para Português troca a lista inteira. Custou **R$ 0**: classificação por palavra-chave, como ele mandou (*"n quero gastar nada com esse filtro"*). O filtro **só oferece o que existe publicado** — não se promete assunto sem questão. Prova: `testa-banco-tela` (11 de 11) |
| 🟡 | **Q4** | 💰 **Amostra grátis × Pro** | **O PORTÃO JÁ ESTÁ DE PÉ desde 21/09/2026**, dentro de `sortear_questoes()`: free = **10 questões novas por dia** e só provas com 4+ anos; beta e pro = **acervo inteiro, sem cota, com as provas recentes**. Medido nas duas pontas em `testa-acervo`. **Falta** o simulado de degustação e o caderno de erros — os dois dependem do R4 |
| ✅ | **Q5** | **MINHAS QUESTÕES** — o aluno traz a prova que o acervo não tem | **FEITO em 22/09/2026**, em `banco.html`, aba *Minhas questões*. Ela solta o PDF, ele é lido **dentro do navegador dela** e as questões ficam **só na conta dela**. 🔴 **Os dois mundos nunca se tocam** — o material pode ter dono, e publicá-lo por engano seria distribuir o que não é nosso. Separação no banco (RLS por `auth.uid()`, `usuario_id` fora do grant de update), no servidor (`sortear_questoes` não enxerga a tabela) e **na tela** (selo "só você vê"). Teto de 2.000 por conta — o plano do Supabase é o free. Provas: `testa-minhas-questoes` (14, com invasão por credencial válida) · `testa-minhas-tela` (16, com PDF de verdade fabricado no teste) |
| 🔴 | **R4** | 💰 **MASMORRA = SIMULADO** — incursão de N questões com relatório de missão no fim | 🔒 aprovado. É onde o corte do Pro mora |



### 📄 O leitor entende outras bancas — 22/09/2026

Ele perguntou: *"você não conseguiu provas dos bombeiros, da polícia, da marinha? Eu queria de
todas as especialidades (...) a pessoa que vai fazer prova de oficial dos bombeiros tem química."*

**Não era falta de prova — era falta de leitura.** Baixei provas de bombeiro de MG, do ES e da ESA
no primeiro minuto, e o leitor devolvia **zero** em todas, porque só conhecia o formato da FAB.

| Formato | Marca da questão | Alternativas | Onde aparece |
|---|---|---|---|
| `fab` | `01 – ` | `a)` `b)` | Força Aérea |
| `questao` | `Questão 01` | `(A)` `(B)` | bombeiro de MG, bancas civis |
| `ponto` | `1.` | `A)` `B)` | bombeiro do ES |
| `circulo` | `01 ` | `Ⓐ` `Ⓑ` | ESA |

O formato **não é escolhido à mão**: conta-se quantas questões cada padrão acha e vence o que
achar mais. Prova de banca desconhecida cai sozinha no formato certo — ou em nenhum, que é a
resposta honesta.

E a lista de matérias foi de **13 para 39**, com o que ele pediu: Química, Biologia, Direito penal,
Direito constitucional, Direitos humanos, Legislação de trânsito, Raciocínio lógico, Proteção e
defesa civil, Primeiros socorros, Enfermagem.

#### 🔴 O gargalo mudou de lugar: agora é o gabarito

Testei **40 PDFs de seis instituições**. A extração funciona em quase todos (67% a 79%). O que
separa os que entram no acervo é uma coisa só: **se o gabarito está no mesmo arquivo.**

| | |
|---|---|
| Força Aérea | publica o caderno **já com o gabarito dentro** → 1.755 questões no acervo |
| Bombeiros, Marinha, ESA, bancas civis | gabarito em **arquivo separado** → nenhuma entrou |

**Sem a resposta certa a questão não serve, e adivinhar seria pior que não ter a prova.** A lista
completa do que testei, com links, está em `onde-baixar-provas.md`.

#### O gabarito de arquivo separado já é lido — com duas travas

1. **Bate ou não entra.** A fileira de números diz quantas respostas vêm; extraem-se as letras e
   **só se a conta bater exatamente** o bloco é aceito. O `pdftotext` cola as letras (`E DCA E B`),
   então contar posição a posição seria adivinhação.
2. 🔴 **Um arquivo, quatro provas.** O gabarito do CBMERJ traz TIPO 1, 2, 3 e 4 — respostas
   **diferentes** para os mesmos números. Sem separar, a questão 1 ficaria com a resposta do tipo 1
   mesmo que o caderno fosse o tipo 3: todas erradas, sem nenhum sinal. Se há mais de um tipo e
   ninguém disse qual, a função devolve **zero** respostas e o motivo.

Medido no gabarito real do CBMERJ: **100 de 100 respostas em cada um dos 4 tipos.**

---

### 📚 O acervo, abastecido em 22/09/2026

Pedido dele: *"eu quero muitas provas, muitas provas mesmo. Eu quero um banco de questões imenso.
Quanto maior, melhor."*

| | |
|---|---|
| **56 provas** | EEAR — CFS (o concurso de sargento) e EAGS (uma prova por **especialidade**) |
| **De 2017 a 2026** | dez anos |
| **1.532 questões distintas** | Português 514 · Inglês 335 · Matemática 265 · Informática 237 · Física 181 |
| **839 com assunto** | 55% — e o resto fica **nulo de propósito**, porque assunto inventado faz o filtro mentir |
| **Custo** | **R$ 0.** Nenhuma chamada de IA, nem para extrair nem para classificar |

Os PDFs moram em **`../ASTRAL-provas`, fora do repositório** — ele é público, e PDF não se
versiona: cada nova versão guardaria o arquivo inteiro de novo. Mesma decisão do `backup.js`.

#### 🔴 O defeito que teria feito o número mentir

Com as 69 provas do EAGS, a medição deu **3.859 questões** — 2.681 delas de Português. Número
bonito e falso: as **24 especialidades do mesmo ano trazem o mesmo bloco de Português**.
Conferido em 6 provas de 2024 — 45 questões apareciam nas 6, idênticas.

Publicar assim daria um acervo grande no papel e **pior na prática**: quem estudasse veria a
mesma pergunta a tarde inteira. A importação agora descarta repetida por texto + alternativas.
**2.327 descartadas.** O número honesto é 1.532.

> Isto é o oposto do que o pedido parecia querer. **1.532 distintas valem mais que 3.859 com a
> mesma pergunta 24 vezes** — e é por isso que está escrito aqui, e não escondido.

#### Os quatro defeitos que só apareceram ao rodar contra 21 provas em vez de uma

| O que estava errado | Por que passou despercebido antes |
|---|---|
| **A matéria era inventada** — saíram matérias chamadas *"Underlined sentence in the text"* e *"Log2x log4x log8x 1 . logo, x = ____"*, com 63 questões dentro | A regra capturava tudo até o fim da **linha** depois de "REFEREM-SE À", e em prova de duas colunas a linha continua com o texto da coluna vizinha. Agora procura-se o **nome** contra uma lista fechada, e o que não casa é descartado |
| 🔴 **"AS QUESTÕES DE 01 A 24" virava gabarito** | O padrão do gabarito é número + letra, e ali `01 A` casa perfeitamente — só que aquele "A" é a **preposição**. Na prova em que achei, a tabela de verdade vinha antes e venceu por sorte. Numa prova em que a frase viesse primeiro, a questão 1 entraria com **resposta inventada** |
| **Os PDFs de 2013 a 2016 são o gabarito, não o caderno** | Rendiam 4 a 8 questões com 4 a 9 "gabaritos" — todos casamento por acaso. Agora o arquivo inteiro é recusado quando não traz gabarito para a maioria das questões que ele próprio tem |
| **Uma linha ruim derrubava 199 boas** | Uma questão chegou com enunciado `"Se de"` (fórmula desmontada), o banco recusou pelo CHECK e a fatia de 200 caiu junto. Agora peneira antes, e quando a fatia cai manda uma a uma |

#### E duas vezes eu errei a peneira, do mesmo jeito

Primeiro cortei *"enunciado com menos de 40 caracteres"* e joguei fora **31 questões boas** —
*"According to the text, scientists"* tem 33 e é válida, porque as alternativas completam a frase.

Depois cortei *"alternativa com menos de 2 caracteres"* e **Matemática caiu de 268 para 179** —
porque resposta de matemática **é** um número de um dígito. E essa regra nem pegava o lixo que a
motivou (`"3 4"` tem três caracteres): só cobrava o preço, sem entregar o benefício.

> **Tamanho não separa questão curta de lixo.** O que separa é ter **frase**: a questão quebrada
> era "Se de", duas palavras. O critério hoje é contagem de palavras no enunciado.

#### O que ficou de fora, e por quê

| Fonte | Por que não entrou |
|---|---|
| **ESA — 91 PDFs no site oficial** | O "gabarito" dela é um documento de **solução**, que dá a resposta por **valor** (*"Alternativa correta: 24 cm"*), não por letra. Casar isso com as alternativas seria adivinhação — e **resposta errada é pior que não ter a prova**. Entra quando houver gabarito por letra |
| **EPCAR · AFA · CIAAR** | `www.fab.mil.br`, `ingresso.afaepcar.fab.mil.br` e `www2.fab.mil.br/ciaar` recusam qualquer pedido meu (**403**). Só `ingresso.eear.fab.mil.br` responde |

---
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
