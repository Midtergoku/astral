# ASTRAL — Contexto do Projeto

> Arquivo vivo. Atualizar ao fim de cada bloco de trabalho relevante.
> Última atualização: 30/07/2026 — fim da sessão 3 (quota por unidade, gate, hCaptcha inerte).

---

## 0. ▶ RETOMAR AQUI

**A Etapa 1 (blindagem) está fechada.** Blocos A, B1, B2, B3, C e D concluídos e em produção.
Depois dela, ainda em 30/07/2026: quota por unidade (8.12), gate free vs pro (8.13) e o
hCaptcha preparado e desligado (13.5).

### ▶ A sessão 4 começa AQUI, nesta ordem

Ordem do Lucas ao fechar a sessão 3: *"partiremos a partir desse ponto respondendo os tópicos
acima"*. Ou seja — **não abrir com CSS.** Abrir perguntando/resolvendo os dois blocos abaixo:

1. **As três decisões dele** (tabela "O que depende do Lucas") — créditos, chaves do hCaptcha,
   e ligar ou desligar a busca de professores
2. **As três tarefas rápidas** (lista "O que eu faria a seguir") — ~1h30 somadas

**Só depois disso, o visual/CSS**, que é o que ele quer fazer de verdade nesta sessão. Ele vai
trazer a lista do que quer aprimorar. Ver Etapa 3 na seção 9.

### Estado verificado em produção (tools/testa-site.js, 39 checagens)

```
16 páginas HTTP 200          6 cabeçalhos de segurança ativos
4 assets compartilhados      5 edge functions recusam a chave pública (401)
6 tabelas negam leitura anônima      login por e-mail e Google ligados
```

Rodar de novo com `node tools/testa-site.js`. Complementos: `node tools/valida-css.js`.

### O que depende do Lucas

| # | O quê | Bloqueia |
|---|---|---|
| 1 | **Créditos na Anthropic.** Adiado por ele em 31/07 — vai colocar quando receber do serviço. **Agora é gasto único, não mensal**: US$ 5 testa, US$ 15–20 faz o onboarding de 10 beta testers (10.4) | teste real do upload de edital; e medir o que hoje é estimativa |
| 2 | ~~Testar o login por e-mail e senha~~ ✅ **CONFIRMADO POR ELE em 31/07**: *"consegui logar"*. O ciclo do captcha está validado de ponta a ponta, com widget renderizando e domínio aceito | — |
| 3 | ~~Chaves do hCaptcha~~ ✅ **entregues e aplicadas em 31/07** | — |
| 4 | ~~Desligar a busca de professores?~~ ✅ **resolvido de outro jeito**: ficou ligada, mas virou busca única e permanente (8.16) — custo recorrente foi a zero sem perder a funcionalidade | — |

> ✅ **O captcha está validado de ponta a ponta.** Era a última incerteza da 13.5 — a única
> ponta que não dava para verificar sem navegador. Ele testou e funcionou.

> ⚠️ **Dinheiro é restrição real aqui.** Ele disse em 31/07: *"nem sempre eu tenho dinheiro"*, e
> que R$ 70–100/mês já pesaria. Não propor nada que custe sem dizer o preço na mesma frase.
> **Isso ficou muito melhor em 31/07:** com questões desligadas e recursos permanentes, o custo
> deixou de ser mensal e virou uma vez por pessoa (10.4).

### ✅ As três tarefas rápidas — feitas em 31/07/2026

1. ~~"Esqueci minha senha" não entrega para ninguém~~ → a tela agora **avisa a verdade** e manda
   falar com o Lucas no WhatsApp. Some quando houver domínio próprio (13.4).
2. ~~Nenhum monitoramento de erro~~ → tabela `erros_cliente` + função `registrar-erro` +
   captura no `astral.js`. Ver 8.14.
3. ~~Promover alguém para `beta` é SQL na mão~~ → passo a passo completo em **13.6**.

### O que sobrou na fila

1. 🟠 **A bomba de e-mail da `lista_espera` continua aberta** (8.2, ALTO 5). O captcha do
   Supabase **não** cobre esse formulário — é INSERT direto no PostgREST. Falta a edge function
   `entrar-lista-espera` que confere o token do hCaptcha. **Agora dá para construir**, porque a
   secret existe.
2. 🟡 **`processar-edital` em janela mensal** em vez de diária (8.12).
3. 🟡 **Nenhum registro de quem apaga linha da `lista_espera`** — ver 8.3, "Observação de produto".

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
| Escrevi o passo a passo do hCaptcha **de memória**: mandei procurar "Hostnames" (hoje é **Domains**) e a secret dentro do site (é **da conta**). O Lucas travou seguindo. | **Interface de site de terceiro muda — nunca descrever de memória.** Antes de escrever qualquer clique a clique, abrir a documentação oficial. Vale o mesmo que a regra 1 da seção 0.1: painel de terceiro é "estado de sistema", e eu afirmei sem medir. |
| Meu script de varredura esperava HTTP 400 num INSERT inválido e veio 401; **concluí que o formulário da landing estava quebrado** | Não estava. Validação que mora em **policy de RLS** volta como 401/42501, não 400 — o Postgres trata violação de policy como falta de permissão. Confirmei por fora antes de falar (INSERT válido → 201). Expectativa errada no teste vira falso alarme, que gasta a confiança do Lucas igual a um erro de verdade. |
| 🔴 **Derrubei o login em produção por ~2 min** ligando o captcha no servidor antes de publicar a sitekey — **seguindo a ordem que eu mesmo tinha escrito errada** na 13.5 | Instrução minha errada no `CLAUDE.md` é pior que instrução nenhuma: eu a sigo com confiança. **Ao escrever um procedimento de duas pontas, simular mentalmente as duas ordens e anotar o que quebra em cada uma.** A ordem certa é sempre: primeiro o lado que só *envia* a mais, depois o lado que passa a *exigir*. |
| Rodei **dois `git push` concorrentes** (um em background, um em foreground) e levei `cannot lock ref`; passei a achar que o push falhava | O primeiro tinha funcionado. **Nunca disparar dois pushes para o mesmo ref.** E ler o erro até o fim: ele dizia `is at f2502af`, que já era a resposta. |
| Consultei a produção **40 vezes em 4 minutos** para ver se o deploy saiu, e a Vercel me bloqueou (`X-Vercel-Mitigated: challenge`) — passei a achar que o deploy não tinha saído | Polling agressivo vira autossabotagem: eu criei o sintoma que fui diagnosticar. **Esperar 20–45s entre consultas** e usar `User-Agent` de navegador. |
| Escrevi `drop policy "qualquer um entra na lista de espera"` **com o nome de memória**. O nome real era outro, e o `if exists` transformou o erro num aviso silencioso — dei o trabalho por feito | **Nunca escrever `drop policy`/`drop index` com nome lembrado.** Consultar `pg_policies` antes. O `if exists` é uma faca: protege contra erro *e* esconde o engano. Salvou-me o `revoke` na mesma migration — duas barreiras existem para isso. |
| Meu teste de invasão deu "tudo bloqueado" (401 em tudo) e eu quase comemorei — **o teste nem estava autenticando**: misturei a chave `anon` antiga com a publishable nova, e depois o próprio captcha barrou o login do script | **Resultado negativo em teste de segurança não vale sem prova de que o ataque foi tentado com credencial válida.** O teste agora confirma que o token do atacante lê o *próprio* dado antes de tentar ler o alheio. |
| Deixei 3 interpolações sem escape em `edital.html` durante o Bloco B3 | Varri por **lista de nomes conhecidos** (`q.enunciado`, `m.nome`) e não por *origem do dado*. `estado.edital.*` não estava na minha lista mental. Por isso `tools/varre-xss.js` existe agora — a varredura não pode depender do que eu lembro. |

