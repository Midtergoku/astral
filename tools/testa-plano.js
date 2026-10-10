/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-PLANO — as regras de produto que o Lucas ditou, viram teste.

   POR QUE EXISTE (04/08/2026)
   Ele descreveu em palavras como o Astral deve decidir o que a pessoa estuda:

     "vê lá quais matérias valem mais ponto, são as que têm mais peso, e
      automaticamente será o que a pessoa irá mais estudar"

     "se ela vai muito bem numa matéria que tem muito mais peso, não tem por
      que ela ajudar tanto mais essa matéria do que uma outra que ela é muito
      ruim"

     "às vezes nem todas as áreas militares vão ser recruta"

   Regra de produto que só existe em palavra se perde na primeira refatoração.
   Aqui cada frase dele virou uma asserção que roda.

   USO
     node tools/testa-plano.js

   Não precisa de navegador, nem de internet, nem de crédito na Anthropic:
   é matemática pura. Sai com código 1 se qualquer regra quebrar.
   ═══════════════════════════════════════════════════════════════════════════ */

const path = require('path');
const url = require('url');

const RAIZ = path.resolve(__dirname, '..');
const casos = [];
const falhas = [];

function conferir(titulo, condicao, detalhe) {
  casos.push({ titulo, ok: !!condicao, detalhe: String(detalhe ?? '') });
  if (!condicao) falhas.push(titulo);
}

