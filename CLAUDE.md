# ASTRAL — Contexto do Projeto

> Reorganizado em camadas em 01/08/2026. **Nada foi apagado**: o arquivo antigo de 2.989 linhas
> está inteiro em `historico/CLAUDE-original-2989.md`. Este aqui carrega em toda sessão; o resto
> carrega quando é relevante. **O índice no fim é obrigatório — sem ele o histórico morre.**

## O produto

**Astral** — "Transforme seu edital em um plano de aprovação em poucos minutos". PDF do edital →
IA extrai matérias e pesos → cronograma com gamificação militar (patentes, XP, tags).
Nicho: concurseiro de carreira militar. Preço anunciado: **R$ 19,90/mês**. Fase: **beta fechado**
(lista de espera + promoção manual). Produção: https://astral-psi.vercel.app

## Stack — o que não dá para descobrir olhando a pasta

- **Não há build. Não há npm, `package.json`, React, Next.js ou bundler.** 16 HTMLs com CSS e JS
  inline. É por isso que a CSP precisa de `'unsafe-inline'`, e por isso exemplo em React não cola
  aqui sem tradução.
- Compartilhado: `assets/css/app.css` · `assets/js/astral.js` (escape, sessão, captcha, toast) ·
  `estado.js` · `transicao.js`. **`supabase/functions/_shared/comum.ts` afeta as 8 funções.**
- Supabase (`jjogmcacbdefwiwcyjxp`, sa-east-1) · Vercel (deploy automático do `main`) ·
  Anthropic (`claude-sonnet-4-6`) · Resend · **Mercado Pago** (não Stripe — ele não tem CNPJ).
- Local: Node 24, Supabase CLI 2.106, **PortableGit** (o instalador oficial exige UAC).

## Como eu trabalho aqui — regras permanentes do Lucas

1. **MEDIR ANTES DE AFIRMAR.** Toda vez que afirmei sem rodar o comando, errei — sem exceção.
   Antes de dizer número, estado de sistema ou causa de falha: **rodar**. Não deu para medir?
   Dizer que é estimativa. Diagnóstico começa em `get_logs`/`execute_sql`, nunca em hipótese.
2. **RELATÓRIO EM LINGUAGEM DE LEIGO** ao fim de todo bloco — *"como se eu tivesse contando pro
   meu pai que não sabe nada de internet"*. O que estava errado · o que fiz · **o que muda para
   quem usa** · o que testei e o resultado · o que faltou. Tabelas e analogias funcionam com ele.
3. **GRAVAR A CADA PROMPT**, sem esperar ele pedir. **Acrescentar, nunca sobrescrever** — fato
   novo que contradiz um antigo entra com data, e os dois ficam. *"Quanto mais informação melhor."*
4. **ELE NÃO EXECUTA NADA.** Nem terminal, nem painel. Se quebrar, eu detecto e conserto.
   **`node tools/checa-saude.js` é a primeira coisa de toda sessão.** Nunca entregar conserto
   como instrução para ele rodar. *"Se não já houver maneira de fazer, você dá um jeito."*
5. **CONVENÇÕES.** Comentário em código (`.ts .js .sql .ps1`) **sem acento** — o PowerShell 5.1
   lê UTF-8 como ANSI e já destruiu dois HTMLs. Texto que o usuário lê (`.md .html`) **com acento**,
   e editado só por `Edit` ou Node. Toda afirmação passa por teste contra a **API real**.
   🔴 **Expressão regular e `$1` de replace NUNCA se escrevem por `node -e` no shell** — o bash
   come a barra invertida e o resultado é código válido que faz outra coisa. Custou 3 dias uma vez.
   Vai para arquivo com o `Write`, e roda de lá.
   🔴 **Mensagem de commit vai por `git commit -F arquivo`, nunca por `-m "..."`.** Crase dentro
   de aspas duplas o bash **executa**. Em 03/08/2026 uma crase em volta de um comando o rodou de
   verdade e reescreveu a configuração de autenticação da PRODUÇÃO com valores de `localhost`.
