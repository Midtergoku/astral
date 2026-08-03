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

## Os 5 erros que mais custaram (a tabela inteira: `historico/erros.md`)

| O que eu fiz | O que aprendi |
|---|---|
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
git push origin main            publica o site (Vercel republica em ~1 min). NUNCA dois em paralelo
supabase functions deploy       edge functions NAO passam pelo git, entram no ar na hora
```

## Onde estamos

**Etapa 1 (blindagem) fechada.** Etapa 2 (pagamento) parada no Mercado Pago. **Estamos na Etapa 3
— design e gamificação**, no bloco V0. Ordem dele: *"quero repaginar tudo (...) menos cara de
feita de IA possível"*, e a escolha da direção visual é minha. **Não começar mexendo em CSS**: o
problema medido não é feiura, é genérico, e genérico vem da fundação.

**Em aberto:** créditos na Anthropic (ele adia até receber do serviço; hoje é **gasto único de
~R$ 5–8 por pessoa**, não mensal) · `processar-edital` em janela mensal · backup nunca restaurado ·
**validação de assinatura do webhook do Mercado Pago, que é bloqueador de lançamento**.

> 💰 **Dinheiro é restrição real.** *"Nem sempre eu tenho dinheiro."* **Nunca propor algo que
> custe sem dizer o preço na mesma frase.**

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
| `ordem-de-trabalho.md` | as 3 etapas em detalhe e a estratégia de lançamento | ao planejar o próximo bloco |
| `regras-originais.md` | as 7 regras acima em texto integral, com o porquê | se a versão curta gerar dúvida |
