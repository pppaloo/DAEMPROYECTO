const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");

// In the cartelera modal, the edit buttons are created dynamically. Attach handlers after modal is in DOM.
// Find the overlay creation block in cargarCarteleraEn and add event delegation.
const old = '    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };';
const neu = '    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };\n    // Delegar clicks en botones Editar dentro del modal\n    cardEl.addEventListener("click", (e) => {\n      const btn = e.target.closest("[data-edit-al]");\n      if (!btn) return;\n      e.stopPropagation();\n      const ok = confirm("Antes de editar la informacion del participante, se le hara llegar una notificacion al administrador DAEM. Desea continuar?");\n      if (!ok) return;\n      const al = alumnosNomina.find((x) => String(x._id) === String(btn.dataset.editAl));\n      if (al) editarAlumnoModal(al);\n    });';
if (!s.includes(old)) { console.error("old not found"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("done");