6. **LIMPEZA.** Só sai o que não vai servir para nada. Na dúvida, **fica**. Nunca sai: a tabela de
   erros, o *porquê* de uma decisão, número medido com seu comando, armadilha de ambiente.
7. **ERROU? Acrescente a linha em `historico/erros.md` na hora.** Ordem direta dele. Ele trata
   erro como normal — o que não é normal é repetir.

## Autonomia — respondido por ele em 01/08/2026

8. **PUBLICAR: aplicar direto.** *"Quando eu pedir pra você me avisar, você me avisa. Se eu não
   pedir pra avisar antes de aplicar, você pode aplicar."* Pedido de aviso vale **só para o
   pedido em que ele fez** — não vira permanente, e não se estende ao próximo bloco.
9. **QUEBROU E ELE NÃO ESTÁ ONLINE: reverter sozinho, na hora.** *"Você pode reverter sozinho
   sim, sem problema algum."* Não esperar resposta com o site fora do ar.
10. **PODE MEXER EM QUALQUER PASTA** — *"desde que não faça nada de errado, o que vai me
    prejudicar ou prejudicar o site"*. Não há pasta proibida; há **resultado** proibido. O teste
    antes de agir é *"isto pode prejudicar o Lucas ou o site?"*, não *"posso tocar aqui?"*.
11. **URGENTE INTERROMPE.** *"Se é uma coisa urgente, você pode escrever durante o relatório
    urgente e escrever o que aconteceu, no meio de uma tarefa, já que é urgente pro seu saber
    rápido."* Achou buraco de segurança grave, perda de dado ou custo disparando **no meio de
    outra tarefa**: escrever **🚨 URGENTE** na hora, não guardar para o relatório final.

### 8.1. Onde a regra 8 termina — conflito resolvido por ele em 08/09/2026

Em 08/09 ele escreveu um "prompt supremo" que mandava **perguntar antes de tudo**
(*"você NÃO pode assumir decisões"*), o que contradiz a regra 8 (*"pode aplicar"*).
Eu segui os dois no mesmo dia e pedi autorização várias vezes onde a regra 8 diz para não pedir.
**Ordem dele: resolver.** O critério não é o tamanho da tarefa — é **se dá para desfazer**.

| ✅ **APLICO DIRETO** — reversível, e o `verifica.js` cobre | 🛑 **PERGUNTO ANTES** — irreversível, custa, ou é decisão de dono |
|---|---|
| Corrigir bug, ajustar texto, refatorar | **Qualquer coisa que gaste dinheiro** (regra do 💰: preço na mesma frase) |
| Publicar correção aprovada pelo `verifica.js` | Preço, plano, modelo de cobrança |
| **Reverter o que quebrou** (regra 9) | Migration destrutiva, mexer em grant/RLS/policy |
| Registrar em `historico/`, changelog, erros | **Apagar ou mover** arquivo, pasta ou linha do banco |
| Rodar teste, medição, backup, varredura | Mudar **o que a landing promete** |
| Criar/ajustar ferramenta em `tools/` | Remover funcionalidade que alguém já usa |
| Escrever documentação | Funcionalidade nova grande (mais de uma sessão) |
| | Dado de usuário: exportar, excluir, mandar para fora |

**A dúvida se resolve por uma pergunta:** *"se isto der errado, eu desfaço sozinho em 5 minutos?"*
Sim → aplico. Não → pergunto. **Na dúvida, pergunto** — mas dúvida não é desculpa para
transformar tarefa reversível em pedido de autorização; isso é o que ele reclamou.

**O que NÃO muda:** 🚨 urgente continua interrompendo (regra 11), e o relatório em linguagem
de leigo (regra 2) continua obrigatório ao fim de todo bloco, inclusive do que apliquei direto.

> ⚠️ **Do "prompt supremo" de 08/09, quatro sistemas que este projeto NÃO tem — medido:
> `hipotese`, `experimento`, `funil`, `churn`, `LTV`, `MRR`, `ARPU`, `retencao` = 0 ocorrências
> em `historico/` e neste arquivo.** Decisão dele: **guardar para depois da Fase 1**. Modelar
> funil e LTV de um produto com 0 chamadas de IA é o palpite que o roadmap já alerta.
> O resto do prompt supremo já existe aqui, e em versão medida — ver a tabela do relatório
> de 08/09 em `historico/sessoes.md`.

