# Roadmap de correção — da auditoria ao lançamento

> **02/10/2026** · Montado a partir de `RELATORIO-FINAL.md` (76 achados + NUM-14, achado em 02/10).
> Cada item traz o **ID do achado** (a evidência completa está no arquivo da fase), **o que fazer**,
> **os arquivos** e o **esforço** (**P** < 1 h · **M** 1–4 h · **G** > 4 h).
>
> **Como ler:** itens com a **mesma causa** estão agrupados e se corrigem juntos. 🚀 = **tem de estar
> pronto antes do lançamento pago**. ❓ = depende de decisão do Lucas (número da pergunta no
> relatório final, seção 7). 💰 = custa dinheiro (preço na mesma linha). ✅ = feito, com a data.
>
> **Ordem:** Lote 1 (os S0) → Lote 2 (S1 de menor esforço) → Lote 3 (o resto). Dentro de cada
> lote, a ordem é a de dependência.

---

## ✅ Já resolvido antes deste roadmap (01–02/10/2026)

A **função única de plano** e a **fonte única de estatísticas** (pedido dele, publicado em 02/10 —
`banco.md` 8.23, `tools/testa-fonte-unica.js`) fecharam, ou fecharam em parte:

| ID | O que foi | Situação |
|---|---|---|
| NUM-09 | nove formatos de hora | ✅ um só (`assets/js/formato.js`) |
| COD-04 | plano "premium" e os 5 selos de plano | ✅ `pintarSeloDoPlano()` |
| BAN-03 | mensagem do fim da amostra sem acento | ✅ |
| COD-03 | código morto | 🟡 parte: `ehCompleto`, `nomeDoPlano` saíram; o resto está no Lote 3 |
| NUM-05 | fuso do aparelho × Brasília | 🟡 parte: painel, cronômetro, cronograma (sessões), gráficos, diário e revisão usam o dia de SP; faltam o dia da semana do cronograma e os dias até a prova (Lote 3) |

---

## Lote 1 — os S0 (nenhum lançamento com S0 aberto) 🚀

| # | Itens | O que fazer | Arquivos | Esforço | Depende de |
|---|---|---|---|---|---|
| **1.1** 🚀 | **OPS-01** | Migration "zero", com data **anterior** a todas, criando o que só existe no painel: `perfis`, `lista_espera`, `criar_perfil_usuario()` e o gatilho em `auth.users` — tudo com `if not exists`/`create or replace`, sem efeito na produção. Provar subindo um banco **vazio** só com as migrations e comparando com a produção. O gatilho do webhook de leads entra sem o segredo (fica no banco; anotar como recriar) | `supabase/migrations/20260729000000_base_inicial.sql`, `tools/testa-migrations-do-zero.js` (novo) | M | — |
| **1.2** 🚀 | **OPS-02** | Backup **automático** diário. Primeiro passo, R$ 0 e sem dado saindo do computador dele: tarefa agendada do Windows rodando `tools/backup.js` todo dia, guardando os últimos 30 e avisando se falhar. Cópia **fora** do computador (nuvem) = decisão ❓ | `tools/agenda-backup.ps1` (novo), `tools/backup.js` | M | ❓ cópia fora do PC (GitHub criptografado, R$ 0 · ou Supabase Pro 💰 US$ 25/mês) |
| **1.3** 🚀 | **LGL-01** | Aceite **gravado** (quem, quando, versão dos Termos e da Política), para cadastro por e-mail **e** por Google: tabela `consentimentos` (RLS, só o próprio lê; grava só por função), `registrar_consentimento()`, `meu_consentimento()`; versão no topo dos Termos e da Política; quem entra sem aceite da versão atual vê a tela de aceite antes do app | migration nova; `assets/js/astral.js` (`exigirSessao`), `assets/js/consentimento.js` (novo), `criar-conta.html`, `login.html`, `termos.html`, `privacidade.html`; `tools/testa-consentimento.js` (novo) | M | — |
| **1.4** 🚀 | **EDI-01 + SEG-06** (mesma causa: custo de IA sem teto) | (a) A leitura que **chamou** a IA conta na janela mesmo se falhar; (b) **teto global** diário de chamadas de IA (todas as contas somadas), lido de **um** lugar (`regras_do_plano`/função própria), recusando com mensagem clara antes de gastar; (c) o teto e o gasto do dia visíveis para o vigia | `supabase/functions/_shared/comum.ts`, `processar-edital/index.ts`, migration (teto global), `tools/testa-trava-creditos.js` | P + M | — |
| **1.5** 🚀 | **PRO-01** | Reverter a simulação da conta do Lucas (`tools/simula-edital.js --reverter`) → crédito → **o 1º edital é dele** → medir custo e tempo reais → registrar em `valores.md` | — | P | ❓ pergunta 5 (quando reverter) · 💰 crédito US$ 5 · **depois do 1.4** |
| **1.6** 🚀 | **PAG-01** (+ NEG-02, jornadas 2/3/5, "cancele na sua conta") | Webhook do Mercado Pago com assinatura validada e idempotência; planos, trial, arrependimento (CDC 49), cancelar; tudo por `pode()`/`regras_do_plano` | `supabase/functions/` (novo webhook), migrations, `conta.html`, `index.html` | G (várias sessões) | ❓ as 14 perguntas de planos · 💰 Vercel Pro US$ 20/mês na 1ª cobrança · credenciais do Mercado Pago dele |

