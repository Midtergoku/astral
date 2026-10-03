# Roadmap de correção — da auditoria ao lançamento

> **Versão 2 — 02/10/2026, refeita com as respostas dele** (`RELATORIO-FINAL.md` § 11 e
> `historico/gap-analysis-planos.md` § 5). A versão 1, de antes das respostas, está no commit `cbef5f9`.
>
> Cada item traz o **ID do achado** (a evidência completa está no arquivo da fase), **o que fazer**,
> **os arquivos** e o **esforço** (**P** < 1 h · **M** 1–4 h · **G** > 4 h).
>
> **Como ler:** itens com a **mesma causa** estão agrupados e se corrigem juntos. 🚀 = **tem de estar
> pronto antes do lançamento pago**. ✔️ = decidido por ele em 02/10 (o número é o da pergunta).
> ❓ = ainda espera decisão dele. 💰 = custa dinheiro (preço na mesma linha). ✅ = feito, com a data.
>
> **Ordem:** Lote 1 (os S0) → Lote 2 (S1 de menor esforço + o funil) → Lote 3 (o resto) →
> **Lote 4 (o que precisa dele em cena — por último, ordem dele)**. Dentro de cada lote, a ordem é a
> de dependência. ~~O próximo bloco de trabalho é o 1.2b~~ — **02/10, 2ª rodada: o 1.2b foi para
> o Lote 4** (a senha precisa dele em cena, em 4 lugares). **O próximo bloco é o Lote 2.**
>
> ✏️ **03/10/2026 — ordem dele: "tudo que envolva dinheiro vai ser uma das últimas partes".** Os itens que
> custam (crédito da IA, pré-carga de editais, pagamento e Vercel Pro) foram para o **Lote 5**, depois do Lote 4.

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
| **1.1** 🚀 ✅ | **OPS-01** | Migration "zero" + provar o banco subindo vazio igual à produção. **Feito em 02/10** (registro no fim) | `supabase/migrations/20260729000000_base_inicial.sql`, `tools/testa-migrations-do-zero.js` | M | — |
| **1.2** 🚀 ✅ | **OPS-02** (parte local) | Backup diário agendado no PC dele, com aviso no `checa-saude` se parar. **Feito em 02/10** | `tools/agenda-backup.ps1`, `tools/backup.js`, `tools/checa-saude.js` | M | — |
| **1.2b** 🚀 ➡️ **4.3** | **OPS-02** (cópia fora do PC). **Movido para o Lote 4 em 02/10** — ele quer a senha em 4 lugares e "quando chegar a hora, você me avisa"; sem a senha guardada fora do PC, a cópia na nuvem não abre, então ela só vale com ele presente. O texto abaixo é o plano, mantido — ✔️ 19, opção A, *"desde que seja realmente seguro"* | Cópia diária num **repositório GitHub PRIVADO e separado** (nunca o do site, que é público). "Realmente seguro" quer dizer, e só se declara feito com as 5 provas: **(1)** cada cópia é **criptografada no PC antes de sair** (AES-256-GCM), e o GitHub só vê um arquivo ilegível — provado procurando um e-mail conhecido no arquivo enviado: 0 ocorrências; **(2)** a senha da criptografia **nunca** vai para nenhum repositório; **(3)** a senha precisa existir **também fora do PC** — senão, se o PC morrer, a cópia na nuvem não abre (é o único passo dele: guardar uma senha no gerenciador de senhas do Google, ~1 min); **(4)** **restauração provada**: baixar a cópia da nuvem numa pasta nova, decifrar e restaurar no `astral-dev` com o `testa-restauracao.js`; **(5)** tamanho sob controle: ~2 MB por cópia, guardando **só as últimas 30** (~60 MB), sem acumular ~730 MB/ano no histórico. O acesso ao GitHub usa a credencial que o `git` já tem no PC (o `gh` não está instalado). O `checa-saude` passa a avisar se a cópia da nuvem envelhecer | `tools/backup.js`, `tools/backup-nuvem.js` (novo), `tools/agenda-backup.ps1`, `tools/checa-saude.js` | M | R$ 0 · ele guardar a senha (1 min) |
| **1.3** 🚀 ✅ | **LGL-01** | Aceite gravado (quem, quando, versão), para e-mail **e** Google. **Feito em 02/10** | `assets/js/consentimento.js`, migration, `tools/testa-consentimento.js` | M | — |
| **1.4** 🚀 ✅ | **EDI-01 + SEG-06** | Leitura que custou e falhou conta; teto global diário. **Feito em 02/10.** ✔️ 20: números confirmados (10 editais / 60 guias / 100 questões); **rever depois do 1º edital dele, com custo medido** | `_shared/comum.ts`, migration `20261002110000` | P + M | — |
| **1.5** 🚀 ⏸️ ➡️ **5.1** | **PRO-01** | Reverter a simulação da conta dele → **o 1º edital é dele** → medir custo e tempo reais → `valores.md`. ✔️ 5: **só no dia em que ele avisar do crédito** | `tools/simula-edital.js --reverter` | P | 💰 crédito US$ 5 · aviso dele |
| **1.6** 🚀 ⏸️ ➡️ **5.3** | **PAG-01** (+ NEG-02, "cancele na sua conta") | Webhook do Mercado Pago com assinatura validada e idempotência; planos, trial, arrependimento (CDC 49), cancelar; tudo por `pode()`/`regras_do_plano`. ✔️ **As 14 perguntas de planos estão respondidas** (`gap-analysis-planos.md` § 5). **Antes dele: o 3.6** (menor de 16–17 só paga com o responsável) | `supabase/functions/` (novo webhook), migrations, `conta.html`, `index.html` | G (várias sessões) | credenciais do Mercado Pago dele · 💰 Vercel Pro US$ 20/mês na 1ª cobrança |

