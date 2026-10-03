# Revisão de questões — o que conferir antes de uma questão ir ao ar

> **02/10/2026 — ordem dele**, ao aprovar a despublicação das questões quebradas (pergunta 6 da
> auditoria): *"grave esse tipo de revisão para questões pois depois vamos implementar muito mais"*.
>
> **Vale para TODA importação nova** (`tools/importa-provas.js`, provas de `provas-para-baixar.md`)
> e para o que já está no ar. Nenhuma prova nova é publicada sem passar por esta lista.

## Por que esta lista existe

Na auditoria de 01/10 (achado **BAN-01**, `docs/auditoria/03-nucleo-promessas.md`), o Banco tinha
**1.980 questões publicadas, todas marcadas "revisão ok"**, e mesmo assim:

| Defeito encontrado | Quantas | Como apareceu para o aluno |
|---|---|---|
| Símbolo perdido (≠, ≤, π, Ω, matrizes viraram quadradinho) | **113** (80 de Matemática, 28 de Física) | *"Se A = ▯ x 0 2▯ e det A = 4 3…"*, impossível de responder |
| Alternativas de outra questão | **21 confirmadas** em 29 lidas (de 60 pares suspeitos) | pergunta sobre espelho e poste com respostas sobre prensa hidráulica |
| Pedaço de outra questão colado no enunciado | vários (sem número confiável) | *"…tem o seguinte logotipo, 59 – Dadas as retas…"* |
| Depende de figura que o Banco não tem | **7 a 16** | *"conforme o desenho"*, sem desenho |
| Matéria errada | caso visto | questão de resistência elétrica classificada como Português |

**A lição:** a marca "revisão ok" não dizia nada, porque estava em todas. Revisão que não deixa
rastro do **que** foi conferido não é revisão.

## A lista — cada questão, antes de publicar

### Automático (o `tools/testa-acervo-limpo.js` falha se achar)

| # | Conferência | Situação em 02/10/2026 |
|---|---|---|
| 1 | Tem gabarito, e o gabarito aponta para uma alternativa que existe | ✅ já checa |
| 2 | Tem o número certo de alternativas para o tipo (4+ ou Certo/Errado), nenhuma vazia | ✅ já checa |
| 3 | A matéria existe na lista de matérias conhecidas (nada inventado) | ✅ já checa |
| 4 | Não é repetida no acervo | ✅ já checa |
| 5 | Enunciado com 3 palavras ou mais; sem cabeçalho/rodapé de prova dentro | ✅ já checa |
| 6 | **Nenhum caractere da área de uso privado** (U+E000 a U+F8FF): é o símbolo perdido | ✅ desde 03/10/2026 |
| 7 | **Nenhum conjunto de alternativas igual ao de outra questão da mesma prova** (fora "I, II, III" e V-F) | ✅ desde 03/10/2026 |
| 8 | **Nenhum "NN –" de outra questão colado no enunciado** | ✅ desde 03/10/2026 — só número de questão SEGUINTE, de 7 para cima (a 1ª versão pegava listas de colunas boas) |
| 9 | **Palavras de figura** ("figura", "desenho", "gráfico", "observe", "histograma", "abaixo") **sem imagem**: a questão fica despublicada até ter imagem | ✅ desde 03/10/2026 |

### À mão (o automático não pega)

| # | Conferência | Como |
|---|---|---|
| 10 | **Gabarito confere** | resolver pelo menos **5 questões por prova**, de matérias diferentes. Em 01/10 só 2 foram resolvidas, e "uma amostra de 2 não confere o acervo" |
| 11 | **Matéria confere com o enunciado** | ler 10 por prova, sorteadas |
| 12 | **Ver no celular** | abrir 5 questões no `banco.html` em tela de 360 px: fórmula, símbolo e alternativas legíveis |
| 13 | **Fonte citável** | banca, prova e ano gravados na questão, para aparecer na tela (pergunta 3 da auditoria: citar a fonte) |

