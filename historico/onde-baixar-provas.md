# 📥 Onde baixar prova antiga — a lista, com o que eu testei um por um

> Escrito em 22/09/2026, a pedido dele: *"você vai me dar o link dessas provas, dos PDFs, e eu
> vou baixar, jogar tudo em uma pasta onde você me indicar."*

## Onde pôr os arquivos

```
C:\Users\Lucas\Documents\ASTRAL-provas\
```

A pasta **já existe** — é onde estão as 63 provas que eu baixei. Ela fica **fora do projeto**
de propósito: o repositório é público e cada prova pesa ~500 KB.

Depois de jogar os PDFs lá, é só me avisar. Eu rodo `node tools/importa-provas.js`, que **mede
antes de gravar** e mostra quantas questões saíram de cada arquivo.

> **Ou, sem esperar por mim:** arraste o PDF em **Questões → Minhas questões**, no site. Ele é
> lido dentro do seu navegador e fica guardado só na sua conta. Serve para testar um arquivo
> antes de decidir se vale a pena.

---

## 🔴 O que decide se uma prova serve: o gabarito

Eu testei 40 PDFs de seis instituições diferentes. **A extração das questões funciona em quase
todos** — o que separa os que entram no acervo dos que não entram é uma coisa só:

| | |
|---|---|
| ✅ **Serve** | o **gabarito está dentro do mesmo PDF**, como tabela de letras |
| 🔴 **Não serve sozinho** | o gabarito é publicado num arquivo **separado** |

**Por que isso é inegociável:** sem a resposta certa, a questão não dá para estudar — e adivinhar
a resposta seria pior que não ter a prova. A pessoa estudaria errado e culparia o site.

**Ao baixar, procure o arquivo do gabarito junto.** Se vier separado, baixe os dois e ponha na
pasta com nomes parecidos (`prova-x.pdf` e `prova-x-gabarito.pdf`) — eu sei casar os dois, desde
que o gabarito seja uma **tabela de letras** (`1 2 3 4 / D C E A`) e não um texto de solução.

> ⚠️ **Cuidado com "PROVA TIPO A / TIPO 1".** Muita banca aplica 4 versões da mesma prova, com as
> questões embaralhadas — e o gabarito traz as 4. **O tipo do caderno tem de bater com o tipo do
> gabarito.** Se você baixar o caderno TIPO A, baixe o gabarito do TIPO A. Se não der para saber,
> eu recuso o arquivo em vez de chutar.

---

## Força Aérea — ✅ já está tudo no acervo

| Escola | Onde | Situação |
|---|---|---|
| **EEAR — CFS e EAGS** | `ingresso.eear.fab.mil.br` | ✅ **63 provas já baixadas**, 2017 a 2026. O gabarito vem no mesmo PDF |
| **EPCAR · AFA · CIAAR** | `fab.mil.br` · `ingresso.afaepcar.fab.mil.br` | 🔴 **Esses servidores recusam qualquer pedido meu (erro 403).** Do seu navegador devem abrir normalmente |

- AFA / EPCAR: <https://ingresso.afaepcar.fab.mil.br/>
- CIAAR: <https://www2.fab.mil.br/ciaar/index.php/ingresse-na-fab>

---

## Exército

