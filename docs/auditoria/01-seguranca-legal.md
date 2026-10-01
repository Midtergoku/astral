# Auditoria pré-lançamento — Fase 2: segurança (seção 8) e LGPD/consumidor (seção 9)

> **01/10/2026** · Só investigação: **nenhuma correção foi feita**.
>
> **Onde os testes rodaram.** Os ataques entre usuários rodaram num projeto Supabase **novo, de
> desenvolvimento** (`astral-dev`, ref `vtluuezwfpqgryixaaea`, plano grátis, R$ 0), criado hoje
> para isso — a produção não tinha ambiente de desenvolvimento, e a ordem foi *"nunca em produção"*.
> Nele foram aplicadas as 43 migrations do repositório e publicadas 6 funções do servidor, **sem a
> chave da IA** (nenhuma chamada paga possível). Comparei a segurança do dev com a da produção
> antes de testar: **29 policies, 12 grants de tabela, 5 de coluna, 37 funções e RLS em 23 tabelas,
> idênticos**. Na **produção** eu só **li** configuração (autenticação, segredos — nomes, não valores —,
> cabeçalhos HTTP); nenhum usuário foi criado lá.
>
> Resultado bruto: **69 ataques** entre usuários e anônimo — **68 protegidos, 1 aberto** (sessão).
> Mais 7 testes de envio de arquivo, 1 de exclusão de conta, 1 de enxurrada e as varreduras.

---

## Resumo por severidade

| | Quantos | Quais |
|---|---|---|
| **S0** — bloqueia lançamento | **3** | LGL-01 consentimento não registrado e Google sem aceite · PAG-01 pagamento inexistente · OPS-01 o banco não sobe do zero (restauração quebrada) |
| **S1** — quebra a confiança | **7** | SEG-01 registro de erros aberto a qualquer um · SEG-02 e-mail de recuperação não chega · SEG-03 conta pode ser criada com e-mail alheio · LGL-02 menores · LGL-03 exportação incompleta · LGL-04 exclusão deixa rastros · OPS-02 backup manual |
| **S2** — atrapalha | **6** | SEG-04 token vale 1 h após "sair de todos" · SEG-05 senha e sessão · SEG-06 custo por contas falsas · OPS-03 alertas · LGL-05 política desatualizada · LGL-06 direitos sobre provas e materiais |
| **S3** — polimento | **1** | SEG-07 versões de bibliotecas |
| **PERGUNTAR AO LUCAS** | 4 | menores (LGL-02), promessa do beta × termos (LGL-05), provas antigas (LGL-06), retenção da auditoria (LGL-04) |

---

## O que está PROTEGIDO — e como verifiquei

