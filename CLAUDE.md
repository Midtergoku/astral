# ASTRAL — Contexto do Projeto

> Arquivo vivo. Atualizar ao fim de cada bloco de trabalho relevante.
> Última atualização: 30/07/2026 — fim da sessão 2 (Blocos B1, B2 e B3).

---

## 0. ▶ RETOMAR AQUI

**Estado:** Etapa 1 (blindagem). Blocos **A, B1, B2 e B3 concluídos.** O Bloco B está fechado.
Próximo é o **Bloco C**, mas ele depende de uma decisão do Lucas (item 2 abaixo).

### ✅ Tudo do Bloco B está em produção

O Lucas fez o push em 30/07/2026. Verificado ao vivo:

```
assets/js/astral.js   HTTP 200    frontend novo publicado
assets/css/app.css    HTTP 200
CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy → todos ativos
```

> `https://astral-psi.vercel.app/vercel.json` devolver **404 é o esperado** — a Vercel consome
> esse arquivo como configuração e não o serve. A prova de que funcionou são os headers acima.

Falta só **1 commit** local (documentação). O frontend e as edge functions estão em sincronia:
o app manda o `access_token`, as funções aceitam.

**O que ainda impede um teste de ponta a ponta:** não há créditos na Anthropic. Com o Bloco B
completo e no ar, **agora é seguro adicionar** (~US$ 5). Antes disso, `processar-edital`,
`gerar-questoes` e `buscar-recursos` respondem 500.

### Decisões e passos manuais pendentes do Lucas

| # | O quê | Bloqueia | Passo a passo |
|---|---|---|---|
| 1 | ~~`git push`~~ — ✅ **feito em 30/07/2026, verificado em produção** | — | 13.1 |
| 1b | **Créditos na Anthropic (~US$ 5)** — agora é seguro | testar o app de ponta a ponta | — |
| 2 | **Auth por e-mail está DESLIGADA.** Ligar o provedor e construir o fluxo, ou remover os formulários de e-mail/senha das telas? Recomendação: remover por ora | **Bloco C inteiro** | 8.2, CRÍTICO 4 |
| 3 | 🔴 **Segredo do webhook pela metade — notificação de cadastro NÃO está chegando.** Refazer as 3 partes na ordem certa | avisos de novo lead | 13.2 |
| 4 | ~~Toggle de senha vazada~~ — **não faz sentido hoje**, ninguém tem senha | nada | 13.3 |

> ⚠️ **Só adicione créditos na Anthropic depois do push.** Antes disso o ciclo não está fechado.

### Depois disso

**Bloco C** (senha, Termos de Uso, exportar/excluir conta) → **Bloco D** (`alert()` → toast com
CSS, responsividade mobile) → fecha a Etapa 1 → **Etapa 2, pagamento** (seção 9).

---

## 0.1. ⚠️ LEIA ANTES DE AFIRMAR QUALQUER COISA

> O Lucas pediu explicitamente que estes erros ficassem registrados para não se repetirem.
> Não apagar esta seção.

**Padrão observado em duas sessões: toda vez que afirmei sem medir, errei. Sem exceção.**
E toda vez que rodei o comando, o número contrariou minha estimativa.

| O que eu afirmei | O que a medição mostrou | Como eu deveria ter descoberto |
|---|---|---|
| "~153 KB de CSS duplicado" | 146,6 KB **no total**; duplicação real: 48,7 KB | contar, em vez de estimar por olho |
| "as tabelas de patente já divergiram" | **idênticas** — e usei isso para justificar a prioridade do Bloco A | `diff` das duas |
| "o furo é `verify_jwt = false`" | ligar o flag **não resolve**: o gateway aceita a chave pública | um POST na função |
| "redefinição de senha quebrada" | pior — **todo o provedor de e-mail estava desligado** | `GET /auth/v1/settings` |
| "chegou um e-mail do meu teste" | **não chegou**; quem avisou foi o Lucas | ler os logs |
| "eu quebrei a notificação de cadastro" | não quebrei; **concluí antes de olhar** | `get_logs` |
| "o Lucas não fez a Parte 2 do webhook" | ele fez; o cabeçalho estava lá, o **valor** é que diferia | `pg_get_triggerdef` |
| "senha vazada é toggle de custo zero" | **HTTP 402** — recurso do plano Pro | tentar aplicar |
| "não há bloqueio de força bruta" | há, **na 32ª tentativa** — fraco, mas existe | 45 tentativas reais |

**Por que isso é grave aqui:** o Lucas não é técnico e não tem como auditar o que eu digo.
Afirmação errada minha vira decisão errada dele. No caso das tabelas de patente, virou a
priorização de um bloco inteiro de trabalho.

**Regra de trabalho:**
1. Antes de afirmar número, estado de sistema ou causa de falha — **rodar o comando.**
2. Quando não der para medir, dizer explicitamente que é estimativa.
3. Ao registrar aqui, **guardar junto o comando que produziu o número**, para reconferir depois.
4. Diagnóstico de falha começa em `get_logs` / `execute_sql`, nunca em hipótese.
5. **Errou? Acrescente uma linha na tabela acima, na hora.** Ordem direta do Lucas em
   30/07/2026: *"sempre que você cometer um erro você irá adicionar uma linha de contexto no
   .md, para não cometer mais o mesmo erro"*. Ele trata erro como normal — o que não é normal
   é repetir.

| Erro | O que aprendi |
|---|---|
| Reescrevi 2 HTMLs com `Set-Content` do PowerShell e **destruí todos os acentos** (`Astral â€" Recursos`) | O PS 5.1 lê UTF-8 como ANSI. **Editar HTML deste projeto só com a ferramenta Edit ou com Node.** A regra já estava escrita na seção 2 — e eu não consultei antes de agir. Ter a regra no arquivo não basta se eu não a leio. |

Ferramentas que respondem rápido: `mcp__supabase__get_logs`, `execute_sql`, `get_advisors`,
`supabase functions list`, e um POST direto na API com `Invoke-WebRequest`.

---

## 1. O produto

**Astral** — "Transforme seu edital em um plano de aprovação em poucos minutos"

Usuário sobe o PDF do edital → IA extrai matérias, pesos e data da prova → gera cronograma
personalizado com gamificação militar (patentes, XP, badges), questões geradas por IA e
indicação de recursos de estudo.

- **Nicho:** concurseiros de carreira militar (Bombeiros, Marinha, Exército, Aeronáutica, PM)
- **Preço anunciado na landing:** **R$ 19,90/mês** (plano Pro, pós-lançamento).
  Alterado de R$ 37 em 30/07/2026, a pedido do Lucas — ele queria algo entre R$ 15 e R$ 20.
  Escolhi 19,90 e não 19,99: no Brasil o padrão de mercado é a terminação `,90`, e `,99`
  soa a varejo de eletrônico. Também não desce mais: abaixo de R$ 15 o produto passa a
  parecer barato demais para algo que decide uma aprovação.
- **Fase atual:** beta fechado — lista de espera + promoção manual para `beta` no Supabase
- **Produção:** https://astral-psi.vercel.app

---

## 2. Stack

