# AUDITORIA PRÉ-LANÇAMENTO — ASTRAL

> Prompt para o Claude Code. Versão 1.0 · 01/10/2026
> Objetivo: encontrar **tudo** que impede o Astral de entregar o que promete antes do lançamento pago.

---

## 0. Quem você é nesta tarefa

Você é, ao mesmo tempo:
- um **auditor de produto** que desconfia de toda tela;
- um **engenheiro de segurança** tentando invadir o sistema;
- um **concurseiro militar de 18 anos**, no celular, sem paciência;
- um **contador** que confere cada número exibido contra o dado bruto;
- um **advogado de LGPD e do consumidor**.

O dono do projeto já revisou o sistema várias vezes e **sempre encontra algo novo**. Isso significa que revisões superficiais não bastam. Seu trabalho é ir aonde as revisões anteriores não foram.

A pergunta central de toda a auditoria:

> **"Cada coisa que o Astral mostra, promete ou sugere é verdadeira, funciona, faz sentido e é necessária?"**

O Astral não pode ser uma casca bonita prometendo fartura por dentro. Cada número precisa ser real, cada botão precisa fazer algo útil e cada promessa da landing precisa existir no produto.

---

## 1. Regras de execução

1. **Não implemente nada** durante a auditoria. Apenas investigue e registre. Correções só depois da aprovação do Lucas.
2. **Leia antes:** `CLAUDE.md`, tudo em `.claude/rules/` e `.claude/skills/`, as migrations do Supabase, as policies de RLS e as Edge Functions. As regras do projeto continuam valendo.
3. **Toda afirmação precisa de evidência:** arquivo, função, linha, tabela, policy ou consulta. Sem evidência, o item não entra no relatório.
4. **Não assuma que algo funciona porque existe.** Rastreie o fluxo inteiro: interface → função → banco → de volta à interface.
5. **Recalcule os números.** Para cada métrica exibida, escreva a consulta que gera o valor a partir dos dados brutos e compare com o que a tela mostra. Use dados de teste realistas (seção 13).
6. **Procure também o que sobra.** Remover, fundir ou simplificar conta tanto quanto adicionar. O caso de Conquistas × Condecorações é o modelo: duas coisas fazendo o mesmo papel.
7. **Não pare no primeiro achado de cada área.** Para cada seção, só conclua depois de percorrer todos os itens da checklist.
8. **Trabalhe por fases** (seção 14). Ao fim de cada fase, salve o relatório parcial antes de seguir, para não perder trabalho por limite de contexto.
9. Se encontrar algo que não sabe se é bug ou decisão de produto, registre como `PERGUNTAR AO LUCAS`, com as duas leituras possíveis.

---

## 2. Classificação dos achados

| Severidade | Significado | Exemplo |
|---|---|---|
| **S0 — Bloqueia lançamento** | Falha de segurança, perda/vazamento de dados, cobrança errada, violação legal | Usuário lê dados de outro usuário; webhook de pagamento sem validação |
| **S1 — Quebra a confiança** | Número errado, promessa não cumprida, função que não funciona | "58 dias no mês"; condecoração de sequência que não libera |
| **S2 — Atrapalha a experiência** | Confusão, inconsistência de nomes, fluxo ruim, tela vazia sem orientação | "Missões" com três significados |
| **S3 — Polimento** | Visual, texto, pequenas melhorias | Rótulo sobreposto no gráfico |

Além da severidade, classifique o tipo: `BUG` · `INCONSISTÊNCIA` · `PROMESSA VAZIA` · `REDUNDÂNCIA` · `FALTANDO` · `SEGURANÇA` · `LEGAL` · `UX` · `PERFORMANCE` · `CUSTO`.

---

## 3. Mapa do produto (faça primeiro)

Antes de auditar, construa o inventário completo:

- [ ] Todas as rotas/páginas, com o que cada uma faz em uma frase
- [ ] Todas as tabelas, colunas e relações do Supabase
- [ ] Todas as Edge Functions, com quem chama cada uma e o que fazem
- [ ] Todas as chamadas externas (IA, Mercado Pago, e-mail, YouTube etc.)
- [ ] **Todos os números exibidos** ao usuário, com a fonte de cada um
- [ ] **Todos os sistemas de recompensa:** XP, níveis, patentes, missões, Operação Constância, conquistas, condecorações, quadro de operações, habilidades, instrução, tags/divisas, atributos da ficha
- [ ] **Todas as promessas** feitas na landing, onboarding, e-mails, textos de botão e descrições de plano

Salve como `docs/auditoria/00-mapa.md`. Todo o resto da auditoria se apoia neste mapa.

---

## 4. Promessa × entrega

Para **cada promessa** listada no mapa:

| Promessa | Onde aparece | Existe? | Funciona como dito? | Evidência |
|---|---|---|---|---|

Exemplos do que verificar:
- "A IA lê seu edital": funciona com PDFs reais e diferentes? Escaneado? Edital com anexos? Edital com 200 páginas? Retificação?
- "Cronograma montado nos pesos do edital": os pesos vêm mesmo do edital ou de um padrão?
- "Rebalanceia pelo seu desempenho": quais dados alimentam isso de fato?
- "Professores pesquisados para o seu edital": os links existem? Os canais são reais? São da matéria certa?
- "Questões de provas militares antigas, do jeito que caíram": a fonte está identificada? Gabarito conferido?
- Descrição de cada condecoração e habilidade: a regra no código é exatamente a que o texto diz?
- Descrição de cada plano: tudo que o Pro promete está realmente bloqueado no free e liberado no Pro?

Qualquer promessa que não se cumpre por inteiro é **S1 — PROMESSA VAZIA**.

---

## 5. Integridade dos números

Para **cada número exibido** ao usuário:

- [ ] Existe uma única fonte de verdade para ele? Ou cada tela calcula o seu?
- [ ] O mesmo conceito tem o mesmo valor em todas as telas? (Ex.: total de condecorações, divisas, dias de estudo, sequência, domínio)
- [ ] O rótulo descreve exatamente o cálculo? ("no mês" é mês calendário ou últimos 30 dias? "mais de 50%" usa `>` ou `>=`?)
- [ ] Barras e gráficos são proporcionais ao valor?
- [ ] Percentual e ponto percentual estão usados corretamente?
- [ ] Médias simples vs ponderadas: qual faz sentido num produto que gira em torno de peso de edital?
- [ ] Datas e horas usam `America/Sao_Paulo` em todo lugar? Sessão às 23h50 conta no dia certo? Sessão que atravessa a meia-noite?
- [ ] Contadores de sequência: qual o comportamento na virada do dia, em dia sem cronograma (folga planejada), na troca de edital?
- [ ] Arredondamentos: 83.6h vs 83.62h vs 83h37min. Um padrão só.
- [ ] Estados de zero: usuário novo vê "0", "—", ou uma mensagem que orienta?

Para cada métrica, registre: **fórmula atual · fórmula correta · consulta de verificação · resultado com os dados de teste**.

Proponha (sem implementar) uma camada única `user_stats` caso ela ainda não exista ou esteja incompleta.

---

## 6. Economia de gamificação

### 6.1 Coerência
- [ ] Tabela completa de **todas as fontes de XP** e quanto cada uma dá. Existe alguma fonte que permite farmar XP sem estudar? (Abrir e fechar cronômetro, marcar sessão como feita sem cronometrar, responder questões aleatoriamente, trocar edital para repetir conquistas)
- [ ] Quanto XP um aluno "normal" ganha por semana? Em quanto tempo chega a cada patente? A curva é motivadora no começo e desafiadora depois, ou ele chega no topo em 2 meses?
- [ ] Os pontos de Instrução batem com a regra "1 por patente"? Recomeçar devolve tudo?
- [ ] Bônus da Instrução se acumulam de forma que quebre a economia?
- [ ] O que acontece com XP, patente, condecorações e habilidades ao **trocar de edital** ou de **força** (patentes de bombeiro → aeronáutica)?
- [ ] Conquistas permanentes (sequência máxima, horas totais) usam o recorde, não o valor atual?
- [ ] Condecorações secretas são reveladas em alguma outra tela (tags, quadro, notificações)?
- [ ] Existe conquista impossível de obter com o edital atual (tag de Inglês num edital sem Inglês)?
- [ ] O "domínio" pode ser inflado sem aprender? De onde ele vem exatamente?