## Os 5 erros que mais custaram (a tabela inteira: `historico/erros.md`)

| O que eu fiz | O que aprendi |
|---|---|
| 🔴 **3 DIAS caçando em CSS um defeito que estava no dado.** "Lucas" aparecia "Luca"; a causa era `split(/s+/)` em vez de `/\s+/` | **Sintoma visual não implica causa visual.** Depois do primeiro conserto que não resolve, olhar o VALOR que chega, não a apresentação. E: **teste que nunca reproduziu o defeito não prova conserto nenhum** |
| 🔴 **Derrubei o login em produção seguindo uma instrução que eu mesmo tinha escrito errada** | **Instrução minha errada é pior que instrução nenhuma — eu a sigo com confiança.** Em procedimento de duas pontas, simular as duas ordens antes de escrever |
| 🔴 Achei conquistas trancadas e **diagnostiquei design deliberado como bug** | Antes de chamar algo de bug, escrever *"isto foi feito de propósito porque ___"* e ver se fecha. Perguntar *por que fizeram assim*, não *quem quebrou* |
| Afirmei CSS duplicado, divergência de tabelas, causa de falha — tudo sem medir | **Errei nas 9 vezes.** O número sempre contrariou a estimativa |
| Reescrevi 2 HTMLs com `Set-Content` e **destruí todos os acentos** | A regra já estava escrita e eu não a li. Ter regra no arquivo não basta se eu não consulto |
| Teste de invasão deu "tudo bloqueado" e **nem estava autenticando** | Resultado negativo em teste de segurança não vale sem **prova de que o ataque foi tentado com credencial válida** |

## Segurança — as 4 regras invioláveis (procedimento: skill `astral-seguranca`)

1. **O repositório é público.** Nenhum segredo em arquivo, nunca. Chave sensível só em Supabase
   Secrets. Conferir com `grep` antes de commitar quando tiver mexido em chave.
2. **RLS em toda tabela nova**, com policy explícita. `anon` não ganha grant por padrão.
3. **Validação no front E no back.** O front é conveniência; a defesa é o servidor.
4. **Todo dado não confiável passa por `esc()` / `att()` / `urlSegura()`** antes de virar HTML —
   resposta da IA, texto digitado e nome de matéria vinda do edital são não confiáveis.

## Comandos

```
node tools/checa-saude.js       PRIMEIRA COISA DA SESSAO -- o usuario consegue usar o Astral?
node tools/testa-site.js        39 checagens amplas contra producao
node tools/varre-xss.js         dado nao confiavel sem escape
node tools/testa-isolamento.js  um usuario alcanca o dado de outro?
node tools/testa-auditoria.js   o log de eventos criticos funciona?
node tools/valida-css.js        CSS resolvido igual ao ref (muda de papel no V1 -- ver skill design)
node tools/verifica.js          🔴 OBRIGATORIO ANTES DE TODO COMMIT. 10 checagens, cada uma nascida
                                de um erro real: residuo de replace, tags desbalanceadas, id
                                duplicado, chave de CSS aberta, sintaxe de JS, carimbo defasado,
                                acento corrompido, link morto, elemento fantasma, import quebrado
node tools/versiona-css.js      OBRIGATORIO ao mexer em assets/, ANTES do commit. Sem isto o conserto
                                so chega ao usuario 1 HORA depois -- ja aconteceu (historico/erros.md)
node tools/backup.js            🔴 O PLANO FREE DO SUPABASE NAO FAZ BACKUP NENHUM.
                                Este faz: um JSON por tabela + as contas, FORA do repositorio
node tools/testa-restauracao.js O backup volta mesmo? Restaura num esquema descartavel do
                                proprio banco e compara linha a linha. Achou o
                                "overriding system value" na 1a execucao
node tools/testa-concorrencia.js Duas telas abertas apagam o trabalho uma da outra?
                                --upsert mostra o defeito antigo acontecendo
node tools/testa-rolagem.js     A barra de rolagem pisca ao trocar de pagina?
powershell -File tools\confere-auth.ps1
                                a config de AUTENTICACAO da producao esta certa? -Corrigir conserta.
                                🔴 checa-saude NAO pega isto: ele testa a IDA ao Google, nao a VOLTA
powershell -File tools\smtp-configura.ps1
                                entrega de e-mail (por que ninguem recebe). So leitura por padrao
git push origin main            publica o site (Vercel republica em ~1 min). NUNCA dois em paralelo
supabase functions deploy       edge functions NAO passam pelo git, entram no ar na hora
```

