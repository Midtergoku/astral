# ASTRAL — Contexto do Projeto

> Arquivo vivo. Atualizar ao fim de cada bloco de trabalho relevante.
> Última atualização: 29/07/2026 — auditoria inicial do código.

---

## 1. O produto

**Astral** — "Transforme seu edital em um plano de aprovação em poucos minutos"

Usuário sobe o PDF do edital → IA extrai matérias, pesos e data da prova → gera cronograma
personalizado com gamificação militar (patentes, XP, badges), questões geradas por IA e
indicação de recursos de estudo.

- **Nicho:** concurseiros de carreira militar (Bombeiros, Marinha, Exército, Aeronáutica, PM)
- **Preço anunciado na landing:** R$ 37/mês (plano Pro, pós-lançamento)
- **Fase atual:** beta fechado — lista de espera + promoção manual para `beta` no Supabase
- **Produção:** https://astral-psi.vercel.app

---

## 2. Stack

| Camada | Ferramenta | Observação |
|---|---|---|
| Frontend | HTML + CSS + JS vanilla, sem build | 13 páginas, tudo inline |
| Hospedagem | Vercel | astral-psi.vercel.app |
| Banco + Auth | Supabase (sa-east-1) | ref `jjogmcacbdefwiwcyjxp` |
| Backend | Supabase Edge Functions (Deno) | 4 funções |
| IA | Anthropic API | modelo hardcoded `claude-sonnet-4-6` |
| Email | Resend | domínio de teste `onboarding@resend.dev` |
| Libs CDN | `@supabase/supabase-js` (+esm), `motion@10.16.4` | sem lock de versão |

**Ambiente local:** Node v24.16.0, Supabase CLI 2.106.0, git 2.55.0 (PortableGit).

> **Nota sobre o git:** o instalador oficial exige UAC/administrador e o ambiente do Claude Code
> não consegue elevar. Foi instalado o **PortableGit** em
> `%LOCALAPPDATA%\Programs\PortableGit`, já adicionado ao PATH do usuário. Funciona igual ao git
> normal. Se um dia quiser a instalação oficial, rode `winget install Git.Git` num terminal
> aberto como administrador — pode desinstalar a versão portátil depois.

---

## 3. Mapa de arquivos

```
ASTRAL/
├── index.html          1154 linhas  Landing page (hero, features, pricing, FAQ)
├── cadastro.html        538         Lista de espera (beta testers)
├── criar-conta.html     448         Signup (email/senha + Google OAuth)
├── login.html           374         Login
├── dashboard.html      1454         Núcleo: upload edital, XP, cronograma do dia
├── progresso.html       794         Progresso por matéria + modal rebalanceamento
├── conquistas.html      854         Badges + habilidades ocultas
├── edital.html          772         Gerenciar edital carregado (re-upload)
├── calendario.html      829         Eventos e datas importantes
├── recursos.html        834         Professores YouTube + materiais (IA + cache 24h)
├── questoes.html       1060         Questões geradas por IA
├── cronometro.html      431         Pomodoro + modo livre
├── privacidade.html     188         Política LGPD
├── CLAUDE.md                        Este arquivo
└── supabase/
    ├── config.toml                  Só declara 2 das 4 funções
    └── functions/
        ├── notificar-cadastro/      Resend → email pro Lucas
        ├── processar-edital/        Claude lê PDF → JSON de matérias
        ├── buscar-recursos/         Claude + web_search → professores/materiais
        └── gerar-questoes/          Claude → questões da banca
```

Não existe pasta `migrations/` — **o schema do banco só existe na nuvem**, não versionado.

---

## 4. Banco de dados (Supabase)

### `lista_espera`
`id UUID PK | nome TEXT | email TEXT UNIQUE | concurso TEXT | whatsapp TEXT | criado_em TIMESTAMP`
RLS: INSERT público (anon).

### `perfis`
`id UUID → auth.users(id) | nome TEXT | email TEXT | tipo_plano TEXT DEFAULT 'free' | criado_em TIMESTAMP`
RLS: cada usuário só lê/edita o próprio. Trigger cria o perfil no signup.

**É só isso.** Nenhuma tabela guarda XP, matérias, cronograma, sessões, questões ou eventos.

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

## 6. Gamificação