| Área | Teste | Resultado |
|---|---|---|
| RLS | as 23 tabelas | **ligada em todas** (produção, `pg_class.relrowsecurity`) |
| Leitura cruzada | Ana lê dado do Beto em 13 tabelas com dono | 0 linhas em todas (9 com HTTP 200 vazio, 4 com 403) |
| Tabelas fechadas | Ana lê auditoria, lista_espera, editais_lidos, guias, administradores, questoes, materias_conhecidas | 403 em todas |
| Escrita cruzada | Ana altera 5, apaga 7 e grava "no nome do Beto" em 5 tabelas | 0 linhas afetadas / 403 em todas; dados do Beto conferidos intactos depois |
| Minhas questões | Ana lê, altera, apaga e responde a questão particular do Beto | 0 / 0 / 0 / 403; gabarito dele intacto |
| Vantagem pelo console | plano → pro | 403, continuou `free` (grant só em `perfis.nome`) |
| | XP 999.999, sequência 500, 9.000 h, domínio 100 | o servidor regravou tudo: xp 0, sequência 0, horas 0, domínio 0 |
| | `xp_validado` | 403 (sem grant) |
| | sessão de 24 h no passado com 99.999 XP | recusada (`sessao mais longa que o tempo que passou`) |
| | sessão de cronograma com XP 99.999 e data antiga | gravada com **XP 30** e data de **hoje** (o servidor decide) |
| | condecoração platina, especialização, virar administrador, publicar questões, ler acervo de admin | 403 em todas |
| | gastar ponto de Instrução sem ter ponto | recusado |
| | marca impossível no TAF | recusada |
| Funções com id alheio | `xp_com_bonus(Beto)` | devolve **zeros** (as sessões do Beto ficam invisíveis pela RLS) |
| | `dominio_calculado(Beto)`, `sequencia_do_usuario(Beto)` | 403 (sem permissão de execução) |
| SECURITY DEFINER | 23 no banco | **testadas por ataque:** `publicar_questoes`, `acervo_do_administrador`, `escolher_habilidade`, `registrar_resposta` (questão alheia), `dominio_calculado` (sem execução), `sincronizar_conquistas` e `meu_taf` (anônimo) — todas recusaram. 8 são de gatilho (não chamáveis direto). **As demais (`caderno_de_erros`, `filtros_de_questoes`, `sortear_questoes`, `materia_do_banco`, `meu_dominio`, `minha_precisao`, `sou_administrador`, `esquecer_habilidades`) não foram atacadas uma a uma** — nenhuma recebe id de usuário como parâmetro |
| Views | — | **nenhuma** view no banco |
| Anônimo | lê 7 tabelas, chama 5 funções, grava direto na lista de espera | 401 em todas |
| Storage | — | **nenhum bucket**; o PDF não é guardado |
| Chaves | código atual e **todo o histórico do git** | nenhuma chave secreta (`sb_secret_`, JWT, `sk-ant-`, `re_`); nenhum `.env` versionado; o segredo do webhook não está no repositório. Só a chave **pública** no navegador, como deve |
| Segredos na produção | nomes | `ANTHROPIC_API_KEY`, `HCAPTCHA_SECRET`, `RESEND_API_KEY`, `WEBHOOK_SECRET` + os do Supabase — **todos em Secrets** |
| Envio do edital | texto com nome de PDF · executável disfarçado · base64 inválido · vazio · 11 MB · PDF com 400 páginas | 400 / 400 / 400 / 400 / **413** / **413** — tudo **antes** da IA |
| | falha da IA | mensagem genérica, **sem descontar a cota** (0 linhas em `uso_ia`) |
| | sem login | 401 |
| XSS | `tools/varre-xss.js` | "nenhuma interpolação de dado não confiável sem escape" |
| Cabeçalhos (produção) | `curl -I` | CSP, HSTS 2 anos com preload, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy |
| Captcha | produção | ligado (hCaptcha) no cadastro, login e lista de espera; `HCAPTCHA_SECRET` existe — a lista de espera **não** cai no "libera sem captcha" |
| Refresh token | renovar depois de sair | recusado (400); rotação ligada |
| Exclusão | apagar a conta | some: conta, perfil, progresso, sessões, eventos, TAF (cascata) — ver LGL-04 para o que sobra |

---

## S0 — bloqueia lançamento

### [LGL-01] Consentimento não é registrado — e o cadastro pelo Google não pede aceite
- Severidade: **S0**
- Tipo: LEGAL
- Onde: `criar-conta.html:442-448` (`cadastroGoogle`), `criar-conta.html:456-462`; `login.html` (botão do Google); banco: nenhuma coluna/tabela de consentimento
- O que acontece: a caixa "Li e aceito os Termos e a Política" só é conferida no cadastro **por e-mail**, e só no navegador. O botão **"Cadastrar com Google"** chama `signInWithOAuth` direto, sem olhar a caixa — e o Google entrando pelo `login.html` também cria conta. Em nenhum dos dois caminhos o aceite fica gravado (não há data, versão do texto nem registro).
- O que deveria acontecer: todo cadastro (e-mail ou Google) passa pelo aceite, e o servidor grava **quem, quando e qual versão** dos Termos/Política. Pela LGPD (art. 8º, §2º), cabe ao controlador provar o consentimento.
- Evidência: `grep consent supabase/migrations/*.sql` → nada; código acima.
- Correção sugerida: tela de aceite depois do primeiro login (vale para Google e e-mail), gravando em tabela própria (`consentimentos`: usuario_id, versao_termos, versao_politica, aceito_em) por função do servidor; versão no topo de cada documento.
- Esforço: M

