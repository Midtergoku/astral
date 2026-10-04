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

---

## 8.22. O DOMÍNIO É DO SERVIDOR (30/09/2026) ✅

**Leia antes de mexer em `progresso.materias`, `respostas`, `sessoes_estudo` ou na lista de matérias.**

Até 30/09 o domínio de cada matéria (`materias[].progresso`) **nunca era calculado**: nascia 0 e o
navegador podia gravar qualquer valor. Toda a economia (tag ≥70, Doutrina, condecorações de
domínio, chefe, aviso de rebalancear, cronograma) dependia de um número que não existia.

| Peça | Onde |
|---|---|
| A regra | `dominio_formula()`: com Banco (≥10 questões no acervo) = 100 × (0,6 Q + 0,4 S); sem Banco = 70 × min/900 |
| Q | acertos **de primeira** / respondidas × confiança (respondidas / 30, ou o acervo se menor) |
| S | minutos estudados na matéria / 600 (10 h) |
| Casar nomes | `materia_do_banco()` sobre a tabela `materias_conhecidas` — **espelho** de `MATERIAS_CONHECIDAS` (assets/js/prova.js), escrito por `node tools/sincroniza-materias.js` |
| Quando recalcula | gatilho `progresso_do_servidor` (toda gravação do SITE) + `dominio_apos_sessao` + `dominio_apos_resposta` |
| `medida` | cada matéria leva `{fonte, banco, respondidas, de_primeira, alvo, minutos, semana}` — a tela mostra "como foi medido" |
| `medida.semana` | o domínio no **início da semana** (segunda 0h SP). **É ele que o cronograma usa** (`plano.js necessidadeDe`): o plano fica parado a semana e se rebalanceia toda segunda |

- 🔑 **A chave de serviço fica de fora** (`gravacao_pelo_site`), como no XP. Testes e a simulação
  fixam domínio por ela — ver `tools/testes/dominio-plantado.js` (`fixarDominio`, `plantarAcertos`).
- 🔴 **Teste que planta domínio pelo `salvar_progresso` não funciona mais** — o servidor recalcula.
  Se a TELA grava o progresso ao abrir (o painel grava), nem a chave de serviço segura: plante
  **evidência** (`plantarAcertos`). Foi isso que derrubou 6 testes em 30/09 (consertados no dia).
- Mudou `MATERIAS_CONHECIDAS` no prova.js? `node tools/sincroniza-materias.js`. O `testa-dominio`
  falha se as duas listas divergirem.
- Ajuste no mesmo dia (migration `..130000`): matéria **sem** Banco ia a 100 só com estudo —
  "Legislação" chegou a 90% em 13,5 h, acima de quem prova domínio respondendo. Teto de 70.

Regressão: `node tools/testa-dominio.js` (10 checagens, sem crédito).

---

## 8.23. Regras de plano e estatísticas — cada uma num lugar só (01/10/2026) ✅

> ✅ **02/10/2026: publicado na produção**, depois de o Lucas liberar (*"pode publicar"*) — o
> `supabase db push` tinha sido bloqueado pelo controle de permissões na primeira tentativa.
> Ordem seguida, e que vale para qualquer mudança parecida: (1) as 2 migrations no banco,
> (2) as 7 funções que usam o `comum.ts`, (3) as páginas pelo `git push`. Páginas ou funções
> antes do banco **quebram o site**. `testa-fonte-unica.js` 9/9 na produção antes do push das páginas.

Os dois pedidos dele depois da auditoria: *"a função única (...) para cada trava não virar um if
espalhado"* e a fonte única de estatísticas (o `user_stats` da auditoria). **Nenhum número mudou.**

### `regras_do_plano(plano)` — migration `20261001100000`

- **A única tabela de regras de plano.** Limites (IA por dia, editais em 30 dias, questões por
  dia, idade mínima da prova no grátis) e recursos (`acervo_completo`, `caderno_de_erros`,
  `rebalanceamento`, `guia_completo`). Plano desconhecido = **grátis** (o menor acesso).
