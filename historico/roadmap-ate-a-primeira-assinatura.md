# Roadmap — daqui até a primeira assinatura paga

> Escrito em 04/08/2026, a pedido do Lucas: *"quero que crie um roadmap de tudo que falta fazer
> até chegarmos na primeira assinatura, tudo mesmo em detalhes, coisas que você também acha
> válido fazer"*.
>
> **Tudo aqui é medido, não estimado.** Os números vieram do banco e dos logs em 04/08/2026,
> e cada um está com o comando ou a consulta que o produziu.

---

## O número que reordena tudo

Antes de listar tarefas, o retrato do produto hoje — consultado no banco:

| | |
|---|---|
| Usuários cadastrados | **8** (desde 23/06/2026) |
| **Chamadas de IA — edital, questões, recursos — em toda a história** | **🔴 0** |
| Sessões de cronômetro | 0 |
| Eventos no calendário | 0 |
| Buscas de professores salvas | 0 |
| Leads na lista de espera | 0 |
| Usuários com progresso salvo | 2 |
| Planos | 8 `free`, 0 `beta`, 0 `pro` |

**Ninguém nunca subiu um edital.** A promessa da landing — *"transforme seu edital em um plano
de aprovação em poucos minutos"* — **nunca aconteceu uma única vez**, para ninguém, em 6 semanas
de site no ar.

Isso muda a ordem do roadmap. Não adianta construir pagamento para um produto cuja função
central nunca rodou: seria construir a caixa registradora antes de saber se a comida sai da
cozinha. **A Fase 1 é fazer a promessa acontecer uma vez.** Todo o resto vem depois.

> Vale dizer o que esse número **não** significa: não quer dizer que o produto é ruim. Quer
> dizer que ele **nunca foi testado de verdade** — e que qualquer opinião sobre ele, minha ou
> dele, é palpite até isso acontecer.

---

## Legenda

| Marca | Significado |
|---|---|
| 🤖 | eu faço sozinho, ele não precisa fazer nada |
| 👤 | **só ele pode fazer** — conta dele, cartão dele, decisão dele |
| 💰 | custa dinheiro; o valor está sempre na mesma linha |
| 🔴 | bloqueia o lançamento — sem isso não se cobra de ninguém |

---

## FASE 1 — Fazer a promessa acontecer uma vez

**Por que primeiro:** é a única coisa que separa "um site bonito" de "um produto". Enquanto o
número acima for 0, tudo o mais é decoração.

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 1.1 | 💰 **Créditos na Anthropic** | 👤 | **US$ 5 (~R$ 30) resolvem.** Custo medido por pessoa: R$ 0,99 por edital + R$ 0,68 por busca de professores = **~R$ 5–8 uma vez por pessoa**, não mensal. Com US$ 5 dá para ~30 editais |
| 1.2 | **Subir um edital de verdade, ponta a ponta** | 🤖 | PDF real → matérias extraídas → pesos → cronograma na tela. Eu faço e te mostro o resultado |
| 1.3 | **Medir onde trava** | 🤖 | Se falhar, o log diz onde. Hoje `processar-edital` nunca foi exercitado com credencial válida — o teste de saúde só confirma que ele **recusa** quem não está logado |
| 1.4 | **Você usar o Astral por uma semana como se fosse um aluno** | 👤 | Nenhuma auditoria minha substitui isso. Foi você quem achou o "Luca", o site lento e o "?" — os três, usando |
| 1.5 | **Ajustar o que a semana mostrar** | 🤖 | Reservar tempo para isso. Vai aparecer coisa |

**Pronto quando:** um edital vira cronograma na tela, e você diz *"isso aqui eu usaria"*.

---

## FASE 2 — Fechar os buracos que já se sabe que existem

**Por que agora:** são coisas medidas, não hipóteses. Todas custam R$ 0.

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 2.1 | ✅ **Dashboard quebrado** | 🤖 | **FEITO em 04/08.** `uid` não existia; o erro matava a tela antes de desenhar. 86 ocorrências reais |
| 2.2 | ✅ **Botão do Google morto** | 🤖 | **FEITO em 04/08.** Clique antes do módulo carregar não fazia nada. 4 ocorrências, no botão de 6 dos 8 usuários |
| 2.3 | ✅ **Rotina de olhar os erros** | 🤖 | **FEITO em 04/08.** O lembrete de início de sessão obriga a consultar `erros_cliente`. E em 05/08 entrou o `vigia.yml`: de hora em hora contra a produção, com e-mail automático se cair |
| 2.4 | **E-mail funcionando (ponte pelo Gmail)** | 👤 5 cliques + 🤖 | Hoje quem esquece a senha **fica trancado para fora**. Ferramenta pronta: `tools/smtp-configura.ps1`. Grátis, ~500/dia. Detalhe na skill `astral-operacao` 13.6 |
| 2.5 | **Provar que o e-mail chega num endereço de fora** | 🤖 | Não vale testar no seu — o seu já recebia |
| 2.6 | **Voltar a exigir confirmação de e-mail** | 🤖 | ⚠️ **só depois do 2.5.** Na ordem errada, ninguém consegue mais se cadastrar |
| 2.7 | ✅ **Backup — e ele NÃO EXISTIA** | 🤖 | **FEITO em 05/08.** Descoberto que o plano free do Supabase **não faz backup nenhum** — não era "nunca restaurado", era inexistente. `tools/backup.js` cria, `tools/testa-restauracao.js` prova que volta (114 linhas conferidas linha a linha) |
| 2.8 | **`processar-edital` em janela mensal** | 🤖 | Hoje a quota é diária. Um edital por mês é o uso real; diária deixa margem para abuso |
| 2.9 | **Alerta de gasto na Anthropic** | 👤 | Painel deles, conta sua. Sem teto, um erro meu ou um abuso vira fatura |