### [PAG-01] Pagamento não existe — tudo da seção 8.3 está por fazer
- Severidade: **S0** (para o lançamento **pago**)
- Tipo: FALTANDO
- Onde: `supabase/functions/` — nenhuma função de pagamento; `index.html:1288, 1315` prometem R$ 19,90 e "basta cancelar na sua conta"
- O que acontece: não há webhook do Mercado Pago, validação de assinatura, idempotência, tratamento de recusa/estorno/chargeback, preço no servidor, planos mensal/trimestral/anual/fundador, trial, nem fluxo de **arrependimento (CDC art. 49)**, aviso de renovação e cancelamento — prometidos nos Termos (`termos.html` §6).
- O que deveria acontecer: tudo isso antes da primeira cobrança. Hoje o único caminho para "pro" é promoção manual por SQL (o que é seguro: o cliente não consegue se promover — testado).
- Evidência: inventário de funções (`00-mapa.md` §3); teste "Ana muda o próprio plano para pro" → 403.
- Correção sugerida: a especificação de planos (`historico/gap-analysis-planos.md`) + webhook com validação de assinatura (`x-signature` do Mercado Pago) e tabela de eventos com chave única por `id` do pagamento.
- Esforço: G

### [OPS-01] O banco não sobe do zero com as migrations — a restauração escrita falharia
- Severidade: **S0**
- Tipo: BUG (operação)
- Onde: `supabase/migrations/` (43 arquivos); `ASTRAL-BACKUPS/*/LEIA-ME.txt` passo 2: *"rodar as migrations do git"*
- O que acontece: aplicadas num projeto limpo, **9 das 43 falham**: `perfis`, `lista_espera` e a função `criar_perfil_usuario` (com o gatilho em `auth.users`) foram criados **pelo painel**, antes de existirem migrations, e nunca entraram nelas. O gatilho `notificar-novo-cadastro` (webhook de lead) também só existe no banco. No dia de perder o banco, o procedimento do backup quebraria no passo 2.
- O que deveria acontecer: `supabase db push` num banco vazio reproduz a produção inteira.
- Evidência: rodado hoje no `astral-dev` — `20260730120000_conserta_criacao_de_perfil.sql → relation "public.perfis" does not exist` (e mais 8). Depois de criar as três peças à mão, as 43 passaram e o resultado ficou idêntico à produção (exceto o webhook).
- Correção sugerida: uma migration "zero" (timestamp anterior a todas) criando `perfis`, `lista_espera`, `criar_perfil_usuario` e o gatilho, com `if not exists`; o webhook como migration (sem o segredo no arquivo — lido de `vault` ou recriado por ferramenta). Depois, provar subindo um banco vazio.
- Esforço: M

---

## S1 — quebra a confiança

### [SEG-01] Qualquer pessoa, sem login, grava sem limite na tabela de erros
- Severidade: S1
- Tipo: SEGURANÇA / CUSTO
- Onde: `supabase/functions/registrar-erro/index.ts` (login opcional, linha 74; corta em 16 KB, linha 49; sem limite de frequência)
- O que acontece: 25 envios anônimos seguidos → **25 linhas gravadas** (até ~16 KB cada). O plano grátis do Supabase tem 500 MB; ~30 mil pedidos enchem o banco, e banco cheio fica **só leitura** — o site para de salvar progresso de todo mundo.
- O que deveria acontecer: limite por origem/IP e por período; recusar anônimo ou limitar muito mais forte; apagar o que passa de 12 meses (a Política promete isso).
- Evidência: teste no dev — `sem login, 25 envios: 204 | linhas gravadas: 25`.
- Correção sugerida: limite por IP (cabeçalho `x-forwarded-for`) numa tabela de contagem com janela de 1 h; aceitar no máximo N por janela; job de expurgo.
- Esforço: M

