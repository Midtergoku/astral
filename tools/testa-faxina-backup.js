/* ═══════════════════════════════════════════════════════════════════════════
   TESTA-FAXINA-BACKUP -- as copias de seguranca vivem 90 dias, e so elas saem?
   (09/10/2026 -- roadmap 3.18, decisao dele: 90 dias, como outras plataformas)

   Roda o PROPRIO tools/backup.js (--so-faxina) numa pasta de mentira -- as
   copias de verdade nunca sao tocadas aqui. Tres situacoes:
     1. copias novas e velhas misturadas: so as de mais de 90 dias saem
     2. so 6 copias, todas velhas: nada sai (as 7 mais novas ficam sempre)
     3. o backup parou ha meses (10 copias velhas): saem 3, ficam as 7 mais novas
   E o que NAO e copia (outra pasta, o ultimo-backup.json) nunca e apagado.

   USO   node tools/testa-faxina-backup.js     (nao usa banco nem rede alem da CLI)
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

let falhas = 0;
const ok = (t, d = "") => console.log(`  OK     ${t.padEnd(58)} ${d}`);
const falha = (t, d = "") => { console.log(`  FALHA  ${t.padEnd(58)} ${d}`); falhas++; };
const conferir = (t, c, d = "") => (c ? ok(t, d) : falha(t, d));

// o MESMO instante para montar e conferir (recalcular com o relogio andando dava outro nome)
const AGORA = Date.now();
const nome = (diasAtras) => new Date(AGORA - diasAtras * 86400000).toISOString().slice(0, 19).replace(/[:T]/g, "-");
function montar(dias) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), "astral-faxina-"));
  for (const d of dias) { fs.mkdirSync(path.join(p, nome(d))); fs.writeFileSync(path.join(p, nome(d), "perfis.json"), "[]"); }
  fs.mkdirSync(path.join(p, "nao-e-copia"));
  fs.writeFileSync(path.join(p, "ultimo-backup.json"), "{}");
  return p;
}
function faxina(p) {
  execFileSync(process.execPath, [path.join(__dirname, "backup.js"), "--so-faxina"], { env: { ...process.env, ASTRAL_BACKUPS_DIR: p }, stdio: ["ignore", "pipe", "pipe"] });
  return fs.readdirSync(p).sort();
}
const restam = (p, dias) => dias.filter((d) => fs.existsSync(path.join(p, nome(d))));

console.log("\nTESTA-FAXINA-BACKUP -- 90 dias, e só as cópias\n");
const pastas = [];
try {
  // 1
  const dias1 = [200, 150, 120, 100, 91, 89, 60, 30, 10, 5, 2, 1];
  const p1 = montar(dias1); pastas.push(p1);
  faxina(p1);
  const ficou1 = restam(p1, dias1);
  conferir("🎯 saem só as de mais de 90 dias", ficou1.join(",") === "89,60,30,10,5,2,1", `ficaram (dias): ${ficou1.join(", ")}`);
  conferir("o que não é cópia fica", fs.existsSync(path.join(p1, "nao-e-copia")) && fs.existsSync(path.join(p1, "ultimo-backup.json")));
  // 2
  const dias2 = [400, 300, 200, 150, 120, 95];
  const p2 = montar(dias2); pastas.push(p2);
  faxina(p2);
  conferir("🎯 com 6 cópias, mesmo velhas, nada sai", restam(p2, dias2).length === 6);
  // 3
  const dias3 = [400, 380, 360, 340, 320, 300, 280, 260, 240, 220];
  const p3 = montar(dias3); pastas.push(p3);
  faxina(p3);
  const ficou3 = restam(p3, dias3);
  conferir("🎯 backup parado há meses: ficam as 7 mais novas", ficou3.join(",") === "340,320,300,280,260,240,220", `ficaram (dias): ${ficou3.join(", ")}`);
} catch (e) {
  falha("o teste quebrou", String(e.message).slice(0, 140));
} finally {
  for (const p of pastas) fs.rmSync(p, { recursive: true, force: true });
  console.log("\n" + "=".repeat(70));
  console.log(falhas === 0 ? "AS CÓPIAS VIVEM 90 DIAS — E AS 7 MAIS NOVAS FICAM SEMPRE." : `🔴 ${falhas} FALHA(S).`);
  process.exitCode = falhas ? 1 : 0;
}