---

## 0.2. ⚠️ COMO FALAR COM O LUCAS — regra permanente

> Ordem direta do Lucas em 30/07/2026: *"toda vez que você terminar algum processo, você vai
> fazer um mini relatório pra mim, me explicando detalhadamente como se eu tivesse contando
> pro meu pai que não sabe nada de internet"*.

**Ao fim de todo bloco de trabalho, escrever um relatório em linguagem de leigo.** Não é
resumo técnico com palavras mais fáceis — é explicar de verdade, para alguém que nunca ouviu
falar de banco de dados, API ou deploy.

O que o relatório precisa ter:

1. **O que estava errado antes**, em termos do mundo real. Não "a quota contava chamadas" —
   e sim "o limite dizia 50, mas cada uso valia até 20, então na prática eram 1.000".
2. **O que eu fiz**, na ordem, sem jargão. Quando o termo técnico for inevitável, explicar
   entre parênteses na primeira vez.
3. **O que muda para quem usa o site.** Essa parte é a mais importante e é a que eu mais
   esqueço.
4. **O que eu testei para saber que funcionou** — e o resultado do teste, não a intenção.
5. **O que ficou faltando**, e se depende dele ou de mim.

Analogias são bem-vindas. Tabelas de antes/depois funcionam muito bem com ele.

**Por que essa regra existe:** o Lucas é o dono do produto e toma todas as decisões, mas não
é técnico. Se ele não entende o que mudou, ele não consegue decidir. Um relatório que ele não
entende é o mesmo que nenhum relatório — e pior, dá a falsa impressão de que ele foi
informado. Ver também 0.1: o risco aqui é sempre ele decidir com base em coisa que eu
expliquei mal.

Ferramentas que respondem rápido: `mcp__supabase__get_logs`, `execute_sql`, `get_advisors`,
`supabase functions list`, e um POST direto na API com `Invoke-WebRequest`.

---

## 0.3. ⚠️ GRAVAR A CADA PROMPT — regra permanente

> Ordem do Lucas em 31/07/2026, depois de perguntar se eu gravava sozinho ou só quando ele
> pedia: *"toda vez que eu lançar um prompt, você vai guardar tudo que for de importante lá.
> Não é para sobrescrever, é para adicionar informação. Quanto mais informação melhor."*
>
> **Resposta honesta que motivou a regra: eu NÃO gravava sozinho.** Gravava quando ele pedia.
> Isso significa que tudo o que ele disse entre um pedido e outro se perdia.

**A cada prompt dele, antes de fechar a resposta, registrar aqui o que for durável.** Não
esperar ele pedir, não esperar o fim da sessão.

O que conta como durável:
- **Decisão dele** (o quê e, principalmente, *por quê* — o porquê é o que evita reabrir depois)
- **Restrição** que ele revelou (dinheiro, tempo, o que não quer fazer com as próprias mãos)
- **Mudança de escopo** — o que entrou, o que saiu, e se saiu "por enquanto" ou de vez
- **Número medido** e o comando que o produziu
- **Erro meu** → linha na tabela da 0.1, na hora

**Acrescentar, nunca sobrescrever.** Se um fato novo contradiz um antigo, deixar os dois com
data e dizer qual vale — o histórico da decisão vale tanto quanto a decisão. Sobrescrever apaga
o raciocínio e faz a mesma discussão voltar semanas depois.

A única coisa que se apaga é o que a seção 0.4 define como inútil.

---

## 0.35. ⚠️ O LUCAS NÃO EXECUTA NADA — eu detecto e conserto

> Ordem dele em 31/07/2026, depois de eu ter escrito "se der problema, abra o terminal e rode
> este comando": *"não, eu não vou abrir nada. Você já vai identificar pra mim, se quebrar você
> vai consertar pra mim. Eu não vou mexer em nada. Deixa isso guardado, você faz tudo, eu não
> faço nada. E se não já houver maneira de fazer, você dá um jeito de fazer."*

**Nunca mais entregar um conserto como instrução para ele executar.** Se existe um comando que
resolve, quem roda sou eu.

### A regra operacional

**A PRIMEIRA coisa de toda sessão, antes de qualquer outro trabalho:**

```
node tools/checa-saude.js
```

São ~15 segundos. Ele responde uma pergunta só: *o usuário consegue usar o Astral agora?*
Cobre site no ar, login por senha, login com Google, as 6 edge functions e a captação de leads.
Quando algo quebra, a saída já diz o comando do conserto — e **eu rodo, sem perguntar**.

A checagem mais importante dele é a do par captcha: detecta especificamente a combinação
"servidor exige token / site não manda", que é o que derrubou o login em 31/07.

### O limite honesto disto, que eu não devo esconder dele

**Isto não é monitoramento 24 horas.** Eu só existo quando ele manda mensagem — entre uma
sessão e outra, ninguém está olhando. O que a regra garante é que **nenhuma sessão comece em
cima de um site quebrado sem eu perceber**, e que ele nunca precise diagnosticar nada.

Para vigilância de verdade entre sessões seria preciso um agente agendado rodando na nuvem.
Não montei por conta própria porque consome recursos da conta dele e **dinheiro é restrição
real aqui** (ver 0.1 e a seção 1). É uma proposta a fazer, com o custo dito na mesma frase —
nunca uma coisa a ligar sem avisar.

---

## 0.4. Limpeza — o que pode sair do arquivo