### [SEG-02] Quem usa e-mail e senha não consegue recuperar a conta
- Severidade: S1
- Tipo: BUG
- Onde: configuração de autenticação da produção — SMTP padrão (`smtp_host` vazio); `rate_limit_email_sent = 2`
- O que acontece: "esqueci a senha", confirmação e troca de e-mail dependem de e-mail, e o SMTP padrão do Supabase **só entrega para a organização**. A troca de e-mail é pior: `mailer_secure_email_change_enabled = true` exige confirmar nos **dois** endereços — nenhum dos dois chega.
- O que deveria acontecer: e-mail transacional entregue (SMTP próprio).
- Evidência: `tools/smtp-configura.ps1` (só leitura) e leitura da config hoje. É o lembrete da senha de app do Gmail já registrado.
- Correção sugerida: SMTP do Gmail com senha de app (R$ 0) → provar entrega → depois exigir confirmação (ordem documentada em `tools/smtp-configura.ps1`).
- Esforço: P (depois da senha de app)

### [SEG-03] Dá para criar conta com o e-mail de outra pessoa — e há risco de sequestro prévio
- Severidade: S1 (risco, **não reproduzido**)
- Tipo: SEGURANÇA
- Onde: produção, `mailer_autoconfirm = true`
- O que acontece: o cadastro por e-mail entra **sem provar** que o e-mail é da pessoa. Consequências: (a) alguém cria conta com o e-mail de outra pessoa; (b) **sequestro prévio**: o atacante cria conta com senha usando o e-mail da vítima; quando a vítima entrar depois "com o Google", o Supabase **vincula identidades com o mesmo e-mail** à conta existente — e o atacante continua com a senha dessa conta.
- O que deveria acontecer: e-mail confirmado antes de a conta valer (depende de SEG-02).
- Evidência: config lida hoje. **Não reproduzido**: precisaria de uma conta Google real controlada no teste. A vinculação automática por e-mail é comportamento documentado do Supabase Auth; se ela exige e-mail **verificado**, o `autoconfirm` o marca como verificado sem prova.
- Correção sugerida: resolver SEG-02 e desligar `mailer_autoconfirm` (`smtp-configura.ps1 -ExigirConfirmacao`), na ordem documentada.
- Esforço: P (depois de SEG-02)

### [LGL-02] Menores de idade: a regra está escrita, mas não há mecanismo — e os dois documentos divergem
- Severidade: S1 — **PERGUNTAR AO LUCAS** (pode ser S0 conforme parecer jurídico)
- Tipo: LEGAL
- Onde: `privacidade.html` §5.1 (*"destinado a maiores de 18 anos; entre 16 e 18, com autorização de um responsável"*); `termos.html` §3 (*"16 anos ou mais; entre 16 e 18, com autorização"*); `criar-conta.html` (nenhuma pergunta de idade)
- O que acontece: o público inclui pessoas de 17 anos (EsPCEx, EEAR), mas nenhuma tela pergunta idade nem colhe autorização de responsável — a promessa dos documentos não tem como ser cumprida. Os dois textos não batem (um diz "destinado a maiores de 18", o outro "16 anos ou mais"). Com cobrança, um menor de 16 a 18 é relativamente incapaz para contratar sozinho.
- O que deveria acontecer: decidir a idade mínima; perguntar data de nascimento no cadastro; para 16–17, colher e registrar o aceite do responsável (ou definir outra base legal no melhor interesse do adolescente, LGPD art. 14); tratar a compra por menor.
- Evidência: textos acima; `grep idade|nascimento criar-conta.html` → nada.
- Correção sugerida: depende da decisão; o mínimo é perguntar a idade e alinhar os dois textos.
- Esforço: M