| Escola | Link | O que tem |
|---|---|---|
| **ESA** (sargentos) | [provas anteriores no site oficial](https://esa.eb.mil.br/index.php/pt/concurso?view=article&id=830:provas-anteriores&catid=45) | **91 PDFs, de 2006 a 2026.** Eu consigo baixar e ler |
| **EsPCEx** (cadetes) | <https://www.espcex.eb.mil.br/index.php/provas-anteriores> | A página carrega por JavaScript e eu não enxergo os links; do seu navegador aparecem |

> 🔴 **Por que a ESA não entrou no acervo, apesar de eu conseguir baixar:** o "gabarito" dela é um
> documento de **solução**, que dá a resposta **por valor** — *"Alternativa correta: 24 cm"* — e
> não por letra. Casar isso com as alternativas seria adivinhação. **Se você achar o gabarito da
> ESA em tabela de letras, as 91 provas entram de uma vez.**

---

## Marinha — 🔴 o servidor me recusa, mas você consegue

Todos dão **erro 403** para mim. Do navegador abrem normalmente:

- **Todas as escolas, página principal:** <https://www.marinha.mil.br/sspm/provasegabaritos/provag_princ>
- **Colégio Naval:** <https://www.marinha.mil.br/sspm/colegionaval/a-cn-provag>
- **Escola Naval:** <https://www.marinha.mil.br/sspm/escola-naval/a-en-provag>
- **EAM (Aprendizes-Marinheiros):** <https://www.marinha.mil.br/sspm/escola-aprendizes/a-eam-provag>

A Marinha publica **prova e gabarito na mesma página**, então é só baixar os dois.

---

## Bombeiros

| Corpo | Link | O que eu medi |
|---|---|---|
| **CBMMG** (Minas) | [provas antigas — CFO e CFSd](https://www.bombeiros.mg.gov.br/provas-antigas-cfo) | **36 PDFs.** Baixei todos. As questões saem bem (39 de 50 numa prova de soldado), mas **nenhum traz gabarito dentro** |
| **CBMES** (Espírito Santo) | [prova CFSd 2022](https://cb.es.gov.br/Media/CBMES/RH/CFSd_2022/Provas/PROVA%20-%20TIPO%20A.pdf) | **93 questões de 118 (79%)**, e com Química, Biologia, História, Geografia, Física e Matemática. Sem gabarito dentro |
| **CBMERJ** (Rio) | [gabaritos 2024 — FGV](https://conhecimento.fgv.br/sites/default/files/concursos/cbmerj-2024-gabaritos-para-publicacao.pdf) | O **gabarito** é tabela de letras e eu **leio os 4 tipos, 100 de 100 respostas cada**. Falta o caderno de questões |
| **CBMDF** (Brasília) | <https://www.cbm.df.gov.br/> | não testei |

> 🎯 **O CBMERJ é o caso mais próximo de fechar:** eu já consigo ler o gabarito dele inteiro. Se
> você achar o **caderno de questões** do mesmo concurso (e anotar qual TIPO), aquela prova entra.

---

## Polícia — o que ele pediu e ainda não existe

Ele citou **policial penal**, **polícia rodoviária federal** e matérias como **Direito penal**.
O leitor **já sabe reconhecer** essas matérias (Direito penal, Direito constitucional, Direito
administrativo, Direitos humanos, Legislação de trânsito, Raciocínio lógico) — falta o material.

As bancas que aplicam esses concursos publicam prova e gabarito:

- **Cebraspe (ex-Cespe):** <https://www.cebraspe.org.br/concursos/> — abre o concurso e vá em
  "Provas e gabaritos"
- **FGV:** <https://conhecimento.fgv.br/concursos> — foi de onde saiu o gabarito do CBMERJ
- **Instituto AOCP, IBADE, IDECAN, Quadrix:** cada um tem a própria página de provas anteriores

> ⚠️ **Baixe o caderno DE QUESTÕES, não só o gabarito.** Nos concursos grandes os dois ficam lado
> a lado na mesma página, com nomes parecidos — é fácil trazer só um.

---

## Agregadores (quando o site oficial tirou a prova do ar)

Não são fonte oficial, mas costumam ter o que sumiu. Todos abrem para mim, então se você preferir
me mandar o **link direto de um PDF** daqui, eu baixo sozinho:

- **PCI Concursos:** <https://www.pciconcursos.com.br/provas/>
- **Qconcursos (arquivos):** `arquivos.qconcursos.com` — **eu consigo baixar deste**
- **Eixo Expert:** <https://eixoexpert.com/> — foi de onde saíram os links das provas da EEAR
- **Cosseno:** <https://cosseno.com/provas-anteriores/>

---

## Resumo do que eu testei

| Instituição | Consigo baixar? | Questões saem? | Gabarito dentro? | No acervo? |
|---|---|---|---|---|
| EEAR (CFS, EAGS) | ✅ | ✅ 77% | ✅ | ✅ **1.755 questões** |
| ESA | ✅ | ✅ 67% | 🔴 só por valor | 🔴 |
| CBMMG | ✅ | ✅ 78% | 🔴 separado | 🔴 |
| CBMES | ✅ | ✅ 79% | 🔴 separado | 🔴 |
| CBMERJ | ✅ | — (só peguei o gabarito) | ✅ **tabela lida, 4 tipos** | 🔴 falta o caderno |
| Marinha | 🔴 403 | — | — | 🔴 |
| EPCAR · AFA · CIAAR | 🔴 403 | — | — | 🔴 |
| EsPCEx | 🔴 página por JS | — | — | 🔴 |

**A leitura não é mais o gargalo — o gabarito é.** Quatro formatos de prova já são entendidos
(FAB, `Questão NN`, `NN.`, e o de círculos da ESA), e 39 matérias são reconhecidas, incluindo
Química, Direito penal e Proteção e defesa civil.