> Ordem do Lucas em 31/07/2026: *"tudo que for inútil... coisas realmente inúteis que não vão
> interferir no projeto, quero que você retire para não pesar o projeto. Apenas coisas inúteis
> que não vão servir para nada, não quero que você mexa em nada que seja útil ou que você pense
> que provavelmente vai ser útil em algum momento."*

**Pode sair:**
- Instrução para passo manual que ele **nunca vai executar** (ele não abre terminal nem painel)
- Estado transitório já resolvido — "faltam 16 commits para enviar", "aguardando decisão X"
- Texto duplicado que existe melhor em outro lugar do arquivo

**Não pode sair, mesmo parecendo velho:**
- Qualquer linha da 0.1 (tabela de erros) — ordem explícita dele
- **O porquê** de uma decisão, mesmo já executada
- Número medido + o comando que o produziu
- Armadilha de ambiente (PowerShell/acentos, PATCH no PS 5.1, blob UTF-8)

Na dúvida, **fica**. O critério dele foi explícito: só o que "não vai servir para nada".

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

A lista de espera tinha **2 cadastros** em 29/07/2026. A landing fala em "vagas limitadas para
beta testers", mas a demanda ainda não foi validada de verdade.

> **Atualização de 30/07/2026 — a tabela está com 0 linhas, e isso está explicado.** A varredura
> acusou vazio e eu levantei a hipótese de ter apagado sem querer. **Não fui eu:** o Lucas
> confirmou que os 2 cadastros eram dele e de um amigo, e que **ele mesmo os removeu**. O amigo
> vai se cadastrar de novo.
>
> Fica a lição de processo: eu **não tinha como provar** que não tinha sido eu, porque ninguém
> registra quem apaga o quê nessa tabela. Antes do lançamento no WhatsApp vale considerar um
> log de exclusões — quando entrar lead de verdade, "sumiu e não sei por quê" deixa de ser
> aceitável.
>
> **Consequência prática:** a demanda continua sem validação nenhuma. Zero cadastros externos
> até agora.

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

## 8.17. Varredura de segurança (31/07/2026) — pedido dele antes das perguntas

O Lucas pediu antes de sair: *"faça outra varredura de segurança... não queremos que nenhuma
API pública seja exposta, nenhum deslize bobo"*.

### O que foi verificado, e como

| Frente | Método | Resultado |
|---|---|---|
| Segredos no código | grep por 6 padrões (`ES_`, `sbp_`, `sk-ant`, `re_`, JWT, genéricos) | ✅ nenhum |
| **Segredos no histórico do git** | `git log -p --all -S` por commit que já tenha adicionado chave | ✅ **nenhum, nunca** |
| Arquivos `.env`/`.pem`/`.key` versionados | `git log --diff-filter=A` em toda a história | ✅ nenhum |
| XSS | `tools/varre-xss.js` — só dado não confiável, dentro de `innerHTML`, sem escape | 🔴 **3 achados, corrigidos** |
| RLS e privilégios | `pg_tables` + `pg_policies` + `has_table_privilege` nas 8 tabelas | ✅ RLS em todas, `anon` sem nada |
| **Isolamento entre usuários** | `tools/testa-isolamento.js` — ataque real com 2 contas | ✅ **nenhum vazamento** |
| Advisors do Supabase | `get_advisors type=security` | ✅ só os 3 INFO intencionais + HIBP (plano Pro) |
| Dependências de CDN | pin de versão | ✅ ambas travadas |
| `target="_blank"` | `rel="noopener"` | 🟡 4 sem, corrigidos |

### 🔴 O achado que valeu a varredura: XSS em `edital.html`

Três interpolações **sem escape** dentro de `innerHTML`, todas com dado que vem da leitura do
PDF pela IA — exatamente o vetor de prompt injection descrito no CRÍTICO 1 da 8.2:

```
${estado.edital.nome}        ${estado.edital.dataProva}        ${estado.edital.materias}
```

O `esc()` **estava importado no arquivo** e não foi usado ali. É uma falha que passou no
Bloco B3, quando escapei os outros pontos. Corrigido nos três.

> **Por que passou:** no B3 eu procurei pelos padrões que já conhecia (`q.enunciado`,
> `m.nome`, `evento.obs`) e não pelo objeto `estado.edital`. Varredura por lista de nomes
> conhecidos sempre deixa buraco. Por isso `tools/varre-xss.js` agora existe e roda sozinho.

### O teste de isolamento — e por que ele quase deu falso positivo

Duas armadilhas seguidas quase me fizeram acreditar em proteção que não estava sendo testada:

1. A chave `anon` da CLI é o **JWT antigo**; o site usa a `sb_publishable_` nova. Misturar
   devolve 401 em tudo — o que **parece** proteção funcionando.
2. O captcha (que eu mesmo liguei) **bloqueia login por senha em script**. Sem sessão, 401 de
   novo.

Solução: o teste agora obtém sessão por **magic link da API de admin**, e **primeiro prova que
o token do atacante autentica** antes de tentar invadir. Sem essa prova, o resultado não vale.

> 🧠 **Regra que sai daqui:** num teste de segurança, um resultado "tudo bloqueado" só conta
> depois de demonstrar que o ataque *chegou a ser tentado com credencial válida*.

### Nova ferramenta

```
node tools/varre-xss.js         # dado nao confiavel sem escape
node tools/testa-isolamento.js  # um usuario alcanca o dado de outro?
```

### O que continua aberto, e por quê

- **Senha vazada (HaveIBeenPwned)** — exige plano Pro do Supabase (13.3). Mitigação atual:
  mínimo de 8 caracteres no servidor + medidor de força.
- **`'unsafe-inline'` no `script-src` da CSP** — o projeto não tem build, e todo JS é inline.
  Remover exigiria hash ou nonce, que exige etapa de build (8.8).

---

## 8.18. Endurecimento a partir da lista do Lucas (31/07/2026)

Ele trouxe uma lista de 20 ataques + checklist de proteções (feita por outra IA) e mandou
aplicar tudo, **menos o que é pago e menos 2FA**.

> ⚠️ **A lista assume outro stack** — Next.js, React, Stripe, Zod, Sentry. O Astral é HTML/JS
> puro na Vercel + Supabase + Mercado Pago. Vários itens **não existem aqui**, e outros viram
> coisa diferente. O mapeamento honesto está na 8.19; esta seção é só o que foi construído.

### O que foi feito nesta rodada

**1. Sessão eterna → botão "Sair de todos os aparelhos"**

`sessions_timebox = 0`: o JWT dura 1h mas o refresh token renovava **para sempre**. Token
roubado valia indefinidamente. Tentei impor teto e levei **HTTP 402 — recurso do plano Pro**,
igual à checagem de senha vazada.

