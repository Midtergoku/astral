# Planos Free/Pro, Onboarding e Cache de Edital — comparação com o código

> **01/10/2026** · Pedido: comparar a especificação "Planos Free/Pro, Onboarding e Cache de Edital
> v2.0" (30/09) com o que existe — **sem implementar nada**.
> Medido no código e no banco de produção, não suposto. Onde houver número, ele foi lido hoje.
>
> Legenda: ✅ implementado · 🟡 parcial · 🔀 diverge · ❌ não existe
>
> 📁 Ficou em `historico/` e não em `docs/` (como a especificação pedia): este projeto não tem
> `docs/`, e todo documento é achado pelo índice do `CLAUDE.md`, que aponta para `historico/`.

---

## 🧭 O resumo em 5 linhas

1. **O código hoje é "quase tudo grátis".** A única divisão real free × Pro está em 3 lugares:
   leitura de edital (janela de 30 dias), Banco de questões (amostra de 10/dia + provas antigas)
   e cota diária das funções de IA. Todo o resto (diário, ficha, Instrução, tags, condecorações, guia,
   caderno) é igual para todos.
2. **Não existe trial, nem `can(user, feature)`, nem webhook do Mercado Pago.**
3. **Cinco itens da especificação contrariam decisões suas já registradas** (caderno no grátis,
   Pro com 2 trocas de edital, habilidades secretas, rebalanceamento para todos, guia completo) —
   estão na seção de perguntas.
4. **Remover o beta esbarra numa promessa pública:** a página inicial diz *"Quem entrar agora garante
   acesso gratuito e vitalício à plataforma"*. Hoje há **0 contas beta** (medido), mas a promessa
   está no ar.
5. O cache de edital existe e funciona (desde 29/09), mas é mais simples que o especificado:
   a chave é o **arquivo PDF**, não o texto normalizado, e não há versão, curadoria nem selo.

---

## 1. A tabela

### Controle de acesso

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| AC-01 | Campo de plano | 🔀 | `perfis.tipo_plano` text, CHECK `('free','beta','pro')`, padrão `'free'` | Não há `trial` nem `trial_ends_at`. Medido hoje: **1 pro, 6 free, 0 beta** |
| AC-02 | Função única de acesso | 🟡 | `ehCompleto(perfil)` em `assets/js/astral.js:178` | Responde só "tem acesso completo?" (pro ou beta), não "pode usar o recurso X?". Ainda há 10 checagens de plano soltas em 6 arquivos (selo de plano em `conquistas`, `conta`, `dashboard`, `progresso`; `minha-quota`) |
| AC-03 | Validação no backend | 🟡 | `LIMITE_DIARIO` e `EDITAIS_EM_30_DIAS` em `_shared/comum.ts`; `sortear_questoes` (`v_free`) | O que já é limitado tem defesa no servidor. Os recursos que a especificação põe só no Pro **não têm trava em lugar nenhum** — nem na tela, nem no servidor |
| AC-04 | Mercado Pago | ❌ | — | Nenhuma função de pagamento em `supabase/functions/`. É o bloqueador de lançamento já registrado no CLAUDE.md |

### Planos — Edital e Planejamento

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| PL-01 | Leitura do edital | 🔀 | `conferirJanelaDeEditais` (`comum.ts`), `progresso.edital` | Cada conta tem **um** edital (não há "editais ativos"). O limite é de **leituras em 30 dias**: grátis 2 (o 1º + 1 troca), Pro 3. Edital já lido por alguém não conta |
| PL-02 | Trocar edital | 🔀 | idem | Grátis: 1 troca/30 dias = igual à especificação. **Pro: 2 trocas, decisão sua de 29/09** (*"no Pro, duas trocas"*) — a especificação diz ilimitado |
| PL-03 | Calendário | ✅ | `calendario.html` | Igual para todos |
| PL-04 | Cronograma automático | ✅ | `assets/js/cronograma.js` | Igual para todos |
| PL-05 | Ajustar rotina | ✅ | `assets/js/rotina.js` | Igual para todos |
| PL-06 | Editar semana | ✅ | `cronograma.html` | Igual para todos |
| PL-07 | Alerta de desequilíbrio | ✅ | `verificarBalanco` (`dashboard.html`) | Reescrito em 30/09: "Domínio desequilibrado", mesma matéria do chefe |
| PL-08 | Rebalanceamento automático | 🔀 | `necessidadeDe` (`plano.js`) + `medida.semana` | **Existe para todos**: desde 30/09 o cronograma se rebalanceia toda segunda pelo domínio medido. O botão do aviso hoje leva ao Banco filtrado, não a uma "sugestão" |
| PL-09 | Matéria prioritária | ✅ | `pontoFraco` (`chefe.js`) | Igual para todos |

