# Auditoria pré-lançamento — Fase 5: experiência (seção 10), negócio (seção 11) e código (seção 12)

> **01/10/2026** · Só investigação: **nenhuma correção foi feita**.
>
> **Onde rodou.** Telas internas: no projeto de **desenvolvimento**, com os usuários das Fases 3 e 4
> e uma aluna nova criada para a jornada 1 (`f5-ana-*@astral-teste.local`), abertas num navegador
> de verdade a **360 px**, com **4G lento** (1,6 Mbps, 150 ms) e **processador 4× mais lento**
> (um Android básico). Páginas públicas: **na produção**, só leitura (GET). Na produção também
> contei contas e linhas — nenhum dado pessoal lido, nada gravado. **Nenhuma chamada de IA**: na
> jornada 1 a resposta da IA foi **simulada dentro do navegador** para o caminho seguir.

---

## Resumo por severidade

| | Quantos | Quais |
|---|---|---|
| **S0** | **0** | — os bloqueadores de lançamento já registrados continuam: PAG-01 (sem pagamento), LGL-01 (consentimento), OPS-01 (banco não sobe do zero), e PRO-01 (a leitura do edital nunca rodou) |
| **S1** | **4** | JOR-01 a patente **desce** na primeira promoção (Bombeiros e PM) · NEG-01 nenhuma medição de funil (sem analytics, UTM ou origem) · NEG-02 os planos da especificação não existem: só o grátis · UX-01 carregando ou com erro, o painel mostra **zeros falsos** |
| **S2** | **10** | UX-02 contraste dos botões principais · UX-03 campos que dão zoom no iPhone · UX-04 peso e tempo das páginas no 4G · UX-05 primeiro acesso · UX-06 sem PWA · UX-07 nenhuma notificação ou e-mail · NEG-03 sem SEO nem prévia de link · NEG-04 sem painel de negócio · COD-01 regras duplicadas navegador × servidor · COD-02 os testes rodam contra a produção |
| **S3** | **4** | UX-08 alvos de toque pequenos · UX-09 detalhes de tela · COD-03 código morto · COD-04 "premium" e selo de plano fantasmas |
| **PERGUNTAR AO LUCAS** | 4 | seção 6 |

**O que está CERTO, medido:** nenhuma página com rolagem lateral a 360 px (19 de 19) · 0 erros de
JavaScript nas 19 páginas e nas jornadas · 0 imagens sem texto alternativo · 0 campos sem rótulo
(exceto 1, no cronômetro) · navegação por teclado com foco visível (só os quadros do hCaptcha, de
terceiros, ficam sem marca) · 0 `console.log` e 0 TODO no código que vai ao navegador · 0 contas de
teste sobrando na produção (7 contas, todas reais) · travas de plano no **servidor**, não só na tela.

---

## 1. Seção 10.1 — as 8 jornadas

