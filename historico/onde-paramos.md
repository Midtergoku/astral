# 🔴 NO DIA DO CRÉDITO NA ANTHROPIC — ordem dele, 29/09/2026

> *"Quando eu conseguir colocar os créditos, eu vou pedir para você retornar essa conta que eu
> tenho aqui para a original (...) porque eu mesmo quero subir o edital e testar. Pelo menos o
> primeiro. Antes de você fazer os outros testes. Porque eu quero ter experiência como um usuário."*

1. `node tools/simula-edital.js --email <o e-mail dele> --reverter` — a conta volta ao original
   (edital simulado, sessões, conquistas e guia de demonstração saem; **o Pro fica**)
2. Conferir a conta limpa e avisar que está pronto
3. **ELE sobe o primeiro edital.** Nenhum teste meu com IA antes disso
4. Só então: medir o custo real no log (`custo_usd`) e atualizar `valores.md`

---

# 🔖 29/09/2026 (tarde) — dinheiro, roadmap e quatro consertos de tela

| Pedido dele | O que ficou |
|---|---|
| Trava para não comerem os créditos trocando de edital | 🟡 **proposta, aguarda o sim dele** — `valores.md` §11: edital e guia compartilhados entre alunos do mesmo concurso + limite de troca. Custo de fazer: R$ 0 |
| Simulação dos planos (mensal, trimestral, anual) | ✅ `valores.md` §9: R$ 19,90 · R$ 49,90 · R$ 179,90, com a taxa do Mercado Pago (4,49%) e a IA do aluno |
| "Outras partes desse assunto" | ✅ `valores.md` §10: **a Vercel proíbe uso comercial no grátis** — Pro a US$ 20/mês é obrigatório na 1ª cobrança. Custo fixo de lançamento ≈ R$ 113/mês; 6 assinantes pagam |
| Roadmap atualizado + provas e gabaritos | ✅ bloco de 29/09 no topo de `roadmap-ate-a-primeira-assinatura.md`, com a frente **3b — Provas e gabaritos** (12 itens) e o **2.10 — trava de créditos** |
| Patente cortada no topo | ✅ era a forma curta ("Subten BM") pintada em todo lugar; agora só no cartão estreito |
| Letras pequenas quase da cor do fundo | ✅ `--texto-3` de #5F7183 para #7A8C9F: contraste de 2,9–3,6 para 4,7–5,3 |
| Rebalanceamento gasta dinheiro? | **Não** — conta no navegador, sem IA |
| Filtro do Banco | ✅ **encadeado**: cada caixa só oferece o que existe com as outras (605 combinações); matéria sem assunto não mostra aviso; botão Limpar |
| Quadro: texto por trás do hexágono + barra lateral | ✅ balão sempre por cima; 8 frentes centralizadas numa linha, sem rolagem |

---

# 🔖 Atualização de 28–29/09/2026 — oito pedidos de uma vez, e o dashboard que não mudava

| Pedido dele | O que ficou |
|---|---|
| "Só nós podemos dar acesso a tudo" | ✅ **XP, horas e sequência calculados pelo servidor** (migration `20260928100000`). Sessão ganha data de agora e XP pela regra da tela; cronômetro não pode durar mais que o tempo real; cronograma até 4 h e 12 h/dia. `testa-xp-forjado`: 11 ataques barrados, estudo honesto continua valendo |
| PRECISÃO na ficha | ✅ acertou de primeira, só acervo, mínimo de 20 respostas |
| Calendário bugado | ✅ a prova era importada a cada visita (`criarEvento` jogava fora a `origem`); ícone saía como a palavra "documento". `testa-calendario.js` |
| Meu edital → dashboard | ✅ faixa "Edital ativo" no topo; aba saiu da barra (edital.html redireciona). Patente do cartão = a do topo; cartão da prova lê a data do edital |
| Cronograma refeito + questionário de rotina | ✅ `assets/js/cronograma.js` (UMA conta para a semana, usada pela aba e pela "Sessão de hoje") e `assets/js/rotina.js` (4 perguntas, aparece uma vez). Coluna `progresso.rotina` (migration `20260928140000`). `testa-cronograma.js`, 23 checagens |
| Gráficos do Progresso em pé | ✅ "Domínio por matéria" e "Horas por semana"; o diário ficou intacto |
| Recursos → dashboard | ✅ cartão "Guia de estudo"; aba saiu (recursos.html redireciona). `testa-guia.js` com XSS plantado |
| Quadro com símbolos melhores | ✅ insígnias em SVG: aro de metal, esmalte, emblema por frente |
| **"O dashboard está idêntico"** | 🔴 **defeito real:** conta **Pro/Beta** quebrava o dashboard (selo de plano que não existe mais) — a conta dele virou Pro em 27/09 e todos os testes usavam conta grátis. 38 erros em `erros_cliente`. Consertado; `testa-simulacao-tela` agora roda com conta Pro |
| Simulação dos professores | ✅ `simula-edital.js --guia`: guia de demonstração nas 9 matérias da conta dele (nomes de EXEMPLO, materiais grátis reais), sai no `--reverter` |
| Arquivo de valores | ✅ **`historico/valores.md`** — tudo que é dinheiro mora lá daqui em diante. **Nenhum custo foi medido ainda**; tudo é estimativa pelos preços oficiais |