### 6.2 Redundância
Liste todos os sistemas de recompensa lado a lado e responda para cada par:
- Fazem o mesmo papel? Têm o mesmo gatilho? Mostram a mesma informação?
- Um usuário novo entende a diferença entre eles em 10 segundos?

Para cada redundância, proponha: **fundir**, **remover** ou **diferenciar claramente**, com justificativa.

### 6.3 Nomenclatura
- [ ] Lista de todos os termos do jogo (patente, nível, divisa, tag, habilidade, condecoração, conquista, missão, marco, instrução...). Cada termo tem um significado só?
- [ ] Nomes duplicados entre sistemas (ex.: "Sentinela" como condecoração e como tag)?
- [ ] Patentes corretas para cada força (bombeiros, PM, Exército, Marinha, Aeronáutica), em ordem hierárquica real?

---

## 7. Núcleo de estudo

### 7.1 Edital e IA
- [ ] Teste com pelo menos 5 editais reais diferentes (ESA, EEAR, um de Bombeiros estadual, um de PM, um da Marinha). Registre o que a leitura acertou e errou: matérias, pesos, datas, fases (TAF, exames).
- [ ] Edital sem pesos explícitos: o que o sistema assume? Isso é comunicado ao aluno?
- [ ] PDF escaneado (imagem), PDF protegido, PDF gigante, arquivo que não é edital, arquivo malicioso.
- [ ] **Prompt injection:** um PDF com texto do tipo "ignore as instruções anteriores" altera o comportamento da IA?
- [ ] O aluno consegue corrigir uma matéria ou peso errado lido pela IA?
- [ ] Cache de edital: hash, reaproveitamento, retificação, nenhum dado de aluno na tabela compartilhada.
- [ ] Limite de custo: um usuário pode disparar leituras ilimitadas e gerar custo de IA? Existe teto diário/mensal?
- [ ] Falha da API de IA: o que o aluno vê? Pode tentar de novo?

### 7.2 Cronograma
- [ ] Toda matéria aparece pelo menos uma vez por semana?
- [ ] A distribuição respeita a rotina declarada (dias, horas, duração da sessão)?
- [ ] Rotina extrema: 1 dia por semana, 5h+ por dia, sessão de 25 min, edital com 15 matérias.
- [ ] Edição manual + "voltar ao automático": algo se perde?
- [ ] O rebalanceamento muda o cronograma de forma explicável? O aluno entende por quê?
- [ ] Prova já passou: o que acontece? E prova sem data definida?
- [ ] Faltam menos de 7 dias para a prova: o cronograma muda de estratégia?

### 7.3 Cronômetro
- [ ] Fechar a aba, recarregar, bloquear o celular, trocar de app: o tempo se perde, continua ou é inflado?
- [ ] Duas abas com cronômetro ao mesmo tempo.
- [ ] Sessão esquecida ligada por 10 horas: existe limite ou confirmação?
- [ ] O tempo vai para a matéria certa? "Geral" alimenta alguma métrica?
- [ ] O XP do cronômetro bate com o XP do cronograma?

### 7.4 Banco de questões
- [ ] Gabaritos conferidos? Existe forma de o aluno reportar questão errada?
- [ ] Questões com imagem/fórmula renderizam no celular?
- [ ] Filtros sem resultado mostram orientação?
- [ ] Como as respostas alimentam domínio e o atributo Precisão?
- [ ] Origem das questões registrada (concurso, ano, banca)?