| # | Jornada | O que aconteceu | Trava / confunde / engana |
|---|---|---|---|
| 1 | **Ana**, 17, Bombeiros, Android básico, 4G fraco | **Percorrida inteira** (IA simulada): painel em **4,8 s** → questionário de rotina abre sozinho → edital enviado → "Lendo seu edital" → revelação com dados reais em ~10 s depois da resposta → cronograma (4,2 s) → marcou o 1º bloco → **20 XP, sequência 1, 0,7 h** gravados. 0 erros | **Engana:** a patente vira "Soldado" com "próximo rank: **Aluno-Soldado BM**" (JOR-01), e o topo da mesma tela continua dizendo "RECRUTA" até recarregar. **Confunde:** o botão do questionário ("Montar meu cronograma") fica abaixo da dobra; o cronograma diz "ORADOR DE GUERRA · 0%" no topo de uma conta de 1 minuto. **Na vida real ela trava antes:** sem crédito, o edital não é lido (PRO-01) |
| 2 | **Bruno**, ESA, assina o anual | Procurei "assinar", "plano", "anual", "R$" em `conta.html`, no painel e na página inicial | **Trava no passo 1: não existe assinatura.** Nenhum botão, página ou preço dentro do produto; só a frase "o plano Pro será R$ 19,90/mês" na página inicial. Anual e trimestral não aparecem em lugar nenhum (NEG-02). O uso de 30 dias seguidos foi medido na Fase 3 (`constante`) |
| 3 | **Carla**, PM, prova em 70 dias, trimestral | Igual ao Bruno para a assinatura. Prova em ~70 dias: o chefe entra na fase "Preparação" ("Menos de três meses…") | Trava na assinatura. Se o edital disser "Soldado PM 2ª Classe", a patente **desce** na 1ª promoção (JOR-01). O cronograma não muda com a data da prova (Fase 4, CRO-03) |
| 4 | **Diego**, some 15 dias e volta | O `sumido` voltou hoje depois de 15 dias (16/09 → 01/10) | **Funciona como desenhado:** ganhou a condecoração **Reintegrado** ("voltou a estudar depois de mais de 14 dias sumido"), a sequência recomeça em 1, as habilidades mostram "Enferrujada (7 dias)" / "Suspensa (14 dias)". Nenhuma mensagem de "bem-vindo de volta" no painel, mas a medalha cumpre esse papel. Motiva |
| 5 | **Eva**, termina o trial e não assina | — | **Não se aplica: não existe trial** (Fase 2, PAG-01; `historico/gap-analysis-planos.md`) |
| 6 | **Fábio**, troca Bombeiros → Aeronáutica | Medido nas Fases 3 e 4 (`trocou_edital`, `quebrou`) | **Fica:** XP, horas, sequência, condecorações (27), tags conquistadas. **Muda:** a patente troca de nome no mesmo degrau ("3º Sargento BM" → "3º Sargento"). **Some:** o domínio e as habilidades das matérias antigas. **Engana:** Amplitude "9 matérias de 4 do edital" = 100 (Fase 3, NUM-01); o calendário e o chefe continuam com **a prova do edital antigo** (Fase 4, CAL-01); a semana editada à mão encolhe de 720 para 240 min sem aviso (Fase 4, CRO-04); a troca gasta a janela de 30 dias |
| 7 | **Gabi**, passou no concurso | Procurei "passei", "aprovad", "parabéns" no produto | **Não existe final.** Quando a data passa, a faixa diz "realizada" e o quadro do chefe some; nada pergunta o resultado, comemora, pede depoimento ou oferece o próximo concurso. Cancelar: não há assinatura. Sobra "Excluir minha conta" |
| 8 | **Atacante** | Fases 2, 3 e 4 | **Virar Pro de graça:** recusado (403; `tipo_plano` só muda pelo servidor). **Ver dados alheios:** 68 de 69 ataques bloqueados (o aberto é o token válido por 1 h depois de "sair de todos", SEG-04). **Gerar custo de IA:** leitura que falha não conta (Fase 4, EDI-01). **Ganhar sem estudar:** 22 condecorações em 3 min (GAM-02), gabarito antes da resposta (GAM-03) |

### [JOR-01] Na primeira promoção, a patente desce — Bombeiros e PM
- **Severidade:** S1 · **Tipo:** BUG
- **Onde:** `assets/js/divisa.js:225-272` (`nivelDe` → `degrauDaPatente`): quando a patente do edital **não é igual** a um degrau da carreira, ela vira o degrau zero e a carreira continua **a partir do degrau que casou por palavra** — e "Soldado" casa com "**Aluno-Soldado** BM", o degrau 0.
- **O que acontece:** testei a função com as patentes que **o próprio prompt da IA dá como exemplo** (`processar-edital/index.ts:293-294`):

| Força / patente do edital | Escada que o aluno vê |
|---|---|
| Bombeiros / "Soldado" | Soldado → **Aluno-Soldado BM** → Soldado BM → Cabo BM |
| Bombeiros / "Bombeiro Militar de 3ª Classe" | Bombeiro Militar de 3ª Classe → **Aluno-Soldado BM** → Soldado BM |
| PM / "Soldado PM 2ª Classe" | Soldado PM 2ª Classe → **Aluno-Soldado** → Soldado PM → Cabo PM |
| PM / "Soldado" | Soldado → **Aluno-Soldado** → Soldado PM |
| Exército "Soldado", Marinha "Grumete", "Cadete", "Aluno-Sargento" | sobem certo ✅ |

  Na jornada da Ana, o painel mostrou *"Soldado · Nível 1 · próximo rank: Aluno-Soldado BM"*. A primeira promoção que ela ganharia, aos 500 XP, é um **rebaixamento** — no público principal do produto (Bombeiros e PM). O comentário do código de 04/08 diz *"Ninguem desce nunca"* (`divisa.js:237`).