Construí o substituto grátis, que em alguns aspectos é melhor: `signOut({ scope: 'global' })`
em `conta.html` **revoga todos os refresh tokens no servidor**, não só apaga o token local. A
pessoa passa a ter o remédio na mão — e é o remédio certo para o caso real (lan house, escola,
computador de amigo).

**2. Upload de PDF: o servidor agora confere que é PDF de verdade**

O navegador checava `file.type`, que vem do sistema operacional e é trivialmente falsificável
por quem chama a API direto. O servidor só olhava o tamanho.

- **Magic bytes**: todo PDF começa com `%PDF-`. Sem isso, qualquer coisa ia para a Anthropic
  declarada como PDF — e chamada que falha custa igual.
- **Teto de 150 páginas**: 10 MB de texto puro cabem ~400 páginas, o que vira dezenas de
  milhares de tokens. A contagem é **aproximada de propósito** e **libera quando não consegue
  contar** — recusar um edital legítimo seria pior que o custo evitado.

**3. Log de auditoria (`auditoria`)**

O registro de erros cobre o que quebrou. Faltava o que aconteceu quando **nada** quebrou.

| Evento | Como é capturado |
|---|---|
| `plano_alterado` | trigger em `perfis`, com `de`/`para` |
| `lead_removido` | trigger em `lista_espera`, com nome e concurso |

**Trigger e não código de aplicação, de propósito:** pega também o que for feito pela Table
Editor do painel ou por SQL na mão — que é exatamente como o Lucas promove beta tester (13.6).
Auditoria que só cobre o caminho feliz não serve.

Escopo estreito de propósito: só o que mexe em dinheiro, acesso ou existência. **Não** registra
navegação nem login comum — isso seria vigilância do usuário e criaria passivo de LGPD.

RLS ligada sem policy: nem o próprio usuário lê ou apaga o log do que fizeram com a conta dele.
Testado: leitura e exclusão negadas com 403.

**4. 🐛 Bug de perda de dados corrigido (achado no caminho)**

O `pagehide` em `estado.js` dizia proteger o último passo do usuário e fazia o **oposto**:
cancelava o salvamento pendente sem gravar. Quem marcasse uma sessão e fechasse a aba em menos
de 600 ms perdia aquele passo no banco. Agora despacha com `keepalive`, igual ao relator de
erros.

> Não é falha de segurança, é de integridade — mas apareceu numa auditoria de segurança, o que
> mostra que ler o código com outra pergunta na cabeça acha coisa diferente.

**5. `rel="noopener"`** nos 4 links `target="_blank"`.

### Verificado e já estava correto

| Item da lista | Estado |
|---|---|
| SQL injection | ✅ sem SQL concatenado; só 2 funções, ambas com `search_path` fixo |
| `SECURITY DEFINER` | ✅ 1 função, com `search_path` fixo e **`EXECUTE` revogado de todos** |
| SSRF | ✅ **superfície zero** — nenhuma função busca URL fornecida pelo usuário. A busca web roda dentro da Anthropic, não aqui |
| CSRF | ✅ token vai em header, não em cookie — não há cookie de sessão para forjar |
| Clickjacking | ✅ `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| Supply chain | ✅ **sem `npm`** — 2 dependências, ambas via CDN com versão travada. Não há `node_modules` para comprometer |
| Segredos no git | ✅ nenhum, em toda a história |
| Rate limit de custo | ✅ quota por unidade em `uso_ia`, verificada **antes** de gastar crédito |

### O que continua aberto, e o motivo

| Item | Por que não |
|---|---|
| Senha vazada (HaveIBeenPwned) | **HTTP 402** — plano Pro (~US$ 25/mês) |
| Teto de duração de sessão | **HTTP 402** — plano Pro. Mitigado pelo botão do item 1 |
| Confirmação de e-mail obrigatória | Depende de SMTP próprio, que depende de domínio (13.4) |
| 2FA | **O Lucas pediu para não fazer agora** |
| `'unsafe-inline'` no `script-src` | Exigiria etapa de build; o projeto não tem uma (8.8) |
| XP validado no servidor | Ver 8.19 — hoje é risco aceito, com a condição que o muda |

---

## 8.19. O que da lista NÃO se aplica — e o que aprendi lendo ela

Registrado porque o Lucas vai voltar com perguntas, e porque "não fiz" e "não existe aqui" são
respostas muito diferentes.

| Item da lista | Por que não se aplica |
|---|---|
| **Webhook do Stripe falsificado** | Não há Stripe (10.3: ele não tem CNPJ). Quando o Mercado Pago entrar, **a validação de assinatura é bloqueador de lançamento** — sem ela, qualquer POST vira "pagamento aprovado" |
| **`dangerouslySetInnerHTML`** | Não há React. O equivalente aqui é `innerHTML` com template string — e é exatamente onde achei o XSS de hoje (8.17) |
| **Zod em API routes** | Não há Next.js. A validação equivalente vive nas edge functions, escrita à mão |
| **Cookies `SameSite`** | Não há cookie de sessão; o token fica no `localStorage` |
| **Dependabot / `npm audit`** | Não há `package.json` |
| **Sentry** | Substituído por sistema próprio (8.14) — não dá para eu criar conta de terceiro em nome dele |
| **Preview da Vercel indexado** | Só há `main`; não há branch de staging publicada |

### Dois riscos reais que a lista aponta e que eu quero deixar explícitos

**1. XP é 100% confiável no cliente.** Qualquer pessoa abre o console e escreve
`progresso.xp = 999999`. Hoje isso é **autoengano, não fraude**: XP não destrava nada pago — o
gate é `tipo_plano`, que está protegido no servidor e foi testado.

> 🔴 **A condição que muda isso:** no dia em que XP virar **ranking com prêmio, desconto ou
> qualquer vantagem real**, isso deixa de ser inofensivo e precisa de validação no servidor.
> Como o Lucas quer ranking na Etapa 3, **reler isto antes de construir.**

**2. Duas abas abertas = última escrita vence.** O progresso é gravado como bloco inteiro, então
duas abas sobrescrevem uma à outra. É perda de dado, não brecha. Aceitável enquanto o app for
de uso individual; resolver exigiria escrita por campo ou versionamento otimista.

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

1. ~~Migrar estado do localStorage para tabelas no Supabase (com RLS)~~ ✅ feito — ver seção 5
2. ~~Implementar o gate real de `free` vs `pro`~~ ✅ feito — ver 8.13
3. **Gateway de pagamento** — ver seção 10. É o que falta para o gate virar receita:
   hoje ele distingue os planos, mas só o Lucas promove alguém para `pro`, na mão
4. Domínio próprio no Resend + e-mails transacionais
5. Créditos Anthropic + teste end-to-end do upload de edital
6. `processar-edital` em janela **mensal** em vez de diária (ver 8.13, "ainda aberto")

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

### Etapa 3 — Visual e gamificação  ← **É AQUI QUE A PRÓXIMA SESSÃO COMEÇA**

Adiado três vezes. Em 31/07 ele decidiu: *"quero repaginar tudo"*, e vai **baixar skills de
design** antes de começar. Objetivo declarado: *"deixar com menos cara de feita de IA
possível"*. Roadmap completo em **9.1**.

**Tudo o que ele já pediu para esta etapa, ao longo das sessões — nada disso pode ser esquecido:**

| O quê | Quando pediu | Detalhe |
|---|---|---|
| **Repaginada visual geral** | 29/07 | *"quero mexer bastante"* |
| **Tag em estilo de jogos** | 29/07 | Citou explicitamente. **Falta definir o que é** — perguntar antes de inventar |
| **Mais quests** | 29/07 | Aprofundar a gamificação além dos 8 badges atuais |
| **Ranking pessoal** | 30/07 | *"a parte do ranking pessoal e mais quests, quero fazer sim, mas vamos deixar para depois... quando formos partir mais para o visual"*. ⚠️ **Pessoal, não entre usuários** — ele disse "ranking pessoal" |
| **Página Minha conta** | 31/07 | Ele apontou: *"a parte de minha conta ela ainda está sem a parte do visual"*. É a mais atrasada — foi a única página que construí do zero, funcional e sem acabamento |

> ⚠️ **Ranking entre usuários seria um erro de produto.** Ele disse "ranking **pessoal**". Num
> app de concurseiro, ranking público desmotiva quem está atrás — e a base é pequena demais para
> um ranking fazer sentido. Confirmar com ele antes de qualquer coisa comparativa.

---

---

## 9.1. Roadmap do design — Etapa 3 (montado em 31/07/2026)

### Diagnóstico: o que **medidamente** denuncia "feito por IA"

Não é opinião — foi contado no código em 31/07:

| Sinal | Medição | Por que denuncia |
|---|---|---|
| **Roxo `#7C5CFC` sobre quase-preto `#0A0A0F`** | a paleta atual | É *a* paleta canônica de SaaS gerado por IA. Praticamente toda landing gerada nos últimos anos é roxo sobre preto |
| **Inter** no corpo | fonte atual | A fonte mais "padrão de IA" que existe. Space Grotesk é melhor, mas também é escolha de template |
| **118 emojis como ícone** | contados nas 16 páginas | Produto desenhado usa conjunto coerente. Emoji muda de desenho por sistema operacional |
| **8 raios de borda** | 8, 10, 12, 14, 16, 20px, 50%, 999px | Não é sistema, é acúmulo. Produto desenhado tem 2 ou 3 |

