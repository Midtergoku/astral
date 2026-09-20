---
description: "Paginas do Astral: HTML/CSS/JS inline, escape obrigatorio, design system, persistencia"
paths:
  - "assets/js/**"
  - "assets/css/**"
  - "*.html"
---

# Paginas — regras de frontend e design

> Carrega ao mexer em qualquer pagina, no CSS ou no JS compartilhado.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

## 5. Onde os dados do usuário realmente moram: localStorage

Todo o estado de estudo vive **apenas no navegador**:

| Chave | Conteúdo |
|---|---|
| `astral_dados_${user.id}` | xp, streak, horas, materias[], cronogramaHoje[], edital, badges[] |
| `astral_eventos_${user.id}` | eventos do calendário |
| `astral_crono_${user.id}_${hoje}` | histórico do cronômetro |
| `astral_recursos_${user.id}` | cache de recursos (TTL 24h) |

Consequência: trocar de navegador, limpar cache ou abrir no celular = usuário perde tudo.

---

---

## 7. Design system

> ⚠️ **Reescrito em 15/09/2026, medido no código.** Esta seção descrevia a paleta roxo-sobre-preto
> e as fontes Inter/Space Grotesk — o visual **anterior** ao bloco V1 do design. O registro antigo
> ficou preservado em 7.1, logo abaixo, porque este arquivo carrega sozinho ao mexer em `*.html`
> e eu estava lendo informação errada toda vez que trabalhava no frontend.

**A fonte de verdade é o `:root` de `assets/css/base.css`** — 46 tokens. Nunca redeclarar `:root`
numa página. O que está abaixo é o resumo; o arquivo manda.

### Cor — direção militar/insígnia

| Token | Valor | Papel |
|---|---|---|
| `--breu` | `#0E1620` | fundo — azul-grafite frio, não preto |
| `--casco` | `#17222E` | superfície elevada: cartão, topbar, sidebar |
| `--casco-2` | `#1E2B39` | superfície sobre superfície |
| `--linha` | `#2A3947` | divisória |
| `--papel` | `#E7E4DB` | o edital — branco-osso **frio**, nunca creme |
| `--latao` / `--latao-c` / `--latao-e` | `#C08A2E` `#E0AE55` `#3A2B12` | o metal da insígnia — é a cor de marca |
| `--oliva` / `--oliva-c` | `#5C6B47` `#8CA06B` | a farda — apoio, sucesso, estado neutro |
| `--brasa` / `--brasa-c` | `#B4432E` `#E0705A` | alerta e prazo |
| `--texto` / `--texto-2` / `--texto-3` | `#DDE4EA` `#8FA0AE` `#5F7183` | texto em três níveis |

**Apelidos de compatibilidade, deliberados:** `--bg` `--surface` `--surface2` `--border`
`--purple` `--purple-lt` `--purple-dim` `--gold` `--green` `--red` `--text` `--muted` `--white`
apontam para os tokens acima — `--purple: var(--latao)`. **Não são sobra.** Existem para o CSS
antigo continuar válido. Em código novo, usar o nome militar.

### Tipo

| Token | Valor | Uso |
|---|---|---|
| `--display` | Archivo | título, patente, botão |
| `--corpo` | Source Serif 4 | texto corrido |
| `--dado` | JetBrains Mono | número, prazo, % |

Escala: `--t-xs` .75 · `--t-sm` .875 · `--t-md` 1 · `--t-lg` 1.25 · `--t-xl` 1.75 · `--t-2xl` 2.5rem

### Espaço e forma

Espaçamento: `--e1` .25 · `--e2` .5 · `--e3` 1 · `--e4` 1.5 · `--e5` 2.5 · `--e6` 4rem
Raio: **só dois** — `--r-p` 3px (botão, campo, chip) · `--r-g` 6px (cartão, painel, modal)

### Movimento — token de fundação, não acabamento

