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
> de dependência. **O próximo bloco de trabalho é o 1.2b**, e depois o Lote 2.

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
| **1.2b** 🚀 | **OPS-02** (cópia fora do PC) — ✔️ 19, opção A, *"desde que seja realmente seguro"* | Cópia diária num **repositório GitHub PRIVADO e separado** (nunca o do site, que é público). "Realmente seguro" quer dizer, e só se declara feito com as 5 provas: **(1)** cada cópia é **criptografada no PC antes de sair** (AES-256-GCM), e o GitHub só vê um arquivo ilegível — provado procurando um e-mail conhecido no arquivo enviado: 0 ocorrências; **(2)** a senha da criptografia **nunca** vai para nenhum repositório; **(3)** a senha precisa existir **também fora do PC** — senão, se o PC morrer, a cópia na nuvem não abre (é o único passo dele: guardar uma senha no gerenciador de senhas do Google, ~1 min); **(4)** **restauração provada**: baixar a cópia da nuvem numa pasta nova, decifrar e restaurar no `astral-dev` com o `testa-restauracao.js`; **(5)** tamanho sob controle: ~2 MB por cópia, guardando **só as últimas 30** (~60 MB), sem acumular ~730 MB/ano no histórico. O acesso ao GitHub usa a credencial que o `git` já tem no PC (o `gh` não está instalado). O `checa-saude` passa a avisar se a cópia da nuvem envelhecer | `tools/backup.js`, `tools/backup-nuvem.js` (novo), `tools/agenda-backup.ps1`, `tools/checa-saude.js` | M | R$ 0 · ele guardar a senha (1 min) |
| **1.3** 🚀 ✅ | **LGL-01** | Aceite gravado (quem, quando, versão), para e-mail **e** Google. **Feito em 02/10** | `assets/js/consentimento.js`, migration, `tools/testa-consentimento.js` | M | — |
| **1.4** 🚀 ✅ | **EDI-01 + SEG-06** | Leitura que custou e falhou conta; teto global diário. **Feito em 02/10.** ✔️ 20: números confirmados (10 editais / 60 guias / 100 questões); **rever depois do 1º edital dele, com custo medido** | `_shared/comum.ts`, migration `20261002110000` | P + M | — |
| **1.5** 🚀 ⏸️ | **PRO-01** | Reverter a simulação da conta dele → **o 1º edital é dele** → medir custo e tempo reais → `valores.md`. ✔️ 5: **só no dia em que ele avisar do crédito** | `tools/simula-edital.js --reverter` | P | 💰 crédito US$ 5 · aviso dele |
| **1.6** 🚀 ⏸️ | **PAG-01** (+ NEG-02, "cancele na sua conta") | Webhook do Mercado Pago com assinatura validada e idempotência; planos, trial, arrependimento (CDC 49), cancelar; tudo por `pode()`/`regras_do_plano`. ✔️ **As 14 perguntas de planos estão respondidas** (`gap-analysis-planos.md` § 5). **Antes dele: o 3.6** (menor de 16–17 só paga com o responsável) | `supabase/functions/` (novo webhook), migrations, `conta.html`, `index.html` | G (várias sessões) | credenciais do Mercado Pago dele · 💰 Vercel Pro US$ 20/mês na 1ª cobrança |

---

## Lote 2 — S1 de menor esforço (cada um < 1 h) + o funil