**Pronto quando:** ninguém fica trancado para fora, e eu vejo os erros dos usuários sem você ter
que me contar.

---

## FASE 3 — Terminar o visual e a gamificação

**Por que aqui:** é o que você já começou e o que faz alguém *querer* voltar. Mas vem **depois**
de o produto funcionar, senão é maquiagem em cima de nada.

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 3.1 | **As 18 missões, 22 tags e 12 conquistas secretas** | 🤖 | Catálogo aprovado por você, **código nunca escrito**. É o maior item pendente da Etapa 3 |
| 3.2 | **Acumular todas as tags, escolher qual vestir** | 🤖 | Decisão sua. A coluna `tag_escolhida` já existe; a tela `tags.html` também. Falta ligar as missões |
| 3.3 | **Ranking pessoal** | 🤖 | ⚠️ **pessoal, não entre usuários** — você foi explícito. Ranking público desmotiva quem está atrás |
| 3.4 | **Página "Minha conta"** | 🤖 | A única feita do zero, funcional e sem acabamento. Você mesmo apontou |
| 3.5 | ⚠️ **Validar XP no servidor** | 🤖 | 🔴 **só se o ranking ou as conquistas derem vantagem real.** Hoje qualquer um escreve o XP que quiser no navegador — inofensivo enquanto não vale nada, **fraude no dia em que valer** |
| 3.6 | ✅ **Fontes hospedadas por nós** | 🤖 | **Feito em 16/09/2026.** 6 arquivos, 326 KB, em `assets/fontes/`. O Google saiu do caminho crítico e da CSP |
| 3.7 | **As 81 cópias de CSS que divergem** | 🤖 | Unificar é decisão de design, não faxina. Fazer junto com o V-restante, não antes |

**Pronto quando:** você abre o site e não pensa *"isso parece feito por IA"*.

---

### 🎖️ MASTERIZAÇÃO DA GAMIFICAÇÃO — pedido dele, 17/09/2026

> *"Coloque na lista a masterização da gamificação, quero mexer mais nisso também."*

Não é item novo solto: é o **V7 retomado**, que já tinha 7 passos com 2 feitos. O que muda é
que agora está medido — antes eu trabalharia por cima do que o caderno dizia, e o caderno
estava errado num número que importa (ver a última linha da tabela).

#### O que existe HOJE, conferido no código em 17/09/2026