### [LGL-03] "Baixar meus dados" entrega menos da metade do que a tela promete
- Severidade: S1
- Tipo: LEGAL / PROMESSA VAZIA
- Onde: `conta.html:492-513`; promessa em `conta.html` (*"Gera um arquivo com tudo: seu cadastro, seu edital, matérias, XP, conquistas, histórico do cronômetro e eventos"*), `privacidade.html` §7 (*"baixar todos os seus dados"*) e `termos.html` §7
- O que acontece: o arquivo traz **perfil, progresso, eventos e sessões**. Ficam de fora: **conquistas** (citadas na promessa), especializações escolhidas, respostas e caderno de erros, questões próprias e questões servidas, guia de estudo (`recursos_salvos`), marcas do TAF, uso de IA e erros registrados.
- O que deveria acontecer: portabilidade (LGPD art. 18, V) de **todos** os dados da pessoa.
- Evidência: código acima — 3 consultas além do perfil.
- Correção sugerida: uma função do servidor `meus_dados()` que monta o pacote completo, lendo todas as tabelas com `usuario_id`.
- Esforço: P

### [LGL-04] Excluir a conta deixa três rastros — e um deles é o e-mail, para sempre
- Severidade: S1 — retenção da auditoria: **PERGUNTAR AO LUCAS**
- Tipo: LEGAL
- Onde: `supabase/functions/excluir-conta/index.ts:37` (só `deleteUser`); FKs `auditoria.alvo_id` e `erros_cliente.usuario_id` com `set null`; `lista_espera` sem ligação
- O que acontece (testado no dev, conta com uma vida de uso):

  | | Antes | Depois de excluir |
  |---|---|---|
  | conta, perfil, progresso, sessões, eventos, TAF | 1 cada | **0** ✅ |
  | erro registrado | 1 | **1** (sem o id, mas com o texto) |
  | auditoria da troca de plano | 1 | **1 — com o e-mail** |
  | lista de espera com o mesmo e-mail | 1 | **1** |

  A tela promete *"O que some junto com a conta: cadastro, perfil, edital, matérias, cronograma, XP, patente, sequência, conquistas, histórico e eventos"* — não fala do que fica. A Política diz que *"os dados associados são apagados"* e que erros ficam *"até 12 meses sem vínculo"* — mas não há expurgo de 12 meses, e a auditoria guarda o **e-mail** sem prazo.
- O que deveria acontecer: decidir a retenção (a auditoria de troca de plano pode ter base legal — prova de cobrança —, mas precisa estar na Política, com prazo); apagar ou anonimizar o e-mail da auditoria e da lista de espera junto com a conta, ou informar.
- Evidência: `exclusao-dev.js` (rascunho do teste), contagem acima.
- Correção sugerida: a exclusão também apaga `lista_espera` pelo e-mail e anonimiza `auditoria.alvo_email`; job de expurgo de `erros_cliente` > 12 meses; Política com a tabela de retenção.
- Esforço: P

### [OPS-02] O backup só existe quando alguém roda a ferramenta
- Severidade: S1
- Tipo: FALTANDO
- Onde: `tools/backup.js` (local, manual); `.github/workflows/` (nenhum agendamento de backup — `verifica.yml:13` diz que ele precisa da chave de serviço); plano grátis do Supabase **sem backup nenhum**
- O que acontece: o último backup é de hoje porque eu o rodei. Entre uma sessão e outra, nada é copiado. Antes de 30/09 o backup nem cobria 12 das tabelas (consertado em 30/09).
- O que deveria acontecer: cópia automática diária, guardada fora do Supabase, com restauração provada de tempos em tempos.
- Evidência: inventário dos workflows; histórico de 30/09.
- Correção sugerida: workflow agendado do GitHub com a chave de serviço em *Actions secrets*, guardando o JSON criptografado como artefato (retenção 30 dias), **ou** o plano Pro do Supabase (US$ 25/mês, com backup diário) quando houver receita.
- Esforço: M

---

## S2 — atrapalha