## Onde estamos

**Etapa 1 (blindagem) fechada.** Etapa 2 (pagamento) parada no Mercado Pago. **Estamos na Etapa 3
— design e gamificação.** Ordem dele: *"quero repaginar tudo (...) menos cara de feita de IA
possível"*, e a escolha da direção visual é minha. **Não começar mexendo em CSS**: o problema
medido não é feiura, é genérico, e genérico vem da fundação.

> 🎨 **Onde o design realmente está — medido em 08/09/2026.** Esta linha dizia "bloco V0" e
> estava defasada: **V0, V1 e V3 estão essencialmente feitos.** A direção militar/insígnia foi
> implementada (`--breu` `--casco` `--oliva` `--latao` `--brasa` `--papel` em `base.css`), a
> tipografia é **Archivo + Source Serif 4 + JetBrains Mono**, os tokens de movimento estão em
> uso, e há **0 emojis** nas páginas (eram 118). Os nomes antigos (`--purple`, `--bg`) são
> **apelidos deliberados** para a paleta nova — não são sobra.
>
> **Faltam 3 correções para fechar o V1**, ainda não aplicadas: 3 declarações de fonte mortas em
> `assets/css/app.css` (linhas 18, 41, 72 — pedem Inter/Space Grotesk, que não são mais
> carregadas), `estilo.html` sem `--latao-e` e `--oliva-c`, e 6 raios de borda onde a skill pede
> 2 ou 3. Depois disso, **V2 — casca compartilhada**. Detalhe em `historico/sessoes.md` § 8.

> 🔴 **Ele está sem dinheiro no momento (08/09/2026)** — a Fase 1 (US$ 5 de crédito na
> Anthropic) está travada, e por isso o trabalho migrou para o design, que custa R$ 0.
> **As questões seguem desligadas de propósito** (`FUNCOES_DESLIGADAS` em
> `_shared/comum.ts:146`, desde 31/07): não tocar.

**Em aberto:** créditos na Anthropic (ele adia até receber do serviço; hoje é **gasto único de
~R$ 5–8 por pessoa**, não mensal) · `processar-edital` em janela mensal · backup nunca restaurado ·
**validação de assinatura do webhook do Mercado Pago, que é bloqueador de lançamento**.

> 🔴 **O número que reordena tudo, medido em 04/08/2026:** 8 usuários cadastrados e
> **ZERO chamadas de IA em toda a história** — ninguém nunca subiu um edital. A promessa central
> do produto **nunca aconteceu uma vez**. Por isso a Fase 1 do roadmap não é design nem
> pagamento: é fazer isso acontecer **uma vez**, e custa **US$ 5** de créditos.
> Detalhe em `historico/roadmap-ate-a-primeira-assinatura.md`.

> 🔴 **Domínio: decisão dele em 03/08/2026** — é **um dos últimos blocos**, e ele quer fazer
> **junto comigo**. O **Resend exige domínio verificado** (confirmado na doc deles), então o
> e-mail definitivo depende disso. Mas o domínio **não bloqueia o e-mail agora**: a ponte é
> Gmail com senha de app, grátis. Ver skill `astral-operacao` 13.6.

