# Auditoria pré-lançamento — Fase 1: o mapa do produto

> **01/10/2026** · Seção 3 do `PROMPT-auditoria.md`. **Só inventário: nada foi auditado nem alterado.**
> Fontes: o código do repositório (commit `0e5a343`) e o **banco de produção**, lido hoje pela
> API de gerenciamento (tabelas, colunas, relações, RLS, policies, grants, funções, gatilhos e
> contagem **exata** de linhas).
>
> 📁 Movido em 01/10/2026 para `docs/auditoria/`, a pedido dele (*"coloque o arquivo no lugar certo,
> eu botei no histórico sem querer"*). A pasta `docs/` passa a existir só para a auditoria.

---

## 1. Páginas — 24 arquivos

O site não tem rotas de framework: cada página é um `.html` estático na Vercel. Destas, 14 têm a
barra lateral (área logada); as outras são públicas ou redirecionam.

### Área logada (com barra lateral)

| Página | O que faz, em uma frase | Lê / grava no servidor |
|---|---|---|
| `dashboard.html` | O painel: leitura do edital, revelação, sessão de hoje, revisão, guia, chefe, missões, ficha, gráfico da semana, condecorações e cartão de stories | `progresso`, `sessoes_estudo`, `eventos`, `perfis`, `recursos_salvos` · RPC `fatos_do_usuario`, `fatos_de_hoje`, `sincronizar_conquistas`, `caderno_de_erros`, `salvar_progresso` · função `processar-edital`, `buscar-recursos` |
| `cronograma.html` | A semana montada na rotina e no domínio, com ajuste da rotina e edição manual | `progresso` (via `estado.js`) |
| `calendario.html` | Eventos e prova; importa a data da prova do edital | `eventos` (via `estado.js`) |
| `cronometro.html` | Cronômetro livre, pomodoro e relógio; grava sessões | `sessoes_estudo`, `progresso` |
| `progresso.html` | Domínio por matéria, horas por semana, diário de campanha, sugestões de rebalanceamento | `perfis`, `sessoes_estudo`, `progresso` |
| `banco.html` | Banco de questões: acervo, "minhas questões" (PDF do aluno) e caderno de erros | `questoes_minhas` · RPC `sortear_questoes`, `filtros_de_questoes`, `registrar_resposta`, `caderno_de_erros`, `sou_administrador` |
| `taf.html` | Marcas do TAF contra o índice do edital, com XP de preparo físico | `progresso` (coluna `taf`), `taf_registros` · RPC `meu_taf` |
| `conquistas.html` | Condecorações (74) e habilidades por matéria — **a aba do navegador ainda diz "Missões"** | `perfis` · RPC `fatos_do_usuario`, `sincronizar_conquistas` |
| `arvore.html` | O Quadro de operações: as condecorações em 8 frentes | RPC `fatos_do_usuario`, `sincronizar_conquistas` |
| `habilidades.html` | Instrução: gastar pontos de especialização em 3 ramos | `catalogo_habilidades` · RPC `escolher_habilidade`, `esquecer_habilidades`, `sincronizar_conquistas` |
| `tags.html` | Vitrine das divisas; escolher qual vestir | RPC `fatos_do_usuario`, `sincronizar_conquistas` · grava `progresso.tag_escolhida` |
| `conta.html` | Dados da conta, limites do plano, sair de todos os aparelhos, baixar dados, excluir conta | `perfis`, `progresso`, `eventos`, `sessoes_estudo` · funções `minha-quota`, `excluir-conta` |
| `questoes.html` | Questões geradas por IA — **desligada desde 31/07** (`FUNCOES_DESLIGADAS`); fora do menu | função `gerar-questoes` (responde 503) |
| `importar.html` | Só administrador: transforma PDF de prova em questões do acervo | RPC `publicar_questoes`, `acervo_do_administrador`, `sou_administrador` |

### Públicas

| Página | O que faz |
|---|---|
| `index.html` | A página inicial (landing): promessa, como funciona, gamificação, "Acesso antecipado", perguntas frequentes |
| `cadastro.html` | Lista de espera (nome, e-mail, WhatsApp opcional, carreira) — com captcha; chama `entrar-lista-espera` |
| `criar-conta.html` | Criar conta com Google ou e-mail e senha, com consentimento (caixa desmarcada) e captcha |
| `login.html` | Entrar (Google ou e-mail/senha) e "esqueci a senha" |
| `redefinir-senha.html` | Definir senha nova a partir do link do e-mail |
| `termos.html` · `privacidade.html` | Termos de Uso e Política de Privacidade |
| `estilo.html` | Página interna da fundação visual (V1) — tokens de cor, tipo e movimento |

### Redirecionamentos (20 linhas cada)

| Página | Vai para |
|---|---|
| `edital.html` | `dashboard.html` (o edital entrou no painel em 28/09) |
| `recursos.html` | `dashboard.html#guia` (o guia entrou no painel em 28/09) |

### Módulos compartilhados (`assets/js/`, 26 próprios)

`astral.js` (cliente Supabase, sessão, escape, toast, `chamarIA`, `ehCompleto`, captcha) · `estado.js` (ler/gravar progresso, sessões, eventos) · `identidade.js` (nome e inicial antes da 1ª pintura) · `divisa.js` (patente, tag, carreiras) · `catalogo.js` (74 condecorações, 33 divisas) · `condecoracoes.js` (o motor que confere) · `missoes.js` · `chefe.js` · `cronograma.js` · `plano.js` (necessidade, guia) · `rotina.js` · `revisao.js` · `diario.js` · `grafico.js` · `arvore.js` · `anuncio.js` · `cartao.js` · `taf.js` · `prova.js` (leitor de provas e nomes de matéria) · `assuntos.js` · `pdf-para-texto.js` · `icones.js` · `menu.js` · `transicao.js` · `movimento.js` · `botoes.js` · `cedo.js`. De terceiros: `supabase-2.111.0.js`, `pdf-4.10.38.min.mjs` e o worker do pdf.

---

## 2. Banco de dados (Supabase, produção)

### 2.1 As 23 tabelas — linhas contadas hoje (exatas)

| Tabela | Colunas | Linhas | Relações |
|---|---|---|---|
| `perfis` | id, nome, email, tipo_plano (CHECK free/beta/pro, padrão free), criado_em | 7 | id → auth.users (cascade) |
| `progresso` | usuario_id, xp, streak, horas, edital (jsonb), materias (jsonb), cronograma_hoje, badges, tag_escolhida, xp_validado, rotina, taf, criado_em, atualizado_em | 2 | → auth.users (cascade) |
| `sessoes_estudo` | id, usuario_id, materia, segundos, xp, modo, criado_em | 118 | → auth.users (cascade) |
| `eventos` | id, usuario_id, nome, data, categoria, obs, origem, criado_em | 2 | → auth.users (cascade) |
| `conquistas` | usuario_id, tipo, item_id, conquistada_em | 52 | → auth.users (cascade) |
| `habilidades_escolhidas` | usuario_id, habilidade_id, escolhida_em | 5 | → auth.users (cascade); → catalogo_habilidades |
| `respostas` | id, usuario_id, questao_id, minha_id, letra, acertou, vezes_errou, vezes_acertou, atualizado_em | 185 | → auth.users, → questoes, → questoes_minhas (cascade) |
| `questoes` | id, banca, prova, ano, numero, materia, assunto, enunciado, alternativas, gabarito, publicada, revisao, explicacao, tipo, texto_apoio, criado_em | 1.989 (1.980 publicadas) | — |
| `questoes_minhas` | id, usuario_id, origem, materia, assunto, enunciado, alternativas, gabarito, explicacao, tipo, texto_apoio, criado_em | 0 | → auth.users (cascade) |
| `questoes_servidas` | usuario_id, questao_id, criado_em | 117 | → auth.users, → questoes (cascade) |
| `recursos_salvos` | id, usuario_id, materia, concurso, dados (o guia), criado_em | 9 | → auth.users (cascade) |
| `taf_registros` | id, usuario_id, prova, valor, criado_em | 10 | → auth.users (cascade) |
| `uso_ia` | id, usuario_id, funcao, unidades, criado_em | 0 | → auth.users (cascade) |
| `editais_lidos` | hash, resultado, paginas, usos, criado_em, ultimo_uso | 0 | — |
| `guias_por_edital` | edital_hash, materia, dados, criado_em | 0 | → editais_lidos (cascade) |
| `catalogo_condecoracoes` | id, metal, secreta, nome, descricao, condicao | 74 | — (gerado de `catalogo.js`) |
| `catalogo_divisas` | id, raridade, secreta, nome, como_ganha, cor, condicao | 33 | — (gerado de `catalogo.js`) |
| `catalogo_habilidades` | id, ramo, degrau, nome, descricao, regra, limiar, bonus | 12 | — |
| `materias_conhecidas` | ordem, padrao, nome | 39 | — (espelho de `prova.js`) |
| `administradores` | usuario_id, criado_em | 1 | → auth.users (cascade) |
| `auditoria` | id, evento, alvo_id, alvo_email, autor, detalhe, criado_em | 4 | alvo_id → auth.users (set null) |
| `erros_cliente` | id, usuario_id, mensagem, pagina, origem, pilha, navegador, criado_em | 137 | → auth.users (set null) |
| `lista_espera` | id, nome, email, concurso, whatsapp, criado_em | 0 | — |
| *(auth.users)* | contas do Supabase Auth | 7 | — |

**Armazenamento de arquivos (Storage):** nenhum bucket. O PDF do edital vai para a função e **não é guardado**.

### 2.2 Segurança por tabela (estado de hoje, sem julgamento)

- **RLS ligada nas 23 tabelas.**
- **Com policy de leitura do próprio dono:** perfis, progresso, sessoes_estudo, eventos, conquistas,
  habilidades_escolhidas, questoes_minhas, recursos_salvos, taf_registros.
- **Catálogos legíveis por qualquer logado:** catalogo_condecoracoes, catalogo_divisas, catalogo_habilidades.
- **Sem policy nenhuma (fechadas — só chave de serviço ou função `SECURITY DEFINER`):** administradores,
  auditoria, editais_lidos, erros_cliente, guias_por_edital, lista_espera, materias_conhecidas,
  questoes, questoes_servidas, respostas, uso_ia.
- **Grants do `authenticated`:** escrita direta só em eventos, recursos_salvos, sessoes_estudo
  (insert/delete), questoes_minhas, taf_registros (insert de prova e valor). Em `progresso`, insert e
  update **coluna a coluna** (não inclui `xp_validado`); em `perfis`, update só de `nome`.
- **`anon`:** nenhum grant de tabela.

### 2.3 Gatilhos (10 + 1 no Auth)

| Tabela | Gatilho | O que faz |
|---|---|---|
| auth.users | `ao_criar_usuario` | cria o perfil (`criar_perfil_usuario`) |
| perfis | `ao_mudar_plano` | grava troca de plano na `auditoria` |
| progresso | `numeros_do_servidor` | recalcula XP, horas, sequência e **domínio** em toda gravação do site |
| progresso | `progresso_atualizado_em` | carimba `atualizado_em` |
| sessoes_estudo | `sessao_confiavel` | data do servidor, XP pela regra, teto de 4 h/12 h declaradas, sessão medida ≤ tempo passado |
| sessoes_estudo | `dominio_apos_sessao` | recalcula o domínio |
| respostas | `dominio_apos_resposta` | recalcula o domínio |
| taf_registros | `taf_confiavel` | data do servidor, limites por prova, 30 marcas/dia |
| questoes_minhas | `trg_limite_questoes_minhas` | teto de questões por conta |
| lista_espera | `notificar-novo-cadastro` | chama a função `notificar-cadastro` por HTTP, com segredo no cabeçalho (o valor fica no banco; **não reproduzido aqui**) |
| lista_espera | `ao_remover_lead` | grava remoção na `auditoria` |

### 2.4 Funções do banco (37) — e quem chama

| Chamadas pelo site | `fatos_do_usuario` (5 páginas) · `sincronizar_conquistas` (5) · `fatos_de_hoje` (2) · `caderno_de_erros` (2) · `sou_administrador` (2) · `sortear_questoes` · `filtros_de_questoes` · `registrar_resposta` · `salvar_progresso` · `meu_taf` · `escolher_habilidade` · `esquecer_habilidades` · `publicar_questoes` · `acervo_do_administrador` |
|---|---|
| **Engrenagem interna** (chamadas por outras funções ou gatilhos) | `ficha_do_usuario`, `minha_precisao`, `avaliar_condicao`, `xp_com_bonus`, `bonus_da_sessao`, `pontos_de_habilidade`, `sequencia_do_usuario`, `dominio_calculado`, `dominio_formula`, `materia_do_banco`, `mesclar_materias`, `unaccent_simples`, `gravacao_pelo_site`, `limite_questoes_minhas` e as 7 de gatilho |
| **Existem, ninguém chama hoje** | `meu_dominio` (criada em 30/09 para a tela; a tela lê `progresso.materias`) |

Executáveis pelo `authenticated`: 27. Pelo `anon`: 2 (`gravacao_pelo_site`, `limite_questoes_minhas`).
23 são `SECURITY DEFINER` (rodam com o poder do dono do banco). Contado na produção em 01/10.

---

## 3. Funções do servidor (Edge Functions) — 8 + o módulo comum

| Função | Quem chama | O que faz | Externo |
|---|---|---|---|
| `processar-edital` | painel (`processarEdital`) | lê o PDF com IA (matérias, pesos, data, força, patente, TAF); cache por SHA-256 do PDF; janela de 30 dias | Anthropic |
| `buscar-recursos` | `plano.js` (`gerarGuiaCompleto`) | guia de professores e materiais por matéria, com busca na web; confere os links; guia compartilhado por edital | Anthropic (+ busca web) · YouTube e sites (conferência) |
| `gerar-questoes` | `questoes.html` | **desligada** (503) | Anthropic |
| `minha-quota` | `astral.js` (`buscarQuota`) → `conta.html`, Banco | plano e limites do dia / dos 30 dias | — |
| `excluir-conta` | `conta.html` | apaga a conta e os dados (cascata) | — |
| `entrar-lista-espera` | `cadastro.html` | grava na lista de espera, conferindo o captcha | hCaptcha |
| `notificar-cadastro` | gatilho do banco em `lista_espera` | manda e-mail **para o dono** avisando de lead novo | Resend |
| `registrar-erro` | `astral.js` (`relatar`) — todas as páginas | grava erro do navegador em `erros_cliente` | — |
| `_shared/comum.ts` | as 8 | autenticação, CORS, cota por plano, interruptor de função desligada, JSON tolerante | — |
| `_shared/links.ts` | `buscar-recursos` | conferidor de links (YouTube e sites) | YouTube e sites |

**Segredos usados (só os nomes; os valores ficam no Supabase):** `ANTHROPIC_API_KEY`, `MODELO_IA`,
`RESEND_API_KEY`, `EMAIL_NOTIFICACAO`, `HCAPTCHA_SECRET`, `WEBHOOK_SECRET`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. Chamadas externas

| Serviço | Para quê | De onde |
|---|---|---|
| **Supabase** (`jjogmcacbdefwiwcyjxp`) | banco, autenticação, funções | todo o site (única origem de dados permitida pela CSP) |
| **Anthropic** (`claude-sonnet-4-6`) | ler edital, guia de estudo, questões (desligada) | 3 funções do servidor |
| **Google** (OAuth) | entrar com Google | Supabase Auth |
| **hCaptcha** | captcha no cadastro, login e lista de espera | navegador (`js.hcaptcha.com`) + servidor (`api.hcaptcha.com`) |
| **Resend** | e-mail de lead novo **para o dono** (remetente `onboarding@resend.dev`) | `notificar-cadastro` |
| **E-mail do Supabase Auth** | confirmação, "esqueci a senha" | SMTP **padrão** do Supabase (só entrega à organização; senha de app do Gmail pendente) |
| **YouTube + sites dos materiais** | conferir se o link existe | `_shared/links.ts` |
| **Vercel** | hospeda o site; deploy automático do `main` | — |
| **GitHub Actions** | `verifica.yml` a cada push; `vigia.yml` de hora em hora (`checa-saude` + `testa-site`) | — |
| **Mercado Pago** | **não existe** | — |
| Fontes | **locais** (Archivo, Source Serif 4, JetBrains Mono em `assets/`) — sem Google Fonts | — |
| Analytics / métricas | **não existe** | — |

---

## 5. Todo número que aparece ao usuário, com a fonte

> "Servidor" = calculado no banco. "Navegador" = calculado na página a partir do que veio do banco.

### Painel (`dashboard.html`)

| Número | Fonte |
|---|---|
| Patente + tag no topo (divisa) | navegador: `nivelDe` (`divisa.js`) sobre `progresso.xp` (servidor) + `tagVestida` sobre `progresso.materias` e `tag_escolhida` |
| "N dias" (sequência) | `progresso.streak` — servidor (`sequencia_do_usuario`) |
| Nível atual, "Nível N", "x / y XP neste posto", "N no total", próximo rank, barra | navegador (`nivelDe`) sobre `progresso.xp` |
| Tempo investido "Nh" | `progresso.horas` — servidor |
| Domínio do edital "x/9" | navegador: matérias com `progresso` ≥ 70 |
| Faixa do edital: força, nº de matérias, data, "faltam N dias", pesos por matéria | `progresso.edital` e `materias` (vindos da IA) + conta de dias no navegador |
| Revelação: dias até a prova, nº de matérias, sessões e horas/semana, patente | navegador, na hora da leitura |
| Aviso de desequilíbrio: "N pontos percentuais" | navegador: máx − mín do domínio |
| Sessão de hoje: minutos e "+XP" por bloco | navegador (`cronograma.js`, `xpDoBloco`) |
| Revisão de hoje: "x de y", "estudada há N dias", nº no caderno | navegador (`revisao.js`) sobre `sessoes_estudo` + RPC `caderno_de_erros` |
| Guia: "x de y matérias" | navegador sobre `recursos_salvos` |
| Chefe: dias até a prova, fase, preparo "N / 100", "peso P e D% de domínio" | navegador (`chefe.js`) sobre `eventos` + `fatos_do_usuario` (atributos) |
| Missões de hoje: "x / 3", "feito / alvo" por missão | navegador (`missoes.js`) sobre RPC `fatos_de_hoje` |
| Campanha: "Etapa x de 4 · feito de alvo", trilha | navegador (`missoes.js`) sobre `fatos_do_usuario` |
| Ficha: 5 atributos 0–100, "porquê" de cada um, "N sessões · N h · N dias de estudo" | servidor (`ficha_do_usuario` via `fatos_do_usuario`) |
| Sua semana de estudo: total e 7 barras | navegador (`grafico.js`) sobre `sessoes_estudo` dos últimos 7 dias |
| Cobertura do edital: 3 maiores domínios | `progresso.materias` (servidor) |
| Condecorações: por metal "x/y", "Falta pouco: nome · N%", "x de 74" | navegador (`condecoracoes.js`) sobre `fatos_do_usuario` + `sincronizar_conquistas` |
| Cartão de stories: patente, tag, XP, dias seguidos, condecorações | os mesmos acima |

### Demais páginas

| Página | Números | Fonte |
|---|---|---|
| Cronograma | sessões, tempo, dias de estudo, "XP possível + bônus", minutos e XP por bloco, tempo por matéria | navegador (`cronograma.js`) sobre `progresso.rotina` e `materias` (`medida.semana`) |
| Calendário | dias até a prova, próximo evento "em N dias", total de eventos, "em N dias" por evento | navegador sobre `eventos` |
| Cronômetro | tempo, "sessão #N", hoje (min), sessões, XP ganho | navegador sobre `sessoes_estudo` de hoje (XP gravado pelo servidor) |
| Progresso | total de matérias, "50% ou mais", domínio ponderado e simples, gráfico de domínio, "como foi medido" (questões de primeira, horas), horas por semana, diário (dias, horas, marcos, revisões), sugestões "vale P% da prova, você está em D%" | `progresso.materias` (servidor, com `medida`) + navegador (`diario.js`, `plano.js`) sobre `sessoes_estudo` |
| Banco | questões no acervo, contagem por filtro, "questão x de y", "x/y" de acerto e "%" na rodada, "x de 10 questões hoje", minhas questões, caderno | servidor (`filtros_de_questoes`, `sortear_questoes`, `caderno_de_erros`) + contas da rodada no navegador |
| Conquistas | "x / 74", por metal, divisas, "Falta pouco", estado das habilidades (ativa / enferrujada 7 dias / suspensa 14 dias) | navegador (`condecoracoes.js`) + `ultimoEstudoPorMateria` (servidor) |
| Quadro | condecorações por frente, conquistadas | navegador (`arvore.js`) com as gravadas |
| Instrução | pontos livres, gastos, XP sem bônus, próximo ponto, bônus de cada especialização | servidor (`sincronizar_conquistas`: pontos, gastos, xpBase) + catálogo |
| Minhas tags | "N divisas conquistadas de 33", domínio da tag de matéria | navegador com as gravadas |
| TAF | XP de preparo físico, dias treinados, provas no índice, melhor marca, índice, % do índice, últimas marcas | servidor (`meu_taf`) + `progresso.taf` / `edital.taf` |
| Conta | "x de y disponíveis hoje / nos próximos 30 dias" por função de IA | função `minha-quota` |
| Página inicial | números de **exemplo** ("Nível 12 — Cadete", "XP 2.340 / 3.000", "68%", "14 dias de streak", "148 páginas") | **fixos no HTML** (`index.html:1221+`) |

---

## 6. Os sistemas de recompensa

| Sistema | Quantos | Quem decide | Gatilho | Onde aparece |
|---|---|---|---|---|
| **XP** | — | servidor (`validar_sessao_estudo`, `xp_com_bonus`) | sessão: cronômetro 2/min; cronograma máx(10, min/2); + bônus da Instrução | topo, painel, cronômetro, cronograma, cartão |
| **Nível / patente** | 6 carreiras × 14 degraus (`XP_POR_DEGRAU` até 90.000) | navegador (`divisa.js`) | XP **com** bônus; carreira pela força do edital | topo de toda página, painel, cartão |
| **Sequência** | — | servidor | dias seguidos com sessão | topo do painel, ficha, condecorações (melhor sequência) |
| **Missões diárias** | 11 possíveis, 3 por dia (sorteio fixo por dia) | navegador sobre `fatos_de_hoje` | estudo do dia | painel |
| **Campanhas** (inclui Operação Constância) | 4 × 4 etapas = 16 | navegador sobre `fatos_do_usuario` | etapas que nunca expiram | painel |
| **Condecorações** | 74 (22 secretas): bronze 19, prata 29, ouro 25, platina 1 | servidor grava (`sincronizar_conquistas`); navegador confere e anuncia | condições do `catalogo.js` | Conquistas, Quadro, painel, cartão, anúncio com confete |
| **Quadro de operações** | as mesmas 74 em 8 frentes | navegador (`arvore.js`) | — (é visualização das condecorações) | `arvore.html` |
| **Divisas / tags** | 33 no catálogo (10 secretas) + 14 nomes de tag por matéria (`divisa.js`) | navegador; gravadas pelo servidor | domínio ≥ 70, atributos, horas, sequência, condecorações | topo, Minhas tags, cartão |
| **Habilidades por matéria** | 18 entradas (`HABILIDADES_MILITARES`) | navegador | domínio ≥ 70; enferrujam com 7 e 14 dias sem estudar | Conquistas |
| **Instrução (especializações)** | 12 em 3 ramos × 4 degraus | servidor (`escolher_habilidade`, `bonus_da_sessao`) | 1 ponto por degrau de XP **sem** bônus | Instrução |
| **Atributos da ficha** | 5 (Disciplina, Resistência, Amplitude, Doutrina, Precisão) | servidor (`ficha_do_usuario`) | sessões, domínio, questões | painel |
| **Domínio** | por matéria | servidor (`dominio_calculado`) | questões de primeira (60%) + tempo (40%); sem Banco: tempo, até 70 | painel, Progresso, tags, chefe, cronograma |
| **Chefe / preparo** | 1 (a prova) | navegador (`chefe.js`) | evento de prova + Doutrina e Amplitude | painel |
| **Marcos do diário** | primeira vez, recordes, sequências, horas | navegador (`diario.js`) | reprodução da história | Progresso |
| **Revisão espaçada** | 1, 7 e 30 dias | navegador (`revisao.js`) | sessões | painel, diário |
| **XP de preparo físico (TAF)** | 10 por prova por dia | servidor (`meu_taf`) | marca registrada | TAF |
| **Badges antigos** (`progresso.badges`) | 8 | navegador | — | **gravados mas não mostrados** desde 30/09 (o painel ainda grava `primeiro_edital`) |

---

## 7. As promessas

### Página inicial (`index.html`)

| Linha | O que promete |
|---|---|
| 1039 | "O Astral lê tudo, calcula o que vale mais na sua prova e monta a sua semana — com patente, XP e conquistas" |
| 1038 | "Seu edital vira plano de estudo **em poucos minutos**" |
| 1051 | "Primeiros concurseiros já estão na lista de espera" |
| 1153 | Passo 2: "Informe quantas horas por dia você pode estudar, quais dias da semana **e a data da prova**" |
| 1159 | Passo 3: "Cronograma semana a semana, ordem de estudo por relevância e **metas diárias**. Tudo ajustável conforme você avança" |
| 1174 | "Extrai automaticamente todas as matérias, **subtópicos** e seus respectivos pesos" |
| ~1180 | "Priorização por peso: o Astral ordena as matérias pela relevância real na prova" |
| ~1185 | "Cronograma personalizado: horas disponíveis, dias da semana e **tempo até a prova**" |
| 1191 | "Cada hora estudada vira XP. Suba de nível, ganhe **badges** e mantenha seu streak. Feito especialmente para quem tem TDAH" |
| ~1197 | "Dashboard de progresso: veja exatamente quanto você já cobriu de cada matéria e quanto falta para a prova" |
| 1203–1204 | "**Lembretes inteligentes**: notificações no horário certo… o sistema **aprende com seus hábitos**" |
| 1221+ | Cartão de exemplo "Maria S. — Nível 12 — Cadete", com XP, domínios e "14 dias de streak" |
| 1271 | "Quem entrar agora garante **acesso gratuito e vitalício** à plataforma" |
| ~1278 | "Gratuito — para sempre · apenas para os primeiros beta testers"; "Acesso completo a todas as funcionalidades"; "Suporte direto com o fundador"; "Vaga garantida no grupo exclusivo de beta testers" |
| 1288 | "Após o lançamento oficial, o plano Pro será R$ 19,90/mês" |
| 1300 | "Nossa IA **foi treinada** para ler editais de Exército, Marinha, Aeronáutica, PM, Bombeiros… Se tem PDF, o Astral processa" |
| 1305 | "Em **menos de 5 minutos** seu plano está pronto" |
| ~1308 | "Cada hora de estudo registrada gera XP… ganha badges e mantém um streak diário" |
| 1315 | "Posso cancelar a qualquer momento? Sim… **Basta cancelar na sua conta** e você não é cobrado no próximo ciclo" |
| 1323 | "Crie seu plano de estudos em menos de 5 minutos. **Grátis para começar**" |

### Cadastro, entrada e onboarding

| Onde | O que promete |
|---|---|
| `cadastro.html` (lista de espera) | "Vagas limitadas no lançamento"; "garanta acesso antecipado **com desconto exclusivo no lançamento**"; "Seus dados serão usados apenas para te avisar sobre o lançamento… Não compartilhamos com terceiros" |
| `criar-conta.html` | "Acesso antecipado gratuito"; depois do cadastro: "**Enviamos um link de confirmação**… clique no link para ativar sua conta" |
| `login.html` | "Durante o beta o envio de e-mails ainda é limitado" (aviso honesto sobre o SMTP) |
| Painel, área de upload | "Seu edital. Seu plano. **Em 30 segundos.**" · "O Astral extrai as matérias, calcula os pesos e monta um cronograma personalizado" |
| Painel, leitura | "Extraindo matérias, calculando pesos e montando seu cronograma. Não feche esta página" |
| Painel, revelação | as 5 linhas com dado real; "Guia de professores: sendo montado agora" |
| Questionário de rotina (`rotina.js`) | "O Astral monta o seu cronograma em cima destas respostas. Dá para mudar quando quiser" |
| Guia | "Ele é feito uma vez só, pela IA, para as N matérias do seu edital"; ressalva: "cada link é conferido automaticamente… o Astral não recebe nada de nenhum professor" |
| Progresso | botão "**Rebalancear cronograma**" (abre a explicação/sugestões de `abrirModalBalanco`) |
| Instrução | "Nenhuma especialização tira nada de você"; "recomeçar é de graça" |
| TAF | "o Astral não inventa índice"; "O XP do TAF… não mexe na sua patente" |

### Planos e limites

| Onde | O que diz |
|---|---|
| `conta.html` — Meu plano | "Os recursos de inteligência artificial têm um limite diário, que depende do seu plano"; "cada uso volta a ficar disponível 24 horas depois"; edital: "x de y disponíveis nos próximos 30 dias" |
| `banco.html:747–765` | ao acabar a amostra: "No Pro não há amostra: o acervo é liberado por inteiro"; "Essas questões existem — e ficam no Pro" |
| `questoes.html:695` | "(questões por IA) durante o beta… Todo o resto continua funcionando" |
| `termos.html:168` | "Nesta fase, o Astral é oferecido gratuitamente. Existe um plano beta, concedido manualmente a testadores convidados" |

### Conta, dados e legal

| Onde | O que promete |
|---|---|
| `conta.html` | "É tudo o que o Astral guarda sobre você"; "Sair de todos os aparelhos… derruba o acesso em todos"; "Baixar meus dados: um arquivo com tudo — cadastro, edital, matérias, XP, conquistas, histórico do cronômetro e eventos"; "Excluir minha conta: definitiva" |
| `privacidade.html` | fase de pré-lançamento, operado por pessoa física; finalidades (inclui "organizar a lista de beta testers") |
| `termos.html:192` | "o Astral está em fase beta e é operado por uma pessoa só… use 'Baixar meus dados'" |

### E-mails

| E-mail | Para quem | Estado |
|---|---|---|
| Lead novo na lista de espera | **o dono** | Resend, remetente `onboarding@resend.dev` |
| Confirmação de cadastro, "esqueci a senha" | o aluno | modelos padrão do Supabase Auth; o SMTP padrão **só entrega à organização** — para o aluno, não chega |
| Avisos, lembretes, resumos | — | **não existem** |

---

## 8. Seção 15 — antes de declarar a Fase 1 concluída

| Pergunta | Resposta honesta |
|---|---|
| Percorri todos os itens da checklist da seção 3? | Sim, os 7: páginas, banco, funções, externos, números, recompensas, promessas |
| Cada item tem evidência? | Banco: lido da produção hoje. Páginas, números, recompensas e promessas: lidos do código, com arquivo e, nas promessas da página inicial, linha. As linhas marcadas "~" são aproximadas (o bloco de texto, não a linha exata) |
| Testei com dados ou só li o código? | **Só li** — a Fase 1 é inventário. Os números de linha das tabelas são contagem exata; o resto é leitura de código |
| Alguma tela, tabela ou função que não abri? | Não abri por dentro: `estilo.html` (página interna), `questoes.html` (desligada), os modelos de e-mail do Supabase Auth (não ficam no repositório) e os textos completos de `termos.html` e `privacidade.html` — **só as frases citadas**. As **descrições de cada uma das 74 condecorações, 33 divisas e 12 especializações** são promessas também; estão no `catalogo.js` e no banco, e não foram copiadas para cá — entram na Fase 3/4 |
| Se o Lucas achar amanhã um problema desta área que eu não registrei, qual seria o motivo? | Provavelmente um **número montado em texto** que meu extrator não reconheceu como número (ex.: frases da ficha que vêm prontas do servidor), ou uma **promessa em `title`/`aria-label`/toast** — procurei no texto visível e nas interpolações, não em todo atributo |

**Já anotado para as próximas fases (só registro, sem julgar):** a aba do navegador da página Conquistas diz
"Missões"; `meu_dominio` existe e ninguém chama; `progresso.badges` ainda é gravado e não é mais mostrado;
a página inicial cita "data da prova" na rotina, "subtópicos", "lembretes inteligentes", "badges",
"cancelar na sua conta" e "acesso gratuito e vitalício".