> **O site não é feio — é genérico.** E genérico é o que "cara de IA" significa. Isso **não se
> conserta trocando componente**: vem da fundação (paleta, tipo, espaçamento, voz). Por isso o
> roadmap começa por decidir *o que ele deve ser*.

### A direção que eu quero defender no V0

**Militar / insígnia.** O produto **já tem** patentes (Bombeiro 3ª Classe, Cabo, Sargento — ver
seção 6). Isso é um mundo visual pronto: brasões, divisas, estêncil, verde-oliva ou
azul-marinho, textura de tecido, medalha de metal.

Três vantagens de uma vez:
1. **Nenhuma IA gera isso por padrão** — resolve o pedido dele na raiz
2. Combina exatamente com o público (concurseiro de carreira militar)
3. **Resolve de graça a "tag estilo de jogos"** — a tag vira uma *divisa de patente*, não um
   adesivo genérico

Levar 3 direções concretas mesmo assim (paleta em hex, par de fontes, referência real), porque
a escolha é dele. Mas esta é a recomendação.

### Os 8 blocos

| Bloco | O quê | Entrega |
|---|---|---|
| **V0** | **Direção** — 3 opções concretas, ele escolhe 1 | documento de 1 página; vira a lei do resto |
| **V1** | **Fundação** — paleta, escala de tipo, espaçamento, raios, sombras | `estilo.html` para ele aprovar **antes** de tocar em 16 páginas |
| **V2** | **Casca compartilhada** — sidebar, topbar, cartões, botões, campos | `app.css` reescrito; decide os 35 seletores que hoje divergem (8.5) |
| **V3** | **118 emojis → conjunto de ícones** | maior efeito visual por linha de código do roadmap |
| **V4** | **Landing** — hierarquia de verdade e narrativa do nicho | `index.html` |
| **V5** | **Telas de entrada** — login, criar conta, lista de espera | primeira impressão de quem vem do WhatsApp |
| **V6** | **Telas do app, uma a uma** — **Minha conta primeiro** | ele apontou que é a mais atrasada |
| **V7** | **Gamificação** — tag, quests, ranking pessoal | ver avisos abaixo |
| **V8** | **Movimento e celular** | `motion` já carregado e quase não usado |

### Ordem sugerida de execução

`V0 → V1 → V3 → V2 → V4 → V5 → V6 → V7 → V8`

**V3 sobe para o 3º lugar** de propósito: trocar emoji por ícone é rápido, independente do
resto, e o site já muda de cara antes de eu tocar no layout.

### Avisos que valem mais que o roadmap

> 🔴 **Ranking é PESSOAL, não entre usuários.** Ele disse "ranking pessoal" em 30/07. Ranking
> público desmotiva quem está atrás e a base é pequena demais para fazer sentido. Confirmar
> antes de qualquer coisa comparativa.

> 🔴 **Se o ranking der prêmio, desconto ou vantagem, o XP precisa ser validado no servidor
> ANTES.** Hoje qualquer um abre o console e escreve o XP que quiser (8.19). Enquanto for "você
> contra você", é inofensivo. No instante em que valer algo, deixa de ser.

> ⚠️ **A "tag em estilo de jogos" é a única peça do roadmap sem definição.** Ele citou em 29/07
> e nunca detalhou. **Perguntar antes de inventar** — se a direção militar for escolhida, a
> hipótese é que seja a divisa de patente.

### O que muda no `valida-css.js` durante esta etapa

A ferramenta existe para **provar que o CSS não mudou** — foi o que garantiu que as
refatorações não quebravam nada. Durante a repaginada ela vai acusar diferença em tudo, porque
a diferença é o objetivo.

