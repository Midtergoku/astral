# Auditoria pré-lançamento — Relatório final (Fase 6)

> **01/10/2026** · Consolida as Fases 1 a 5 (`00-mapa.md`, `01-seguranca-legal.md`,
> `02-numeros-gamificacao.md`, `03-nucleo-promessas.md`, `04-ux-negocio-codigo.md`).
> **Nenhuma correção foi feita** em nenhuma fase. Cada achado mantém o ID da fase em que nasceu —
> a evidência completa (consulta, teste, captura, arquivo:linha) está lá.
>
> **Deduplicação:** as fases registraram **82** achados; aqui ficam **76** — 6 fusões, listadas na
> seção 9. **Reavaliação:** com a visão do todo, **6 severidades mudaram** (seção 9, com o porquê).

---

## 1. Veredito

**🔴 NÃO está pronto para o lançamento pago.**

Há **4 bloqueadores (S0)**. Dois são de lei e de dinheiro: o consentimento não é registrado e não
existe pagamento. Um é de sobrevivência: o banco não tem cópia automática, e a receita escrita
para restaurá-lo não funciona. E o quarto é o mais simples de dizer: **a promessa central — "a IA lê
seu edital" — nunca aconteceu uma única vez** (0 leituras em toda a história da produção).

O que sustenta o produto **está sólido**: o isolamento entre alunos resistiu a 68 de 69 ataques;
XP, horas, sequência e domínio bateram com a conta feita à mão em 7 usuários de teste; as travas
de plano estão no servidor; nenhuma tela quebra no celular. **Os defeitos estão nas regras e nas
promessas**, não nos alicerces — por isso a maioria se corrige em menos de uma hora cada.

**Para lançar** é preciso: os 4 S0 (seção 2) e, antes de cobrar de alguém, pelo menos os S1 que
mexem com o que o aluno paga para ter — o Banco de questões com questões quebradas (BAN-01), o
tempo de estudo medido errado (CRN-01, NUM-04), a patente que desce (JOR-01) e os números falsos
na tela (UX-01, NUM-01, NUM-03). A lista completa está no checklist da seção 8.

| | S0 | S1 | S2 | S3 | Total |
|---|---|---|---|---|---|
| Achados (depois da deduplicação) | **4** | **22** | **36** | **14** | **76** |

---

## 2. Todos os S0, na ordem de correção

A ordem segue a dependência: primeiro o que protege tudo (a cópia do banco), depois o que a lei exige
antes do primeiro aluno de verdade, depois o que destrava a promessa, por último o que destrava a
cobrança — que é o maior e depende de decisões dele.

| # | S0 | O que é | Origem | Esforço |
|---|---|---|---|---|
| **1** | **Recuperação de desastre** | O plano grátis do Supabase **não faz backup**; o nosso só roda quando alguém executa a ferramenta. E a receita de restauração quebra no passo 2: **9 das 43 migrations falham** num banco vazio (`perfis`, `lista_espera` e a função de criar perfil foram feitas no painel e nunca entraram nas migrations) | OPS-01 + OPS-02 | M + M |
| **2** | **Consentimento não registrado** | O aceite dos Termos só é conferido no cadastro por e-mail, e só no navegador; o **"Cadastrar com Google" não pede aceite**; em nenhum caminho fica gravado quem aceitou, quando e qual versão (LGPD art. 8º, §2º) | LGL-01 | M |
| **3** | **A leitura do edital nunca rodou** | Produção: **0 editais lidos, 0 usos de IA na história, 0 guias**. Hoje, sem crédito, quem sobe um edital recebe "serviço indisponível". **Antes** de pôr crédito, fechar o furo de custo: leitura que falha não conta na janela, então dá para gastar sem teto (EDI-01, S1, entra aqui como pré-requisito). E a ordem dele: **o 1º edital de verdade é do Lucas**, depois de reverter a simulação da conta dele | PRO-01 (+ EDI-01) | P + crédito (US$ 5, decisão dele) |
| **4** | **Pagamento não existe** | Sem webhook do Mercado Pago, sem validação de assinatura, sem trial, mensal, trimestral, anual ou fundador, sem arrependimento (CDC art. 49), sem cancelar. **Nenhum lugar do produto para assinar** — as jornadas do Bruno, da Carla e da Eva param no 1º passo. A página inicial promete "basta cancelar na sua conta". E no dia da 1ª cobrança a **Vercel grátis deixa de valer** (proíbe uso comercial): US$ 20/mês (`historico/valores.md` § 10) | PAG-01 + NEG-02 | G (depende das 14 perguntas de `historico/gap-analysis-planos.md`) |

---

## 3. Todos os S1, por área