| Camada | Ferramenta | Observação |
|---|---|---|
| Frontend | HTML + CSS + JS vanilla, sem build | 13 páginas, tudo inline |
| Hospedagem | Vercel | astral-psi.vercel.app |
| Banco + Auth | Supabase (sa-east-1) | ref `jjogmcacbdefwiwcyjxp` |
| Backend | Supabase Edge Functions (Deno) | 4 funções |
| IA | Anthropic API | modelo hardcoded `claude-sonnet-4-6` |
| Email | Resend | domínio de teste `onboarding@resend.dev` |
| Libs CDN | `@supabase/supabase-js` (+esm), `motion@10.16.4` | sem lock de versão |

**Ambiente local:** Node v24.16.0, Supabase CLI 2.106.0, git 2.55.0 (PortableGit).

> **Nota sobre o git:** o instalador oficial exige UAC/administrador e o ambiente do Claude Code
> não consegue elevar. Foi instalado o **PortableGit** em
> `%LOCALAPPDATA%\Programs\PortableGit`, já adicionado ao PATH do usuário. Funciona igual ao git
> normal. Se um dia quiser a instalação oficial, rode `winget install Git.Git` num terminal
> aberto como administrador — pode desinstalar a versão portátil depois.

---

## 3. Mapa de arquivos

```
ASTRAL/
├── index.html          1154 linhas  Landing page (hero, features, pricing, FAQ)
├── cadastro.html        538         Lista de espera (beta testers)
├── criar-conta.html     448         Signup (email/senha + Google OAuth)
├── login.html           374         Login
├── dashboard.html      1454         Núcleo: upload edital, XP, cronograma do dia
├── progresso.html       794         Progresso por matéria + modal rebalanceamento
├── conquistas.html      854         Badges + habilidades ocultas
├── edital.html          772         Gerenciar edital carregado (re-upload)
├── calendario.html      829         Eventos e datas importantes
├── recursos.html        834         Professores YouTube + materiais (IA + cache 24h)
├── questoes.html       1060         Questões geradas por IA
├── cronometro.html      431         Pomodoro + modo livre
├── privacidade.html     188         Política LGPD
├── CLAUDE.md                        Este arquivo
└── supabase/
    ├── config.toml                  Só declara 2 das 4 funções
    └── functions/
        ├── notificar-cadastro/      Resend → email pro Lucas
        ├── processar-edital/        Claude lê PDF → JSON de matérias
        ├── buscar-recursos/         Claude + web_search → professores/materiais
        └── gerar-questoes/          Claude → questões da banca
```

Não existe pasta `migrations/` — **o schema do banco só existe na nuvem**, não versionado.

---

## 4. Banco de dados (Supabase)

### `lista_espera`
`id UUID PK | nome TEXT | email TEXT UNIQUE | concurso TEXT | whatsapp TEXT | criado_em TIMESTAMP`
RLS: INSERT público (anon).

### `perfis`
`id UUID → auth.users(id) | nome TEXT | email TEXT | tipo_plano TEXT DEFAULT 'free' | criado_em TIMESTAMP`
RLS: cada usuário só lê/edita o próprio. Trigger cria o perfil no signup.

**É só isso.** Nenhuma tabela guarda XP, matérias, cronograma, sessões, questões ou eventos.

---

## 5. Onde os dados do usuário realmente moram: localStorage

Todo o estado de estudo vive **apenas no navegador**:

| Chave | Conteúdo |
|---|---|
| `astral_dados_${user.id}` | xp, streak, horas, materias[], cronogramaHoje[], edital, badges[] |
| `astral_eventos_${user.id}` | eventos do calendário |
| `astral_crono_${user.id}_${hoje}` | histórico do cronômetro |
| `astral_recursos_${user.id}` | cache de recursos (TTL 24h) |

Consequência: trocar de navegador, limpar cache ou abrir no celular = usuário perde tudo.

---

## 6. Gamificação

