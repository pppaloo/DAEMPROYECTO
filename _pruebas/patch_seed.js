// patch: replace the alumnos update block
const fs = require("fs");
const p = "_pruebas/seed_masivo.js";
let s = fs.readFileSync(p, "utf8");
const old = `    const insc = bd.prepare(\`SELECT alumnos FROM inscripciones WHERE id = ?\`).get(inscId);
    const actuales = JSON.parse(insc.alumnos || "[]");
    actuales.push(al.lastInsertRowid);
    bd.prepare(\`UPDATE inscripciones SET alumnos = ? WHERE id = ?\`).run(JSON.stringify(actuales), inscId);`;
const neu = `    bd.prepare(\`INSERT OR IGNORE INTO inscripcion_alumnos (inscripcion, alumno) VALUES (?,?)\`).run(inscId, al.lastInsertRowid);`;
if (!s.includes(old)) { console.error("old not found"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("patched");
