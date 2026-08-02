# Auditorias originais — 29/07/2026

> O retrato de como o projeto estava quando eu cheguei. Quase tudo aqui ja foi resolvido.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> Consulte antes de refazer uma varredura: o que ja foi achado uma vez costuma voltar.

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