- **Correção sugerida:** quando a patente do edital não é um degrau exato, colocá-la **no lugar** do degrau que casou (não antes dele); ou casar "Soldado" com "Soldado BM" antes de "Aluno-Soldado BM". Um teste com os exemplos do prompt.
- **Esforço:** P

---

## 2. Seção 10.2 — checklist geral

**Medido a 360 px, 4G lento, CPU 4× mais lenta** (`f5-celular.js`):

| Página | Carrega em | Peso | Toque < 24 px | Campo que dá zoom no iPhone | Contraste abaixo do mínimo* |
|---|---|---|---|---|---|
| Página inicial (**produção**) | **5,0 s** | 231 KB | 2 | 0 | botões principais (3,0:1) |
| Entrar (**produção**) | **5,7 s** | **762 KB** | 3 | **2** | "Entrar" |
| Criar conta (**produção**) | **5,6 s** | **762 KB** | 4 | **3** | "Criar minha conta" |
| Lista de espera (**produção**) | **5,8 s** | 763 KB | 3 | **4** | "Quero minha vaga" |
| Painel | 4,8 s | **969 KB** (77 pedidos) | 6 (22×22) | 0 | rótulos 4,2:1 |
| Cronograma · Cronômetro · Calendário · Progresso | 4,3 s | 735–811 KB | 0 | cronômetro 1 | botões 3,0:1 |
| Banco | 3,5 s | 659 KB | 0 | **5** | rótulos dos filtros 4,2:1 |
| TAF | 3,7 s | 657 KB | **12** (caixas de 13×13) | **4** | — |
| Conquistas · Quadro · Instrução · Tags · Conta | 3,9–4,3 s | 700–804 KB | 0 | 0 | rótulos pequenos 2,9–4,2:1 |

\* *O medidor também acusou 1,0:1 na etiqueta da patente ("SUBTENENTE BM"). É **erro do medidor**: o
fundo dourado é desenhado de um jeito que ele não lê, e na captura o texto está legível. Não entra
como achado.* As telas internas foram servidas por um servidor local (sem a CDN da Vercel); os
tempos delas são indicativos.

| Item | Resposta | Achado |
|---|---|---|
| Celular 360 px | **Sem rolagem lateral em nenhuma das 19.** Problemas: zoom nos campos, toque pequeno no TAF, contraste dos botões | UX-02, UX-03, UX-08 |
| PWA / atalho | **Não**: sem `manifest`, sem service worker, sem `apple-touch-icon`; o `favicon.ico` dá **404** na produção | UX-06 |
| Desempenho | 3,5 a 5,8 s no 4G lento; login e cadastro com **762 KB** | UX-04 |
| Vazio, carregando, erro | Vazio: tratado na maioria (Fase 3, NUM-10 lista as exceções). **Carregando e erro: zeros falsos** | UX-01 |
| Erro em português claro | Na maioria, sim. Do servidor, **sem acento** ("Nao foi possivel completar a operacao", "questoes sao", "indisponivel") e, numa falha geral, *"O plano pode aparecer errado nesta tela"* quando todos os números estão errados | UX-01, UX-09 |
| Acessibilidade | Teclado ✅; texto alternativo ✅ (0 imagens sem `alt`); rótulos ✅ (1 exceção); **contraste ✗** nos botões principais; muito texto abaixo de 12 px (Quadro 166 elementos, Conquistas 99) | UX-02, UX-08 |
| Primeiro acesso em 30 s | Ver UX-05 | UX-05 |
| Notificações e e-mails | **Não existem** (nem lembrete, nem resumo); o de confirmação e o de senha não chegam ao aluno (Fase 2, SEG-02) | UX-07 |