### [SEG-04] "Sair de todos os aparelhos" não derruba o acesso na hora
- Severidade: S2
- Tipo: SEGURANÇA / PROMESSA VAZIA
- Onde: `conta.html` (*"derruba o acesso em todos os aparelhos"*); produção `jwt_exp = 3600`
- O que acontece: depois do logout global, o token de acesso já emitido **continua lendo dados por até 1 hora** (testado: logout 204 → leitura seguinte 200). O refresh é recusado, então o acesso morre na expiração.
- O que deveria acontecer: dizer "em até 1 hora", ou reduzir o `jwt_exp` (ex.: 15 min).
- Evidência: teste "token de acesso ainda funciona depois de sair" no dev.
- Correção sugerida: texto honesto + `jwt_exp` menor.
- Esforço: P

### [SEG-05] Senha e sessão no mínimo
- Severidade: S2
- Tipo: SEGURANÇA
- Onde: config da produção
- O que acontece: senha mínima de 8 sem exigência de tipos (`password_required_characters` vazio); verificação de senha vazada desligada (só no Pro, HTTP 402 — já registrado); **trocar a senha não pede a senha atual** (`security_update_password_require_reauthentication = false`) — quem pega uma sessão aberta troca a senha; **sem expiração por inatividade** (`sessions_inactivity_timeout = 0`); sem segundo fator.
- Evidência: leitura da config hoje.
- Correção sugerida: ligar a reautenticação para troca de senha (depende de e-mail — SEG-02); considerar inatividade de 30 dias.
- Esforço: P

### [SEG-06] Contas falsas viram custo de IA — o captcha é a única barreira
- Severidade: S2
- Tipo: CUSTO
- Onde: `_shared/comum.ts` (`EDITAIS_EM_30_DIAS` free 2; `LIMITE_DIARIO` free: guia 12/dia)
- O que acontece: os limites são **por conta**. Quem resolver o captcha em escala (há serviços pagos que fazem isso) cria contas e, em cada uma, lê 2 editais novos por mês (até ~R$ 7,50 cada, estimado em `valores.md` §3) e 12 guias por dia. Com `autoconfirm`, nem um e-mail real é preciso.
- Atenuante medido: o crédito da Anthropic é **pré-pago** — o prejuízo máximo é o saldo, não uma fatura aberta. Edital já lido não custa (cache).
- Correção sugerida: confirmar e-mail (SEG-03), teto **global** diário de gasto de IA no servidor (somando `uso_ia` de todos), alerta quando passar de X.
- Esforço: M

### [OPS-03] Alertas: só o vigia de hora em hora
- Severidade: S2
- Tipo: FALTANDO
- Onde: `.github/workflows/vigia.yml` (falha → e-mail do GitHub ao dono)
- O que acontece: existe o alerta "o site caiu" (vigia) e os erros do navegador (`erros_cliente`). Não há alerta para **falha da IA**, **gasto de IA**, **falha de pagamento** (não existe), nem para o banco perto do limite de 500 MB.
- Correção sugerida: o vigia passa a ler `uso_ia` (gasto do dia), o tamanho do banco e a taxa de erros das funções.
- Esforço: M

### [LGL-05] A Política e os Termos estão atrás do produto
- Severidade: S2 — beta: **PERGUNTAR AO LUCAS**
- Tipo: LEGAL / INCONSISTÊNCIA
- Onde: `privacidade.html` (atualizada em 20/06/2026), `termos.html` (30/07/2026)
- O que acontece:
  - o **Google** (entrada com Google) não aparece na lista de operadores (§4);
  - *"Mudanças relevantes serão comunicadas por e-mail"* — e o e-mail não chega (SEG-02);
  - *"destinado a maiores de 18"* × Termos *"16 anos ou mais"* (LGL-02);
  - o que **fica** depois da exclusão não está descrito (LGL-04);
  - os Termos dizem *"Existe um plano beta, concedido manualmente a testadores convidados"*, e a página inicial promete *"acesso gratuito e vitalício"* — o destino do beta está em aberto na especificação de planos (`historico/gap-analysis-planos.md`, pergunta 14).