### Planos — Estudo e Progresso

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| PL-10 | Cronômetro | ✅ | `cronometro.html` | Igual para todos |
| PL-11 | Guia de estudos | 🔀 | `buscar-recursos`, `renderGuia` (`dashboard.html`) | Guia **completo para todos** (3 professores + materiais + cursos + dica). O que muda é só a cota diária de busca (grátis 12, Pro 60) |
| PL-12 | Banco de questões | ✅ | `sortear_questoes` (migration `20260927121000`) | Grátis: 10/dia **e só provas com 4 anos ou mais** (regra a mais que a especificação). Pro: acervo inteiro, sem teto diário |
| PL-13 | Caderno de erros | 🔀 | `caderno_de_erros` (migration `20260927160000`) | **Aberto a todos — decisão sua** (`onde-paramos.md`: *"Caderno de erros no grátis ou no Pro? Decisão dele: fica para todos"*) |
| PL-14 | Cobertura do edital | ✅ | `progresso.html`, painel | Igual para todos |
| PL-15 | Tempo por matéria | ✅ | `cronograma.html` | Igual para todos |
| PL-16 | Diário de campanha | 🔀 | `assets/js/diario.js` | Para todos: últimos 30 dias de estudo + marcos + revisão espaçada |
| PL-17 | Ficha de atributos | 🔀 | `ficha_do_usuario` | Os 5 atributos (com Precisão) para todos |

### Planos — Gamificação

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| PL-18 | XP, níveis, patentes | ✅ | `assets/js/divisa.js` | Todas, para todos |
| PL-19 | Missões e Operação Constância | ✅ | `assets/js/missoes.js` | Para todos |
| PL-20 | Bronze e prata | ✅ | `catalogo.js`, `sincronizar_conquistas` | Para todos |
| PL-21 | Ouro, platina, secretas | 🔀 | idem | **Todas caem e ficam para todos.** Não existe "guardada esperando o Pro" (ver GT-01) |
| PL-22 | Quadro de operações | 🔀 | `arvore.html` | Igual para todos. A especificação não define o que "Visualização" × "Completo" muda — **[DECIDIR]** |
| PL-23 | Habilidades por matéria | 🔀 | `conquistas.html` (`HABILIDADES_MILITARES`) | Ativam aos 70% para todos |
| PL-24 | Instrução | 🔀 | `habilidades.html`, `escolher_habilidade` | Para todos |
| PL-25 | Tags e divisas | 🔀 | `tags.html`, `tag_escolhida` | Qualquer pessoa escolhe e veste qualquer divisa conquistada |
| PL-26 | Card compartilhável | 🟡 | `assets/js/cartao.js` (30/09) | Igual para todos. Não tem marca d'água; tem o endereço `astral-psi.vercel.app` no rodapé, para todos — **[DECIDIR]** |

