# Erros que eu ja cometi neste projeto

> A tabela completa. Os 5 mais caros ficaram inline no CLAUDE.md; estes sao todos.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> Ordem do Lucas em 30/07/2026: nunca apagar. Errou de novo? Acrescente aqui na hora.

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
| 🔴 Achei as habilidades trancadas atrás de 70% e **diagnostiquei o design deliberado como bug**. Escrevi no `CLAUDE.md`: *"recompensa que ninguém vê não é recompensa, é segredo"* — e a resposta dele foi **"é proposital"**, é conquista secreta, e descobrir é o pico de dopamina | **Inverti o produto inteiro.** A pesquisa que ele mandou fazer me contradiz na cara: *"surprise rewards often create stronger dopamine responses than expected ones"*. Não bastava eu ter medido o código — eu medi certo e **interpretei a intenção errado**. A seção 11 diz *"vale perguntar antes de preservar"*; eu não perguntei, concluí. **Código que parece errado pode estar certo: a pergunta é "por que fizeram assim?", não "quem quebrou isso?"** |
| Chamei as habilidades de **tag** e pus `RECRUTA` como estado da tag | *"Tag é tag, nível é nível"* — ordem direta dele. Recruta é **patente**, que sai do XP e muda conforme o edital. Tag é **especialidade**. Juntei dois sistemas que ele tinha separado de propósito, e quase construí em cima da confusão |
| Propus quest semanal que **expira no domingo** | *"a missão não some"*. Quest é desbloqueio **permanente**: cumpriu, ganhou, é seu. O que expira é liga/desafio semanal, que é outra coisa e ele não pediu |
| Deixei 3 interpolações sem escape em `edital.html` durante o Bloco B3 | Varri por **lista de nomes conhecidos** (`q.enunciado`, `m.nome`) e não por *origem do dado*. `estado.edital.*` não estava na minha lista mental. Por isso `tools/varre-xss.js` existe agora — a varredura não pode depender do que eu lembro. |
| Escrevi o frontmatter das 9 regras/skills com `description` contendo **dois-pontos no meio** (`Edge functions do Astral: autenticacao...`) | YAML puro **não aceita `: ` dentro de valor sem aspas** — 5 dos 9 arquivos não seriam lidos, e **em silêncio**: a regra simplesmente nunca carregaria e eu nunca saberia por quê. Peguei porque testei o parse em vez de olhar e achar bonito (0.36 #2). **Todo valor de frontmatter agora vai entre aspas, sempre.** |
| Consertei a pagina Minha Conta, publiquei, e **afirmei que estava resolvido**. O Lucas mandou print dela quebrada logo depois | O `vercel.json` guarda `/assets/*` por **1 hora** e a URL do CSS nao mudava quando o conteudo mudava. Producao estava certa; o **navegador dele** tinha o CSS velho. **"Publiquei" nao e sinonimo de "chegou no usuario"** — e eu tratei como se fosse. Pior: o efeito era PARCIAL (HTML novo + CSS velho), o que produz uma tela meio montada e parece bug de design. Corrigido com `tools/versiona-css.js`, que carimba o hash do conteudo na URL |

---