### [UX-01] Carregando ou com erro, o painel mostra zeros como se fossem reais
- **Severidade:** S1 · **Tipo:** UX ("enganado por um número")
- **O que acontece** (usuário `constante`: 45 dias seguidos, 10.800 XP, 90 h):
  - **Carregando** (4G lento, 1,5 s depois de abrir): *"0 dias · Recruta · Nível 1 · 0 XP · 0h · 0/0 matérias"*.
  - **Banco fora do ar** (todas as leituras falhando): os mesmos zeros **ficam** na tela, e o único aviso é *"Nao consegui carregar os dados da sua conta. O plano pode aparecer errado nesta tela."* O Progresso mostra só esse aviso. O Banco fica **em branco**, sem aviso nenhum.
  
  Quem tem 45 dias de sequência e vê "0 dias" acha que perdeu tudo.
- **O que deveria acontecer:** esqueleto ("—" ou barra cinza) enquanto carrega; em erro, "não consegui carregar — seus dados estão guardados, tente de novo".
- **Evidência:** `f5-erro.js`, capturas `f5-lento-*.png` e `f5-erro-*.png`.
- **Esforço:** M

### [UX-02] Contraste dos botões principais abaixo do mínimo (S2)
Texto branco sobre o dourado `rgb(192, 138, 46)`: **3,04:1**, conferido à mão na produção ("Começar agora", 16 px; "Cadastrar", 14 px). O mínimo para esse tamanho é **4,5:1**. São os botões que mais importam: entrar, criar conta, entrar na lista. Rótulos pequenos em maiúsculas ("SESSÕES", "MATÉRIA") ficam em 4,2:1. Esforço P (escurecer o dourado do botão ou usar texto escuro).

### [UX-03] Campos que dão zoom no iPhone (S2)
Campo com fonte menor que 16 px faz o Safari do iPhone **ampliar a tela** ao tocar. Medido: Entrar **2**, Criar conta **3**, Lista de espera **4**, Banco **5** (filtros), TAF **4**, Cronômetro 1. Esforço P (`font-size: 16px` nos campos).

### [UX-04] Peso e tempo no 4G fraco (S2)
Página inicial 231 KB em 5,0 s; **Entrar e Criar conta, 762 KB** em 5,6–5,7 s (19 pedidos); painel **969 KB em 77 pedidos**. E o envio do edital: o PDF vai em base64 (+33%) num único pedido, com **limite de 120 s no aparelho** (`astral.js:123`). **Conta minha, não medida:** o edital da ESA (3,1 MB → ~4,1 MB) leva ~44 s só para subir a 750 kbps — antes de a IA começar. Num 4G mais fraco que o simulado, a Ana pode ver "A IA demorou demais" sem a IA ter tido chance. Esforço M.

### [UX-05] O primeiro acesso não diz o que fazer primeiro (S2)
A Ana entra e, **antes** de saber o que o Astral é, recebe o questionário "Como é a sua semana?" (com o botão de confirmar abaixo da dobra). Fechado, o painel tem **11 blocos** (patente, tempo, domínio "0/0", envio do edital, sessão de hoje com **prévia falsa** "+50 XP", missões — uma delas impossível sem cronograma —, campanha, ficha com 5 atributos zerados, semana, cobertura, condecorações 0/74). A única ação que destrava tudo — **enviar o edital** — divide a tela com o resto. Esforço M (primeiro acesso = só o envio do edital; o resto aparece depois).

### [UX-06] Sem atalho na tela inicial (S2)
Sem manifesto, sem ícone para "Adicionar à tela inicial" e sem `favicon` (404). Para um produto de uso diário no celular, o aluno volta pelo navegador e pela busca. Esforço P.

### [UX-07] Nenhuma notificação nem e-mail (S2)
Não há lembrete, resumo, aviso de sequência em risco, nem e-mail de boas-vindas. A página inicial promete "lembretes inteligentes" (Fase 4, PRO-02). E os e-mails que existem (confirmação, senha) não chegam ao aluno enquanto o SMTP não for configurado — a **senha de app do Gmail** que está pendente. Esforço G.

### [UX-08] Alvos de toque pequenos (S3)
TAF: 12 de 34 controles menores que 24 px (caixas de seleção de 13×13). Painel: 6 de 28 (22×22). Links de texto de 17–20 px de altura na página inicial e no login. Muito texto abaixo de 12 px no Quadro (166) e em Conquistas (99).

### [UX-09] Detalhes de tela (S3)
O topo do painel continua "RECRUTA" depois do edital até recarregar (JOR-01); a aba do navegador da página Conquistas diz "**Missões**" (`conquistas.html`, título); o menu (≡) do celular cobre a etiqueta da questão no Banco (Fase 4); mensagens do servidor sem acento.