---

## Lote 2 — S1 de menor esforço (cada um < 1 h) + o funil

| # | Itens (mesma causa) | O que fazer | Arquivos | Esforço | 🚀 / decisão |
|---|---|---|---|---|---|
| ~~2.1~~ | SEG-02 + SEG-03 | **Movido para o fim (4.1)** — ✔️ 21: *"vamos deixar ela por último"* | — | — | — |
| **2.2** ✅ | **LGL-03 + LGL-04** — dados do aluno | `meus_dados()` no servidor com todas as tabelas; exclusão que apaga `lista_espera` pelo e-mail e **anonimiza o e-mail na auditoria**; expurgo de `erros_cliente` > 12 meses | migration, `conta.html`, `excluir-conta/index.ts` | P | 🚀 · ✔️ 2 |
| **2.3** ✅ | **NUM-03 + CRO-02** — dois domínios para a mesma matéria | Uma fonte só para o que a tela mostra e o que o cronograma usa; o aviso de desequilíbrio só afirma o que confere; o botão "Rebalancear" **vira o texto** *"seu cronograma se ajusta sozinho toda segunda"* | `dashboard.html`, `progresso.html`, `assets/js/plano.js` | P | 🚀 · ✔️ 11 |
| **2.4** ✅ | **CRO-01** — matéria some em rotina curta | Rodízio: a matéria que ficou de fora numa semana entra na seguinte; o questionário avisa "sua rotina tem N sessões e o edital M matérias" | `assets/js/cronograma.js`, `assets/js/rotina.js` | P | 🚀 |
| **2.5** | **NUM-01** — Amplitude conta matéria fora do edital | Filtrar pelas matérias do edital em `ficha_do_usuario`; o servidor recusar sessão de matéria fora do edital (exceto "Geral") | migration | P | 🚀 |
| **2.6** | **NUM-02** — 5 condecorações contra a descrição | Relógio na Mão (livre + pomodoro), Duas Frentes (2 matérias no mês), Começo de Semana/Domingo de Serviço (dias distintos), Turno da Noite/Vigília (hora de início). **Nos dois lugares** (servidor e `condecoracoes.js`) até o COD-01 juntar | migration, `assets/js/condecoracoes.js` | P | 🚀 |
| **2.7** | **NUM-04** — cronômetro e cronograma não se enxergam | Sessão medida da matéria do bloco marca o bloco | `assets/js/cronograma.js` (`blocosDeHoje`) | P | 🚀 |
| **2.8** | **JOR-01** — patente desce | Patente do edital que não é degrau exato entra **no lugar** do degrau que casou; teste com os exemplos do prompt nas 6 carreiras | `assets/js/divisa.js` | P | 🚀 |
| **2.9** | **GAM-05** — Platina impossível | **Consertar a regra**: Doutrina só sobre matérias com Banco (ou 70 vale 100 nelas); tirar as de "retorno" da conta | migration, `assets/js/catalogo.js` | P | ✔️ 10 |
| **2.10** | **CAL-01 + CAL-02** — calendário | Trocar de edital atualiza o evento `edital_prova`; "próximo evento" = o mais próximo; prova importada apagada não volta | `calendario.html`, `dashboard.html` | P | 🚀 (CAL-01) |
| **2.11** | **BAN-01 (despublicar) + BAN-02** — acervo | **Despublicar já** as quebradas (símbolo perdido, alternativas trocadas, figura ausente), sem apagar; as checagens 6 a 9 de `historico/revisao-de-questoes.md` no `testa-acervo-limpo.js`; o campo `revisao` passa a dizer **o que** foi conferido; botão "reportar erro" na questão | `tools/arruma-acervo.js`, `tools/testa-acervo-limpo.js`, `banco.html`, migration | P + P | 🚀 · ✔️ 6 |
| **2.12** | **PRO-02 + PRO-03 (TDAH)** — página inicial | **Tirar as 5 promessas sem entrega** (✔️ 9) e trocar "feito para quem tem TDAH" por **"para quem tem dificuldade de foco"** (✔️ 12). Cada uma tem destino: *cronograma pelo tempo até a prova* volta com o **3.14**; *cancele na sua conta* volta com o **1.6**; *lembretes* volta com o **4.2** (sem o "aprendem com seus hábitos"); *"concurseiros na lista de espera"* volta como **contador real** quando houver gente; *subtópicos* **sai de vez**. **Textos do beta: não mexer** (✔️ 4, beta parado). **Tirar também os 3 exageros** — "em 30 segundos", "IA treinada" e o cartão de exemplo "Nível 12 — Cadete" (✔️ 02/10, 2ª rodada: *"pode tirar as três"*) | `index.html`, `cadastro.html` | P | 🚀 · ✔️ 9, 12 |
| **2.13** | **NUM-14** (S2) — sequência velha | A sequência do topo e da ficha calculada na hora (`sequencia_do_usuario`), não a guardada | migration (`ficha_do_usuario`), `dashboard.html` | P | — |
| **2.14** | **NEG-01** — o funil (subiu do Lote 3) | Origem do cadastro (UTM) no perfil + 4 eventos numa tabela nossa (cadastro → edital → rotina → 1ª sessão), com RLS. **R$ 0**, sem ferramenta de fora. ✔️ 16: *"comece agora"* — muda a decisão de 08/09 de guardar para depois da Fase 1 | migration, `assets/js/astral.js`, `criar-conta.html` | M | ✔️ 16 |

