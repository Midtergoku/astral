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
