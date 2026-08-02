# Blocos executados — 8.5 a 8.19

> O que foi construido, na ordem, com o que foi medido em cada um.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> Consulte antes de refazer qualquer varredura ou de "consertar" algo que parece estranho: pode ter sido decisao.

---

## 8.5. Bloco A — extração da casca compartilhada (29/07/2026)

```
assets/
├── css/app.css        27 regras comuns as 8 paginas do app
└── js/transicao.js    transicao de pagina, era identica nos 8
tools/
└── valida-css.js      verificador de equivalencia
```

**Critério usado.** Uma regra só foi extraída se o seletor aparece **exatamente uma vez**
em cada uma das 8 páginas e as 8 versões são semanticamente idênticas. A exigência de
ocorrência única não é preciosismo: 5 páginas declaram o mesmo seletor duas vezes (definição
+ ajuste posterior), e um critério mais frouxo teria dado a `recursos` e `questoes` um `.card`
com fundo e borda que elas nunca tiveram. O verificador pegou isso antes de aplicar.

**O que ficou inline de propósito.** 35 seletores divergem de verdade entre páginas —
`.topbar` (4 versões), `:root` (3), `.section-title` (2), `.materia-*` (3). Não é sujeira:
o resumo compacto do dashboard usa fonte menor que a lista completa do progresso. Unificar
seria decisão de design, não refatoração — fica para a Etapa 3.

**Como verificar depois de qualquer mexida em CSS:**

```bash
node tools/valida-css.js            # disco x HEAD
node tools/valida-css.js HEAD~3     # disco x um ponto anterior
node tools/valida-css.js 9430894~1  # disco x antes do Bloco A
```

Compara o CSS resolvido de cada página — seletor por seletor, propriedade por propriedade —
contra o ref indicado. Serve para provar que uma refatoração não mudou nada.

> ⚠️ **Duas armadilhas já corrigidas nele.** Se for reescrever algo parecido, herde as duas:
> 1. At-rules (`@keyframes`, `@media`) devem ser comparadas por **nome/query**, nunca por
>    posição — extrair move as compartilhadas para o topo e uma comparação posicional acusa
>    falso positivo nas 8 páginas.
> 2. O lado "antes" precisa ler o `app.css` **do mesmo ref**, não do disco. Sem isso, a
>    verificação passa antes do commit e falha logo depois, porque o `HEAD` já contém o
>    HTML extraído mas o `app.css` do disco entra só de um lado.

**Resultado:** 29 KB de duplicação eliminados, CSS resolvido idêntico nas 8 páginas.

---

---

## 8.6. Bloco B1 — migrations de banco (30/07/2026) ✅

**As 5 primeiras migrations do projeto.** O schema deixou de existir só na nuvem.

| Migration | O que fez |
|---|---|
| `..120000_conserta_criacao_de_perfil` | `set search_path = public` na função + trocou o `exception` cego por `raise warning` + backfill |
| `..120100_trava_tipo_plano` | `revoke all` de anon/authenticated em `perfis`; devolveu só `select` + `update(nome)`; `with check` explícito |
| `..120200_valida_lista_espera` | `revoke all`, devolveu só `insert`; 4 CHECK constraints; policy com validação |
| `..120300_revoga_execute_publico` | `revoke execute` da função de trigger |
| `..120400_remove_registro_de_teste` | limpeza da linha criada no teste de ponta a ponta |

### Resultado medido

```
antes:  6 usuarios, 0 perfis  |  advisors: 5 avisos
depois: 6 usuarios, 6 perfis  |  advisors: 1 aviso
```

O aviso restante é `auth_leaked_password_protection` — **toggle no painel, só o Lucas faz:**
Authentication → Policies → ativar checagem contra HaveIBeenPwned. Custo zero.

### Privilégios, antes e depois

```
antes   perfis:        anon=arwdDxtm   authenticated=arwdDxtm     (tudo)
        lista_espera:  anon=arwdDxtm   authenticated=arwdDxtm     (tudo)

depois  perfis:        anon=(nenhum)   authenticated=r + update(nome)
        lista_espera:  anon=a          authenticated=a            (so insert)
```