### 7.5 Guia de estudos
- [ ] Todos os links funcionam? Os canais existem e são da matéria certa?
- [ ] Algum conteúdo de demonstração ("exemplo A/B/C") pode aparecer em produção?
- [ ] Materiais específicos do edital (legislação estadual, estatuto da corporação) ou só genéricos?

### 7.6 Calendário
- [ ] "Próximo evento" considera todos os tipos de evento?
- [ ] Eventos importados do edital vs criados pelo aluno: editar, apagar, duplicar.

---

## 8. Segurança

Assuma que alguém vai tentar invadir. Para cada item, registre se está protegido e **como você verificou**.

### 8.1 Banco e acesso
- [ ] **Toda tabela** tem RLS ativado? Liste as que não têm.
- [ ] Cada policy restringe por `auth.uid()` corretamente? Teste: usuário A consegue ler, editar ou apagar dados do usuário B mudando um id na requisição?
- [ ] Tabelas de recompensa (XP, condecorações, plano): o **cliente consegue escrever diretamente** nelas? Um usuário pode se dar XP, condecorações ou `plan = 'pro'` pelo console do navegador?
- [ ] `service_role` aparece em algum lugar do frontend ou do repositório?
- [ ] Views e funções `SECURITY DEFINER` expõem dados além do necessário?
- [ ] Storage: buckets públicos? Um aluno acessa o edital enviado por outro?

### 8.2 Autenticação
- [ ] Recuperação de senha, troca de e-mail, confirmação de e-mail.
- [ ] Sessão expira? Logout invalida o token?
- [ ] Rate limit em login, cadastro e recuperação de senha.
- [ ] Contas falsas em massa para abusar do trial ou da IA.

### 8.3 Pagamentos (Mercado Pago)
- [ ] O webhook **valida a assinatura** do Mercado Pago? Alguém pode chamar o endpoint e se tornar Pro?
- [ ] Idempotência: o mesmo evento recebido duas vezes cria duas assinaturas?
- [ ] Pagamento recusado, estornado, chargeback, cancelamento: o plano volta ao estado certo?
- [ ] O status do plano é decidido **no backend** e nunca por parâmetro vindo do frontend?
- [ ] Preço cobrado é definido no servidor (o usuário não consegue alterar o valor)?
- [ ] Trial: dá para reiniciar o trial criando outra conta com o mesmo CPF/e-mail/cartão?
- [ ] Planos mensal, trimestral, anual e fundador: cada um libera e expira corretamente?

### 8.4 Entradas e conteúdo
- [ ] Upload: valida tipo e tamanho no servidor? Rejeita arquivos que não são PDF?
- [ ] Campos de texto (nome, eventos, notas): XSS possível? Conteúdo renderizado como HTML em algum lugar?
- [ ] Rate limit nas Edge Functions, principalmente as que chamam IA.
- [ ] Chaves de API: todas em Supabase secrets? Alguma no código, `.env` versionado ou histórico do git?

### 8.5 Operação
- [ ] Backups do banco ativados? Restauração já testada?
- [ ] Logs de erro centralizados (ex.: Sentry)? Alertas para falha de pagamento e de IA?
- [ ] Dependências com vulnerabilidades conhecidas (`npm audit`)?

---

## 9. LGPD e direito do consumidor

- [ ] **Menores de idade:** o público inclui pessoas de 17 anos. Existe tratamento para isso (consentimento do responsável, como exige o art. 14 da LGPD)? O pagamento por menor está tratado?
- [ ] Consentimento com checkbox desmarcado, registrado com data e versão do texto.
- [ ] **Política de Privacidade** e **Termos de Uso** publicados, coerentes com o que o sistema realmente coleta (WhatsApp, edital, dados de estudo, dados de pagamento).
- [ ] O aluno consegue **exportar** e **excluir** a própria conta e os dados? A exclusão apaga de verdade (incluindo storage e logs)?
- [ ] **Direito de arrependimento** (CDC, art. 49): compra online pode ser cancelada em até 7 dias com reembolso integral. O fluxo de reembolso existe?
- [ ] Renovação automática informada com clareza antes da compra? Aviso antes de renovar?
- [ ] Cancelamento é tão fácil quanto assinar?
- [ ] Dados enviados à IA: algum dado pessoal vai junto com o edital?
- [ ] Questões de provas antigas e materiais do guia: uso permitido? Fontes citadas?

