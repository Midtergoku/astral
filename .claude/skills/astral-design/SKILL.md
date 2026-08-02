---
name: astral-design
description: "Use ao repaginar o visual do Astral, escolher paleta, tipografia, espacamento ou icones, ou ao trabalhar em qualquer bloco V0 a V8 do roadmap de design. Tambem ao decidir se algo parece \"feito por IA\"."
---

# Roadmap do design do Astral

> Skill: carrega em tarefa de design.
>
> Extraido do `CLAUDE.md` em 01/08/2026, na reorganizacao em camadas.
> Nada foi apagado. O arquivo original inteiro esta em `historico/CLAUDE-original-2989.md`.

---

## 9.1. Roadmap do design — Etapa 3 (montado em 31/07/2026)

### Diagnóstico: o que **medidamente** denuncia "feito por IA"

Não é opinião — foi contado no código em 31/07:

| Sinal | Medição | Por que denuncia |
|---|---|---|
| **Roxo `#7C5CFC` sobre quase-preto `#0A0A0F`** | a paleta atual | É *a* paleta canônica de SaaS gerado por IA. Praticamente toda landing gerada nos últimos anos é roxo sobre preto |
| **Inter** no corpo | fonte atual | A fonte mais "padrão de IA" que existe. Space Grotesk é melhor, mas também é escolha de template |
| **118 emojis como ícone** | contados nas 16 páginas | Produto desenhado usa conjunto coerente. Emoji muda de desenho por sistema operacional |
| **8 raios de borda** | 8, 10, 12, 14, 16, 20px, 50%, 999px | Não é sistema, é acúmulo. Produto desenhado tem 2 ou 3 |

> **O site não é feio — é genérico.** E genérico é o que "cara de IA" significa. Isso **não se
> conserta trocando componente**: vem da fundação (paleta, tipo, espaçamento, voz). Por isso o
> roadmap começa por decidir *o que ele deve ser*.

### A direção que eu quero defender no V0

**Militar / insígnia.** O produto **já tem** patentes (Bombeiro 3ª Classe, Cabo, Sargento — ver
seção 6). Isso é um mundo visual pronto: brasões, divisas, estêncil, verde-oliva ou
azul-marinho, textura de tecido, medalha de metal.

Três vantagens de uma vez:
1. **Nenhuma IA gera isso por padrão** — resolve o pedido dele na raiz
2. Combina exatamente com o público (concurseiro de carreira militar)
3. **Resolve de graça a "tag estilo de jogos"** — a tag vira uma *divisa de patente*, não um
   adesivo genérico

Levar 3 direções concretas mesmo assim (paleta em hex, par de fontes, referência real), porque
a escolha é dele. Mas esta é a recomendação.

> 🔄 **MUDANÇA em 01/08/2026: a escolha passou a ser minha.** Ele delegou: *"em relação aos
> skills de design, eu vou deixar na sua mão. Você vai analisar de acordo com o que eu pedi e
> você vai avaliar qual que é melhor, qual que faz mais sentido. Se eu gostar, a gente usa. Se
> eu não gostar, a gente simplesmente muda."*
>
> **O V0 deixa de ser um menu de 3 opções e vira uma decisão defendida.** Continua valendo
> mostrar as alternativas descartadas e *por quê* — ele precisa poder discordar com base em
> algo. O que muda é que eu chego com uma escolha feita, não com uma pergunta.
>
> ⚠️ **O "se eu não gostar, a gente muda" tem custo desigual, e ele precisa saber:** trocar os
> nomes das tags é uma tarde; trocar paleta e tipografia depois de 16 páginas prontas é
> refazer o V1 ao V6. Por isso o `estilo.html` do V1 existe — **é a hora barata de discordar**,
> e eu tenho de dizer isso a ele naquele momento, com essas palavras.

> 🎖️ **Confirmação independente, em 01/08/2026.** Ao instalar as skills que o Lucas pediu
> (0.5), apareceu a `industrial-brutalist-ui` do `taste-skill`: *"military terminal aesthetics,
> rigid grids, extreme type scale contrast, utilitarian color (...) declassified blueprints"*.
> **É esta mesma direção, empacotada por outra pessoa.** Eu a recomendei *antes* de saber que a
> skill existia — dois caminhos independentes chegando ao mesmo lugar. Não prova que está
> certo, mas é o sinal mais forte disponível, e vale dizer isso ao Lucas no V0.

### Os 8 blocos

