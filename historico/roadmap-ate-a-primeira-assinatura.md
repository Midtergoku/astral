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
| 2.3 | **Rotina de olhar os erros dos usuários** | 🤖 | Os dois acima estavam gravados no banco havia **3 dias** e ninguém olhou. Criar `tools/ve-erros.js` e rodar no início de toda sessão, junto do `checa-saude` |
| 2.4 | **E-mail funcionando (ponte pelo Gmail)** | 👤 5 cliques + 🤖 | Hoje quem esquece a senha **fica trancado para fora**. Ferramenta pronta: `tools/smtp-configura.ps1`. Grátis, ~500/dia. Detalhe na skill `astral-operacao` 13.6 |
| 2.5 | **Provar que o e-mail chega num endereço de fora** | 🤖 | Não vale testar no seu — o seu já recebia |
| 2.6 | **Voltar a exigir confirmação de e-mail** | 🤖 | ⚠️ **só depois do 2.5.** Na ordem errada, ninguém consegue mais se cadastrar |
| 2.7 | **Restaurar um backup, uma vez** | 🤖 | O backup nunca foi restaurado. Backup não testado é fé, não é backup |
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
| 3.6 | **Fontes hospedadas por nós** | 🤖 | Medido: a primeira visita gasta ~3s esperando o Google. Custa R$ 0 |
| 3.7 | **As 81 cópias de CSS que divergem** | 🤖 | Unificar é decisão de design, não faxina. Fazer junto com o V-restante, não antes |

**Pronto quando:** você abre o site e não pensa *"isso parece feito por IA"*.

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