---

## 10. Experiência do usuário

### 10.1 Jornadas a percorrer (simule cada uma do início ao fim)
1. **Ana, 17 anos, Bombeiros, celular Android básico, 4G fraco.** Cadastra, envia edital, monta cronograma, estuda a primeira sessão.
2. **Bruno, 22 anos, ESA, estuda antes do edital.** Assina o anual, usa 30 dias seguidos.
3. **Carla, PM, edital acabou de sair, prova em 70 dias.** Assina o trimestral.
4. **Diego, some por 15 dias e volta.** O que ele vê? Habilidades enferrujadas, sequência zerada: isso motiva a voltar ou faz desistir?
5. **Eva, termina o trial e não assina.** O que perde, o que mantém, o que vê?
6. **Fábio, troca de edital** (Bombeiros → Aeronáutica). O que acontece com tudo que ele conquistou?
7. **Gabi, passou no concurso.** Existe um final para essa jornada? Cancelamento, comemoração, depoimento?
8. **Atacante** tentando virar Pro de graça, ver dados alheios ou gerar custo de IA.

Para cada jornada: onde ela trava, se confunde, desiste ou é enganada por um número?

### 10.2 Checklist geral
- [ ] **Celular primeiro:** toda tela funciona bem em 360px de largura? Toque, rolagem, teclado sobre campos?
- [ ] PWA ou atalho na tela inicial?
- [ ] Desempenho: tempo de carregamento em 4G lento. Tamanho do bundle. Imagens otimizadas.
- [ ] Estados vazios, de carregamento e de erro em **todas** as telas.
- [ ] Mensagens de erro em português claro, sem texto técnico.
- [ ] Acessibilidade básica: contraste, tamanho de fonte, navegação por teclado, textos alternativos.
- [ ] Quantidade de informação no primeiro acesso: o novo aluno entende o que fazer em 30 segundos?
- [ ] Notificações e e-mails: existem? São úteis ou chatos? Como desativar?

---

## 11. Negócio e lançamento

- [ ] Planos free / trial / mensal / trimestral / anual / fundador implementados conforme `astral-planos-gap-analysis.md` e `astral-simulacao-12-meses-v3.md`.
- [ ] Gatilhos de conversão (condecorações guardadas, rebalancear, habilidade pronta, limite de questões) existem e respeitam "no máximo 1 aviso de Pro por sessão"?
- [ ] Lista de espera, UTMs, campo "como conheceu", códigos de parceiro, sistema de indicação ("Recrutador").
- [ ] Painel de administração: cadastros por dia e origem, conversão do trial por plano, faturamento, churn.
- [ ] Eventos de analytics nos pontos do funil de onboarding (cadastro → edital → rotina → primeira sessão).
- [ ] Canal de suporte visível (onde o aluno reclama ou pede ajuda?).
- [ ] Landing page: tudo o que ela mostra existe? Prints atualizados? Preços corretos?
- [ ] SEO básico: título, descrição, imagem de compartilhamento (Open Graph), favicon.
- [ ] E-mails transacionais chegam (não caem no spam)? SPF/DKIM/DMARC configurados no domínio?
- [ ] Custos: algum serviço pode gerar cobrança inesperada com escala (IA, e-mail, storage, banda)? Existem limites e alertas?

---

## 12. Código e manutenção

