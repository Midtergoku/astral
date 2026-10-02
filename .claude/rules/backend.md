---
description: "Edge functions do Astral: autenticacao, quota por unidade, gate de plano, interruptores"
paths:
  - "supabase/functions/**"
---

# Backend — regras das edge functions

> Carrega ao mexer em edge function. O _shared/comum.ts afeta as 8 de uma vez.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

## 8.7. Bloco B2 — blindagem das edge functions (30/07/2026) ✅

### O módulo compartilhado

`supabase/functions/_shared/comum.ts` concentra o que faltava nas 4 funções: identificação
real do usuário, quota, CORS restrito, resposta padronizada e extração tolerante de JSON.
O envelope `servir()` cuida de OPTIONS, método, auth, quota, registro de uso e erros — cada
função ficou só com a sua regra de negócio.

### Antes e depois, medido contra a API real

| Cenário | Antes | Depois |
|---|---|---|
| Chamada com a publishable key | ✅ passava e chamava a Anthropic | 🔒 **401** |
| Chamada sem token | 401 (gateway) | 401 |
| Chamada com JWT de usuário | passava | ✅ passa, com quota |
| PDF de 11 MB | enviado para a API | 🔒 **413**, antes de gastar crédito |
| `Origin: site-malicioso.com` | `ACAO: *` | 🔒 sem cabeçalho CORS |
| Erro interno | vazava texto de billing da Anthropic | mensagem genérica; detalhe só no log |
| Resposta fora de formato | `JSON.parse` estourava | recorte tolerante + validação de schema |

### Quota diária, por plano — **em unidades consumidas, não em chamadas**

Corrigido em 30/07/2026 (migration `..160000`). Ver 8.12 para o porquê — a versão
anterior contava chamadas e vazava dinheiro.

```
              processar-edital  gerar-questoes  buscar-recursos
free                 2               10                5
beta                10               60               30
pro                 10               60               60
                                  ^^^^^^ agora sao QUESTOES
```

`gerar-questoes` grava em `unidades` o número de questões pedidas; as outras duas gravam 1.
Uma chamada de 8 questões gasta 8 do limite. **O número do plano significa o que aparenta
significar** — o que antes não era verdade.

Registrada em `public.uso_ia` (migrations `..130000` e `..160000`), escrita só pela
`service_role`. Uso **só é contabilizado quando a chamada dá certo** — cobrar quota por erro
nosso seria punir o usuário por problema que não é dele. Se a própria consulta de quota
falhar, a chamada é liberada e o erro vai para o log: falhar fechado deixaria o produto
fora do ar.

A reserva acontece **antes** de gastar crédito: `servir()` faz um pré-check de 1 unidade
(barra quem já esgotou), e o handler chama `ctx.cobrar(n)` com o custo real assim que sabe
quanto vai consumir. Estourar dá 429 sem tocar na Anthropic.

> O advisor `rls_enabled_no_policy` em `uso_ia` é **intencional**: RLS ligada sem policy
> nenhuma nega todo acesso via PostgREST, e só a `service_role` enxerga. Não é para "consertar".

### Prompt injection nas 3 funções

Os dados do usuário agora vão dentro de `<materia>`, `<concurso>` e o PDF é explicitamente
declarado como dado, não instrução. É mitigação, não garantia — a defesa real é o escape na
renderização, que vem no B3.

### `notificar-cadastro`

O nome vindo do formulário público era interpolado **cru no HTML do e-mail**. Agora é escapado.
A função também validava nada: qualquer POST disparava e-mail sem passar pela tabela.

⚠️ **Passo manual pendente do Lucas, para fechar isso:**
1. Supabase → Database → Webhooks → editar o webhook de `lista_espera`
2. Adicionar o cabeçalho `x-astral-webhook-secret` com um valor secreto qualquer
3. Rodar `supabase secrets set WEBHOOK_SECRET=<mesmo valor>`

A conferência **só entra em vigor quando `WEBHOOK_SECRET` existir**. Foi feito assim de
propósito: exigir o segredo antes de o webhook mandá-lo derrubaria a notificação em silêncio.

### Ainda aberto

