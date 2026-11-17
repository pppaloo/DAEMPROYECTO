const fs = require("fs");
const p = "public/js/app.js";
let s = fs.readFileSync(p, "utf8");

// 1. Filter lista to only activities with accepted students
s = s.replace(
  "    lista.push({ nombre: a.nombre, area: a.area, aceptados: cant });",
  "    if (cant > 0) lista.push({ nombre: a.nombre, area: a.area, aceptados: cant });"
);

// 2. In renderCart, the card already shows aceptados. Add a data attribute for click.
// Already has data-cart-act. Good.

// 3. Replace the click handler to show modal with edit buttons
const oldHandler = `  itemsCart.addEventListener("click", (e) => {
    const card = e.target.closest(".cart-act");
    if (!card) return;
    const nombre = card.dataset.cartAct;
    const delAct = alumnosNomina.filter((al) => al.actividad && al.actividad.nombre === nombre);
    if (!delAct.length) { mostrarMensaje("Sin estudiantes de tu nomina en esta actividad.", "info"); return; }
    const txt = delAct.map((a, i) => `${i+1}. ${a.rut || ""} - ${a.nombre} (${a.division || "-"})`).join("\\n");
    alert(\`Estudiantes de mi nomina en ${nombre}:\\n\\n${txt}\`);
  });`;

const newHandler = `  itemsCart.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit-al]");
    if (editBtn) {
      e.stopPropagation();
      const alId = editBtn.dataset.editAl;
      const al = alumnosNomina.find((x) => String(x._id) === String(alId));
      if (!al) return;
      const ok = confirm("Antes de editar la informacion del participante, se le hara llegar una notificacion al administrador DAEM. Desea continuar?");
      if (!ok) return;
      mostrarMensaje("Notificacion enviada al admin. Edicion en desarrollo.", "info");
      return;
    }
    const card = e.target.closest(".cart-act");
    if (!card) return;
    const nombre = card.dataset.cartAct;
    const delAct = alumnosNomina.filter((al) => al.actividad && al.actividad.nombre === nombre);
    if (!delAct.length) { mostrarMensaje("Sin estudiantes de tu nomina en esta actividad.", "info"); return; }
    // Modal with students and edit buttons
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;";
    const cardEl = document.createElement("div");
    cardEl.style.cssText = "background:#fff;border-radius:12px;padding:20px;max-width:700px;width:100%;max-height:80vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);";
    cardEl.innerHTML = \`<h3 style="margin-top:0">Estudiantes de mi nomina en ${esc(nombre)}</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">RUT</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Nombre</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Division</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Accion</th></tr></thead>
        <tbody>${delAct.map((a) => \`<tr><td style="padding:6px">${esc(a.rut)}</td><td style="padding:6px">${esc(a.nombre)}</td><td style="padding:6px">${esc(a.division || "-")}</td><td style="padding:6px"><button class="btn btn-mini" data-edit-al="${a._id}">Editar</button></td></tr>\`).join("")}</tbody>
      </table>
      <div style="text-align:right;margin-top:14px"><button class="btn btn-mini" id="cerrar-modal-cart">Cerrar</button></div>\`;
    overlay.appendChild(cardEl);
    document.body.appendChild(overlay);
    cardEl.querySelector("#cerrar-modal-cart").onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  });`;

if (s.includes(oldHandler)) {
  s = s.replace(oldHandler, newHandler);
  console.log("handler replaced");
} else {
  console.log("old handler not found");
}

fs.writeFileSync(p, s);
console.log("done");