### Segurança e conta
| ID | Achado | Esforço |
|---|---|---|
| SEG-01 | Qualquer um, **sem login**, grava sem limite na tabela de erros — 25 de 25 gravados; ~30 mil pedidos enchem os 500 MB e o banco vira **só leitura para todo mundo** | M |
| SEG-02 + SEG-03 | **E-mail não chega ao aluno** (SMTP padrão): sem "esqueci a senha", sem troca de e-mail. E com a confirmação automática ligada, dá para **criar conta com o e-mail de outra pessoa** (risco de sequestro prévio via Google, não reproduzido). Destrava com a **senha de app do Gmail** | P (depois da senha) |
| EDI-01 + SEG-06 | **Custo de IA sem teto global**: leitura que falha (2 chamadas pagas) não conta; os limites são por conta e contas falsas só esbarram no captcha. O crédito pré-pago é o único teto. **Pré-requisito do S0 nº 3** | P (falha) + M (teto global) |

### LGPD
| ID | Achado | Esforço |
|---|---|---|
| LGL-02 | **Menores**: nenhuma pergunta de idade nem autorização de responsável, e Política ("maiores de 18") e Termos ("16 ou mais") divergem. O público tem 17 anos (EsPCEx, EEAR). **Pode virar S0** no dia da 1ª cobrança (menor contratando) — pergunta 1 | M |
| LGL-03 | "Baixar meus dados" entrega **menos da metade** do prometido (faltam conquistas, respostas, caderno, guia, TAF…) | P |
| LGL-04 | Excluir a conta deixa **três rastros**, um deles o **e-mail na auditoria, para sempre** | P |

### Números que a tela mostra
| ID | Achado | Esforço |
|---|---|---|
| UX-01 | Carregando ou com erro, o painel mostra **"Recruta, 0 dias, 0h"** como se fosse real — para quem tem 45 dias seguidos | M |
| NUM-01 | **Amplitude conta matéria fora do edital**: "9 matérias de 4 do edital" = 100; dá "Frente Ampla" e "Batedor" a quem nunca estudou Inglês; o servidor aceita sessão de matéria que não está no edital | P |
| NUM-02 | **5 condecorações fazem outra coisa do que a descrição diz**: Relógio na Mão (pomodoro não conta), Duas Frentes (pede 4 matérias, não 2), Começo de Semana e Domingo de Serviço (contam sessões, não dias), Turno da Noite e Vigília (hora do fim, não do começo) | P (× 2: as regras existem no servidor **e** no navegador — COD-01) |
| NUM-03 | **A mesma matéria tem dois domínios no mesmo dia** (o de hoje e o da segunda-feira, que o cronograma usa). Efeito visível: o aviso *"o cronograma desta semana já dá mais tempo a Física"* é **falso** — dá mais tempo a Português, que está em 100% | P |

### Gamificação
| ID | Achado | Esforço |
|---|---|---|
| JOR-01 | **A patente DESCE na 1ª promoção** para Bombeiros e PM, com as patentes que o próprio prompt dá de exemplo ("Soldado" → "Aluno-Soldado BM") — o público principal | P |
| GAM-01 | **O bônus da Instrução vale para o passado**: escolher 6 especializações subiu o XP de 10.800 para 15.756 e a patente um posto **sem estudar**; "Recomeçar" **desce** a patente — e a tela diz "nenhuma especialização tira nada de você" | M |
| GAM-04 | **A folga que a própria rotina manda quebra a sequência**: quem obedece "segunda a sábado" nunca passa de 6 dias — 10 condecorações e 5 divisas impossíveis (pergunta 2) | M |
| GAM-05 | **Platina e "Condecorado" impossíveis**: exigem domínio médio de 100% (matéria sem Banco para em 70%) e **sumir 30 dias** | P |

### Núcleo de estudo
| ID | Achado | Esforço |
|---|---|---|
| BAN-01 | **O Banco publicado tem questões quebradas, todas marcadas "revisão ok"**: 113 com símbolo perdido (quadradinhos no lugar de ≠, π, matrizes — 80 de Matemática); pelo menos 21 com **alternativas de outra questão**; 7 a 16 que dependem de figura que não existe. Vista no celular: uma questão de determinante com alternativas sobre retas | P (despublicar) + M (reimportar) |
| CRN-01 | **O cronômetro perde tempo**: recarregar apagou 3 min, fechar o pomodoro apagou 10, tela bloqueada (simulada) marcou 2 de 12 min; a 2ª aba mostra XP que o servidor recusou | M |
| NUM-04 | **Cronômetro e cronograma não se enxergam**: a sessão cronometrada não marca o bloco do dia, e marcar depois **conta o tempo duas vezes** | P |
| EDI-02 | **Não dá para corrigir matéria, peso ou data** lidos errado — só trocar de edital, o que gasta a janela de 30 dias; o mesmo PDF devolve a mesma leitura (cache); "Pesos lidos do edital" aparece mesmo quando a IA dividiu igual | M |
| CRO-01 | **Rotina curta faz matérias sumirem**: com 1 dia de 1 h (opção da tela), História, Geografia e Informática não aparecem **em 52 semanas** — e a tela promete "toda matéria aparece pelo menos uma vez" | P |
| CRO-02 | O botão **"Rebalancear cronograma" não faz nada** (diz "Cronograma rebalanceado!"), e sugere "Prioridade alta" para matéria em 88% | P |
| CAL-01 | **Trocar de edital deixa a prova antiga**: o mesmo painel mostra "faltam 170 dias" numa parte e "66 dias restantes" em outra | P |