### Gatilhos de conversão

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| GT-01 | Condecorações guardadas | ❌ | — | Não há `pending_medals`. Hoje a condecoração já é **gravada** (tabela `conquistas`) para todos, com data — a base para "guardar" existe |
| GT-02 | Rebalancear no grátis | ❌ | — | O botão leva ao Banco, para todos |
| GT-03 | Habilidade "pronta para ativar" | 🔀 | `conquistas.html` | Hoje as habilidades são **secretas de propósito** até 70% (skill `astral-gamificacao`: *"o valor está em descobrir sem esperar"*), e aos 70% ativam para todos. A especificação revela e trava. **PERGUNTAR** |
| GT-04 | Limite de questões | 🟡 | `banco.html:747-765` | Ao acabar a amostra, a tela explica o Pro (*"No Pro não há amostra"*). Não cita o caderno, que hoje é grátis |
| GT-05 | Fim do trial | ❌ | — | Não há trial |
| GT-06 | 1 aviso de Pro por sessão | ❌ | — | Nenhum controle de frequência. Hoje quase não há avisos de Pro, então o risco é baixo |

### Trial reverso

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| TR-01 | Início em trial | ❌ | gatilho `cria_perfil` (migration `20260730120000`) | Toda conta nasce `'free'` |
| TR-02 | Expiração agendada | ❌ | — | Há onde rodar: o `vigia.yml` (GitHub Actions, de hora em hora) já existe. O `pg_cron` do Supabase **não foi medido** neste projeto |
| TR-03 | Preservação | 🟡 | — | O princípio já vale para todos: conquista não se desconquista, pontos ficam gravados. Falta só existir o trial |
| TR-04 | Avisos 5º e 7º dia | ❌ | — | Depende do SMTP (que hoje não entrega fora da organização) ou de aviso dentro do site |

### Onboarding

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| OB-01 | Cadastro | 🟡 | `criar-conta.html:388` | Consentimento LGPD com caixa **desmarcada** ✅. O **WhatsApp não está no cadastro da conta** — está só na lista de espera (`cadastro.html`, opcional) |
| OB-02 | Hash do texto normalizado | 🔀 | `impressaoDigital` (`comum.ts`), `processar-edital` | O hash é do **arquivo PDF** (SHA-256 dos bytes). Ver a pergunta 6 |
| OB-03 | Cache hit sem espera artificial | ✅ | `processarEdital` (`dashboard.html`) | Desde 30/09 (medido: 0,8 s). A espera de 12 s saiu |
| OB-04 | Leitura assíncrona + rotina enquanto processa | 🔀 | `perguntarRotinaPrimeiraVez` | A rotina é perguntada **antes**, na primeira visita ao painel. A leitura do edital é síncrona (a pessoa espera na tela) |
| OB-05 | Tela de rotina | ✅ | `assets/js/rotina.js` | "Como é a sua semana?" — dias, horas úteis, fim de semana, duração |
| OB-06 | Espera real restante | 🟡 | `processarEdital` | Frase honesta (*"Extraindo matérias… Não feche esta página"*), mas sem distinguir "primeira análise deste edital" |
| OB-07 | Tela de revelação | ✅ | `revelarResultado` (`dashboard.html`) | 5 linhas a cada 450 ms, ~3,5 s, só dado real, sem "verificado". A linha do guia diz *"sendo montado agora"* (ver CE-09) |
| OB-08 | Primeira missão | 🟡 | "Sessão de hoje" (painel); `cronometro.html` | O cronômetro já abre na próxima sessão do dia (30/09), mas não existe o card "Sua primeira missão" com botão |
| OB-09 | Primeira conquista | ✅ | `alistamento` (`catalogo.js`) + `anuncio.js` | Cai na 1ª sessão, com anúncio; o XP vem da sessão |
| OB-10 | Métricas do funil | ❌ | — | Nenhuma ferramenta de métrica. Parte dá para tirar do banco por SQL (cadastro, edital, rotina, sessões) |

