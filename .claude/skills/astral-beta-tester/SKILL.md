---
name: astral-beta-tester
description: "Use quando alguem pedir acesso beta ao Astral, ou ao promover/rebaixar plano de um usuario. Contem a regra anti-engenharia social: so promover e-mail que ja aparece na tabela perfis."
---

# Promover alguem a beta tester

> Skill: carrega ao mexer em plano de usuario.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

### 13.6. Promover alguém a beta tester — o passo mais frequente do lançamento

> É a **primeira coisa** que acontece quando alguém entra no grupo de WhatsApp. Vai ser feito
> dezenas de vezes, então precisa ser à prova de erro.

**O que isso faz:** dá àquela pessoa acesso completo (60 questões/dia, 10 editais, 30 buscas),
de graça, para sempre. `beta` e `pro` têm exatamente o mesmo acesso.

**Antes de começar, a pessoa precisa já ter entrado no site pelo menos uma vez** — pelo Google
ou por e-mail. Sem isso ela ainda não existe no sistema e não há o que promover.

> 🎭 **REGRA CONTRA ENGENHARIA SOCIAL — a mais importante desta seção.**
>
> **O Lucas é o porteiro manual, então ele é o ponto fraco.** No grupo de WhatsApp, alguém vai
> pedir "libera meu acesso aí" — e pode não ser quem diz ser. O golpe clássico: a pessoa dá o
> e-mail de OUTRA pessoa, ou um e-mail que ela controla, e ganha acesso vitalício de graça.
>
> **A regra é uma só, e não tem exceção:**
> **só promover e-mail que já apareceu na tabela `perfis`** — ou seja, alguém que provou ter
> acesso àquela caixa de e-mail, porque entrou no site com ela.
>
> Se o comando SQL responder **"Success. No rows returned"**, isso **não é erro de digitação
> por padrão** — é o sistema dizendo que ninguém entrou com aquele e-mail. Peça para a pessoa
> entrar primeiro, e só depois promova.
>
> **Nunca** criar conta em nome de alguém, nunca promover "adiantado", nunca aceitar e-mail
> passado por terceiro. O custo de errar é acesso vitalício gratuito dado a um estranho — e
> `beta` é promessa que não se desfaz (seção 9).
>
> A mudança fica registrada na tabela `auditoria` (8.18) de qualquer forma, então dá para
> reconstruir depois quem virou beta e quando. Mas reconstruir é consolo, não prevenção.

1. Abrir https://supabase.com/dashboard/project/jjogmcacbdefwiwcyjxp/sql/new
   (é o **SQL Editor**; se pedir login, entrar com a conta do Astral)
2. Colar exatamente isto, **trocando o e-mail** pelo da pessoa:

   ```sql
   update public.perfis
   set tipo_plano = 'beta'
   where email = 'email-da-pessoa@gmail.com'
   returning email, nome, tipo_plano;
   ```

3. Clicar em **Run** (ou `Ctrl + Enter`)
4. **Como saber que deu certo:** aparece uma linha na tabela de resultados, com o e-mail da
   pessoa e `beta` na coluna `tipo_plano`.
   - Se aparecer **"Success. No rows returned"** → o e-mail está errado, ou a pessoa nunca
     entrou no site. Conferir a grafia e pedir para ela entrar uma vez.
5. A pessoa precisa **sair e entrar de novo** no Astral para o novo limite valer.

**Para conferir quem já é beta**, a qualquer momento:

```sql
select email, nome, tipo_plano, criado_em
from public.perfis
order by criado_em desc;
```

**Para tirar o acesso** (se alguém sair do grupo), trocar `'beta'` por `'free'` no primeiro
comando. ⚠️ Mas lembrar: **foi prometido acesso vitalício.** Rebaixar quem foi convidado é
quebra de promessa — ver seção 9.

> **Por que ainda é SQL na mão:** construir uma tela de administração seria mais uma superfície
> de ataque para proteger, por causa de uma ação que acontece 10–15 vezes na vida do produto.
> Quando o número passar de algumas dezenas, vale reavaliar.

---