---

## Lote 2 — S1 de menor esforço (cada um < 1 h)

| # | Itens (mesma causa) | O que fazer | Arquivos | Esforço | 🚀 / ❓ |
|---|---|---|---|---|---|
| **2.1** | **SEG-02 + SEG-03** — e-mail não chega | SMTP do Gmail com senha de app → provar entrega → desligar a confirmação automática (`smtp-configura.ps1 -ExigirConfirmacao`) | config de autenticação | P | 🚀 · depende da **senha de app do Gmail** |
| **2.2** | **LGL-03 + LGL-04** — dados do aluno | `meus_dados()` no servidor com todas as tabelas; exclusão que apaga `lista_espera` pelo e-mail e anonimiza a auditoria; expurgo de `erros_cliente` > 12 meses | migration, `conta.html`, `excluir-conta/index.ts` | P | 🚀 · ❓ pergunta 2 (retenção da auditoria) |
| **2.3** | **NUM-03 + CRO-02** — dois domínios para a mesma matéria | Uma fonte só para o que a tela mostra e o que o cronograma usa (dizer "como você estava na segunda" ou usar o atual); o aviso de desequilíbrio só afirma o que confere; tirar o botão "Rebalancear" ou virar explicação | `dashboard.html`, `progresso.html`, `assets/js/plano.js` | P | 🚀 · ❓ pergunta 11 |
| **2.4** | **CRO-01** — matéria some em rotina curta | Rodízio: a matéria que ficou de fora numa semana entra na seguinte; o questionário avisa "sua rotina tem N sessões e o edital M matérias" | `assets/js/cronograma.js`, `assets/js/rotina.js` | P | 🚀 |
| **2.5** | **NUM-01** — Amplitude conta matéria fora do edital | Filtrar pelas matérias do edital em `ficha_do_usuario`; o servidor recusar sessão de matéria fora do edital (exceto "Geral") | migration | P | 🚀 |
| **2.6** | **NUM-02** — 5 condecorações contra a descrição | Relógio na Mão (livre + pomodoro), Duas Frentes (2 matérias no mês), Começo de Semana/Domingo de Serviço (dias distintos), Turno da Noite/Vigília (hora de início). **Nos dois lugares** (servidor e `condecoracoes.js`) até o COD-01 juntar | migration, `assets/js/condecoracoes.js` | P | 🚀 |
| **2.7** | **NUM-04** — cronômetro e cronograma não se enxergam | Sessão medida da matéria do bloco marca o bloco | `assets/js/cronograma.js` (`blocosDeHoje`) | P | 🚀 |
| **2.8** | **JOR-01** — patente desce | Patente do edital que não é degrau exato entra **no lugar** do degrau que casou; teste com os exemplos do prompt nas 6 carreiras | `assets/js/divisa.js` | P | 🚀 |
| **2.9** | **GAM-05** — Platina impossível | Doutrina só sobre matérias com Banco (ou 70 vale 100 nelas); tirar as de "retorno" da conta | migration, `assets/js/catalogo.js` | P | ❓ pergunta 10 |
| **2.10** | **CAL-01 + CAL-02** — calendário | Trocar de edital atualiza o evento `edital_prova`; "próximo evento" = o mais próximo; prova importada apagada não volta | `calendario.html`, `dashboard.html` | P | 🚀 (CAL-01) |
| **2.11** | **BAN-01 (despublicar) + BAN-02** — acervo | Despublicar as questões com símbolo perdido, alternativas repetidas e figura ausente (sem apagar); três checagens novas no `testa-acervo-limpo.js`; botão "reportar erro" na questão | `tools/arruma-acervo.js`, `tools/testa-acervo-limpo.js`, `banco.html`, migration | P + P | 🚀 · ❓ pergunta 6 |
| **2.12** | **PRO-02 (+ PRO-03, PRO-04, PRO-05)** — página inicial | Tirar ou reescrever as 5 promessas sem entrega, o "IA treinada", "30 segundos", TDAH, o cartão de exemplo; alinhar beta | `index.html`, `cadastro.html` | P | 🚀 · ❓ perguntas 4, 9 e 12 (é o que a landing promete — regra 8.1) |
| **2.13** | **NUM-14** (S2) — sequência velha | A sequência do topo e da ficha calculada na hora (`sequencia_do_usuario`), não a guardada | migration (`ficha_do_usuario`), `dashboard.html` | P | — |

