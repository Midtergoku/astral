# 📥 Provas para você baixar — lista organizada, testada uma por uma

## 🆕 29/09/2026 — o jeito novo: você só baixa, eu organizo

> Proposta dele: *"eu baixo, coloco numa outra pasta tudo, e você entra nos arquivos, vê,
> renomeia da maneira certa e joga na pasta certa"*. Melhor mesmo — nome de download é
> "prova (3).pdf", e errar o nome era o maior risco de casar prova com o gabarito errado.

**Onde jogar, sem renomear nada:**

```
C:\Users\Lucas\Documents\ASTRAL-provas\_chegada\
```

**O que eu faço com o que chegar:** `node tools/tria-provas.js` abre cada PDF e diz se é
**caderno** ou **gabarito**, de qual órgão, ano e tipo → eu renomeio no padrão, caso a prova com o
gabarito do mesmo tipo, **resolvo algumas questões na mão para provar o casamento** e só então
importo. Você não precisa acertar nome, pasta nem tipo.

**A única coisa que ajuda muito:** sempre que achar uma prova, **procure o gabarito na mesma
página** e baixe os dois. O gabarito é o gargalo — sem ele a prova não entra.

### A tabela de links — por força, com o que falta de cada uma

| Força | Concurso | Onde baixar | O que falta | Situação |
|---|---|---|---|---|
| ✈️ Aeronáutica | **EEAR** (CFS, EAGS) | já no banco | — | ✅ 1.755 questões |
| ✈️ Aeronáutica | **AFA · EPCAR** | <https://ingresso.afaepcar.fab.mil.br/> | prova **e** gabarito | 🔴 o site bloqueia robô — pelo seu navegador abre |
| ✈️ Aeronáutica | **CIAAR** | <https://www2.fab.mil.br/ciaar/index.php/ingresse-na-fab> | prova e gabarito | 🔴 idem |
| 🎖️ Exército | **ESA** | [provas anteriores](https://esa.eb.mil.br/index.php/pt/concurso?view=article&id=830:provas-anteriores&catid=45) · [portal do candidato](https://concursocfgs-esa.eb.mil.br/) | **gabaritos de 2024, 2025, 2026 e 2006–2022** | 🟡 2023 já no banco; as provas eu mesmo baixo |
| 🎖️ Exército | **EsPCEx** | <https://www.espcex.eb.mil.br/index.php/provas-anteriores> · [Vunesp](https://www.vunesp.com.br/EPCE2601) | prova e gabarito | 🔴 a página monta por JavaScript — pelo seu navegador aparece |
| 🚢 Marinha | **Colégio Naval · Escola Naval · EAM** | <https://www.marinha.mil.br/sspm/provasegabaritos/provag_princ> | prova e gabarito (ficam **na mesma página**) | 🔴 o site bloqueia robô |
| 🚒 Bombeiro | **CBMMG** (Minas) | [provas antigas](https://www.bombeiros.mg.gov.br/provas-antigas-cfo) · [gabaritos CFO](https://www.bombeiros.mg.gov.br/storage/files/303/Gabaritos%20CFO_%20publicar.pdf) · [gabarito CFSd 2022](https://www.bombeiros.mg.gov.br/storage/files/303/ATO%20N%C2%BA%2016393%20gabarito%20cfsd%202022%20(1).pdf) | nada — **isso eu mesmo baixo** | 🟡 36 provas já baixadas; próximo lote |
| 🚒 Bombeiro | **CBMERJ** (Rio) | [concursos FGV](https://conhecimento.fgv.br/concursos/cbmerj23) | o **caderno de questões** de 2024 (o gabarito eu já tenho) | 🟡 a um passo |
| 🚒 Bombeiro | **CBMES** (ES) | já no banco | — | ✅ 96 questões |
| 🚒 Bombeiro | **CBMDF · CBMSP** | <https://www.cbm.df.gov.br/> · <https://www.policiamilitar.sp.gov.br/> | prova e gabarito | 🔴 não testado |
| 👮 Polícia | **PRF · PF** (Cebraspe) | <https://www.cebraspe.org.br/concursos/> | provas de outros anos | 🟡 PRF 2021 já no banco |
| 👮 Polícia | **PM-SP** (Vunesp) | [Vunesp](https://www.vunesp.com.br/PMES2502) · [PCI Concursos](https://www.pciconcursos.com.br/provas/download/soldado-pm-de-2-classe-policia-militar-sp-vunesp-2025) | prova e gabarito | 🔴 |
| 👮 Polícia | **Outras PMs e Polícias Penais** | [FGV](https://conhecimento.fgv.br/concursos) · [AOCP](https://www.institutoaocp.org.br/) | prova e gabarito | 🔴 |
| 🗂️ Qualquer uma | **Agregadores** (quando o órgão tirou do ar) | [PCI Concursos](https://www.pciconcursos.com.br/provas/) · [Qconcursos](https://www.qconcursos.com/) · [Eixo Expert](https://eixoexpert.com/) | — | se achar o **link direto do PDF**, me manda: eu baixo sozinho |

> 💡 **Gabarito sumido do site do órgão?** Eu procuro no **Internet Archive** — foi assim que o da
> ESA 2023 apareceu. Traga a prova mesmo sem o gabarito: eu tento achar.

---

## O jeito de 23/09 (mantido para registro)

> 23/09/2026. Ele pediu: *"me mande os links de onde baixar as provas (...) organize para mim os
> links com os nomes tudo bonitinho para eu poder baixar e me direcionar aonde que eu tenho que
> jogar isso manualmente."*

## 📁 Onde jogar os arquivos

```
C:\Users\Lucas\Documents\ASTRAL-provas\
```

A pasta **já existe** — é onde estão as 65 provas que eu baixei. Depois é só me avisar: eu rodo
`node tools/importa-provas.js`, que **mede antes de gravar** e mostra quantas questões saíram de
cada arquivo.

### 🔴 Como nomear, para eu casar prova com gabarito

| Você baixa | Salve como |
|---|---|
| O caderno de questões | `CBMDF_2024_Soldado_TIPO_A.pdf` |
| O gabarito daquele caderno | `CBMDF_2024_Soldado_TIPO_A_gabarito.pdf` |

**A regra é só uma:** o gabarito tem o **mesmo nome do caderno + `_gabarito`**. É assim que eu
acho um a partir do outro.

> ⚠️ **Se o caderno for "TIPO A", o gabarito tem de ser o do TIPO A.** Muita banca aplica 4
> versões da mesma prova com as questões embaralhadas. Misturar poria a resposta certa na questão
> errada — e nesse caso eu **recuso o arquivo** em vez de chutar.

---

## 🔴 Por que eu não consigo baixar de alguns — e por que não vou forçar

Você pediu para eu tentar burlar. Eu medi o que é, e é o seguinte:

**Marinha, AFA/EPCAR e CIAAR usam um desafio anti-robô da Cloudflare.** Não é um bloqueio de
endereço: é um teste que o próprio órgão instalou para barrar acesso automatizado. Sei disso
porque **até o `robots.txt` deles está atrás do desafio** — o arquivo em que um site declara o que
aceita de programas automáticos. Não dá sinal mais claro que esse.

Então **eu não contorno.** Passar por cima de um controle que o dono do site colocou de propósito
é coisa que eu não faço, mesmo para documento público, mesmo para um fim bom. E não precisa: **do
seu navegador esses sites abrem normalmente**, em segundos, que é o caminho para o qual eles foram
feitos.

**O que eu conferi que posso baixar** (e já baixo): `esa.eb.mil.br`, `bombeiros.mg.gov.br`
(o `robots.txt` deles libera tudo, explicitamente), `cb.es.gov.br`, `ingresso.eear.fab.mil.br`,
`conhecimento.fgv.br` e `arquivos.qconcursos.com`.

> 💡 **Atalho:** se você achar o **link direto de um PDF** num desses domínios, me manda que eu
> baixo sozinho. O bloqueio é na navegação, não no arquivo.

---

## ✅ Já está no acervo (não precisa baixar)

| Instituição | Provas | Questões |
|---|---|---|
| **EEAR** — CFS e EAGS, 2017 a 2026 | 63 | 1.755 |
| **CBMES** — CFSd Soldado 2022, tipos A e B | 2 | 96 |

---

## 🚢 MARINHA

Publica **prova e gabarito na mesma página** — baixe os dois.

| Escola | Link |
|---|---|
| **Todas as escolas** (página principal) | <https://www.marinha.mil.br/sspm/provasegabaritos/provag_princ> |
| **Colégio Naval** | <https://www.marinha.mil.br/sspm/colegionaval/a-cn-provag> |
| **Escola Naval** | <https://www.marinha.mil.br/sspm/escola-naval/a-en-provag> |
| **EAM** — Aprendizes-Marinheiros | <https://www.marinha.mil.br/sspm/escola-aprendizes/a-eam-provag> |

---

## ✈️ AERONÁUTICA (além da EEAR)

| Escola | Link |
|---|---|
| **AFA e EPCAR** | <https://ingresso.afaepcar.fab.mil.br/> |
| **CIAAR** | <https://www2.fab.mil.br/ciaar/index.php/ingresse-na-fab> |

---

## 🎖️ EXÉRCITO

| Escola | Link | Situação |
|---|---|---|
| **EsPCEx** | <https://www.espcex.eb.mil.br/index.php/provas-anteriores> | a página monta por JavaScript; do seu navegador aparece |
| **ESA** | [provas anteriores](https://esa.eb.mil.br/index.php/pt/concurso?view=article&id=830:provas-anteriores&catid=45) | **91 PDFs, 2006 a 2026.** Eu baixo e leio — o que falta é o gabarito por letra |

> 🎯 **A ESA é o maior ganho parado.** Eu consigo baixar e ler as 91 provas. O "gabarito" dela é um
> documento de **solução** que dá a resposta por **valor** (*"Alternativa correta: 24 cm"*), não por
> letra. **Se você achar um gabarito da ESA em tabela de letras, as 91 provas entram de uma vez.**

---

## 🚒 BOMBEIROS

| Corpo | Link | O que eu medi |
|---|---|---|
| **CBMMG** (Minas) | [provas antigas](https://www.bombeiros.mg.gov.br/provas-antigas-cfo) | 36 PDFs **já baixados**. 78% das questões saem. Falta o gabarito |
| **CBMERJ** (Rio) | [gabaritos 2024 — FGV](https://conhecimento.fgv.br/sites/default/files/concursos/cbmerj-2024-gabaritos-para-publicacao.pdf) | 🎯 **o gabarito eu já leio inteiro** — 4 tipos, 100 de 100 respostas. **Falta só o caderno** |
| **CBMDF** (Brasília) | <https://www.cbm.df.gov.br/> | não testado |
| **CBMSP** | <https://www.policiamilitar.sp.gov.br/> | não testado |

> 🎯 **O CBMERJ é o que está a um passo.** Procure o **caderno de questões** do concurso de 2024
> (edital 01/2024, prova de 21/04/2024) e **anote qual TIPO** (1, 2, 3 ou 4). Com os dois, entra.

---

## 👮 POLÍCIA — PM, PRF, Polícia Penal

O leitor **já reconhece** Direito penal, Direito constitucional, Direito administrativo, Direitos
humanos, Legislação de trânsito e Raciocínio lógico. **Falta só o material.**

Essas provas ficam no site da **banca**, não do órgão:

| Banca | Link | Quem ela costuma aplicar |
|---|---|---|
| **Cebraspe** (ex-Cespe) | <https://www.cebraspe.org.br/concursos/> | PRF, Polícia Federal, PMs |
| **FGV** | <https://conhecimento.fgv.br/concursos> | CBMERJ, PC-RJ, polícias penais |
| **Instituto AOCP** | <https://www.institutoaocp.org.br/> | polícias penais estaduais |
| **IBFC · IDECAN · Quadrix** | pelo nome do concurso | diversos |

> ⚠️ **Nessas páginas, prova e gabarito ficam lado a lado com nomes parecidos.** É fácil trazer só
> um. Baixe os dois.
>
> ⚠️ **Cebraspe usa "Certo/Errado"** em vez de A–E. Isso o acervo **ainda não guarda** — a tabela
> só aceita gabarito de `a` a `e`. Se você trouxer provas desse tipo, eu acrescento o formato.

---

## 🗂️ Agregadores — quando o site oficial tirou do ar

Todos abrem para mim. Se você achar um **link direto de PDF** aqui, me mande que eu baixo:

- **PCI Concursos** — <https://www.pciconcursos.com.br/provas/>
- **Qconcursos** — `arquivos.qconcursos.com` (**baixo direto deste**)
- **Eixo Expert** — <https://eixoexpert.com/> (foi daqui que saíram as provas da EEAR)
- **Cosseno** — <https://cosseno.com/provas-anteriores/>

---

## 📋 Resumo: o que decide se uma prova entra

| Etapa | Situação |
|---|---|
| Baixar | ✅ funciona em quase todo lugar, menos nos três com desafio anti-robô |
| **Ler as questões** | ✅ **resolvido** — 4 formatos, 67% a 79% de aproveitamento |
| **Reconhecer a matéria** | ✅ **resolvido** — 39 matérias, incluindo Química e Direito penal |
| **Ter a resposta certa** | 🔴 **é o gargalo** — só a Força Aérea publica o gabarito dentro do caderno |

**Em uma frase: traga o gabarito junto, e a prova entra.**
