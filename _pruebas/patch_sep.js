const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");

const old = `function filaSolicitudHtml(s, conAcciones) {
  const nAl = (s.alumnos && s.alumnos.length) ? s.alumnos.length : (s.alumno && s.alumno.rut ? 1 : 0);
  return \`<tr>
    <td>${esc(s.tipo)}${s.codigo ? \`<div class="muted">${esc(s.codigo)}</div>\` : ""}</td>
    <td>${esc(s.detalle)} <span class="muted">(${nAl} estudiante${nAl === 1 ? "" : "s"})</span>${nAl > 1 ? \` <button class="btn btn-mini" data-ver-sol="${s._id}">Ver estudiantes</button>\` : ""}${s.respuesta ? \`<div class="muted">Respuesta: ${esc(s.respuesta)}</div>\` : ""}</td>
    <td>${esc(s.establecimiento ? \`${s.establecimiento.codigo} - ${s.establecimiento.nombre}\` : "-")}</td>
    <td>${esc(s.rutSolicitante || "-")}</td>
    <td>${esc(fechaSolicitud(s.createdAt))}</td>
    <td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td>
    ${conAcciones ? \`<td>
      <button class="btn btn-ok btn-mini" data-sol-acc="${s._id}" data-sol-est="aprobada">Aprobar</button>
      <button class="btn btn-err2 btn-mini" data-sol-acc="${s._id}" data-sol-est="rechazada">Rechazar</button>
    </td>\` : ""}
  </tr>\`;
}`;

const neu = `function filaSolicitudHtml(s, conAcciones) {
  const alumnos = (s.alumnos && s.alumnos.length) ? s.alumnos : (s.alumno && s.alumno.rut ? [s.alumno] : []);
  const nAl = alumnos.length;
  if (!nAl) {
    return \`<tr>
      <td>${esc(s.tipo)}${s.codigo ? \`<div class="muted">${esc(s.codigo)}</div>\` : ""}</td>
      <td>${esc(s.detalle)}${s.respuesta ? \`<div class="muted">Respuesta: ${esc(s.respuesta)}</div>\` : ""}</td>
      <td>${esc(s.establecimiento ? \`${s.establecimiento.codigo} - ${s.establecimiento.nombre}\` : "-")}</td>
      <td>${esc(s.rutSolicitante || "-")}</td>
      <td>${esc(fechaSolicitud(s.createdAt))}</td>
      <td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td>
      ${conAcciones ? \`<td>
        <button class="btn btn-ok btn-mini" data-sol-acc="${s._id}" data-sol-est="aprobada">Aprobar</button>
        <button class="btn btn-err2 btn-mini" data-sol-acc="${s._id}" data-sol-est="rechazada">Rechazar</button>
      </td>\` : ""}
    </tr>\`;
  }
  return alumnos.map((a, idx) => \`<tr>
    <td>${idx === 0 ? esc(s.tipo) + (s.codigo ? \`<div class="muted">${esc(s.codigo)}</div>\` : "") : ""}</td>
    <td>${esc(a.nombre || a.rut)} <span class="muted">${esc(a.rut)}</span>${idx === 0 ? \` <span class="muted">(${nAl} estudiante${nAl === 1 ? "" : "s"})</span>\` : ""}</td>
    <td>${esc(s.establecimiento ? \`${s.establecimiento.codigo} - ${s.establecimiento.nombre}\` : "-")}</td>
    <td>${esc(s.rutSolicitante || "-")}</td>
    <td>${idx === 0 ? esc(fechaSolicitud(s.createdAt)) : ""}</td>
    <td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td>
    ${conAcciones && idx === 0 ? \`<td>
      <button class="btn btn-ok btn-mini" data-sol-acc="${s._id}" data-sol-est="aprobada">Aprobar</button>
      <button class="btn btn-err2 btn-mini" data-sol-acc="${s._id}" data-sol-est="rechazada">Rechazar</button>
    </td>\` : (conAcciones ? "<td></td>" : "")}
  </tr>\`).join("");
}`;

if (!s.includes(old)) { console.error("old not found"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("done");
