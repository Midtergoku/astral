# Log das sessoes

> A narrativa de cada sessao de trabalho, com o que se decidiu e por que.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> Consulte quando precisar reconstruir POR QUE uma decisao foi tomada.

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

---

### Sessão 5 — 31/07/2026 · Escopo enxugado, segurança endurecida e o design planejado

Sessão longa, feita quase toda com o Lucas **fora do computador** — ele autorizou aplicar tudo
e foi jantar no meio. **9 commits** (`8da42da` → `b9753b6`), todos enviados e verificados.

**O produto encolheu de propósito, e isso salvou a conta.** Ele decidiu desligar as **questões**
(*"pesam mais que a busca de professores"*) e transformar a busca de professores em **uma busca
só, permanente**. O argumento dele para a segunda não foi custo, foi produto: *"vai organizar
mais ainda o estudo dele, ele não vai ter que ficar procurando outros professores sempre"*.

O efeito colateral é o número mais importante da sessão: **o custo da Anthropic deixou de ser
mensal e virou ~R$ 5–8 uma vez por pessoa.** 10 beta testers eram R$ 50–140 *todo mês*; agora
são R$ 50–80 e acabou. O medo dele de *"R$ 70–100 por mês pesaria"* deixou de se aplicar.

**Duas regras novas dele, ambas permanentes:**

| Regra | Onde | Por que nasceu |
|---|---|---|
| **Gravar a cada prompt** (0.3) | acrescentando, nunca sobrescrevendo | Ele perguntou se eu gravava sozinho. **Eu não gravava** — só quando pedido. Tudo entre um pedido e outro se perdia |
| **Ele não executa nada** (0.35) | eu detecto e conserto | Eu tinha escrito "se der problema, abra o terminal". Resposta: *"não, eu não vou abrir nada... você dá um jeito de fazer"* |

Da segunda saiu `tools/checa-saude.js`, que agora roda como **primeira coisa de toda sessão**.
Com o limite dito na cara: **não é vigilância 24h**, só garante que nenhuma sessão comece em
cima de um site quebrado.

**Segurança.** Ele trouxe uma lista de 20 ataques + checklist (feita por outra IA) e mandou
aplicar tudo menos o pago e menos 2FA. Resultado em 8.18 e 8.19 — e a distinção que mais
importa: *"não fiz"* e *"não existe neste stack"* são respostas diferentes, e a lista assumia
Next.js/React/Stripe.

**Os dois achados que valeram a varredura:**
1. 🔴 **XSS real em `edital.html`** — nome do edital, data da prova e contagem de matérias
   interpolados sem escape, todos vindos da leitura do PDF pela IA. `esc()` **estava importado
   no arquivo** e não foi usado ali.
2. 🐛 **Bug de perda de dados** no `pagehide`: o comentário dizia proteger o último passo do
   usuário e o código **cancelava** o salvamento.

**Também nesta sessão:** captcha validado de ponta a ponta (ele testou: *"consegui logar"*),
lista de espera fechada com duas travas, log de auditoria com trigger, olhinho de ver senha,
documentos legais revisados (a **Anthropic não era mencionada** na Política, e o edital viaja
para os EUA), e o **roadmap do design em 8 blocos** (9.1).

**Meus erros nesta sessão** (todos na tabela da 0.1):

| O que eu fiz | O que aprendi |
|---|---|
| `drop policy` com o nome **de memória**; o `if exists` virou aviso silencioso e eu dei por feito | Consultar `pg_policies` antes. O `if exists` protege contra erro *e* esconde o engano |
| Teste de invasão deu "tudo bloqueado" e **nem estava autenticando** — chave errada, depois o próprio captcha barrando | Resultado negativo em teste de segurança **não vale sem prova de que o ataque foi tentado com credencial válida** |
| Deixei 3 pontos sem escape no Bloco B3 | Varri por **lista de nomes que eu lembrava**, não por origem do dado. Por isso `tools/varre-xss.js` existe agora |
| Criei um arquivo vazio chamado `por` com um script que quebrou no escape | Conferir `git status` antes de commitar, não só o que eu pretendia mudar |

**Estado ao fim:** árvore limpa, `main` em sincronia, 6 ferramentas de verificação no projeto,
todas verdes. **A sessão 6 abre no design, bloco V0** — sem nada bloqueando.

---

### Sessão 6 — 01/08/2026 · Skills, a tag definida, e o contexto em camadas