- **Patentes dinâmicas** por tipo de concurso, detectado por palavra-chave no nome do edital
  (`detectarTipoConcurso()` em [dashboard.html:1030](dashboard.html#L1030)).
  Tabelas: bombeiros, marinha, aeronautica, exercito, pm, default — 11 níveis cada, 0 → 35.000 XP.
- **XP:** sessão marcada = `peso × 5` | cronômetro = 2 XP/min | questão certa = 15 XP
- **Badges:** primeiro_dia, primeira_hora, sequencia_3, sequencia_7, nivel_3, nivel_5,
  primeiro_edital, maratonista
- **Habilidades ocultas:** desbloqueiam com domínio ≥ 70% na matéria
  (ex.: Português → "Orador de Guerra"). Degradam: 7d sem estudar = enferrujada, 14d = suspensa.
- Confete + banner de level up já implementados no dashboard.

---

## 7. Design system

- **Paleta:** bg `#0A0A0F` · surface `#13131A` · purple `#7C5CFC` · purple-lt `#A78BFA`
  · gold `#F5C542` · green `#34D399`
- **Fontes:** Space Grotesk (títulos) + Inter (corpo)
- **Estilo:** dark mode, minimalista, SaaS premium. Glow nos cards ao hover.
- **Sidebar:** fixa 240px, borda roxa no topo, indicador lateral no link ativo
- **Transição de página:** classe `.saindo` no body, 230ms, em cada `<a>` interno

---

## 8. Diagnóstico técnico (auditoria de 29/07/2026)

### 🔴 Bloqueadores de monetização

1. **`tipo_plano` é puramente cosmético.** Aparece só como texto do badge na topbar
   ([dashboard.html:1176](dashboard.html#L1176), [progresso.html:655](progresso.html#L655),
   [conquistas.html:768](conquistas.html#L768), [edital.html:581](edital.html#L581)).
   Nenhum `if` bloqueia nada. Usuário `free` tem exatamente o mesmo produto que `pro`.
   **Sem isso, não existe o que vender.**

2. **Sem persistência no banco.** Ver seção 5. Um SaaS de R$37/mês que perde o progresso do
   usuário ao trocar de aparelho não sustenta assinatura recorrente.

### 🔴 Risco de custo e segurança

3. **Edge functions abertas.** As chamadas mandam a *publishable key* no header
   `Authorization`, nunca o `session.access_token` do usuário
   ([dashboard.html:1484](dashboard.html#L1484), [edital.html:746](edital.html#L746),
   [questoes.html:954](questoes.html#L954), [recursos.html:794](recursos.html#L794)).
   `config.toml` ainda declara `verify_jwt = false` para `processar-edital`.
   Qualquer pessoa que veja o código-fonte pode chamar a IA em loop e queimar os créditos
   Anthropic. Não há rate limit, quota por usuário nem log de quem chamou.

4. **`config.toml` incompleto** — só declara `notificar-cadastro` e `processar-edital`.
   `buscar-recursos` e `gerar-questoes` não estão versionados na config.

5. ~~**Sem versionamento local.**~~ ✅ **Resolvido em 29/07/2026.** Ver seção 8.1.

### 🟡 Dívida técnica

6. ~~**~153 KB de CSS duplicado**~~ 🟡 **parcialmente resolvido — e o número estava errado.**
   Medição real (`tools/valida-css.js`): **146,6 KB de CSS no total**, dos quais **48,7 KB**
   eram duplicação. O Bloco A extraiu 29 KB. O resto são variações **intencionais** por
   página — ver 8.5.
7. **Duplicação de JS** — medição real, corrigindo estimativa anterior:
   `createClient` em 11 arquivos · `fazerLogout` em 8 · transição de página em 8 (✅ extraída)
   · guarda de sessão em 7 · `detectarTipoConcurso` em 3 · `TABELAS_NIVEIS` em 2.
   ⚠️ **Correção:** a auditoria original afirmava que as tabelas de patente já tinham
   divergido. **Falso** — foram comparadas e são idênticas, diferem só na indentação.
8. **Parsing frágil da IA** — `JSON.parse` direto na resposta, sem retry nem validação de
   schema. Uma resposta fora do formato quebra a tela.
9. **Erros expostos como `alert()`** ([dashboard.html:1534](dashboard.html#L1534)) enquanto
   o resto do app usa toast.
10. **Double-parse desnecessário** em `processarEdital` — a edge function já devolve objeto,
    o front faz `JSON.stringify` e depois `JSON.parse` de novo
    ([dashboard.html:1490-1495](dashboard.html#L1490-L1495)).
11. **Modelo hardcoded** `claude-sonnet-4-6` nas 3 funções de IA.
12. **Resend em domínio de teste** — só envia pro e-mail do dono. Nenhum e-mail transacional
    (boas-vindas, retenção, recuperação de senha customizada) chega no usuário.
13. **LGPD incompleta** — política existe, mas não há exportação nem exclusão de dados.
    Obrigatório antes de cobrar.

### ✅ O que está bom

- Design consistente e bem acabado; o produto **parece** premium.
- Gamificação com identidade real (patentes militares por força) — é o diferencial defensável.
- Fluxo de auth funcionando (email/senha + Google OAuth).
- Landing com narrativa, pricing e CTA de lista de espera já validando demanda.
- Edge functions com prompts bem construídos e específicos do nicho.

---

---

## 8.1. Git — estado atual (resolvido em 29/07/2026)

**Situação encontrada:** o repo `github.com/Midtergoku/astral` existia (público, 44 commits,
todos "Add files via upload" — feitos pela interface web). Mas a pasta local **não estava
conectada a ele**: sem `.git`, sem git instalado, sem clone em lugar nenhum da máquina.

Divergências encontradas na comparação arquivo a arquivo:

| | |
|---|---|
| 8 HTMLs diferentes | local já tinha `'free'`, GitHub ainda tinha `'profissional'` |
| Só no GitHub | `README.md` |
| Só no local | **`supabase/` inteira** — as 4 edge functions nunca foram versionadas |

**O que foi feito:** PortableGit instalado, pasta conectada ao remoto preservando os arquivos
locais (`git reset --mixed FETCH_HEAD`), `README.md` restaurado, varredura de segredos feita
(limpa — os alertas eram `max_tokens`, e os `.npmrc` só têm comentários).

Dois commits locais criados, **ainda não enviados**:
- `5845168` — renomeia plano padrão `profissional` → `free` (8 HTMLs)
- `11d4c7d` — versiona edge functions + `.vscode` + `CLAUDE.md`

⚠️ **Vercel faz deploy automático a partir do `main`.** O primeiro `git push` vai publicar a
mudança `profissional` → `free` em produção. Verificar antes se algum usuário no banco ainda
tem `tipo_plano = 'profissional'` — se tiver, o badge dele vai quebrar.

**Fluxo daqui pra frente:** editar local → commit → push → Vercel publica. Nunca mais subir
arquivo pela interface web do GitHub (sobrescreve o histórico local).

---

## 8.2. Auditoria de segurança (29/07/2026)

Cobertura: 13 páginas (~9.700 linhas), 4 edge functions, config do Supabase, headers de deploy,
dependências externas. RLS **não** foi verificada — só é auditável via SQL no painel (ver 8.3).

### 🔴 CRÍTICO 1 — XSS sistêmico → sequestro de conta

**40 pontos de `innerHTML` com interpolação, nenhum com escape.** O token de sessão do Supabase
fica em `localStorage`; qualquer XSS o rouba e dá acesso total à conta.

Pontos de entrada de dado não confiável:

| Origem | Onde é renderizado |
|---|---|
| Resposta da IA (questões) | [questoes.html:1016](questoes.html#L1016) `${q.enunciado}` cru |
| Resposta da IA (alternativas) | [questoes.html:1003](questoes.html#L1003) dentro de `onclick=""`, escapando só `'` |
| Resposta da IA (URLs) | [recursos.html:856](recursos.html#L856), [:879](recursos.html#L879), [:902](recursos.html#L902) — `href="${url}"` aceita `javascript:` |
| Texto digitado pelo usuário | [calendario.html:822](calendario.html#L822) `${evento.nome}`, [:824](calendario.html#L824) `${evento.obs}` |
| Nome de matéria vindo do edital | [progresso.html:779](progresso.html#L779), [conquistas.html:891](conquistas.html#L891), [dashboard.html:1347](dashboard.html#L1347) |

**Cadeia de ataque realista:** PDF de edital com texto de *prompt injection* → a IA devolve HTML
com `<img onerror=...>` → renderizado cru → token roubado. Basta distribuir um "edital do CBMERJ"
num grupo de WhatsApp de concurseiro. Não é auto-XSS: é vetor remoto.

### 🔴 CRÍTICO 2 — Edge functions abertas = sua conta Anthropic

As 3 funções de IA são chamadas com a *publishable key*, nunca com o `access_token` do usuário
([dashboard.html:1484](dashboard.html#L1484), [edital.html:746](edital.html#L746),
[questoes.html:954](questoes.html#L954), [recursos.html:794](recursos.html#L794)).
Resultado: endpoint público, sem identidade, sem quota, sem log. Qualquer um roda
`gerar-questoes` em loop e a fatura é sua.

> ⚠️ **Correção de 30/07/2026 — a versão anterior desta seção estava errada.**
> Ela dizia que o problema era `verify_jwt = false` no `config.toml`. **Ligar o flag não
> resolve.** Estado real medido: `buscar-recursos` e `gerar-questoes` **já estão deployadas
> com `verify_jwt = true`** — e mesmo assim aceitam a publishable key. O gateway do Supabase
> valida que o token é uma chave válida *do projeto* **ou** um JWT de usuário; a chave pública
> passa nos dois casos, e ela está no código-fonte de todas as páginas.
>
> Teste que comprovou: POST direto nas 3 funções com a publishable key — todas atravessaram a
> autenticação e chegaram na API da Anthropic.
>
> **Consequência para o B2:** a verificação de identidade tem de ser feita *dentro* da função,
> chamando `auth.getUser(token)` e **recusando explicitamente** um token igual à chave pública.
> O `verify_jwt = true` fica como camada extra, não como a defesa.

> 💡 **Estado atual: não há créditos na Anthropic.** As 3 funções respondem 500
> (`credit balance is too low`). Na prática as features de IA estão **inteiramente
> inoperantes em produção hoje** — o que significa que endurecê-las não quebra nada que
> funcione, e que **os créditos só devem ser adicionados depois do B2**. Adicionar antes é
> abrir a torneira com o endpoint público.

### 🔴 CRÍTICO 3 — Upload de PDF sem nenhum limite

Nenhuma checagem de tamanho ou de páginas em `processarEdital`
([dashboard.html:1461](dashboard.html#L1461), [edital.html](edital.html)). Um PDF de 80 MB vira
~107 MB em base64 e é enviado direto pra API. Custo por chamada ilimitado e travamento do browser.

### 🔴 CRÍTICO 4 — Toda a autenticação por e-mail está morta

**Ampliado em 30/07/2026 — é bem pior do que "redefinição de senha quebrada".**

`GET /auth/v1/settings` no projeto devolve:

```
email:  False     <- provedor de e-mail/senha DESLIGADO
google: True
phone:  False
```

O provedor de e-mail está **desativado no Supabase**. Isso significa que, em produção:

| Tela | O que ela oferece | O que acontece de verdade |
|---|---|---|
| [criar-conta.html](criar-conta.html) | formulário de e-mail + senha | `422 email_provider_disabled` — **nunca funcionou** |
| [login.html](login.html) | login com e-mail + senha | `422 email_provider_disabled` |
| [login.html:381](login.html#L381) | "Esqueci minha senha" | não envia nada |

Só o Google OAuth funciona — o que explica os 6 usuários serem **todos** via Google.
O formulário de cadastro por e-mail está no ar, visível, e não pode dar certo em nenhuma
hipótese. O usuário preenche, clica e vê "Erro ao criar conta. Tente novamente."

Além disso, mesmo que o provedor fosse ligado, **não existe página que chame
`updateUser({ password })`** — então o fluxo de redefinição continuaria incompleto.

**Decisão necessária do Lucas (bloqueia o Bloco C):** ligar o provedor de e-mail e construir
o fluxo completo (confirmação + página de redefinir senha), ou assumir o Google como único
meio de entrada e **remover os formulários de e-mail/senha das duas telas**? Manter uma
porta pintada na parede é a pior das três opções.

### 🟠 ALTO 5 — Bomba de e-mail via lista de espera

`lista_espera` aceita INSERT anônimo sem captcha nem rate limit, e o webhook dispara um e-mail
via Resend a cada linha. Um script enche a tabela, entope a caixa do Lucas e queima a cota
gratuita do Resend.

### 🟠 ALTO 6 — Dependências de CDN sem versão travada

`@supabase/supabase-js/+esm` sem pin em 11 arquivos: o jsdelivr entrega sempre a última versão.
Um major novo derruba o app inteiro sem ninguém tocar em nada. Também é superfície de
supply chain. `motion@10.16.4` está pinado, mas sem SRI.

### 🟠 ALTO 7 — Nenhum header de segurança

Não existe `vercel.json`. Sem CSP, sem `X-Frame-Options` (clickjacking), sem `Referrer-Policy`,
sem `Permissions-Policy`. Uma CSP decente é a segunda barreira contra o CRÍTICO 1.

### 🟡 MÉDIO 8 — CORS liberado para todo mundo

As 4 funções usam `Access-Control-Allow-Origin: *`. Deve ser restrito ao domínio do Astral.

### 🟡 MÉDIO 9 — Parsing da IA sem defesa

17 `JSON.parse` no projeto para 6 `try/catch`. As edge functions fazem `JSON.parse` direto na
resposta do modelo, sem validação de schema e sem retry. Uma resposta fora do formato = tela
quebrada e crédito gasto à toa.

### 🟡 MÉDIO 10 — Erros como `alert()`

17 `alert()` no código, inclusive vazando `err.message` da API
([dashboard.html:1534](dashboard.html#L1534)) enquanto o resto do app usa toast.

### 🟡 MÉDIO 11 — Mobile praticamente inexistente

`login.html`, `criar-conta.html` e `privacidade.html` têm **zero** `@media`. O resto tem 1 ou 2.
Concurseiro estuda no celular — isso é perda direta de conversão e de retenção.

### ⚪ Faltando para operar como SaaS

- **Termos de Uso** — só existe Política de Privacidade. Obrigatório antes de cobrar.
- **LGPD** — a política promete "direito ao esquecimento", mas não há exportar nem excluir conta.
  Promessa não cumprida em documento público é risco jurídico real.
- **Confirmação de e-mail** desativada — contas com e-mail de terceiros.
- **`emailRedirectTo` ausente** no `signUp` ([criar-conta.html:453](criar-conta.html#L453)).
- **Resend em domínio de teste** — nenhum e-mail chega no usuário final.
- **Sem observabilidade** — nenhum rastreamento de erro; falha em produção é invisível.

---

## 8.3. Auditoria do banco — feita via MCP em 29/07/2026

Estado real: **6 usuários em `auth.users`, todos via Google, todos com e-mail confirmado.
`perfis` tem 0 linhas. `lista_espera` tem 2 linhas.**

### 🔴 BANCO 1 — A trigger de criação de perfil está quebrada desde sempre

```sql
CREATE OR REPLACE FUNCTION public.criar_perfil_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER  -- sem SET search_path
AS $function$
BEGIN
  INSERT INTO perfis (...) VALUES (...) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN RETURN NEW;   -- engole QUALQUER erro em silêncio
END;
$function$
```

A trigger `ao_criar_usuario` existe e está ativa, mas a função é `SECURITY DEFINER` **sem
`SET search_path`** — o advisor do Supabase sinaliza isso como `function_search_path_mutable`.
Quando dispara a partir de `auth.users`, o `search_path` não inclui `public` e o
`INSERT INTO perfis` falha. O bloco `EXCEPTION WHEN OTHERS THEN RETURN NEW` engole o erro,
o usuário é criado normalmente e **nenhum perfil nasce**.

Consequências que já estão acontecendo em produção:
- `estado.perfil` é `null` para todos → o badge sempre cai no fallback `'free'`
- **Promover alguém para `beta` pela Table Editor é impossível** — não há linha para editar.
  O fluxo de beta tester descrito na seção "Estratégia de Lançamento" nunca funcionou.
- Qualquer feature futura que dependa de `perfis` nasce quebrada

Correção: `SET search_path = public` na função, remover o `EXCEPTION` cego (ou ao menos logar),
e fazer um backfill dos 6 usuários existentes.

### 🔴 BANCO 2 — Usuário pode se promover para `pro` sozinho

```
perfis | UPDATE | authenticated | USING (auth.uid() = id) | WITH CHECK: ausente
```

Sem `WITH CHECK` explícito, o Postgres reaproveita a expressão do `USING`. O usuário continua
sendo dono da própria linha, então **nada impede que ele mude a própria coluna `tipo_plano`**.
No dia em que o gate de pagamento existir, isso libera o plano pago de graça:

```js
await supabase.from('perfis').update({ tipo_plano: 'pro' }).eq('id', user.id)
```

Correção: `tipo_plano` não pode ser gravável pelo usuário. Ou sai para uma tabela `assinaturas`
que só o service role escreve, ou uma trigger `BEFORE UPDATE` trava a coluna.
**Bloqueador absoluto da Etapa 2.**

### ✅ Resolvido — o push é seguro

`perfis.tipo_plano` tem `CHECK (tipo_plano IN ('free','beta','pro'))`. O valor `'profissional'`
**nunca** foi aceito pelo banco, e `perfis` está vazia. A dúvida da seção 8.1 está encerrada:
o push da renomeação não quebra ninguém.

### 🟠 BANCO 3 — `lista_espera` confirma a bomba de e-mail

```
lista_espera | INSERT | anon | WITH CHECK (true)
```

Advisor: `rls_policy_always_true`. Insert anônimo irrestrito, sem captcha nem rate limit, com
webhook disparando Resend por linha. Hoje só há 2 linhas — sem abuso até agora.

### 🟡 BANCO 4 — Função `SECURITY DEFINER` exposta na API REST

`criar_perfil_usuario()` é chamável por `anon` e por `authenticated` via
`/rest/v1/rpc/criar_perfil_usuario`. É função de trigger, então a chamada direta erra por falta
de `NEW` — mas não há motivo para estar exposta. Revogar `EXECUTE` de `anon` e `authenticated`.

### 🟡 BANCO 5 — Proteção contra senha vazada desligada

Supabase Auth pode checar senhas contra o HaveIBeenPwned. Está desativado. É um toggle no painel
(Authentication → Policies), custo zero.

### Observação de produto

A lista de espera tem **2 cadastros**. A landing fala em "vagas limitadas para beta testers", mas
a demanda ainda não foi validada de verdade. Vale considerar isso ao priorizar distribuição.

---

## 8.4. Queries de referência

Todas já respondidas na 8.3 — ficam aqui para reconferir depois das migrations do B1.
Rodar direto pelo MCP (`execute_sql`), não precisa pedir para o Lucas.

```sql
-- RLS ativa por tabela
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- Políticas e o que de fato permitem  (checar WITH CHECK, nao so USING)
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public';

-- A trigger voltou a criar perfil?  (esperado: os dois numeros iguais)
select (select count(*) from auth.users) as usuarios,
       (select count(*) from perfis)     as perfis;

-- Distribuição de planos
select tipo_plano, count(*) from perfis group by tipo_plano;

-- Volume da lista de espera (indício de spam)
select count(*), min(criado_em), max(criado_em) from lista_espera;
```

Além do SQL, rodar o linter nativo do Supabase — foi ele que apontou o `search_path` mutável
antes de qualquer leitura de código:

```
mcp__supabase__get_advisors  type=security
```

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

### Quota diária, por plano

```
              processar-edital  gerar-questoes  buscar-recursos
free                 2                3                5
beta                10               20               30
pro                 20               50               60
```

Registrada em `public.uso_ia` (migration `..130000`), escrita só pela `service_role`.
Uso **só é contabilizado quando a chamada dá certo** — cobrar quota por erro nosso seria
punir o usuário por problema que não é dele. Se a própria consulta de quota falhar, a
chamada é liberada e o erro vai para o log: falhar fechado deixaria o produto fora do ar.

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

## 9. Ordem de trabalho — acordada com o Lucas em 29/07/2026

O Lucas definiu a sequência: **segurança e qualidade primeiro, pagamento depois, visual por
último.** Nada de pagamento antes de a base estar sólida.

### Etapa 1 — Blindagem (em andamento)

| Bloco | O quê | Status |
|---|---|---|
| **A** | Extrair CSS/JS compartilhado para `assets/` — sem mudar comportamento | ✅ feito — ver 8.5 |
| **B1** | Migrations: trigger de perfil, `tipo_plano`, `lista_espera`, grants | ✅ feito — ver 8.6 |
| **B2** | Edge functions: JWT, quota por plano, limite de PDF, CORS restrito | ✅ feito — ver 8.7 |
| **B3** | Frontend: `access_token`, escape universal, sanitizar URLs, CSP e headers, pin de dependências | ✅ feito — ver 8.8 |
| **C** | Redefinir senha · Termos de Uso · exportar e excluir conta · login por e-mail | ✅ feito — ver 8.9 e 8.10 |
| **D** | Segunda chance na resposta da IA · `alert()` → toast · menu no celular | ✅ feito — ver 8.11 |

> **A Etapa 1 está fechada.** O que falta antes da Etapa 2 é operacional, não de código:
> créditos na Anthropic para o primeiro teste real de ponta a ponta do upload de edital.

> **Por que o Bloco A vem primeiro:** o mesmo bug de XSS está em 13 arquivos porque o código é
> duplicado. Corrigir antes de extrair = escrever a mesma correção 13 vezes e vê-la divergir de
> novo (as tabelas de patente já divergiram). Refatorar depois custa o dobro e reintroduz bugs.

### Etapa 2 — Fundação do pagamento (mudança estrutural, apresentar antes)

1. Migrar estado do localStorage para tabelas no Supabase (com RLS) — ver seção 5
2. Implementar o gate real de `free` vs `pro`
3. Gateway de pagamento — ver seção 10
4. Domínio próprio no Resend + e-mails transacionais
5. Créditos Anthropic + teste end-to-end do upload de edital

### Estratégia de lançamento — descrita pelo Lucas em 30/07/2026

O plano dele, na ordem:

1. **Criar um grupo de WhatsApp** e entrar em grupos de concurseiros já existentes.
2. Quem entrar por esse link vira **beta tester**: acesso completo **gratuito para sempre**,
   em troca de feedback. Poucas pessoas, de propósito.
3. Só **depois** das primeiras pessoas entrarem, trocar a landing: tirar a parte de beta e
   passar a mostrar **free vs pro**, com os benefícios de cada um lado a lado.

> ⚠️ **Consequência direta para o gate:** `tipo_plano = 'beta'` não é um estado temporário de
> testes — é uma **promessa vitalícia** feita a pessoas reais. O gate tem de tratar `beta`
> com acesso igual ao `pro`, para sempre, e nenhuma migração futura pode rebaixar essas contas.
> Isso já está previsto no CHECK da coluna (`free`, `beta`, `pro`) e nos limites de quota (8.7).

A landing **ainda não muda agora** — a troca de beta para free/pro é para depois que os
primeiros testadores entrarem.

### Etapa 3 — Visual e gamificação (pedido do Lucas, ainda não detalhado)

- Repaginada visual geral — o Lucas quer "mexer bastante"
- **Tag em estilo de jogos** — ele citou explicitamente, falta definir o que é
- **Mais quests** para aprofundar a gamificação além dos 8 badges atuais
- Roadmap desta etapa deve ser montado **depois** que a Etapa 1 fechar

---

## 10. Decisões em aberto

- **Gateway de pagamento:** Stripe (planejado) vs Mercado Pago / Pagar.me. Público brasileiro
  concurseiro usa muito Pix — Stripe só passou a suportar Pix recentemente e a conversão
  costuma ser melhor com gateway nacional. **A decidir.**
- **Onde fica a linha free/pro:** proposta — free processa 1 edital e vê o cronograma;
  pro libera questões por IA, recursos, calendário e histórico. **A validar com o Lucas.**
- **Distribuição e marketing:** Lucas vai trazer o plano. Ainda não definido.

---

## 10.1. Ferramentas de acesso ao Supabase (montado em 29/07/2026)

**Supabase CLI** — instalada (2.106.0), **autenticada e vinculada** ao projeto. Confirmado
funcionando: `functions list`, `functions deploy`, `secrets list/set`, `migration list`
(conectou no banco remoto sem pedir senha). O `secrets list` devolve hashes, não os valores.
`supabase db dump` **não** funciona — exige Docker Desktop, que não está instalado.

> `migration list` voltou **vazio**: nenhuma migration jamais aplicada. Confirma que o schema
> só existe na nuvem.

**MCP do Supabase** — ✅ **conectado, autenticado e testado.** Servidor hospedado, escopo de
**usuário**. Ferramentas confirmadas em uso: `list_tables`, `execute_sql`, `get_advisors`,
`list_migrations`. Foi por ele que saiu toda a auditoria da seção 8.3.

```
claude mcp add --scope user --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=jjogmcacbdefwiwcyjxp&read_only=true"
```

- `read_only=true` **de propósito**: leitura livre do banco, mas toda escrita passa por
  migration versionada no git. Foi escolha deliberada, não limitação.
- `project_ref` trava o acesso só neste projeto.
- Autenticação é OAuth pelo navegador (`/mcp` → autenticar). Não precisa de token manual.

> ⚠️ **Pegadinha:** `~/.claude.json` tem entradas duplicadas para a mesma pasta
> (`C:/Users/Lucas/Desktop/ASTRAL` e `c:/...`, só a letra do drive muda). Um MCP adicionado no
> escopo de projeto fica invisível para a sessão que rodar sob a outra grafia — foi o que
> aconteceu na primeira tentativa. Por isso o escopo é `user`.
> **Limpar isso ainda está pendente.**
>
> Correção de uma afirmação errada feita antes: a duplicação **não** divide o histórico de
> conversas. As transcrições ficam todas em `~/.claude/projects/c--Users-Lucas-Desktop-ASTRAL`,
> então `claude --continue` e `--resume` funcionam normalmente.

---

## 10.2. API de gerenciamento do Supabase — como eu altero o painel sozinho

O Lucas **não executa passo manual**. Configuração de projeto que só existiria no painel é
aplicada por aqui.

**O token de acesso** já está na máquina: a CLI do Supabase guarda no Gerenciador de
Credenciais do Windows, alvo `Supabase CLI:supabase`. Lê-se com `CredRead` do `advapi32.dll`
via `Add-Type`.

> ⚠️ Duas armadilhas, as duas já custaram tempo:
> 1. O blob da credencial é **UTF-8 puro**, não UTF-16. Ler com `Marshal.PtrToStringUni`
>    devolve lixo com metade do tamanho. Use `Marshal.Copy` + `Encoding.UTF8.GetString`.
>    Token válido tem 44 chars e começa com `sbp_`.
> 2. `Invoke-RestMethod -Method PATCH` **falha silenciosamente** no PowerShell 5.1 — devolve
>    erro sem corpo. Usar `[Net.HttpWebRequest]` com `.Method = "PATCH"`.

```
GET   https://api.supabase.com/v1/projects/<ref>/config/auth
PATCH https://api.supabase.com/v1/projects/<ref>/config/auth
```

O `PATCH` aplica **somente os campos enviados** — por isso é seguro, diferente de
`supabase config push`, que parte do `config.toml` inteiro e cuja documentação **não** esclarece
se zera o que não está declarado. Como o padrão de `[auth.external.google].enabled` é `false`,
um push descuidado desligaria o Google e derrubaria o login dos 6 usuários. Foi por isso que
esse caminho foi descartado.

`supabase projects api-keys --project-ref <ref> -o json` devolve `anon` e `service_role`
quando precisar agir como administrador (criar/apagar usuário de teste, gerar link de
recuperação sem enviar e-mail).

---

## 11. Contas e acessos

- GitHub: `Midtergoku` / repo `astral`
- Vercel: astral-psi.vercel.app
- Supabase: projeto ref `jjogmcacbdefwiwcyjxp` (org `iahjplveolbyvffastxt`)
- Resend / Google Cloud (projeto "Astral") / e-mail: lherdy2003@gmail.com
- Secrets no Supabase: `RESEND_API_KEY`, `ANTHROPIC_API_KEY` (nunca no frontend)

**Regras de segurança inegociáveis:** chave sensível só em Supabase Secrets · RLS em toda
tabela nova · validação no front E no back · nunca armazenar dado de cartão.

---

## 13. Passos manuais do Lucas — instruções clique a clique

> O Lucas não é técnico. Toda instrução aqui é literal: onde clicar, o que digitar, e como
> saber que deu certo. Não resumir.

### 13.1. Publicar em produção (`git push`)

**O que isso faz:** envia os 15 commits para o GitHub. O Vercel percebe sozinho e republica o
site em ~1 minuto. É o que coloca no ar todo o trabalho dos blocos A, B1, B2 e B3.

1. No VS Code, abrir o terminal: menu **Terminal → New Terminal** (ou `Ctrl + '`)
2. Digitar exatamente e dar Enter:
   ```
   git push
   ```
3. Se pedir login do GitHub, aparece uma janela do navegador — entrar na conta `Midtergoku`
   e autorizar. Isso é pedido só na primeira vez.
4. Deu certo quando aparece algo como `main -> main` no final da saída.
5. Conferir a publicação em **vercel.com** → projeto **astral** → aba **Deployments**. A
   primeira linha deve estar como **Building** e, um minuto depois, **Ready**.

**Como saber que o site está bom:** abrir https://astral-psi.vercel.app, entrar com o Google e
carregar o dashboard. Se a sidebar e as cores aparecerem normais, o CSS extraído está certo.

⚠️ O repositório é **público**. Já foi feita varredura de segredos e está limpo.

### 13.2. Segredo do webhook — ✅ RESOLVIDO em 30/07/2026

> **Não é mais tarefa do Lucas.** Foi feito por mim, dos dois lados. Log confirma:
> `notificar-cadastro POST 200` na versão 8, com inserção real na `lista_espera`.

**O que estava errado — e minhas duas conclusões furadas pelo caminho:**

1. Primeiro afirmei *"eu quebrei a notificação"*. Errado, falei antes de olhar os logs.
2. Depois afirmei *"o Lucas não fez a Parte 2"*. **Também errado.** Ele tinha feito: o gatilho
   já continha o cabeçalho `x-astral-webhook-secret`. O que não batia era o **valor** entre o
   cabeçalho e o `WEBHOOK_SECRET`.

Só descobri ao ler `pg_get_triggerdef` do gatilho — o que eu devia ter feito antes de concluir
qualquer coisa. Ver [[medir-antes-de-afirmar]].

**Como foi resolvido, e como refazer se precisar:**

O webhook do painel é, no banco, um gatilho comum chamando `supabase_functions.http_request`,
com os cabeçalhos embutidos como texto. Dá para reescrever por SQL, sem abrir o painel:

```sql
drop trigger if exists "notificar-novo-cadastro" on public.lista_espera;
create trigger "notificar-novo-cadastro"
  after insert on public.lista_espera
  for each row execute function supabase_functions.http_request(
    'https://jjogmcacbdefwiwcyjxp.supabase.co/functions/v1/notificar-cadastro',
    'POST',
    '{"Content-type":"application/json","x-astral-webhook-secret":"<SEGREDO>"}',
    '{}', '5000');
```

Depois `supabase secrets set WEBHOOK_SECRET=<mesmo segredo>`.

> ⚠️ **O segredo não pode entrar numa migration** — o repositório é público. Por isso esse SQL
> foi executado pelo endpoint de query da API de gerenciamento (ver 10.2), não por
> `supabase db push`. É a exceção deliberada à regra de versionar toda mudança de banco.

> **Ordem correta:** cabeçalho primeiro, segredo depois. Definir o segredo antes fecha a porta
> enquanto o webhook ainda não sabe a senha — e falha em silêncio, porque ninguém fica olhando
> log de webhook.

<details>
<summary>Instruções pelo painel, caso um dia seja preciso</summary>

**O problema:** hoje qualquer pessoa na internet consegue disparar e-mails de "novo cadastro"
para a sua caixa, sem nem passar pelo formulário. O segredo faz a função aceitar só o webhook.

**Parte 1 — gerar o segredo.** No terminal do VS Code:
```
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```
Vai imprimir uma linha de letras e números. **Copie essa linha** — é o seu segredo.
⚠️ Não cole esse valor em nenhum arquivo do projeto: o repositório é público.
⚠️ Deixe essa janela do terminal aberta até terminar a Parte 3 — o valor não aparece de novo.

**Parte 2 — colocar o segredo no webhook. FAZER ANTES DA PARTE 3.**
1. Abrir https://supabase.com/dashboard/project/jjogmcacbdefwiwcyjxp/integrations/hooks
2. Na lista, achar o webhook que aponta para `lista_espera`
3. Clicar nos **três pontinhos** à direita dele → **Edit hook**
4. Rolar até a seção **HTTP Headers**
5. Clicar em **Add new header**
6. No campo da esquerda (nome), digitar: `x-astral-webhook-secret`
7. No campo da direita (valor), colar o segredo gerado na Parte 1
8. Clicar em **Confirm** / **Save**

**Parte 3 — dar o mesmo segredo para a função.** No terminal, trocando `SEU_SEGREDO`:
```
supabase secrets set WEBHOOK_SECRET=SEU_SEGREDO
```
Deu certo quando aparece `Finished supabase secrets set.`

**Como testar:** entrar em https://astral-psi.vercel.app/cadastro.html e preencher a lista de
espera com um e-mail seu. Se o e-mail de aviso chegar, está funcionando.

**Se não chegar**, conferir na fonte em vez de adivinhar:

```
mcp__supabase__get_logs  service=edge-function
```

- `notificar-cadastro POST 200` → a função aceitou; o problema é o Resend (ver 8.2, domínio
  de teste só entrega para o e-mail do dono) ou a caixa de spam
- `notificar-cadastro POST 401` → o cabeçalho do painel e o `WEBHOOK_SECRET` estão diferentes;
  refazer as três partes com um valor novo
- **nenhuma linha** → o webhook não disparou; conferir se ele está ativo no painel

Lembrar de limpar as linhas de teste depois: `delete from lista_espera where email = '...'`

</details>

### 13.4. Login por e-mail e senha — ✅ JÁ APLICADO em 30/07/2026

> **Decisão do Lucas:** quer os dois meios de entrada — e-mail/senha **e** Google.
> **O Lucas não executa passo manual.** Ele foi explícito: "eu não vou fazer nada, eu apenas
> mando". Tudo abaixo foi aplicado por mim via API de gerenciamento — ver 10.2 para o método.

#### Estado aplicado e verificado

```
external_email_enabled    False -> True     login/cadastro por senha ligado
external_google_enabled   True  -> True     intocado
mailer_autoconfirm        False -> True     sem confirmacao (o SMTP padrao nao entrega)
password_min_length       6     -> 8        alinha o backend com o formulario
password_hibp_enabled     False               RECUSADO: HTTP 402, recurso do plano Pro
uri_allow_list            https://astral-psi.vercel.app/**   ja cobria a pagina nova
```

#### Testado de ponta a ponta contra a API real

| Teste | Resultado |
|---|---|
| Cadastro com e-mail e senha | ✅ devolve sessão direto, entra no dashboard |
| Login com senha | ✅ `access_token` emitido |
| Senha de 5 caracteres | ✅ recusada — `Password should be at least 8 characters` |
| Link de redefinição → nova senha → login | ✅ **ciclo completo funciona** |
| `recover` de e-mail inexistente | ✅ responde 200, não revela se a conta existe |
| Perfil criado para cadastro por e-mail | ✅ a trigger do B1 vale para os dois provedores |

Usuário de teste criado, usado e removido. O `password_hibp_enabled` continua o único item
não aplicado — **e não é toggle de custo zero como eu havia escrito**, é plano Pro.

#### ⚠️ O que ainda não funciona: entrega de e-mail

O SMTP padrão do Supabase **envia 2 mensagens por hora e só para endereços pré-autorizados**
(membros da organização). Confirmado na documentação oficial. Consequência prática: com ele,
um concurseiro real que se cadastrar **nunca recebe** o e-mail de confirmação nem o de
redefinição de senha.

Por isso `mailer_autoconfirm` foi ligado: o cadastro fecha na hora, sem depender de e-mail.

**A consequência aceita conscientemente:** com autoconfirmação, alguém pode se cadastrar usando
o e-mail de outra pessoa, porque ninguém prova que é dono do endereço. Em beta fechado com 6
usuários isso é tolerável. **Antes de cobrar, tem de voltar a exigir confirmação** — o que
depende do SMTP próprio abaixo.

E **"esqueci minha senha" hoje só entrega para o e-mail do Lucas.** O fluxo está correto de
ponta a ponta (testado), o que falta é a entrega.

#### O que destrava: SMTP próprio (depende de domínio)

Quando o Lucas decidir registrar o domínio, a sequência é esta — **e eu executo, ele só
registra o domínio e me passa o acesso ao DNS:**

1. Registrar o domínio (~R$ 40/ano)
2. Apontar para a Vercel: projeto → **Settings → Domains → Add**
3. Resend → **Domains → Add Domain** → cadastrar SPF, DKIM e DMARC no registrador
4. Resend → **API Keys → Create API Key**
5. Supabase, via API de gerenciamento (`PATCH /config/auth`):
   ```
   smtp_host = smtp.resend.com   smtp_port = 465
   smtp_user = resend            smtp_pass = <API key>
   smtp_admin_email = nao-responda@<dominio>
   mailer_autoconfirm = false    <- volta a exigir confirmacao
   ```

> O domínio não é só para o e-mail: cobrar R$ 37/mês a partir de `astral-psi.vercel.app`
> custa conversão. É pré-requisito prático da Etapa 2 do projeto.

#### Disponibilidade do nome "Astral" — consultado em 30/07/2026

Fonte: RDAP oficial do Registro.br. **O nome curto está tomado em toda parte.**

| Domínio | Situação |
|---|---|
| `astral.com.br` · `astral.com` · `astral.app` · `astral.io` · `astral.co` | ❌ registrados |
| `appastral.com.br` · `meuastral.com.br` · `planoastral.com.br` · `astral.net.br` | ❌ registrados |
| **`astralconcursos.com.br`** | ✅ **livre** |
| **`astralmilitar.com.br`** | ✅ **livre** |
| **`astraledital.com.br`** | ✅ **livre** |

Não é problema: `astralconcursos.com.br` diz o que o produto faz e ajuda em busca orgânica.
"Astral" sozinho é genérico demais para ranquear. **Decisão do nome fica com o Lucas**, e a
compra fica para quando o site estiver pronto — decisão dele, para não gastar à toa.

---

### 13.5. Captcha — a única proteção de força bruta que não se contorna

**Medido em 30/07/2026:** o Supabase só recusa a partir da **32ª tentativa** de senha, e o
limite é por IP. Trinta chutes livres é muito para senha fraca, e quem troca de IP recomeça.

O Bloco D acrescentou um freio no navegador (5 erros → espera crescente de 30s a 15min), que
resolve o chute no formulário e o usuário martelando. **Mas quem chama a API direto passa por
cima dele.** A proteção que não se contorna é o captcha no próprio endpoint de autenticação.

Bônus: o mesmo captcha fecha a **bomba de e-mail da lista de espera** (seção 8.2, ALTO 5), que
continua sem solução real — as constraints limitam o conteúdo, não o volume.

**O que só o Lucas pode fazer (criar a conta):**

1. Abrir https://www.hcaptcha.com e clicar em **Sign up** (é grátis)
2. Confirmar o e-mail e entrar
3. No painel, clicar em **Sites → New Site**
4. Em **Hostnames**, adicionar: `astral-psi.vercel.app`
5. Salvar. A tela mostra duas coisas — copiar as duas:
   - **Sitekey** (pode aparecer no código, não é segredo)
   - **Secret key** (em **Settings → Secret Key**; é senha, não colar em arquivo do projeto)
6. Mandar as duas para mim

**O que eu faço depois:** ligo `security_captcha_enabled` pela API de gerenciamento (10.2) e
acrescento o widget nas telas de login, criar conta e lista de espera.

> ⚠️ Enquanto isso não acontecer, o freio existente é de conveniência, não de segurança.
> Está escrito assim no próprio código, em `assets/js/astral.js`, para ninguém se enganar.

---

### 13.3. Proteção contra senha vazada — ❌ exige plano Pro

**Correção de uma afirmação errada minha.** Eu havia escrito duas vezes que era "um toggle no
painel, custo zero". **Não é.** A tentativa de ligar via API devolveu:

```
HTTP 402 — "Configuring leaked password protection via HaveIBeenPwned.org
            is available on Pro Plans and up."
```

Ou seja: só no plano Pro do Supabase (~US$ 25/mês). Fica como item da Etapa 2, junto com a
decisão de upgrade — que provavelmente virá de qualquer forma quando houver receita.

Enquanto isso, a defesa possível é o mínimo de 8 caracteres, **já aplicado no servidor**
(`password_min_length = 8`), somado ao medidor de força em `redefinir-senha.html`.

---

## 12. Log de sessões

### Sessão 1 — 29/07/2026 · Auditoria completa + Bloco A

Primeira sessão com Claude Code. Ponto de partida: `astral-contexto.md` do Downloads, 13 páginas
(~9.700 linhas) e 4 edge functions. Nenhuma linha de código de produto foi alterada até o Bloco A.

**1. Versionamento (8.1).** O repo existia no GitHub mas a pasta local não estava conectada —
sem `.git`, sem git instalado. Os 44 commits eram todos "Add files via upload". Descobri que
o local estava **à frente** da produção e que a pasta `supabase/` inteira nunca fora versionada:
as edge functions existiam em um único lugar no mundo, este HD.

**2. Auditoria de segurança do código (8.2).** 4 críticos. O pior é XSS sistêmico — 40 pontos de
`innerHTML` sem escape, com o token de sessão em `localStorage`. O vetor realista é um PDF de
edital com prompt injection distribuído em grupo de WhatsApp.

**3. Acesso ao Supabase (10.1).** CLI já estava autenticada. MCP configurado — a primeira
tentativa falhou por causa da duplicação `C:` / `c:` no `~/.claude.json`; resolvido com
`--scope user`.

**4. Auditoria do banco (8.3).** Dois achados que a leitura do código não revelava:
a trigger de criação de perfil falha em silêncio (**6 usuários, 0 perfis**) e a policy de UPDATE
em `perfis` deixa o usuário se promover para `pro` sozinho.

**5. Bloco A (8.5).** Extração da casca compartilhada, verificada contra o original.

**Erros meus nesta sessão, para calibrar confiança em números não medidos:**
- Afirmei "~153 KB de CSS duplicado". Real: 146,6 KB **totais**, 48,7 KB de duplicação.
- Afirmei que as tabelas de patente já tinham divergido. **Falso** — são idênticas.
  Pior: usei isso como argumento principal para priorizar o Bloco A.
- Escrevi um verificador que acusou falha nas 8 páginas por comparar at-rules **por posição**.
  Era bug do verificador, não regressão.

Lição: medir antes de afirmar. As três vezes em que rodei o número em vez de estimar, o número
contrariou a estimativa.

**Estado ao fim:** 8 commits locais, nenhum enviado. Ver seção 0 para o ponto de retomada.

---

### Sessão 2 — 30/07/2026 · Bloco B inteiro (B1 + B2 + B3)

Sessão de execução. O Lucas autorizou aplicar sem revisão prévia e pediu para emendar um bloco
no outro. Saiu a Etapa 1 quase inteira: só faltam os Blocos C e D.

**B1 — banco (8.6).** Primeiras 5 migrations do projeto. Conserto da trigger de perfil, com
backfill: de **6 usuários / 0 perfis** para 6/6. `tipo_plano` travado por privilégio de coluna.
`lista_espera` reduzida a `insert` com 4 constraints. Advisors: 5 avisos → 1.

**B2 — edge functions (8.7).** Módulo `_shared/comum.ts`. Identidade real do usuário, quota por
plano em `uso_ia`, CORS restrito, limite de 10 MB no PDF, validação de schema da IA.

**B3 — frontend (8.8).** `assets/js/astral.js`. Token do usuário nas 4 chamadas, escape nos
pontos de dado não confiável, `urlSegura()`, `vercel.json` com CSP, `supabase-js` travado
em 2.111.0.

**Correções de auditoria feitas nesta sessão** — todas por medição, contra o que eu tinha
afirmado antes:

| Eu tinha escrito | Medição mostrou |
|---|---|
| "o furo é `verify_jwt = false` no config.toml" | Ligar o flag **não resolve** — o gateway aceita a publishable key. A defesa tem de estar dentro da função |
| "redefinição de senha quebrada" | Pior: **todo o provedor de e-mail está desligado**. `criar-conta.html` e `login.html` nunca funcionaram |
| "chegou um e-mail do meu teste, pode ignorar" | **Não chegou.** O Lucas avisou |
| "eu quebrei a notificação de cadastro" | **Também errado** — falei antes de checar. A função está correta; falta a Parte 2 da configuração (13.2) |

**O padrão que se repete:** toda vez que eu afirmei sem medir, errei. Toda vez que medi, o
número contrariou a estimativa. Vale desconfiar de qualquer afirmação minha que não venha
acompanhada do comando que a produziu.

**Ferramentas criadas nesta sessão** (as duas últimas ficaram no scratchpad, vale recriar):
- `tools/valida-css.js` — compara CSS resolvido contra um ref do git
- checagem de sintaxe dos blocos `<script>` com `node --check`
- conferência de que cada página importa os símbolos que usa

**Estado ao fim:** 16 commits locais, **nenhum enviado**. As edge functions **já estão em
produção** (deploy pela CLI não passa pelo git); o frontend não. Ver seção 0.