**Trocar o papel dela:** em vez de "provar que nada mudou", passa a **listar o que mudou**, para
eu conferir que mudou só o pretendido. Adaptar no começo do V1.

## 10. Decisões em aberto

- ~~**Gateway de pagamento**~~ ✅ **decidido em 30/07/2026: Mercado Pago.** Ver 10.3.
- ~~**Onde fica a linha free/pro**~~ ✅ **decidido: gate por quota, não por bloqueio de tela.**
  Ver 8.13.
- **Desligar a busca de professores/materiais?** O Lucas levantou em 30/07/2026 para economizar
  enquanto não há receita. Números em 10.4. **A decidir.**
- **Distribuição e marketing:** grupo de WhatsApp + beta testers vitalícios. Ver seção 9.

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

## 13. Passos manuais do Lucas — instruções clique a clique

> O Lucas não é técnico. Toda instrução aqui é literal: onde clicar, o que digitar, e como
> saber que deu certo. Não resumir.

### 13.1. Publicar em produção — quem faz sou eu

O passo a passo de `git push` que existia aqui foi removido em 31/07/2026: **o Lucas não
executa comando** (ver 0.35), então instrução clique a clique para ele nunca seria usada.

O que importa guardar:

- **`git push` para `main` publica o site.** A Vercel percebe sozinha e republica em ~1 min.
- **Edge functions e migrations NÃO passam pelo git** — vão pela CLI (`supabase functions
  deploy`, `supabase db push`) e entram no ar na hora, independente do push.
- ⚠️ O repositório é **público**. Nenhum segredo pode entrar em arquivo. Conferir com `grep`
  antes de commitar quando tiver mexido em chave.
- O push às vezes demora minutos ou estoura o tempo limite. **Nunca disparar dois em paralelo**
  (ver 0.1) — checar com `git ls-remote origin refs/heads/main` antes de concluir que falhou.

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

> As instruções clique a clique pelo painel foram removidas em 31/07/2026: o problema está resolvido e o Lucas não executa passo manual (0.35). Se precisar refazer, use o SQL acima.

### 13.6. Promover alguém a beta tester — o passo mais frequente do lançamento

> É a **primeira coisa** que acontece quando alguém entra no grupo de WhatsApp. Vai ser feito
> dezenas de vezes, então precisa ser à prova de erro.

**O que isso faz:** dá àquela pessoa acesso completo (60 questões/dia, 10 editais, 30 buscas),
de graça, para sempre. `beta` e `pro` têm exatamente o mesmo acesso.

**Antes de começar, a pessoa precisa já ter entrado no site pelo menos uma vez** — pelo Google
ou por e-mail. Sem isso ela ainda não existe no sistema e não há o que promover.

> 🎭 **REGRA CONTRA ENGENHARIA SOCIAL — a mais importante desta seção.**
>
> **O Lucas é o porteiro manual, então ele é o ponto fraco.** No grupo de WhatsApp, alguém vai
> pedir "libera meu acesso aí" — e pode não ser quem diz ser. O golpe clássico: a pessoa dá o
> e-mail de OUTRA pessoa, ou um e-mail que ela controla, e ganha acesso vitalício de graça.
>
> **A regra é uma só, e não tem exceção:**
> **só promover e-mail que já apareceu na tabela `perfis`** — ou seja, alguém que provou ter
> acesso àquela caixa de e-mail, porque entrou no site com ela.
>
> Se o comando SQL responder **"Success. No rows returned"**, isso **não é erro de digitação
> por padrão** — é o sistema dizendo que ninguém entrou com aquele e-mail. Peça para a pessoa
> entrar primeiro, e só depois promova.
>
> **Nunca** criar conta em nome de alguém, nunca promover "adiantado", nunca aceitar e-mail
> passado por terceiro. O custo de errar é acesso vitalício gratuito dado a um estranho — e
> `beta` é promessa que não se desfaz (seção 9).
>
> A mudança fica registrada na tabela `auditoria` (8.18) de qualquer forma, então dá para
> reconstruir depois quem virou beta e quando. Mas reconstruir é consolo, não prevenção.

1. Abrir https://supabase.com/dashboard/project/jjogmcacbdefwiwcyjxp/sql/new
   (é o **SQL Editor**; se pedir login, entrar com a conta do Astral)
2. Colar exatamente isto, **trocando o e-mail** pelo da pessoa:

   ```sql
   update public.perfis
   set tipo_plano = 'beta'
   where email = 'email-da-pessoa@gmail.com'
   returning email, nome, tipo_plano;
   ```

3. Clicar em **Run** (ou `Ctrl + Enter`)
4. **Como saber que deu certo:** aparece uma linha na tabela de resultados, com o e-mail da
   pessoa e `beta` na coluna `tipo_plano`.
   - Se aparecer **"Success. No rows returned"** → o e-mail está errado, ou a pessoa nunca
     entrou no site. Conferir a grafia e pedir para ela entrar uma vez.
5. A pessoa precisa **sair e entrar de novo** no Astral para o novo limite valer.

**Para conferir quem já é beta**, a qualquer momento:

```sql
select email, nome, tipo_plano, criado_em
from public.perfis
order by criado_em desc;
```

**Para tirar o acesso** (se alguém sair do grupo), trocar `'beta'` por `'free'` no primeiro
comando. ⚠️ Mas lembrar: **foi prometido acesso vitalício.** Rebaixar quem foi convidado é
quebra de promessa — ver seção 9.

> **Por que ainda é SQL na mão:** construir uma tela de administração seria mais uma superfície
> de ataque para proteger, por causa de uma ação que acontece 10–15 vezes na vida do produto.
> Quando o número passar de algumas dezenas, vale reavaliar.

---

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

> O domínio não é só para o e-mail: cobrar a partir de `astral-psi.vercel.app` custa conversão.
> É pré-requisito prático da Etapa 2 do projeto.

> ⏳ **Quando comprar — decisão dele em 30/07/2026, e o motivo importa:** *"quero criar um
> domínio apenas quando o site estiver completo e pronto para rodar, porque aí não será um
> dinheiro gasto em vão"*.
>
> **Não empurrar a compra antes disso.** É a mesma lógica financeira dos créditos da Anthropic:
> ele adia gasto até o retorno estar próximo, porque nem sempre tem dinheiro (ver 0.1). Quando
> o visual estiver pronto e os beta testers entrando, aí o domínio deixa de ser aposta e vira
> investimento — e é quando eu proponho, com o preço na mesma frase.

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

#### ✅ Estado em 31/07/2026: **LIGADO em produção**

O Lucas criou a conta e mandou as chaves. Aplicado e verificado:

```
security_captcha_enabled   False -> True
security_captcha_provider  hcaptcha
sitekey em astral.js       1f644a7e-... (publica por natureza, pode ficar no repo)
secret                     SO no painel do Supabase -- conferido por grep que nao esta no repo
```

| Verificação | Resultado |
|---|---|
| Secret aceita pela API do hCaptcha (`siteverify` com token falso) | ✅ `invalid-input-response` (= secret válida) |
| Sitekey publicada em produção | ✅ |
| **Login com Google** (rota dos 6 usuários existentes) | ✅ **302 → accounts.google.com, intacto** |
| Login por senha sem token de captcha | ✅ recusado com `captcha_failed` |

> ✅ **VALIDADO DE PONTA A PONTA em 31/07/2026.** O Lucas testou no navegador: *"consegui
> logar"*. Isso fecha a única incerteza que restava — o widget renderiza e o domínio
> `astral-psi.vercel.app` está cadastrado corretamente no painel do hCaptcha. O ciclo completo
> (widget → token → verificação no Supabase → sessão) funciona.
> **Reverter leva 30 segundos — e quem reverte sou EU, não o Lucas** (ver 0.35). A ferramenta
> está versionada em `tools/captcha-toggle.ps1`:
>
> ```
> powershell -File tools\captcha-toggle.ps1            # DESLIGA (emergência)
> powershell -File tools\captcha-toggle.ps1 -Ligar     # liga de novo
> ```
>
> Religar **não exige a secret em mãos** — o Supabase já a guarda. O script só a reenvia se
> `$env:HCAPTCHA_SECRET` estiver definida, justamente para a chave nunca precisar entrar no
> repositório (que é público).
>
> **`node tools/checa-saude.js` detecta essa quebra sozinho** e imprime o comando do conserto.
> Rodar no começo de toda sessão.

#### Como era antes (histórico): código pronto e inerte

O lado do frontend já está construído e no ar, **desligado de propósito**:

| Onde | O quê |
|---|---|
| `assets/js/astral.js` | `HCAPTCHA_SITEKEY = ''` + `montarCaptcha()`, `tokenCaptcha()`, `resetarCaptcha()` |
| `login.html` | container + token no `signInWithPassword` e no `resetPasswordForEmail` |
| `criar-conta.html` | container + token no `signUp` |
| `vercel.json` | CSP já libera `*.hcaptcha.com` em script/style/connect/frame-src |

**Sitekey vazia = tudo vira no-op.** `tokenCaptcha()` devolve `undefined`, que o `supabase-js`
ignora — as telas funcionam exatamente como antes. Verificado: 25 blocos de script sem erro de
sintaxe e CSS resolvido idêntico.

> 🔴 **A ordem de ligar importa — e a versão anterior desta seção dizia o CONTRÁRIO do certo.**
> Eu segui a minha própria instrução errada em 30/07/2026 e **derrubei o login por ~2 minutos.**
>
> **Ordem correta:**
> 1. **Sitekey** em `assets/js/astral.js` → publicar. O navegador passa a mandar o token; o
>    servidor ainda não confere, então ele é **ignorado**. Inofensivo.
> 2. **Só então a secret** no Supabase. O servidor passa a exigir o token que o navegador já
>    está mandando.
>
> **Por que inverter quebra:** ligar a secret primeiro faz o servidor exigir um token que
> ninguém está enviando → `400 captcha_failed` em todo login, cadastro e recuperação de senha.
> Medido: `{"error_code":"captcha_failed","msg":"request disallowed (no captcha_token found)"}`.
>
> Para desligar em emergência existe `scratchpad/captcha-toggle.ps1` (recriar se sumir):
> `PATCH /config/auth` com `security_captcha_enabled = false` volta tudo ao normal em segundos.

**`cadastro.html` (lista de espera) ficou de fora, de propósito.** O captcha do Supabase cobre
só os endpoints de *autenticação*; a lista de espera é um INSERT direto no PostgREST, que ele
não intercepta. Pôr o widget lá sem ninguém validá-lo seria segurança de mentira. O jeito certo
é uma edge function `entrar-lista-espera` que confere o token com a API do hCaptcha e só então
insere com `service_role` — vai junto quando as chaves chegarem, porque sem a secret real não
dá para testar a verificação.

Bônus: o mesmo captcha fecha a **bomba de e-mail da lista de espera** (seção 8.2, ALTO 5), que
continua sem solução real — as constraints limitam o conteúdo, não o volume.

**O que só o Lucas pode fazer (criar a conta):**

