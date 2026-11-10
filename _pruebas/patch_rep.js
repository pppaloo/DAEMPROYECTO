const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");
const old = '      <div class="tarjeta"><h3>Trazabilidad Historica</h3>\n        <p class="muted">${esc(JSON.stringify(hist.porAnio || []))}</p>\n      </div>`;';
const neu = '      <div class="tarjeta"><h3>Trazabilidad Historica</h3>\n        <table><thead><tr><th>Anio</th><th>Beneficiarios</th><th>Inscripciones</th></tr></thead>\n        <tbody>${(hist.porAnio || []).length\n          ? (hist.porAnio || []).map((a) => {\n              const insc = (hist.inscripcionesPorAnio && hist.inscripcionesPorAnio[a.anio]) ? hist.inscripcionesPorAnio[a.anio].total : 0;\n              return `<tr><td>${esc(a.anio)}</td><td>${a.beneficiarios}</td><td>${insc}</td></tr>`;\n            }).join("")\n          : `<tr><td colspan="3" class="muted">Sin datos historicos.</td></tr>`}</tbody></table>\n      </div>`;';
if (!s.includes(old)) { console.error("old not found"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("done");