(async () => {
  const plano = await import(url.pathToFileURL(path.join(RAIZ, 'assets/js/plano.js')).href);
  const divisa = await import(url.pathToFileURL(path.join(RAIZ, 'assets/js/divisa.js')).href);
  const { necessidadeDe, RESSALVA_PROFESSORES } = plano;
  const { nivelDe } = divisa;

  console.log('TESTA-PLANO — as regras de produto do Lucas\n');

  /* 09/10/2026 (auditoria COD-03, roadmap 3.21): estas secoes conferiam montarCronograma(), que
     saiu -- o painel a calculava e jogava fora logo depois. As MESMAS regras dele agora sao
     conferidas no cronograma DE VERDADE, o que o aluno ve (montarSemana, assets/js/cronograma.js,
     rotina padrao: seg-sab, 2 h, sessoes de 40 min). A regra 3 mudou por decisao dele: a materia
     ja dominada nao some -- fica com pelo menos uma sessao na semana. */
  const { montarSemana } = await import(url.pathToFileURL(path.join(RAIZ, 'assets/js/cronograma.js')).href);
  const semanaDe = (materias) => montarSemana(materias, null, { semana: 0 });
  const totais = (s) => s.flatMap((d) => d.blocos).reduce((o, b) => ({ ...o, [b.materia]: (o[b.materia] || 0) + b.minutos }), {});
  const segunda = (s) => s[1].blocos.map((b) => b.materia);

  /* ── 1. "as que valem mais ponto são as que ela vai mais estudar" ──────── */
  console.log('1. Edital novo, ninguém estudou nada ainda');
  {
    const materias = [
      { nome: 'Português',   peso: 30, progresso: 0 },
      { nome: 'Matemática',  peso: 25, progresso: 0 },
      { nome: 'História',    peso: 20, progresso: 0 },
      { nome: 'Geografia',   peso: 15, progresso: 0 },
      { nome: 'Inglês',      peso: 10, progresso: 0 },
    ];
    const s = semanaDe(materias), tot = totais(s);
    conferir('a mais pesada vem primeiro (1ª sessão da segunda)', segunda(s)[0] === 'Português', segunda(s)[0]);
    conferir('a segunda-feira segue o peso', segunda(s).join(' > ') === 'Português > Matemática > História', segunda(s).join(' > '));
    conferir('quem pesa mais ganha mais tempo na semana', tot['Português'] > tot['História'], tot['Português'] + 'min vs ' + tot['História'] + 'min');
  }

  /* ── 2. A FRASE DELE, ao pé da letra ──────────────────────────────────── */
  console.log('\n2. "vai muito bem na pesada, muito mal na leve"');
  {
    const materias = [
      { nome: 'Português (pesada, já domina)', peso: 30, progresso: 90 },
      { nome: 'Inglês (leve, está zerada)',    peso: 10, progresso: 5  },
      { nome: 'História (meio termo)',         peso: 20, progresso: 50 },
      // 5 materias, como um edital de verdade: com so 3 e 3 sessoes por dia, a regra "nao repete no
      // dia" da uma sessao a cada uma todo dia, e o tempo empata (medido em 09/10: 240 x 240)
      { nome: 'Geografia',                     peso: 15, progresso: 60 },
      { nome: 'Matemática',                    peso: 25, progresso: 80 },
    ];
    const s = semanaDe(materias), tot = totais(s);
    const primeira = segunda(s)[0];
    conferir('a matéria em que ela é ruim passa na frente da pesada dominada',
      primeira.startsWith('História') || primeira.startsWith('Inglês'), primeira);
    const nPort = necessidadeDe(materias[0]);   // 30 x 10  = 300
    const nIng  = necessidadeDe(materias[1]);   // 10 x 95  = 950
    conferir('a conta reflete isso: leve+fraca pede mais que pesada+dominada', nIng > nPort, 'inglês ' + nIng + ' > português ' + nPort);
    const tPort = tot[materias[0].nome] || 0, tIng = tot[materias[1].nome] || 0;
    conferir('e no tempo da semana também', tIng > tPort, tIng + 'min vs ' + tPort + 'min');
  }

  /* ── 3. matéria de peso baixo não pode ser esquecida -- nem a dominada ─── */
  console.log('\n3. O defeito antigo: slice(0,3) escondia as leves');
  {
    const materias = [
      { nome: 'A', peso: 30, progresso: 100 },
      { nome: 'B', peso: 25, progresso: 100 },
      { nome: 'C', peso: 20, progresso: 100 },
      { nome: 'D', peso: 15, progresso: 0   },   // nunca aparecia antes
      { nome: 'E', peso: 10, progresso: 0   },
    ];
    const tot = totais(semanaDe(materias));
    conferir('as zeradas entram mesmo sendo as mais leves', tot.D > 0 && tot.E > 0, JSON.stringify(tot));
    conferir('a dominada fica com o mínimo (não some: sem revisão, o domínio vai embora)',
      tot.A >= 40 && tot.D > tot.A, 'A ' + tot.A + 'min · D ' + tot.D + 'min');
  }

  /* ── 4. bordas: não pode devolver tela vazia ──────────────────────────── */
  console.log('\n4. Bordas');
  {
    const vazia = semanaDe([]);
    conferir('sem matérias, devolve a semana sem sessões, sem estourar',
      vazia.length === 7 && vazia.every((d) => d.blocos.length === 0), 'ok');
    const pronto = totais(semanaDe([{ nome: 'A', peso: 50, progresso: 100 }, { nome: 'B', peso: 50, progresso: 100 }]));
    conferir('com tudo 100%, ainda há sessões (senão parece defeito)', (pronto.A || 0) + (pronto.B || 0) > 0, JSON.stringify(pronto));
    const semPeso = totais(semanaDe([{ nome: 'X' }, { nome: 'Y' }]));
    conferir('matéria sem peso nem progresso não quebra', (semPeso.X || 0) + (semPeso.Y || 0) > 0, 'ok');
    const uma = totais(semanaDe([{ nome: 'Só', peso: 100, progresso: 0 }]));
    conferir('uma matéria só recebe a semana inteira', uma['Só'] === 720, uma['Só'] + 'min (6 dias x 2 h)');
    const blocos = semanaDe([{ nome: 'A', peso: 98, progresso: 0 }, { nome: 'B', peso: 1, progresso: 0 }, { nome: 'C', peso: 1, progresso: 0 }]).flatMap((d) => d.blocos);
    conferir('nenhuma sessão fica curta demais para ser estudo', blocos.length > 0 && blocos.every((b) => b.minutos >= 20), 'mínimo 20min');
  }

  /* ── 5. "nem todas as áreas militares vão ser recruta" ─────────────────── */
  console.log('\n5. A patente vem do edital, lida pela IA');
  {
    const marinha = nivelDe(0, 'Concurso qualquer', 'marinha');
    conferir('Marinha começa em Grumete, não Recruta', marinha.nome === 'Grumete', marinha.nome);

    const pm = nivelDe(0, 'Concurso qualquer', 'pm');
    conferir('PM começa no degrau de quem ainda vai entrar', pm.nome === 'Aluno-Soldado', pm.nome);

    /* 🔴 A RECLAMAÇÃO DO LUCAS, virada em teste:
       "não adianta começar de Grumete e logo em seguida ir pra uma coisa
       nada a ver". A carreira tem de subir, sempre, dentro da força dela. */
    const carreiraMarinha = [];
    for (const x of [0, 500, 1200, 2500, 4500, 7000, 10000, 14000, 19000, 25000, 32000]) {
      carreiraMarinha.push(nivelDe(x, 'x', 'marinha').nome);
    }
    conferir('a carreira da Marinha é naval do começo ao fim',
      carreiraMarinha[0] === 'Grumete' && carreiraMarinha[1] === 'Marinheiro'
      && carreiraMarinha.includes('Suboficial') && carreiraMarinha.includes('Capitão-Tenente'),
      carreiraMarinha.slice(0, 4).join(' > ') + ' … ' + carreiraMarinha[10]);

    conferir('nenhuma patente da Marinha é do Exército',
      !carreiraMarinha.some((p) => /Subtenente|Aspirante a Oficial|Recruta/.test(p)),
      carreiraMarinha.join(' > '));

    conferir('a carreira nunca repete o mesmo posto',
      new Set(carreiraMarinha).size === carreiraMarinha.length, carreiraMarinha.length + ' degraus');

    /* Entrando por um concurso de sargento: sobe DALI, não volta para soldado. */
    const sarg = [];
    for (const x of [0, 500, 1200, 2500, 4500, 7000]) {
      sarg.push(nivelDe(x, 'x', 'exercito', 'Aluno-Sargento').nome);
    }
    conferir('quem entra por concurso de sargento NÃO vira soldado depois',
      !sarg.some((p) => /Soldado|Recruta|Cabo/.test(p)), sarg.join(' > '));
    /* 09/10/2026 (3.13, decisao 14): a escada curta passou a se espalhar ate 70.000 XP -- o 2o
       degrau nao chega mais com 500 XP. O que se confere e a ORDEM dos postos, de 0 ao topo. */
    const ordemSarg = [];
    for (let x = 0; x <= 70000; x += 250) {
      const n = nivelDe(x, 'x', 'exercito', 'Aluno-Sargento').nome;
      if (ordemSarg[ordemSarg.length - 1] !== n) ordemSarg.push(n);
    }
    conferir('e a sequência dele é de sargento para cima',
      ordemSarg[0] === 'Aluno-Sargento' && ordemSarg[1] === '3º Sargento' && ordemSarg[2] === '2º Sargento',
      ordemSarg.slice(0, 4).join(' > '));

    /* Entrando por concurso de oficial. */
    const of = nivelDe(0, 'x', 'exercito', 'Cadete');
    conferir('quem entra por concurso de oficial começa como oficial',
      /Cadete|Aspirante/.test(of.nome), of.nome);
    // 09/10/2026 (3.13): a escada do Cadete agora vai ate 70.000 XP -- no meio do caminho ja e oficial formado
    const of2 = nivelDe(25000, 'x', 'exercito', 'Cadete');
    conferir('e sobe pela carreira de oficial',
      /Tenente|Capitão/.test(of2.nome), of2.nome);

    /* A armadilha que quase me pegou: "Subtenente" não pode virar "2º Tenente". */
    const sub = nivelDe(0, 'x', 'exercito', 'Subtenente');
    conferir('"Subtenente" casa com Subtenente, não com Tenente', sub.nome === 'Subtenente', sub.nome);

    /* Bombeiro do Rio usa nome próprio; a IA manda o do edital. */
    const bm = nivelDe(0, 'x', 'bombeiros', 'Bombeiro Militar de 3ª Classe');
    conferir('patente estadual de bombeiro é aceita como está',
      bm.nome === 'Bombeiro Militar de 3ª Classe', bm.nome);
    const bm2 = nivelDe(1200, 'x', 'bombeiros', 'Bombeiro Militar de 3ª Classe');
    conferir('e a carreira dele segue pela dos bombeiros',
      /BM/.test(bm2.nome), bm2.nome);

    /* 03/10/2026 (auditoria JOR-01, roadmap 2.8): com as patentes que o PROPRIO
       prompt da IA da como exemplo, Bombeiros e PM subiam para "Aluno-Soldado"
       -- a primeira promocao era um rebaixamento, no publico principal. Regra:
       quem entra num posto FORMADO nunca passa por degrau de aluno, e o
       segundo degrau nunca e o mesmo posto com outro nome. */
    const escada = (forca, pat) => {
      const n = [];
      for (const x of [0, 500, 1200, 2000, 3000, 4500]) { const v = nivelDe(x, 'x', forca, pat).nome; if (n.at(-1) !== v) n.push(v); }
      return n;
    };
    for (const [forca, pat, segundo] of [
      ['bombeiros', 'Soldado', 'Cabo BM'], ['bombeiros', 'Bombeiro Militar de 3ª Classe', 'Cabo BM'],
      ['pm', 'Soldado', 'Cabo PM'], ['pm', 'Soldado PM 2ª Classe', 'Cabo PM'],
      ['exercito', 'Soldado', 'Cabo'], ['marinha', 'Grumete', 'Marinheiro'],
    ]) {
      const e = escada(forca, pat);
      conferir(`🎯 ${forca} "${pat}": a 1ª promoção sobe, sem passar por aluno`,
        e[1] === segundo && !e.slice(1).some((p) => /aluno/i.test(p)), e.slice(0, 3).join(' > '));
    }
    for (const [forca, pat, segundo] of [
      ['exercito', 'Aluno-Sargento', '3º Sargento'], ['exercito', 'Cadete', 'Aspirante a Oficial'],
      ['bombeiros', 'Aluno-Oficial BM', 'Aspirante a Oficial BM'], ['pm', 'Aluno-Oficial PM', 'Aspirante a Oficial PM'],
    ]) {
      const e = escada(forca, pat);
      conferir(`etapa de aluno "${pat}" vai para o posto formado`, e[0] === pat && e[1] === segundo, e.slice(0, 3).join(' > '));
    }

    /* O caso que motivou a mudança: nome sem palavra-chave nenhuma. */
    const semPista = nivelDe(0, 'Concurso de Admissão ao Curso de Formação de Sargentos');
    conferir('SEM a IA, um edital assim caía no genérico (era o defeito)',
      semPista.nome === 'Recruta', semPista.nome + ' — tabela ' + semPista.tipo);

    const comIA = nivelDe(0, 'Concurso de Admissão ao Curso de Formação de Sargentos', 'exercito', 'Aluno-Sargento');
    conferir('COM a IA, sai a força certa e a patente do edital',
      comIA.nome === 'Aluno-Sargento' && comIA.tipo === 'exercito',
      comIA.nome + ' — tabela ' + comIA.tipo);

    const subiu = nivelDe(5000, 'x', 'exercito', 'Aluno-Sargento');
    conferir('quem junta XP realmente sobe de patente',
      subiu.nome !== 'Aluno-Sargento', 'com 5000 XP virou ' + subiu.nome);

    const desconhecida = nivelDe(0, 'x', 'forca-que-nao-existe');
    conferir('força desconhecida cai no genérico em vez de quebrar',
      desconhecida.nome === 'Recruta', desconhecida.nome);

    /* A tabela não pode ter sido modificada por uma chamada anterior. */
    const dePois = nivelDe(0, 'x', 'exercito');
    conferir('renomear numa chamada NÃO contamina a próxima',
      dePois.nome === 'Recruta', dePois.nome);
  }

  /* ── 6. a ressalva existe e diz o que precisa dizer ───────────────────── */
  console.log('\n6. A ressalva sobre os professores');
  {
    conferir('existe e não está vazia', (RESSALVA_PROFESSORES || '').length > 100,
      (RESSALVA_PROFESSORES || '').length + ' caracteres');
    conferir('diz que ninguém paga para ser indicado',
      /não recebe nada/i.test(RESSALVA_PROFESSORES), 'ok');
    conferir('diz que a pessoa pode seguir outro professor',
      /continue|outro professor/i.test(RESSALVA_PROFESSORES), 'ok');
  }

  /* ── RELATÓRIO ────────────────────────────────────────────────────────── */
  console.log('');
  for (const c of casos) {
    console.log('  ' + (c.ok ? 'OK   ' : 'FALHA') + ' ' + c.titulo.padEnd(60) + c.detalhe);
  }
  console.log('\n' + '='.repeat(78));
  if (falhas.length) {
    console.log(falhas.length + ' de ' + casos.length + ' regra(s) QUEBRADA(S).');
    process.exitCode = 1;
  } else {
    console.log('As ' + casos.length + ' regras de produto continuam valendo.');
  }
})().catch((e) => {
  console.error('\nO teste nao rodou: ' + e.message);
  process.exitCode = 1;
});