### Cache de edital

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| CE-01 | Tabela `edital_cache` | 🟡 | `editais_lidos` (hash, resultado, paginas, usos, criado_em, ultimo_uso) + `guias_por_edital` (edital_hash, materia, dados) | Sem `concurso_slug`, `version`, `verified`, `verified_at`, `links_checked_at`. A força mora dentro de `resultado`. **Sem dado de aluno** ✅ |
| CE-02 | Normalização antes do hash | 🔀 | `impressaoDigital` | Bytes do PDF, sem normalização |
| CE-03 | `user_editais` | 🔀 | `progresso.edital` (com o `hash`) | Um edital por conta, guardado no progresso |
| CE-04 | RLS | ✅ | migration `20260929140000` | Tabelas fechadas, só a chave de serviço lê. Provado por `testa-trava-creditos.js` (aluno logado lê 0 linhas) |
| CE-05 | Retificação como nova versão | ❌ | — | PDF novo = leitura nova, mas sem ligação com o anterior |
| CE-06 | Painel de curadoria | ❌ | — | A única tela de administrador é `importar.html` (questões) |
| CE-07 | Selo "Edital verificado" | 🟡 | — | O selo não aparece em lugar nenhum — o certo enquanto não há curadoria. Falta o campo e a tela |
| CE-08 | Checagem de links | 🔀 | `_shared/links.ts` (30/09) | Confere **no momento em que o guia é gerado**, sem chave de API (12/12 medido no servidor). Não há job semanal, nem "marcado para revisão" |
| CE-09 | Texto sem "agora" | 🟡 | `revelarResultado` (`dashboard.html`) | A revelação diz *"Guia de professores: sendo montado agora"* — é verdade quando o guia está sendo gerado, mas usa a palavra que a especificação proíbe |

### Remoção do beta

| ID | Item | Status | Onde está | Observação |
|---|---|---|---|---|
| BR-01 | Referências | levantado | ver seção 3 | 19 arquivos fora de `tools/` e `historico/` |
| BR-02 | Promoção manual | levantado | skill `astral-beta-tester` | Eu promovo por SQL, e só e-mail que já existe em `perfis` (regra anti-engenharia social). Toda troca de plano fica registrada na `auditoria` (gatilho da migration `20260731140000`) |
| BR-03 | Usuários beta | **0** | `perfis` | Medido em 01/10/2026: nenhuma conta beta. **Mas há promessa pública** (seção 3) |
| BR-04 | Migration proposta | levantado | seção 3 | Não aplicada |

---

## 2. ❓ Perguntas para o Lucas

**Contra decisões suas já registradas (🔀):**

1. **Caderno de erros (PL-13):** em 27/09 você decidiu *"fica para todos"*. A especificação o põe só
   no Pro. Mantém no grátis ou muda?
2. **Trocas de edital no Pro (PL-02):** em 29/09 você decidiu *"no Pro, duas trocas"* (em 30 dias).
   A especificação diz ilimitado. Cada edital novo que ninguém subiu custa de R$ 0,85 a R$ 7,50 de IA,
   conforme o tamanho do PDF (estimativa em `valores.md` §3 — a IA ainda não rodou). Mantém 2 ou libera?
3. **Habilidades secretas (GT-03):** hoje elas são secretas de propósito até 70% e ativam para todos.
   A especificação as revela aos 70% e trava no grátis ("pronta para ativar"). Qual vale?
4. **Rebalanceamento (PL-08):** desde 30/09 o cronograma se rebalanceia sozinho, toda segunda, para
   todos (foi o que você aprovou: *"pode mexer na economia inteira"*). Passar para o Pro significa
   o grátis ter um cronograma que **não** se ajusta ao desempenho. Confirma?
5. **Guia de estudos (PL-11):** hoje é completo para todos. Limitar a 1 professor por matéria no
   grátis — confirma? (O guia já está pago quando é gerado: limitar não economiza nada, só esconde.)

**Diferenças de implementação, onde a atual pode ser melhor (🔀):**

6. **Hash do edital (OB-02, CE-02):** hoje é do arquivo PDF. A especificação pede texto normalizado.
   - *Atual:* simples, rápido, sem custo. Mas o mesmo edital baixado de outro site, ou salvo de novo,
     vira outro hash, e é lido de novo pela IA.
   - *Especificado:* pega mais repetições. Exige extrair o texto do PDF no servidor antes de tudo,
     e PDF escaneado (imagem) não tem texto para normalizar.
   - Minha leitura: vale **depois** que existirem editais reais para medir quantas repetições se perdem.