- Correção sugerida: revisar os dois textos junto com a decisão de planos; versão e data no topo (alimenta LGL-01).
- Esforço: P

### [LGL-06] Provas antigas e materiais indicados: uso permitido?
- Severidade: S2 — **PERGUNTAR AO LUCAS** (precisa de opinião jurídica, não de código)
- Tipo: LEGAL
- Onde: `questoes` (1.980 publicadas, transcritas de provas oficiais); guia de estudo (links e resumos)
- O que acontece: as questões vêm de provas de concursos de bancas e forças armadas; o produto será pago. Banca, prova e ano são guardados por questão (a fonte é citável). O guia só **aponta** para materiais (link), não os copia.
- O que deveria acontecer: confirmar com quem entende de direito autoral se reproduzir questões de provas oficiais num produto pago é permitido, e citar a fonte de cada questão na tela (a Fase 4 confere se aparece).
- Esforço: — (decisão)

---

## S3 — polimento

### [SEG-07] Versões de bibliotecas
- Severidade: S3
- Tipo: SEGURANÇA (manutenção)
- Onde: funções do servidor — `jsr:@supabase/supabase-js@2` e `jsr:@supabase/functions-js@^2` (**versão maior flutuante**), `npm:@anthropic-ai/sdk@0.27.0` (antiga), `npm:resend@3.2.0`; site — `supabase-2.111.0.js` e `pdf.js 4.10.38` (fixos)
- O que acontece: não há `package.json`, então `npm audit` não se aplica. O pdf.js 4.10.38 está acima da correção do CVE-2024-4367 (4.2.67). **Não verifiquei** CVEs das outras versões.
- Correção sugerida: fixar versão exata nas funções; revisar o SDK da Anthropic numa sessão própria.
- Esforço: P

---

## Seção 15 — antes de declarar a Fase 2 concluída

| Pergunta | Resposta honesta |
|---|---|
| Percorri todos os itens das seções 8 e 9? | Sim. 8.3 (pagamentos) virou um item só, porque **nada** existe — cada sub-item seria "não existe". 9 "direito de arrependimento, renovação, cancelamento" idem (PAG-01). |
| Cada achado tem evidência? | Sim — teste no dev, config lida da produção ou arquivo:linha. A única exceção declarada é **SEG-03 (sequestro prévio): não reproduzido**, por falta de uma conta Google real controlada. |
| Testei com dados ou só li o código? | Testei: 69 ataques com dois usuários e anônimo, 7 envios de arquivo, 1 exclusão com uma vida de uso, 1 enxurrada. Lido sem testar: rate limit do login (o Supabase não expõe o limite de tentativas de senha por IP — só os campos `rate_limit_*` da config) e a vinculação de identidades do Google. |
| Alguma tela, tabela ou função que não abri? | `gerar-questoes` (desligada, 503 na produção), `notificar-cadastro` (só manda e-mail para o dono; o segredo do webhook foi confirmado nos Secrets, não testado por chamada), o painel do Supabase em si (MFA da conta do dono, quem tem acesso à organização) — **fora do alcance do repositório**. |
| Se o Lucas achar amanhã um problema que eu não registrei, por quê? | Mais provável: algo na **conta do dono** (Supabase, Vercel, GitHub, Google, Anthropic) — senha, 2FA, quem tem acesso —, que não dá para auditar daqui. Recomendação: ligar 2FA nas cinco. |

---

## O ambiente de desenvolvimento

| | |
|---|---|
| Projeto | `astral-dev` · ref `vtluuezwfpqgryixaaea` · organização "astral" · plano grátis · sa-east-1 |
| Tem | as 43 migrations + as 3 peças que faltavam nelas (OPS-01); 6 funções do servidor **sem chave de IA** |
| Usuários | **nenhum** (os de teste foram apagados no fim) |
| Custo | R$ 0. Projetos grátis pausam depois de ~7 dias sem uso |
| Para as próximas fases | a seção 13 pede usuários com históricos conhecidos — este é o lugar. Se não quiser mantê-lo, ele se apaga em um comando |