---

## Lote 3 — o restante

### S1 de esforço M
| # | Itens | O que fazer | Arquivos | Esforço | 🚀 / ❓ |
|---|---|---|---|---|---|
| **3.1** | **CRN-01 + GAM-11 + GAM-10** — tempo medido | Cronômetro pela hora de início (não por tique); gravar ao sair com `keepalive`; avisar quando o servidor recusar; perguntar "ainda estudando?" a cada 50–60 min; servidor recusar sessão < 1 min | `cronometro.html`, migration | M | 🚀 (CRN-01) |
| **3.2** | **UX-01** — zeros falsos | Esqueleto ("—") enquanto carrega; erro que diz "seus dados estão guardados" | páginas da área logada | M | 🚀 |
| **3.3** | **EDI-02 + EDI-03** — corrigir a leitura | Editar matéria, peso e data; a IA devolver de onde veio o peso; botão "a leitura está errada" que invalida o cache | `dashboard.html`, `processar-edital/index.ts`, migration | M | 🚀 (EDI-02) |
| **3.4** | **BAN-01 (reimportar)** | Reimportar as provas da EEAR com os símbolos e os pares certos; conferir gabarito por amostra | `tools/importa-provas.js`, `tools/arruma-acervo.js` | M | — |
| **3.5** | **SEG-01** — tabela de erros aberta | Limite por origem e janela; expurgo | `registrar-erro/index.ts`, migration | M | 🚀 |
| **3.6** | **LGL-02** — menores | Idade no cadastro; aceite do responsável entre 16 e 17; alinhar Política e Termos | `criar-conta.html`, `login.html`, migration, `termos.html`, `privacidade.html` | M | 🚀 · ❓ pergunta 1 |
| **3.7** | **GAM-01 + GAM-12** — bônus da Instrução | Bônus gravado na sessão (só da escolha em diante); patente não desce; teto por ramo | migration, `habilidades.html` | M | ❓ pergunta 8 |
| **3.8** | **GAM-04** — folga | Dia de folga da rotina não quebra a sequência (ou textos honestos) | migration, `assets/js/diario.js`, catálogo | M | ❓ pergunta 7 |