| # | Itens (mesma causa) | O que fazer | Arquivos | Esforço | 🚀 / decisão |
|---|---|---|---|---|---|
| ~~2.1~~ | SEG-02 + SEG-03 | **Movido para o fim (4.1)** — ✔️ 21: *"vamos deixar ela por último"* | — | — | — |
| **2.2** | **LGL-03 + LGL-04** — dados do aluno | `meus_dados()` no servidor com todas as tabelas; exclusão que apaga `lista_espera` pelo e-mail e **anonimiza o e-mail na auditoria**; expurgo de `erros_cliente` > 12 meses | migration, `conta.html`, `excluir-conta/index.ts` | P | 🚀 · ✔️ 2 |
| **2.3** | **NUM-03 + CRO-02** — dois domínios para a mesma matéria | Uma fonte só para o que a tela mostra e o que o cronograma usa; o aviso de desequilíbrio só afirma o que confere; o botão "Rebalancear" **vira o texto** *"seu cronograma se ajusta sozinho toda segunda"* | `dashboard.html`, `progresso.html`, `assets/js/plano.js` | P | 🚀 · ✔️ 11 |
| **2.4** | **CRO-01** — matéria some em rotina curta | Rodízio: a matéria que ficou de fora numa semana entra na seguinte; o questionário avisa "sua rotina tem N sessões e o edital M matérias" | `assets/js/cronograma.js`, `assets/js/rotina.js` | P | 🚀 |
| **2.5** | **NUM-01** — Amplitude conta matéria fora do edital | Filtrar pelas matérias do edital em `ficha_do_usuario`; o servidor recusar sessão de matéria fora do edital (exceto "Geral") | migration | P | 🚀 |
| **2.6** | **NUM-02** — 5 condecorações contra a descrição | Relógio na Mão (livre + pomodoro), Duas Frentes (2 matérias no mês), Começo de Semana/Domingo de Serviço (dias distintos), Turno da Noite/Vigília (hora de início). **Nos dois lugares** (servidor e `condecoracoes.js`) até o COD-01 juntar | migration, `assets/js/condecoracoes.js` | P | 🚀 |
| **2.7** | **NUM-04** — cronômetro e cronograma não se enxergam | Sessão medida da matéria do bloco marca o bloco | `assets/js/cronograma.js` (`blocosDeHoje`) | P | 🚀 |
| **2.8** | **JOR-01** — patente desce | Patente do edital que não é degrau exato entra **no lugar** do degrau que casou; teste com os exemplos do prompt nas 6 carreiras | `assets/js/divisa.js` | P | 🚀 |
| **2.9** | **GAM-05** — Platina impossível | **Consertar a regra**: Doutrina só sobre matérias com Banco (ou 70 vale 100 nelas); tirar as de "retorno" da conta | migration, `assets/js/catalogo.js` | P | ✔️ 10 |
| **2.10** | **CAL-01 + CAL-02** — calendário | Trocar de edital atualiza o evento `edital_prova`; "próximo evento" = o mais próximo; prova importada apagada não volta | `calendario.html`, `dashboard.html` | P | 🚀 (CAL-01) |
| **2.11** | **BAN-01 (despublicar) + BAN-02** — acervo | **Despublicar já** as quebradas (símbolo perdido, alternativas trocadas, figura ausente), sem apagar; as checagens 6 a 9 de `historico/revisao-de-questoes.md` no `testa-acervo-limpo.js`; o campo `revisao` passa a dizer **o que** foi conferido; botão "reportar erro" na questão | `tools/arruma-acervo.js`, `tools/testa-acervo-limpo.js`, `banco.html`, migration | P + P | 🚀 · ✔️ 6 |
| **2.12** | **PRO-02 + PRO-03 (TDAH)** — página inicial | **Tirar as 5 promessas sem entrega** (✔️ 9) e trocar "feito para quem tem TDAH" por **"para quem tem dificuldade de foco"** (✔️ 12). Cada uma tem destino: *cronograma pelo tempo até a prova* volta com o **3.14**; *cancele na sua conta* volta com o **1.6**; *lembretes* volta com o **4.2** (sem o "aprendem com seus hábitos"); *"concurseiros na lista de espera"* volta como **contador real** quando houver gente; *subtópicos* **sai de vez**. **Textos do beta: não mexer** (✔️ 4, beta parado) | `index.html`, `cadastro.html` | P | 🚀 · ❓ os 3 exageros da PRO-03 ("30 segundos", "IA treinada", cartão de exemplo) |
| **2.13** | **NUM-14** (S2) — sequência velha | A sequência do topo e da ficha calculada na hora (`sequencia_do_usuario`), não a guardada | migration (`ficha_do_usuario`), `dashboard.html` | P | — |
| **2.14** | **NEG-01** — o funil (subiu do Lote 3) | Origem do cadastro (UTM) no perfil + 4 eventos numa tabela nossa (cadastro → edital → rotina → 1ª sessão), com RLS. **R$ 0**, sem ferramenta de fora. ✔️ 16: *"comece agora"* — muda a decisão de 08/09 de guardar para depois da Fase 1 | migration, `assets/js/astral.js`, `criar-conta.html` | M | ✔️ 16 |

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
| **3.7** | **GAM-01 + GAM-12** — bônus da Instrução | Bônus gravado na sessão (**só da escolha em diante**); "Recomeçar" não desce a patente; teto por ramo | migration, `habilidades.html` | M | ✔️ 8 · ❓ **resetar a patente ao trocar de edital** (ideia dele; minha opinião é contra — aguardando) |
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
| **3.18** | **LGL-05 + LGL-06** — textos legais | Política e Termos em dia (Google como operador, retenção, idade 16); **fonte (banca, prova e ano) visível em cada questão**; sem advogado antes do lançamento, salvo se ele quiser (✔️ 3 — Lei 9.610, art. 8º, IV) | P | 🚀 · ✔️ 3 |
| **3.19** | **UX-04 + UX-05** — primeiro acesso e peso | **Primeiro acesso só com o envio do edital** (✔️ 18); reduzir o peso de login/cadastro | M | ✔️ 18 |
| **3.20** | **NUM-08 + NUM-11 + NUM-12 + NUM-13** — números menores | Uma média de domínio (ponderada); "estudada há N dias" pelo estudo mais recente; letras da semana sem ambiguidade; tag "em formação" com rótulo | P | — |
| **3.21** | **COD-01 + COD-03 (resto) + UX-09 + RED-02** — código | As 74 regras só no servidor; tirar `TABELAS_NIVEIS`, `ligacaoAcesa`, `comEspera`, `tagDe`, `meu_dominio`, `montarCronograma`, `progresso.badges`; aba "Missões" → "Conquistas"; o Quadro de operações vira aba de Conquistas, **sem esconder nada no grátis** (✔️ P11) | M | ✔️ P11 |
| **3.22** | **Fim da jornada** (jornada 7) | "Passei!": comemoração, depoimento, manter a conta para o próximo concurso | M | ✔️ 17 |
| **3.23** | **Cache por concurso** (CE-01, CE-05, CE-06, CE-07 + guia compartilhado) — **novo** | Edital e guia lidos **uma vez** e reaproveitados por todos do mesmo concurso, com versão e curadoria. **É a condição do beta** (✔️ 4: *"aí o beta fica válido, porque não vai ter gasto a mais"*) e de trocas ilimitadas no Pro (✔️ P2). O lembrete **P6** (`tools/lembretes.js`, 20 editais reais) diz se vale também reconhecer o edital pelo texto | 2 sessões | ✔️ 4, P6 |
| **3.24** | **CE-08** — links do guia toda semana — **novo** | Job semanal com a API do YouTube (chave do Google, cota grátis, R$ 0); **testado antes de lançar** (✔️ P8) | 1 sessão | 🚀 · ✔️ P8 |

