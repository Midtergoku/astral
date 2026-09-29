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
