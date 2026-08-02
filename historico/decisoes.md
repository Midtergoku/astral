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