Curvas: `--saida` · `--percurso` · `--gaveta`
Durações: `--d-toque` 140 · `--d-dica` 160 · `--d-menu` 200 · `--d-painel` 320 · `--d-fecha` 180ms

Regras da skill `astral-design`: nunca `ease-in` · nada acima de 300ms · sair mais rápido que
entrar · nada nasce de `scale(0)` · só `transform` e `opacity` · **nunca `transition: all`** ·
hover atrás de `@media (hover:hover)` · `prefers-reduced-motion` respeitado.

### Casca

- **Sidebar:** fixa, `--sidebar-w` 240px (recolhida: 68px). Indicador lateral no link ativo.
- **Transição de página:** classe **`astral-saindo`** no `body` — sai em **260ms**, entra em
  **420ms** (`astral-pg-sai` / `astral-pg-entra` em `base.css`). Durante a saída,
  `pointer-events: none`. Ver `assets/js/transicao.js`, que explica por que não é View Transitions.
- **Hover nos cartões:** `.card`, `.stat-card`, `.materia-card`, `.habilidade-card`,
  `.recurso-card` — atrás de `@media (hover:hover)`.

### 🔴 O buraco conhecido: os tokens existem, as páginas não os usam

Medido nos 19 HTMLs. A coluna "16/09" mostra o que os itens 6 e 7 da auditoria fecharam:

| | Declarado | 15/09 | **16/09** |
|---|---|---|---|
| Cor | 15 tokens | 144 valores literais, 0 via `var()` | **232 usos derivam do token** |
| `font-size` | 6 tokens | 63 valores, 15 usos de token | **57 valores, 101 usos de token** |
| `border-radius` | 2 tokens | 19 valores, 38 usos | igual — **é o que falta** |
| `transition` | 8 tokens | 62 valores, **0** com token, 14 `all` | **33 com token, 0 `all`** |

**Ao escrever CSS novo, usar token.** O resto da migração é trabalho do bloco V2.

#### Cor com transparência: `color-mix`, e por que é seguro

Onde havia `rgba(192,138,46,0.12)` agora há
`color-mix(in srgb, var(--latao) 12%, transparent)`. Assim mudar `--latao` muda de verdade as
232 ocorrências, inclusive as translúcidas — antes elas ficavam para trás.

Três coisas foram **medidas** antes de adotar, não supostas:

1. **Pinta igual?** 32 combinações de cor × transparência comparadas **pixel a pixel**:
   32 idênticas, 0 diferentes. A comparação por *texto* daria falso alarme — `color-mix`
   serializa como `color(srgb …)` e, dentro de `box-shadow`, como `oklab(…)`. **A serialização
   muda; a tinta não.**
2. **Exige navegador mais novo?** Não. O projeto já usa `text-wrap: balance` (Chrome 114) e
   `:has()` — os dois **mais recentes** que `color-mix` (Chrome 111). Nenhuma exigência nova.
3. **O padrão já era do projeto:** o `estilo.html` do V1 já usava `color-mix` desde 02/08.

Os blocos `:root` foram **pulados de propósito**: lá o hex é a *definição* do token, não uso.

#### ⚠️ Não dá para testar regressão visual por print neste site

Descoberto em 16/09 tentando provar o item 8: rodei a comparação de screenshot com a
**mesma versão dos dois lados** — o controle — e deu **10 páginas com diferença, delta até 76**.
O site **renderiza de forma não determinística**: duas cargas do mesmo código produzem pixels
diferentes. O ruído é do tamanho do sinal, então print-contra-print não prova nada aqui.

Suspeito principal, **não confirmado**: `dashboard.html` tem
`${Math.random() > 0.5 ? '50%' : '2px'}` num `border-radius` — mas o controle acusou diferença
em páginas que não têm isso, então há mais coisa.