| Bloco | O quê | Entrega |
|---|---|---|
| **V0** | **Direção** — 3 opções concretas, ele escolhe 1 | documento de 1 página; vira a lei do resto |
| **V1** | **Fundação** — paleta, escala de tipo, espaçamento, raios, sombras | `estilo.html` para ele aprovar **antes** de tocar em 16 páginas |
| **V2** | **Casca compartilhada** — sidebar, topbar, cartões, botões, campos | `app.css` reescrito; decide os 35 seletores que hoje divergem (8.5) |
| **V3** | **118 emojis → conjunto de ícones** | maior efeito visual por linha de código do roadmap |
| **V4** | **Landing** — hierarquia de verdade e narrativa do nicho | `index.html` |
| **V5** | **Telas de entrada** — login, criar conta, lista de espera | primeira impressão de quem vem do WhatsApp |
| **V6** | **Telas do app, uma a uma** — **Minha conta primeiro** | ele apontou que é a mais atrasada |
| **V7** | **Gamificação** — tag, quests, ranking pessoal | **destrinchado em 9.2** |
| ~~**V8**~~ | ~~Movimento e celular~~ | ⬆️ **movimento subiu para o V1 em 02/08** — ver abaixo. Sobra o celular |

### 🔄 O movimento saiu do V8 e entrou no V1 (02/08/2026)

Pedido do Lucas ao aprovar o V0: *"quero que o site seja fluido (...) os botões com animaçãozinha
leve, se clicar e abrir uma aba, que ela desça, que seja bonita, que seja fluida os motions dela"*.

**Eu tinha colocado movimento no último bloco, e isso estava errado.** Duração e curva de
animação são **token de fundação**, igual a cor e tipo — não acabamento. Construir V1..V6 sem
elas e retrofitar depois é o retrabalho exato que eu avisei que sairia caro.

**Os tokens que ficaram (fonte: skill `emil-design-eng`):**

```
--saida:    cubic-bezier(.23, 1, .32, 1)     entra/sai
--percurso: cubic-bezier(.77, 0, .175, 1)    move na tela
--gaveta:   cubic-bezier(.32, .72, 0, 1)     gaveta estilo iOS

--d-toque 140ms · --d-dica 160ms · --d-menu 200ms · --d-painel 320ms · --d-fecha 180ms
```

**As 7 regras que valem para todo o resto do roadmap:**
1. **Nunca `ease-in`** em UI — começa devagar e faz parecer travado no instante em que a pessoa olha
2. **Nada acima de 300ms** em interface; sair sempre mais rápido que entrar
3. **Nada nasce de `scale(0)`** — entra de `.95`/`.96` com opacidade
4. **Só `transform` e `opacity`** — as duas que a GPU faz sozinha
5. **Nunca `transition: all`** — propriedade a propriedade
6. **Hover atrás de `@media (hover:hover) and (pointer:fine)`** — no celular o toque gruda o estado
7. **`prefers-reduced-motion` respeitado** — reduzido não é zero: cor fica, deslocamento sai

> ⚠️ **Ação de teclado não ganha animação.** Emil é categórico: o que se repete centenas de
> vezes por dia deve ser instantâneo.

> 🔌 **Decisão técnica junto:** o site animava com a biblioteca `motion@10.16.4` vinda de CDN.
> Animação de entrada é previsível, então vira **CSS puro** — roda fora da thread principal (não
> perde quadro quando a página está carregando) **e some uma dependência de CDN**, que a
> auditoria já tinha marcado como superfície de supply chain. Ganho duplo.

### Ordem sugerida de execução

`V0 → V1 → V3 → V2 → V4 → V5 → V6 → V7 → V8`

**V3 sobe para o 3º lugar** de propósito: trocar emoji por ícone é rápido, independente do
resto, e o site já muda de cara antes de eu tocar no layout.

### Avisos que valem mais que o roadmap

> 🔴 **Ranking é PESSOAL, não entre usuários.** Ele disse "ranking pessoal" em 30/07. Ranking
> público desmotiva quem está atrás e a base é pequena demais para fazer sentido. Confirmar
> antes de qualquer coisa comparativa.

> 🔴 **Se o ranking der prêmio, desconto ou vantagem, o XP precisa ser validado no servidor
> ANTES.** Hoje qualquer um abre o console e escreve o XP que quiser (8.19). Enquanto for "você
> contra você", é inofensivo. No instante em que valer algo, deixa de ser.

> ✅ **A "tag em estilo de jogos" foi DEFINIDA em 01/08/2026 — ver 9.2.** Ele explicou: vai no
> lugar do badge de plano, na topbar, e diz a especialidade dele conforme a matéria
> (*"um mago, um piromante, um necromante, essas coisas assim"*). Descoberta ao registrar:
> **o sistema já existe no código**, com 51 nomes, escondido em `conquistas.html` atrás de 70%
> de domínio. Minha hipótese anterior (divisa de patente) estava só meio certa — a divisa é a
> *forma*, a especialidade é o *conteúdo*.

### O que muda no `valida-css.js` durante esta etapa

A ferramenta existe para **provar que o CSS não mudou** — foi o que garantiu que as
refatorações não quebravam nada. Durante a repaginada ela vai acusar diferença em tudo, porque
a diferença é o objetivo.

**Trocar o papel dela:** em vez de "provar que nada mudou", passa a **listar o que mudou**, para
eu conferir que mudou só o pretendido. Adaptar no começo do V1.

---