✏️ **29/09 — o bloco abaixo dizia "Conserto proposto a ele, aguardando o sim".** Ele disse sim em
28/09 e o conserto está no ar (primeira linha da tabela acima).

**Feito no fim do dia 29:** 8 editais militares reais medidos (páginas, texto e matérias lidas no
PDF) — custo por aluno calculado sobre eles: **R$ 4,00 a R$ 6,75**, uma vez só. **Pendente:**
AFA, EPCAR e EEAR 2027 (o site da FAB recusou o download, erro 403) e os que não procurei
(ITA, IME, Escola Naval, CFN, EFOMM, EAGS, CIAAR). Ele avisou que vai pedir um `.md` de
**marketing** no mesmo estilo.

---

# 🧪 ATENÇÃO — A CONTA DO DONO ESTÁ COM UM EDITAL SIMULADO (desde 27/09/2026)

> Pedido dele: *"simule como se eu tivesse colocado um edital dos bombeiros e me dê acesso a tudo
> como se eu já estivesse avançado, apenas para testar (...) depois vamos reverter isso e colocar
> um edital real."*

| | |
|---|---|
| **O que tem na conta dele** | edital *"SIMULAÇÃO — Soldado Bombeiro Militar (teste do dono)"*, 9 matérias, prova 06/12/2026 · 112 sessões em 58 dias (79,6 h) · **9.554 XP = 1º Sargento BM** · 48 conquistas e divisas · 5 pontos de habilidade para ele gastar · plano **pro** |
| **Como desfazer** | `node tools/simula-edital.js --email <o e-mail dele> --reverter` |
| **De onde o desfazer lê** | `../ASTRAL-BACKUPS/simulacao/<id>.json` — a cópia de ANTES, fora do repositório. **Não apagar essa pasta enquanto a simulação estiver ativa** |
| **Provado antes de aplicar** | numa conta descartável: aplicar → reverter deixou as 5 tabelas **idênticas**; aplicar duas vezes é recusado |
| **Telas** | `tools/testa-simulacao-tela.js`: 12 páginas abertas com uma conta igual, nenhuma quebrou |

⚠️ **O plano pro fica** depois de reverter — ele pediu a conta Pro separadamente, e ela não faz parte da simulação.

🔴 **Achado no mesmo pedido — o RPG inteiro é forjável na própria conta.** `sessoes_estudo` aceita do
navegador **qualquer `xp` e qualquer `criado_em`** (grant de insert nas duas colunas, sem gatilho, sem
teto; medido em produção). Ficha, patente, pontos de habilidade, sequência e conquistas são calculados
dessas sessões — então quem abre o console e grava sessões falsas ganha tudo, **só na própria conta**.
Plano e acesso pago **não** (ver `testa-plano-forjado.js`). O `testa-xp-forjado.js` ainda mede o caminho
antigo (`progresso.xp`), não este. **Conserto proposto a ele, aguardando o sim** (é mudança de grant).

---

# 🔖 Atualização de 27/09/2026 — o que entrou depois da pausa

> Ele voltou com 10 pedidos numa mensagem só. Os dez foram respondidos ou feitos, e está tudo no ar.