**O que funciona no lugar:** comparar a **cor calculada de cada elemento**, normalizada para
bytes RGBA por um canvas. Determinístico. Foi assim que o item 8 se provou: 3.262 elementos,
3.256 idênticos, e os 6 restantes — todos o mesmo `box-shadow` — provados idênticos por
comparação direta de pixel daquela declaração isolada.

#### ⚠️ Por que a escala tipográfica NÃO foi migrada inteira — leia antes de tentar

Em 16/09 migrei só os **49 `font-size` exatamente iguais** ao valor de um token. Mudança de
pixel: **zero, provada** — 3.262 elementos comparados nas 19 páginas entre a versão anterior e
a nova, todos idênticos.

O resto **não pode ser migrado mecanicamente**, e a armadilha é contraintuitiva:

> `0.8rem` (12,8px) e `0.82rem` (13,12px) estão hoje a **0,3px** um do outro — indistinguíveis.
> Cada um cai perto de um token **diferente** (`--t-xs` 12px e `--t-sm` 14px). Encaixar os dois
> "no token mais próximo" os afastaria para **2px** — eu criaria uma diferença visível onde não
> existia nenhuma.

Contagem que sustenta a decisão: dos 354 usos numéricos, **278 ficam a ≤1px de algum token** e
**76 ficam a mais de 1px**. Os 76 são escolha de design de verdade (1,4rem · 1,5rem · 2rem ·
3,2rem do cronômetro) — encaixá-los na escala muda a cara do produto.

**Conclusão:** unificar a escala é decisão de design, tela por tela, não busca e substitui.
É trabalho do V2, com o `estilo.html` aberto do lado.

---

## 7.1. Registro histórico — o design system ANTES do V1 (até 01/08/2026)

Preservado porque a regra 3 manda acrescentar, não sobrescrever, e porque HTML antigo ainda
pode citar estes valores:

- **Paleta:** bg `#0A0A0F` · surface `#13131A` · purple `#7C5CFC` · purple-lt `#A78BFA`
  · gold `#F5C542` · green `#34D399`
- **Fontes:** Space Grotesk (títulos) + Inter (corpo)
- **Estilo:** dark mode, minimalista, SaaS premium. Glow nos cards ao hover.
- **Sidebar:** fixa 240px, borda **roxa** no topo, indicador lateral no link ativo
- **Transição de página:** classe `.saindo` no body, 230ms, em cada `<a>` interno

**Por que saiu:** medido em 31/07, o roxo `#7C5CFC` sobre quase-preto `#0A0A0F` é *a* paleta
canônica de SaaS gerado por IA, e Inter é a fonte mais associada a isso. O site não era feio —
era **genérico**, e genérico é o que "cara de IA" significa. Ver skill `astral-design` 9.1.

✅ **Resíduo corrigido em 15/09/2026.** `assets/css/app.css` ainda pedia `'Inter'` no `body` e
`'Space Grotesk'` em `.sidebar-logo` e `.user-avatar`. Como **app.css carrega depois de
base.css**, essas linhas venciam a cascata — e como nenhuma das duas fontes é carregada desde o
V1, **as 11 páginas da área logada renderizavam na sans-serif genérica do sistema**.

Medido com navegador antes e depois:

| | Antes | Depois |
|---|---|---|
| `body` em `dashboard`/`conta` | `Inter, sans-serif` | `"Source Serif 4", Georgia, serif` |
| `.sidebar-logo` | `"Space Grotesk", sans-serif` | `Archivo, "Arial Narrow", Arial` |
| `index.html` (não carrega app.css) | já estava certo | inalterado |

**Lição, e é a mesma do `.user-name` mais abaixo:** `app.css` é o último a carregar nas páginas
do app, então qualquer propriedade declarada ali **vence o `base.css` em silêncio**. Não
redeclarar cor, fonte ou raio neste arquivo — quem manda é o `base.css`.

---

---

## 8.5. Bloco A — extração da casca compartilhada (29/07/2026)

