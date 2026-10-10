# A lista dos vídeos — o que o Astral já tem e o que falta (10/10/2026)

> Ele juntou o que vários vídeos (Instagram, TikTok) dizem que um site precisa antes de lançar e pediu: *"o que nós já
> tivermos feito, marca como feito; o que não tivermos, acrescenta para fazer (...) o que é importante mesmo, o que não é
> importante por agora."* Itens repetidos entre vídeos foram juntados. **Cada "feito" foi conferido em 10/10 no código, no
> banco ou no site no ar** — não de memória. O bloco "erros mais comuns de segurança" dele é lista do que NÃO pode
> acontecer: ali, ✅ quer dizer "estamos protegidos".
>
> Stack, para ler os itens certos: o Astral **não tem servidor próprio nem Next.js** — são páginas estáticas na Vercel +
> Supabase (banco com RLS e funções). Alguns itens dos vídeos são de outra arquitetura; estão marcados como "não se aplica",
> com o equivalente que temos.

## ✅ JÁ FEITO — com a prova

### Segredos e chaves
| Item dos vídeos | Como está | Prova |
|---|---|---|
| Variáveis de ambiente fora do código · `.env` nunca no repositório · secrets fora do código · esconder API keys · "nada com next_public" | Chave secreta só nos Secrets do Supabase; o site só tem a chave **pública** (feita para ficar no navegador, protegida pela RLS) | `.env` no `.gitignore`, nenhum versionado; `verifica.js` recusa commit com segredo (regra "SEGREDO prestes a ser publicado") |
| Limpar secrets do git | **Histórico inteiro limpo** | busca em todos os commits por `sk-ant-`, `sb_secret_`, chave do Resend: só a própria regra do verificador e o relatório da auditoria citam o formato — nenhuma chave real (10/10) |
| Public key do banco | é a chave pública, de propósito; quem protege é a RLS | — |

### Banco e acesso
| Item | Como está | Prova |
|---|---|---|
| RLS / ativar RLS | **33 de 33 tabelas** com RLS | consulta à produção, 10/10 |
| Controle de acesso · restringir acessos · IDOR/BOLA · não vazar conteúdo do usuário | cada um só lê o seu; telas do dono (painel, importar) barradas **no servidor** | `testa-isolamento`, `testa-painel`; bateria 10/10 |
| Auth server side · rotas protegidas só no front | toda função confere o login no servidor; esconder botão não protege nada | `_shared/comum.ts`; `testa-trapaca` |
| Bloquear mass assignment | escrita por **coluna** liberada (perfis só o nome; progresso por coluna) ou só por função | `.claude/rules/banco.md` 8.6, 8.32 |
| Queries parametrizadas · SQL injection | PostgREST e funções com parâmetros; o único SQL dinâmico usa `format(%I)` com lista fixa | migrations conferidas |
| Validação de inputs (front **e** servidor) · "Bean validation" | regras no banco (`check`) e nas funções; a tela é só conveniência | regra 3 de segurança do CLAUDE.md |
| Senhas em texto puro · hash nas senhas | o Supabase guarda a senha com hash; **nenhuma tabela nossa tem senha** | busca nas 83 migrations |
| Migrations | todo o banco nasce delas; um banco vazio sobe igual à produção | `testa-migrations-do-zero` |
| Regras de negócio | no servidor, num lugar só (`regras_do_plano`) | `testa-fonte-unica` |
| Paginação no backend · N+1 | listas com limite; nenhuma consulta pesada em laço (a única: revisão semanal de links, 12 por vez) | código das funções, 10/10 |
| Idempotência em operação crítica | gravar progresso, marcar assunto, Passei!, entregar simulado: repetir não duplica | testes de cada um; **pagamento entra com isso exigido (5.3)** |

### Login e sessão
| Item | Como está | Prova |
|---|---|---|
| Rate limiting (tentar várias senhas) · bot protection · "Fail2ban" · força bruta | **captcha** no login, cadastro e lista de espera + limites de tentativas do Supabase | `confere-auth.ps1` (captcha ligado); limites lidos da produção |
| Expiração de sessão | acesso de **15 minutos**, renovação com rotação | `jwt_exp 900`, rotação ligada |
| Trocar senha | pede a senha atual; senha com letras e números, 8+ | `confere-auth.ps1` |
| Logs de segurança | troca de plano e eventos críticos ficam registrados | `testa-auditoria` |