### S2 e S3, agrupados pela causa
| # | Itens | O que fazer | Esforço | 🚀 / ❓ |
|---|---|---|---|---|
| **3.9** | **NUM-05 (resto) + NUM-06 + NUM-07** — dia e hora | Dia da semana do cronograma e dias até a prova pelo dia de SP; sessão conta no dia em que **começou**; "últimos 30" = 30 datas | M | — |
| **3.10** | **UX-02 + UX-03 + UX-08** — celular | Contraste dos botões ≥ 4,5:1; campos com 16 px; alvos de toque ≥ 24 px | P | 🚀 (UX-02, UX-03) |
| **3.11** | **NEG-03 + UX-06** — vitrine | Descrição, Open Graph, favicon, `robots.txt`, `sitemap.xml`, manifesto de PWA | P | 🚀 (NEG-03) |
| **3.12** | **GAM-02 + GAM-03 + GAM-06 + GAM-09 + GAM-13** — trapaça e segredo | Condecoração de sessão longa só com tempo medido; gabarito só depois da resposta; matérias do edital pelo servidor; divisa "Reintegrado" secreta; total de divisas só das possíveis | M | voltam a S1 se houver ranking |
| **3.13** | **GAM-07 + GAM-08** — escada e XP | Escada que não depende de como o edital escreve a patente; a tela dizer "+20 XP (ou +80 cronometrando)" | M | ❓ perguntas 13, 14 e 15 |
| **3.14** | **CRO-03 + CRO-04 + CRO-05 + EDI-04** — cronograma e leitura | Reta final e prova passada mudam o plano; semana manual avisa e inclui matéria nova; "Voltar ao automático" confirma; rotina inválida avisa; mensagem de falha clara | M | — |
| **3.15** | **OPS-03 + COD-02** — operação | Vigia lendo gasto de IA, tamanho do banco e erros das funções; bateria de testes no `astral-dev` | M | 🚀 (alerta de gasto) |
| **3.16** | **SEG-04 + SEG-05 + SEG-07** — sessão e senha | Texto honesto sobre a 1 h do token (ou `jwt_exp` menor); reautenticação para trocar senha; fixar versões das bibliotecas | P | — |
| **3.17** | **NEG-01 + NEG-04** — medir o negócio | Origem (UTM) no perfil, 4 eventos de funil numa tabela nossa; página de leitura para o administrador | M | ❓ pergunta 16 |
| **3.18** | **LGL-05 + LGL-06** — textos legais | Política e Termos em dia (Google como operador, retenção, beta); opinião jurídica sobre provas | P | 🚀 · ❓ pergunta 3 |
| **3.19** | **UX-04 + UX-05 + UX-07** — primeiro acesso e peso | Primeiro acesso só com o envio do edital; reduzir o peso de login/cadastro; lembretes (depois do SMTP) | M–G | ❓ pergunta 18 |
| **3.20** | **NUM-08 + NUM-11 + NUM-12 + NUM-13** — números menores | Uma média de domínio (ponderada); "estudada há N dias" pelo estudo mais recente; letras da semana sem ambiguidade; tag "em formação" com rótulo | P | — |
| **3.21** | **COD-01 + COD-03 (resto) + UX-09** — código | As 74 regras só no servidor; tirar `TABELAS_NIVEIS`, `ligacaoAcesa`, `comEspera`, `tagDe`, `meu_dominio`, `montarCronograma`, `progresso.badges`; aba "Missões" → "Conquistas" | M | — |
| **3.22** | **Fim da jornada** (jornada 7) | "Passei!": comemoração, depoimento, próximo concurso | M | ❓ pergunta 17 |

---

## O que tem de estar pronto antes do lançamento pago (🚀)

Lote 1 inteiro (1.1 a 1.6) · 2.1 · 2.2 · 2.3 · 2.4 · 2.5 · 2.6 · 2.7 · 2.8 · 2.10 (CAL-01) · 2.11 ·
2.12 · 3.1 · 3.2 · 3.3 · 3.5 · 3.6 · 3.10 · 3.11 · 3.15 (alerta de gasto) · 3.18 — e o checklist
da seção 8 do relatório final, item por item, com prova.

---

## Registro do que foi executado

*(cada item marcado aqui com a data, o teste que prova e o que ficou de fora)*
