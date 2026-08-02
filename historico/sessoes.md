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
