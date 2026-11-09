const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");

// Replace the start of panelCoordNomina to fetch solicitudes too
const oldStart = `async function panelCoordNomina() {
  const nomina = await API.nomina();
  const alumnos = nomina.alumnos || [];`;
const newStart = `async function panelCoordNomina() {
  const [nomina, solicitudes] = await Promise.all([API.nomina().catch(() => ({ alumnos: [], total: 0 })), API.solicitudes().catch(() => [])]);
  const alumnos = nomina.alumnos || [];
  // Lista detallada de estudiantes solicitados (lote desglosado)
  const solicitados = [];
  for (const sol of solicitudes) {
    const als = (sol.alumnos && sol.alumnos.length) ? sol.alumnos : (sol.alumno && sol.alumno.rut ? [sol.alumno] : []);
    for (const a of als) {
      solicitados.push({
        _id: sol._id,
        codigo: sol.codigo,
        estudiante: a.nombre || a.rut,
        rut: a.rut,
        actividad: sol.actividad ? sol.actividad.nombre : "-",
        division: sol.division || "-",
        estado: sol.estado,
      });
    }
  }`;
if (!s.includes(oldStart)) { console.error("oldStart not found"); process.exit(1); }
s = s.replace(oldStart, newStart);

// Replace the contenido template to show solicitados table instead of nomina table
const oldContent = `  contenido(
    \`<div class="encabezado"><h2 class="pagina">Nomina Interna de Estudiantes</h2>
       <button class="btn btn-primario2" id="btn-filtrar">Filtrar</button></div>
     <div class="stat"><div class="num">${nomina.total}</div><div class="lbl">Total</div></div>
     <div class="tarjeta" style="margin-bottom:12px">
       <h3>Registrados por actividad</h3>
       <table><thead><tr><th>Actividad</th><th>Cantidad</th></tr></thead>
       <tbody>${resumenPorActividad.length
         ? resumenPorActividad.map((r) => \`<tr><td>${esc(r.actividad)}</td><td class="act-num">${r.total}</td></tr>\`).join("")
         : \`<tr><td colspan="2" class="muted">Sin actividades.</td></tr>\`}</tbody></table>
     </div>
     <div class="nomina-fila">
       <div class="nomina-lista" id="alumnos-lista"></div>
       <div class="tarjeta oculta nomina-filtros" id="nomina-filtros">
         <h3>Filtrar</h3>
         <div class="campo"><label>Nombre</label><input id="flt-nombre" autocomplete="off"></div>
         <div class="campo"><label>Actividad</label>${comboHtml("flt-act-txt", "Buscar actividad...")}</div>
         <div class="campo"><label>Categoria</label>${comboHtml("flt-cat-txt", "Buscar categoria...")}</div>
         <div class="campo"><label>Subcategoria</label>${comboHtml("flt-sub-txt", "Damas / Varones...")}</div>
         <button class="btn btn-mini" id="btn-limpiar-filtros">Limpiar filtros</button>
       </div>
     </div>\`
  );`;

// We'll do a simpler replacement: replace the whole contenido block by marker
const marker = '  contenido(\n    `<div class="encabezado"><h2 class="pagina">Nomina Interna de Estudiantes</h2>';
const idx = s.indexOf(marker);
if (idx === -1) { console.error("marker not found"); process.exit(1); }
// find closing of contenido call: the next "  );" after idx
let endIdx = s.indexOf("  );", idx);
// ensure we capture the right one: search for ");\n" after the nomina-fila block
const blockEnd = s.indexOf('  );\n', idx);
const newBlock = `  contenido(
    \`<div class="encabezado"><h2 class="pagina">Mi Nomina</h2></div>
     <div class="stat"><div class="num">${solicitados.length}</div><div class="lbl">Solicitudes/Estudiantes</div></div>
     <div class="tarjeta">
       <table><thead><tr><th>Estudiante</th><th>Actividad</th><th>Division</th><th>Estado</th><th>Acciones</th></tr></thead>
       <tbody>\${paginarUI(solicitados, "nominaSol").items.length
         ? paginarUI(solicitados, "nominaSol").items.map((r) => \`<tr>
             <td>${esc(r.estudiante)} <span class="muted">${esc(r.rut)}</span></td>
             <td>${esc(r.actividad)}</td>
             <td>${esc(r.division)}</td>
             <td><span class="estado est-${esc(r.estado)}">${esc(r.estado)}</span></td>
             <td>\${r.estado === "en_proceso" ? \`<button class="btn btn-err2 btn-mini" data-retract-sol="\${r._id}">Retractar</button>\` : "-"}</td>
           </tr>\`).join("")
         : \`<tr><td colspan="5" class="muted">Sin estudiantes solicitados.</td></tr>\`}</tbody></table>
       \${htmlPaginacion("nominaSol", paginarUI(solicitados, "nominaSol"))}
     </div>\`
  );`;
s = s.slice(0, idx) + newBlock + s.slice(blockEnd + 4);

fs.writeFileSync(p, s);
console.log("done");