Descoberta durante o trabalho: `anon` tinha privilégio **total** nas duas tabelas. A RLS era a
única barreira. Agora são duas.

### Testes de ponta a ponta contra a API REST real (como `anon`)

| Teste | Resultado |
|---|---|
| INSERT válido na lista de espera | ✅ HTTP 201 — **a captação de leads continua funcionando** |
| INSERT com e-mail inválido | ✅ recusado |
| INSERT com nome de 500 caracteres | ✅ recusado |
| INSERT com nome de 1 caractere | ✅ recusado |
| SELECT anônimo em `lista_espera` | ✅ `permission denied` |
| SELECT anônimo em `perfis` | ✅ `permission denied` |

> Testar o INSERT válido não era opcional: revogar um grant a mais derrubaria o formulário da
> landing em silêncio, e ninguém perceberia até faltar lead. O teste criou uma linha real e o
> webhook disparou um e-mail para o Lucas — falso positivo, era o teste. A linha foi removida
> pela migration `..120400`.

### ⚠️ Ainda em aberto no banco

- **Rate limit da lista de espera.** As constraints limitam o *conteúdo*, não o *volume*.
  Um script ainda consegue inserir milhares de linhas válidas. O limite de verdade precisa de
  captcha ou edge function — vai no B2.
- **`tipo_plano` continua em `perfis`.** Para a Etapa 2 o certo é uma tabela `assinaturas`
  que só o `service_role` escreve. O grant de coluna resolve o furo imediato, não a modelagem.

---

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

## 8.8. Bloco B3 — frontend blindado (30/07/2026) ✅

### `assets/js/astral.js` — núcleo compartilhado das 11 páginas

Reúne o que estava duplicado (cliente Supabase, guarda de sessão, logout) e acrescenta o que
não existia: `esc()`, `att()`, `escJs()`, `urlSegura()`, `toast()` e `chamarIA()`.

**A versão do `supabase-js` está travada em 2.111.0**, num lugar só. Antes eram 11 arquivos
importando `/+esm` sem pin — o jsdelivr entregava sempre a última versão, então um major novo
derrubaria o app sozinho, de madrugada.

### O que mudou

| | Antes | Depois |
|---|---|---|
| Header das 4 chamadas de IA | publishable key | `access_token` do usuário |
| `q.enunciado`, alternativas, explicação | `innerHTML` cru | `esc()` |
| Nome de matéria, nome/obs de evento | `innerHTML` cru | `esc()` |
| `href="${url}"` da IA | aceitava `javascript:` | `urlSegura()` — só http/https |
| `onclick="responder(0,'${alt}')"` | escapava só `'` | removido: `data-indice` + listener |
| `onclick="selecionarMateria('${m.nome}')"` | idem | removido: `data-indice` + listener |
| Headers HTTP | nenhum | `vercel.json` com CSP, HSTS, nosniff, frame-ancestors |
| PDF | sem limite no cliente | 10 MB, igual ao servidor |
| `processarEdital` | `stringify` + `parse` do que já era objeto | direto |
| `alert(err.message)` | vazava erro da API | `toast()` |

### Sobre a CSP: por que `script-src` tem `'unsafe-inline'`

O projeto não tem build, e há JavaScript inline em todas as páginas. Sem hash ou nonce — que
exigiriam etapa de build — `'unsafe-inline'` é obrigatório, senão nada roda. A CSP ainda vale
muito pelo resto: `connect-src` limita para onde um script conseguiria enviar dados roubados,
`frame-ancestors 'none'` mata clickjacking, `object-src 'none'` e `base-uri 'none'` fecham
vetores clássicos. **A defesa contra XSS aqui é o `esc()`, não a CSP** — a CSP é a segunda
barreira, e incompleta.

### Verificações automatizadas

```bash
node tools/valida-css.js     # CSS resolvido identico ao original
```

Na sessão também rodaram, a partir do scratchpad: checagem de sintaxe dos 22 blocos `<script>`
(`node --check`) e conferência de que cada página importa todos os símbolos que usa. Vale
recriar esses dois se for mexer em muitos arquivos de uma vez.