7. **Um edital por conta (PL-01, CE-03):** hoje cada conta tem um edital. "Até 3 ativos no Pro" muda
   o cronograma, o domínio e o chefe, que hoje pressupõem um edital só. É a maior mudança da lista.
8. **Checagem de links (CE-08):** hoje no momento da geração, sem API. A especificação pede um job
   semanal com a API do YouTube (chave do Google, R$ 0) — pega link que morre depois. Quer os dois?
9. **Ordem do onboarding (OB-04):** hoje a rotina vem antes do edital; a especificação a faz durante a
   leitura. Só faz diferença quando a IA demora (cache miss).

**[DECIDIR] da especificação:**

10. **PL-12:** hoje o grátis tem 10 questões/dia **e** só provas de 4 anos ou mais. Mantém as duas regras?
11. **PL-22:** o que o Quadro de operações deixa de mostrar no grátis?
12. **PL-26:** o cartão do grátis ganha marca d'água? Hoje os dois têm só o endereço do site no rodapé.
13. **PL-01:** quantos editais ativos no Pro?

**🔴 O beta (BR-03):**

14. Hoje há **0 contas beta**, mas três textos públicos prometem o beta:
    - `index.html` (a página inicial): *"Quem entrar agora garante **acesso gratuito e vitalício** à
      plataforma"* · *"Gratuito — para sempre · apenas para os primeiros beta testers"*
    - `termos.html`: *"Existe um plano beta, concedido manualmente a testadores convidados"*
    - comentário no código (`astral.js`, `comum.ts`): *"beta é acesso pro VITALÍCIO, prometido a pessoas
      reais que entraram pelo grupo de WhatsApp em troca de feedback"*
    
    **Alguém do grupo de WhatsApp recebeu essa promessa?** Se sim, a especificação de "virar pro por
    prazo definido, trial ou free" quebraria uma promessa feita a pessoas reais. Mudar o texto da
    página inicial é decisão sua (regra 8.1 do CLAUDE.md).

---

## 3. Remoção do beta — o levantamento (nada alterado)

**Onde o beta aparece (BR-01) — 19 arquivos fora de `tools/` e `historico/`:**

| Tipo | Arquivos |
|---|---|
| Regra de acesso | `assets/js/astral.js` (`ehCompleto`), `supabase/functions/_shared/comum.ts` (tipo `Usuario`, `LIMITE_DIARIO`, `EDITAIS_EM_30_DIAS`), `supabase/functions/minha-quota/index.ts` (`completo`) |
| Selo na tela | `conquistas.html`, `conta.html`, `dashboard.html`, `progresso.html` (classe `plan-beta`; duas ainda citam `'premium'`, valor que o banco nem aceita) |
| Texto ao usuário | `index.html` (seção "Acesso antecipado"), `termos.html`, `privacidade.html`, `login.html` ("durante o beta o envio de e-mails…"), `questoes.html` |
| Banco | 6 migrations antigas citam o beta em comentário ou no CHECK; `registrar-erro` cita em comentário |

**A migration que removeria o beta (BR-04)** — só **depois** de decidir o destino dos beta e com 0 contas beta:

```sql
-- 1. trava: nao roda se ainda houver beta
do $$ begin
  if exists (select 1 from public.perfis where tipo_plano = 'beta') then
    raise exception 'ainda ha contas beta';
  end if;
end $$;
-- 2. o novo conjunto de planos
alter table public.perfis drop constraint <nome do check atual>;
alter table public.perfis add constraint perfis_tipo_plano_check
  check (tipo_plano in ('free', 'trial', 'pro'));
alter table public.perfis add column trial_ends_at timestamptz;
```

Junto, no mesmo bloco: tirar `beta` de `ehCompleto`, do tipo `Usuario` e das duas tabelas de limite
em `comum.ts`, de `minha-quota`, e as classes `plan-beta`/`'premium'` das 4 páginas. **O texto da página
inicial e dos termos só muda com a sua decisão** (é o que a página promete).