---

## 3. Seção 11 — negócio e lançamento

| Item | Resposta | Achado |
|---|---|---|
| Planos free / trial / mensal / trimestral / anual / fundador | **Só existe o grátis** (+ beta e Pro **concedidos à mão**). Nenhum pagamento (Fase 2, PAG-01). Comparação item a item em `historico/gap-analysis-planos.md` (63 itens). O arquivo **`astral-simulacao-12-meses-v3.md` não está no repositório** (procurei por nome) | NEG-02 |
| Gatilhos de conversão, "no máximo 1 aviso de Pro por sessão" | Existe **um** gatilho: o limite de 10 questões no Banco (e "essas questões ficam no Pro"). Condecorações guardadas, rebalancear e habilidade pronta como gatilho: **não existem**. Sem trava de frequência — hoje não precisa, há um aviso só | NEG-02 |
| Lista de espera, UTM, "como conheceu", parceiro, indicação ("Recrutador") | Lista de espera existe (**0 inscritos** hoje). **UTM, "como conheceu", código de parceiro e indicação: nada** no código nem no banco | NEG-01 |
| Painel de administração | **Não há painel de negócio** (cadastros por dia, origem, conversão, faturamento, churn). O que existe de admin é o importador de provas (`importar.html`) | NEG-04 |
| Analytics no funil (cadastro → edital → rotina → 1ª sessão) | **Nenhum** (nenhum script de analytics em 24 páginas e 26 módulos) | NEG-01 |
| Canal de suporte | **Nenhum visível** (sem e-mail, WhatsApp ou formulário em `index`/`conta`) — Fase 4, PRO-04 | — |
| Landing: tudo existe? preços? | Fase 4, seção 6 (5 promessas sem entrega). Preço: "R$ 19,90/mês" só na página inicial; nenhum preço dentro do produto | — |
| SEO e compartilhamento | **0 de 24 páginas** com `meta description`, Open Graph ou Twitter Card; **sem favicon** (404), **sem `robots.txt` e sem `sitemap.xml`**. Título e `lang="pt-BR"` em todas ✅ | NEG-03 |
| E-mail: chega? SPF/DKIM/DMARC | **Não há domínio próprio** (`astral-psi.vercel.app`), então SPF/DKIM/DMARC não se aplicam ainda. O e-mail para o aluno **não chega** (Fase 2, SEG-02); o aviso de lead para o dono sai de `onboarding@resend.dev` | — |
| Custos com escala | **IA:** leitura que falha não conta (Fase 4, EDI-01). **Vercel:** o plano grátis **proíbe uso comercial** — US$ 20/mês obrigatório na 1ª cobrança (já em `historico/valores.md` § 10). **Supabase grátis:** 500 MB, **pausa depois de 1 semana sem uso**, sem backup (feito por nós). **Alerta de gasto na Anthropic:** pendente (`valores.md` § 11, item 2.9). Alerta de site fora do ar: `vigia.yml`, de hora em hora ✅ | — |

### [NEG-01] Não há como medir de onde vem e onde desiste o aluno
- **Severidade:** S1 · **Tipo:** FALTANDO
- **O que acontece:** nenhum analytics, nenhuma UTM, nenhum "como conheceu", nenhum código de parceiro ou indicação. No lançamento não dá para saber qual canal trouxe cada cadastro, nem em que passo do funil (cadastro → edital → rotina → 1ª sessão) as pessoas param. Hoje só eu, com SQL, consigo contar — e só o que está no banco.
- **Correção sugerida:** o mínimo é gravar a **origem** (UTM do primeiro acesso) no perfil e 4 **eventos** de funil numa tabela própria (sem serviço externo: sem custo e sem mandar dado para fora — o que simplifica a LGPD).
- **Esforço:** M · **PERGUNTAR AO LUCAS** (o "prompt supremo" de 08/09 tinha funil e LTV; a decisão dele foi guardar para depois da Fase 1).

### [NEG-02] Os planos da especificação não existem: só o grátis (S1)
Trial, mensal, trimestral, anual e fundador: **nenhum** implementado; nenhum lugar no produto para assinar (jornadas 2, 3 e 5). Já detalhado em `gap-analysis-planos.md` e em PAG-01 — registrado aqui porque as jornadas 2, 3 e 5 **param no primeiro passo**.

