# Checklist "pronto para lançar" — conferido item por item, com prova

> A seção 8 do `RELATORIO-FINAL.md` manda: *"Todos os itens precisam de prova (teste, consulta ou captura),
> não de 'está feito'."* Esta é a conferência de **10/10/2026, madrugada**, feita sozinho enquanto o Lucas
> dormia. Cada linha diz **como foi provado**; o que não está pronto diz **por quê e de quem depende**.
>
> Consultas à produção: **só leitura** (`node tools/sql.js`). Testes: a bateria inteira de 10/10
> (`node tools/roda-testes.js`, no `astral-dev`), resultado no fim deste arquivo.

## Resumo

| | Itens |
|---|---|
| ✅ provado | **20** |
| ⏳ depende de dinheiro (Lote 5) | **4** — 1º edital lido, pagamento, Vercel Pro, preço igual ao checkout |
| ⏳ depende dele em cena (Lote 4) | **1** — e-mail que chega (senha de app do Gmail) |
| ❓ decisão dele (guardado) | **1** — canal de suporte visível |
| ✅ com ressalva | **2** — ver as notas |

**O que falta é exatamente o que ele mandou deixar por último:** dinheiro (Lote 5) e o que precisa dele em
cena (Lote 4). Fora isso, o produto está pronto pela régua da própria auditoria.

---

## Bloqueadores (S0)

| | Item | Prova |
|---|---|---|
| ✅ | Um banco vazio sobe só com as migrations e fica igual à produção (OPS-01) | `testa-migrations-do-zero` — último teste da bateria, no `astral-dev` |
| ✅ | Backup automático diário há pelo menos 7 dias, e uma restauração provada (OPS-02) | Pasta `ASTRAL-BACKUPS`: cópias em **todos os dias de 01/10 a 10/10** (10 dias seguidos; última às 04h32 de 10/10, `ok: true`, 3.304 linhas). Agendador do Windows ativo (`agenda-backup.ps1 -Ver`). Restauração: `testa-restauracao` na bateria. ⚠️ A **cópia fora do computador** é o 4.3 (precisa da senha dele em 4 lugares) |
| ✅ | Todo cadastro — e-mail e Google — grava aceite com versão (LGL-01) | `testa-consentimento` na bateria. Produção: das 8 contas, **6 sem aceite — todas criadas entre 27/06 e 31/07 e que nunca mais entraram**; o portão pede o aceite na próxima entrada. **Nenhuma conta criada depois do portão (02/10) está sem aceite** |
| ⏳ | Pelo menos 1 edital real lido em produção, com tempo e custo medidos (PRO-01) | Produção: `editais_lidos` = **0**, `uso_ia` = **0**. **Lote 5 (5.1):** espera o crédito da Anthropic (US$ 5). Combinado: **o 1º edital é dele** |
| ✅ | Leitura que falha conta na janela; teto global de gasto de IA (EDI-01, SEG-06) | Roadmap 1.4 (02/10); `testa-trava-creditos` na bateria (os casos pagos rodam só no dev). O **alerta de gasto no painel da Anthropic** é configuração da conta dele — entra junto com o crédito (5.1) |
| ⏳ | Pagamento: webhook com assinatura, idempotente, aprovação/recusa/estorno; cancelar e arrependimento (PAG-01) | **Lote 5 (5.3)** — espera as credenciais do Mercado Pago. A parte que podia vir antes (**3.6**, quem é menor precisa do responsável) está feita |
| ⏳ | Vercel no plano que permite cobrar | **Lote 5** — US$ 20/mês na 1ª cobrança (`valores.md` § 10) |

## Conta e lei

| | Item | Prova |
|---|---|---|
| ⏳ | E-mail de confirmação e "esqueci a senha" **chega** a um endereço de fora; confirmação automática desligada (SEG-02, SEG-03) | **Lote 4 (4.1)** — ele cria a senha de app do Gmail; eu rodo `smtp-configura.ps1 -Aplicar`, provo a entrega, e só então `-ExigirConfirmacao`. O lembrete dispara toda sessão (`lembretes.js`) |
| ✅ | Decisão sobre menores aplicada; Política e Termos dizendo a mesma coisa (LGL-02, LGL-05) | 3.6 (idade mínima 16, responsável para 16–17) + 3.18 (textos em dia, versão 2026-10-09). `testa-consentimento` na bateria |
| ✅ | "Baixar meus dados" com todas as tabelas; excluir a conta sem rastro (LGL-03, LGL-04) | `testa-dados-do-aluno` — **falha se uma tabela nova com `usuario_id` ficar de fora**. Rodado de novo em 10/10 depois da repaginação da Minha conta: passou |
| ✅ | A tabela de erros tem limite por origem (SEG-01) | `testa-limite-erros` na bateria. Produção: `erros_cliente_limite` vazia (ninguém bateu no limite) |

## O que o aluno paga para ter