| Pedido dele | O que ficou |
|---|---|
| Filtro "só funciona com tudo em Todos" | **Não estava quebrado — a mensagem mentia.** A conta dele é grátis: 10 por dia e só provas com 4+ anos. Havia 209 questões com o filtro, todas recentes. Agora a tela diz isso |
| Barra lateral pula ao clicar em Questões | O link estava no fim do menu só nessa página. Corrigido, e o `verifica.js` ganhou a **checagem 19** (menu em ordem diferente entre páginas) |
| Formato Certo/Errado | Entrou, com a **PRF 2021 (Cebraspe)**. Dois botões, texto de apoio junto, veredito por palavra. Acervo: **1.925 questões** |
| "Questões geradas por IA" ainda escrito | Tirado de `conta.html`, `termos.html` (3 correções de fato), `questoes.html`, `importar.html` |
| Relógio no Cronômetro | Terceira aba: **de parede** (ponteiros) ou **digital**, com tela inteira. O cronômetro segue contando por trás |
| **Caderno de erros** | Terceira aba do Banco. Errou → entra. Acertou na revisão → sai. Filtro por matéria. `tools/testa-caderno.js` (17) + seção 3e do `testa-banco-tela.js` |
| Aluno traz o gabarito — custa? | **Medido: R$ 0 por uso.** Zero chamada de IA (o PDF é lido no navegador). Custo é só espaço: ~1,2 KB por questão, teto de 2.000 por pessoa ≈ 2,4 MB. **Não precisa trancar** |

**Decisão pendente dele:** o caderno ficou aberto a todos os planos, mas o documento do produto o
tinha listado como coisa do Pro. Trancar é uma linha. E a conta dele é grátis — por isso ele mesmo
esbarra na cota; promovê-lo a beta resolve.


### 27/09/2026 (tarde) — segundo pedido do dia

| Pedido | O que ficou |
|---|---|
| Conta dele como **Pro** | Feito. `perfis.tipo_plano` = `pro` (estava `free`) |
| "Pessoas de fora conseguem virar Pro?" | **Não — medido.** `tools/testa-plano-forjado.js` (novo): 9 ataques com sessão real (editar o plano, upsert, apagar o perfil, virar beta, pôr "pro" nos dados do login, virar administrador, sem login, conta nova já pedindo pro) + leitura das permissões **em produção**. Tudo barrado; o servidor lê o plano só da tabela |
| Aba "Meu edital" é repetida? | **Não é.** Medido: o dashboard não tem trocar edital, remover edital, lista de pesos nem data da prova. Pela condição dele, a aba ficou |
| Caderno de erros no grátis ou no Pro? | Decisão dele: **fica para todos** |
| Diminuir abas / levar Recursos para o dashboard | Ele pediu para **não mexer agora**; estudar depois |
| Buscar gabaritos na internet | **Começado.** ESA 2023 (Geral, Saúde, Música — tipo A) entrou com o gabarito oficial, recuperado do Internet Archive porque o Exército tirou do site. **1.980 questões no ar** |

**Onde procurar gabarito de prova antiga:** o site do órgão costuma **apagar** o gabarito depois do
concurso. O Internet Archive guarda: `http://web.archive.org/cdx/search/cdx?url=esa.eb.mil.br/*&filter=mimetype:application/pdf`
lista todo PDF arquivado do domínio. Foi assim que o gabarito da ESA 2023 apareceu.

**ESA — o que ainda falta:** 2024 (o gabarito oficial é **desenhado**, bolinhas pintadas — sem texto para ler),
2025, 2026, e 2006–2022. **CBMMG:** a busca achou gabaritos oficiais no próprio site
(`bombeiros.mg.gov.br/storage/files/303/Gabaritos CFO_ publicar.pdf`, `ATO nº 16393 gabarito cfsd 2022`) — próximo lote.

---

# 🔖 Onde paramos — 26/09/2026

> Escrito a pedido dele: *"guarde para quando eu voltar, você lembre de tudo. Vou abrir outro
> folder, depois voltamos nesse aqui."*
>
> **Este arquivo é o ponto de retomada.** Quem abrir o projeto depois começa por aqui, e só então
> vai para o detalhe nos outros arquivos do `historico/`.

## Estado: tudo publicado, nada pendente