### Servidor e rede
| Item | Como está | Prova |
|---|---|---|
| HTTPS · forçar HTTPS · certificado SSL | cadeado válido; `http://` é mandado para `https://` (308) | medido no ar, 10/10 |
| Security headers | CSP, HSTS (2 anos, preload), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | medido no ar, 10/10 |
| CORS configurado | **fechado**: só os endereços do Astral | `_shared/comum.ts` |
| Restringir uploads | só PDF (confere os bytes), até 10 MB | `processar-edital` |
| Trim nas respostas da API · dados sensíveis nas respostas | as funções devolvem só o necessário (o gabarito só sai depois da resposta) | 3.12, `testa-trapaca` |
| Mensagens de erro que vazam dados | erro para o aluno é frase pronta; o detalhe vai para o log | `comum.ts`, 3.14 |
| XSS | todo texto de fora passa por `esc()`; CSP de reserva | `varre-xss` (0 achados, 10/10) |
| Prompt injection | o PDF do edital vai para a IA, mas a IA não tem ferramenta nenhuma e a saída é validada e escapada | `validar()` no `processar-edital` |
| DoS / abuso de requisições | limites por pessoa, teto global diário da IA, limite na tabela de erros; a Vercel e o Supabase seguram o volume | 1.4, 3.5 |
| Scan de dependências | versões **exatas** e conferidas contra falhas conhecidas | `testa-versoes` |

### Operação
| Item | Como está | Prova |
|---|---|---|
| CI/CD | testes a cada envio (GitHub) + publicação automática (Vercel) | `.github/workflows/verifica.yml` |
| Error tracking · monitoramento de alertas | erros dos alunos e do servidor gravados; **vigia de hora em hora manda e-mail** | `erros_cliente`, `falhas_servidor`, `testa-vigia` |
| Backups automáticos | **diário**, há 10 dias seguidos; restauração provada | `testa-restauracao`; ⚠️ a cópia **fora do PC** é o 4.3 |
| Testar formulários | lista de espera, criar conta, entrar, aceite, Passei!, simulado — testados | bateria (97 testes) |

### Lei e textos
| Item | Como está |
|---|---|
| Termos de uso · Política de Privacidade (LGPD) · declarar os dados coletados | em dia (3.18), aceite **gravado** com a versão (1.3), "baixar meus dados" e "excluir conta" completos (2.2) |

### Vitrine, busca e tela
| Item | Como está | Prova |
|---|---|---|
| Favicon · OG image (imagem de prévia) · meta title e description por página | cada página pública com os seus; as internas fora da busca | `testa-vitrine` |
| sitemap.xml · robots.txt | no ar; robots libera as públicas e aponta o sitemap | medido no ar |
| PageSpeed · otimizações de renderização | LCP 1,7–2,1 s em 4G lenta ("bom"); deslocamento 0 | `paginas.md` 18, `testa-pulo` |
| Comprimir imagens | questões em WebP (~27 KB cada) | pasta `img/` |
| Alt text · botões com label · HTML semântico (H1, H2…) · responsividade | Lighthouse **100 de acessibilidade** nas telas medidas; celular testado em 360/375/390 px | `testa-lighthouse`, `testa-acessivel`, `testa-celular` |
| CTA na primeira dobra · FAQ (5 perguntas) · estados de erro nos formulários · página de obrigado (lista de espera) | no ar | página inicial e cadastro |
| Dados no rodapé | Termos, Política e "Precisa de ajuda?" — ⚠️ **identificação de quem vende** entra antes de cobrar (ver 5.3) | — |

## 🔧 A FAZER — o que é importante