| **2.15** | **CE-09** + o pedido dele de 30/09 (revelação honesta) — **novo, 03/10** | Medido no código em 03/10: enquanto o pedido corre, a tela diz *"Lendo seu edital. Extraindo matérias, calculando pesos…"* (`dashboard.html:1282`) **mesmo quando o edital já estava guardado** e nada é lido; e a revelação diz *"Guia de professores: sendo montado agora"* (`dashboard.html:1812`) **mesmo quando o guia já existe**. O servidor sabe a diferença (`processar-edital/index.ts:210`, o caminho do guardado) mas não a conta à tela. Fazer: o servidor devolver `guardado: true`; edital guardado **não** mostra "lendo" — mostra direto as linhas com o dado real; guia guardado diz "pronto". Edital novo continua com o texto verdadeiro de leitura. Ele, 03/10: *"lá não vai dizer que você está carregando, está lendo o edital, nem nada. Vai aparecer algumas informações"* | `processar-edital/index.ts`, `dashboard.html` | P | 🚀 · R$ 0 |

---

## Lote 3 — o restante

### S1 de esforço M
| # | Itens | O que fazer | Arquivos | Esforço | 🚀 / decisão |
|---|---|---|---|---|---|
| **3.1** | **CRN-01 + GAM-11 + GAM-10** — tempo medido | Cronômetro pela hora de início (não por tique); gravar ao sair com `keepalive`; avisar quando o servidor recusar; perguntar "ainda estudando?" a cada 50–60 min; servidor recusar sessão < 1 min | `cronometro.html`, migration | M | 🚀 (CRN-01) |
| **3.2** | **UX-01** — zeros falsos | Esqueleto ("—") enquanto carrega; erro que diz "seus dados estão guardados" | páginas da área logada | M | 🚀 |
| **3.3** | **EDI-02 + EDI-03** — corrigir a leitura | Editar matéria, peso e data; a IA devolver de onde veio o peso; botão "a leitura está errada" que invalida o cache | `dashboard.html`, `processar-edital/index.ts`, migration | M | 🚀 (EDI-02) |
| **3.4** | **BAN-01 (reimportar)** | Reimportar as provas da EEAR com os símbolos e os pares certos, **passando pela lista de `historico/revisao-de-questoes.md`** | `tools/importa-provas.js`, `tools/arruma-acervo.js` | M | — |
| **3.5** | **SEG-01** — tabela de erros aberta | Limite por origem e janela; expurgo | `registrar-erro/index.ts`, migration | M | 🚀 |
| **3.6** | **LGL-02** — menores | **Idade mínima 16** nos Termos e na Política; data de nascimento no cadastro (e-mail e Google); 16 e 17 usam o grátis; **para pagar, confirmação do responsável**. **Tem de vir antes do 1.6** | `criar-conta.html`, `login.html`, migration, `termos.html`, `privacidade.html` | M | 🚀 · ✔️ 1 |
| **3.7** | **GAM-01 + GAM-12** — bônus da Instrução | Bônus gravado na sessão (**só da escolha em diante**); "Recomeçar" não desce a patente; teto por ramo | migration, `habilidades.html` | M | ✔️ 8 |
| **3.7b** | **Troca de edital** — novo (✔️ 02/10, 2ª rodada) | **Não zerar a patente.** Ela já passa sozinha para o degrau equivalente da carreira nova; falta **a tela de "Transferência"** no momento da troca: *"Você foi transferido para a Aeronáutica como 3º Sargento"*, dizendo o que fica (XP, horas, condecorações) e o que recomeça (domínio das matérias novas). Ele: *"Português e Matemática servem para os dois concursos (...) a prova pode ter sido cancelada, ela não passou (...) pode ficar chateada mesmo"* | `dashboard.html` (troca de edital), `assets/js/divisa.js` | P | ✔️ |
| **3.8** | **GAM-04** — folga | O dia de folga **planejado na rotina não quebra** a sequência | migration, `assets/js/diario.js`, catálogo | M | ✔️ 7 |