| | Item | Prova |
|---|---|---|
| ✅ | 0 questões publicadas com símbolo perdido, alternativas repetidas ou figura ausente (BAN-01) | `testa-acervo-limpo` na bateria. Produção: **1.906 questões publicadas** |
| ✅ | O aluno consegue reportar uma questão errada (BAN-02) | `testa-banco-tela` na bateria. Produção: 1 reporte já recebido (o caminho funciona de ponta a ponta) |
| ✅ | O cronômetro mede por relógio e marca o bloco do cronograma; recarregar não perde tempo (CRN-01, NUM-04) | `testa-cronometro-tempo` (relógio simulado: tela bloqueada, recarregar, aba esquecida, pomodoro) + `testa-sessao-cronograma` |
| ✅ | A patente nunca desce, em nenhuma das 6 carreiras (JOR-01) | `testa-escada` (3.13: toda escada chega ao topo com 70.000 XP, ninguém desce) + `testa-plano` |
| ✅ | O aluno consegue corrigir matéria, peso e data do edital (EDI-02) | `testa-corrigir-edital` na bateria |
| ✅ | Toda matéria aparece no cronograma em até N semanas, com qualquer rotina (CRO-01) | `testa-cronograma` + `testa-prova-no-cronograma` (3.14: dia da prova, reta final, matéria que faltou na semana editada) |
| ✅ | Nenhum número falso: carregando mostra "—", erro diz o que houve; Amplitude, domínio e desequilíbrio conferidos (UX-01, NUM-01, NUM-03) | `testa-banco-fora` (banco fora do ar: a tela não mente nem salva o vazio por cima) + `testa-ficha` + `testa-fonte-unica` + `testa-dominio` |
| ✅ | As 74 descrições de condecoração batem com a regra (NUM-02) | `testa-catalogo` + `testa-motor` + `testa-paridade-medalhas` (3.21: servidor e tela calculam o mesmo progresso) |
| ✅ | Trocar de edital atualiza a prova no calendário e no painel (CAL-01) | `testa-calendario` + `testa-transferencia` na bateria |

## Promessas e vitrine

| | Item | Prova |
|---|---|---|
| ✅ com ressalva | Toda frase da página inicial existe no produto (PRO-02, PRO-03, PRO-04) | 2.12 tirou as 5 promessas sem entrega (03/10); a do "cronograma pelo tempo até a prova" voltou em 09/10 **porque passou a existir** (3.14, com teste). **Ressalva:** "lembretes" só volta com o 4.2, que depende do e-mail (4.1) — e hoje não está prometido |
| ⏳ | Preço e planos na página inicial iguais aos do checkout | Não há checkout ainda (5.3). Conferir no dia, lado a lado |
| ❓ | Um canal de suporte visível | **Não há.** O único contato é o e-mail dele, dentro dos Termos. **Guardado para ele** (onde-paramos, item 4): qual endereço e onde aparece. Recomendação: "Precisa de ajuda?" em Minha conta e no rodapé |
| ✅ | Descrição, imagem de prévia e ícone (NEG-03) | `testa-vitrine` (no ar) na bateria |
| ✅ | Botões principais com contraste ≥ 4,5:1; campos com 16 px (UX-02, UX-03) | `testa-acessivel` (24 páginas, 375 px) + `testa-lighthouse` — **100 de acessibilidade** em todas as telas medidas em 10/10 |

## Operação

| | Item | Prova |
|---|---|---|
| ✅ | Bateria de testes rodando no `astral-dev`, não na produção (COD-02) | `roda-testes` liga `ASTRAL_DEV=1` sozinho; só `testa-site`, `testa-vitrine`, `testa-lighthouse` e `testa-restauracao` olham o site no ar |
| ✅ com ressalva | `checa-saude` verde; `erros_cliente` sem erro novo nas últimas 24 h | Produção: **0 erros de aluno nas últimas 24 h**. Nos últimos 7 dias, 30 — **todos de um único episódio em 04/10, 02h17–02h35** (o servidor do Supabase fora do ar por minutos). **Ressalva:** o `checa-saude` mostra o alerta do vigia com 20 falhas de `buscar-recursos` — **são dos meus testes de 09/10** (já consertados) e saem da janela de 24 h em 10/10 à tarde |
| ✅ | Contas de teste e simulação: 0 na produção | **Medido depois da bateria: 0 contas de teste.** Antes dela havia **1** (`lighthouse-…@astral-teste.local`, de 09/10) — sobra de uma rodada que a bateria matou pelo tempo. **Consertado na raiz:** o `testa-lighthouse` agora apaga as próprias sobras ao começar (commit `b165751`). A "SIMULAÇÃO — teste do dono" na conta dele é **de propósito**: ele quer ver o produto cheio, e ela é revertida no dia do crédito, antes do 1º edital dele (memória `primeiro-edital-e-do-lucas`) |

---

## Resultado da bateria de 10/10

`node tools/roda-testes.js`, 10/10/2026, das 03h10 às 03h52 (medido pela hora do arquivo de saída): **91 de 92 passaram** — 67 no `astral-dev`,
4 na produção (site, vitrine, Lighthouse, restauração), 21 só de tela. Pulado de propósito: `testa-edital-real`
(gasta crédito de verdade).

| Falha | O que era | Destino |
|---|---|---|
| `testa-lighthouse` — Minhas tags com 95 de acessibilidade | O nome e o "RARA" das divisas verde-oliva saíam no oliva **escuro**: 2,79:1 sobre o cartão (piso 4,5). Defeito desde 19/09, que só apareceu porque a conta de teste ganhou a "Vigília" | **Consertado** (commit `604f96b`) e medido de novo no ar: **100** |

**Depois da bateria, na produção:** contas de teste = **0** (a sobra de 09/10 foi apagada pela varredura nova
na rodada do Lighthouse), contas = 7.