---

## Lote 4 — o que precisa dele em cena (por último, ordem dele)

> ✔️ 21: *"primeiro fazemos o que você pode fazer e depois eu entro em cena e você me ajuda a criar."*

| # | Itens | O que fazer | Esforço | 🚀 |
|---|---|---|---|---|
| **4.1** | **SEG-02 + SEG-03** — e-mail não chega | Ele cria a senha de app do Gmail (com a verificação em duas etapas ligada), eu guio passo a passo → `smtp-configura.ps1 -Aplicar` → provar entrega → `-ExigirConfirmacao`. **R$ 0.** ⚠️ Até aqui, dá para criar conta com o e-mail de outra pessoa (SEG-03): por isso fica **antes** do lançamento pago | P | 🚀 |
| **4.2** | **UX-07** — lembretes | Lembrete simples por e-mail (estudo do dia, sequência em risco) — **depende do 4.1**. Devolve a promessa de lembretes da página inicial, **sem** "aprendem com seus hábitos" | M | — |

---

## O que tem de estar pronto antes do lançamento pago (🚀)

Lote 1 inteiro (1.1 a 1.6, com o **1.2b**) · 2.2 · 2.3 · 2.4 · 2.5 · 2.6 · 2.7 · 2.8 · 2.10 (CAL-01) ·
2.11 · 2.12 · 3.1 · 3.2 · 3.3 · 3.5 · **3.6 (antes do 1.6)** · 3.10 · 3.11 · 3.15 (alerta de gasto) ·
3.18 · **3.24** · **4.1** — e o checklist da seção 8 do relatório final, item por item, com prova.

## O que ainda espera ele (❓) — fora isso, está tudo decidido

| O quê | Onde |
|---|---|
| Resetar a patente ao trocar de edital? (ideia dele; minha opinião é contra) | 3.7 |
| Os 3 exageros da página inicial: "em 30 segundos", "IA treinada", o cartão de exemplo impossível | 2.12 |
| Guardar a senha da cópia do backup no gerenciador de senhas do Google (~1 min) | 1.2b |
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