### O registro

O campo `revisao` deixa de ser "ok" para todas: passa a dizer **o que** foi conferido e quando
(ex.: `auto:1-9 · mao:10-13 · 02/10/2026`). Questão sem esse registro não é publicada.

## Quando uma questão falha

**Despublicar, nunca apagar.** O `tools/arruma-acervo.js` já despublica sem apagar. Ela volta
quando for reimportada certa (roadmap 3.4), e a resposta que algum aluno já deu continua contando.

## Ligado a

- `docs/auditoria/ROADMAP.md`: itens **2.11** (despublicar + checagens 6 a 9 + botão "reportar
  erro") e **3.4** (reimportar a EEAR com os símbolos certos)
- `historico/provas-para-baixar.md`: de onde vem o material novo
- O botão **"reportar erro na questão"** (BAN-02) é o item 14 desta lista, feito pelo aluno: pega
  o que nenhuma das 13 conferências pegou

## ✏️ 03/10/2026 — estado e cargo (pedido dele)

Concurso estadual muda de estado para estado. Ao importar prova nova, registrar também **de que estado**
ela é (ou "nacional", para EEAR, EsPCEx, EFOM, ITA, Colégio Naval) e **de que cargo/nível** (soldado,
oficial…). Matéria regional — legislação, história e geografia do estado — **nunca** pode aparecer para
aluno de outro estado. Ver `docs/auditoria/ROADMAP.md` 3.25.

## ✏️ 03/10/2026 — as conferências automáticas valem (roadmap 2.11)

- Os itens **6 a 9** moram em `assets/js/defeitos-de-questao.js` — **um módulo só**, usado pela tela
  de importar (questão com defeito entra **fora do ar**, com o motivo), pelo `tools/arruma-acervo.js`
  (tira do ar o que já está publicado) e pelo `tools/testa-acervo-limpo.js` (falha se algum estiver no ar).
- Aplicado no acervo: **300 questões tiradas do ar, nenhuma apagada** — 113 símbolo perdido, 113 alternativas
  de outra questão, 64 outra questão colada, 10 figura. Ficaram **1.680** no ar.
- O campo `revisao` passou a dizer o que foi conferido: `auto 1-9 em 03/10/2026; mao 10-13 pendente`.
  As conferências **à mão (10 a 13)** continuam por fazer — elas entram na reimportação (roadmap 3.4).
- Item 14, o do aluno: o botão **"Achou um erro nesta questão? Avise"** grava em `questoes_reportadas`; o
  `checa-saude` avisa quando há relato esperando revisão. Depois de revisar, marcar `resolvido_em`.

## ✏️ 03/10/2026 — a primeira reimportação (roadmap 3.4)

- **61 voltaram ao ar** depois de passar pela lista inteira: automático 1-9 (o detector rodou sobre o
  acervo como ficaria) e **à mão 10-13** — texto inteiro lido, **conta resolvida** nas de cálculo,
  matéria e assunto conferidos, 5 vistas no celular de 360 px. `revisao` de cada uma diz isso.
- **Lição para a próxima importação:** reimportar não conserta prova de duas colunas — o leitor lê
  igual. E símbolo de volta não basta: raiz, fração e barra de conjugado o PDF **desenha**, não escreve.
- **Regra 7 refinada:** alternativas "de molde" (V/F, "1 - 4 - 3 - 2", "I e II", "Somente I está
  correto") se repetem de verdade; só são defeito quando o enunciado não tem a forma que pedem.
- **Item 6:** os códigos sem ambiguidade da SymbolMT viram o caractere já na importação
  (`trocarSimbolos` em `assets/js/prova.js`). MT Extra e pedaços de colchete continuam acusados.
- **Duas armadilhas que a lista não tinha, acrescentar:** questão de "according to the text" sem o
  texto guardado; e a MESMA questão em dois códigos da EAGS (republicar as duas cria repetida).