### Promessas
| ID | Achado | Esforço |
|---|---|---|
| PRO-02 | **5 promessas da página inicial que o produto não tem**: lembretes que "aprendem com seus hábitos", subtópicos, cronograma pelo tempo até a prova, "cancele na sua conta", "concurseiros já estão na lista de espera" (0 inscritos) | P (texto) — pergunta 9 |

---

## 4. O que remover ou fundir

| O quê | Proposta | Ganho |
|---|---|---|
| **Tag por matéria × Habilidade por matéria** (mesmos 14 nomes, mesmo gatilho ≥ 70%) — RED-01 | **Fundir**: a tag ganha o estado "enferrujada"; a seção de habilidades sai | um sistema a menos para o aluno entender |
| **Condecorações × Quadro de operações** (as mesmas 74, outra vista) — RED-02 | **Fundir**: o Quadro vira aba de Conquistas | um item a menos no menu |
| **Atributo × condecoração × divisa × campanha no mesmo gatilho** (Disciplina 60 = Ordem Unida + Atalaia, etc.) — RED-03 | **Diferenciar**: a divisa vem junto com a condecoração | 4 avisos pelo mesmo feito viram 1 |
| **Missões com o nome de condecorações** (Dois Turnos, Duas Frentes, Relógio na Mão, Turno da Noite — regras diferentes) — RED-04 | **Renomear** as missões | acaba a confusão "ganhei ou não?" |
| **Botão "Rebalancear cronograma"** (CRO-02) + `montarCronograma` | **Remover** (o cronograma se rebalanceia sozinho toda segunda) ou transformar em explicação | um botão que mente a menos |
| **Badges antigos** (`progresso.badges`) — RED-06 | **Remover** | dado gravado que ninguém vê |
| **Código morto**: `TABELAS_NIVEIS` (2 páginas), `ligacaoAcesa`, `comEspera`, `tagDe`, `meu_dominio()`, plano "premium" e selo `#user-plan` (4 páginas) — COD-03, COD-04 | **Remover** | menos lugar para errar |
| **As 74 regras de condecoração em dois lugares** (servidor e navegador) — COD-01 | **Fundir no servidor**: ele já calcula o progresso; o navegador só desenha | cada conserto feito uma vez (hoje os 5 da NUM-02 são 10) |
| **11 blocos no primeiro acesso**, com prévias desfocadas de números falsos — UX-05 | **Remover do primeiro acesso**: só o envio do edital | o aluno sabe o que fazer em 5 segundos |
| **"XP" com dois sentidos** (estudo × TAF) — RED-07 | **Renomear** o do TAF ("pontos de preparo") | — |
| **Patente / nível / rank / posto**; **divisa** com dois sentidos — seção 6.3 da Fase 3 | **Um nome para cada coisa** | vocabulário que um aluno novo aprende |

**Manter, mesmo parecendo sobra:** os redirecionamentos `edital.html` e `recursos.html` (links
antigos); `questoes.html` e `FUNCOES_DESLIGADAS` (desligados de propósito desde 31/07); os marcos do
diário (história, não prêmio — RED-05).

---

## 5. O que falta para o produto cumprir o que promete

| Promessa | Falta | Onde está o achado |
|---|---|---|
| "Transforme seu edital num plano em poucos minutos" | a **1ª leitura real**; medir o tempo; o aluno poder **corrigir** a leitura | S0 nº 3, EDI-02, PRO-03 |
| "Plano Pro R$ 19,90" / "cancele na sua conta" | **pagamento, planos e cancelamento** | S0 nº 4 |
| "Questões de provas militares, do jeito que caíram" | um acervo **sem questões quebradas** e um botão para o aluno **reportar** erro | BAN-01, BAN-02 |
| "Cronograma pelo tempo até a prova" / "metas" / "rebalanceia pelo desempenho" | o cronograma **usar a data** (reta final, prova passada), **rodízio** de matérias em rotina curta, um domínio só | CRO-01, CRO-03, NUM-03 |
| "Lembretes inteligentes" | **qualquer lembrete** — e, antes, e-mail que chegue | PRO-02, UX-07, SEG-02 |
| "Extrai matérias, **subtópicos** e pesos" | subtópicos (ou tirar a palavra) | PRO-02 |
| "Feito para quem tem TDAH" | um recurso específico (ou tirar a frase) | PRO-03 |
| Beta "gratuito e vitalício", "suporte direto", "grupo exclusivo" | decidir o beta; um **canal de suporte** visível | PRO-04 |
| "Cada hora estudada vira XP" | o tempo medido **certo** (cronômetro por relógio, sem dobrar) | CRN-01, NUM-04 |
| Patentes "da sua carreira" | escada que **não desce** e não depende do jeito que a IA escreveu a patente | JOR-01, GAM-07 |
| "Baixar meus dados", "excluir é definitivo", "sair de todos derruba" | exportação completa, exclusão sem rastro, texto honesto sobre a 1 h do token | LGL-03, LGL-04, SEG-04 |
| (implícita) o aluno sabe de onde veio e o dono sabe o que funciona | **origem do cadastro e eventos de funil**; painel de negócio | NEG-01, NEG-04 |
| (implícita) um link compartilhável | descrição, imagem de prévia, ícone | NEG-03 |
| (implícita) um final para quem passa | "Passei!" — comemoração, depoimento, próximo concurso | jornada 7 (Fase 5) |