Sessão de preparação. **Nenhuma linha do site foi tocada** — foi toda sobre ferramentas,
definição de produto e organização. 5 commits (`0d2b690` → o do hook), todos enviados.

**As skills.** Ele mandou 7 nomes e disse que não achava nenhuma na internet. **As 7 existiam.**
Instaladas 36, mais 8 que eu recomendei e ele aprovou = **44**, em `~/.claude/skills` (escopo de
usuário, porque o repo é público). A que mais muda o trabalho é `webapp-testing`: **eu passo a
ver a tela**. Até aqui eu escrevia CSS e dependia de ele olhar e me contar.

**A tag foi definida — e eu errei três vezes definindo.** Ele explicou que a tag substitui o
badge de plano na topbar. Fui olhar o código e achei `HABILIDADES_MILITARES`, 51 nomes, em
`conquistas.html`. Concluí que estava tudo errado: página errada, tranca errada, invisível.

**As três correções dele, todas na tabela de erros:**

| Eu disse | Ele corrigiu |
|---|---|
| "recompensa que ninguém vê não é recompensa" | **"é proposital"** — é conquista secreta, descobrir é o pico de dopamina. A pesquisa que ele mandou fazer me contradiz: *surprise rewards* dão resposta mais forte que as esperadas |
| Pus `RECRUTA` como estado da tag | **"Tag é tag, nível é nível"** — Recruta é patente, sai do XP e muda com o edital |
| Propus quest que expira no domingo | **"a missão não some"** — quest é desbloqueio permanente |

> 🧠 **A lição da sessão:** eu medi o código certo e **interpretei a intenção errado**. Perguntei
> *"quem quebrou isso?"* onde cabia *"por que fizeram assim?"*. Regra que saiu daqui: antes de
> chamar algo de bug, escrever *"isto foi feito de propósito porque ___"* e ver se fecha.

**O contexto virou camadas.** O `CLAUDE.md` tinha 2.989 linhas carregadas em toda sessão,
incluindo 364 de passo manual e 228 de log. Ele mandou reorganizar com meta de 100 linhas — o
que batia de frente com as regras 0.1, 0.3 e 0.4 que ele mesmo deu. Levantei o conflito e ele
decidiu: **mover, não apagar.** Resultado medido: **47/47 seções e 1.860/1.860 linhas** presentes
nos 17 arquivos novos. Zero perdido, com o original inteiro guardado como rede de segurança.

**Bug pego por teste, não por leitura:** 5 dos 9 frontmatter tinham dois-pontos no meio do
`description`, que é YAML inválido. **Falharia em silêncio** — a regra nunca carregaria e ninguém
saberia. Todo valor agora entre aspas.

**As 4 regras de autonomia** que faltavam foram respondidas por ele e escritas (8 a 11 do
`CLAUDE.md`). A mais importante: eu vinha esticando uma autorização de 30/07 sobre **um bloco**
como se valesse para tudo, para sempre.

**O hook.** Ele perguntou se havia como eu *sempre* lembrar do histórico. Havia:
`.claude/hooks/lembrete.js` dispara em toda sessão e injeta o índice no contexto — **não depende
de disciplina minha**, que já falhou aqui.

**Estado ao fim:** site intacto e verificado (`checa-saude` verde), árvore limpa, `main` em
sincronia. **A sessão 7 abre no V0 do design** — a direção visual fechada, decidida por mim, que
foi o que ele delegou.

---

### Sessão 7 — 02 e 03/08/2026 · O roadmap por peça, a varredura, e o bug de três dias

Sessão longa e com uma lição cara no fim. **Nenhuma edge function foi tocada; nenhuma
migration nova além da `tag_escolhida`.**

**O roadmap por peça.** O Lucas escolheu 12 componentes no 21st.dev e mandou os links.
⚠️ **Nenhum deles entregou código** — o site mostra o exemplo de uso e guarda o fonte, e o que
há lá é React + Tailwind + Framer Motion, que não roda aqui. O que veio foi a **técnica** de
cada um, reconstruída em CSS puro. Isso está registrado em cada bloco do `base.css` para
ninguém achar depois que foi cópia.

Entregues: botão que revela a seta e tem estado de carregando · cartão com gráfico da semana ·
efeito bento · barra lateral recolhível (240 → 68px, com a preferência lembrada) · anel de
porcentagem · folha que sobe do rodapé · esqueleto · texto cintilante · **conquista
desbloqueada** · caminho de volta.