```
assets/
├── css/app.css        27 regras comuns as 8 paginas do app
└── js/transicao.js    transicao de pagina, era identica nos 8
tools/
└── valida-css.js      verificador de equivalencia
```

**Critério usado.** Uma regra só foi extraída se o seletor aparece **exatamente uma vez**
em cada uma das 8 páginas e as 8 versões são semanticamente idênticas. A exigência de
ocorrência única não é preciosismo: 5 páginas declaram o mesmo seletor duas vezes (definição
+ ajuste posterior), e um critério mais frouxo teria dado a `recursos` e `questoes` um `.card`
com fundo e borda que elas nunca tiveram. O verificador pegou isso antes de aplicar.

**O que ficou inline de propósito.** 35 seletores divergem de verdade entre páginas —
`.topbar` (4 versões), `:root` (3), `.section-title` (2), `.materia-*` (3). Não é sujeira:
o resumo compacto do dashboard usa fonte menor que a lista completa do progresso. Unificar
seria decisão de design, não refatoração — fica para a Etapa 3.

**Como verificar depois de qualquer mexida em CSS:**

```bash
node tools/valida-css.js            # disco x HEAD
node tools/valida-css.js HEAD~3     # disco x um ponto anterior
node tools/valida-css.js 9430894~1  # disco x antes do Bloco A
```

Compara o CSS resolvido de cada página — seletor por seletor, propriedade por propriedade —
contra o ref indicado. Serve para provar que uma refatoração não mudou nada.

> ⚠️ **Duas armadilhas já corrigidas nele.** Se for reescrever algo parecido, herde as duas:
> 1. At-rules (`@keyframes`, `@media`) devem ser comparadas por **nome/query**, nunca por
>    posição — extrair move as compartilhadas para o topo e uma comparação posicional acusa
>    falso positivo nas 8 páginas.
> 2. O lado "antes" precisa ler o `app.css` **do mesmo ref**, não do disco. Sem isso, a
>    verificação passa antes do commit e falha logo depois, porque o `HEAD` já contém o
>    HTML extraído mas o `app.css` do disco entra só de um lado.

**Resultado:** 29 KB de duplicação eliminados, CSS resolvido idêntico nas 8 páginas.

---

---

## 8.8. Bloco B3 — frontend blindado (30/07/2026) ✅

### `assets/js/astral.js` — núcleo compartilhado das 11 páginas

Reúne o que estava duplicado (cliente Supabase, guarda de sessão, logout) e acrescenta o que
não existia: `esc()`, `att()`, `escJs()`, `urlSegura()`, `toast()` e `chamarIA()`.

**A versão do `supabase-js` está travada em 2.111.0**, num lugar só. Antes eram 11 arquivos
importando `/+esm` sem pin — o jsdelivr entregava sempre a última versão, então um major novo
derrubaria o app sozinho, de madrugada.

### O que mudou

| | Antes | Depois |
|---|---|---|
| Header das 4 chamadas de IA | publishable key | `access_token` do usuário |
| `q.enunciado`, alternativas, explicação | `innerHTML` cru | `esc()` |
| Nome de matéria, nome/obs de evento | `innerHTML` cru | `esc()` |
| `href="${url}"` da IA | aceitava `javascript:` | `urlSegura()` — só http/https |
| `onclick="responder(0,'${alt}')"` | escapava só `'` | removido: `data-indice` + listener |
| `onclick="selecionarMateria('${m.nome}')"` | idem | removido: `data-indice` + listener |
| Headers HTTP | nenhum | `vercel.json` com CSP, HSTS, nosniff, frame-ancestors |
| PDF | sem limite no cliente | 10 MB, igual ao servidor |
| `processarEdital` | `stringify` + `parse` do que já era objeto | direto |
| `alert(err.message)` | vazava erro da API | `toast()` |

### Sobre a CSP: por que `script-src` tem `'unsafe-inline'`