### S2 e S3, agrupados pela causa
| # | Itens | O que fazer | Esforço | 🚀 / decisão |
|---|---|---|---|---|
| **3.9** | **NUM-05 (resto) + NUM-06 + NUM-07** — dia e hora | Dia da semana do cronograma e dias até a prova pelo dia de SP; sessão conta no dia em que **começou**; "últimos 30" = 30 datas | M | — |
| **3.10** | **UX-02 + UX-03 + UX-08** — celular | Contraste dos botões ≥ 4,5:1; campos com 16 px; alvos de toque ≥ 24 px | P | 🚀 (UX-02, UX-03) |
| **3.11** | **NEG-03 + UX-06** — vitrine | Descrição, Open Graph, favicon, `robots.txt`, `sitemap.xml`, manifesto de PWA | P | 🚀 (NEG-03) |
| **3.12** | **GAM-02 + GAM-03 + GAM-06 + GAM-09 + GAM-13** — trapaça e segredo | Condecoração de sessão longa só com tempo medido; gabarito só depois da resposta; matérias do edital pelo servidor; divisa "Reintegrado" secreta; total de divisas só das possíveis | M | voltam a S1 se houver ranking |
| **3.13** | **GAM-07 + GAM-08** — escada e XP | **A mesma hora vale o mesmo XP**, cronometrada ou marcada (✔️ 13); a escada **dura até a prova**, não ~10 semanas (✔️ 14); passagem praça → oficial por XP **fica** (✔️ 15); escada que não depende de como o edital escreve a patente | M | ✔️ 13, 14, 15 |
| **3.14** | **CRO-03 + CRO-04 + CRO-05 + EDI-04** — cronograma e leitura | Reta final e prova passada mudam o plano (**devolve a promessa "cronograma pelo tempo até a prova"**); semana manual avisa e inclui matéria nova; "Voltar ao automático" confirma; rotina inválida avisa; mensagem de falha clara | M | — |
| **3.15** | **OPS-03 + COD-02** — operação | Vigia lendo gasto de IA, tamanho do banco e erros das funções; bateria de testes no `astral-dev` | M | 🚀 (alerta de gasto) |
| **3.16** | **SEG-04 + SEG-05 + SEG-07** — sessão e senha | Texto honesto sobre a 1 h do token (ou `jwt_exp` menor); reautenticação para trocar senha; fixar versões das bibliotecas | P | — |
| **3.17** | **NEG-04** — painel de negócio | Página de leitura para o administrador, sobre os eventos do **2.14** | M | — |
| **3.18** | **LGL-05 + LGL-06** — textos legais | Política e Termos em dia (Google como operador, retenção, idade 16); **fonte (banca, prova e ano) visível em cada questão**; sem advogado antes do lançamento, salvo se ele quiser (✔️ 3 — Lei 9.610, art. 8º, IV). 02/10, 2ª rodada: *"futuramente a gente vê (...) eu tenho alguns contatos, eu pergunto para alguns advogados"* — **lembrar a ele quando este item chegar** | P | 🚀 · ✔️ 3 |
| **3.19** | **UX-04 + UX-05** — primeiro acesso e peso | **Primeiro acesso só com o envio do edital** (✔️ 18); reduzir o peso de login/cadastro | M | ✔️ 18 |
| **3.20** | **NUM-08 + NUM-11 + NUM-12 + NUM-13** — números menores | Uma média de domínio (ponderada); "estudada há N dias" pelo estudo mais recente; letras da semana sem ambiguidade; tag "em formação" com rótulo | P | — |
| **3.21** | **COD-01 + COD-03 (resto) + UX-09 + RED-02** — código | As 74 regras só no servidor; tirar `TABELAS_NIVEIS`, `ligacaoAcesa`, `comEspera`, `tagDe`, `meu_dominio`, `montarCronograma`, `progresso.badges`; aba "Missões" → "Conquistas"; o Quadro de operações vira aba de Conquistas, **sem esconder nada no grátis** (✔️ P11) | M | ✔️ P11 |
| **3.22** | **Fim da jornada** (jornada 7) | "Passei!": comemoração, depoimento, manter a conta para o próximo concurso | M | ✔️ 17 |
| **3.23** | **Edital guardado — reaproveitar sem o aluno perceber** (CE-01, CE-02, CE-05) — **reescrito em 03/10** | ✏️ **Correção dele em 03/10 — eu tinha escrito errado ("uma lista de editais prontos em que o aluno escolhe o concurso"). NÃO existe lista e o aluno não escolhe nada.** Como é: *"uma pessoa subiu o edital (...) o guia de estudos e o peso das matérias vai ser guardado. Quando outra pessoa também subir, ela vai fazer o mesmo processo (...) e o nosso sistema vai identificar que é o mesmo edital (...) e só vai pegar essas informações que ele já tem e jogar para o aluno. Vai ser muito mais rápido (...) e a gente não vai gastar dinheiro"*. **O que já existe (29/09):** isso, quando o arquivo é **idêntico** (`editais_lidos`, `guias_por_edital`). **O que falta, R$ 0:** reconhecer o mesmo edital quando o **arquivo** muda (baixado de outro site, salvo de novo) — é a pergunta **P6**, com lembrete automático aos 20 editais reais; e a retificação virar versão nova ligada à anterior (CE-05). A **pré-carga** (ele financia, eu subo) é o **5.2**. **Condição do beta** (✔️ 4) e de trocas ilimitadas no Pro (✔️ P2) | 1–2 sessões | ✔️ 4, P6 · R$ 0 |
| **3.24** | **CE-08** — links do guia toda semana — **novo** | Job semanal com a API do YouTube (chave do Google, cota grátis, R$ 0); **testado antes de lançar** (✔️ P8) | 1 sessão | 🚀 · ✔️ P8 |