### Fica para o Bloco D

10 `alert()` de validação de formulário em `cadastro`, `calendario`, `login` e `progresso`.
Não converti porque `login` e `cadastro` **não têm CSS de toast** — trocar agora deixaria o
erro invisível, que é pior que um alert feio. O D leva o CSS junto.

---

---

## 8.9. Bloco C, parte 1 — autenticação por e-mail (30/07/2026)

**Decisão do Lucas:** manter os dois meios de entrada, e-mail/senha **e** Google.

### O que foi construído

| Arquivo | O quê |
|---|---|
| **`redefinir-senha.html`** | **A página que nunca existiu.** Chama `updateUser({ password })`, com medidor de força, confirmação de senha e tratamento de link expirado |
| `login.html` | `redirectTo` corrigido para `redefinir-senha.html`; detecta token de recuperação e reencaminha; mensagens específicas por tipo de erro; `alert()` → mensagem na tela |
| `criar-conta.html` | `emailRedirectTo` adicionado; se o signup já devolve sessão, vai direto ao dashboard em vez de mandar esperar um e-mail que não vem |

### Por que a redefinição estava quebrada de ponta a ponta

Três defeitos empilhados:

1. O provedor de e-mail está **desligado** no projeto — nada era enviado.
2. O `redirectTo` apontava para a própria `login.html`, que não sabe tratar o token.
3. **Nenhuma página chamava `updateUser({ password })`.**

Mesmo ligando o provedor, os defeitos 2 e 3 continuariam: o usuário clicava no link, o
`supabase-js` trocava o token por sessão, a `login.html` via sessão válida e mandava para o
dashboard. Resultado: virava um link mágico de login, **e a senha nunca era trocada.**
A `login.html` agora desvia o token antes de qualquer outra coisa.

### Decisão de segurança registrada

`esqueceuSenha` responde **a mesma mensagem** quer o e-mail exista ou não. Dizer "esse e-mail
não tem conta" entregaria a lista de quem é cadastrado para qualquer curioso.

### O bloqueio real: entrega de e-mail

O SMTP padrão do Supabase manda **2 mensagens por hora e só para endereços pré-autorizados**.
Com ele, cadastro por e-mail de usuário real não fecha o ciclo. Caminho em duas etapas
documentado em **13.4**: ligar sem confirmação agora, SMTP próprio via Resend depois — o que
exige domínio, que a Etapa 2 do projeto vai precisar de qualquer forma.

---

---

## 8.10. Bloco C, parte 2 — LGPD e Termos de Uso (30/07/2026) ✅

### `conta.html` — a página que faltava

Primeira página nova construída **em cima do `assets/css/app.css`** do Bloco A: a casca vem
pronta, só o específico dela ficou inline. É a prova prática de que aquele bloco valeu.

Traz três coisas: os dados que o Astral guarda, **baixar meus dados** e **excluir minha conta**.
Ligada na sidebar das 8 páginas do app.

### O risco jurídico que existia

A Política de Privacidade prometia, desde sempre, "direito ao esquecimento" e portabilidade —
e o app **não entregava nenhum dos dois**. Promessa não cumprida em documento público é
exposição real, e vira obrigação formal no dia em que houver cobrança. Agora:

| Direito da LGPD | Como o usuário exerce |
|---|---|
| Portabilidade | Botão "Baixar meus dados" → JSON com perfil + tudo do `localStorage` |
| Esquecimento | "Excluir minha conta" → apaga de `auth.users`, com CASCADE em `perfis` e `uso_ia` |

A exportação junta **as duas fontes** de dados, banco e navegador, porque o progresso ainda
mora no `localStorage` (seção 5). Quando a Etapa 2 migrar o estado para o banco, isso simplifica.

### `excluir-conta` — a quinta edge function

Apagar de `auth.users` exige `service_role`, que não pode existir no navegador. A função reusa
`autenticar()` do `_shared/comum.ts` e **exige que o usuário digite `EXCLUIR`** — sem isso, um
clique acidental ou um CSRF destruiria a conta.

Testado contra a API real:

| Cenário | Resultado |
|---|---|
| Chave pública | 🔒 401 |
| Logado, sem confirmação | 🔒 400 |
| Logado, texto errado | 🔒 400 |
| Logado, `EXCLUIR` | ✅ 200 — usuário e perfil sumiram, CASCADE confirmado |

### `termos.html`

Não existia. Escrito para o caso real do produto, não genérico: **isenta de garantia de
aprovação**, avisa que conteúdo de IA erra e que o edital oficial é a única fonte válida,
descreve os limites diários por plano, e já traz o direito de arrependimento do art. 49 do CDC
para quando a cobrança começar. Também avisa que parte do progresso vive no navegador e pode
se perder — honestidade que evita reclamação depois.

Ligado em: `criar-conta.html` e `cadastro.html` (no aceite), rodapé da landing, e
`privacidade.html`. O rodapé da landing **não tinha link legal nenhum**, e ainda dizia
"© 2025" — corrigido.

---

---

## 8.11. Bloco D — acabamento (30/07/2026) ✅

### 🔴 O achado que valeu o bloco: o app era inusável no celular

As 9 páginas escondem a sidebar com `translateX(-100%)` abaixo de 768px — e **nenhuma tinha
botão para trazê-la de volta**. Na prática, quem abrisse o Astral no telefone ficava preso na
página em que caiu, sem conseguir ir para Questões, Progresso ou qualquer outra.

Para um produto cujo usuário estuda no celular, isso não é detalhe de acabamento: é perda
direta de retenção, e provavelmente explica parte do desuso.

Resolvido em `assets/js/astral.js` com `iniciarMenuMobile()`: botão flutuante, sidebar deslizante,
fundo escurecido, fecha ao clicar fora, no Esc, ou ao navegar. **Uma implementação para as 9
páginas** — no CSS de cada uma teriam sido 9 cópias para divergir depois.

> Detalhe que importa: a regra usa `.sidebar.astral-aberta` (especificidade 0,2,0) para vencer
> o `.sidebar` (0,1,0) que a página esconde, **independente da ordem** em que os estilos entram.
> Injetar CSS de fora e depender de ordem seria frágil.

### Toast em todo lugar, sem mexer em 13 arquivos

Sobravam 10 `alert()` porque `login`, `cadastro` e `criar-conta` não tinham CSS de toast —
converter sem estilo deixaria o erro invisível, pior que um alert feio.

Agora `toast()` **injeta o próprio CSS como primeiro filho do `<head>`**. A posição é
deliberada: o CSS da página vem depois e, com a mesma especificidade, vence — então as páginas
que já tinham `.toast` próprio ficaram exatamente como estavam, e as que não tinham passaram a
ter. **Zero `alert()` no projeto.**

Acrescentado `role="status"` e `aria-live="polite"`: leitor de tela anuncia sem roubar o foco.

Em `cadastro.html`, os códigos `42501` e `23514` (policy e CHECK do Bloco B1) agora viram
mensagem específica. Antes o usuário via "erro ao salvar" e não fazia ideia do que corrigir.

### Segunda chance na resposta da IA

`comSegundaChance()` em `_shared/comum.ts`: se a resposta vier fora de formato (502), repete
uma vez com instrução reforçada. Modelo é não-determinístico — o que saiu torto costuma sair
certo na repetição.

**Só repete no 502.** Erro de crédito, quota ou rede não melhora repetindo, e gastaria o dobro
à toa. A repetição consome créditos da Anthropic de novo, mas a **quota do usuário conta uma
vez só**: ele não paga pelo erro do modelo.

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

## 8.14. Monitoramento de erros (31/07/2026) ✅

**Antes disto, falha em produção era invisível.** A tela quebrava, o beta tester ia embora, e
ninguém descobria — nem ele reclamava, ele só sumia. Era o 🟠 nº 2 da fila.

### Por que caseiro e não Sentry

Sentry/LogRocket/Bugsnag têm plano grátis, mas **exigem criar conta em serviço de terceiro** —
confirmar e-mail na caixa do Lucas e aceitar termos em nome dele. Não é coisa que eu possa
fazer, e ele não quer executar passo manual. O banco já existe e o custo é zero.

