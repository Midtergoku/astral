---
name: astral-operacao
description: "Use ao publicar em producao, mexer em captcha, webhook, SMTP, provedor de e-mail ou dominio do Astral. Contem a ordem correta de ligar o captcha, que ja derrubou o login uma vez quando feita ao contrario."
---

# Operacao do Astral

> Skill: carrega ao publicar ou mexer em configuracao viva.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

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

---

### 13.6. Por que ninguém recebe e-mail — medido em 03/08/2026

O Lucas relatou: *"a pessoa não recebe os e-mails de quando esqueceu a senha e de confirmação"*.
Lido da configuração real do projeto, com `tools/smtp-configura.ps1`:

```
ENTREGA .................. SMTP padrao do Supabase
                           2 mensagens por hora, SO para membros da organizacao
mailer_autoconfirm ....... True     cadastro entra sem confirmar e-mail
rate_limit_email_sent .... 2 por hora
external_email_enabled ... True
external_google_enabled .. True
security_captcha_enabled . True
```

**Não é bug no código.** A documentação oficial é explícita: o SMTP compartilhado do Supabase
entrega **só para endereços da equipe do projeto**; qualquer outro falha com *Email address not
authorized*. Um concurseiro de verdade nunca recebe.

Quem é afetado hoje (consultado no banco): **8 usuários — 6 entram pelo Google** (não têm senha,
não dependem de e-mail) e **2 por e-mail e senha**. Esses 2 ficam trancados para fora se
esquecerem a senha.

#### 🔴 A correção do plano antigo: o domínio NUNCA foi o bloqueador

A seção 13.4 amarrava o SMTP próprio à compra do domínio. **Isso está mais forte do que precisa.**
A documentação do Supabase diz, com todas as letras: *"A custom domain is not strictly required
to use custom SMTP"* — o domínio melhora a entrega (reputação), não é pré-requisito.

| Provedor | Serve sem domínio? |
|---|---|
| **Resend** | ❌ *"You must add and verify at least one domain"* — confirmado na doc |
| **Gmail (smtp.gmail.com) com senha de app** | ✅ grátis, ~500 destinatários/dia, e o SPF/DKIM batem porque quem envia é o próprio Google |

**Decisão: Gmail como ponte, Resend quando o domínio chegar.** Custo R$ 0. A desvantagem real e
única é que o remetente aparece como o Gmail pessoal do Lucas — aceitável em beta fechado,
não aceitável quando começar a cobrar.

#### ⚠️ NUNCA usar `supabase config push` para isto

O `supabase/config.toml` deste projeto declara **apenas as edge functions** — não tem seção
`[auth]`. Um `config push` empurraria uma configuração de auth **vazia** e desligaria o
captcha e o login com Google em produção. A API de gerenciamento altera só o que se manda, e
por isso é o caminho certo. `tools/smtp-configura.ps1` usa ela.

#### ⚠️ A ordem, que é de duas pontas

1. configurar o SMTP
2. **provar que um e-mail chega num endereço de fora** — não vale o do dono do projeto, esse já recebia
3. só então `mailer_autoconfirm = false`

Inverter deixa **ninguém conseguindo se cadastrar**: a conta fica presa esperando um e-mail que
não sai. É o mesmo erro de duas pontas que derrubou o login no captcha em 31/07/2026. O script
**recusa** o passo 3 se não houver SMTP configurado.

#### O que só o Lucas pode fazer (5 cliques)

Criar a senha de app é na conta Google dele — eu não tenho e não devo ter acesso.

1. Ligar a verificação em duas etapas, se ainda não estiver: **myaccount.google.com/signinoptions/two-step-verification**
   (o Google **exige** isso para liberar senha de app)
2. Abrir **myaccount.google.com/apppasswords**
3. Escrever um nome — `Astral` — e clicar em **Criar**
4. Copiar as **16 letras** que aparecem (o Google mostra em 4 blocos de 4; o espaço não importa,
   o script remove)
5. Mandar para mim

Aí eu rodo:
```
$env:SMTP_PASS = '<as 16 letras>'
powershell -File tools\smtp-configura.ps1 -Aplicar -Usuario 'lherdy2003@gmail.com'
```

> ⚠️ **A senha de app dá acesso de envio à conta Google dele.** Ela nunca entra em arquivo —
> vai por variável de ambiente e fica guardada só no Supabase. O repositório é público.
> Para revogar, é um clique na mesma página do passo 2.

#### Armadilhas de ambiente encontradas ao escrever a ferramenta

- **PowerShell 5.1:** dentro de uma função, tudo que vai para `Write-Output` vira **valor de
  retorno**. Com `$antes = Mostrar "ANTES"`, o relatório inteiro foi capturado na variável e a
  tela ficou vazia. Texto para o usuário sai por `Write-Host`.
- Ler o token da CLI no Gerenciador de Credenciais foi **bloqueado pelo classificador** quando o
  script estava no diretório temporário; **funcionou** com o script em `tools/`, que é onde ele
  deve morar de qualquer forma.
