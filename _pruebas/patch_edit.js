const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");

// Add helper function before panelCoordInscribir
const helper = `function editarAlumnoModal(al) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10002;display:flex;align-items:center;justify-content:center;padding:16px;";
  const card = document.createElement("div");
  card.style.cssText = "background:#fff;border-radius:12px;padding:20px;max-width:600px;width:100%;max-height:85vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);";
  card.innerHTML = \`<h3 style="margin-top:0">Editar participante</h3>
    <div class="grid-2">
      <div class="campo"><label>RUT</label><input id="edit-al-rut" value="${esc(al.rut || "")}"></div>
      <div class="campo"><label>Nombre</label><input id="edit-al-nombre" value="${esc(al.nombre || "")}"></div>
      <div class="campo"><label>Genero</label><select id="edit-al-genero"><option value="M" ${al.genero==="M"?"selected":""}>Masculino</option><option value="F" ${al.genero==="F"?"selected":""}>Femenino</option><option value="Otro" ${al.genero==="Otro"?"selected":""}>Otro</option></select></div>
      <div class="campo"><label>Fecha nacimiento</label><input type="date" id="edit-al-fecha" value="${esc(al.fechaNacimiento ? String(al.fechaNacimiento).slice(0,10) : "")}"></div>
      <div class="campo"><label>Apoderado</label><input id="edit-al-apo" value="${esc(al.apoderado || "")}"></div>
      <div class="campo"><label>Correo</label><input id="edit-al-correo" type="email" value="${esc(al.email || "")}"></div>
      <div class="campo"><label>Telefono</label><input id="edit-al-tel" value="${esc(al.telefono || "")}"></div>
    </div>
    <div style="text-align:right;margin-top:14px;gap:8px;display:flex;justify-content:flex-end">
      <button class="btn btn-mini" id="cerrar-edit-al">Cancelar</button>
      <button class="btn btn-ok" id="guardar-edit-al">Guardar cambios</button>
    </div>\`;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.querySelector("#cerrar-edit-al").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  card.querySelector("#guardar-edit-al").onclick = async () => {
    try {
      await API.actualizarAlumno(al._id, {
        rut: card.querySelector("#edit-al-rut").value.trim(),
        nombre: card.querySelector("#edit-al-nombre").value.trim(),
        genero: card.querySelector("#edit-al-genero").value,
        fechaNacimiento: card.querySelector("#edit-al-fecha").value,
        apoderado: card.querySelector("#edit-al-apo").value.trim(),
        email: card.querySelector("#edit-al-correo").value.trim(),
        telefono: card.querySelector("#edit-al-tel").value.trim(),
      });
      mostrarMensaje("Estudiante actualizado", "ok");
      overlay.remove();
      // refresh cartelera
      const cont = document.getElementById("cartelera-c");
      if (cont) { cont.innerHTML = ""; cargarCarteleraEn("#cartelera-c"); }
    } catch (err) {
      mostrarMensaje(err.message, "error");
    }
  };
}
`;

const marker = "async function panelCoordInscribir() {";
const idx = s.indexOf(marker);
if (idx === -1) { console.error("marker not found"); process.exit(1); }
s = s.slice(0, idx) + helper + "\n" + s.slice(idx);

// Wire edit button in cartelera modal: replace the placeholder handler
s = s.replace(
  '      const ok = confirm("Antes de editar la informacion del participante, se le hara llegar una notificacion al administrador DAEM. Desea continuar?");\n      if (!ok) return;\n      mostrarMensaje("Notificacion enviada al admin. Edicion en desarrollo.", "info");\n      return;',
  '      const ok = confirm("Antes de editar la informacion del participante, se le hara llegar una notificacion al administrador DAEM. Desea continuar?");\n      if (!ok) return;\n      const al = alumnosNomina.find((x) => String(x._id) === String(editBtn.dataset.editAl));\n      if (al) editarAlumnoModal(al);\n      return;'
);

fs.writeFileSync(p, s);
console.log("done");