- Quem lê: `_shared/comum.ts` (na autenticação → `usuario.regras`, `limiteDe()`, `pode()`),
  `minha-quota`, `sortear_questoes` (via `limite_do_plano`) e o navegador (`meu_plano()` /
  `pode()` em `astral.js`). **Não existe mais cópia** dos números em `comum.ts`.
- 🔴 **Trava nova = uma chave aqui + `pode('chave')` onde trava.** Nunca `if (plano === 'pro')`.
  O `testa-fonte-unica.js` falha se aparecer `if` de plano solto numa página.
- Decisões gravadas na tabela (gap-analysis-planos.md § 5): caderno e rebalanceamento para todos;
  Pro com o 1º edital + 2 trocas em 30 dias; beta igual ao Pro (parado, nunca rebaixado).

### `estatisticas_do_usuario()` — migration `20261001110000`

- Uma chamada devolve `fatos` (= `fatos_do_usuario()`), `hoje` (= `fatos_de_hoje()` + `dia`),
  `plano` (= `meu_plano()`) e `sessoes` dos últimos 400 dias **com o `dia` já calculado no fuso de
  São Paulo**. `security invoker`: cada um só vê o seu.
- 🔴 **Nenhuma tela calcula dia.** O navegador lê `est.hoje.dia` e `sessao.dia`
  (`assets/js/estatisticas.js`, que as páginas importam **pelo `estado.js`** — ver o porquê lá).
- Regra de cálculo **não mudou**: o dia de uma sessão continua sendo o do **fim** (`criado_em`).
  Mudar para o início é o achado NUM-06 do roadmap.

Regressão: `node tools/testa-fonte-unica.js` (9 grupos; `ASTRAL_DEV=1` roda no `astral-dev`).

---

## 8.24. Lote 1 da auditoria — o banco sobe do zero, o aceite é gravado, a IA tem teto (02/10/2026) ✅

### `20260729000000_base_inicial` — OPS-01

- `perfis`, `lista_espera`, `perfis_tipo_plano_check`, `criar_perfil_usuario()` e o gatilho
  `ao_criar_usuario` nasceram **no painel**; 9 das 43 migrations falhavam num banco vazio.
- A migration é **toda protegida** (`if not exists` / só se faltar): na produção não fez nada
  (*"perfis already exists, skipping"*). A versão de verdade da função continua a de `..120000`.
- O **webhook de leads** (`notificar-novo-cadastro`) leva segredo e **não** mora no git:
  `node tools/recria-webhook-lista.js --projeto <ref>` (sem Database Webhooks no projeto, usa o
  Vault + `pg_net` e uma função `notificar_lead_novo()` — o segredo não fica no texto do gatilho).
- Prova: `node tools/testa-migrations-do-zero.js` — **só no `astral-dev`**; esvazia o esquema,
  aplica as 46 migrations e compara 581 peças com a produção. ⚠️ Apaga os dados de teste do dev.
- 🔴 **Antes de 02/10 eu dizia que o dev "ficou idêntico à produção, exceto o webhook" (Fase 2).
  Estava errado:** faltava `perfis_tipo_plano_check`. Eu não comparava restrições.

### `20261002100000_consentimento` — LGL-01

- `versoes_vigentes()` = a **data do topo** de `termos.html` e `privacidade.html`. Mudou o texto?
  Mude a data **nos dois lugares** — o `testa-consentimento` falha se divergirem.
- `consentimentos` (RLS: só o próprio lê; **sem grant de escrita**), `registrar_consentimento()`
  (só aceita a versão vigente), `meu_consentimento()`.
- O portão é o `exigirSessao()` (`assets/js/consentimento.js`). **Contas de teste** passam pelo
  portão real com `tools/testes/aceite-de-teste.js` (o "aceite pendente" do cadastro).
- As 7 contas reais criadas antes de 02/10 veem a tela de aceite **uma vez**.

### `20261002110000_teto_global_de_ia` — SEG-06 (com EDI-01 no `comum.ts`)

- `teto_global_de_ia()`: edital 10/dia · guia 60/dia · questões 100/dia, **o Astral inteiro**
  (💰 números escolhidos por mim, para ele confirmar — `historico/valores.md`).