---

## Lote 4 — o que precisa dele em cena (por último, ordem dele)

> ✔️ 21: *"primeiro fazemos o que você pode fazer e depois eu entro em cena e você me ajuda a criar."*

| # | Itens | O que fazer | Esforço | 🚀 |
|---|---|---|---|---|
| **4.1** | **SEG-02 + SEG-03** — e-mail não chega | Ele cria a senha de app do Gmail (com a verificação em duas etapas ligada), eu guio passo a passo → `smtp-configura.ps1 -Aplicar` → provar entrega → `-ExigirConfirmacao`. **R$ 0.** ⚠️ Até aqui, dá para criar conta com o e-mail de outra pessoa (SEG-03): por isso fica **antes** do lançamento pago | P | 🚀 |
| **4.3** | **OPS-02** — cópia do backup fora do PC (era o 1.2b; o plano das 5 provas está lá) | Ele quer a senha guardada em **4 lugares**: no computador, no celular dele, no celular de outra pessoa de confiança e **no papel** (*"isso a gente não pode perder de jeito nenhum"*). Quem tem só a senha não abre nada: precisa **também** do acesso ao repositório privado — são duas trancas | M | 🚀 |
| **4.2** | **UX-07** — lembretes | Lembrete simples por e-mail (estudo do dia, sequência em risco) — **depende do 4.1**. Devolve a promessa de lembretes da página inicial, **sem** "aprendem com seus hábitos" | M | — |

---

## Lote 5 — o que custa dinheiro (por último, ordem dele em 03/10)

> *"Tudo que envolva dinheiro vai ser uma das últimas, das últimas partes, ok?"*