- **Patentes dinâmicas** por tipo de concurso, detectado por palavra-chave no nome do edital
  (`detectarTipoConcurso()` em [dashboard.html:1030](dashboard.html#L1030)).
  Tabelas: bombeiros, marinha, aeronautica, exercito, pm, default — 11 níveis cada, 0 → 35.000 XP.
- **XP:** sessão marcada = `peso × 5` | cronômetro = 2 XP/min | questão certa = 15 XP
- **Badges:** primeiro_dia, primeira_hora, sequencia_3, sequencia_7, nivel_3, nivel_5,
  primeiro_edital, maratonista
- **Habilidades ocultas:** desbloqueiam com domínio ≥ 70% na matéria
  (ex.: Português → "Orador de Guerra"). Degradam: 7d sem estudar = enferrujada, 14d = suspensa.
- Confete + banner de level up já implementados no dashboard.

---

## 7. Design system

- **Paleta:** bg `#0A0A0F` · surface `#13131A` · purple `#7C5CFC` · purple-lt `#A78BFA`
  · gold `#F5C542` · green `#34D399`
- **Fontes:** Space Grotesk (títulos) + Inter (corpo)
- **Estilo:** dark mode, minimalista, SaaS premium. Glow nos cards ao hover.
- **Sidebar:** fixa 240px, borda roxa no topo, indicador lateral no link ativo
- **Transição de página:** classe `.saindo` no body, 230ms, em cada `<a>` interno

---

## 8. Diagnóstico técnico (auditoria de 29/07/2026)

### 🔴 Bloqueadores de monetização

1. **`tipo_plano` é puramente cosmético.** Aparece só como texto do badge na topbar
   ([dashboard.html:1176](dashboard.html#L1176), [progresso.html:655](progresso.html#L655),
   [conquistas.html:768](conquistas.html#L768), [edital.html:581](edital.html#L581)).
   Nenhum `if` bloqueia nada. Usuário `free` tem exatamente o mesmo produto que `pro`.
   **Sem isso, não existe o que vender.**

2. **Sem persistência no banco.** Ver seção 5. Um SaaS de R$37/mês que perde o progresso do
   usuário ao trocar de aparelho não sustenta assinatura recorrente.

### 🔴 Risco de custo e segurança

3. **Edge functions abertas.** As chamadas mandam a *publishable key* no header
   `Authorization`, nunca o `session.access_token` do usuário
   ([dashboard.html:1484](dashboard.html#L1484), [edital.html:746](edital.html#L746),
   [questoes.html:954](questoes.html#L954), [recursos.html:794](recursos.html#L794)).
   `config.toml` ainda declara `verify_jwt = false` para `processar-edital`.
   Qualquer pessoa que veja o código-fonte pode chamar a IA em loop e queimar os créditos
   Anthropic. Não há rate limit, quota por usuário nem log de quem chamou.

4. **`config.toml` incompleto** — só declara `notificar-cadastro` e `processar-edital`.
   `buscar-recursos` e `gerar-questoes` não estão versionados na config.

5. ~~**Sem versionamento local.**~~ ✅ **Resolvido em 29/07/2026.** Ver seção 8.1.

### 🟡 Dívida técnica

6. **~153 KB de CSS duplicado** entre as 13 páginas (index 22 KB, questoes 18 KB,
   dashboard 18 KB…). Mudar uma cor = editar 13 arquivos.
7. **`TABELAS_NIVEIS`, `BADGES_DEF`, `detectarTipoConcurso()`, sidebar e header** repetidos
   em 4+ arquivos. Já divergem entre si.
8. **Parsing frágil da IA** — `JSON.parse` direto na resposta, sem retry nem validação de
   schema. Uma resposta fora do formato quebra a tela.
9. **Erros expostos como `alert()`** ([dashboard.html:1534](dashboard.html#L1534)) enquanto
   o resto do app usa toast.
10. **Double-parse desnecessário** em `processarEdital` — a edge function já devolve objeto,
    o front faz `JSON.stringify` e depois `JSON.parse` de novo
    ([dashboard.html:1490-1495](dashboard.html#L1490-L1495)).
11. **Modelo hardcoded** `claude-sonnet-4-6` nas 3 funções de IA.
12. **Resend em domínio de teste** — só envia pro e-mail do dono. Nenhum e-mail transacional
    (boas-vindas, retenção, recuperação de senha customizada) chega no usuário.
13. **LGPD incompleta** — política existe, mas não há exportação nem exclusão de dados.
    Obrigatório antes de cobrar.

### ✅ O que está bom

- Design consistente e bem acabado; o produto **parece** premium.
- Gamificação com identidade real (patentes militares por força) — é o diferencial defensável.
- Fluxo de auth funcionando (email/senha + Google OAuth).
- Landing com narrativa, pricing e CTA de lista de espera já validando demanda.
- Edge functions com prompts bem construídos e específicos do nicho.

---

---

## 8.1. Git — estado atual (resolvido em 29/07/2026)

**Situação encontrada:** o repo `github.com/Midtergoku/astral` existia (público, 44 commits,
todos "Add files via upload" — feitos pela interface web). Mas a pasta local **não estava
conectada a ele**: sem `.git`, sem git instalado, sem clone em lugar nenhum da máquina.

Divergências encontradas na comparação arquivo a arquivo:

| | |
|---|---|
| 8 HTMLs diferentes | local já tinha `'free'`, GitHub ainda tinha `'profissional'` |
| Só no GitHub | `README.md` |
| Só no local | **`supabase/` inteira** — as 4 edge functions nunca foram versionadas |

**O que foi feito:** PortableGit instalado, pasta conectada ao remoto preservando os arquivos
locais (`git reset --mixed FETCH_HEAD`), `README.md` restaurado, varredura de segredos feita
(limpa — os alertas eram `max_tokens`, e os `.npmrc` só têm comentários).

Dois commits locais criados, **ainda não enviados**:
- `5845168` — renomeia plano padrão `profissional` → `free` (8 HTMLs)
- `11d4c7d` — versiona edge functions + `.vscode` + `CLAUDE.md`

⚠️ **Vercel faz deploy automático a partir do `main`.** O primeiro `git push` vai publicar a
mudança `profissional` → `free` em produção. Verificar antes se algum usuário no banco ainda
tem `tipo_plano = 'profissional'` — se tiver, o badge dele vai quebrar.

**Fluxo daqui pra frente:** editar local → commit → push → Vercel publica. Nunca mais subir
arquivo pela interface web do GitHub (sobrescreve o histórico local).

---

## 9. Ordem de trabalho proposta

**Fase 0 — Fundação (antes de tocar em feature)**
1. ✅ Instalar git + conectar ao GitHub existente — feito em 29/07/2026
2. Extrair CSS/JS compartilhado para `assets/` (elimina 153 KB de duplicação)
3. Versionar o schema em `supabase/migrations/`

**Fase 1 — Tornar vendável**
4. Migrar estado do localStorage para tabelas no Supabase (com RLS)
5. Autenticar edge functions com JWT do usuário + quota por plano
6. Implementar o gate real de `free` vs `pro`
7. Stripe (ou Mercado Pago — ver seção 10)

**Fase 2 — Lançamento**
8. LGPD: exportar + excluir dados
9. Domínio próprio no Resend + e-mails transacionais
10. Reativar confirmação de e-mail
11. Créditos Anthropic + teste end-to-end do upload de edital

---

## 10. Decisões em aberto

- **Gateway de pagamento:** Stripe (planejado) vs Mercado Pago / Pagar.me. Público brasileiro
  concurseiro usa muito Pix — Stripe só passou a suportar Pix recentemente e a conversão
  costuma ser melhor com gateway nacional. **A decidir.**
- **Onde fica a linha free/pro:** proposta — free processa 1 edital e vê o cronograma;
  pro libera questões por IA, recursos, calendário e histórico. **A validar com o Lucas.**
- **Distribuição e marketing:** Lucas vai trazer o plano. Ainda não definido.

---

## 11. Contas e acessos

- GitHub: `Midtergoku` / repo `astral`
- Vercel: astral-psi.vercel.app
- Supabase: projeto ref `jjogmcacbdefwiwcyjxp` (org `iahjplveolbyvffastxt`)
- Resend / Google Cloud (projeto "Astral") / e-mail: lherdy2003@gmail.com
- Secrets no Supabase: `RESEND_API_KEY`, `ANTHROPIC_API_KEY` (nunca no frontend)

**Regras de segurança inegociáveis:** chave sensível só em Supabase Secrets · RLS em toda
tabela nova · validação no front E no back · nunca armazenar dado de cartão.

---

## 12. Log de sessões

### 29/07/2026 — Auditoria inicial
Primeira sessão com Claude Code. Li o contexto de `astral-contexto.md`, varri as 13 páginas
e as 4 edge functions. Criei este arquivo. Nenhum código alterado ainda.
Achado principal: o produto está visualmente pronto mas **não é vendável** — `tipo_plano` não
bloqueia nada e o progresso do usuário não sai do navegador.

Na sequência, montei o versionamento (seção 8.1): git instalado, pasta conectada ao repo
existente, edge functions finalmente versionadas. Dois commits locais aguardando push.
Nenhuma linha de código de produto foi alterada.