- `uso_de_ia_hoje()`: só a chave de serviço; o `checa-saude` mostra e falha no teto.
- Regressão: `ASTRAL_DEV=1 node tools/testa-consentimento.js` (15) e o teste de custo com a
  "IA de mentira" (registro em `docs/auditoria/ROADMAP.md`).

---

## 8.26. Corrigir a leitura do edital (03/10/2026, roadmap 3.3) ✅

**Leia antes de mexer em nome de matéria.** O tempo estudado é ligado à matéria pelo **nome
exato** (`dominio_calculado`: `est.materia = ed.m->>'nome'`). Trocar o nome só em
`progresso.materias` deixa as horas antigas **órfãs** — o domínio cai.

| Peça | O que faz |
|---|---|
| `renomear_materias(p_trocas jsonb)` | `[{de, para}]`, **tudo ou nada**: confere todas antes de mexer; renomeia em `sessoes_estudo`, `recursos_salvos` e `progresso.materias`. Security definer (sessão não tem grant de update — continua não tendo) |
| Travas | só matéria **do edital**; o nome novo não pode ser de outra matéria do edital **nem** de estudo gravado em outra (juntar duas inflaria "a mesma matéria N dias seguidos"); comparação sem acento/caixa (`unaccent_simples`). Troca cruzada A↔B é recusada |
| `editais_reportados` | "a leitura está errada": `(usuario_id, edital_hash)` único, hash SHA-256 conferido por `check`. RLS: insere e lê só o seu. Entra em `meus_dados`, no `backup.js` e no `checa-saude` (🔔) |

- **O aviso NÃO apaga `editais_lidos`.** Um aluno apagaria a leitura de todos, e cada
  releitura custa crédito. Quem decide é o dono, olhando o aviso.
- `salvar_progresso` mescla matérias pela **lista nova** (`mesclar_materias`): remover e
  acrescentar pela tela funcionam sem nada de novo no servidor.
- Regressão: `node tools/testa-corrigir-edital.js` (30 checagens; `ASTRAL_DEV=1` no dev).

---

## 8.27. A questão como imagem do caderno (03/10/2026, roadmap 3.4) ✅

`questoes.imagem` (`img/questoes/<id>-<hash8>.webp`, servida pelo site, `check` no formato).
`sortear_questoes` e `caderno_de_erros` devolvem o campo. Com imagem, **a imagem é a questão**:
o texto guardado (em geral o quebrado) fica só para busca; o Banco mostra botões só com a letra.

- 🔴 **Detector e testes de texto não valem para ela** (`defeitos()` e `alternativasRepetidas` pulam
  `q.imagem`; `testa-acervo-limpo` 4d confere a imagem). **Qualquer leitura nova de `questoes` para
  conferir defeito tem de pedir a coluna `imagem`** — sem ela, o `arruma-acervo` tiraria do ar as
  165 questões de imagem achando que o texto embaralhado é o que o aluno vê.
- Publicar imagem nova: `tools/recorta-questoes.js` → **olhar cada uma** (gabarito ao lado) → só então
  `imagem` + `publicada`. A mesma questão aparece em vários códigos da EAGS: conferir cópia pelo texto
  **e** pela imagem.
- Regressão: `node tools/testa-questao-imagem.js` (7) e `testa-acervo-limpo` (4d).

---

## 8.28. Idade mínima de 16 (03/10/2026, roadmap 3.6) ✅

`perfis.nascimento` (**sem grant de escrita**) · `registrar_nascimento(p_data)` grava **uma vez**;
menos de 16 → erro com `hint = 'idade_minima'` e **nada gravado** · `idade_em_anos(date)` no fuso de SP ·
`meu_consentimento()` devolve também `nascimento` (deu a data?) e `menor` (16–17).

- O portão (`consentimento.js`) pede a data junto com o aceite. **Servidor sem o campo → não pergunta**
  (ninguém fica preso numa ordem de publicação errada).