---

## 6. Plano de correção em lotes

Esforço: **P** < 1 h · **M** 1–4 h · **G** > 4 h. As estimativas são por item, de código; **não
incluem** as decisões do Lucas que alguns pedem (marcadas com ❓) nem o tempo de esperar terceiros
(senha do Gmail, crédito, Mercado Pago).

### Lote 1 — os S0 (nenhum lançamento com S0 aberto)
| Ordem | Item | Esforço | Depende de |
|---|---|---|---|
| 1 | Migration "zero" (`perfis`, `lista_espera`, `criar_perfil_usuario`, gatilho) + provar o banco subindo vazio no `astral-dev` (OPS-01) | M | — |
| 2 | Backup automático diário fora do Supabase, com restauração provada (OPS-02) | M | — |
| 3 | Aceite gravado (quem, quando, versão) para e-mail **e** Google (LGL-01) | M | versão no topo dos Termos e da Política |
| 4 | Contar a leitura que falha + teto global de gasto de IA (EDI-01, SEG-06) | P + M | — |
| 5 | Reverter a simulação da conta do Lucas → crédito → **o 1º edital é dele** → medir custo e tempo (PRO-01) | P | ❓ crédito (US$ 5) |
| 6 | Pagamento: webhook com assinatura, idempotência, planos, trial, arrependimento, cancelar; Vercel Pro (PAG-01) | G (várias sessões) | ❓ as 14 perguntas de planos; ❓ US$ 20/mês |
| **Total do lote 1** | | **4 M + 2 P + 1 G** — pela tabela de esforço, de 6 a 18 h antes do pagamento (estimativa), mais o pagamento | |

### Lote 2 — S1 de menor esforço (cada um < 1 h)
SEG-02 + SEG-03 (depois da senha do Gmail) · LGL-03 · LGL-04 ❓ · NUM-01 · NUM-02 (nos dois lugares) ·
NUM-03 · NUM-04 · JOR-01 · GAM-05 ❓ · CRO-01 · CRO-02 ❓ · CAL-01 · BAN-01 (**despublicar** as
quebradas ❓) · PRO-02 (texto) ❓.
**14 itens P — cerca de 1 a 2 dias.** Cada um ganha o teste que faltava (a lista mínima está em
COD-02, Fase 5).

### Lote 3 — o restante
- **S1 de esforço M (8):** SEG-01 · LGL-02 ❓ · UX-01 · GAM-01 ❓ · GAM-04 ❓ · CRN-01 · EDI-02 · BAN-01 (reimportar e conferir o acervo).
- **S2 (36)**, nesta ordem de valor: contraste e zoom no celular (UX-02, UX-03 — P) · SEO e prévia de link (NEG-03 — P) · fuso e meia-noite (NUM-05, NUM-06 — M) · reportar questão (BAN-02 — P) · alertas (OPS-03 — M) · origem e funil (NEG-01 — M ❓) · regras num lugar só (COD-01 — M) · testes no dev em vez da produção (COD-02 — M) · o resto da lista (seção 9).
- **S3 (14)**: quando tocar no arquivo por outro motivo.
- **Estimativa do lote 3:** 8 M (S1) + ~25 P e ~11 M (S2) + 14 P (S3) — **de 6 a 10 dias de trabalho**, conforme as decisões.

---

## 7. Perguntas para o Lucas

As 18 que as 5 fases deixaram (sem repetição), na ordem em que travam o trabalho.
**As 14 sobre planos** estão em `historico/gap-analysis-planos.md` e destravam o S0 nº 4.

**Travam um S0 ou a lei**
1. **Menores (LGL-02):** qual a idade mínima — 16 ou 18? Pergunto a data de nascimento no cadastro? Como colher a autorização do responsável entre 16 e 17?
2. **Retenção (LGL-04):** a auditoria de troca de plano pode guardar o e-mail? Por quanto tempo?
3. **Provas antigas (LGL-06):** reproduzir questões de provas oficiais num produto pago — quer opinião jurídica antes de cobrar?
4. **Beta (LGL-05 + PRO-04):** vale "gratuito e vitalício" (página inicial) ou "desconto exclusivo no lançamento" (lista de espera)? E qual é o canal do "suporte direto" e do "grupo" — o WhatsApp que o cadastro coleta?
5. **Sua conta simulada:** reverter agora ou só no dia do crédito, como combinado?

**Travam um S1**
6. **Acervo (BAN-01):** despublicar já as questões quebradas (some uma parte do Banco da EEAR, sobretudo Matemática) ou deixar até reimportar?
7. **Folga (GAM-04):** o dia de folga da rotina deve quebrar a sequência?
8. **Bônus (GAM-01):** o bônus da Instrução deve valer para o passado? A patente pode descer?
9. **Página inicial (PRO-02):** as 5 promessas sem entrega — tiro o texto agora ou construímos?
10. **Platina (GAM-05):** pode exigir sumir 30 dias?
11. **Botão "Rebalancear" (CRO-02):** tirar ou transformar em explicação?