| | |
|---|---|
| **Site** | no ar, `checa-saude` verde |
| **Repositório** | árvore limpa, último commit `f347b19` |
| **Banco** | todas as migrations aplicadas em produção |

**Não há trabalho pela metade.** Ele pode sumir uma semana e voltar sem precisar consertar nada.

---

## O que está funcionando hoje

### 📚 O banco de questões — **1.851 questões, 65 provas, 2017 a 2026**

| Matéria | Questões | Assuntos |
|---|---|---|
| Português | 553 | 12 |
| Inglês | 335 | 8 |
| Matemática | 282 | 17 |
| Informática | 232 | — |
| Enfermagem | 209 | — |
| Física | 194 | 11 |
| Biologia · Química · História · Geografia | 46 | — |

Fontes: **EEAR** (CFS e EAGS, 63 provas) e **CBMES** (bombeiro do ES, 2 provas).
Custo até aqui: **R$ 0**. Nenhuma chamada de IA.

### O que a pessoa faz na tela `banco.html`

- **Aba Acervo** — filtra por **matéria → assunto**, **banca**, **concurso** (66 opções pelo nome)
  e **ano**; sorteia 10; responde; vê a resposta certa em cor **e em palavra**; e a **explicação**
  quando existe (abre sozinha quando erra)
- **Aba Minhas questões** — traz o PDF dela, e o **gabarito** dele também se tiver. Fica **só na
  conta dela**, nunca toca o acervo público
- **Aviso honesto** quando não acha o concurso, explicando por que falta e mandando para a aba dela

### 🎮 O RPG — fechado

R0, R0.1, R1, R2, R3, R5, R6, R7, R8, R9, R10, R12, R13, R15 ✅ · Q2, Q3, Q5 ✅ · Q4 🟡 (o portão
free/pro está de pé; falta o simulado de degustação e o caderno de erros) · R4 🔴 (masmorra)

---

## 🎯 As DUAS coisas a um passo — é por aqui que se retoma

Ambas dependem de **um arquivo** que ele baixa do navegador dele. A máquina toda já está pronta.

| Alvo | O que falta | O que destrava |
|---|---|---|
| **ESA** | um gabarito em **tabela de letras** | **91 provas** que eu já baixo e leio entram de uma vez |
| **CBMERJ 2024** | o **caderno de questões** (e anotar o TIPO: 1, 2, 3 ou 4) | o gabarito eu já leio inteiro — 4 tipos, 100 de 100 |