### As três peças

| Peça | O quê |
|---|---|
| `erros_cliente` (migration `..100000`) | RLS ligada **sem policy** — mesma técnica de `uso_ia`: nega tudo via PostgREST, só `service_role` enxerga. Limites de tamanho por CHECK no próprio banco |
| `registrar-erro` (edge function) | Recebe o relato. `verify_jwt = false` |
| `astral.js` | `window.error` + `unhandledrejection` → envia com `keepalive` |

### As decisões que importam

**`verify_jwt = false`, de propósito.** Metade dos erros que interessam acontece na tela de
login, onde ninguém está autenticado. Isso abre porta pública, então ela é estreita:

- corpo de até 16 KB; todo campo truncado (mensagem 2.000, pilha 4.000)
- teto global de **500 por hora** — protege contra um script enchendo a tabela
- **responde 204 sempre**, mesmo quando descarta

Esse último ponto é regra, não detalhe: **um relator de erro não pode virar mais uma fonte de
erro na tela.** Ele roda no caminho de uma falha que já aconteceu.

**`keepalive: true`** faz a requisição sobreviver ao fechamento da aba — que é exatamente o
que a pessoa faz quando a tela quebra. Sem isso, justamente os erros piores se perdem.

**Proteção no cliente também:** mesmo erro repetido vai uma vez só, máximo 10 por página. Um
erro dentro de um laço de render dispararia centenas de chamadas idênticas.

**`on delete set null`** no `usuario_id`, não cascade: se a conta for excluída (LGPD), o erro
continua servindo para diagnóstico, só perde o vínculo com a pessoa.

### Testado contra a API real

| Cenário | Resultado |
|---|---|
| Relato anônimo comum | ✅ 204, 1 linha gravada |
| Corpo de 20 KB | ✅ 204, **nada gravado** |
| Mensagem vazia | ✅ 204, **nada gravado** |

Linha de teste removida depois.

### Como o Lucas vê os erros

Ele não vê — **e isso é intencional por ora.** Construir uma tela de administração seria mais
superfície para proteger. A consulta é minha:

```sql
select criado_em, mensagem, pagina, origem, usuario_id
from public.erros_cliente
order by criado_em desc
limit 50;
```

Se um dia o volume justificar, aí vale a tela.

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

## 8.16. Recursos: uma busca, permanente (31/07/2026)

**Antes:** cache no `localStorage` com validade de 24h. Cada vencimento disparava outra busca
na IA da **mesma matéria**, a ~R$ 0,68 por vez. Seis matérias por três meses ≈ **540 buscas,
~R$ 367** de uma informação que quase não muda.

**O argumento do Lucas não foi custo — foi produto:** *"isso a gente vai organizar mais ainda o
conteúdo dele, o estudo dele, ele não vai ter que ficar procurando outros professores sempre"*.
Uma lista estável de professores serve melhor a quem estuda do que uma lista que muda toda
semana. A economia veio de brinde.

### O que mudou

| | Antes | Agora |
|---|---|---|
| Onde mora | `localStorage` do navegador | tabela `recursos_salvos`, na conta |
| Validade | 24 horas | **nenhuma** — é permanente |
| Troca de aparelho | perdia tudo | acompanha a conta |
| Rebusca | automática e invisível | **só a pedido**, com confirmação |

Uma linha por `(usuario_id, materia)`, com `unique` — o upsert substitui em vez de acumular.
O campo `concurso` guarda o edital do momento da busca: se a pessoa trocar de edital, o valor
deixa de bater e a tela sabe que precisa buscar de novo. É a única rebusca automática que
sobrou, e ela é correta.

### Duas decisões de robustez

**Se o upsert falhar, o resultado ainda é mostrado.** Perder a gravação é ruim; negar à pessoa
o que a IA já produziu — e que já foi pago — seria pior. Ela vê um aviso de que pode sumir ao
recarregar.

**O link "Buscar de novo" usa `addEventListener`, não `onclick` inline.** O nome da matéria vem
do edital, que é dado não confiável (ver 8.2, CRÍTICO 1) e não pode ser interpolado dentro de
atributo HTML.

---