- Mudou Termos/Política? Data no topo dos **dois** documentos **e** em `versoes_vigentes()`.
- 🔴 **Pagamento (5.3):** `menor = true` só assina com confirmação do responsável.
- Contas de teste: `tools/testes/aceite-de-teste.js` dá `2000-01-01` como pendente; `fingirAceite`
  devolve `nascimento: true`.
- Regressão: `testa-consentimento` seção 8.

---

## 8.29. O bônus da Instrução vale da escolha em diante (03/10/2026, roadmap 3.7) ✅

`sessoes_estudo` ganhou `habilidades text[]`, `alvo boolean`, `regra_bonus smallint` — o **retrato**
do momento em que a sessão entrou, gravado pelo gatilho `sessao_habilidades` (roda depois do
`sessao_confiavel`; ordem alfabética). **`xp_com_bonus` lê o retrato, nunca as especializações de
hoje** — é isso que impede o XP de subir sem estudar e a patente de descer no "Recomeçar".

- `bonus_gravado(...)`: regra 1 (sessões antigas) soma os degraus; regra 2 (novas) vale o **maior
  degrau por ramo**. **Não mudar a regra 1**: desceria a patente de quem já tem.
- `materia_mais_fraca(uid)`: a mesma conta de sempre, agora num lugar só.
- Regressão: `node tools/testa-bonus-instrucao.js` (5; `ASTRAL_DEV=1` no dev).

---

## 8.30. A folga da rotina não quebra a sequência (04/10/2026, roadmap 3.8) ✅

**Leia antes de mexer em sequência.** Tudo que é "dias seguidos" passa por
`sequencias_de_estudo(uid)` → `(d, seq, ilha)`: entre o 1º dia estudado e hoje, só contam os dias
que importam (dia de estudo da rotina **ou** dia estudado) — folga sem estudo some da fila e vira ponte.

- `dias_de_folga(uid)` espelha o `normalizarRotina` do `cronograma.js` (dias; semana editada à mão;
  sem rotina = seg–sáb). **Mudou a regra de rotina no site? Mudar aqui junto.**
- Usam: `sequencia_do_usuario` (viva se nenhum dia de estudo passou em branco até ontem),
  `fatos_do_usuario` (melhor sequência; semana sem brecha = todos os dias de estudo da rotina),
  `xp_com_bonus` (seq do dia → bônus da Infantaria).
- Regressão: `node tools/testa-folga.js` (9; `ASTRAL_DEV=1` no dev).

---

## 8.31. A sessão conta no dia em que COMEÇOU (04/10/2026, roadmap 3.9) ✅

**Leia antes de escrever qualquer conta de dia.** `sessoes_estudo.criado_em` é o **fim** da sessão
(`now()` na gravação). O dia de estudo é a coluna calculada **`sessoes_estudo.dia`**:

```sql
dia date generated always as (((criado_em at time zone 'America/Sao_Paulo') - make_interval(secs => segundos))::date) stored
```

- **Use `dia`, nunca `(criado_em at time zone ...)::date`.** Já usam: `dias_de_estudo`, `fatos_de_hoje`
  (e a hora de "cedo"/"à noite" = hora do **início**), `fatos_do_usuario` (dias, meses), `xp_com_bonus`,
  `estatisticas_do_usuario` (`'dia'` de cada sessão), `ficha_do_usuario` (Amplitude = `dia > hoje - 30`).
- 🔴 **A ordem da expressão importa.** `timestamptz - interval` **não é imutável** e o banco recusa a
  coluna calculada ("generation expression is not immutable"). Primeiro `timezone(texto, timestamptz)`
  (imutável), depois menos o intervalo (`timestamp - interval`, imutável).
- −3 fixo é seguro porque o Brasil não tem horário de verão desde 2019. **Se voltar, revisar aqui e o
  `formato.js` (`hojeSP`) juntos.**
- No navegador, o "hoje" é `hojeSP()` / `diaDaSemanaSP()` de `assets/js/formato.js` — nunca `getDay()`
  ou `setHours(0)` do aparelho.
- Regressão: `node tools/testa-dia-da-sessao.js` (10; `ASTRAL_DEV=1` no dev; `ASTRAL_RAIZ` para telas antigas).
