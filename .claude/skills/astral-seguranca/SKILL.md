---
name: astral-seguranca
description: "Use ao fazer varredura de seguranca, auditar RLS e privilegios, revisar renderizacao de dado nao confiavel, ou avaliar se um ataque se aplica ao Astral. Le ANTES de afirmar que algo esta protegido."
---

# Seguranca do Astral

> Skill: carrega em tarefa de seguranca. As 4 regras invioláveis estao no CLAUDE.md.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

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

**6. Olhinho de ver a senha** (`olhinhoDeSenha()` em `astral.js`, nas 3 telas de senha)

Pedido dele no mesmo prompt. Não é só conforto — **quem não consegue conferir o que digitou
escolhe senha curta e óbvia**, ou erra e culpa o site. Em celular, com teclado que corrige
sozinho, é pior.

Três decisões de segurança embutidas:
- **começa sempre escondido** — mostrar é ação deliberada da pessoa
- **esconde sozinho** ao trocar de aba (`visibilitychange`) ou sair da página (`pagehide`), para
  a senha não ficar legível na tela de um computador compartilhado
- `type="button"` no botão, senão ele viraria submit dentro de `<form>`; e `aria-pressed` para
  leitor de tela anunciar o estado

Em `redefinir-senha.html` vale dobrado: são dois campos, e sem conferir o que digitou "as senhas
não conferem" vira adivinhação — justamente na tela de quem já esqueceu a senha.

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
