const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");
const marker = "function filaSolicitudHtml(s, conAcciones) {";
const start = s.indexOf(marker);
// find the end of this function: next "\n}\n" after start
const end = s.indexOf("\n}\n", start) + 3;
console.log("start", start, "end", end);
const tablaFn = `function tablaSolicitudesHtml(items, prefijo, conAcciones) {
  const p = paginarUI(items, prefijo);
  return \`<div class="tarjeta">
    <table><thead><tr><th>Tipo</th><th>Detalle</th><th>Establecimiento</th><th>Solicitante</th><th>Fecha</th><th>Estado</th>${conAcciones ? "<th>Acciones</th>" : ""}</tr></thead>
    <tbody>${p.items.length
      ? p.items.map((s) => filaSolicitudHtml(s, conAcciones)).join("")
      : \`<tr><td colspan="${conAcciones ? 7 : 6}" class="muted">Sin solicitudes.</td></tr>\`}</tbody></table>
    ${htmlPaginacion(prefijo, p)}
  </div>\`;
}

`;
const result = s.slice(0, end) + "\n" + tablaFn + s.slice(end);
fs.writeFileSync(p, result);
console.log("done");
