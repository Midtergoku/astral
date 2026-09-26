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
