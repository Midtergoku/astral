---
name: astral-supabase-admin
description: "Use ao precisar alterar configuracao do projeto Supabase que so existiria no painel: ligar provedor de auth, captcha, SMTP, politica de senha. Contem como ler o token no Credential Manager do Windows e as duas armadilhas do PowerShell 5.1."
---

# Acesso administrativo ao Supabase

> Skill: carrega ao mexer em config do projeto.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

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