- **Rate limit da `lista_espera`** continua sem solução real. A quota protege as funções de IA
  (que exigem login); o formulário público não tem login para amarrar. Precisa de captcha.
- **O frontend ainda manda a publishable key.** As 3 funções agora respondem 401 para o app.
  Isso é o B3 — ver aviso na seção 0.

---

---

## 8.12. Quota por unidade — o vazamento de dinheiro (30/07/2026) ✅

**Descoberto respondendo uma pergunta do Lucas.** Ele achou que "50 questões por dia" no Pro
era pouco e pediu 60. O número não era 50 questões: era **50 chamadas**, e cada chamada
aceitava até 20 questões. O teto real do Pro era **1.000 questões por dia**.

### A conta, medida

Modelo `claude-sonnet-4-6` · US$ 3 por 1M de entrada, US$ 15 de saída · `max_tokens: 2000`.

| | por chamada | Pro no teto antigo (50/dia) |
|---|---|---|
| Entrada (~800 tokens) | US$ 0,0024 | |
| Saída (teto de 2.000 tokens) | US$ 0,030 | |
| **Total** | **~US$ 0,032 ≈ R$ 0,18** | **~R$ 264/mês** |

Contra uma assinatura de **R$ 19,90**. Prejuízo de ~R$ 244 por assinante que usasse o teto.
5% dos Pro fazendo isso comeria a margem de outros 13 pagantes.

`processar-edital` tinha o mesmo formato de furo e é pior por chamada (PDF de até 10 MB vira
dezenas de milhares de tokens de entrada). Baixado de 20 para 10/dia como medida provisória —
**o certo é janela mensal, não diária**, e isso fica para o gate. Ninguém processa 10 editais
por dia; a pessoa tem um edital.

### O que mudou

- `uso_ia.unidades` (migration `..160000`): quanto a chamada consumiu, não que ela existiu
- `conferirQuota(usuario, funcao, unidades)` soma `unidades` em vez de contar linhas
- `servir()` expõe `ctx.cobrar(n)`; o handler reserva o custo real **antes** de chamar a IA
- `gerar-questoes` capado em **10 por chamada**, não 20 — ver a armadilha abaixo
- Frontend (`questoes.html`) alinhado: `max="10"` e validação em 10

### Armadilha achada de lado: `max_tokens: 2000` não comportava 20 questões

Cada questão com enunciado, 4 alternativas e explicação ocupa ~175 tokens no JSON. 20 × 175 ≈
3.500 tokens contra um teto de 2.000: a resposta cortava no meio e o parse quebrava.

⚠️ **Isso é estimativa aritmética, não medição** — não há créditos na Anthropic para testar de
verdade. Quando houver, confirmar pedindo 10 questões e conferindo se o JSON fecha. O cap de 10
foi escolhido para caber com folga.

### Referência de mercado (buscada, não estimada)