---

## 4. Ordem sugerida (para os ❌ e 🟡), do menor esforço e maior impacto ao maior

| # | O quê | IDs | Esforço | Custo |
|---|---|---|---|---|
| 1 | `pode(recurso)` — **uma** função de acesso, no navegador e no servidor (SQL), com a tabela da especificação dentro. Sem ela, cada trava nova vira mais um `if` espalhado | AC-02, AC-03 | 1 sessão | R$ 0 |
| 2 | Textos: "agora" na revelação; o Banco citar o caderno ao acabar a amostra | CE-09, GT-04 | minutos | R$ 0 |
| 3 | Card "Sua primeira missão" com botão que abre o cronômetro na matéria | OB-08 | pequeno | R$ 0 |
| 4 | Métricas do funil por SQL (sem ferramenta nova): cadastro → edital → rotina → 1ª sessão | OB-10 | pequeno | R$ 0 |
| 5 | Remoção do beta + campo de trial — **depois da pergunta 14** | BR-04, AC-01 | 1 sessão | R$ 0 |
| 6 | As travas do grátis, **depois das perguntas 1 a 5 e 10 a 13**, todas por `pode()` | PL-*, GT-02, GT-06 | 1–2 sessões | R$ 0 |
| 7 | Condecorações guardadas para o Pro (a gravação já existe; falta a "espera") | GT-01, PL-21 | 1 sessão | R$ 0 |
| 8 | Trial reverso: nascer em trial, expirar por job, avisos | TR-01…04, GT-05 | 1–2 sessões | R$ 0 (avisos por e-mail dependem do SMTP — senha de app pendente) |
| 9 | Cache com versão, slug e `verified` + painel de curadoria + selo | CE-01, CE-05, CE-06, CE-07 | 2 sessões | R$ 0 |
| 10 | Job semanal de links com a API do YouTube | CE-08 | 1 sessão | R$ 0 (chave do Google, cota grátis) |
| 11 | Leitura assíncrona com a rotina no meio | OB-04, OB-06 | 1–2 sessões | R$ 0 |
| 12 | **Mercado Pago** (bloqueador de lançamento) | AC-04 | 2+ sessões | taxa do MP por venda (ver `valores.md` §9) |

> ⚠️ Os itens 5 a 8 mudam o que pessoas reais têm hoje. Pela regra 8.1, mudança que tira algo de
> quem já usa é **pergunta antes**, mesmo depois de aprovada a especificação.

---

## 5. ✅ Respostas dele — 01/10/2026 (por voz, depois do relatório final da auditoria)

| Pergunta | Resposta dele | O que fica valendo |
|---|---|---|
| **14 — o beta** | *"o beta é uma promessa pública (...) essa ideia dos beta testers eu deixei ela um pouco de lado no momento. Mas se futuramente eu for utilizar, eu mando a mensagem. Deixo isso gravado também."* | Beta **parado**, não removido. Nada muda no plano `beta` nem nos textos públicos até ele mandar. ⚠️ A página inicial **continua prometendo** "acesso gratuito e vitalício" — mudar o texto é decisão dele (regra 8.1): perguntado de novo no relatório de 01/10 |
| **1 — caderno de erros** | *"O caderno de erros fica só para todos, ok?"* | **Para todos** (grátis incluído) — confirma a decisão de 27/09 |
| **2 — trocas de edital no Pro** | *"Se nós conseguirmos implementar aquele sistema de reutilizar os editais, talvez a gente possa manter ilimitado para os PROs. Mas (...) nós queremos passar uma credibilidade, talvez só duas trocas sejam interessantes no mês"* | **Pro: 2 trocas por 30 dias** (o 1º edital + 2) — como já está desde 29/09. Ilimitado fica como possibilidade futura, se o reaproveitamento de editais (cache) se provar |
| **4 — rebalanceamento** | *"o rebalanceamento é para todos, toda segunda"* | **Para todos**, toda segunda — como está desde 30/09 |
| **Ordem sugerida, item 1 — `pode(recurso)`** | *"O primeiro passo é a função única (...) para cada trava não virar um if espalhado, custa zero reais e leva uma sessão. Pode fazer essa parte também"* | **Autorizado e feito em 01/10** (ver abaixo) |
| 3, 5, 6 a 13 | não respondidas | continuam abertas |

