const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");

const old = `        <div class="grid-2">
        <div class="campo">
          <label>Postular desde la nomina (${esc(actNombre)} - ${esc(division)})</label>
          <select data-tor-nom="${t._id}">${opciones}</select>
          <button class="btn btn-ok btn-mini" data-post-nom="${t._id}">Postular seleccionado</button>
        </div>`;

const neu = `        <div class="grid-2">
        <div class="campo">
          <label>Postular desde la nomina (${esc(actNombre)} - ${esc(division)})</label>
          ${candidatos.length
            ? `<div class="lote-candidatos" data-tor-lote="${t._id}" style="max-height:160px;overflow:auto;border:1px solid var(--borde);padding:6px;border-radius:6px;margin-bottom:6px">
                ${candidatos.map((a) => `<label style="display:block"><input type="checkbox" value="${a._id}"> ${esc(a.rut)} - ${esc(a.nombre)}</label>`).join("")}
              </div>
              <button class="btn btn-ok btn-mini" data-post-lote="${t._id}">Postular seleccionados</button>`
            : `<p class="muted">Sin estudiantes disponibles en esta categoria</p>`}
        </div>`;

if (!s.includes(old)) { console.error("old not found"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("done");
