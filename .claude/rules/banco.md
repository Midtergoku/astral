---
description: "Schema, RLS, grants e migrations do Supabase no Astral"
paths:
  - "supabase/migrations/**"
---

# Banco de dados — regras do Astral

> Carrega ao mexer em migrations. Le antes de escrever qualquer SQL.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

## 4. Banco de dados (Supabase)

### `lista_espera`
`id UUID PK | nome TEXT | email TEXT UNIQUE | concurso TEXT | whatsapp TEXT | criado_em TIMESTAMP`
RLS: INSERT público (anon).

### `perfis`
`id UUID → auth.users(id) | nome TEXT | email TEXT | tipo_plano TEXT DEFAULT 'free' | criado_em TIMESTAMP`
RLS: cada usuário só lê/edita o próprio. Trigger cria o perfil no signup.

**É só isso.** Nenhuma tabela guarda XP, matérias, cronograma, sessões, questões ou eventos.

---

---

## 8.6. Bloco B1 — migrations de banco (30/07/2026) ✅

**As 5 primeiras migrations do projeto.** O schema deixou de existir só na nuvem.

| Migration | O que fez |
|---|---|
| `..120000_conserta_criacao_de_perfil` | `set search_path = public` na função + trocou o `exception` cego por `raise warning` + backfill |
| `..120100_trava_tipo_plano` | `revoke all` de anon/authenticated em `perfis`; devolveu só `select` + `update(nome)`; `with check` explícito |
| `..120200_valida_lista_espera` | `revoke all`, devolveu só `insert`; 4 CHECK constraints; policy com validação |
| `..120300_revoga_execute_publico` | `revoke execute` da função de trigger |
| `..120400_remove_registro_de_teste` | limpeza da linha criada no teste de ponta a ponta |

### Resultado medido

```
antes:  6 usuarios, 0 perfis  |  advisors: 5 avisos
depois: 6 usuarios, 6 perfis  |  advisors: 1 aviso
```

O aviso restante é `auth_leaked_password_protection` — **toggle no painel, só o Lucas faz:**
Authentication → Policies → ativar checagem contra HaveIBeenPwned. Custo zero.

### Privilégios, antes e depois

```
antes   perfis:        anon=arwdDxtm   authenticated=arwdDxtm     (tudo)
        lista_espera:  anon=arwdDxtm   authenticated=arwdDxtm     (tudo)

depois  perfis:        anon=(nenhum)   authenticated=r + update(nome)
        lista_espera:  anon=a          authenticated=a            (so insert)
```

Descoberta durante o trabalho: `anon` tinha privilégio **total** nas duas tabelas. A RLS era a
única barreira. Agora são duas.

### Testes de ponta a ponta contra a API REST real (como `anon`)

| Teste | Resultado |
|---|---|
| INSERT válido na lista de espera | ✅ HTTP 201 — **a captação de leads continua funcionando** |
| INSERT com e-mail inválido | ✅ recusado |
| INSERT com nome de 500 caracteres | ✅ recusado |
| INSERT com nome de 1 caractere | ✅ recusado |
| SELECT anônimo em `lista_espera` | ✅ `permission denied` |
| SELECT anônimo em `perfis` | ✅ `permission denied` |

> Testar o INSERT válido não era opcional: revogar um grant a mais derrubaria o formulário da
> landing em silêncio, e ninguém perceberia até faltar lead. O teste criou uma linha real e o
> webhook disparou um e-mail para o Lucas — falso positivo, era o teste. A linha foi removida
> pela migration `..120400`.

### ⚠️ Ainda em aberto no banco

- **Rate limit da lista de espera.** As constraints limitam o *conteúdo*, não o *volume*.
  Um script ainda consegue inserir milhares de linhas válidas. O limite de verdade precisa de
  captcha ou edge function — vai no B2.
- **`tipo_plano` continua em `perfis`.** Para a Etapa 2 o certo é uma tabela `assinaturas`
  que só o `service_role` escreve. O grant de coluna resolve o furo imediato, não a modelagem.

---