O projeto não tem build, e há JavaScript inline em todas as páginas. Sem hash ou nonce — que
exigiriam etapa de build — `'unsafe-inline'` é obrigatório, senão nada roda. A CSP ainda vale
muito pelo resto: `connect-src` limita para onde um script conseguiria enviar dados roubados,
`frame-ancestors 'none'` mata clickjacking, `object-src 'none'` e `base-uri 'none'` fecham
vetores clássicos. **A defesa contra XSS aqui é o `esc()`, não a CSP** — a CSP é a segunda
barreira, e incompleta.

### Verificações automatizadas

```bash
node tools/valida-css.js     # CSS resolvido identico ao original
```

Na sessão também rodaram, a partir do scratchpad: checagem de sintaxe dos 22 blocos `<script>`
(`node --check`) e conferência de que cada página importa todos os símbolos que usa. Vale
recriar esses dois se for mexer em muitos arquivos de uma vez.

### Fica para o Bloco D

10 `alert()` de validação de formulário em `cadastro`, `calendario`, `login` e `progresso`.
Não converti porque `login` e `cadastro` **não têm CSS de toast** — trocar agora deixaria o
erro invisível, que é pior que um alert feio. O D leva o CSS junto.

---

---

## 8.11. Bloco D — acabamento (30/07/2026) ✅

### 🔴 O achado que valeu o bloco: o app era inusável no celular

As 9 páginas escondem a sidebar com `translateX(-100%)` abaixo de 768px — e **nenhuma tinha
botão para trazê-la de volta**. Na prática, quem abrisse o Astral no telefone ficava preso na
página em que caiu, sem conseguir ir para Questões, Progresso ou qualquer outra.

Para um produto cujo usuário estuda no celular, isso não é detalhe de acabamento: é perda
direta de retenção, e provavelmente explica parte do desuso.

Resolvido em `assets/js/astral.js` com `iniciarMenuMobile()`: botão flutuante, sidebar deslizante,
fundo escurecido, fecha ao clicar fora, no Esc, ou ao navegar. **Uma implementação para as 9
páginas** — no CSS de cada uma teriam sido 9 cópias para divergir depois.

> Detalhe que importa: a regra usa `.sidebar.astral-aberta` (especificidade 0,2,0) para vencer
> o `.sidebar` (0,1,0) que a página esconde, **independente da ordem** em que os estilos entram.
> Injetar CSS de fora e depender de ordem seria frágil.

> 🔴 **17/09/2026 — a correção compartilhada tem um pré-requisito que cada página precisa cumprir,
> e duas não cumpriam.** O botão vive no `astral.js` e serve a todas, mas ele só resolve alguma
> coisa se a página **esconder a barra** com `.sidebar { transform: translateX(-100%) }` na sua
> consulta de 768px. `tags.html` e `cronograma.html` nasceram depois deste bloco, copiadas de
> outra página, e ficaram sem essa linha: a barra é `fixed` e 240px, então num Android de 360px
> ela cobria **240 de 360 — dois terços da tela** — por cima do conteúdo. O botão até aparecia,
> mas "não abria" porque a barra já estava aberta.
>
> **Ao criar página nova com `.sidebar`, as duas linhas abaixo não são opcionais:**
>
> ```css
> @media (max-width: 768px) {
>   .sidebar { transform: translateX(-100%); }
>   .main { margin-left: 0; padding: 1.25rem; }
> }
> ```
>
> Agora há teste: `node tools/testa-celular.js` **mede** se a barra se esconde, em 360/375/390px.
> O texto acima dizia "as 9 páginas" — o número estava certo no dia em que foi escrito e
> envelheceu calado. **Contagem em documentação não substitui verificação.**
>
> 🔴 **20/09/2026 — e o próprio teste caiu na mesma armadilha.** A lista de páginas com barra
> lateral estava **escrita à mão dentro dele**. Criei `habilidades.html`, ela não entrou na lista,
> e o teste deu verde sem nunca ter aberto a página nova. Era a repetição exata do caso de 17/09.
> Agora a lista **se descobre sozinha**, lendo quem declara `class="sidebar"` — passou de 12 nomes
> fixos para **13 páginas encontradas**. **Não escrever contagem nem lista de páginas à mão, nem
> em documento, nem em teste: perguntar aos arquivos.**