### [NEG-03] Sem SEO e sem prévia de link (S2)
Mandado no WhatsApp, o link do Astral aparece **sem imagem e sem descrição**; no Google, sem descrição; na aba, sem ícone. Esforço P (as tags vão no `<head>` da página inicial e das públicas).

### [NEG-04] Sem painel de negócio (S2)
Cadastros por dia, origem, conversão, faturamento: não há tela. Com 7 contas, eu consigo responder por SQL; com 500, não. Esforço M (pode ser uma página só de leitura para o administrador, com as consultas que eu já uso).

---

## 4. Seção 12 — código e manutenção

| Item | Resposta | Achado |
|---|---|---|
| Código morto | Ver COD-03 | COD-03 |
| Regra duplicada navegador × servidor | **Sim**, em 4 regras | COD-01 |
| Permissões espalhadas | As **travas** estão no servidor (`sortear_questoes`, `_shared/comum.ts`, `minha-quota`) ✅. No navegador, a checagem de plano é **só cosmética** (cor do selo), repetida em 4 páginas, e cita um plano "premium" que não existe | COD-04 |
| TODO, `console.log`, dados de teste, simulação | **0** `console.log` e **0** TODO no que vai ao navegador ✅. **0** contas de teste na produção ✅. A **conta do Lucas está simulada** (edital, sessões e um guia de demonstração com 9 linhas) — tem de ser revertida antes do primeiro edital real (ordem dele, registrada em 29/09) | — |
| Testes das regras críticas | Ver COD-02 | COD-02 |
| Migrations sobem do zero? | **Não** — 9 falham (Fase 2, OPS-01) | — |

### [COD-01] Quatro regras existem duas vezes — no navegador e no servidor
- **Severidade:** S2 · **Tipo:** REDUNDÂNCIA
- **O que:**

| Regra | No servidor | No navegador |
|---|---|---|
| As 74 condecorações | `avaliar_condicao` (migration `20260930150000`) | `assets/js/condecoracoes.js:43-92` (mesmos tipos: `streak`, `horario`, `diaSemana`, `modo`, `atributo`…) |
| XP do cronômetro | `validar_sessao_estudo` | `cronometro.html:676` (`Math.floor(segundos/60)*2`) |
| XP do bloco do cronograma | `validar_sessao_estudo` | `assets/js/cronograma.js:74` (`xpDoBloco`) |
| Sequência | `sequencia_do_usuario` | `assets/js/diario.js:103-117` (e o "Nº dia seguido" do diário) |

  O servidor é quem vale (grava), o navegador desenha. Mas cada conserto tem de ser feito **duas vezes**: os 5 da Fase 3 (NUM-02) e o dia de início da sessão (NUM-06) incluídos. Se um lado for esquecido, "Falta pouco: 98%" e a medalha gravada discordam.
- **Correção sugerida:** o servidor devolver o **progresso** de cada condecoração (ele já calcula), e o navegador só mostrar.
- **Esforço:** M

### [COD-02] Os testes rodam contra a produção (S2)
57 testes em `tools/testa-*.js`. Os das regras críticas existem: XP (`testa-xp-forjado`), domínio (`testa-dominio`), plano (`testa-plano`, `testa-plano-forjado`), trava de crédito (`testa-trava-creditos`), sequência (em `testa-fatos`, `testa-motor` e outros 22). **Webhook: nenhum** (não há pagamento). No GitHub, a cada push, rodam **6** (verifica, varre-xss, testa-plano, valida-css, rolagem, velocidade); os outros, à mão (`roda-testes.js`, ~30 min).

O risco: eles **criam e apagam contas na produção** (`REF = "jjogmcacbdefwiwcyjxp"` em `testa-xp-forjado.js:28`, `testa-dominio.js:28`). Hoje limpam bem (0 contas de teste sobrando), mas com alunos de verdade, uma falha no meio deixa conta falsa e pode distorcer contagens. O `astral-dev` criado na Fase 2 pode receber a bateria.