| Prioridade | O quê | Por quê | Quem | Custo |
|---|---|---|---|---|
| ✅ **1 — FEITO 10/10** | **E-mail que chega** (senha de app do Gmail) — o 4.1 | ninguém recebe confirmação nem "esqueci a senha"; **e fecha a "enumeração"**: hoje o cadastro diz "Este e-mail já possui uma conta" (`criar-conta.html`, conferido 10/10; o captcha impede fazer isso em massa), o que deixa alguém descobrir quem tem conta — com a confirmação por e-mail ligada, o Supabase para de dizer isso | ele cria a senha; eu configuro | R$ 0 |
| ✅ **2 — FEITO 10/10 (falta ele escanear)** | **Verificação em duas etapas (MFA)** na conta **do dono** | a sua conta abre o painel do negócio e o importador; é a mais valiosa do site. Para alunos, depois | ele escaneia um código com um app autenticador; eu ligo | R$ 0 (TOTP é grátis no Supabase) |
| **3** | **Trava de SSRF no conferidor de links** | o servidor busca links que a IA escreveu; hoje aceita qualquer endereço (inclusive interno). Risco baixo (não devolve a página), conserto pequeno: só `https`, sem IP e sem endereço interno | eu | R$ 0 |
| **4** | **Plano de recuperação escrito** | as ferramentas existem (backup, restauração, banco do zero, religar o vigia e o aviso de lead); falta o **roteiro de uma página**: "o site caiu / o banco sumiu / vazou uma chave — faça isto, nesta ordem". Inclui o rollback (hoje: reverter o commit + migration de volta) | eu | R$ 0 |
| **5** | **Dia das provas** (acervo do Banco) | o Banco é o que dá domínio e simulado; mais provas = mais valor. Precisa de **um roteiro bem feito** para não baixar prova errada, sem gabarito, ou de outro cargo — eu escrevo o guia antes | ele baixa; eu confiro e publico | R$ 0 |
| **6** | **Página 404 própria** | hoje quem erra o endereço cai na página genérica da hospedagem, sem menu nem marca | eu | R$ 0 |
| **7** | **Atualizar a biblioteca do Supabase no site** (2.111) e rodar a bateria | as versões são conferidas contra falha conhecida, mas não se atualizam sozinhas | eu | R$ 0 |

## 🕓 DEPOIS DO DOMÍNIO PRÓPRIO (o endereço muda — fazer uma vez só, já no endereço final)

| O quê | Por quê esperar |
|---|---|
| Google Search Console e **Bing Webmaster**, enviando o sitemap | cadastra-se o **endereço**; cadastrar o `vercel.app` e depois trocar é trabalho dobrado |
| **Dados estruturados (JSON-LD / schema.org)** | ajuda o Google a mostrar o Astral bonito na busca; leva o endereço final |
| **llms.txt** | o "sitemap para IAs"; também leva o endereço final. O `gera-vitrine.js` passa a gerar junto |
| Domínio próprio no seu nome | 💰 ~R$ 40/ano (estimativa a conferir no Registro.br) — Lote 5 |

## 💰 POR ÚLTIMO — o que custa (Lote 5, ordem dele)
1º edital real (US$ 5) · pagamento (Mercado Pago) com **webhook idempotente** e **página de obrigado da compra** · plano da Vercel que permite cobrar (US$ 20/mês) · **identificação de quem vende no rodapé** (nome e CPF ou CNPJ, contato — a lei do comércio eletrônico, Decreto 7.962/2013, pede isso de quem vende online; conferir com o contador/advogado) · domínio.

## 🧹 POR ÚLTIMO DE TUDO — pedido dele
**Limpeza do código**: achar o que foi criado e nunca usado (funções nunca chamadas, imports sobrando, variáveis que nunca mudam, código comentado sem explicação), sugerir a remoção, e montar tarefas e subtarefas de refatoração. Regra do projeto: só sai o que não serve para nada; na dúvida, fica.

## 🚫 NÃO PRECISA AGORA — e por quê

| Item dos vídeos | Por quê não |
|---|---|
| Load balance · Redis | a Vercel e o Supabase já distribuem a carga; com 7 contas, cache próprio seria complexidade sem ganho. Rever com milhares de alunos |
| Google Analytics | já temos o **funil próprio** (de onde veio, até onde chegou — `node tools/funil.js`), sem rastrear ninguém para o Google. O GA pediria aviso de cookies (LGPD). Rever no lançamento pago, se faltar alguma pergunta |
| Blogs com links cruzados | é marketing de conteúdo — faz sentido depois do domínio e do lançamento |
| Cookies httpOnly · "proteger os cookies da sessão" | só existe com servidor próprio montando a página; o Astral guarda a sessão no navegador, como o Supabase faz. A proteção equivalente: CSP, todo texto escapado, sessão de 15 min com rotação |
| Controller separado da service · DTOs · repositories · middlewares · versionamento da API · Swagger | são peças de um **servidor próprio** (Java, Node). Aqui o "back" são funções do banco e 8 funções do Supabase; o papel delas já existe: validação nas funções, `comum.ts` como "middleware" (login, CORS, quota), e a documentação em `.claude/rules/backend.md` e `banco.md` |
| Criptografia de dados sensíveis | não guardamos dado sensível além de e-mail e data de nascimento; o disco do banco é criptografado pelo Supabase (segundo o Supabase — não medido por mim) |

## ❓ Não entendi — ele explica
| Item | Pergunta |
|---|---|
| **PMP** | o vídeo dizia PMP ou outra sigla? (PMP costuma ser a certificação de gerente de projetos — não é coisa de site.) |