### Toast em todo lugar, sem mexer em 13 arquivos

Sobravam 10 `alert()` porque `login`, `cadastro` e `criar-conta` não tinham CSS de toast —
converter sem estilo deixaria o erro invisível, pior que um alert feio.

Agora `toast()` **injeta o próprio CSS como primeiro filho do `<head>`**. A posição é
deliberada: o CSS da página vem depois e, com a mesma especificidade, vence — então as páginas
que já tinham `.toast` próprio ficaram exatamente como estavam, e as que não tinham passaram a
ter. **Zero `alert()` no projeto.**

Acrescentado `role="status"` e `aria-live="polite"`: leitor de tela anuncia sem roubar o foco.

Em `cadastro.html`, os códigos `42501` e `23514` (policy e CHECK do Bloco B1) agora viram
mensagem específica. Antes o usuário via "erro ao salvar" e não fazia ideia do que corrigir.

### Segunda chance na resposta da IA

`comSegundaChance()` em `_shared/comum.ts`: se a resposta vier fora de formato (502), repete
uma vez com instrução reforçada. Modelo é não-determinístico — o que saiu torto costuma sair
certo na repetição.

**Só repete no 502.** Erro de crédito, quota ou rede não melhora repetindo, e gastaria o dobro
à toa. A repetição consome créditos da Anthropic de novo, mas a **quota do usuário conta uma
vez só**: ele não paga pelo erro do modelo.

---

---

## 8.16. Recursos: uma busca, permanente (31/07/2026)

**Antes:** cache no `localStorage` com validade de 24h. Cada vencimento disparava outra busca
na IA da **mesma matéria**, a ~R$ 0,68 por vez. Seis matérias por três meses ≈ **540 buscas,
~R$ 367** de uma informação que quase não muda.

**O argumento do Lucas não foi custo — foi produto:** *"isso a gente vai organizar mais ainda o
conteúdo dele, o estudo dele, ele não vai ter que ficar procurando outros professores sempre"*.
Uma lista estável de professores serve melhor a quem estuda do que uma lista que muda toda
semana. A economia veio de brinde.

### O que mudou

| | Antes | Agora |
|---|---|---|
| Onde mora | `localStorage` do navegador | tabela `recursos_salvos`, na conta |
| Validade | 24 horas | **nenhuma** — é permanente |
| Troca de aparelho | perdia tudo | acompanha a conta |
| Rebusca | automática e invisível | **só a pedido**, com confirmação |

Uma linha por `(usuario_id, materia)`, com `unique` — o upsert substitui em vez de acumular.
O campo `concurso` guarda o edital do momento da busca: se a pessoa trocar de edital, o valor
deixa de bater e a tela sabe que precisa buscar de novo. É a única rebusca automática que
sobrou, e ela é correta.

### Duas decisões de robustez

**Se o upsert falhar, o resultado ainda é mostrado.** Perder a gravação é ruim; negar à pessoa
o que a IA já produziu — e que já foi pago — seria pior. Ela vê um aviso de que pode sumir ao
recarregar.

**O link "Buscar de novo" usa `addEventListener`, não `onclick` inline.** O nome da matéria vem
do edital, que é dado não confiável (ver 8.2, CRÍTICO 1) e não pode ser interpolado dentro de
atributo HTML.

---

---

## 9. Velocidade da troca de página — o que foi medido em 03/08/2026

O Lucas relatou: *"clico em outro menu e ele carrega demoradamente"*. Medido com navegador
real contra a produção, **não estimado**.