**Definem o desenho**
12. **TDAH (PRO-03):** manter, suavizar ou tirar a frase?
13. **XP (GAM-08):** o cronômetro dar 4× mais que o cronograma fica — e a tela avisa?
14. **Escada (GAM-07):** quem faz concurso de Cadete chegar a Coronel em ~10 semanas é o desejado?
15. **Praça → oficial (Fase 3, 6.3):** a carreira atravessa de Subtenente para Aspirante por XP — manter a simplificação?
16. **Funil (NEG-01):** começar a medir origem e funil agora (tabela nossa, R$ 0) ou depois da Fase 1, como decidido em 08/09?
17. **Fim da jornada:** quer um "Passei!" — comemoração, depoimento, manter a conta para o próximo concurso?
18. **Primeiro acesso (UX-05):** o painel de quem ainda não enviou edital pode mostrar só o envio do edital?

---

## 8. Checklist "pronto para lançar"

Marcar no dia do lançamento. **Todos os itens precisam de prova** (teste, consulta ou captura), não de
"está feito".

**Bloqueadores (S0)**
- [ ] Um banco vazio sobe só com as migrations e fica igual à produção (OPS-01)
- [ ] Backup automático diário rodando há pelo menos 7 dias, e uma restauração provada (OPS-02)
- [ ] Todo cadastro — e-mail e Google — grava aceite com versão dos Termos e da Política (LGL-01)
- [ ] Pelo menos 1 edital real lido em produção (o do Lucas), com tempo e custo medidos (PRO-01)
- [ ] Leitura que falha conta na janela; teto global de gasto de IA; alerta de gasto na Anthropic ligado (EDI-01, SEG-06)
- [ ] Pagamento: webhook com assinatura validada, idempotente, testado com aprovação, recusa e estorno; cancelar e arrependimento funcionando (PAG-01)
- [ ] Vercel no plano que permite cobrar (`valores.md` § 10)

**Conta e lei**
- [ ] E-mail de confirmação e de "esqueci a senha" **chega** a um endereço de fora (SEG-02) — e a confirmação automática está desligada (SEG-03)
- [ ] Decisão sobre menores aplicada, e Política e Termos dizendo a mesma coisa (LGL-02, LGL-05)
- [ ] "Baixar meus dados" com todas as tabelas; excluir a conta sem rastro (LGL-03, LGL-04)
- [ ] A tabela de erros tem limite por origem (SEG-01)

**O que o aluno paga para ter**
- [ ] 0 questões publicadas com símbolo perdido, alternativas repetidas ou figura ausente — checagem automática no `testa-acervo-limpo.js` (BAN-01)
- [ ] O aluno consegue reportar uma questão errada (BAN-02)
- [ ] O cronômetro mede por relógio e marca o bloco do cronograma; recarregar não perde tempo (CRN-01, NUM-04)
- [ ] A patente nunca desce, em nenhuma das 6 carreiras, com nenhuma patente inicial do prompt (JOR-01)
- [ ] O aluno consegue corrigir matéria, peso e data do edital (EDI-02)
- [ ] Toda matéria aparece no cronograma em até N semanas, com qualquer rotina da tela (CRO-01)
- [ ] Nenhum número falso: carregando mostra "—", erro diz o que houve (UX-01); Amplitude, domínio e o aviso de desequilíbrio conferidos (NUM-01, NUM-03)
- [ ] As 74 descrições de condecoração batem com a regra — teste automático (NUM-02)
- [ ] Trocar de edital atualiza a prova no calendário e no painel (CAL-01)

**Promessas e vitrine**
- [ ] Toda frase da página inicial existe no produto (PRO-02, PRO-03, PRO-04) — reler a seção 6 da Fase 4
- [ ] Preço e planos na página inicial iguais aos do checkout
- [ ] Um canal de suporte visível
- [ ] Descrição, imagem de prévia e ícone (NEG-03)
- [ ] Botões principais com contraste ≥ 4,5:1; campos com 16 px (UX-02, UX-03)

**Operação**
- [ ] Bateria de testes rodando no `astral-dev`, não na produção (COD-02)
- [ ] `checa-saude` verde; `erros_cliente` sem erro novo nas últimas 24 h
- [ ] Contas de teste e simulação: 0 na produção

---

## 9. Anexo — deduplicação, reavaliação e a lista completa

### Fusões (82 → 76)
| Fundidos | Viraram | Por quê |
|---|---|---|
| OPS-01 (S0) + OPS-02 (S1) | **S0 nº 1** | são as duas metades de "se perder o banco, volta?" |
| PAG-01 (S0) + NEG-02 (S1) | **S0 nº 4** | "os planos não existem" é o mesmo fato que "não há pagamento" |
| SEG-02 + SEG-03 | **um S1** | a correção é uma sequência só (senha do Gmail → SMTP → desligar a confirmação automática) |
| EDI-01 + SEG-06 | **um S1** (pré-requisito do S0 nº 3) | ambos são "custo de IA sem teto" |
| NUM-10 (S2) em UX-05 (S2) | UX-05 | as prévias falsas e a missão impossível são parte do primeiro acesso |
| "menu do celular por cima" (S3, Fase 4) em UX-09 (S3) | UX-09 | o mesmo registro nas duas fases |