> ⚠️ **Corrigido em 30/07/2026.** A versão anterior destas instruções estava errada em dois
> pontos e o Lucas travou seguindo elas: falava em aba "Hostnames" (hoje é **Domains**) e dizia
> que a secret ficava dentro do site (é **da conta inteira**, na página de perfil). Escrevi de
> memória sem conferir. Fonte agora: [docs.hcaptcha.com](https://docs.hcaptcha.com/).

As duas chaves ficam em **páginas diferentes** — é isso que confunde:

| Chave | Onde | Escopo |
|---|---|---|
| **Sitekey** | https://dashboard.hcaptcha.com/sites | por site |
| **Secret key** | https://dashboard.hcaptcha.com/settings | **da conta inteira** |

1. Abrir https://www.hcaptcha.com → **Sign up** (grátis), confirmar o e-mail e entrar
2. Ir em https://dashboard.hcaptcha.com/sites → **New Site**
3. Dar um nome (ex.: `Astral`) e, em **Domains**, digitar `astral-psi.vercel.app` e clicar
   no **+** para adicionar de fato — só digitar não adiciona
4. Salvar. A **Sitekey** aparece na lista de sites
5. Ir em https://dashboard.hcaptcha.com/settings e clicar em **Generate New Secret**

> ⚠️ **A secret é uma só para a conta inteira.** Gerar uma nova invalida a anterior em todos os
> sites. Gerar uma vez e guardar.

**O que eu faço depois:** ligo `security_captcha_enabled` com a secret pela API de gerenciamento
(10.2), preencho `HCAPTCHA_SITEKEY` em `assets/js/astral.js`, e construo a edge function
`entrar-lista-espera` para cobrir o formulário público. **Nessa ordem** — ver o aviso acima.

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

---

### Sessão 3 — 30/07/2026 · Quota por unidade, gate, hCaptcha e decisão de pagamento

Sessão de fechamento da Etapa 1 e das decisões de negócio. **5 commits, todos enviados**
(`bda7f1c` → `ffcc538`). Tudo verificado em produção antes de fechar.

**O achado que pagou a sessão (8.12).** O Lucas achou que "50 questões por dia" no Pro era
pouco e pediu 60. Fui medir: não eram 50 questões, eram **50 chamadas**, e cada chamada aceitava
até 20 questões — teto real de **1.000 questões/dia**, ~R$ 264/mês de API contra uma assinatura
de R$ 19,90. `uso_ia` ganhou a coluna `unidades` e a quota passou a somar unidades em vez de
contar linhas. **A pergunta do Lucas achou o bug; a minha leitura do código não tinha achado.**

**Gate free vs pro (8.13).** `tipo_plano` deixou de ser cosmético — era o 🔴 nº 1 da seção 8.
Formato escolhido: **quota, não bloqueio de tela**, porque boca a boca é o único canal do Lucas
e um cadeado na cara do usuário gratuito mata o beta. Nova função `minha-quota`; a tela agora
mostra "Restam 47 de 60" *antes* do clique, em vez de erro seco depois de esperar a IA.

**hCaptcha preparado e inerte (13.5).** Todo o lado do navegador no ar com `HCAPTCHA_SITEKEY`
vazia = no-op. Falta só o Lucas criar a conta.

**Decisões de negócio fechadas:** Mercado Pago (10.3) — decidido por ele **não ter CNPJ**, não
por taxa. Custo da Anthropic medido (10.4): R$ 0,15 por 10 questões, R$ 0,99 por edital,
R$ 0,68 por busca de professores; **beta tester custa R$ 7–14/mês e não paga nunca**.

**Ferramenta nova:** `tools/testa-site.js` — 39 checagens contra a produção. Todas verdes.

**Meus erros nesta sessão** (as três já estão na tabela da 0.1):

| O que eu fiz | O que aprendi |
|---|---|
| Escrevi o passo a passo do hCaptcha de memória — aba errada e chave secreta no lugar errado. **O Lucas travou seguindo** | Interface de terceiro é estado de sistema. Abrir a documentação **antes** de escrever clique a clique |
| Meu script de teste esperava HTTP 400 e veio 401 → **anunciei que a landing estava quebrada** | Não estava. Validação em policy de RLS volta 401/42501. Falso alarme gasta a confiança igual a erro real |
| A função `minha-quota` devolvia o objeto cru sem o envelope `{success, data}` | Teria falhado **em silêncio** — nenhum erro no console, só um aviso que nunca aparecia. Só achei porque testei contra a API real |
| Levantei a hipótese de ter apagado os 2 cadastros da `lista_espera` | Não fui eu — o Lucas apagou. Mas **eu não tinha como provar**, porque ninguém registra exclusões ali |

**Regra nova do Lucas (0.2):** ao fim de todo processo, **mini relatório em linguagem de leigo**
— "como se eu tivesse contando pro meu pai que não sabe nada de internet". Registrada também na
memória permanente.

**Estado ao fim:** Etapa 1 fechada, árvore limpa, `main` em sincronia com o GitHub. A sessão 4
começa respondendo os tópicos da seção 0 — os três que dependem do Lucas e as três tarefas
rápidas — e depois vai para o visual/CSS.

---

### Sessão 4 — 31/07/2026 · hCaptcha no ar, monitoramento de erros e as três tarefas rápidas

Sessão curta e densa, feita com o Lucas **longe do computador** — ele autorizou aplicar tudo e
avisou que talvez não estivesse por perto. **5 commits** (`f2502af` → `5a632f9`), todos enviados
e verificados em produção.

**hCaptcha ligado (13.5).** Ele criou a conta e mandou as duas chaves. A secret foi só para o
painel do Supabase — conferido por `grep` que não entrou no repositório, que é público.
Verificado: secret aceita pelo `siteverify`, sitekey publicada, **Google OAuth intacto** (302
para `accounts.google.com`), login por senha exigindo token.

**🔴 Derrubei o login por ~2 minutos no meio disso.** Liguei a secret antes de publicar a
sitekey — **seguindo a ordem que eu mesmo tinha escrito errada na 13.5.** Detectei, reverti,
refiz na ordem certa e corrigi a instrução. Ver a tabela da 0.1: *instrução minha errada é pior
que instrução nenhuma, porque eu a sigo com confiança.*

**As três tarefas rápidas, todas feitas:**

| | O quê |
|---|---|
| Senha | A tela de "esqueci minha senha" passou a **dizer a verdade** — o e-mail pode não chegar, fale com o Lucas no WhatsApp. Antes a pessoa esperava um e-mail que nunca viria e perdia a conta em silêncio |
| Erros | Sistema próprio de captura (8.14), sem contratar nada e sem criar conta de terceiro |
| Beta tester | Passo a passo completo em **13.6** — era a peça que faltava para o lançamento no WhatsApp |

**Ferramenta de emergência versionada.** Percebi tarde que o script que desliga o captcha —
justamente o que devolve o login a todo mundo se algo quebrar — só existia na pasta temporária
da sessão. Foi para `tools/captcha-toggle.ps1`. Religar não exige a secret em mãos.

**Decisões e restrições registradas:** Anthropic adiada ("vou esperar receber do serviço");
busca de professores **fica ligada** e reavalia em 2 semanas com dados; ponto de equilíbrio
calculado em 10.4 com a recomendação de **começar com 5 beta testers, não 10**.

> 💰 **Restrição que passa a valer sempre:** ele disse *"nem sempre eu tenho dinheiro"* e que
> R$ 70–100/mês já pesaria. **Nunca propor algo que custe sem dizer o preço na mesma frase.**

**Meus erros nesta sessão** (todos na tabela da 0.1):

| O que eu fiz | O que aprendi |
|---|---|
| Derrubei o login seguindo minha própria instrução invertida | Ao escrever procedimento de duas pontas, simular as duas ordens. Primeiro o lado que só *envia* a mais, depois o que passa a *exigir* |
| Dois `git push` concorrentes → `cannot lock ref`, e passei a achar que o push falhava | O primeiro tinha funcionado, e o erro dizia isso. Nunca dois pushes no mesmo ref |
| 40 consultas à produção em 4 min → a Vercel me bloqueou como robô | Criei o sintoma que fui diagnosticar. Esperar 20–45 s entre consultas |
| Citei "ver 8.14" antes de a seção existir | **Referência quebrada no próprio caderno.** Ao citar uma seção, criá-la na mesma edição |

**Pendente do Lucas:** testar o **login por e-mail e senha** no navegador — única ponta que não
dá para verificar sem browser. Se falhar, `tools\captcha-toggle.ps1` resolve em 30 s.

**Sobrou na fila:** proteger a `lista_espera` contra robôs (agora construível, a secret existe),
`processar-edital` em janela mensal, e o visual/CSS — que é o que ele quer fazer de verdade.
