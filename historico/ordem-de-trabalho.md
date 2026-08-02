# Ordem de trabalho e etapas

> A sequencia acordada em 29/07/2026: blindagem, pagamento, visual.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.
>
> A etapa atual esta resumida no CLAUDE.md; aqui esta o detalhe de todas.

---

## 9. Ordem de trabalho — acordada com o Lucas em 29/07/2026

O Lucas definiu a sequência: **segurança e qualidade primeiro, pagamento depois, visual por
último.** Nada de pagamento antes de a base estar sólida.

### Etapa 1 — Blindagem (em andamento)

| Bloco | O quê | Status |
|---|---|---|
| **A** | Extrair CSS/JS compartilhado para `assets/` — sem mudar comportamento | ✅ feito — ver 8.5 |
| **B1** | Migrations: trigger de perfil, `tipo_plano`, `lista_espera`, grants | ✅ feito — ver 8.6 |
| **B2** | Edge functions: JWT, quota por plano, limite de PDF, CORS restrito | ✅ feito — ver 8.7 |
| **B3** | Frontend: `access_token`, escape universal, sanitizar URLs, CSP e headers, pin de dependências | ✅ feito — ver 8.8 |
| **C** | Redefinir senha · Termos de Uso · exportar e excluir conta · login por e-mail | ✅ feito — ver 8.9 e 8.10 |
| **D** | Segunda chance na resposta da IA · `alert()` → toast · menu no celular | ✅ feito — ver 8.11 |

> **A Etapa 1 está fechada.** O que falta antes da Etapa 2 é operacional, não de código:
> créditos na Anthropic para o primeiro teste real de ponta a ponta do upload de edital.

> **Por que o Bloco A vem primeiro:** o mesmo bug de XSS está em 13 arquivos porque o código é
> duplicado. Corrigir antes de extrair = escrever a mesma correção 13 vezes e vê-la divergir de
> novo (as tabelas de patente já divergiram). Refatorar depois custa o dobro e reintroduz bugs.

### Etapa 2 — Fundação do pagamento (mudança estrutural, apresentar antes)

1. ~~Migrar estado do localStorage para tabelas no Supabase (com RLS)~~ ✅ feito — ver seção 5
2. ~~Implementar o gate real de `free` vs `pro`~~ ✅ feito — ver 8.13
3. **Gateway de pagamento** — ver seção 10. É o que falta para o gate virar receita:
   hoje ele distingue os planos, mas só o Lucas promove alguém para `pro`, na mão
4. Domínio próprio no Resend + e-mails transacionais
5. Créditos Anthropic + teste end-to-end do upload de edital
6. `processar-edital` em janela **mensal** em vez de diária (ver 8.13, "ainda aberto")

### Estratégia de lançamento — descrita pelo Lucas em 30/07/2026

O plano dele, na ordem:

1. **Criar um grupo de WhatsApp** e entrar em grupos de concurseiros já existentes.
2. Quem entrar por esse link vira **beta tester**: acesso completo **gratuito para sempre**,
   em troca de feedback. Poucas pessoas, de propósito.
3. Só **depois** das primeiras pessoas entrarem, trocar a landing: tirar a parte de beta e
   passar a mostrar **free vs pro**, com os benefícios de cada um lado a lado.

> ⚠️ **Consequência direta para o gate:** `tipo_plano = 'beta'` não é um estado temporário de
> testes — é uma **promessa vitalícia** feita a pessoas reais. O gate tem de tratar `beta`
> com acesso igual ao `pro`, para sempre, e nenhuma migração futura pode rebaixar essas contas.
> Isso já está previsto no CHECK da coluna (`free`, `beta`, `pro`) e nos limites de quota (8.7).

A landing **ainda não muda agora** — a troca de beta para free/pro é para depois que os
primeiros testadores entrarem.

### Etapa 3 — Visual e gamificação  ← **É AQUI QUE A PRÓXIMA SESSÃO COMEÇA**

Adiado três vezes. Em 31/07 ele decidiu: *"quero repaginar tudo"*, e vai **baixar skills de
design** antes de começar. Objetivo declarado: *"deixar com menos cara de feita de IA
possível"*. Roadmap completo em **9.1**.

**Tudo o que ele já pediu para esta etapa, ao longo das sessões — nada disso pode ser esquecido:**

| O quê | Quando pediu | Detalhe |
|---|---|---|
| **Repaginada visual geral** | 29/07 | *"quero mexer bastante"* |
| **Tag em estilo de jogos** | 29/07 | Citou explicitamente. **Falta definir o que é** — perguntar antes de inventar |
| **Mais quests** | 29/07 | Aprofundar a gamificação além dos 8 badges atuais |
| **Ranking pessoal** | 30/07 | *"a parte do ranking pessoal e mais quests, quero fazer sim, mas vamos deixar para depois... quando formos partir mais para o visual"*. ⚠️ **Pessoal, não entre usuários** — ele disse "ranking pessoal" |
| **Página Minha conta** | 31/07 | Ele apontou: *"a parte de minha conta ela ainda está sem a parte do visual"*. É a mais atrasada — foi a única página que construí do zero, funcional e sem acabamento |

> ⚠️ **Ranking entre usuários seria um erro de produto.** Ele disse "ranking **pessoal**". Num
> app de concurseiro, ranking público desmotiva quem está atrás — e a base é pequena demais para
> um ranking fazer sentido. Confirmar com ele antes de qualquer coisa comparativa.

---

---