| Sistema | Estado | Medido |
|---|---|---|
| **Nível / patente** | ✅ funciona | 6 tabelas por força × 11 níveis, 0 → 35.000 XP. `detectarTipoConcurso()` lê o nome do edital ([conquistas.html:522](conquistas.html#L522)) |
| **Badges** | ✅ funciona | 8, e eles **derivam de limiar** — `xp_req`, `streak_req`, `nivel_req`, `edital_req` ([conquistas.html:611-614](conquistas.html#L611)). Não é preciso "conceder": passou do número, acendeu |
| **Habilidades secretas** | ✅ existem, ⚠️ **poucas** | **18 entradas, 15 nomes distintos.** O caderno dizia 51 — corrigido hoje na skill. Trancadas em 70% de domínio, **de propósito** (é o mecanismo, não o defeito) |
| **TAG** | ⚠️ pela metade | Coluna `tag_escolhida` no banco ✅ · tela `tags.html` ✅ · topbar mostrando `NÍVEL · TAG` ✅ · **catálogo de tags: não existe** |
| **QUEST** | ❌ não existe | 0 linhas de código. É o buraco maior |
| **Ranking pessoal** | ❌ não existe | V7.7, e depende das quests |

#### A ordem que eu recomendo, e por quê

| Passo | O quê | Por que nesta ordem | Esforço |
|---|---|---|---|
| **M1** | **Catálogo de tags** (V7.3) | Tudo o mais entrega tag. Sem catálogo, quest e secreto não têm o que dar. É escrita, não engenharia: nome + ícone + como se ganha | 1 sessão |
| **M2** | **Motor de quests** (V7.4) | *"Se estudar tanto, libera isso"* — permanente, **nunca expira** (ordem dele, 01/08). Uma tabela de regras e um avaliador que roda no mesmo lugar onde o badge já é avaliado | 1–2 sessões |
| **M3** | **Mais secretas** (V7.6) | Sai de 15 para o que você quiser. Depende do M1 porque secreto entrega tag | 1 sessão |
| **M4** | **A tag como divisa** (V7.5) | Forma de galão, não retângulo arredondado. É visual, e o V1 já deu a paleta | 1 sessão |
| **M5** | **Ranking pessoal** (V7.7) | ⚠️ **você contra você.** Ranking entre usuários desmotiva quem está atrás | 1 sessão |
| **M6** | ⚠️ **Validar XP no servidor** | 🔴 **Só se algum dos acima der vantagem real.** Hoje qualquer um abre o console e escreve o XP que quiser — inofensivo enquanto não vale nada, **fraude no dia em que valer** | 1 sessão |

**Custo em dinheiro: R$ 0.** Nada disso chama IA. É a razão de caber agora, com a Fase 1 travada.

#### 💡 Três ideias que eu acrescento, porque você pediu para eu propor

1. **A quest que aproveita o que já está ligado.** O cronômetro grava tempo por matéria e as
   questões estão desligadas por custo. Então as primeiras quests deviam se alimentar de
   **tempo e constância**, não de acerto — *"3 dias seguidos na matéria de menor domínio"* é
   uma quest que funciona hoje, de graça, e empurra exatamente o comportamento que aprova.
2. **Tag que decai, e por isso vale.** As habilidades já enferrujam em 7 dias e suspendem em
   14. Se a tag **vestida** puder enferrujar junto, ela deixa de ser troféu de prateleira e
   vira estado atual. O código do decaimento já existe — é reaproveitar, não construir.
3. **O momento da descoberta não tem tela.** Hoje a habilidade secreta aparece destrancada na
   página de conquistas quando a pessoa entra lá. O pico de dopamina que você descreveu mora
   no **instante**, não na lista. O confete e o banner de level up já existem no dashboard:
   passar a secreta pelo mesmo canal é um dia de trabalho e é o que transforma a mecânica em
   sensação. **Este é o de maior retorno pelo menor esforço dos três.**

#### 🎲 VIRAR RPG DE VERDADE — ordem dele, 17/09/2026

> *"Vamos partir para a gameficação, quero ideias, quero que se torne um rpg entende?"*

**O diagnóstico, e ele é a chave:** o Astral **já tem os números de um RPG** — XP, níveis,
patentes, conquistas, decaimento, domínio por matéria. O que falta não é mecânica. É que tudo
isso hoje é apresentado como **relatório**, e RPG é apresentado como **personagem**. A distância
entre as duas coisas é menor do que parece, e quase toda ela é de tela, não de banco.

**A descoberta que barateia tudo — medida em 17/09:** `sessoes_estudo`
(`supabase/migrations/20260730150000_cria_persistencia_de_progresso.sql:52`) já grava
**matéria, segundos, xp, modo e data de cada sessão**, desde 30/07. Ou seja: os atributos de
uma ficha de RPG **podem ser derivados do que já está no banco**, sem tabela nova, sem migration
e sem custo. Não é preciso começar a coletar nada.

| # | Ideia | O que a torna RPG | Custo | Esforço |
|---|---|---|---|---|
| **R1** | **A FICHA** — 5 atributos no lugar de um XP só: DISCIPLINA (streak + regularidade) · RESISTÊNCIA (maior sessão + horas) · AMPLITUDE (matérias distintas) · DOUTRINA (domínio médio) · PRECISÃO (acerto — depende do banco de questões) | Personagem tem ficha; relatório tem número. **Todos derivam de `sessoes_estudo`, que já existe** | R$ 0 | 1 sessão |
| **R2** | **ÁRVORE DE ESPECIALIZAÇÃO** — ponto a cada patente, gasto em 3 ramos: Infantaria (constância), Artilharia (volume), Inteligência (precisão) | Escolha com custo é o que separa RPG de barra de progresso. ⚠️ Os ramos mudam **como** se joga (bônus de XP por hábito), **nunca o que se aprende** — build ruim não pode prejudicar estudo | R$ 0 | 2 sessões |
| **R3** | **O CHEFE tem data** — a prova vira o chefe da campanha, com contagem regressiva; cada simulado é um sub-chefe | RPG precisa de antagonista. O Astral tem o melhor possível: uma data real que assusta de verdade. Usa a tabela `eventos`, que já existe | R$ 0 | 1 sessão |
| **R4** | 💰 **MASMORRA = SIMULADO** — incursão de N questões do banco, com tela de resultado em forma de relatório de missão | **É onde o corte do Pro mora** (ver `decisoes.md`, 17/09): free entra 1x por semana, Pro entra à vontade. Amarra banco de questões + RPG + monetização no mesmo objeto | R$ 0 | 2 sessões, depois do banco |
| **R5** | **LOOT COM RARIDADE** — tag comum · incomum · rara · lendária, com a raridade visível | Raridade é o sinal mais viciante do RPG e o mais barato de implementar: é um campo e uma cor | R$ 0 | meia sessão (com R6) |
| **R6** | **CATÁLOGO DE TAGS** (já era o M1) | Sem catálogo, quest e conquista não têm o que entregar | R$ 0 | 1 sessão |
| **R7** | **DIÁRIO DE CAMPANHA** — o histórico vira log narrado: *"Dia 34 — 2h20 em Matemática. Domínio 58% → 61%. Desbloqueado: Calculista."* | RPG tem log de campanha. Os dados já estão em `sessoes_estudo`; muda só como se conta | R$ 0 | 1 sessão |
| **R8** | **O INSTANTE DA DESCOBERTA** — conquista secreta passa pelo confete/banner do dashboard, na hora | Hoje ela só aparece se a pessoa for até a página de conquistas. **O pico mora no instante, não na lista** | R$ 0 | 1 dia |
| **R9** | **REENGAJAMENTO NARRADO** — "enferrujada/suspensa" (que já existe) vira *fora de serviço*, com missão de retorno | Transforma o castigo por sumir em gancho para voltar, em vez de vergonha | R$ 0 | meia sessão |
| **R10** | **PRESTÍGIO** — trocar de edital ou ser aprovado não zera: vira **veterano**, com marca permanente | Prestígio é o que faz RPG ter segunda volta. E resolve um caso real: quem troca de concurso hoje perde a identidade toda | R$ 0 | 1 sessão |

**Custo somado: R$ 0.** Nada disso chama IA — é a razão de caber agora, com a Fase 1 travada.

> 🔴 **O limite que precisa ser dito antes de qualquer um destes ganhar valor real:** o XP é
> gravado pelo navegador. Hoje qualquer pessoa abre o console e escreve o número que quiser.
> Enquanto é "você contra você", é autoengano e não faz mal a ninguém. **No instante em que
> raridade, árvore ou acesso a masmorra dependerem do XP, isso vira fraude** — e o M6
> (validar XP no servidor) deixa de ser opcional e passa a ser pré-requisito.

#### 🔒 O XP HOJE É O QUE O NAVEGADOR DIZ QUE É — medido em 17/09/2026

> Pergunta dele: *"não tem alguma maneira de tornar isso invisível para as pessoas não
> conseguirem alterar? Se não perde a graça."*

**Medido, não suposto.** `tools/testa-xp-forjado.js` cria um usuário real, pega uma sessão
**válida** e chama a mesma função que o site chama. Resultado:

| O que tentei | Resultado |
|---|---|
| Gravar **999.999.999 de XP** sem ter estudado | 🔴 **aceito** |
| Streak de **4.000 dias** (~11 anos) | 🔴 **aceito** |
| **99.999 horas** de estudo | 🔴 **aceito** |
| **Desfazer** depois, voltando ao valor honesto | 🔴 **impossível** — ver abaixo |
| Inventar conquista que **não existe no código** | 🔴 aceita (`conquista_que_nao_existe`) |
| **Promover a própria conta para `pro`** | ✅ **BLOQUEADO** (400) |

**A última linha é a que importa mais: o que mexe com dinheiro está protegido.** O plano vive
em `perfis`, com RLS que impede o próprio usuário de se promover. Quem forja XP ganha um número
bonito, não ganha acesso pago.

**Por que é permanente, e isto é um efeito colateral de uma decisão certa:** a função
`salvar_progresso` faz `xp = greatest(p.xp, excluded.xp)` — fica sempre o **maior**. Isso existe
para **não perder progresso** quando duas telas gravam ao mesmo tempo (bloco de 05/08), e nesse
papel está correta. O efeito colateral é que um número forjado **nunca mais desce, nem para o
dono da conta**. Não é bug; é o preço de uma trava que resolve outro problema real.

#### A resposta: esconder NÃO funciona — mas dá para resolver

**Esconder não é uma opção, e é importante entender por quê:** tudo o que o navegador consegue
calcular, a pessoa consegue calcular. Ofuscar o código atrasa alguém em minutos. Criptografar
exige que a **chave esteja na página** — e o que está na página se lê. Assinar o pedido tem o
mesmo problema. E nada disso importa, porque o pedido pode ser **editado direto na rede**, sem
passar pelo JavaScript: o navegador tem essa aba embutida.

> **Segurança por obscuridade não é segurança.** A única pergunta que vale é: *quem decide o
> valor?* Hoje quem decide é o navegador. O conserto é mudar isso, não esconder melhor.

**O conserto, e ele é mais barato do que parece:** o navegador para de mandar *"meu XP é N"* e
passa a mandar *"estudei 25 minutos de Matemática"*. **O servidor calcula o XP.**

**E a matéria-prima já existe** — medido: `sessoes_estudo` grava **matéria, segundos, modo e
data de cada sessão**, desde 30/07/2026. O XP pode ser **derivado** desses registros por uma
função no banco, em vez de ser um número que o cliente informa. Não é preciso coletar nada novo.

Regras de plausibilidade que o servidor passa a poder aplicar, e o navegador nunca pôde:

- sessão não pode durar mais que o tempo real decorrido entre um pedido e outro
- teto de XP por dia
- streak **contado** a partir das datas distintas em `sessoes_estudo`, não informado
- conquista concedida por limiar calculado no servidor, não por string que chegou na lista

> 🎯 **A convergência que barateia tudo:** isto é **o mesmo trabalho da ideia R1** (a ficha com
> 5 atributos). Derivar DISCIPLINA, RESISTÊNCIA, AMPLITUDE e DOUTRINA de `sessoes_estudo` no
> servidor **já resolve a fraude de quebra**, porque um atributo calculado a partir de registros
> não pode ser informado. **A funcionalidade de RPG e o anti-fraude são a mesma sessão de
> trabalho.** Fazer R1 no servidor em vez de no navegador custa praticamente o mesmo e entrega
> as duas coisas.

> ⚠️ **O limite honesto, que nenhum sistema resolve:** dá para deixar o cronômetro rodando sem
> estudar. Isso é infalsificável por natureza — e tudo bem. O objetivo não é impedir que alguém
> se engane; é fazer **trapacear custar o mesmo que estudar**. Quem gasta 2 horas fingindo já
> gastou 2 horas. O que não pode existir é o atalho de **um número digitado em 10 segundos**.

> 📌 **Quando fazer:** hoje o XP não vale nada e a fraude é autoengano — quem se engana escolheu
> se enganar, e o `pro` está protegido. **Vira pré-requisito no instante em que qualquer coisa
> da lista R1–R10 amarrar recompensa ao XP** (raridade, árvore, entrada em masmorra). Ou seja:
> antes do R5, do R2 e do R4. Regressão: `node tools/testa-xp-forjado.js`, que hoje acusa 5
> furos e deve passar a acusar 0.

> ⚠️ **A armadilha de produto, e ela é séria:** RPG recompensa *jogar*; um app de estudo precisa
> recompensar *estudar*. Toda recompensa aqui tem de estar amarrada a tempo real de estudo ou a
> acerto real — **nunca a abrir o aplicativo, nunca a sequência de login**. No dia em que o
> Astral premiar presença em vez de trabalho, ele vira caça-níquel e ensina o oposto do que vende.

> 🎖️ **Sobre o tema:** a skill fechou em **militar, não fantasia** — "Necromante Cabo BM" quebra
> os dois, e o mundo militar já tem classes reais (Sapador, Sniper, Inteligência, Mergulhador de
> Combate). "Virar RPG" aqui significa **mecânica de RPG com pele militar**, que é o que ele já
> vinha construindo. Se ele quiser fantasia de verdade, é trocar uma tabela de nomes — mas é
> decisão dele, não minha.

**Ordem recomendada:** R6 → R1 → R8 → R5 → R3 → R2 → R7 → R9 → R4 (quando o banco existir) → R10.
O R1 é o que mais muda a sensação por sessão gasta: transforma número em personagem usando dado
que já está gravado desde julho.

> 🔴 **Antes de mexer em qualquer coisa daqui: ler a skill `astral-gamificacao`.** Em 01/08 eu
> olhei as conquistas trancadas em 70%, chamei de bug em três camadas, e era o oposto — foram
> feitas para serem descobertas por acaso. A regra que nasceu dali: escrever *"isto foi feito
> de propósito porque ___"* e ver se a frase fecha, **antes** de chamar de defeito.

---

## FASE 4 — Pagamento

**Estado hoje, medido:** **nada existe.** Nenhuma linha de código, nenhuma tabela, nenhuma conta.
O `tipo_plano` distingue os planos, mas quem promove alguém para `pro` é você, na mão.

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 4.1 | 👤 **Conta no Mercado Pago** | 👤 | Decidido porque **você não tem CNPJ** — o que elimina a Stripe. Grátis para abrir; a taxa sai por venda |
| 4.2 | **Tabela `assinaturas`** | 🤖 | Com RLS. Quem assinou, quando, até quando, status, id do pagamento |
| 4.3 | **Função `criar-pagamento`** | 🤖 | Gera o link de pagamento (preference) e devolve para a tela |
| 4.4 | 🔴 **Webhook com validação de assinatura** | 🤖 | **O maior bloqueador técnico do lançamento.** Sem validar a assinatura da mensagem, **qualquer pessoa na internet manda um POST e vira assinante de graça**. Já está anotado como bloqueador desde julho |
| 4.5 | **Ligar o gate à assinatura real** | 🤖 | Hoje o gate olha `tipo_plano`. Passa a olhar a assinatura ativa, com data de fim |
| 4.6 | **Tela de planos e momento do upgrade** | 🤖 | Onde e quando pedir o dinheiro. Não é a landing — é dentro do produto, quando a pessoa já viu valor |
| 4.7 | **Cancelamento que funciona** | 🤖 | 🔴 Exigência legal e de decência. Cancelar tem de ser tão fácil quanto assinar |
| 4.8 | **O que acontece quando o pagamento falha** | 🤖 | Cartão recusado, assinatura vencida, estorno. Cada um com uma tela que explica |
| 4.9 | **Teste ponta a ponta com pagamento de teste** | 🤖 | O Mercado Pago tem ambiente de teste. Assinar, cancelar, falhar, estornar — os quatro |

**Pronto quando:** eu assino com uma conta de teste, viro `pro` sozinho, cancelo, e volto a
`free` — sem você tocar em nada.

---

## FASE 5 — Antes de cobrar de gente de verdade

**Por que separado:** cobrar muda a relação. O que era um favor vira obrigação legal.

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 5.1 | 🔴 **Termos e Privacidade revisados para cobrança** | 🤖 | Os atuais foram escritos para um produto grátis. Precisam falar de preço, renovação, cancelamento e reembolso |
| 5.2 | 🔴 **Direito de arrependimento — 7 dias** | 🤖 | Código de Defesa do Consumidor, compra pela internet. Não é opcional |
| 5.3 | **Canal de contato visível** | 👤 + 🤖 | Um e-mail ou WhatsApp que você responde. Cobrar sem canal de contato é o que gera reclamação pública |
| 5.4 | **O que acontece com os dados de quem cancela** | 🤖 | Já existe exclusão de conta. Falta dizer, por escrito, o que acontece com o histórico |
| 5.5 | 💰 **MEI** | 👤 | **~R$ 76/mês (2026), a confirmar.** Não bloqueia o primeiro recebimento — o Mercado Pago aceita pessoa física — mas resolve nota fiscal e limite de recebimento. **Só quando houver receita**, nunca antes |

**Pronto quando:** você consegue cobrar sem ficar exposto.

---

## FASE 6 — O domínio 🔴

> **Decisão sua, 03/08/2026:** *"uma das últimas coisas que eu vou fazer é criar um domínio
> junto com você"*. Está registrado e eu não vou empurrar antes da hora.

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 6.1 | 💰 **Comprar o domínio** | 👤 **junto comigo** | **~R$ 40/ano.** `astralconcursos.com.br` estava livre em 30/07 — **reconferir antes**, faz dias |
| 6.2 | **Apontar para a Vercel** | 🤖 | Settings → Domains. Eu faço, você só me dá acesso ao painel do registrador |
| 6.3 | **Resend + SPF, DKIM e DMARC** | 🤖 | **O Resend exige domínio verificado** — confirmado na documentação deles. É por isso que ele depende desta fase |
| 6.4 | **Trocar o SMTP do Gmail pelo Resend** | 🤖 | O remetente deixa de ser seu Gmail pessoal e vira `contato@astralconcursos.com.br` |
| 6.5 | **Trocar todos os endereços do site** | 🤖 | `site_url`, redirects do Google, links dos e-mails, CSP. ⚠️ Tudo com `tools/confere-auth.ps1` depois — errar aqui derruba o login |

**Por que importa além do e-mail:** cobrar R$ 19,90 a partir de um endereço
`astral-psi.vercel.app` custa conversão. Quem vai colocar o cartão repara nisso.

---

## FASE 7 — Lançar

| # | O quê | Quem | Detalhe |
|---|---|---|---|
| 7.1 | **Grupo de WhatsApp + entrar em grupos de concurseiros** | 👤 | Seu plano, suas palavras. É o único canal que você tem hoje |
| 7.2 | **Os primeiros beta testers** | 👤 + 🤖 | ⚠️ `tipo_plano = 'beta'` é **promessa vitalícia** de acesso pro. Nenhuma mudança futura pode rebaixar essas contas |
| 7.3 | **Ouvir e consertar** | 🤖 | A semana depois dos primeiros usuários vale mais que qualquer auditoria minha |
| 7.4 | **Trocar a landing de "beta" para "free vs pro"** | 🤖 | Só **depois** que os primeiros entrarem — decisão sua, e está certa |
| 7.5 | **A primeira assinatura** | — | Aqui acaba este roadmap |

---

## 🎯 BANCO DE QUESTÕES DE PROVAS ANTIGAS — ideia dele, 17/09/2026

> *"quero montar um banco de questões com provas militares antigas, existem várias de
> domínio público então poderemos criar um banco gigante para os concurseiros e não iremos
> gastar nada"*

**Por que isto é maior do que parece, e não é só mais uma funcionalidade:**

O número que trava o projeto é **0 chamadas de IA em toda a história** — ninguém nunca subiu
um edital, e a Fase 1 depende de US$ 5 que ele não tem. O banco de questões **contorna isso
pela lateral**: dá ao usuário uma razão real para abrir o Astral **sem gastar um centavo de
IA**. Hoje, quem entra e não sobe edital não tem o que fazer. Com o banco, tem.

E resolve de graça um problema que já existia: as **questões geradas por IA estão desligadas
desde 31/07** (`FUNCOES_DESLIGADAS` em `_shared/comum.ts`), porque eram a única ação de
custo recorrente. Questão de prova antiga é conteúdo **fixo, gratuito e melhor** — vem da
banca de verdade, não de um modelo.

**O que precisa ser decidido antes de construir (nada disso foi decidido):**

| Pergunta | Por quê importa |
|---|---|
| De onde vêm os PDFs? | ESA, EEAR, EsPCEx, AFA, Escola Naval, PM/CBM publicam provas; cada banca tem um formato |
| Quem digitaliza? | é o custo real — não é dinheiro, é **tempo**, e ele tem ~2h/semana |
| Direito autoral | prova de concurso público é ato administrativo, mas **confirmar por banca** antes de publicar |
| Onde mora | tabela nova no Supabase, com RLS — o plano free aguenta? medir |
| Como se liga ao edital | a graça é filtrar por matéria do edital DELE, não listar tudo |

### ✅ ESFORÇO MEDIDO — 17/09/2026, contra uma prova de verdade

Ele pediu: *"Quero que meça o esforço"*. Medido **numa prova real**, não numa estimativa: o PDF
oficial da FAB, **EEAR CFS 2/2025, 96 questões**. A ferramenta é `tools/prova-para-questoes.js`.

Medir contra texto inventado por mim não provaria nada — provaria só que meu leitor lê o que eu
mesmo escrevi. É o erro que o `CLAUDE.md` chama de *"teste que nunca reproduziu o defeito"*.

| O que se mediu | Resultado |
|---|---|
| **Tempo de máquina, prova inteira** | **0,36 segundo** |
| **Questões utilizáveis, sem ninguém tocar** | **78 de 96 — 81%** |
| Precisam de revisão | 18, e **11 delas são o mesmo motivo: dependem de figura** |
| Anuladas pela banca | 1 (a 72), descartada sozinha |
| **Gabarito** | Vem **no mesmo PDF**. Não precisa de segunda fonte |
| Confiabilidade do gabarito | 95 respostas lidas por **dois caminhos independentes, 0 divergências** |
| **Peso no banco** | **419 bytes por questão** → 10.000 questões = **4 MB** dos 500 MB do plano free |
| Custo em dinheiro | **R$ 0.** Zero chamadas de IA — é `pdftotext`, que já está na máquina |

**Por matéria, de 24 cada:** português 23 · matemática 20 · física 14 · inglês 22. Física rende
menos, e o motivo é o mesmo das 11: gráfico e diagrama não existem em texto.

**Tradução do esforço:** ~13 provas ≈ 1.000 questões. A EEAR sozinha faz 2 provas por ano; dez
anos dela dão ~1.560 questões. Somando ESA, EsPCEx, AFA, Escola Naval e EAM, **"banco gigante"
deixa de ser figura de linguagem.** O gargalo **não é digitar** — é (a) juntar os PDFs, um a um,
e (b) revisar os ~19%.

> ⚠️ **O que eu NÃO medi, e não vou fingir que medi:**
> - **Só testei a EEAR.** Cada banca diagrama diferente. ESA, EsPCEx e Escola Naval podem cair
>   bem abaixo de 81% até o leitor aprender o formato delas. **Medir uma de cada antes de somar.**
> - **Não cronometrei a revisão das 18.** Sei o que são, não quanto tempo levam.
> - **Não confirmei o direito autoral por banca.** Prova de concurso público é ato administrativo,
>   mas isso precisa de confirmação antes de publicar, não de suposição minha.
> - **Questão com figura eu deixo de fora, marcada.** Questão truncada é **pior** que questão
>   ausente: quem estuda por alternativa quebrada aprende errado.

> 💡 **A ideia que saiu da medição:** as 11 de figura não estão perdidas. O PDF tem as imagens, e
> dá para recortá-las e guardá-las junto da questão. Só que isso é trabalho de verdade, e há 78
> questões prontas por prova esperando — **primeiro as fáceis, e em volume.**

**Onde entra no roadmap:** é candidato a **Fase 1 alternativa** — a única coisa que pode dar
valor real ao usuário enquanto os créditos não chegam. Mas continua valendo a regra: primeiro
fazer a promessa da landing acontecer uma vez.

---

## Coisas que eu acho válidas e que você não pediu

Ele pediu explicitamente que eu incluísse o que **eu** acho que vale. Estas são minhas, e cada
uma tem o motivo:

| O quê | Por que eu acho que vale |
|---|---|
| **Ver os erros dos usuários toda sessão** | Dois bugs graves ficaram 3 dias gravados no banco sem ninguém olhar. É o item de melhor retorno da lista inteira, e custa R$ 0 |
| **Saber quantas pessoas chegam a cada etapa** | Hoje eu sei que 8 se cadastraram e 0 subiram edital. Não sei **onde** desistem. Sem isso, melhorar o produto é chute. Dá para fazer com a tabela que já existe, sem serviço de terceiro e sem custo |
| **Uma tela de "primeiros passos"** | 6 dos 8 usuários nunca fizeram nada. Talvez o produto não diga o que fazer ao entrar. É a hipótese mais barata de testar |
| **Um teste automático que finge ser um usuário** | Cadastrar → subir edital → ver cronograma, tudo sozinho, contra a produção. Pegaria hoje o que só descobri lendo log |
| **Escrever o que o Astral NÃO faz** | Na landing. Cortar expectativa errada antes de cobrar evita reembolso e reclamação |
| **Guardar quanto cada usuário custou** | A tabela `uso_ia` já tem os dados. Saber a margem real por pessoa antes de fixar preço, não depois |
| **Preço:** confirmar R$ 19,90 ou R$ 25,90 | Você levantou R$ 25,90 se as questões voltarem. A decisão precisa acontecer **antes** da tela de planos, não durante |

---

## O que eu recomendo fazer na próxima sessão

**Fase 1, item 1.1 e 1.2** — os créditos e o primeiro edital de verdade.

É o item mais barato da lista (**US$ 5**), o mais rápido, e o único que responde a pergunta que
nenhuma outra tarefa responde: **o Astral faz o que promete?** Enquanto isso for 0, tudo o mais
é construção sobre suposição.

Se você preferir seguir no visual, também está certo — é seu produto e sua ordem. Mas eu diria
isso antes: o visual deixa o produto bonito; a Fase 1 diz se existe produto.

---

# Anexo A — O que o código faz HOJE, conferido linha a linha (04/08/2026)

O Lucas descreveu como imagina o funcionamento e pediu: *"me confirme se isso está certo"*.
Fui ler o código. **Duas das três coisas não são como ele imagina.**

## A.1. Patentes por força — ✅ existe, ❌ mas não é a IA que decide

Ele perguntou: *"a IA tem que ler quais são as patentes do edital requerido... às vezes nem
todas as áreas militares vão ser recruta"*.

**Existe diversificação.** `divisa.js` tem 6 tabelas, e elas começam diferente:

| Força | 1º nível |
|---|---|
| Marinha | **Grumete** |
| Bombeiros | **Bombeiro 3ª Classe** |
| PM | **Soldado PM** |
| Exército · Aeronáutica · padrão | Recruta |

**Mas quem escolhe a tabela não é a IA — é uma busca de palavra no NOME do edital**
(`detectarTipoConcurso()`): procura "bombeiro", "marinha", "exercito", "pm", "aeronautica".

**A falha:** um edital chamado *"Concurso de Admissão ao Curso de Formação de Sargentos"* não
casa com palavra nenhuma e cai no padrão — **Recruta**, mesmo sendo Exército. O pedido dele
está certo e **não está implementado**: a IA precisa devolver a força e a patente inicial reais,
lidas do PDF.

## A.2. Peso das matérias — ✅ correto, é exatamente isso

`processar-edital` pede à IA: extrair todas as matérias, `questoes` de cada uma, e
`peso` = questões ÷ total × 100, **ordenado do maior para o menor**. Validado no servidor
antes de devolver. **Aqui não há nada a corrigir.**

## A.3. Balanceamento — ⚠️ existe, mas NÃO é IA

Duas coisas diferentes levam esse nome:

1. **O cronograma inicial** (`dashboard.html` e `edital.html`): pega as **3 matérias de maior
   peso** e monta `tempo = peso × 2` minutos, `xp = peso × 5`. **Conta local, não IA.**
2. **"Rebalancear cronograma"** (`progresso.html`): botão que o usuário aperta, redistribui
   com base em qual matéria está atrasada. **Também conta local, e é manual.**

Não é defeito — é barato, instantâneo e não gasta crédito. Mas **não é a IA balanceando**, e
vale ele saber disso antes de prometer na landing.

## A.4. Professores junto com o edital — ❌ não existe

`buscar-recursos` é função **separada**, chamada **uma matéria por vez**, **a pedido do
usuário**, na tela de Recursos. Nada dispara ela depois do edital.

O que ele pediu — gerar todos os professores junto com o edital, uma vez, fixos — **é mudança
de código**, não configuração. O armazenamento permanente (`recursos_salvos`) já existe.

---

# Anexo B — Quanto custa um beta tester, calculado (04/08/2026)

**Preços da documentação oficial**, não de memória:
`claude-sonnet-4-6` = **US$ 3,00 por 1M de entrada** e **US$ 15,00 por 1M de saída**;
busca na web = **US$ 10 por 1.000 buscas** (US$ 0,01 cada).

⚠️ **Câmbio assumido: US$ 1 ≈ R$ 5,50.** Não medi a cotação do dia.
⚠️ **É aritmética, não medição.** Sem créditos na conta, nenhuma chamada real aconteceu ainda —
esta conta precisa ser confirmada com o primeiro edital de verdade.

## B.1. Ler o edital — uma vez por pessoa

PDF na API da Anthropic custa por página (texto + imagem), ~1.500 a 3.000 tokens por página.

| Edital | Entrada | Custo |
|---|---|---|
| 40 páginas | ~80.000 tokens | US$ 0,24 + saída US$ 0,015 = **US$ 0,26 ≈ R$ 1,45** |
| 100 páginas | ~200.000 tokens | US$ 0,60 + saída US$ 0,015 = **US$ 0,62 ≈ R$ 3,40** |

## B.2. Professores — uma vez por matéria, e permanente

Por matéria: 1–3 buscas (US$ 0,01–0,03) + resultados entram como entrada (~15.000 tokens,
US$ 0,045) + saída (US$ 0,015) ≈ **US$ 0,07–0,09 ≈ R$ 0,40–0,50**.

Edital militar tem tipicamente **6 a 9 matérias**. Gerando todas de uma vez: **≈ R$ 3,00**.

## B.3. Total

| | Uma vez | Por mês |
|---|---|---|
| Edital + professores de todas as matérias | **≈ R$ 4,50 a R$ 8,90** | **R$ 0,00** |
| 10 beta testers | **≈ R$ 45 a R$ 90** | **R$ 0,00** |

**Não é mensalidade.** Cada pessoa tem um edital e uma lista de professores, ambos permanentes.
Depois disso ela pode usar o Astral todo dia sem custar mais nada — porque as **questões estão
desligadas**, e elas eram a única ação com custo recorrente.

> ⚠️ **O que muda ao gerar os professores automaticamente com o edital:** hoje só custa quando a
> pessoa PEDE. Automático, custa para todo mundo que sobe um edital, mesmo quem nunca abriria a
> tela de Recursos. Com 100 cadastros e 10 interessados, paga-se por 100.
>
> **Meio-termo, se quiser:** gerar na hora as **3 matérias de maior peso** (valor imediato, ~R$ 1,20)
> e as demais só quando a pessoa abrir a tela. Decisão dele.

---

# Anexo C — Marketing: o plano que eu recomendo

Ele pediu: *"eu preciso de mais marketing... o que você sugere, criar um Instagram, um TikTok?
Nós precisamos vender isso."*

## C.1. A verdade desconfortável primeiro

**Zero editais processados.** Levar tráfego para um produto que nunca funcionou uma vez é
queimar a única chance com cada pessoa que chegar — no nicho de concurseiro, a recomendação
passa por grupo de WhatsApp, e a má impressão viaja igual.

**Ordem certa: Fase 1 do roadmap → 5 pessoas usando → aí marketing.** Não é adiar; é não
desperdiçar.

## C.2. O ativo que ele tem e não está usando: o calendário de editais

Este é o melhor canal para este nicho específico, e é **grátis**.

Quando sai o edital da PMERJ, do CBMERJ, da EsPCEx, milhares de pessoas procuram
*"como estudar para o edital X"* **na mesma semana**. É um pico previsível, com data marcada,
e com intenção de compra altíssima.

**A jogada:** no dia em que o edital sai, publicar *"o plano de estudos do edital da PMERJ 2026,
montado em 2 minutos"* — com o cronograma real, gerado pelo Astral, na tela.

**O produto vira o conteúdo.** Não é anúncio: é a demonstração.

## C.3. Onde postar — dois lugares, não quatro

| Canal | Por quê |
|---|---|
| **Instagram Reels + TikTok** | mesmo vídeo vertical nos dois. Concurseiro consome muito Reels. Custo: R$ 0 |
| **Grupos de WhatsApp e Telegram de concurseiros** | é onde o nicho **já está**. Telegram de concurso militar tem grupos de milhares. Custo: R$ 0 |

**Não criar canal no YouTube agora.** Vídeo longo consome tempo que ele não tem e demora meses
para render. Reels e TikTok dão retorno em dias.

## C.4. O que postar — 4 formatos que se repetem

1. **"Saiu o edital da X"** — o cronograma gerado na hora. O carro-chefe.
2. **"Quanto tempo você precisa estudar de cada matéria"** — o peso das matérias é dado público
   e interessante; a maioria não sabe calcular
3. **A patente subindo** — a gamificação militar é visualmente forte e ninguém mais tem
4. **Erro comum** — *"estudar tudo igual é o erro nº 1"*, que é exatamente o problema que o
   Astral resolve

## C.5. O que NÃO fazer

- ❌ **Não pagar anúncio agora.** Sem saber quanto vale um usuário, é dinheiro no lixo
- ❌ **Não criar 4 perfis.** Dois bem cuidados batem quatro abandonados
- ❌ **Não postar "cadastre-se no Astral".** Postar o resultado; o link vai na bio
- ❌ **Não entrar em grupo só para divulgar.** Vira banimento. Participar, ajudar, e o link
  aparece quando alguém pergunta

## C.6. Uma coisa que muda tudo e custa R$ 0

**A lista de espera tem 0 leads.** O formulário existe, funciona (testado), e ninguém preencheu
— porque ninguém chegou. **O problema nunca foi conversão, é tráfego.** Antes de mexer na
landing, arrumar de onde vem a primeira visita.