| # | Itens | O que fazer | Custo | 🚀 |
|---|---|---|---|---|
| **5.1** | **PRO-01** (era o 1.5) | Ele avisa do crédito → reverter a simulação da conta dele → **o 1º edital é dele** → medir custo e tempo reais → `valores.md` → rever os números do teto (1.4) com o custo medido | 💰 crédito US$ 5 | 🚀 |
| **5.2** | **Pré-carga dos concursos** (era parte do 3.23) | Deixar edital **e** guia de professores guardados antes de os alunos chegarem. Ele: *"para mim é o mesmo você enviar os editais. Aí eu só coloco o dinheiro"* — eu subo, por ferramenta minha que não esbarra nas travas de aluno (2 editais em 30 dias, teto de 10 por dia); ele põe o crédito conforme tiver. Depois do 3.23, para que o reaproveitamento já reconheça o edital | 💰 ~R$ 4,00 a 6,75 por concurso, **estimado** (`valores.md` §3) — medir no 5.1 | — |
| **5.3** | **PAG-01** (era o 1.6) | Pagamento pelo Mercado Pago (webhook com assinatura, planos, trial, arrependimento, cancelar). Antes dele, o **3.6** (menor de 16–17 só paga com o responsável) | 💰 Vercel Pro US$ 20/mês na 1ª cobrança + taxa do MP por venda (`valores.md` §9) | 🚀 |

---

## O que tem de estar pronto antes do lançamento pago (🚀)

Lote 1 inteiro (1.1 a 1.6) · **4.3** (era o 1.2b) · 2.2 · 2.3 · 2.4 · 2.5 · 2.6 · 2.7 · 2.8 · 2.10 (CAL-01) ·
2.11 · 2.12 · 3.1 · 3.2 · 3.3 · 3.5 · **3.6 (antes do 1.6)** · 3.10 · 3.11 · 3.15 (alerta de gasto) ·
3.18 · **3.24** · **4.1** — e o checklist da seção 8 do relatório final, item por item, com prova.

## O que ainda espera ele (❓) — fora isso, está tudo decidido

> ✔️ **02/10, 2ª rodada — respondidas:** não zerar a patente (vira a tela de Transferência, 3.7b) ·
> tirar os 3 exageros (2.12) · advogado fica para depois, ele pergunta aos contatos (3.18).
> **Pedido dele, que vale para todo o roadmap:** *"as coisas que você gravou, conforme elas vão
> chegando na etapa, você vai me lembrando"*.

| O quê | Onde |
|---|---|
| Guardar a senha da cópia do backup em 4 lugares (PC, celular dele, celular de alguém de confiança, papel) | 4.3 |
| Avisar do crédito (US$ 5) | 1.5 |
| Credenciais do Mercado Pago; Vercel Pro US$ 20/mês na 1ª cobrança | 1.6 |
| Senha de app do Gmail (ele quis por último) | 4.1 |

---

## Registro do que foi executado

*(cada item marcado aqui com a data, o teste que prova e o que ficou de fora)*

### Lote 1 — 02/10/2026