**Onde ele põe:** `C:\Users\Lucas\Documents\ASTRAL-provas\`
**Como nomear:** o gabarito é o nome do caderno + `_gabarito` (`X.pdf` e `X_gabarito.pdf`).

A lista completa, por força, com link e o que eu medi em cada uma, está em
**`provas-para-baixar.md`**.

---

## ⚠️ O que ele precisa saber antes de trazer material

1. **O gargalo não é mais ler a prova — é ter a resposta.** Quatro formatos de prova já são
   entendidos (FAB, `Questão NN`, `NN.`, círculos da ESA) e 39 matérias são reconhecidas, incluindo
   Química, Direito penal e Proteção e defesa civil. **Só a Força Aérea publica o gabarito dentro
   do caderno.** Todo o resto vem em arquivo separado.

2. 🔴 **Cebraspe usa "Certo/Errado"**, e o acervo **ainda não guarda** esse formato — a tabela só
   aceita gabarito de `a` a `e`. Se ele trouxer prova de PRF ou Polícia Federal, **é preciso
   acrescentar o formato antes de importar**, senão elas são recusadas em silêncio.

3. 🔴 **Marinha, AFA/EPCAR e CIAAR usam desafio anti-robô da Cloudflare.** Eu **não contorno** —
   é um controle que o próprio órgão instalou, e até o `robots.txt` deles está atrás dele. Do
   navegador dele abrem em segundos. Se ele achar o **link direto de um PDF**, eu baixo sozinho.

---

## 🔔 O lembrete que se cobra sozinho

**R14 — porcentagem de raridade das medalhas.** Adiado por ele, com gatilho em **200 usuários com
login nos últimos 30 dias**. Não depende da minha memória: `tools/lembretes.js` mede e o
`checa-saude.js` o chama toda sessão. Medido hoje: **1 de 200**.

---

## 💰 O que continua travado por dinheiro

- **Créditos da Anthropic** — a Fase 1 (US$ 5) segue parada. As questões por IA (`questoes.html`)
  continuam **desligadas de propósito** desde 31/07. O banco de provas antigas **não depende
  disso**, e é por isso que ele existe
- **Validação de assinatura do webhook do Mercado Pago** — continua sendo **bloqueador de
  lançamento**
- **Domínio** — decisão dele: é um dos últimos blocos, e quer fazer junto

---

## As ferramentas novas desta sequência

```
node tools/baixa-provas.js        traz os PDFs (e o gabarito junto) para ../ASTRAL-provas
node tools/importa-provas.js      mede a pasta inteira; --gravar publica
node tools/arruma-acervo.js       tira do ar o que nao passa na barra (nunca apaga)
node tools/testa-acervo-limpo.js  audita o acervo REAL: repetida, materia inventada, sem resposta
node tools/testa-formatos.js      os 4 formatos de prova e as travas do gabarito
node tools/testa-minhas-questoes.js   o isolamento entre contas, com invasao real
node tools/testa-minhas-tela.js   a aba particular, com PDF de verdade fabricado no teste
```

O `verifica.js` está com **18 checagens** — as duas últimas nasceram nesta sequência: barra lateral
acendendo a página errada, caminho desta máquina dentro de ferramenta, e caractere de controle
gravado dentro do código.

---

## 30/09/2026 — a lista de 11 itens dele

**Publicado (3 commits: b496251, e48be23, 639867e):**

| Item | O que ficou | Prova |
|---|---|---|
| 11 · revelação honesta | sai a animação de 12 s com etapas fingidas; ~3,5 s com dados reais do edital (concurso, data e dias, matérias, sessões e horas, patente); nada de "edital verificado". O guia de professores começa logo após o edital | `testa-revelacao-tela.js` 30/30 (1280 e 390 px) |
| 1 · missões se marcam sozinhas | redesenham após marcar a sessão, subir o edital e voltar à aba; aviso "Missão cumprida" | `testa-missoes-tela.js`: 0/25 → cumprida **sem recarregar** |
| 7 · professor e link inventados | `_shared/links.ts` no `buscar-recursos`; medido DE DENTRO do servidor 12/12 | `testa-links.js` 12/12 · backend.md 8.21 |
| 9 · celular | painel sem pisca de conta vazia; cronograma sem os ~19 vãos por dia; evento do calendário legível | fotos 390 px de 12 páginas, `testa-celular` verde |
| 3 · login | Google e e-mail funcionam (config certa, captcha nas 2 páginas, botão do Google leva ao Google, cadastro sem captcha recusado). **E-mail de confirmação: travado no SMTP** — precisa da senha de app do Gmail dele | `confere-auth.ps1`, `smtp-configura.ps1` |

**Achado grande, esperando decisão dele — itens 2, 6 e 8:** o **domínio de cada matéria nunca é
calculado**. Nasce 0 quando o edital é lido e nenhum código o atualiza (só é lido). Por isso, para
quem não é a conta simulada: tag nunca chega (≥70%), Doutrina fica 0, condecorações de domínio
morrem, o aviso de rebalancear nunca dispara e o cronograma não se adapta. E o navegador pode
gravar qualquer valor (`salvar_progresso` guarda o maior). Proposta: domínio calculado **no
servidor** a partir do banco de questões (acerto de primeira por matéria, peso crescendo com o
número de respostas) + tempo de estudo com teto. R$ 0, sem IA.

**Esperando decisão dele também:** fundir as 8 "distintivas" antigas nas condecorações (item 5 —
há repetição medida: "1h Estudada" × "Primeira Hora", "Edital Lido" × "Ordem de Serviço"); TAF,
cartão para compartilhar e revisão espaçada (item 10).

**Notado e deixado:** nome muito longo sem espaço vaza da barra lateral escondida no celular — vem
da decisão "nome de pessoa não se corta" (app.css). O gráfico da Progresso rola para o lado no
celular de propósito.

### 30/09/2026 (tarde) — ele aprovou A, B e C: "pode mexer na economia inteira"

| Item | O que ficou | Prova |
|---|---|---|
| **A · domínio** | medido pelo SERVIDOR: 60% acertos de primeira no Banco (com confiança) + 40% tempo; matéria sem Banco = só estudo, até 70. O navegador não manda mais. O cronograma usa o domínio do **início da semana** (rebalanceia toda segunda, nunca no meio do dia). Aviso do painel leva ao Banco filtrado na matéria fraca | `testa-dominio` 10/10 · bateria inteira |
| **B · distintivos** | os 8 antigos saíram da página Conquistas; o cartão do painel mostra as condecorações por metal + a próxima | tela |
| **C1 · revisão espaçada** | 1, 7 e 30 dias, no painel ("Revisão de hoje" + caderno de erros) e no diário ("revisar X hoje") | `testa-revisao` 7/7 |
| **C2 · cartão da divisa** | imagem 1080×1920 desenhada no navegador, prévia antes de compartilhar | `testa-cartao` 10/10 |
| **C3 · TAF** | página nova (menu em 14 páginas), XP de preparo físico SEPARADO do XP de estudo (10 por prova por dia), índice por sexo vindo do edital (a IA passa a ler o TAF) ou digitado, aviso de "concurso sem TAF" | `testa-taf` 19/19 |

**🚨 Achado no caminho:** o backup não guardava **12 tabelas** desde 19/09 (as 1.989 questões, respostas,
conquistas…). Consertado: o backup agora pergunta ao servidor quais tabelas existem e pagina.

**A conta dele (simulada) ganhou respostas simuladas do Banco** para o domínio medido continuar
parecido com o de antes (Português 73, História 81…). Efeito: ~100 questões "erradas" simuladas no
caderno de erros dele. **Tudo sai no `simula-edital.js --reverter`** (ids guardados em
`ASTRAL-BACKUPS/simulacao/<uid>.respostas.json`).

**Pendente de decisão/ação dele:** senha de app do Gmail (lembrete automático no checa-saude);
nomes das tags sem acento ("Memoria da Nacao") — proposta no relatório.

### 30/09/2026 (noite) — a auditoria de 28 itens dele, e os acentos das tags

Todos os 28 itens tratados; medido na conta dele antes e depois. Os principais:
condecorações de sequência pela **melhor** sequência (não a atual) · gráfico da semana que estava
**invertido** (classe `.vazio` colidindo com o estado vazio do site) · Quadro e tags contando as
conquistas **gravadas**, como o painel (44 em todo lugar) · "dominada" = 70% em todo o produto ·
barra de XP na mesma base dos números · aviso de rebalanceamento recomenda a mesma matéria que o chefe ·
calendário mostra a prova como próximo evento · cronômetro já vem na próxima sessão do cronograma ·
tags impossíveis (matéria fora do edital) fora da vitrine · divisa "Sentinela" → "Atalaia" ·
"Fôlego de Combate" agora pede 2 h (repetia a "Guarda Estendida") · Instrução fala em
"especialização" e mostra o XP sem bônus · nomes das tags **com acento** (a lista do `divisa.js`
passou a ser derivada do catálogo — havia 4 cópias).

**Não feito (proposta):** a camada única `user_stats` que a auditoria recomenda. Hoje as telas já
leem das mesmas funções (`conferir` com gravadas, `pontoFraco`, `dominio_calculado`), mas não de um
objeto só.

### 01/10/2026 — a especificação de planos (Free/Pro/trial), só comparada

Ele mandou a especificação "Planos Free/Pro, Onboarding e Cache de Edital v2.0" com a ordem de **não
implementar**: só comparar. O resultado está em `historico/gap-analysis-planos.md`: 63 itens
classificados, **14 perguntas para ele** e a ordem sugerida. Os pontos que travam tudo:
o beta tem **promessa pública de "acesso gratuito e vitalício"** na página inicial (0 contas beta hoje),
e 5 itens da especificação contrariam decisões dele já registradas (caderno no grátis, Pro com 2 trocas,
habilidades secretas, rebalanceamento e guia para todos). **Nada foi alterado no produto.**

### 01/10/2026 — Auditoria pré-lançamento, Fase 1 (o mapa)

Ele pôs o `PROMPT-auditoria.md` em `historico/docs/auditoria/` (por engano; em 01/10 movido para `docs/auditoria/`) e pediu **só a Fase 1**: o mapa do
produto (seção 3), sem auditar nem implementar. Feito em `docs/auditoria/00-mapa.md`:
24 páginas, 23 tabelas (contadas na produção), 37 funções do banco, 8 funções do servidor, os
serviços externos, todos os números da tela com a fonte, 17 sistemas de recompensa e as promessas
(página inicial com número de linha). **Próximo: Fase 2 (segurança e LGPD), quando ele mandar.**

### 01/10/2026 — Auditoria, Fase 2 (segurança e LGPD)

Arquivos movidos para `docs/auditoria/` a pedido dele. Criado o projeto **`astral-dev`**
(`vtluuezwfpqgryixaaea`, grátis) para os testes entre usuários — ordem dele: *"nunca em produção"*.
Relatório em `docs/auditoria/01-seguranca-legal.md`: 69 ataques entre usuários (68 protegidos),
**3 S0** (consentimento não registrado e Google sem aceite · pagamento inexistente · migrations não
sobem do zero), **7 S1**, 6 S2, 1 S3. Nada corrigido. **Próximo: Fase 3, quando ele mandar.**

### 01/10/2026 — Auditoria, Fase 3 (números e gamificação)

No `astral-dev`, com o acervo público copiado da produção (1.980 questões, só conteúdo de prova).
10 usuários de teste (`f3-*@astral-teste.local`, **ficam no dev para a Fase 4**): os 8 da seção 13
mais `folga` e `farm`. Valor esperado calculado por um script que não usa função do servidor,
comparado com o servidor e com 72 páginas abertas no navegador. Relatório em
`docs/auditoria/02-numeros-gamificacao.md`: **0 S0, 10 S1, 11 S2, 5 S3**, 7 redundâncias,
9 colisões de nome, 6 perguntas para ele. XP, horas, sequência e domínio **bateram nos 7**; os
defeitos estão nas **regras** (5 condecorações contra a descrição, bônus retroativo, tempo
declarado valendo como estudo, gabarito antes da resposta, folga quebrando a sequência, platina
impossível). Nada corrigido. **Próximo: Fase 4, quando ele mandar.**

### 01/10/2026 — Auditoria, Fase 4 (núcleo de estudo e promessas)

No dev, com os usuários da Fase 3. **A leitura real de edital NÃO foi testada**: sem crédito, e
o 1º edital é dele. Os 9 editais reais passaram pelas travas (custo zero). Relatório em
`docs/auditoria/03-nucleo-promessas.md`: **0 S0 (mas PRO-01 bloqueia o lançamento na prática),
9 S1, 7 S2, 5 S3**, 5 perguntas. Os mais pesados: **o acervo publicado tem 113 questões com
símbolo perdido e ao menos 21 com alternativas de outra questão** (todas marcadas "revisão ok");
o cronômetro perde tempo (recarregar, fechar, tela bloqueada); o botão "Rebalancear" não faz
nada; rotina curta tira matérias do cronograma por meses; trocar de edital deixa a prova antiga;
leitura de edital que falha não conta na janela (custo sem teto quando houver crédito); 5
promessas da página inicial não existem. Nada corrigido. **Próximo: Fase 5, quando ele mandar.**

### 01/10/2026 — Auditoria, Fase 5 (experiência, negócio e código)

As 8 jornadas: a da Ana (aluna nova, celular básico, 4G fraco) percorrida inteira no dev com a IA
**simulada no navegador** (custo zero); Bruno, Carla e Eva param no 1º passo (não há assinatura nem
trial); Diego, Fábio, Gabi e o atacante com os dados das Fases 2–4. 19 páginas medidas a 360 px no
4G lento (7 públicas na produção, só leitura). Relatório em `docs/auditoria/04-ux-negocio-codigo.md`:
**0 S0, 4 S1, 10 S2, 4 S3**, 4 perguntas. Achado novo mais grave: **a patente DESCE na primeira
promoção** para Bombeiros e PM com as patentes que o próprio prompt dá de exemplo. Também: zeros
falsos no painel carregando ou com erro; nenhum analytics/UTM/origem; 0 de 24 páginas com SEO ou
prévia de link; contraste 3,04:1 nos botões principais; regras de condecoração duplicadas no
navegador. Nada corrigido. **Próximo: Fase 6 (consolidação), quando ele mandar.**