[Qconcursos](https://suporte.qconcursos.com/pt-BR/articles/12633533-guia-dos-planos-do-qconcursos):
grátis = **10 questões/dia**; pago R$ 32/mês = **ilimitado**.

O `free` do Astral foi para 10/dia justamente para empatar com o piso que o concurseiro já
conhece. Mas **a comparação não se sustenta em volume**: o Qconcursos serve banco estático
(custo marginal ~zero, por isso "ilimitado" sai de graça), o Astral **gera** cada questão e
paga por ela. O argumento do Astral é que a questão é do *edital dele*, na matéria em que ele
está fraco — não que tem mais questões.

60/dia no Pro também não é pouco de verdade: rotina disciplinada de concurseiro fica em 30–50
questões/dia.

### Verificado depois do deploy

```
uso_ia.unidades          integer NOT NULL DEFAULT 1   ✅ existe
gerar-questoes    HTTP 401 com a publishable key      ✅ sem regressão
processar-edital  HTTP 401                            ✅
buscar-recursos   HTTP 401                            ✅
```

> **Lição que vale além deste caso:** o limite estava escrito no código e eu tinha lido o
> código antes. O que faltou foi multiplicar — ninguém tinha feito a conta de quanto o teto
> custava em reais. Um número de quota só quer dizer alguma coisa depois de multiplicado pelo
> preço unitário.

---

---

## 8.13. O gate free vs pro (30/07/2026) ✅

**`tipo_plano` deixou de ser cosmético.** Até aqui ele só pintava uma palavra na topbar —
nenhum `if` no projeto inteiro mudava de comportamento por causa dele (era o 🔴 nº 1 da
seção 8).

### A decisão de formato: gate por quota, não por bloqueio de tela

Duas formas de separar free de pro:

| | como é | por que não |
|---|---|---|
| **Bloquear telas** | free não vê Questões nem Recursos | mata o produto para o free antes do lançamento, e boca a boca é o único canal do Lucas hoje |
| **Limitar volume** ✅ | todos veem tudo; free rende menos por dia | a pessoa experimenta o valor inteiro e o teto é que convida a pagar |

Escolhi o segundo. **Isso resolve a decisão que estava aberta na seção 10** ("onde fica a linha
free/pro"). Se o Lucas quiser separação mais dura depois, o `ehCompleto()` já existe e é onde
o bloqueio entraria — é uma mudança de uma linha por tela, não uma reescrita.

### `minha-quota` — a sexta edge function

Leitura pura: devolve plano, se é acesso completo, e `limite`/`usado`/`restante` das 3 funções
de IA. **Não passa pelo `servir()`** — consultar o próprio limite não pode gastar limite. Usa
`autenticar()` direto, que já recusa a chave pública.

### O que o usuário vê agora

| | antes | depois |
|---|---|---|
| Saber o limite | só ao bater nele, com erro seco **depois** de esperar a IA | "Restam 47 de 60 questões hoje (plano PRO)" antes de clicar |
| Campo de quantidade | oferecia mais do que ele podia gastar | `max` desce junto com o saldo |
| Limite esgotado | erro genérico | botão desabilitado + convite ao Pro (só para quem é free) |
| Página da conta | só o badge | card **Meu plano** com os 3 limites e o consumo do dia |

### Testado de ponta a ponta contra a API real

Usuário descartável criado, promovido nos 3 planos, e removido no fim:

```
free  completo=false questoes 10/10  edital 2/2   recursos 5/5
beta  completo=true  questoes 60/60  edital 10/10 recursos 30/30
pro   completo=true  questoes 60/60  edital 10/10 recursos 60/60
apos gastar 8 questoes: usado=8 restante=52 de 60   OK
```

A última linha é a que importa: gastar **8 questões** desconta **8**, não 1. A quota por
unidade funciona de ponta a ponta. E `beta` dá `completo=true` — a promessa vitalícia está
respeitada no código, não só na intenção.

Chave pública em `minha-quota` → **401**, como nas outras cinco.

### Erro meu que o teste pegou

A primeira versão devolvia o objeto cru; as outras 5 funções embrulham em
`{ success, data }`. `buscarQuota()` teria retornado `null` **em silêncio** — o aviso
simplesmente nunca apareceria, sem erro no console. Só apareceu porque testei contra a API de
verdade em vez de conferir o código no olho.

### Ainda aberto

- **`processar-edital` continua em janela diária.** O certo é mensal — ninguém processa 10
  editais por dia, a pessoa tem um edital. O Lucas mandou manter 10 por ora (30/07/2026).
- **Nada cobra ainda.** O gate distingue os planos; quem move alguém para `pro` é o gateway
  de pagamento, que é a Etapa 2. Hoje a promoção é manual no Supabase.

---

---

## 8.15. Questões desligadas — interruptor, não remoção (31/07/2026)

**Decisão do Lucas**, com o raciocínio dele: *"as questões, ao meu ver, pesam mais que a busca
de professores... no futuro, quando tiver rendendo mais capital pra gente, a gente já acrescenta
novamente"*.

Ele estava certo na comparação. Questões são a única ação com custo **recorrente** de verdade —
a pessoa gera todo dia. Edital e busca de professores acontecem uma vez.

### Três camadas, todas reversíveis

| Camada | Onde | Como religar |
|---|---|---|
| Servidor | `FUNCOES_DESLIGADAS` em `_shared/comum.ts` | tirar `"gerar-questoes"` do `Set` |
| Menu | comentário HTML nas 8 páginas | apagar 2 linhas (a instrução está dentro do próprio comentário) |
| Tela | bloco em `questoes.html` + 4 linhas no `init()` | apagar o bloco |

**Nada foi apagado.** O código, a quota, o cap de 10 por chamada e os testes continuam inteiros.

O interruptor do servidor fica **antes da autenticação** de propósito: se a função está
desligada, não há motivo para tocar no banco. Verificado: devolve **503 até com a chave
`service_role`**, que é o nível mais alto de privilégio que existe no projeto.

> ⚠️ Ao religar, lembrar de **reavaliar o preço** — ver 10.4, "Quando as questões voltarem".

---

---

## 8.20. A trava de créditos — edital e guia guardados (29/09/2026) ✅

**Leia antes de mexer em `processar-edital`, `buscar-recursos` ou `servir()`.**

- `processar-edital` calcula a **impressão digital (SHA-256)** do PDF e procura em
  `editais_lidos`. Achou → devolve com `ctx.semCusto()` (não registra uso, não conta na cota).
  Não achou → `conferirJanelaDeEditais()` (**30 dias**: free 2, beta/pro 3 — o 1º edital + as
  trocas) → IA → guarda.
- 🔴 **`servir()` NÃO faz o pré-check diário para `processar-edital`.** O pré-check barrava até o
  edital guardado, que não custa nada. Quem limita a leitura é a janela de 30 dias, que roda
  DEPOIS de procurar o guardado. O `testa-trava-creditos` pegou isso na 1ª execução.
- `buscar-recursos` recebe `edital` (a impressão digital). Só usa e só grava o guia compartilhado
  (`guias_por_edital`) se a **matéria existe no edital guardado** — e troca o `concurso` do
  navegador pelo do edital. **É a trava contra envenenar o guia dos outros; não afrouxar.**
- As duas tabelas são **fechadas** (RLS, sem grant): só a chave de serviço lê.
- A cara de "feito na hora" é da tela (`dashboard.html`: 12 s mínimos, 5 etapas) — decisão dele.
  - ✏️ **30/09/2026 — ele mudou a decisão: SAIU.** Nada de etapas fingidas nem de tempo mínimo.
    Enquanto a leitura corre, uma frase honesta; quando o resultado chega, `revelarResultado()`
    mostra em ~3,5 s cinco linhas com dado **real** (concurso, data e dias, nº de matérias,
    sessões e horas da semana, patente). **Nunca "Edital verificado"** — não há revisão humana.
    Regressão: `node tools/testa-revelacao-tela.js`.
- Regressão: `node tools/testa-trava-creditos.js` (não gasta crédito).

---

## 8.21. O conferidor de links do guia (30/09/2026) ✅

**Pedido dele:** *"o risco da IA inventar professores e links — valide cada link antes de exibir"*.
`_shared/links.ts` → `conferirLinks(dados, listas)`, chamado no `buscar-recursos` **depois** da IA
e **antes** de guardar (`guias_por_edital`) e de devolver. Sem chave de API, R$ 0, ~2 s.

| Link | Como se confere (medido em 30/09) | Inventado dá |
|---|---|---|
| canal `@nome`, `/c/`, `/user/` | página: 404, ou 200 com `<link rel="canonical" …/channel/UC…>` | 404 |
| canal `/channel/UC…` | feed oficial `feeds/videos.xml?channel_id=` | 404 (a página dá 200!) |
| vídeo, playlist, shorts | `youtube.com/oembed` | 404 (a página dá 200!) |
| `youtube.com` puro | não é professor nenhum | corta |
| busca do YouTube | sempre vale | — |
| outro site | 404/410 ou domínio inexistente | corta |

**Só sai o MORTO COM CERTEZA.** 403 de site que barra robô, 429, 5xx e demora ficam: não
conferido não é falso. **Canal de controle** (`@YouTube`): se nem ele passa, o conferidor está cego
(YouTube barrando o servidor) e ninguém é cortado — vai para o log como incerto.

🔴 **Duas armadilhas achadas medindo, não supondo:**
1. A página de canal tem **~1,7 MB** e a marca de canal fica **depois do caractere 400 mil**.
   Eu cortava a leitura em 400 mil: do servidor, TODO canal real dava "incerto". Lê a página inteira.
2. O Node embrulha "domínio não existe" em `e.cause.code === "ENOTFOUND"`; o Deno põe "dns error"
   na mensagem. O conferidor aceita os dois.

**Medir no servidor, não só em casa** — o YouTube responde diferente para IP de nuvem. Em 30/09 foi
com uma função temporária (`diag-links`, lista fixa, senha de uso único), **apagada** depois: 12/12.
Regressão local: `node tools/testa-links.js`. Cada guia gerado grava no log
`buscar-recursos links {ok, morto, incerto, cortados}`.

⚠️ **O caminho com IA nunca rodou** (sem crédito). No dia do crédito, olhar esse log no 1º guia.

---

## 8.22. O TAF lido do edital (30/09/2026)

`processar-edital` passou a pedir também o TAF: `taf: { existe: true|false|null, provas: [{ prova,
nome, masculino, feminino }] }`. `existe: null` = o edital não fala do assunto (diferente de `false`,
"não tem TAF"). `validarTaf()` aceita só as 6 provas que o app sabe treinar (`assets/js/taf.js`);
outra vira `"outra"` e a tela ignora. Índice fora de 0–10000 vira `null`. **O prompt manda não
inventar índice.** `max_tokens` 1000 → 1500 (teto não cobra; ver valores.md §12).

⚠️ **Nunca rodou com a IA de verdade** (sem crédito). Editais já guardados (`editais_lidos`) não têm
`taf` — a página mostra "o edital não informou o TAF" e pede o índice. No 1º edital real, conferir
se o TAF veio.

A página `taf.html`, a tabela `taf_registros` (marca + gatilho de sanidade, 30/dia) e `meu_taf()`
(XP de preparo físico: 10 por prova por dia, separado do XP de estudo) — migration `20260930140000`.
Regressão: `node tools/testa-taf.js` (19 checagens).

---

## 8.23. Os limites de plano saíram do `comum.ts` (01/10/2026)

`LIMITE_DIARIO` e `EDITAIS_EM_30_DIAS` **não existem mais**. Os números moram em
`public.regras_do_plano()` (ver `banco.md` 8.23) e chegam em **`usuario.regras`** dentro de
`autenticar()` — uma consulta a mais por chamada, a mesma tabela que o sorteio de questões e o
navegador usam.

- Ler limite: **`limiteDe(usuario, 'gerar-questoes')`** (`null` = sem limite). Recurso:
  **`pode(usuario, 'acervo_completo')`**. Nunca `usuario.plano === 'pro'`.
- Se as regras não puderem ser lidas, a chamada é **recusada com 503** antes de gastar nada — não
  há número de reserva copiado aqui (seria a segunda tabela que a mudança acabou de eliminar).
- `minha-quota` devolve `limite`/`restante` como `null` quando o plano não tem teto.

Provado no `astral-dev` antes de publicar: grátis 2/10/12, Pro 3/60/60, beta 3/60/30 (idênticos
a antes) e a janela de 30 dias recusando a 3ª leitura com 429. Regressão:
`node tools/testa-fonte-unica.js`.

---

## 8.24. `ctx.ia()` — toda chamada à Anthropic passa por uma porta (02/10/2026)

**Nunca chamar `anthropic.messages.create` direto num handler.** Sempre
`await ctx.ia(() => anthropic.messages.create({...}))`. A porta:

1. confere o **teto global do dia** (`uso_de_ia_hoje` / `teto_global_de_ia`, `banco.md` 8.24) —
   cheio, recusa com 429 *"o Astral atingiu o limite de hoje — nada foi descontado de você"*;
2. marca que **custou** quando a IA responde.

No `catch` do `servir()`, se custou, o uso é **registrado mesmo com a chamada falhando** (auditoria
EDI-01): o PDF que não é edital fazia a IA responder duas vezes, pagas, e não contava em nada.
Falha **antes** da IA (arquivo inválido, rede, crédito) continua sem contar.

Provado no `astral-dev` com uma **"IA de mentira"** (função que imita a Anthropic, apontada por
`ANTHROPIC_BASE_URL`, custo zero): não-PDF não conta; resposta inútil conta; a 3ª leitura cai na
janela; teto do dia cheio recusa até conta nova.