### Severidades que mudaram com a visão do todo
| ID | Antes | Agora | Por quê |
|---|---|---|---|
| PRO-01 | S1 | **S0** | a seção 4 manda classificar promessa não cumprida como S1, mas S0 é "bloqueia o lançamento" — e lançar pago com a função central **nunca executada** é exatamente isso |
| OPS-02 | S1 | **S0** (fundido) | com aluno pagando, "sem cópia automática" é risco de **perda de dados** — categoria S0; e sozinho o OPS-01 não protege nada |
| GAM-02, GAM-03, GAM-06 | S1 | **S2** | os três são trapaça pelo console. **Hoje não há ranking, raridade (R14 desligado) nem nada pago ligado a medalha**: quem trapaceia só engana a si mesmo. **Voltam a S1** no dia em que houver comparação entre alunos |
| NEG-01 | S1 | **S2** | não medir o funil não quebra a confiança do aluno — atrapalha o dono. E foi decisão dele (08/09) guardar para depois da Fase 1 |

**Mantidos depois de reconsiderar:** BAN-01 continua S1, e não S0 (não é segurança nem lei — mas é o
1º item do lote 2, porque o aluno paga por essas questões); LGL-02 continua S1, mas **vira S0** se
o lançamento aceitar menores pagando (pergunta 1); CRO-02 continua S1 ("função que não funciona" é
o exemplo literal da seção 2).

### Os 36 S2 e os 14 S3
**S2 — Segurança e operação:** SEG-04 token de 1 h depois de "sair de todos" · SEG-05 senha e sessão no mínimo · OPS-03 alertas só do site fora do ar · GAM-02 tempo declarado vale para tudo · GAM-03 gabarito antes da resposta · GAM-06 lista de matérias do navegador · GAM-10 sessão de 20 s mantém a sequência · GAM-11 cronômetro sem pergunta de presença · COD-02 testes contra a produção.
**S2 — Lei e promessas:** LGL-05 Política e Termos atrás do produto · LGL-06 uso de provas antigas · PRO-03 promessas exageradas (30 s, "IA treinada", TDAH) · PRO-04 beta contraditório.
**S2 — Números:** NUM-05 fuso do aparelho × Brasília · NUM-06 sessão que passa da meia-noite · NUM-07 "31 dias nos últimos 30" · NUM-08 dois domínios médios · NUM-09 nove formatos de hora.
**S2 — Gamificação:** GAM-07 escada depende do edital · GAM-08 4× de XP sem aviso · GAM-09 secreta revelada na página de tags.
**S2 — Núcleo:** EDI-03 cache eterno · CRO-03 prova perto ou passada não muda nada · CRO-04 semana editada à mão · CAL-02 "próximo evento" e prova que volta · BAN-02 sem como reportar questão.
**S2 — Experiência:** UX-02 contraste · UX-03 zoom no iPhone · UX-04 peso e tempo no 4G · UX-05 primeiro acesso · UX-06 sem PWA · UX-07 nenhuma notificação.
**S2 — Negócio e código:** NEG-01 sem funil · NEG-03 sem SEO · NEG-04 sem painel de negócio · COD-01 regras duplicadas.

**S3:** SEG-07 versões de bibliotecas · NUM-11 "estudada há 30 dias" · NUM-12 "Sua semana" com letras repetidas · NUM-13 tag "em formação" sem aviso · GAM-12 bônus somam +150% · GAM-13 divisas impossíveis no "de 33" · EDI-04 mensagem de falha genérica · CRO-05 rotina inválida volta ao padrão · BAN-03 mensagem sem acento · PRO-05 cartão de exemplo impossível · UX-08 alvos de toque pequenos · UX-09 detalhes de tela · COD-03 código morto · COD-04 "premium" e selo fantasmas.

### O que nenhuma fase conseguiu testar
- A **leitura real de edital** (5 editais, escaneado, protegido, injeção, tempo) e o **guia** — dependem de crédito, e o 1º edital é do Lucas.
- Um **celular físico** (teclado virtual, tela bloqueada de verdade) e **leitor de tela**.
- O **pagamento** — não existe.
- **E-mail chegando** — não há SMTP.
- O **sequestro prévio** de conta via Google (SEG-03) — exigiria uma conta Google real controlada.

Esses cinco são, por definição, onde o próximo problema que ninguém registrou vai aparecer.

---

## 10. Acréscimo de 02/10/2026 — depois do relatório

**Achado novo, S2 (INCONSISTÊNCIA), da comparação antes × depois da fonte única de estatísticas:**

### [NUM-14] A sequência mostrada é a guardada, e fica velha até a página salvar
- **Onde:** `progresso.streak` é recalculado pelo gatilho `progresso_do_servidor` **só quando o
  progresso é gravado**; o topo do painel e a ficha (`ficha_do_usuario`) leem o valor guardado.