- [ ] Código morto, componentes não usados, rotas esquecidas, feature flags abandonadas.
- [ ] Lógica de negócio duplicada entre frontend e backend (regra de XP, de plano, de domínio).
- [ ] Permissões espalhadas (`if plan === 'pro'`) em vez de uma função central.
- [ ] TODOs, `console.log`, dados de teste e contas de simulação que podem ir para produção.
- [ ] Testes automatizados para as regras críticas (XP, sequência, domínio, plano, webhook). Se não existirem, liste os mínimos necessários.
- [ ] Migrations reproduzíveis: um banco novo sobe do zero só com elas?

---

## 13. Dados de teste

Antes das fases 2 a 4, crie (em ambiente de desenvolvimento, nunca em produção) um conjunto de usuários de teste com históricos conhecidos, para que os números esperados possam ser calculados à mão:

| Usuário | Histórico |
|---|---|
| novo | Recém-cadastrado, nada feito |
| constante | 45 dias seguidos, 2h por dia, todas as matérias |
| quebrou | 32 dias seguidos, falhou 1 dia, voltou há 2 dias |
| sumido | Estudou 20 dias e sumiu há 15 |
| desequilibrado | Só estuda 2 matérias |
| fim_de_trial | Trial expira hoje |
| trocou_edital | Bombeiros por 30 dias, depois Aeronáutica |
| madrugada | Sessões sempre entre 23h e 1h |

Para cada usuário, calcule à mão o valor esperado de cada métrica e compare com o que o sistema mostra.

---

## 14. Fases e entregáveis

Execute uma fase por vez. Ao fim de cada uma, salve o arquivo e mostre um resumo antes de seguir.

| Fase | Seções | Arquivo |
|---|---|---|
| 1 | Mapa do produto (3) | `docs/auditoria/00-mapa.md` |
| 2 | Segurança (8) e LGPD/consumidor (9) | `docs/auditoria/01-seguranca-legal.md` |
| 3 | Integridade dos números (5) e gamificação (6) | `docs/auditoria/02-numeros-gamificacao.md` |
| 4 | Núcleo de estudo (7) e promessa × entrega (4) | `docs/auditoria/03-nucleo-promessas.md` |
| 5 | Experiência (10), negócio (11) e código (12) | `docs/auditoria/04-ux-negocio-codigo.md` |
| 6 | Consolidação | `docs/auditoria/RELATORIO-FINAL.md` |

### Formato de cada achado
```
### [ID] Título curto
- Severidade: S0 | S1 | S2 | S3
- Tipo: BUG | INCONSISTÊNCIA | PROMESSA VAZIA | REDUNDÂNCIA | FALTANDO | SEGURANÇA | LEGAL | UX | PERFORMANCE | CUSTO
- Onde: arquivo:linha / tabela / policy / tela
- O que acontece: ...
- O que deveria acontecer: ...
- Evidência: consulta, trecho de código, passo a passo para reproduzir
- Correção sugerida: ...
- Esforço: P (< 1h) | M (1–4h) | G (> 4h)
```

### Relatório final (Fase 6)
1. **Veredito:** pronto para lançar? Se não, o que falta.
2. **Todos os S0**, em ordem de correção. Nenhum lançamento com S0 aberto.
3. **Todos os S1**, agrupados por área.
4. **O que remover ou fundir**, com o ganho em simplicidade.
5. **O que falta** para o produto cumprir o que promete.
6. **Plano de correção** em lotes: lote 1 (S0), lote 2 (S1 de menor esforço), lote 3 (restante), com estimativa de esforço.
7. **Perguntas para o Lucas.**
8. **Checklist de "pronto para lançar"**, com os itens que precisam estar marcados no dia do lançamento.

---

## 15. Antes de declarar qualquer fase concluída

Responda honestamente:
- Percorri **todos** os itens da checklist desta fase, ou parei nos primeiros achados?
- Cada achado tem evidência concreta?
- Testei com dados, ou só li o código?
- Existe alguma tela, tabela ou função que não abri?
- Se o Lucas abrir o app amanhã e encontrar um problema desta área que eu não registrei, qual seria o motivo?

Se alguma resposta for desconfortável, a fase não terminou.