Junto, ele autorizou a **camada única de estatísticas** (`user_stats`), a recomendação estrutural da
auditoria de 30/09 que estava pendente: *"faço quando você mandar — então pode fazer agora"*.

### ✅ Respostas dele — 02/10/2026 (por escrito, as 10 que faltavam + o beta de novo)

| Pergunta | Resposta dele | O que fica valendo |
|---|---|---|
| **3 — habilidades secretas** | *"Concordo"* (com manter como está) | Secretas até 70% e ativas **para todos**, como hoje |
| **5 — guia no grátis** | *"Concordo"* (com não limitar) | Guia **completo para todos**: limitar não economiza, só esconde |
| **6 — hash do edital** | *"Vamos na sua sugestão, depois lembre de me avisar qual vale mais a pena."* | Fica o hash do **arquivo**. Lembrete **P6** em `tools/lembretes.js`: dispara sozinho com **20 editais reais lidos**, e aí meço quantas repetições se perderam |
| **7 + 13 — editais ativos no Pro** | *"Concordo"* (com 1 por enquanto) | **1 edital ativo** por conta, nos dois planos |
| **8 — links do guia toda semana** | *"Concordo, mas precisamos testar antes de lançar"* | Job semanal com a API do YouTube (R$ 0), **🚀 testado antes do lançamento** |
| **9 — ordem do onboarding** | *"Antes"* | A rotina continua **antes** do edital |
| **10 — PL-12** | *"Concordo"* | O grátis mantém **as duas regras**: 10 questões/dia **e** só provas de 4 anos ou mais |
| **11 — PL-22** | *"Concordo"* | O Quadro de operações **não esconde nada** no grátis (e deve virar aba de Conquistas — RED-02) |
| **12 — PL-26** | *"Concordo"* | **Sem marca d'água** no cartão do grátis |
| **14 — o beta (de novo)** | *"se nós conseguirmos (...) ler o edital uma vez e depois manter ele e reutilizar para outras pessoas, aí o beta fica válido. Porque não vai ter gasto a mais"* | O beta **volta a valer quando o cache por concurso estiver provado** (edital e guia lidos uma vez, reaproveitados por todos do mesmo concurso). Até lá, parado — sem mexer nos textos |

**Todas as 14 perguntas de planos estão respondidas.** O que ainda trava o pagamento (roadmap 1.6):
as credenciais do Mercado Pago dele e a Vercel Pro (US$ 20/mês) no dia da 1ª cobrança.

### ✏️ 03/10/2026 — o cache de edital, explicado por ele (corrige a minha leitura)

*"Uma pessoa subiu o edital. Esse lugar não é que ele vai ficar à mostra para as pessoas escolherem o
edital que ela quer subir. Não vai. Isso vai ficar guardado num banco de dados nosso (...) quando outra
pessoa também subir, ela vai fazer o mesmo processo (...) e o nosso sistema vai identificar que é o
mesmo edital (...) e só vai pegar essas informações que ele já tem e jogar para o aluno."*

- **CE-06 (painel de curadoria) e CE-07 (selo "verificado")** da especificação ficam como ferramenta
  **minha/dele**, nunca como tela de escolha para o aluno. O aluno não vê lista nenhuma.
- **A pré-carga** é ele pondo o crédito e eu subindo os editais (*"para mim é o mesmo você enviar os
  editais"*) — `docs/auditoria/ROADMAP.md` 5.2, no fim, junto com tudo que custa dinheiro.
- O reaproveitamento pede reconhecer o mesmo edital mesmo com **arquivo diferente** — é a pergunta 6,
  que fica com o lembrete automático de 20 editais reais.
