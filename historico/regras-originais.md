# As regras permanentes, em texto integral

> O CLAUDE.md guarda a versao curta de cada regra. Aqui esta o texto completo, com o porque.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> Se a versao curta gerar duvida, a resposta esta aqui.

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

---

## 0.36. Convenções de código — confirmadas pelo Lucas em 31/07/2026

> Eu tinha adotado as duas por conta própria e nunca perguntei. Ao organizar o contexto, ele
> confirmou que quer as duas escritas como regra.

### 1. Comentário em código **sem acento**; em documento **com acento**

| Onde | Como |
|---|---|
| `.ts`, `.js`, `.sql`, `.ps1` | português **sem acento** |
| `.md`, `.html` (texto que o usuário lê) | português **com acento**, normal |

**Por quê:** a armadilha do PowerShell (0.1) — o PS 5.1 lê UTF-8 como ANSI e destrói acento.
Já aconteceu uma vez e corrompeu dois HTMLs inteiros. Comentário sem acento sobrevive a
qualquer ferramenta que eu use por engano. O texto que o **usuário** lê nunca abre mão do
acento — ali o cuidado é usar só `Edit` ou Node.

### 2. Toda afirmação passa por teste contra a **API real**

Não confiar em leitura de código. Se eu vou dizer que algo funciona, funciona *daquele jeito*,
ou está protegido — **rodar contra o sistema de verdade primeiro**.

**Por quê:** foi o que pegou quase todos os bugs desta sessão. Exemplos concretos:

- `minha-quota` devolvia o objeto sem envelope → o aviso na tela **nunca apareceria**, sem erro
  no console. Só apareceu porque testei contra a API.
- O teste de invasão deu "tudo bloqueado" e **nem estava autenticando**.
- O `drop policy` com nome errado virou aviso silencioso, e eu dei o trabalho por feito.

É a mesma regra da 0.1, aplicada a código em vez de a número. As ferramentas em `tools/`
existem para isso — usar, não recriar.

---

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
