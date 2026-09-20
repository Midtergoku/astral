// LEMBRETES -- as decisoes que ele adiou DE PROPOSITO, com gatilho medido.
//
// Ordem dele, 20/09/2026, sobre a porcentagem de raridade das medalhas:
//   "nao vamos mexer nessa questao de porcentagem por enquanto, isso e uma boa
//    ideia, la pra frente quero que voce me lembre disso novamente, vamos
//    estipular um numero de usuarios (...) e ai voce me lembra disso."
//
// 🔴 O PROBLEMA DESTE TIPO DE COMBINADO: ele depende de eu LEMBRAR, e eu nao
// lembro. Escrever "lembrar quando der 200" num documento e a mesma familia do
// erro de 17/09, em que uma contagem certa no dia em que foi escrita envelheceu
// calada. Entao o lembrete nao mora num documento -- mora aqui, ele MEDE, e o
// `checa-saude.js` (primeira coisa de toda sessao) chama este arquivo.
//
// Para acrescentar um lembrete novo: mais um objeto na lista LEMBRETES. Ele
// precisa de uma funcao `medir` que devolve numero, nunca de uma data no
// calendario -- gatilho por data lembra de algo que talvez nao importe mais.
// execSync, e nao execFileSync: no Windows o `supabase` e um .cmd, e sem passar
// pelo shell o Node nao acha o executavel. O sintoma era honesto ("nao medi"),
// mas o lembrete ficaria mudo para sempre sem ninguem perceber.
const { execSync } = require("child_process");

const REF = "jjogmcacbdefwiwcyjxp";
const BASE = `https://${REF}.supabase.co`;

function serviceKey() {
  try {
    const saida = execSync(`supabase projects api-keys --project-ref ${REF} -o json`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return JSON.parse(saida).find((k) => k.name === "service_role").api_key;
  } catch {
    return null; // sem chave: o lembrete diz "nao medi", nunca inventa numero
  }
}

async function usuariosAtivos30Dias(chave) {
  const r = await fetch(`${BASE}/auth/v1/admin/users?per_page=1000`,
    { headers: { apikey: chave, Authorization: `Bearer ${chave}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const corpo = await r.json();
  const limite = Date.now() - 30 * 86400000;
  // Ativo = entrou nos ultimos 30 dias. Conta cadastrada e esquecida nao conta:
  // a porcentagem de raridade so faz sentido sobre quem esta jogando.
  return (corpo.users || []).filter(
    (u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > limite).length;
}

const LEMBRETES = [
  {
    id: "R14",
    titulo: "Porcentagem de raridade das medalhas",
    combinado: 'Adiado por ele em 19/09 e reafirmado em 20/09/2026: "nao vamos mexer '
             + 'nisso por enquanto (...) la pra frente quero que voce me lembre disso".',
    gatilho: 200,
    unidade: "usuarios com login nos ultimos 30 dias",
    // Por que 200, e nao 100 (o numero que ELE deu como exemplo):
    //   com 100 pessoas, UMA pessoa move a porcentagem em 1 ponto inteiro. A
    //   medalha que hoje diz 3% diz 4% amanha porque uma pessoa entrou. Com 200,
    //   uma pessoa move meio ponto, e o numero para de tremer sozinho.
    //   E ha um motivo maior que a precisao: porcentagem de raridade so INTERESSA
    //   se ela variar. Com pouca gente, quase toda medalha fica em 0% ou 100% e a
    //   tela vira uma coluna de numeros iguais -- trabalho feito para nao dizer nada.
    porque: "com 100, uma pessoa sozinha mexe 1 ponto inteiro e o numero treme; "
          + "com 200 ela mexe meio ponto. E abaixo disso quase toda medalha fica "
          + "em 0% ou 100%, entao a porcentagem nao diferencia nada.",
    medir: usuariosAtivos30Dias,
  },
];

async function rodar({ silencioseLonge = false } = {}) {
  const chave = serviceKey();
  const linhas = [];
  let disparou = false;

  for (const l of LEMBRETES) {
    let valor = null, erro = null;
    if (!chave) erro = "sem chave do Supabase nesta maquina";
    else { try { valor = await l.medir(chave); } catch (e) { erro = e.message; } }

    if (erro) { linhas.push({ l, texto: `NAO MEDI (${erro})`, disparou: false }); continue; }
    const bateu = valor >= l.gatilho;
    if (bateu) disparou = true;
    linhas.push({
      l, valor, disparou: bateu,
      texto: bateu
        ? `🔔 CHEGOU A HORA — ${valor} de ${l.gatilho} ${l.unidade}`
        : `ainda nao — ${valor} de ${l.gatilho} ${l.unidade} (faltam ${l.gatilho - valor})`,
    });
  }

  if (silencioseLonge && !disparou && linhas.every((x) => !/NAO MEDI/.test(x.texto))) {
    // No checa-saude diario, uma linha so. O detalhe aparece quando disparar.
    const resumo = linhas.map((x) => `${x.l.id} ${x.valor}/${x.l.gatilho}`).join(" · ");
    console.log(`  (lembretes adiados, nenhum na hora: ${resumo})`);
    return false;
  }

  console.log("\n=== LEMBRETES QUE ELE PEDIU ===");
  for (const x of linhas) {
    console.log(`\n  ${x.l.id} — ${x.l.titulo}`);
    console.log(`     ${x.texto}`);
    if (x.disparou) {
      console.log(`     ${x.l.combinado}`);
      console.log(`     👉 AVISAR O LUCAS: o gatilho que ele pediu foi atingido.`);
    }
  }
  return disparou;
}

if (require.main === module) {
  const silencioso = process.argv.includes("--resumo");
  rodar({ silencioseLonge: silencioso }).catch((e) => {
    console.log(`  (lembretes: nao consegui medir -- ${e.message})`);
  });
}

module.exports = { rodar, LEMBRETES };
