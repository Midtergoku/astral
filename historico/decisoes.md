# Decisoes fechadas e numeros medidos

> Decisoes de negocio ja tomadas, com o raciocinio. Nao reabrir sem motivo novo.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> Contas e acessos tambem estao aqui.

---

## 10.3. Gateway de pagamento — Mercado Pago (decidido em 30/07/2026)

**O fato que decidiu: o Lucas não tem CNPJ.** A Stripe Brasil não abre conta para pessoa
física, então ela estava fora antes de qualquer comparação de taxa.

Taxas levantadas (não estimadas) sobre a mensalidade de R$ 19,90:

| | Stripe | Mercado Pago |
|---|---|---|
| Pix | 1,19% → sobram R$ 19,66 | **0%** → sobram R$ 19,90 |
| Cartão recorrente | 3,99% + R$ 0,39 + 0,4% → sobram R$ 18,64 | ~2%–3,5% → sobram R$ 19,20–19,50 |

Fontes: [Stripe BR](https://stripe.com/br/payment-method/pix) ·
[Mercado Pago](https://www.mercadopago.com.br/blog/quanto-custa-receber-pagamentos-via-pix-e-codigo-qr).
O Pix do Mercado Pago é isento até **R$ 15 mil/mês** de faturamento — acima disso, 0,49%.

Além do CNPJ, dois motivos secundários pesam a favor: **Pix grátis** (o público paga em Pix) e
**confiança de marca no checkout** — site novo de uma pessoa só pedindo cartão converte melhor
com uma marca que o brasileiro conhece.

**O que se perde com essa escolha, e vale saber:** a Stripe tem recuperação automática de
cobrança recusada (tenta de novo nos dias seguintes) e um portal pronto onde o assinante troca
o cartão e cancela sozinho. No Mercado Pago isso é mais fraco, então **vai dar mais trabalho de
código e mais suporte no WhatsApp do Lucas**. Reavaliar a Stripe se e quando houver CNPJ.

> **Pagar.me ficou de fora por honestidade, não por análise:** não achei números de taxa
> confiáveis. Se voltar à mesa, levantar antes de comparar.

---

---

## 10.4. Custo da Anthropic — medido em 30/07/2026

Preço oficial `claude-sonnet-4-6` (US$ 3/1M entrada, US$ 15/1M saída), busca web a
**US$ 10 por 1.000 buscas**, dólar a **R$ 5,07**.

| Ação | Custo |
|---|---|
| Gerar 10 questões | **R$ 0,15** (R$ 0,015/questão) |
| Processar 1 edital (~30 páginas) | **R$ 0,99** |
| Buscar professores/materiais | **R$ 0,68** |

**US$ 5 (R$ 25) compram** ~1.700 questões, ou ~25 editais, ou ~37 buscas. Para o primeiro teste
de ponta a ponta, sobra.

### 🔴 O modelo de custo MUDOU em 31/07/2026 — leia isto antes de qualquer tabela antiga

Duas decisões do Lucas no mesmo dia viraram a conta de cabeça para baixo:

1. **Questões desligadas** (ver 8.15) — sai a ação que ele julgou mais pesada
2. **Recursos buscados UMA VEZ e fixos** (ver 8.16) — deixa de ser despesa recorrente

**Consequência: o custo deixou de ser mensal e virou uma única vez por pessoa.**

| | Antes (até 30/07) | Agora |
|---|---|---|
| Por usuário, **uma vez** | — | **R$ 5 a 8** |
| Por usuário, **por mês** | R$ 5 a 14, para sempre | **~R$ 0** |
| 10 beta testers, mês 1 | R$ 50–140 | **R$ 50–80** |
| 10 beta testers, mês 2 em diante | R$ 50–140, todo mês | **~R$ 0** |

A conta do "uma vez por pessoa": 1 edital (R$ 0,99) + 6 a 10 matérias × R$ 0,68 de busca de
professores = **R$ 5 a 8**. Depois disso a pessoa não gera custo novo, a menos que troque de
edital ou peça para rebuscar uma matéria.

### Quanto colocar de crédito

| Objetivo | Quanto | Observação |
|---|---|---|
| Testar o produto de ponta a ponta | **US$ 5 (R$ 25)** | dá para 3 a 5 pessoas completas |
| Onboarding de 10 beta testers | **US$ 15–20 (R$ 75–100)** | **gasto único**, não mensal |
| Onboarding de 20 | US$ 30–40 | idem |

> 💡 **A mudança que importa para o bolso dele:** antes, 10 beta testers eram uma sangria de
> R$ 50–140 **todo mês, para sempre**. Agora são R$ 50–80 **uma vez**. O medo dele de que
> "R$ 70–100 por mês pesaria" deixou de se aplicar — vira R$ 70–100 e acabou.

### Ponto de equilíbrio — praticamente resolvido

Com custo recorrente perto de zero, cada assinante Pro rende ~R$ 19,50 líquidos por mês e custa
~R$ 5–8 **uma vez**. **O assinante se paga no primeiro mês**; do segundo em diante é margem
quase inteira.

A pergunta "quantos pagantes para cobrir os beta testers" perdeu o sentido: eles custaram uma
vez e não voltam a custar. **1 assinante paga o onboarding de 2 a 3 beta testers.**

### Quando as questões voltarem

O Lucas já sinalizou (31/07): *"talvez a gente aumente até o valor do site de dezenove e noventa
pra vinte e cinco e noventa"*. Faz sentido — questões são a única ação com custo **recorrente**
de verdade (10 questões = R$ 0,15, e a pessoa faz isso todo dia).

A R$ 25,90, com 60 questões/dia no teto, o pior caso é ~R$ 9,90/mês de API contra R$ 25,50
líquidos — margem confortável. A R$ 19,90 também sobrevive, com folga menor. **Decidir com o
consumo real de `uso_ia` na mão, não agora.**

### Referência antiga (30/07), mantida para comparação

Estes números valiam **antes** das duas decisões acima. Ficam registrados porque mostram o
tamanho do problema que as decisões resolveram — não são mais o custo atual.

| Cenário | Com questões + cache 24h |
|---|---|
| 10 beta testers | R$ 50–140/mês, recorrente |
| 20 beta testers | R$ 100–280/mês, recorrente |

⚠️ **O que é medição e o que é estimativa:** o custo das questões era sólido (o `max_tokens`
trava o teto no código). O do edital e o da busca são **estimativa** — chutei quantos tokens um
PDF de edital e os resultados de busca viram. Sem créditos não dá para medir. Um edital de 100
páginas custaria ~R$ 3, não R$ 1. **Primeira coisa a conferir quando houver crédito.**

---

## 0.5. Skills instaladas — inventário e como funcionam (01/08/2026)

> Pedido do Lucas: *"vou falar os nomes das skills e vc vai baixar e colocar na claude.md.
> Não estou conseguindo achar na internet de jeito nenhum"*. Ele nomeou 7; **todas as 7
> existem** e foram instaladas. Nenhuma foi inventada nem substituída por nome parecido.

### O que é uma skill, e o que ela NÃO é

Uma skill é uma pasta com um `SKILL.md` — instruções que eu carrego **sozinho** quando o
assunto da conversa bate com a descrição dela. Não é biblioteca, não vai para o site, não muda
uma linha do Astral. **Muda como eu penso, não o que o usuário vê.**

⚠️ **Skill não mora dentro do `CLAUDE.md`.** São coisas diferentes: a skill mora em
`~/.claude/skills/<nome>/`, o `CLAUDE.md` é o caderno do projeto. Esta seção é o **registro**
delas, não a instalação.

### Onde ficam, e por que fora do projeto

```
C:\Users\Lucas\.claude\skills\      44 skills, 19 MB
```

> **Atualização de 01/08/2026, mesmo dia:** eu recomendei 8 skills extras e ele aprovou todas
> de uma vez — *"pode baixar as skills que você recomendou, já que você vai achar útil"*.
> Foram de 36 para 44. As 8: `webapp-testing`, `algorithmic-art`, `canvas-design`, `launch`,
> `onboarding`, `community-marketing`, `pricing`, `paywalls`. Todas grátis.
>
> **A mais importante das 8 é `webapp-testing`**, e vale entender por quê: ela abre um
> navegador de verdade e tira foto da tela. Até aqui eu escrevia CSS **sem nunca ver o
> resultado** — dependia de o Lucas olhar e me contar. Numa repaginada de 16 páginas isso
> seria o gargalo de tudo.

**Instaladas no escopo do usuário (`-g`), não do projeto, de propósito:** o repositório do
Astral é **público**. Jogar 13 MB de código de terceiro lá dentro engordaria o repo à toa e
misturaria o que é nosso com o que não é. No escopo do usuário elas valem para qualquer
projeto dele e não sujam o git.

### As 7 que ele pediu

| Ele pediu | O que é de verdade | Repositório |
|---|---|---|
| **UI/UX Pro Max** | banco de dados de design consultável: 84 estilos, 192 paletas, 74 pares de fonte, 98 regras de UX, em 22 stacks | `nextlevelbuilder/ui-ux-pro-max-skill` |
| **Emilkowalski design** | Emil Kowalski (autor do Sonner e do Vaul) — polimento de UI e **animação**. É a mais específica das 7 | `emilkowalski/skills` |
| **Impeccable design** | Paul Bakaus. Dá um **vocabulário compartilhado**: 23 comandos (`polish`, `critique`, `distill`, `bolder`, `quieter`) para dirigir o design com uma palavra | `pbakaus/impeccable` |
| **Taste skill** | anti-genérico. Traz `industrial-brutalist-ui` e `redesign-existing-projects`, os dois mais úteis para nós | `leonxlnx/taste-skill` |
| **Superpowers** | ⚠️ **não é design** — é metodologia de engenharia (TDD, planos, debug sistemático, revisão). Jesse Vincent | `obra/superpowers` |
| **Frontend design** | oficial da **Anthropic**. Direção visual comprometida em vez de template | `anthropics/skills` |
| **Copywriting** | texto que vende, de um repositório de marketing | `coreyhaines31/marketingskills` |

### As 36 instaladas, por grupo

```
DESIGN / VISUAL  frontend-design  impeccable  ui-ux-pro-max  ui-styling  design-system
                 design-taste-frontend  high-end-visual-design  minimalist-ui
                 industrial-brutalist-ui  redesign-existing-projects
                 brand-guidelines  theme-factory  emil-design-eng  apple-design
MOVIMENTO        review-animations  improve-animations  find-animation-opportunities
                 animation-vocabulary  prototype  pick-ui-library
TEXTO            copywriting  copy-editing
ENGENHARIA       brainstorming  writing-plans  executing-plans  test-driven-development
(superpowers)    systematic-debugging  verification-before-completion  writing-skills
                 requesting-code-review  receiving-code-review  using-git-worktrees
                 subagent-driven-development  dispatching-parallel-agents
                 finishing-a-development-branch  using-superpowers
```

### Como usar — a pergunta que ele fez

> *"me diga como usar elas aqui no claude ou se só por estar baixado já vai ser utilizado
> por você"*

**As duas coisas, e é importante ele saber a diferença:**

1. **Automático (o padrão).** Cada skill tem uma descrição de quando serve. Eu leio todas as
   descrições no começo da sessão e carrego a que bate com o assunto. Ele **não precisa fazer
   nada** — pedir "melhora essa tela" já aciona as de design.
2. **Chamando pelo nome**, quando ele quer forçar uma específica: *"usa a impeccable nessa
   tela"*, *"roda a review-animations"*. Serve quando ele quer o olhar de uma e não da outra.

**O limite honesto do automático:** com 36 skills, a escolha é minha e eu posso escolher
errado — pegar a genérica quando ele queria a do Emil. Se o resultado vier com cara de padrão,
**mandar o nome da skill** resolve na hora. Não é falha dele não ter pedido; é limite do
mecanismo.

### O que essas skills NÃO resolvem

- **Não decidem a direção visual.** Elas executam bem depois que a direção existe. O bloco V0
  (9.1) continua necessário — nenhuma skill escolhe por ele entre militar, editorial ou outra.
- **Não veem o site.** Nenhuma abre o navegador nem olha a tela pronta.
- **Não custam nada** — nenhuma delas chama IA paga. ⚠️ **Exceção deliberada:** as skills de
  geração de imagem do `taste-skill` (`imagegen-*`, `brandkit`, `image-to-code`) e o
  `design`/`banner-design` do UI/UX Pro Max **não foram instaladas** — dependem de API de
  imagem paga (Gemini), e dinheiro é restrição real aqui (0.1). Estão a um comando de
  distância se ele quiser.

### ⚠️ Duas ressalvas que ele precisa saber, e que eu não vou esconder

**1. Quase todas assumem React + Tailwind. O Astral é HTML puro sem build.**
Isso não as inutiliza — o raciocínio de tipografia, cor, espaçamento e hierarquia vale em
qualquer lugar. Mas **os exemplos de código vão vir em React**, e sou eu que traduzo para o
nosso HTML. A exceção é `redesign-existing-projects`, que diz explicitamente *"works with any
CSS framework or vanilla CSS"* — por isso ela é a mais alinhada ao que vamos fazer.

**2. Superpowers não é design, e muda como eu trabalho.**
Ele pediu pelo nome, então instalei. Mas é honesto avisar: são 14 skills de método de
engenharia — escrever plano antes de codar, TDD, branch separada, revisão. Deixam o trabalho
**mais cuidadoso e mais lento**. Para o design isso quase não entra; para código de verdade,
entra. Se ele achar que virou burocracia, dá para remover só esse grupo.

### 🎖️ O achado que importa para o V0

`industrial-brutalist-ui`, do `taste-skill`, se descreve como:

> *"Raw mechanical interfaces fusing Swiss typographic print with **military terminal
> aesthetics**. Rigid grids, extreme type scale contrast, utilitarian color, analog degradation
> effects. For data-heavy dashboards (...) that need to feel like **declassified blueprints**."*

**É a direção militar/insígnia da 9.1, já empacotada por outra pessoa.** Eu havia recomendado
essa direção *antes* de saber que a skill existia — chegar ao mesmo lugar por dois caminhos
independentes é o sinal mais forte que temos de que a aposta está certa. Levar isso ao V0.

### Manutenção

```
npx skills list                                  # o que esta instalado
npx skills update -g -y                          # atualiza todas
npx skills remove -g --skill <nome> -y           # tira uma
npx skills add <owner>/<repo> -g -a claude-code --skill <nome> -y   # adiciona
```

⚠️ **Skill roda com permissão total de agente.** Só instalar de fonte conhecida — as 7 acima
são repositórios públicos de autores identificáveis. Não instalar por indicação de IA sem
conferir o repositório.

---

---

## 11. Contas e acessos

- GitHub: `Midtergoku` / repo `astral`
- Vercel: astral-psi.vercel.app
- Supabase: projeto ref `jjogmcacbdefwiwcyjxp` (org `iahjplveolbyvffastxt`)
- Resend / Google Cloud (projeto "Astral") / e-mail: lherdy2003@gmail.com
- hCaptcha: conta dele, sitekey pública no `astral.js`, secret **só** no Supabase
- Secrets no Supabase: `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `WEBHOOK_SECRET`,
  `HCAPTCHA_SECRET` (nunca no frontend, nunca em arquivo do repo)

**Regras de segurança inegociáveis:** chave sensível só em Supabase Secrets · RLS em toda
tabela nova · validação no front E no back · nunca armazenar dado de cartão.

### Usuários reais (auditado em 31/07/2026)

7 contas: 6 por Google e **1 por e-mail/senha** — esta última é o teste que o Lucas fez em
31/07 para validar o captcha. São ele, amigos e testes; ainda não há usuário externo de
verdade. Listar com a API de admin quando precisar reconferir.

### 💰 Banco de questões: acesso TOTAL é do Pro — decisão dele, 17/09/2026

> *"só será liberado totalmente as questões para os pros"*

**O que fica decidido:** o banco de questões de provas antigas **não é aberto por inteiro no
plano gratuito**. O free vê uma parte; o Pro vê tudo.

**Por que isto é a decisão certa, e não só preferência:** era o furo do meu próprio argumento.
Eu tinha escrito no roadmap que o banco *"dá ao usuário uma razão real para abrir o Astral sem
gastar um centavo de IA"* — mas se fosse tudo de graça, ele daria essa razão e **nenhum motivo
para pagar**. Com o corte, o mesmo conteúdo faz as duas coisas: a amostra prende, o volume
converte.

**E o encanamento já existe.** `LIMITE_DIARIO` em `supabase/functions/_shared/comum.ts:162` já
faz exatamente esse corte por plano, e o free já está em **10 questões/dia — empatando de
propósito com o plano gratuito do Qconcursos**, que é a referência que o concurseiro conhece.
O banco de questões pode reusar o mesmo desenho sem inventar nada.

> ⚠️ **Uma diferença que importa na hora de implementar:** questão de prova antiga **não é
> chamada de IA**. Ela não gasta crédito da Anthropic e **não pode ser contada na tabela
> `uso_ia`**, que existe para conter custo. O limite do banco é decisão de **produto**
> (o que faz alguém assinar), não de **custo** (o que impede a conta de estourar). Misturar as
> duas na mesma tabela faria o relatório de gasto mentir.

> ✏️ **18/09/2026 — ele confirmou o desenho:** *"vamos fazer alguma maneira da pessoa ter uma
> amostra grátis das questões, mas a liberação total será no plano pro"*. Amostra grátis
> **existe**; o acesso total é do Pro.

#### A proposta de corte — minha recomendação, decisão dele

O erro comum aqui é cortar **só por quantidade**. Para um app de estudo, mais questões não é o
que faz alguém assinar — **saber no que você errou e treinar exatamente aquilo** é. Então o
corte tem duas camadas, e a segunda é a que converte.

| | **Grátis** | **Pro** |
|---|---|---|
| **Quantas** | **10 por dia** — o número já está no código (`LIMITE_DIARIO`) e empata de propósito com o Qconcursos grátis | ilimitado |
| **Quais** | sorteadas do acervo | **filtradas pelas matérias do SEU edital**, com o peso de cada uma |
| **Idade da prova** | provas de 4 anos ou mais | **inclui as mais recentes** — a banca muda de estilo, e recência é valor real para o concurseiro |
| **Caderno de erros** | ❌ | ✅ **o que faz voltar todo dia**: o que você errou volta até acertar |
| **Modo simulado** (a masmorra, R4) | **1 completo, uma vez** — a degustação | à vontade |
| Gabarito e correção | ✅ sempre | ✅ |

**Por que a degustação é 1 simulado COMPLETO, e não 3 questões soltas:** três questões mostram
que o acervo existe; um simulado inteiro faz a pessoa **sentir o produto funcionando** — o
relatório de missão no fim, o desempenho por matéria, a comparação com o edital dela. Ninguém
assina pelo que viu de relance; assina pelo que já experimentou uma vez inteiro.

**Por que recência é a melhor alavanca secundária:** custa R$ 0 (o ano já é campo da questão),
não esconde conteúdo essencial de ninguém — quem é grátis ainda estuda com prova de verdade —
e é exatamente o que um concurseiro pagaria para ter.

> 🔴 **Ordem obrigatória:** nada disto pode entrar antes de `node tools/testa-xp-forjado.js`
> passar limpo. No dia em que o acesso depender de progresso, um número digitado no console
> vira furar a fila — e hoje ele é aceito (medido em 17/09: 5 furos). Ver o bloco do XP no
> roadmap.

> ❓ **O que ele ainda não disse, e eu não vou inventar:** quanto é "uma parte" para o free —
> por dia, por prova, ou por matéria. Fica em aberto até ele decidir.

---

### 💰 Filtro de assunto: palavra-chave e so — decisão dele, 19/09/2026

> *"Eu entendo a recomendação, mas não quero gastar nada com esse filtro."*

**O que fica decidido:** o filtro por assunto (Q3) usa **só o classificador por palavra-chave**,
que custa **R$ 0**. A opção de mandar as questões restantes para a IA — que eu havia recomendado
para os ~29% que sobram — **está fora**.

**O que isso significa na prática, medido em 19/09:**

| | |
|---|---|
| Questões com assunto preenchido | **~71%** (medido às cegas, numa prova que o dicionário nunca viu) |
| Questões acessíveis só por banca e matéria | ~29% |
| Custo | **R$ 0, para sempre** |

**E o caminho para melhorar sem gastar existe:** o dicionário saiu de **49% para 83%** numa
tarde, só acrescentando termos que faltavam. Ele cresce lendo questão, não pagando por token.
Cada prova nova que entrar no acervo é uma chance de completá-lo — e o ganho fica, porque vale
para todas as provas seguintes.

**A regra de tela que vem junto:** mostrar no filtro **apenas os assuntos que existem**, e deixar
o resto acessível por matéria. Ninguém sente falta de um filtro que não está lá; o que irrita é
filtro que promete e vem vazio.

---

### 🗄️ Onde guardar o XP e as conquistas — decisão dele, 20/09/2026

> *"Nós podemos fazer isso no mesmo lugar. Em uma página só. Entendeu? A gente economizaria bem."*

⚠️ **Registro honesto de como a pergunta chegou:** ele disse antes *"eu não entendi bem a sua
pergunta"* — e com razão, porque eu perguntei em linguagem técnica. Eu falava de **onde o banco
guarda**; a palavra "página" na resposta é de tela. Mas a decisão que ele tomou — **um lugar só
para as duas coisas** — responde exatamente o que eu precisava, e é a escolha certa. Fica valendo
nessa leitura; se ele quiser corrigir depois, corrige.

#### O que fica decidido

**Um único lugar guarda as duas coisas:** o XP conferido pelo servidor e a lista de condecorações
conquistadas.

#### Por que isso é o certo, e não só mais barato

As duas respondem à **mesma pergunta**: *"o que esta pessoa já conquistou, de forma permanente?"*
Separar criaria dois lugares para a mesma verdade — e dois lugares para a mesma verdade divergem,
é só questão de tempo. O barato aqui veio junto com o correto.

#### Os dois problemas que isso destrava

| | Medido em |
|---|---|
| **XP forjável** — dá para escrever 999.999.999, e de forma permanente | 17/09, `tools/testa-xp-forjado.js`, 5 furos |
| **Trocar de concurso apaga 4 condecorações e 3 divisas** | 19/09, `tools/testa-troca-de-edital.js` |

O segundo contraria a regra dele de 02/08 — *"conquista não se desconquista"* — que o próprio
`salvar_progresso` já respeita para os badges antigos, fazendo **união** e nunca substituição.

#### 🔴 O que AINDA falta decidir, e é dele

"Um lugar só" resolve o **onde**. Falta o **como**, e é onde dá para errar de um jeito que não se
conserta sozinho:

1. **A conquista é gravada quando cai, ou recalculada sempre?** Hoje é recalculada — e é por isso
   que ela se desfaz ao trocar de concurso. Gravar resolve, mas passa a existir dado que pode
   divergir do cálculo.
2. **Quem grava: o navegador ou o servidor?** Se for o navegador, volta a ser forjável — medi
   isso, e o banco aceitou uma conquista chamada `conquista_que_nao_existe`.
3. **O que acontece com quem já tem progresso** no dia em que a tabela nascer.

**Por isso eu parei e não construí sozinho enquanto ele estava fora:** dado permanente de usuário
modelado errado só se conserta migrando o dado de quem já usou. É a fronteira que ele mesmo
desenhou em 19/09.

---

### 🚦 Trabalhar sozinho enquanto ele está longe — 19/09/2026

> *"Vou ficar longe do pc, então pode ir prosseguindo sem minha autorização, mas pare se for
> alguma mudança muito violenta."*

Isto **não substitui** a regra 8.1 do `CLAUDE.md` — afina ela para uma situação específica:
ele não está por perto para desfazer nada, nem para responder uma pergunta. Então o critério
de sempre (*"se der errado, eu desfaço sozinho em 5 minutos?"*) fica **mais apertado**, porque
"desfaço sozinho" agora é a única opção que existe.

#### O que eu faço sem perguntar

Seguir o `roadmap-rpg.md` na ordem, item por item, com teste e prova para cada um. Corrigir
defeito que eu mesmo achar. Registrar tudo. Publicar o que o `verifica.js` aprovar.

#### 🛑 O que eu PARO e deixo esperando — a lista fechada

| | Por quê |
|---|---|
| **Qualquer coisa que gaste dinheiro** | regra do 💰, e ele está sem |
| **Migration destrutiva** — apagar coluna, apertar CHECK, mexer em RLS ou grant | não se desfaz sozinho, e ele não está aqui para autorizar |
| **Apagar ou mover** arquivo, pasta ou linha do banco | irreversível por definição |
| **Mudar o que a landing promete**, preço, plano ou cobrança | decisão de dono |
| **Remover funcionalidade que alguém já usa** | mesmo que pareça obsoleta |
| **Dado de usuário**: exportar, excluir, mandar para fora | nunca, com ou sem ele |
| **Funcionalidade nova grande** (mais de uma sessão) | 🔴 **inclui o R2, a árvore de habilidades** — ver abaixo |

> 🔴 **O R2 fica esperando, e o motivo é concreto.** A árvore de habilidades exige **guardar
> escolhas permanentes** (pontos gastos em ramos), e escolha gravada é o tipo de coisa que, se
> eu modelar errado, não se conserta sem mexer no dado de quem já usou. É exatamente a fronteira
> que ele mandou eu não cruzar sozinho. Fica para quando ele voltar.

> ⚠️ **E a regra 9 vale com força:** se eu publicar algo e o site quebrar, **reverto na hora**,
> sem esperar resposta. Com ele longe, deixar o site fora do ar esperando autorização seria o
> pior resultado possível.

**Ordem de trabalho enquanto ele está fora:** R7 (diário de campanha) → R9 (reengajamento) →
R10 (prestígio, **só a parte que não grava nada novo**) → e então parar e relatar.

---

### De onde o projeto veio — contexto que explica escolhas

O Lucas construiu o Astral até 29/07/2026 com **outras IAs**: Gemini e Opus dentro do
**Antigravity IDE**, e Claude pelo navegador. Comprou o Claude Code especificamente para
**elevar o nível técnico** do que já existia.

Isso explica o estado que encontrei: design bem acabado e produto pensado, mas com XSS
sistêmico, endpoints de IA abertos, nenhuma persistência em banco e zero versionamento local.
Código gerado por conversa solta acumula isso — não é descuido dele.

**Consequência prática:** quando algo parecer arbitrário no código antigo, provavelmente é
resíduo daquela fase, não decisão. Vale perguntar antes de preservar por respeito.

---