- **O que acontece:** o usuário `quebrou` (última sessão em 30/09) abriu o painel em 02/10 às 00h33 e
  viu **"2 dias"** e Disciplina **76**; o painel salvou ao abrir, e na abertura seguinte mostrou
  **0** e **66** — os números certos. Medido: `sequencia_do_usuario()` = 0 e o guardado era 2.
- **Correção sugerida:** a ficha e o topo lerem `sequencia_do_usuario()` na hora (a fonte única
  de estatísticas já é o lugar), ou o painel desenhar só depois de salvar. Esforço P.

**Achados que a fonte única e a função única de plano já resolvem** (no `astral-dev`; vão para a
produção junto com elas): NUM-09 (nove formatos de hora → um), COD-04 ("premium" e os 5 selos de
plano), BAN-03 (a mensagem do fim da amostra sem acento), parte de COD-03 (`ehCompleto`,
`nomeDoPlano`) e **parte** de NUM-05 — painel, cronômetro, cronograma, gráficos, diário e revisão
passaram a usar o dia de São Paulo; **ainda usam o relógio do aparelho** o dia da semana do
cronograma (`cronograma.js` `blocosDeHoje`) e os dias até a prova (`chefe.js` `diasAte`).

---

## 11. ✅ Respostas do Lucas — 02/10/2026

> Respondidas por escrito, na ordem do relatório que eu entreguei (letras A a E). As palavras dele
> entre aspas; a coluna da direita é o que passa a valer no `ROADMAP.md` (versão 2, de 02/10).
> Numeração: 1–18 = seção 7 acima · 19–21 = as três novas do Lote 1 · P3–P13 = as de planos.

### A. Travam a lei ou um bloqueador

| # | Resposta dele | O que fica valendo |
|---|---|---|
| 1 | *"Sim, é, a idade mínima vai ser 16. Você pergunta. Pode fazer o que você falou que ia fazer"* | **16 anos**, nos Termos **e** na Política. Data de nascimento no cadastro. 16 e 17 usam o grátis; **pagar exige confirmação do responsável** (roadmap 3.6) |
| 2 | *"Concordo"* | Excluir a conta **anonimiza** o e-mail na auditoria de plano (roadmap 2.2) |
| 3 | *"essa três eu não entendi. É proibido utilizar questões oficiais no nosso site? (...) são questões públicas (...) eu preciso de algum tipo de autorização?"* | Respondido a ele em 02/10 (ver abaixo). **Sem advogado antes do lançamento**, salvo se ele quiser; fonte citada em cada questão (roadmap 3.18) |
| 4 | *"não pretendo utilizar ele no momento, mas se nós conseguirmos (...) ler o edital uma vez e depois manter ele e reutilizar para outras pessoas, aí o beta fica válido. Porque não vai ter gasto a mais (...) vai ser gasto, por exemplo, 7 reais uma vez só nesse edital"* | **O beta depende do cache de edital provado.** Enquanto isso, nada muda no beta nem nos textos públicos. O cache de edital/guia por concurso vira item do roadmap (3.23) |
| 5 | *"Apenas no dia que eu sinalizar crédito."* | A simulação da conta dele **só** é revertida no dia em que ele avisar do crédito (roadmap 1.5) |

**Resposta à pergunta 3, como foi dada a ele:** a Lei 9.610/98, art. 8º, IV, diz que **não** são
protegidos por direito autoral *"os textos de tratados ou convenções, leis, decretos, regulamentos,
decisões judiciais e demais atos oficiais"*. Prova feita pela própria força (EEAR, EsPCEx, ESA,
Colégio Naval, EAM) é ato de órgão público: o argumento de que é livre é forte. Prova feita por banca
**privada** contratada (ex.: FGV no CBMERJ, Vunesp na PM-SP) é mais discutível. Sites grandes vendem
acesso a questões de concurso há anos. **Não sou advogado**: o risco é baixo, não zero. O que reduz o
risco: citar a fonte em cada questão, **não** copiar comentário ou resolução de cursinho, e tirar do
ar se alguém pedir. Fonte do texto da lei: lido em 02/10 na cópia da Lei 9.610 em
ufrgs.br/cursopgdr/legislacao/l9610.htm.

### B. As três que dependem dele (vindas do Lote 1)

| # | Resposta dele | O que fica valendo |
|---|---|---|
| 19 | *"Escolho a opção A — um repositório privado e separado no GitHub, com a cópia criptografada: R$ 0. Desde que seja realmente seguro."* | Roadmap **1.2b**, com as condições de "realmente seguro" escritas no item |
| 20 | *"Concordo, depois me dê sua opinião"* | Teto mantido: 10 editais, 60 guias, 100 questões por dia. Opinião dada em 02/10 (abaixo) |
| 21 | *"Vamos deixar ela por último, primeiro fazemos o que você pode fazer e depois eu entro em cena e você me ajuda a criar."* | A senha de app do Gmail vira o **último item** do roadmap (4.1). ⚠️ Até lá, SEG-03 (criar conta com o e-mail de outra pessoa) continua aberto |