**Testes mínimos que faltam** (cada um nascido de um achado desta auditoria): as 5 condecorações contra a descrição (NUM-02); sequência com folga (GAM-04); bônus não-retroativo (GAM-01); escada de patente com os exemplos do prompt (JOR-01); acervo — símbolo perdido, alternativas repetidas, enunciado colado (BAN-01); cronômetro por relógio, não por tique (CRN-01); toda matéria aparece em N semanas (CRO-01); e, quando houver pagamento, o webhook com assinatura inválida.

### [COD-03] Código morto (S3)

| O quê | Onde | Situação |
|---|---|---|
| `TABELAS_NIVEIS` | `dashboard.html`, `conquistas.html` | definido, **0 usos** (Fase 3) |
| `ligacaoAcesa`, `comEspera`, `tagDe` | `arvore.js`, `botoes.js`, `divisa.js` | exportados, **0 usos** no site e nos testes |
| `meu_dominio()` | banco | ninguém no site chama; só um teste (Fase 1) |
| `montarCronograma` | `plano.js` | só alimenta o botão "Rebalancear", que não muda nada (Fase 4, CRO-02), e o `cronograma_hoje` que o painel ignora |
| `progresso.badges` | banco + painel | gravado (`primeiro_edital`), não mostrado (Fase 1) |
| `edital.html`, `recursos.html` | raiz | redirecionamentos de 20 linhas para links antigos — **manter** |
| `questoes.html` + `FUNCOES_DESLIGADAS` | — | desligado **de propósito** desde 31/07 — **não é morto** |

### [COD-04] "premium" e selo de plano fantasmas (S3)
`progresso.html:847` e `conquistas.html:908` tratam um plano `'premium'` que não existe; as 4 páginas pintam o selo `#user-plan`, que saiu da barra lateral (Fase 2, erro de 29/09).

---

## 5. Perguntas da seção 15

- **Percorri todos os itens?** As 8 jornadas (1 inteira com a IA simulada; 2, 3 e 5 param no primeiro passo porque não há assinatura nem trial; 4, 6, 7 e 8 com os dados medidos nas Fases 2–4), os 8 itens de 10.2, os 10 de 11 e os 6 de 12.
- **Cada achado tem evidência?** Sim. **Só por conta, não medido:** o tempo de envio do edital da ESA no 4G fraco (UX-04). **Medidor com erro conhecido:** o contraste 1,0:1 da etiqueta da patente, descartado.
- **Testei com dados ou só li?** Com dados: 19 páginas a 360 px no 4G lento (7 na produção), 4 jornadas no navegador, teclado em 3 páginas da produção, contraste conferido à mão, a escada de patentes com 10 combinações, contagens na produção.
- **O que não testei:** um celular de verdade (a emulação não reproduz o teclado virtual cobrindo campos nem o bloqueio de tela); leitor de tela; o desempenho das páginas internas **pela CDN** (servi localmente); e-mail chegando (não há SMTP).
- **Se o Lucas achar amanhã um problema desta área que eu não registrei, o motivo provável:** algo que só aparece num celular físico — o teclado cobrindo o botão de enviar, a rolagem dentro do questionário, o comportamento com a tela bloqueada.

---

## 6. PERGUNTAR AO LUCAS

1. **Funil (NEG-01):** começar a medir origem e os 4 passos do funil agora (numa tabela nossa, R$ 0), ou só depois da Fase 1 do roadmap, como decidido em 08/09?
2. **Fim da jornada (Gabi):** quer um final — "Passei!" com comemoração, depoimento, e a opção de manter a conta para o próximo concurso?
3. **Primeiro acesso (UX-05):** pode o painel de quem ainda não enviou edital mostrar **só** o envio do edital?
4. **A simulação da sua conta:** reverter agora (o código já faz: `simula-edital.js --reverter`) ou só no dia do crédito, como combinado?

---

## Como reproduzir

Scripts na pasta de rascunho da sessão: `f5-celular.js` (19 páginas a 360 px; `prod` para as públicas
na produção), `f5-contraste.js`, `f5-teclado.js`, `f5-erro.js` (carregando e erro),
`f5-jornadas.js` (`ana`, `diego`, `bruno`), `f5-patente.mjs` (a escada com os exemplos do prompt),
`f5-seo.js`, `f5-codigo.js`. Capturas em `%TEMP%\f5-*.png`.