| # | Situação | O que foi feito | Como foi provado | O que ficou de fora |
|---|---|---|---|---|
| **1.1** | ✅ | Migration `20260729000000_base_inicial` (protegida: na produção não mudou nada — *"perfis already exists, skipping"*); `tools/recria-webhook-lista.js` para o aviso de lead (com segredo, fora do git); `tools/testa-migrations-do-zero.js` | No `astral-dev` **esvaziado**: as **46** migrations rodaram sem erro e a estrutura ficou **igual à produção em 581 peças** (tabelas, colunas, restrições, índices, políticas, grants, funções pelo texto inteiro, gatilhos). O webhook recriado e um lead de teste disparou a chamada | Nada. Achou de passagem um erro meu da Fase 2 (faltava `perfis_tipo_plano_check` no dev) |
| **1.2** | 🟡 | Tarefa do Windows **"Astral - backup diario"** (21h, ou ao ligar o PC), `tools/agenda-backup.ps1`; o `backup.js` grava `ultimo-backup.json`; o `checa-saude` avisa se o backup tiver mais de 2 dias ou tiver falhado | A tarefa rodou pela própria agenda: **código 0, 2.807 linhas**. O `checa-saude` acusou um backup de 4 dias e um que falhou (registro trocado por um instante e devolvido) | ❓ **Cópia fora do computador** (GitHub criptografado, R$ 0, ou Supabase Pro, US$ 25/mês). Nada é apagado: ~2 MB por cópia |
| **1.3** | ✅ | `consentimentos` + `versoes_vigentes/registrar_consentimento/meu_consentimento` (migration `20261002100000`); a tela de aceite no `exigirSessao` (`assets/js/consentimento.js`); "Cadastrar com Google" passa a exigir a caixa; o aceite marcado no cadastro é gravado ao entrar | `testa-consentimento.js` **15/15** (dev e produção): versão do documento = do banco; versão velha recusada; ninguém lê nem grava o aceite de outro; a tela aparece e trava até marcar; aceitar grava e não pergunta de novo; Google sem a caixa não sai da página; pendente de **outra** conta não vale; "Sair" sai | As 7 contas reais veem a tela de aceite **uma vez**. Menores (LGL-02) continuam no Lote 3 |
| **1.4** | ✅ | Teto global (`teto_global_de_ia`, `uso_de_ia_hoje`, migration `20261002110000`); `ctx.ia()` em toda chamada à Anthropic; leitura que custou e falhou passa a contar; `checa-saude` mostra o uso do dia | No dev, com uma **"IA de mentira"** (custo zero): não-PDF não conta; resposta inútil **conta**; a 3ª leitura cai na janela (429) antes da IA; teto do dia cheio recusa até conta nova; só a chave de serviço lê o uso global. Na produção: `testa-trava-creditos` passou | 💰 **Os números do teto (10 editais, 60 guias, 100 questões por dia) são escolha minha — confirmar** (`historico/valores.md` § 13) |
| **1.5** | ⏸️ | — | — | Depende do crédito (US$ 5) e da pergunta 5. **O 1º edital é do Lucas**. O pré-requisito (1.4) está feito |
| **1.6** | ⏸️ | — | — | Depende das 14 perguntas de planos, da Vercel Pro (US$ 20/mês) e das credenciais do Mercado Pago dele |

#### Reauditoria do Lote 1 — 02/10/2026, pelos critérios do `PROMPT-auditoria.md` (§ 1 e § 15)

**Cada correção, com evidência medida na produção depois de publicar (commit `ba410a7`):**

| Item | Fluxo rastreado | Evidência |
|---|---|---|
| 1.1 | migrations → banco vazio → comparação com a produção | `testa-migrations-do-zero` passou **duas vezes** (sozinho e dentro da bateria): 46 migrations, 581 peças iguais |
| 1.2 | tarefa do Windows → `backup.js` → `ultimo-backup.json` → `checa-saude` | `agenda-backup.ps1 -Ver`: estado *Ready*, última execução código 0, próxima 21h; `checa-saude`: *"backup automático em dia (há 0 h, 2807 linhas)"* |
| 1.3 | cadastro / Google → aceite pendente → `exigirSessao` → `registrar_consentimento` → tabela | `testa-consentimento` **15/15 na produção**. Consulta: RLS ligada; `authenticated` **não** insere direto; `anon` não lê nem chama a função; versões vigentes = `{termos 2026-07-30, política 2026-06-20}`; **0 aceites gravados e 7 contas reais** que verão a tela uma vez. 17 páginas passam pelo portão; a única logada fora dele é `redefinir-senha.html` — de propósito: quem redefine é mandado ao `dashboard`, que tem o portão |
| 1.4 | função → `ctx.ia()` → `conferirTetoGlobal` → `uso_de_ia_hoje` → Anthropic | `grep`: as **4** chamadas a `messages.create` (buscar-recursos ×2, gerar-questoes, processar-edital) estão **todas** dentro de `ctx.ia()`, nenhuma fora. `uso_de_ia_hoje` e `teto_global_de_ia`: `anon` e `authenticated` **não** executam (só a chave de serviço). Segredos da produção: só `ANTHROPIC_API_KEY` — a `ANTHROPIC_BASE_URL` da "IA de mentira" **nunca** foi para lá. `checa-saude`: *"IA hoje: 0/100 · 0/60 · 0/10"*; `testa-trava-creditos` OK |

**Nada mais foi afetado — a bateria inteira, 59 testes contra a produção:**

| Resultado | Testes |
|---|---|
| ✅ passaram de primeira | 57 |
| ⚠️ `testa-links` | falhou 1 vez (o YouTube respondeu diferente naquele instante — o cabeçalho do teste avisa disso); **12/12 ao repetir**. O Lote 1 não mexeu em `links.ts` (`git diff` vazio) |
| ⚠️ `testa-celular` | estourou os 6 min. **Defeito do teste, não do site:** ele finge o servidor devolvendo `[]` para tudo, e `[]` não diz "aceito" — a tela de aceite ficava por cima de cada página. Consertado com `fingirAceite()` em `tools/testes/aceite-de-teste.js`: **passou em 2m20** |
| 🔎 `testa-botoes` | passava, mas pelo mesmo motivo **via só 159 de 254 botões**. Com o conserto vê os 254. Os 8 "mortos" do TAF são o balão nativo de campo obrigatório (`required`) e **já apareciam antes do Lote 1** — medido rodando o teste no commit `cbef5f9` |