> 💰 **Dinheiro é restrição real.** *"Nem sempre eu tenho dinheiro."* **Nunca propor algo que
> custe sem dizer o preço na mesma frase.**
>
> 🔴 **E MEDIR o custo, não estimar.** Em 04/08/2026 um laço meu que repetia chamada paga
> zerou os créditos e deixou a conta da Anthropic em **−US$ 0,96** — eu só tinha estimativa
> de planilha, nenhuma medição. As funções de IA agora gravam o consumo real no log.
> **Antes de escrever qualquer repetição de chamada paga, calcular o custo da repetição.**

> 🏗️ **Infraestrutura, levantada camada a camada em 05/08/2026** (a pedido dele, contra um
> post sobre "a pilha real de um produto"). Das ~20 camadas, **temos 19**. As que faltam são
> decisões de custo, não esquecimento:
>
> | Falta | Por quê |
> |---|---|
> | Réplica do banco | recurso de plano pago; só importa quando ficar fora do ar custar dinheiro |
> | Senha vazada (HIBP) | **HTTP 402 — só no Pro, US$ 25/mês** |
> | Verificação em duas etapas | vale quando houver conta paga a proteger |
>
> **Fechadas em 05/08:** testes automáticos a cada push (`.github/workflows/verifica.yml`),
> alerta de hora em hora (`vigia.yml`), **backup — que NÃO EXISTIA** (o plano free do Supabase
> não faz nenhum) e agora está provado restaurável, e **controle de concorrência** (duas telas
> abertas apagavam o trabalho uma da outra).

## 🗺️ Mapa das camadas — onde está o resto

**`.claude/rules/`** — carregam sozinhas ao mexer na pasta correspondente:

| Arquivo | O que tem | Carrega em |
|---|---|---|
| `banco.md` | schema, RLS, grants, as 15 migrations e o porquê de cada trava | `supabase/migrations/**` |
| `backend.md` | edge functions, quota por unidade, gate free/pro, interruptor de função desligada | `supabase/functions/**` |
| `paginas.md` | escape obrigatório, design system atual, persistência, casca compartilhada | `*.html`, `assets/**` |

**`.claude/skills/astral-*`** — eu carrego quando a tarefa pede (as 44 de terceiros ficam em `~/.claude/skills/`):

| Skill | Use quando |
|---|---|
| `astral-design` | repaginar visual, escolher paleta/tipografia/ícones, qualquer bloco V0–V8 |
| `astral-gamificacao` | tag, nível, patente, quest, conquista secreta, XP, badge — **ler antes de tratar qualquer coisa disso como bug** |
| `astral-seguranca` | varredura, auditar RLS, revisar renderização, avaliar se um ataque se aplica |
| `astral-operacao` | publicar, captcha, webhook, SMTP, domínio — **a ordem de ligar o captcha já derrubou o login** |
| `astral-beta-tester` | promover alguém a beta — **contém a regra anti-engenharia social** |
| `astral-supabase-admin` | alterar config do projeto que só existiria no painel |

**`historico/`** — não carrega sozinho; **consultar antes de refazer trabalho**:

| Arquivo | O que tem | Consultar quando |
|---|---|---|
| `CLAUDE-original-2989.md` | o caderno inteiro antes desta reorganização | algo parecer que sumiu |
| `erros.md` | os 14 erros meus, completos | antes de afirmar qualquer coisa |
| `auditorias.md` | as auditorias de 29/07 — código, segurança e banco | antes de auditar de novo |
| `blocos-executados.md` | os 20 blocos 8.5–8.19, com o que foi medido | **antes de "consertar" algo estranho: pode ser decisão** |
| `sessoes.md` | as 5 sessões narradas | para reconstruir *por que* algo foi decidido |
| `decisoes.md` | Mercado Pago, custo da Anthropic, contas, skills instaladas | antes de reabrir decisão fechada |
| **`roadmap-ate-a-primeira-assinatura.md`** | **as 7 fases daqui até a 1ª assinatura paga, medidas em 04/08** | **ao planejar qualquer coisa — é o mapa atual** |
| `ordem-de-trabalho.md` | as 3 etapas em detalhe e a estratégia de lançamento | histórico de como se chegou ao roadmap |
| `regras-originais.md` | as 7 regras acima em texto integral, com o porquê | se a versão curta gerar dúvida |