**Opinião sobre o teto (20), medida:** o guia conta **uma unidade por matéria**
(`buscar-recursos`), e os 7 editais diferentes medidos em `valores.md` têm **6,3 matérias** em média
(4 a 11). Então 60 guias ≈ **10 editais novos por dia** — o mesmo número do teto de editais: os dois
estão coerentes. Guia de edital já lido **não conta** (vem guardado). Com o crédito de US$ 5, o próprio
crédito acaba antes do teto; o teto passa a importar quando houver mais crédito. **Revisar os números
depois do 1º edital dele, com o custo real medido** — hoje eles são conta, não medição.

### C. Travam um S1

| # | Resposta dele | O que fica valendo |
|---|---|---|
| 6 | *"Concordo. Inclusive grave esse tipo de revisão para questões pois depois vamos implementar muito mais"* | Despublicar as quebradas (2.11). A revisão virou **`historico/revisao-de-questoes.md`** — 13 conferências, obrigatória para toda importação nova |
| 7 | *"Concordo"* | A folga planejada da rotina **não quebra** a sequência (3.8) |
| 8 | *"Concordo. Acho que se a pessoa quiser trocar o edital, aí sim vale a pena resetar a patente, o que acha?"* | Bônus só daqui para frente; a patente **nunca** desce por causa do bônus (3.7). **Resetar na troca de edital: respondi com a minha opinião (contra) e aguardo a decisão dele** |
| 9 | *"concordo em tirar agora (...) a gente tem algum plano no roadmap para incluir essas coisas? (...) se forem coisas inúteis é só a gente tirar"* | Tirar as 5 agora (2.12). Opinião, item por item, dada em 02/10 — 3 têm plano, 1 volta sozinha, 1 sai de vez |
| 10 | *"Concordo"* | Consertar a regra da Platina (2.9) |
| 11 | *"Concordo"* | O botão "Rebalancear" vira a explicação "seu cronograma se ajusta sozinho toda segunda" (2.3) |

### D. Planos (as 10 que faltavam de `historico/gap-analysis-planos.md`)

Gravadas lá, na seção 5. Resumo: P3, P5, P7+P13, P9, P10, P11, P12 = como sugeri; P6 = sugestão,
**com lembrete automático** (`tools/lembretes.js`, dispara com 20 editais reais lidos); P8 = sim,
**testado antes de lançar** (vira 🚀).

### E. Definem o desenho

| # | Resposta dele | O que fica valendo |
|---|---|---|
| 12 | *"Suavizar para 'para quem tem dificuldade de foco'"* | Troca da frase do TDAH (2.12) |
| 13 | *"Concordo"* | A mesma hora vale o mesmo XP, cronometrada ou marcada (3.13) |
| 14 | *"Concordo"* | A escada deve durar até a prova, não 10 semanas (3.13) |
| 15 | *"Concordo"* | Mantém a passagem praça → oficial por XP |
| 16 | *"Comece agora"* | **Funil sobe para o Lote 2** (2.14). ⚠️ Muda a decisão de 08/09 ("guardar para depois da Fase 1") |
| 17 | *"Concordo"* | "Passei!" no Lote 3 (3.22) |
| 18 | *"Concordo"* | Primeiro acesso só com o envio do edital (3.19) |

### 2ª rodada — 02/10/2026 (por voz, depois das minhas respostas às perguntas 3, 8 e 9)

| # | Resposta dele | O que fica valendo |
|---|---|---|
| 3 | *"vamos deixar (...) eu creio que não vai ter nenhum problema não. Futuramente a gente vê também, eu tenho alguns contatos, eu pergunto para alguns advogados"* | Sem advogado agora. Fonte citada na questão continua no 3.18; **lembrar a ele dos contatos quando o 3.18 chegar** |
| 8 | *"não vamos zerar a patente. Em vez de zerar, mostra uma tela de transferência"* | Roadmap **3.7b**: a patente passa ao degrau equivalente da carreira nova (já acontece) + a tela de Transferência |
| 9 | *"já que a maioria delas vai voltar e já está no roadmap, vamos manter e o subtópicos (...) a gente tira mesmo"* | As 5 saem agora; 4 voltam pelos itens do roadmap; subtópicos sai de vez |
| 20 | *"a gente talvez não precise esperar as pessoas subirem o edital (...) eu subo e conforme eu vou tendo dinheiro, eu vou colocando"* | **Pré-carregar os concursos** (edital + guia) antes dos alunos — roadmap 3.23, logo depois do 1.5, por ferramenta minha que não esbarra nas travas de aluno |
| 19 | *"não entendi tão bem como isso fica seguro (...) guardar [a senha] no computador, no meu celular, no celular de mais alguém e (...) num papel"* | O 1.2b foi para o **Lote 4 (4.3)**, com ele presente. Explicação de segurança dada em 02/10 |
| PRO-03 | *"os três exageros da página inicial, pode tirar as três"* | 2.12: saem "em 30 segundos", "IA treinada" e o cartão de exemplo |