**§ 15 — respostas honestas:** percorri os 4 itens executados e os 2 parados; cada linha acima tem
comando ou consulta; testei com contas e dados reais na produção, não só lendo código. O que **não**
testei: a tela de aceite num celular de verdade (só no navegador emulado) e uma leitura de edital real
(1.5, sem crédito). **Se o Lucas achar um problema amanhã, o mais provável é a tela de aceite numa das
7 contas reais com algum estado que as contas de teste não têm** — por isso o portão deixa passar quando
a rede falha (*"exigido de quem o servidor diz que não aceitou, não de quem a rede falhou"*).

### Lote 2 — execução

| # | Data | O que foi feito | Como foi provado | Observação |
|---|---|---|---|---|
| **2.2** ✅ | 03/10/2026 | `meus_dados()` no servidor (14 tabelas + lista de espera + histórico de plano; antes eram 4); gatilho `ao_excluir_conta` em `auth.users` que apaga a inscrição na lista de espera e tira e-mail e nome da auditoria — inclusive da linha `lead_removido` que o próprio delete cria; expurgo diário (`pg_cron`, 03:15 de SP) dos erros com mais de 12 meses; `excluir-conta` sem e-mail no log; `conta.html` exporta pelo servidor e diz o que sai e o que fica. Migration `20261003100000` | `tools/testa-dados-do-aluno.js` **17/17 no dev e na produção**, com as 12 tabelas semeadas (o teste FALHA se uma tabela ficar sem semente ou fora do pacote); exclusão pelo botão de verdade; arquivo baixado pelo navegador; `testa-migrations-do-zero`: igual à produção | 🔴 A 1ª execução na produção mandou **1 e-mail falso** de "novo cadastro" ao Lucas (o teste inscreve um lead). Consertado: `notificar-cadastro` ignora `@astral-teste.local` — provado em `net._http_response`. Ver `erros.md` |
| **2.3** ✅ | 03/10/2026 | O aviso "Domínio desequilibrado" só diz *"o cronograma desta semana já dá mais tempo a ela"* se a semana montada de fato dá; senão diz que o ajuste vem toda segunda (o cronograma usa de propósito o domínio de segunda — decisão dele). O botão "Rebalancear cronograma", que gravava um cronograma que o painel nunca lia, virou *"Seu cronograma se ajusta sozinho toda segunda · ver a semana"*; a janela de sugestões (com a 2ª conta de prioridade) saiu | No `astral-dev`, com os usuários da auditoria: no `desequilibrado` a semana dá **120 min a Português e 80 a Física** — a frase antiga era falsa, a nova aparece; o mesmo no `constante`; 0 erro de JS nas 2 telas × 4 usuários. Regressão: botoes, chefe, diario-tela, guia, missoes-tela, revelacao-tela — 6/6 | O caminho "a semana já dá mais tempo" não apareceu em nenhum usuário de teste (nenhum tem o alvo liderando a semana) — a conta que decide é a mesma de `montarSemana` |
| **2.4** ✅ | 03/10/2026 | Rotina curta (menos blocos que matérias): metade dos blocos vai para as de maior necessidade, o resto **roda** por uma lista fixa, andando uma vez por semana (`numeroDaSemana`, virada à meia-noite de segunda em SP). `cronograma.html` só diz *"toda matéria aparece"* quando é verdade e, senão, diz quais ficaram fora desta semana; o questionário avisa *"seu edital tem 9 matérias e a semana, 3 sessões: elas vão se revezar"* | A simulação de 52 semanas da auditoria, antes × depois: 1 dia de 1 h — História, Geografia e Informática **NUNCA** → toda matéria volta em até **4 semanas**; 2 dias de 1 h — Informática esperava **47** → até 4; 1 dia de 30 min — **7 de 9 nunca** → até 8. Rotina padrão: **idêntica**. `testa-cronograma.js` ganhou a seção 1b (6 checagens); tela e questionário conferidos no dev; regressão: cronograma, sessao-cronograma, relogio, chefe, revelacao-tela, celular — 6/6 | Com 1 bloco só por semana não há matéria fixa: a mais pesada também espera a vez (até 8 semanas). Rotina assim é extrema — o aviso do questionário existe para a pessoa ver antes |
