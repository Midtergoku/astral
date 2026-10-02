/* O ACEITE DAS CONTAS DE TESTE (02/10/2026)

   Desde a auditoria LGL-01, toda pagina logada exige o aceite dos Termos e da
   Politica GRAVADO no servidor (assets/js/consentimento.js). As contas que os
   testes de tela criam nao tem esse aceite -- e a tela de aceite ficaria por
   cima da pagina que o teste quer conferir.

   Sem atalho no site: este script faz o que o cadastro faz quando a pessoa
   marca a caixa -- deixa o "aceite pendente" no navegador. O portao de verdade
   (garantirConsentimento) o encontra e GRAVA o aceite no servidor, como faria
   com um aluno. O teste continua passando pelo portao real.

   USO, em qualquer teste com Playwright, ANTES de abrir a pagina:
     await ctx.addInitScript(require("./testes/aceite-de-teste.js").SCRIPT);
*/
module.exports.SCRIPT = `try { if (!localStorage.getItem('astral_aceite_pendente')) {
  localStorage.setItem('astral_aceite_pendente', JSON.stringify({ origem: 'google', email: null, em: Date.now() })); }
} catch (e) { /* pagina sem armazenamento: o teste segue */ }`;

/* Para teste que FINGE o servidor (route em rest/v1/** devolvendo "[]"): o "[]"
   nao diz "aceito", o registro do pendente tambem nao, e a tela de aceite fica
   por cima de tudo -- o testa-celular estourou 6 min assim na bateria de 02/10.
   Registrar DEPOIS do route generico: no Playwright o ultimo route vence.
     await fingirAceite(pg); */
module.exports.fingirAceite = async (pg) => {
  const resposta = JSON.stringify({ vigentes: { termos: "2026-07-30", politica: "2026-06-20" }, aceito: true, aceito_em: "2026-10-02T00:00:00Z" });
  await pg.route(/\/rest\/v1\/rpc\/(meu_consentimento|registrar_consentimento)/, (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: resposta }));
};