**A divisa saiu do cartão e foi para a barra do topo**, por ideia dele — e essa mudança
resolveu um problema estrutural: no cartão, nome e divisa disputavam 161px, e a divisa sozinha
pede até 180. Era uma disputa que o nome ia perder em alguma página, com algum nome.

**A varredura que ele pediu.** *"Veja o que está quebrado e o que está passivo de se
autodestruir."* Resultado medido:

| | |
|---|---|
| Quebrado | **nada** — as checagens passaram nas 19 páginas |
| Frágil | **9.387 linhas duplicadas** dentro das páginas contra 3.665 compartilhadas |
| `.main` · `.topbar` · `.card` · `.sidebar` | declarados em 9 · 9 · 8 · 8 páginas |

Nasceu daí o **`tools/verifica.js`**: 11 checagens, cada uma vinda de um erro real desta
semana. Sai com código 1 e trava o commit. **Já pegou dois carimbos de versão defasados antes
de eu publicar** — que é exatamente para o que foi feito.

E 29 cópias de CSS foram unificadas, **só as idênticas**. As 81 que divergem de verdade
continuam onde estão: unificar divergência é decisão de design, não arrumação.

### 🔴 O erro mais caro do projeto: três dias

O nome dele aparecia **"Luca"**. Passei três dias caçando em CSS — largura, especificidade,
ordem dos arquivos, cadeia de ancestrais, contenção, reticências. Reescrevi a regra em três
arquivos, movi a divisa de lugar, apertei fonte e espaçamento.

**Nada disso estava errado.** A causa era `split(/s+/)` em vez de `split(/\s+/)` — a letra
"s" no lugar de espaço. `"Lucas"` virava `"Luca"`, `"Alessandra"` virava `"Ale"`,
`"Wellington"` passava ileso porque não tem "s".

> **Sintoma visual não implica causa visual.** Texto cortado na tela não significa que o corte
> aconteceu na tela. Um `console.log` do valor teria fechado o caso em 30 segundos, no
> primeiro dia.

E o corolário, que dói mais: **todas as minhas medições diziam "ok"** enquanto ele via
quebrado. Eu media a caixa (cabia), a regra vencedora (correta), os ancestrais (não
recortavam). **Medição que nunca reproduziu o defeito não é prova de conserto** — é
confirmação do que eu já queria acreditar.

A barra invertida se perdeu ao escrever código por `node -e` dentro de string de shell.
**Aconteceu três vezes no mesmo dia** (`\s`→`s`, `\d`→`d`, `"$1$2"` literal). Virou regra
no `CLAUDE.md`, checagem 11 no verificador, e linha no lembrete de início de sessão.

**Estado ao fim:** árvore limpa, `main` em sincronia, 12 checagens de saúde verdes, 11
checagens do verificador limpas. **A sessão 8 abre no catálogo** — as 18 missões, 22 tags e 12
conquistas secretas que ele aprovou e que ainda não foram para o código.

---

## Sessão 8 — 08/09/2026 · O dia em que eu auditei o projeto errado

**Como começou:** o Lucas colou um "prompt supremo" de 106 partes — um sistema operacional de
produto, negócio e finanças — e mandou fazer uma auditoria completa antes de tocar em nada.

**O que deu errado, e é o maior desperdício até hoje:** a sessão abriu em `Documents\ASTRAL`,
que era uma **cópia parada em julho**. O projeto real estava em `Desktop\ASTRAL`. Auditei a
cópia por horas e produzi uma auditoria completa, 14 documentos e um roadmap de 70 etapas —
tudo descrevendo código que não está em produção. Afirmei que não existia cronograma, nem
termos de uso, nem git, nem rate limit, e que o banco tinha 7 tabelas órfãs. **Existem
`cronograma.html`, `termos.html`, 145 commits, a função `minha-quota`, e o código real usa as
tabelas.**

Os três sinais estavam visíveis desde o primeiro minuto e passei por todos: **sem `.git`, sem
remote, sem `CLAUDE.md`**. O que fechou a questão em 30 segundos, quando finalmente fiz, foi
`curl` na produção + `cmp` com o arquivo local: `index.html` local **byte a byte igual** ao que
está no ar — no Desktop, não em Documents. Detalhe completo em `erros.md`.

**A correção:** as duas pastas foram unificadas. O projeto real está em `Documents\ASTRAL`; a
cópia de julho ficou preservada em `Documents\ASTRAL-copia-antiga-2026-07`. Nada foi apagado, o
Desktop ficou sem pasta ASTRAL. No caminho, um `mv` falhou e meu script imprimiu "ok" mesmo
assim — o `mv` seguinte aninhou o projeto real dentro da cópia velha. Recuperado sem perda.