### A causa principal não estava no nosso código

`astral.js` importava o supabase-js de `cdn.jsdelivr.net/.../+esm`. O sufixo `+esm` **não
entrega um arquivo** — entrega um que importa outro, que importa outros sete:

```
supabase-js → auth-js · postgrest-js · realtime-js · storage-js
              functions-js · phoenix · iceberg-js · tslib
```

São **9 pedidos encadeados a um servidor de terceiro**, em toda página do app. Medição lado
a lado, mesma máquina, mesma rede:

| | jsdelivr | cópia local |
|---|---|---|
| tempo até o módulo ficar pronto | **2.773ms** | **13ms** |
| pedidos a servidor de fora | 9 | **0** |
| os 6 passos do teste (sessão, consulta ao banco, login recusado, edge function) | passou | passou **igual** |

A cópia local é um arquivo só, gerado com esbuild a partir do pacote oficial: 262 KB no disco,
**71 KB na rede**. Mora em `assets/js/supabase-2.111.0.js`.

**Ganhos que vieram junto, e não eram o objetivo:**
- `cdn.jsdelivr.net` saiu do `script-src` da CSP — uma origem a menos autorizada a executar
  script no nosso domínio.
- Se o jsdelivr sair do ar, o Astral **não morre mais junto**. Antes, morria.

> ⚠️ **Para atualizar a versão do supabase-js:** não editar o arquivo. Gerar outro, com a
> versão nova no nome, e trocar a linha de import do `astral.js`. A versão no nome é o que
> permite o cache eterno.

### A regra de cache — e por que ela é diferente para um arquivo só

`vercel.json` tem duas regras, e a ordem importa (a última vence):

| Alvo | Cache | Por quê |
|---|---|---|
| `/assets/(.*)` | `max-age=0, must-revalidate` | **Não dá para afrouxar.** Um módulo que importa outro (`astral.js` → `estado.js`) pede o vizinho **sem carimbo de versão na URL**. Com cache longo ali, uma correção nunca chegaria — que é exatamente o erro de 01/08 (`historico/erros.md`) |
| `/assets/js/supabase-(.*)` | `max-age=1 ano, immutable` | Exceção legítima: a versão está no **nome**. Versão nova = nome novo = URL nova. Não há como ficar preso no antigo |

O custo da primeira regra foi medido: **~20ms por arquivo, em paralelo, resposta 304**. Não era
o gargalo, e trocá-la por cache longo reintroduziria um erro conhecido em troca de quase nada.

### A busca antecipada (`transicao.js`)

A animação de saída de 260ms é **deliberada** — ele pediu tempo de ver a transição, e está
anotado no CSS. Então ela não foi cortada. O que mudou foi o que acontece durante ela:

**Ao encostar o mouse num link, o navegador já começa a baixar a página.** Entre encostar e
clicar passam uns 200–300ms; nesse intervalo os 24 KB da página já chegaram. A animação deixa
de ser tempo morto e passa a correr junto com o carregamento.

Cada endereço é buscado **uma vez só**. Em conexão 2G ou com economia de dados ligada, não
busca nada — não se gasta o dado da pessoa para adivinhar um clique.

### Armadilha registrada: o verificador acusou código de terceiro

`tools/verifica.js` deu **13 falhas** no supabase-js — todas falso positivo. Em código
minificado, `/=2),a+c>=u?` tem cara de expressão regular, e a checagem de barra invertida
mordeu a isca.

**Consertou-se a regra, não o código** (`ehDeTerceiro()`): as checagens de *estilo* — acento e
barra invertida — pulam código de terceiro. As de *integridade* — sintaxe, carimbo de versão,
import quebrado — **continuam valendo para ele**, porque provam que o arquivo não veio truncado.

> Um verificador que dá alarme falso é pior que nenhum: ensina a ignorar o alarme.