### O conflito de autonomia, resolvido por ele

O prompt supremo mandava **perguntar antes de tudo**; a regra 8 do `CLAUDE.md` manda **aplicar
direto**. Segui os dois no mesmo dia. Ordem dele: resolver. O critério que ficou não é o tamanho
da tarefa, é **se dá para desfazer** — *"se isto der errado, eu desfaço sozinho em 5 minutos?"*
Está na seção 8.1 do `CLAUDE.md`, com as duas listas explícitas.

### O que do prompt supremo este projeto NÃO tem — medido por grep

`hipotese`, `experimento`, `funil`, `churn`, `LTV`, `MRR`, `ARPU`, `retencao`: **0 ocorrências**
em `historico/` e no `CLAUDE.md`. **Decisão dele: guardar para depois da Fase 1.** Modelar funil
e LTV de um produto com 0 chamadas de IA é exatamente o palpite que o roadmap já alerta. O
resto do prompt supremo já existe aqui, e em versão medida.

### Medições do dia

| | 04/08 | **08/09** |
|---|---|---|
| Usuários | 8 | **8** |
| Chamadas de IA em toda a história | 0 | **🔴 0** |
| Leads na lista de espera | 0 | **0** |
| Erros de usuário | — | 96, **todos de 1 a 4 de agosto** |

**Cinco semanas e nada se moveu.** Os 96 erros são os dois bugs já corrigidos em 04/08
(`uid is not defined` 88x, `loginGoogle` 4x). Zero erros novos — coerente com ninguém ter usado.
Backup rodado: 122 linhas, fora do repositório.

### 🎨 Estado real do design — o `CLAUDE.md` estava desatualizado

Ele dizia "bloco V0". **V0, V1 e V3 estão essencialmente feitos**, medido no código:

| Bloco | Estado |
|---|---|
| **V0** direção | ✅ direção militar/insígnia implementada |
| **V1** fundação | ✅ paleta e tipografia trocadas · tokens de movimento em uso (41x só o `--saida`) |
| **V3** ícones | ✅ **0 emojis** nas páginas (eram 118 em 31/07) |

Paleta atual em `assets/css/base.css`: `--breu #0E1620` · `--casco #17222E` · `--oliva #5C6B47`
· `--latao #C08A2E` · `--brasa #B4432E` · `--papel #E7E4DB`. Os nomes antigos (`--purple`,
`--bg`, `--text`) continuam como **apelidos deliberados** para os novos, com comentário —
`--purple: var(--latao)`. Não é sobra, é ponte.
Tipografia real: **Archivo + Source Serif 4 + JetBrains Mono**, via Google Fonts.

**O que falta para fechar o V1 — três correções pequenas, ainda NÃO aplicadas:**

1. **3 declarações de fonte mortas em `assets/css/app.css`** (linhas 18, 41, 72): pedem
   `'Inter'` e `'Space Grotesk'`, **nenhuma das duas é carregada**. `body`, `.sidebar-logo` e o
   avatar caem em fonte genérica do sistema em vez de Archivo, nas 11 páginas que carregam o
   arquivo. Trocar por `var(--display)` / `var(--corpo)`.
2. **`estilo.html` já diverge do CSS real** — faltam `--latao-e` e `--oliva-c`.
3. **6 raios de borda distintos** (`2 3 6 10 12 999px`); a skill pede 2 ou 3.

Depois disso o próximo bloco de verdade é o **V2 — casca compartilhada**.

⚠️ **Falso alarme meu no caminho, registrado para não repetir:** contei "9 referências a Inter"
com `grep`. Sete eram `setInterval`/`clearInterval`. **Contagem por substring não é medição** —
conferir a linha inteira antes de reportar número.

### Contexto que orienta a próxima sessão

**Ele está sem dinheiro**, então a Fase 1 (US$ 5 de crédito na Anthropic) está travada e o
trabalho migrou para o design — que custa R$ 0 e é onde a Etapa 3 já estava. As **questões
continuam desligadas de propósito** (`FUNCOES_DESLIGADAS` em `_shared/comum.ts:146`, desde
31/07): não tocar.

**Estado ao fim:** árvore limpa, `main` em sincronia, `checa-saude` verde, `verifica.js` limpo.
**A sessão 9 abre nas três correções do V1 acima**, que ele já viu e sobre as quais eu esperava
o "pode".
