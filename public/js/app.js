// ============================================================
// SPA DAEM: orquesta login, autenticacion por rol y paneles.
// ============================================================

const $ = (sel) => document.querySelector(sel);
const esc = (txt = "") => String(txt).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Parametros de campos: solo letras en nombres, formato RUT y limites ----------
const MX = { letras: 60, nombre: 80, rut: 12, clave: 10, correo: 40, codigo: 12, telefono: 20 };
const RE_LETRAS = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ´.\- ]/g;
const RE_RUT = /[^0-9kK]/g;

// Formatea un RUT mientras se escribe: 22.113.000-6
function formatearRutInput(valor) {
  const limpio = String(valor || "").replace(RE_RUT, "").toUpperCase().slice(0, 9);
  if (limpio.length <= 1) return limpio;
  const dv = limpio.slice(-1);
  const cuerpo = limpio.slice(0, -1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return cuerpoFmt + "-" + dv;
}
const RE_CODIGO = /[^A-Za-z0-9.\- ]/g;
const RE_TEL = /[^\d+()\-. ]/g;

// ---------- Catálogo de divisiones (espejo del servidor) ----------
// Se usa para validar el rango de año de nacimiento en el cliente
// antes de enviar la solicitud, sin esperar la respuesta del servidor.
const DIVISIONES_CAT = [
  { nombre: "MINIS",   desde: 2016, hasta: 2018 },
  { nombre: "SUB 13", desde: 2013, hasta: 2015 },
  { nombre: "SUB 14", desde: 2012, hasta: 2014 },
  { nombre: "JUVENIL", desde: 2009, hasta: 2012 },
  { nombre: "DAMAS",   desde: null, hasta: null },
  { nombre: "VARONES", desde: null, hasta: null },
];

/**
 * Valida en el cliente los requisitos de un alumno antes de enviar.
 * @param {string} fechaNacimiento  - valor del input date ("AAAA-MM-DD")
 * @param {string} genero           - "M", "F" u "Otro"
 * @param {string} division         - nombre de la categoria (ej. "SUB 13")
 * @param {object|null} reqTorneo   - objeto requisitos del torneo
 *   { activo, edadMinima, edadMaxima, genero }  (puede ser null)
 * @returns {string|null} Mensaje de error o null si todo está bien.
 */
function validarRequisitosAlumnoFront(fechaNacimiento, genero, division, reqTorneo) {
  if (!fechaNacimiento) return null;

  const nac = new Date(fechaNacimiento);
  if (isNaN(nac)) return "Fecha de nacimiento inválida.";

  const anioNac = nac.getFullYear();

  // 1. Validación por categoría (año de nacimiento vs. rango de la división)
  if (division) {
    const div = DIVISIONES_CAT.find((d) => d.nombre === division);
    if (div && div.desde !== null) {
      if (anioNac < div.desde || anioNac > div.hasta) {
        return `La categoría ${division} requiere nacer entre ${div.desde} y ${div.hasta}. El alumno nació en ${anioNac}.`;
      }
    }
  }

  // 2. Requisitos del torneo (edad mín/máx y género)
  if (reqTorneo && reqTorneo.activo) {
    const hoy = new Date();
    let edad = hoy.getFullYear() - anioNac;
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;

    if (reqTorneo.edadMinima != null && edad < reqTorneo.edadMinima) {
      return `El alumno tiene ${edad} año(s), menor a la edad mínima del torneo (${reqTorneo.edadMinima} años).`;
    }
    if (reqTorneo.edadMaxima != null && edad > reqTorneo.edadMaxima) {
      return `El alumno tiene ${edad} año(s), mayor a la edad máxima del torneo (${reqTorneo.edadMaxima} años).`;
    }
    if (reqTorneo.genero && ["varones", "damas"].includes(reqTorneo.genero) && genero && genero !== "Otro") {
      const permitido = reqTorneo.genero === "varones" ? "M" : "F";
      if (genero !== permitido) {
        return `Este torneo es exclusivo para ${reqTorneo.genero}. El alumno ingresado es ${genero === "M" ? "masculino" : "femenino"}.`;
      }
    }
  }

  return null;
}

function tipoDeCampo(el) {
  if (el.dataset.tipo) return el.dataset.tipo;
  const id = el.id || "";
  if (/(^|-)rut$|^n-rut-/.test(id)) return "rut";
  if (/(^|-)clave$/.test(id)) return "clave";
  if (/(^|-)correo$|mail$/.test(id)) return "correo";
  if (/(^|-)codigo$/.test(id)) return "codigo";
  if (/(^|-)telefono$|tel$/.test(id)) return "telefono";
  if (/(^|-)nombre$|(^|-)nom$|(^|-)ape$|(^|-)apo$|^n-(nom|ape)-/.test(id)) return "letras";
  return "";
}

function normalizarCampo(el) {
  if (el.readOnly || el.disabled) return;
  const tipo = tipoDeCampo(el);
  if (tipo) {
    if (!el.hasAttribute("maxlength")) el.maxLength = MX[tipo];
    let v = el.value;
    if (tipo === "letras" || tipo === "nombre") {
      v = v.replace(RE_LETRAS, "").slice(0, MX[tipo]).replace(/ {2,}/g, " ");
    } else if (tipo === "rut") {
      v = formatearRutInput(v);
    } else if (tipo === "codigo") {
      v = v.replace(RE_CODIGO, "").slice(0, MX.codigo);
    } else if (tipo === "telefono") {
      v = v.replace(RE_TEL, "").slice(0, MX.telefono);
    } else {
      v = v.slice(0, MX[tipo]);
    }
    if (v !== el.value) el.value = v;
    if (v.length >= MX[tipo]) {
      if (el.dataset.avisoLimite !== "1") {
        el.dataset.avisoLimite = "1";
        avisarCampo(el, `Maximo ${MX[tipo]} caracteres`);
      }
    } else if (el.dataset.avisoLimite === "1") {
      el.dataset.avisoLimite = "0";
    }
  } else if (el.tagName === "INPUT" && !["search", "number", "date", "time", "datetime-local", "hidden"].includes(el.type) && !el.hasAttribute("maxlength")) {
    el.maxLength = 200;
  }
}

let __timerAviso = null;
function avisarCampo(el, texto) {
  const viejo = document.querySelector(".campo-aviso");
  if (viejo) viejo.remove();
  clearTimeout(__timerAviso);
  const aviso = document.createElement("div");
  aviso.className = "campo-aviso";
  aviso.textContent = texto;
  const r = el.getBoundingClientRect();
  aviso.style.left = (r.left + Math.max(0, (r.width - 200) / 2) + window.scrollX) + "px";
  aviso.style.top = (r.top - 34 + window.scrollY) + "px";
  document.body.appendChild(aviso);
  __timerAviso = setTimeout(() => {
    aviso.style.opacity = "0";
    setTimeout(() => aviso.remove(), 200);
  }, 2500);
}

// Banner de exito: usa el mismo toast centrado para mantener un solo estilo.
const mostrarExito = (msg) => mostrarMensaje(msg, "ok");

// ---------- Toasts (reemplazan a alert) ----------
function mostrarMensaje(texto, tipo) {
  const msg = String(texto);
  if (!tipo) {
    const pareceError = /(error|no se pudo|no se puede|no pueden|inv[aá]lid|seleccione|complete|indique|debe|deben|sin |no hay|no tiene|no existe|ya existe|fall[oó]|incorrect|obligatori|requerid)/i.test(msg);
    tipo = pareceError ? "error" : "ok";
  }
  let cont = document.getElementById("tostadas");
  if (!cont) {
    cont = document.createElement("div");
    cont.id = "tostadas";
    document.body.appendChild(cont);
  }
  const el = document.createElement("div");
  el.className = "tostada tostada-" + tipo;
  el.setAttribute("role", tipo === "error" ? "alert" : "status");
  el.innerHTML = `<span>${esc(msg)}</span><button type="button" aria-label="Cerrar">&times;</button>`;
  el.querySelector("button").onclick = () => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); };
  cont.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 4200);
}

// ---------- Modal de confirmacion (reemplaza a confirm) ----------
// Devuelve Promise<boolean>. Con `peligro=true` el boton de aceptar es rojo.
function confirmarMensaje(texto, titulo = "Confirmar", textoSi = "Aceptar", peligro = false) {
  return new Promise((resolver) => {
    const ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal-card">
       <h3>${esc(titulo)}</h3>
       <p>${esc(String(texto)).replace(/\n/g, "<br>")}</p>
       <div class="modal-acciones">
         <button type="button" class="btn ${peligro ? "btn-err2" : "btn-ok"}" data-modal-si>${esc(textoSi)}</button>
         <button type="button" class="btn btn-mini" data-modal-no>Cancelar</button>
       </div>
     </div>`;
    ov.querySelector("[data-modal-si]").onclick = () => { ov.remove(); resolver(true); };
    ov.querySelector("[data-modal-no]").onclick = () => { ov.remove(); resolver(false); };
    ov.addEventListener("click", (e) => { if (e.target === ov) { ov.remove(); resolver(false); } });
    document.body.appendChild(ov);
  });
}

// ---------- Combobox con busqueda ----------
// comboHtml(id, idsSugerencia) crea: <input type="text" id="id"> + <div id="idsSugerencia">.
// initCombo(id, opciones, onSelect) con opciones [{ valor, texto, extra }] permite escribir
// para filtrar la lista de sugerencias.
function comboHtml(id, placeholder = "Escriba para buscar...") {
  return `<span class="cb"><input type="text" id="${id}" class="cb-txt" placeholder="${esc(placeholder)}" autocomplete="off"></span>`;
}
function initCombo(id, opciones, onSelect, placeholder) {
  const inp = $("#" + id);
  if (!inp) return;
  inp.placeholder = placeholder || "Escriba para buscar...";
  let sug = document.getElementById(id + "-sug");
  if (!sug) {
    sug = document.createElement("div");
    sug.id = id + "-sug";
    sug.className = "cb-sug";
    const cb = inp.closest(".cb") || inp.parentElement;
    cb.appendChild(sug);
  }
  const pintar = (filtro) => {
    const f = (filtro || "").toLowerCase().trim();
    const vis = opciones.filter((o) => !f || String(o.texto).toLowerCase().includes(f)).slice(0, 60);
    sug.innerHTML = vis.length
      ? vis.map((o, i) => `<div class="cb-item" data-i="${i}">${esc(o.texto)}</div>`).join("")
      : '<div class="cb-item muted">Sin coincidencias</div>';
    sug.classList.add("abierta");
  };
  inp.addEventListener("input", () => {
    if (onSelect) {
      const exacto = opciones.find((o) => String(o.valor) === inp.value);
      if (exacto) { onSelect(exacto); sug.classList.remove("abierta"); return; }
    }
    pintar(inp.value);
  });
  inp.addEventListener("focus", () => pintar(inp.value));
  inp.addEventListener("blur", () => setTimeout(() => sug.classList.remove("abierta"), 150));
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...sug.querySelectorAll(".cb-item")];
      const idx = items.findIndex((el) => el.classList.contains("sel"));
      let n = idx === -1 ? 0 : (e.key === "ArrowDown" ? idx + 1 : idx - 1);
      if (n < 0) n = items.length - 1;
      if (n >= items.length) n = 0;
      items.forEach((el) => el.classList.remove("sel"));
      items[n] && items[n].classList.add("sel");
    }
    if (e.key === "Enter") {
      const sel = sug.querySelector(".cb-item.sel");
      if (sel) { sel.click(); }
    }
  });
  sug.addEventListener("mousedown", (e) => {
    const it = e.target.closest(".cb-item");
    if (!it) return;
    e.preventDefault();
    const o = opciones[Number(it.dataset.i)];
    if (!o) return;
    inp.value = o.texto;
    if (onSelect) onSelect(o);
    sug.classList.remove("abierta");
  });
}

// Opciones combinadas "Actividad - Categoria": por cada actividad y cada division.
function opcionesActividadCategoria(act) {
  const out = [];
  act.forEach((a) => {
    const divs = (a.divisiones && a.divisiones.length) ? a.divisiones : [""];
    divs.forEach((d) => {
      out.push({
        valor: String(a._id),
        texto: d ? `${a.nombre} - ${d}` : a.nombre,
        extra: { actividad: String(a._id), division: d, nombre: a.nombre },
      });
    });
  });
  return out;
}

let CAT = {}; // catalogos cargados

function cargarCatalogos() {
  return API.catalogos().then((c) => { CAT = c; });
}

// ---------- Autenticacion ----------
let RESET_TOKEN = "";

async function iniciarSesion(rut, clave) {
  await API.login(rut, clave);
  API.usuario = await API.perfil();
  await cargarCatalogos();
  mostrarDashboard();
}

// ---------- Login ----------
function mostrarLogin() {
  $("#app-dashboard").classList.add("oculta");
  $("#vista-login").classList.remove("oculta");
  vistaLoginForma();
}

function vistaLoginForma() {
  $("#form-login").classList.remove("oculta");
  $("#recuperar-box").classList.add("oculta");
  $("#reset-box").classList.add("oculta");
}

function mostrarRecuperar() {
  $("#form-login").classList.add("oculta");
  $("#reset-box").classList.add("oculta");
  $("#recuperar-msg").classList.add("oculta");
  $("#recuperar-box").classList.remove("oculta");
  $("#recuperar-rut").focus();
}

function mostrarReset() {
  $("#form-login").classList.add("oculta");
  $("#recuperar-box").classList.add("oculta");
  $("#reset-msg").classList.add("oculta");
  $("#reset-box").classList.remove("oculta");
  $("#reset-clave").focus();
}

function cerrarMenu() {
  document.body.classList.remove("menu-abierto");
}

function abrirMenu() {
  document.body.classList.add("menu-abierto");
}

function mostrarDashboard() {
  $("#vista-login").classList.add("oculta");
  $("#app-dashboard").classList.remove("oculta");
  const u = API.usuario;
  $("#usuario-actual").innerHTML =
    `<strong>${esc(u.nombre)}</strong><span class="badge-rol">${esc(u.rol)}</span>` +
    (u.establecimiento && u.establecimiento.nombre ? `<div class="muted">${esc(u.establecimiento.nombre)}</div>` : "");
  construirNav();
  navegar("");

  $("#btn-menu").onclick = abrirMenu;
  $("#btn-cerrar-menu").onclick = cerrarMenu;
  $("#overlay-menu").onclick = cerrarMenu;

  const conNotis = u && u.rol === "coordinador";
  const camp = $("#btn-campana-side");
  if (camp) {
    camp.classList.toggle("oculta", !conNotis);
    camp.onclick = () => navegar("notificaciones");
  }
  refrescarCampana();
}

// Actualiza el contador de la campana del sidebar con las no leidas.
async function refrescarCampana() {
  const camp = $("#btn-campana-side");
  if (!camp || camp.classList.contains("oculta")) return;
  const badge = camp.querySelector(".badge-campana");
  try {
    const r = await API.notificaciones();
    const n = (r && r.pendientes) || 0;
    badge.textContent = n;
    badge.classList.toggle("oculta", n === 0);
  } catch (e) {
    badge.classList.add("oculta");
  }
}

function construirNav() {
  const nav = $("#nav");
  nav.innerHTML = "";
  const items = MenuPorRol[API.usuario.rol] || [];
  items.forEach((it) => {
    const b = document.createElement("button");
    b.textContent = it.label;
    b.dataset.opcion = it.clave;
    b.onclick = () => { document.querySelectorAll("#nav button").forEach((x) => x.classList.remove("activo")); b.classList.add("activo"); cerrarMenu(); navegar(it.clave); };
    nav.appendChild(b);
  });
}

function navegar(opcion) {
  const items = MenuPorRol[API.usuario.rol] || [];
  const active = opcion || (items[0] && items[0].clave);
  if (!active) {
    $("#contenido").innerHTML = "<div class='seccion'><p class='muted'>Sin opciones para este perfil.</p></div>";
    return;
  }
  (PANELES[active] || PANELES.inicio).call(null);
}

// ---------- Helpers de render ----------
function contenido(html) { $("#contenido").innerHTML = html; }

function mensajeError(err) {
  return `<div class="mensaje" style="border-color:#f1c8c2;background:#fdf0ee;color:#8a3b30">${esc(err && err.message ? err.message : "Ocurrio un error")}</div>`;
}

async function CargarPanel(fn) {
  try {
    $("#contenido").innerHTML = `<div class="mensaje">Cargando...</div>`;
    await fn();
  } catch (err) {
    contenido(mensajeError(err));
  }
}

// ============================================================
// NAVEGACION POR ROL
// ============================================================
const MenuPorRol = {
  admin: [
    { clave: "adminResumen", label: "Resumen" },
    { clave: "adminEstablecimientos", label: "Establecimientos" },
    { clave: "adminUsuarios", label: "Usuarios" },
    { clave: "adminActividades", label: "Actividades" },
    { clave: "adminTorneos", label: "Torneos y Sorteo" },
    { clave: "adminAgenda", label: "Agenda" },
    { clave: "adminInscripciones", label: "Inscripciones" },
    { clave: "adminSolicitudes", label: "Solicitudes" },
    { clave: "adminValoraciones", label: "Ranking Cumplimiento" },
    { clave: "adminReportes", label: "Reportes" },
    { clave: "feriados", label: "Feriados" },
  ],
  coordinador: [
    { clave: "coordResumen", label: "Resumen" },
    { clave: "coordLectores", label: "Lectores" },
    { clave: "coordInscribir", label: "Postulaciones" },
    { clave: "coordTorneos", label: "Postular Torneos" },
    { clave: "coordSolicitudes", label: "Mis Solicitudes" },
    { clave: "feriados", label: "Feriados" },
    { clave: "directorio", label: "Establecimientos" },
  ],
  lector: [
    { clave: "lectorResumen", label: "Resumen" },
    { clave: "lectorEstudiantes", label: "Estudiantes" },
    { clave: "lectorAgenda", label: "Agenda" },
    { clave: "feriados", label: "Feriados" },
  ],
};

const PANELES = {
  inicio: () => CargarPanel(panelBienvenida),
  adminResumen: () => CargarPanel(panelAdminResumen),
  adminEstablecimientos: () => CargarPanel(panelAdminEstablecimientos),
  adminUsuarios: () => CargarPanel(panelAdminUsuarios),
  adminActividades: () => CargarPanel(panelAdminActividades),
  adminTorneos: () => CargarPanel(panelAdminTorneos),
  adminInscripciones: () => CargarPanel(panelAdminInscripciones),
  adminValoraciones: () => CargarPanel(panelAdminValoraciones),
  adminSolicitudes: () => CargarPanel(panelAdminSolicitudes),
  adminAgenda: () => CargarPanel(panelAdminAgenda),
  adminReportes: () => CargarPanel(panelAdminReportes),
  coordResumen: () => CargarPanel(panelCoordResumen),
  coordLectores: () => CargarPanel(panelCoordLectores),
  coordInscribir: () => CargarPanel(panelCoordInscribir),
  coordTorneos: () => CargarPanel(panelCoordTorneos),
  coordSolicitudes: () => CargarPanel(panelCoordSolicitudes),
  coordNomina: () => CargarPanel(panelCoordNomina),
  notificaciones: () => CargarPanel(panelNotificaciones),
  lectorResumen: () => CargarPanel(panelLectorResumen),
  lectorEstudiantes: () => CargarPanel(panelLectorEstudiantes),
  lectorAgenda: () => CargarPanel(panelAdminAgenda),
  feriados: () => CargarPanel(panelFeriados),
  directorio: () => CargarPanel(panelDirectorio),
};

async function panelBienvenida() {
  const u = API.usuario;
  contenido(
    `<div class="encabezado"><div><h2 class="pagina">Bienvenido/a, ${esc(u.nombre)}</h2><p class="muted">Perfil: ${esc(u.rol)}</p></div></div>
     <div class="tarjeta"><p>Seleccione una opcion del menu lateral para comenzar.</p></div>`
  );
}

// ============================================================
// PANELES: APIs EXTERNAS ABIERTAS
//  - Feriados de Chile (api.boostr.cl / api.roison.cl)
//  - Directorio Oficial de Establecimientos (Datos Abiertos MINEDUC)
// ============================================================
const MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatearFechaCL(iso) {
  const [a, m, d] = String(iso || "").split("-");
  if (!a || !m || !d) return iso || "";
  return `${d}/${m}/${a}`;
}

async function panelFeriados() {
  const anioActual = new Date().getFullYear();
  contenido(
    `<div class="encabezado"><h2 class="pagina">Feriados en Chile</h2></div>
     <div class="tarjeta">
       <p class="muted">Consulta los feriados legales de Chile para planificar el calendario de encuentros.</p>
       <div class="campo" style="max-width:200px"><label>Año</label><input type="number" id="fer-anio" min="2020" max="2030" value="${anioActual}"></div>
       <button class="btn btn-primario2" id="btn-fer-buscar">Consultar</button>
       <span class="muted" id="fer-fuente"></span>
     </div>
     <div id="fer-proximo"></div>
     <div id="fer-lista"></div>`
  );
  $("#btn-fer-buscar").onclick = () => { reiniciarPaginaUI("feriados"); cargarFeriados($("#fer-anio").value); };
  $("#fer-anio").addEventListener("keydown", (e) => { if (e.key === "Enter") { reiniciarPaginaUI("feriados"); cargarFeriados($("#fer-anio").value); } });
  cargarFeriados(anioActual);
}

async function cargarFeriados(anio) {
  const lista = $("#fer-lista");
  lista.innerHTML = `<div class="mensaje">Cargando feriados...</div>`;
  $("#fer-proximo").innerHTML = "";
  $("#fer-fuente").textContent = "";
  try {
    const r = await API.feriados(anio);
    const feriados = r.feriados || [];
    const hoy = new Date().toISOString().slice(0, 10);
    const proximo = feriados.find((f) => f.fecha >= hoy);
    $("#fer-fuente").textContent = feriados.length ? `Fuente: ${r.fuente}` : "";
    $("#fer-proximo").innerHTML = proximo
      ? `<div class="tarjeta"><span class="stat"><strong>Proximo feriado</strong><br>${esc(proximo.titulo)} - ${formatearFechaCL(proximo.fecha)}</span></div>`
      : "";
    if (!feriados.length) {
      lista.innerHTML = `<div class="tarjeta muted">Sin feriados para ${esc(anio)}.</div>`;
      return;
    }
    const porMes = {};
    const pagina = paginarUI(feriados, "feriados", 3);
    for (const f of pagina.items) {
      const m = Number(String(f.fecha).slice(5, 7));
      (porMes[m] = porMes[m] || []).push(f);
    }
    lista.innerHTML = Object.keys(porMes).sort((a, b) => a - b).map((m) =>
      `<div class="tarjeta"><h3>${MESES_ES[Number(m) - 1]}</h3>
        <table><thead><tr><th>Fecha</th><th>Feriado</th><th>Tipo</th><th>Irrenunciable</th></tr></thead>
        <tbody>${porMes[m].map((f) => `<tr>
          <td>${formatearFechaCL(f.fecha)}</td>
          <td>${esc(f.titulo)}</td>
          <td>${esc(f.tipo || "-")}</td>
          <td>${f.irrenunciable ? '<span class="badge-rol">Si</span>' : "-"}</td>
        </tr>`).join("")}</tbody></table>
      </div>`
    ).join("") + htmlPaginacion("feriados", pagina);
    conectarPaginacion(() => cargarFeriados(anio));
  } catch (err) {
    lista.innerHTML = mensajeError(err);
  }
}

async function panelDirectorio() {
  contenido(
    `<div class="encabezado"><h2 class="pagina">Establecimientos - Los Angeles</h2></div>
     <div class="tarjeta">
       <p class="muted">Establecimientos de la comuna de <strong>Los Angeles</strong> (Directorio Oficial, Datos Abiertos MINEDUC). Filtre por nombre o por RBD.</p>
       <div class="grid-2">
         <div class="campo"><label>Nombre</label><input type="text" id="dir-q" placeholder="Ej: Escuela"></div>
         <div class="campo"><label>RBD</label><input type="text" id="dir-rbd" placeholder="Ej: 4201"></div>
       </div>
       <button class="btn btn-primario2" id="btn-dir-buscar">Buscar</button>
       <button class="btn btn-mini" id="btn-dir-todos">Ver todos</button>
     </div>
     <div id="dir-resultados"></div>`
  );
  $("#btn-dir-buscar").onclick = () => { reiniciarPaginaUI("directorio"); buscarDirectorio(); };
  $("#btn-dir-todos").onclick = () => { $("#dir-q").value = ""; $("#dir-rbd").value = ""; reiniciarPaginaUI("directorio"); buscarDirectorio(); };
  $("#dir-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { reiniciarPaginaUI("directorio"); buscarDirectorio(); } });
  $("#dir-rbd").addEventListener("keydown", (e) => { if (e.key === "Enter") { reiniciarPaginaUI("directorio"); buscarDirectorio(); } });
  buscarDirectorio();
}

async function buscarDirectorio() {
  const q = $("#dir-q").value.trim();
  const rbd = $("#dir-rbd").value.trim();
  const cont = $("#dir-resultados");
  cont.innerHTML = `<div class="mensaje">Buscando...</div>`;
  try {
    const r = await API.directorio({ q, rbd });
    const lista = r.resultados || [];
    if (!lista.length) {
      cont.innerHTML = `<div class="tarjeta muted">Sin coincidencias en Los Angeles.</div>`;
      return;
    }
    const pagina = paginarUI(lista, "directorio");
    cont.innerHTML = `<div class="tarjeta">
      <p class="muted">${r.total} establecimiento(s) en ${esc(r.comuna || "Los Angeles")}.</p>
      <table>
      <thead><tr><th>RBD</th><th>Establecimiento</th><th>Dependencia</th><th>Direccion</th><th>Matricula</th></tr></thead>
      <tbody>${pagina.items.map((e) => `<tr>
        <td>${esc(e.rbd)}</td>
        <td>${esc(e.nombre)}</td>
        <td>${e.dependencia ? `<span class="badge-rol">${esc(e.dependencia)}</span>` : esc(e.tipoDependencia || "-")}</td>
        <td>${esc(e.direccion || "-")}</td>
        <td>${e.matricula || 0}</td>
      </tr>`).join("")}</tbody></table>
      ${htmlPaginacion("directorio", pagina)}</div>`;
    conectarPaginacion(buscarDirectorio);
  } catch (err) {
    cont.innerHTML = mensajeError(err);
  }
}

// ============================================================
// PANELES ADMIN
// ============================================================
// ============================================================
// Notificaciones: bloque reutilizable (coordinador y admin).
// ============================================================
const ICONO_NOTIF = { suspension: "&#128683;", reactivacion: "&#9989;", eliminacion: "&#128465;", requisitos: "&#128203;", finalizacion: "&#127942;" };
const TITULO_NOTIF = { suspension: "Torneo suspendido", reactivacion: "Torneo reactivado", eliminacion: "Torneo eliminado", requisitos: "Requisitos actualizados", finalizacion: "Torneo finalizado" };

// No existe el estado "leida": toda notificacion visible usa el color de
// pendiente. Lo unico que se puede hacer es quitarla del dashboard.
function notifTarjetaHtml(n) {
  const descartada = !!n.descartada;
  return `<div class="notif-tarjeta ${descartada ? "notif-descartada" : "notif-no-leida"}">
            <div class="notif-icono">${ICONO_NOTIF[n.tipo] || "&#128276;"}</div>
            <div class="notif-cuerpo">
              <div class="notif-titulo">${esc(TITULO_NOTIF[n.tipo] || "Notificacion")}</div>
              <div class="notif-msg">${esc(n.mensaje)}</div>
              <div class="notif-fecha muted">${new Date(n.fechaCreacion).toLocaleString("es-CL")}</div>
            </div>
            ${descartada
              ? `<button class="notif-restaurar" data-restaurar-notif="${n._id}" title="Devolver al dashboard">Restaurar</button>`
              : `<button class="notif-x" data-descartar-notif="${n._id}" title="Quitar del dashboard" aria-label="Quitar notificacion">&#10005;</button>`}
          </div>`;
}

function notifsHtml(lista) {
  if (!lista.length) return `<p class="muted">Sin notificaciones por ahora.</p>`;
  return lista.map(notifTarjetaHtml).join("");
}

// Enlaza la X, "Restaurar" y los botones de masa. `alRefrescar` se ejecuta al
// terminar para recargar el panel que contiene el bloque.
function notifsEnlazar(alRefrescar) {
  const recargar = async () => { await refrescarCampana(); alRefrescar(); };
  document.querySelectorAll("[data-descartar-notif]").forEach((b) => {
    b.onclick = async (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      try { await API.descartarNotificacion(b.dataset.descartarNotif); await recargar(); }
      catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
  document.querySelectorAll("[data-restaurar-notif]").forEach((b) => {
    b.onclick = async (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      try { await API.restaurarNotificacion(b.dataset.restaurarNotif); await recargar(); }
      catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
  const masa = [
    ["btn-descartar-notifs", () => API.descartarTodasNotificaciones()],
    ["btn-restaurar-notifs", () => API.restaurarTodasNotificaciones()],
  ];
  masa.forEach(([id, fn]) => {
    const b = document.getElementById(id);
    if (b) b.onclick = async () => {
      try { await fn(); await recargar(); } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
}

// Bloque del dashboard: todas las notificaciones pendientes, con la X.
// No se limita la cantidad: se muestran todas.
function bloqueNotificacionesHtml(lista, pendientes) {
  const enBandeja = lista.filter((n) => !n.descartada);
  const p = paginarUI(enBandeja, "coordNotifs");
  return `<div class="seccion notif-resumen">
        <h3>Notificaciones <span class="badge-rol">${pendientes}</span></h3>
        <div class="seccion">
          <button class="btn btn-notif" id="btn-descartar-notifs">Quitar todas</button>
          <button class="btn btn-notif" id="btn-ver-historial-notifs">Ver historial</button>
        </div>
        <div id="lista-notifs">${notifsHtml(p.items)}</div>
        ${htmlPaginacion("coordNotifs", p)}
      </div>`;
}

// ============================================================
// Panel de notificaciones: historial completo (bitacora).
// ============================================================
async function panelNotificaciones() {
  const r = await API.notificaciones();
  const todas = r.notificaciones || [];
  const descartadas = todas.filter((n) => n.descartada).length;
  const p = paginarUI(todas, "notifs");

  contenido(
    `<div class="encabezado">
       <h2 class="pagina">Notificaciones</h2>
       <p class="muted">Historial completo. Quitar una notificacion la saca del dashboard y del contador, pero queda registrada aqui.</p>
     </div>
     <div class="stats-fila">
       <div class="stat"><div class="num">${todas.length}</div><div class="lbl">En historial</div></div>
       <div class="stat"><div class="num">${r.pendientes || 0}</div><div class="lbl">En dashboard</div></div>
       <div class="stat"><div class="num">${descartadas}</div><div class="lbl">Quitadas</div></div>
     </div>
     <div class="seccion">
       <button class="btn btn-notif" id="btn-descartar-notifs">Quitar todas</button>
       <button class="btn btn-notif" id="btn-restaurar-notifs">Restaurar quitadas</button>
     </div>
     <div class="tarjeta">
       <div id="lista-notifs">${notifsHtml(p.items)}</div>
       ${htmlPaginacion("notifs", p)}
     </div>`
  );

  notifsEnlazar(() => CargarPanel(panelNotificaciones));
  conectarPaginacion(panelNotificaciones);
}

async function panelAdminResumen() {
  const [est, act, tor, sol] = await Promise.all([
    API.establecimientos().catch(() => []),
    API.actividades().catch(() => []),
    API.torneos().catch(() => []),
    API.solicitudes().catch(() => []),
  ]);

  const solicitudesPendientes = sol.filter((s) => s.estado === "en_proceso");

  const etiquetasEstado = {
    activo: { label: "Activo", clase: "est-activo" },
    en_curso: { label: "En curso", clase: "est-activo" },
    inscripciones: { label: "Inscripciones", clase: "est-inscripciones" },
    pausado: { label: "Pausado", clase: "est-pausado" },
    postergado: { label: "Postergado", clase: "est-postergado" },
    suspendido: { label: "Suspendido", clase: "est-suspendido" },
    cancelado: { label: "Cancelado", clase: "est-cancelado" },
    finalizado: { label: "Finalizado", clase: "est-finalizado" },
  };

  const haceUnMes = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cambiosRecientes = tor
    .filter((t) => {
      const ref = t.updatedAt || t.createdAt;
      return ref && new Date(ref).getTime() >= haceUnMes;
    })
    .sort((a, b) => new Date((b.updatedAt || b.createdAt)) - new Date((a.updatedAt || a.createdAt)));

  const formatearEstado = (estado) => {
    const e = etiquetasEstado[estado] || { label: estado, clase: "est-regular" };
    return `<span class="badge-estado-tor ${e.clase}">${esc(e.label)}</span>`;
  };
  const pCambios = paginarUI(cambiosRecientes, "adminCambios");

  contenido(
    `<h2 class="pagina">Resumen DAEM</h2>
     <div class="stats-fila">
       <div class="stat stat-clicable" data-ir="adminEstablecimientos" role="button" tabindex="0" title="Ir a Establecimientos">
         <div class="num">${est.length}</div><div class="lbl">Establecimientos</div>
       </div>
       <div class="stat stat-clicable" data-ir="adminActividades" role="button" tabindex="0" title="Ir a Actividades">
         <div class="num">${act.length}</div><div class="lbl">Actividades</div>
       </div>
       <div class="stat stat-clicable" data-ir="adminTorneos" role="button" tabindex="0" title="Ir a Torneos">
         <div class="num">${tor.length}</div><div class="lbl">Torneos</div>
       </div>
       <div class="stat stat-clicable" data-ir="adminSolicitudes" role="button" tabindex="0" title="Ir a Solicitudes">
         <div class="num">${solicitudesPendientes.length}</div><div class="lbl">Solicitudes Pend.</div>
       </div>
     </div>
     <div class="seccion">
       <button class="btn btn-primario2" id="btn-admin-sol">Solicitudes</button>
       <button class="btn btn-primario2" id="btn-admin-agenda">Agenda</button>
     </div>

     <h3 class="subtitulo-seccion">Cambios Recientes (ultimo mes)</h3>
     <div class="tarjeta">
       ${pCambios.items.length ? pCambios.items.map((t) => {
         const creadoRecientemente = t.createdAt && new Date(t.createdAt).getTime() >= haceUnMes;
         return `<div class="campo cambio-torneo">
           <strong>${esc(t.nombre)}</strong>
           <span class="badge-rol cambio-tipo ${creadoRecientemente ? "cambio-nuevo" : ""}">${creadoRecientemente ? "Nuevo" : "Modificado"}</span>
           ${formatearEstado(t.estado)}
           <p class="muted">${esc(t.actividad ? t.actividad.nombre : "-")} | ${esc(new Date((t.updatedAt || t.createdAt)).toLocaleDateString("es-CL"))}</p>
         </div>`;
}).join("") : "<p class='muted'>No hubo cambios de torneos en el ultimo mes.</p>"}
       ${htmlPaginacion("adminCambios", pCambios)}
      </div>`
  );

  conectarPaginacion(panelAdminResumen);
  document.querySelectorAll("[data-ir]").forEach((el) => {
    const ir = () => navegar(el.dataset.ir);
    el.onclick = ir;
    el.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); }
    };
  });
  $("#btn-admin-sol").onclick = () => navegar("adminSolicitudes");
  $("#btn-admin-agenda").onclick = () => navegar("adminAgenda");
}

// ============================================================
// DIRECTORIO MINEDUC + MIS ESTABLECIMIENTOS
// Dos listas alternables:
//  1) Directorio Oficial MINEDUC (solo Los Angeles, datos abiertos).
//  2) Establecimientos agregados por el usuario (CRUD completo).
// ============================================================
const DIRECTORIO_MENU = {
  vista: "mineduc", // "mineduc" | "mios"
  filtro: "",
  directorio: [],
  directorioError: false,
  mis: [],
  form: null, // { modo: "nuevo"|"editar", id, codigo, nombre, dependencia, direccion, contacto }
  paginaMineduc: 1,
  paginaMios: 1,
};

// Registros por pagina para las listas del modulo (evita scroll largo).
const DIRECTORIO_POR_PAGINA = 12;

function paginar(items, pagina, porPagina = DIRECTORIO_POR_PAGINA) {
  const total = items.length;
  const tamano = Math.max(1, Number(porPagina) || DIRECTORIO_POR_PAGINA);
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const actual = Math.min(Math.max(Number(pagina) || 1, 1), paginas);
  const inicio = (actual - 1) * tamano;
  return { total, paginas, actual, inicio, items: items.slice(inicio, inicio + tamano) };
}

function htmlPaginacion(prefijo, p) {
  if (p.paginas <= 1) return "";
  return `<div class="paginacion" style="display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn btn-mini" data-pag="${prefijo}" data-pagina="${p.actual - 1}" ${p.actual <= 1 ? "disabled" : ""}>Anterior</button>
      <span class="muted">Pagina ${p.actual} de ${p.paginas} (${p.inicio + 1}-${p.inicio + p.items.length} de ${p.total})</span>
      <button class="btn btn-mini" data-pag="${prefijo}" data-pagina="${p.actual + 1}" ${p.actual >= p.paginas ? "disabled" : ""}>Siguiente</button>
    </div>`;
}

// Paginacion compartida por todos los listados: 12 registros por pagina.
const PAGINAS_UI = {};

function paginaUI(clave) {
  return PAGINAS_UI[clave] || 1;
}

function paginarUI(items, clave, porPagina = DIRECTORIO_POR_PAGINA) {
  const p = paginar(items, paginaUI(clave), porPagina);
  PAGINAS_UI[clave] = p.actual;
  return p;
}

function reiniciarPaginaUI(clave) {
  PAGINAS_UI[clave] = 1;
}

// Enlaza todos los botones de paginacion del panel con su funcion de recarga.
function conectarPaginacion(recargar, raiz) {
  (raiz || document).querySelectorAll("[data-pag]").forEach((b) => {
    b.onclick = () => {
      PAGINAS_UI[b.dataset.pag] = Number(b.dataset.pagina) || 1;
      recargar();
    };
  });
}

function normalizarTexto(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function panelAdminEstablecimientos() {
  contenido(`<div class="mensaje">Cargando directorio MINEDUC...</div>`);
  const [directorio, mis] = await Promise.all([
    API.directorio({}).then((r) => r.resultados || []).catch(() => null),
    API.establecimientos(),
  ]);
  DIRECTORIO_MENU.directorio = directorio || [];
  DIRECTORIO_MENU.directorioError = directorio === null;
  DIRECTORIO_MENU.mis = mis;
  DIRECTORIO_MENU.vista = "mineduc";
  DIRECTORIO_MENU.filtro = "";
  DIRECTORIO_MENU.form = null;
  DIRECTORIO_MENU.paginaMineduc = 1;
  DIRECTORIO_MENU.paginaMios = 1;
  renderDirectorioPanel();
}

function renderDirectorioPanel() {
  const { vista, mis, form } = DIRECTORIO_MENU;
  const esMineduc = vista === "mineduc";
  contenido(
    `<div class="encabezado">
       <div>
         <h2 class="pagina">Establecimientos</h2>
         <p class="muted">Establecimientos de Los Ángeles y los que usted ha agregado.</p>
       </div>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         <button class="btn ${esMineduc ? "btn-primario2" : "btn-mini"}" id="dir-ver-mineduc">Establecimientos MINEDUC (${DIRECTORIO_MENU.directorio.length})</button>
         <button class="btn ${esMineduc ? "btn-mini" : "btn-primario2"}" id="dir-ver-mios">Mis establecimientos (${mis.length})</button>
         ${esMineduc ? "" : `<button class="btn btn-primario2" id="btn-nuevo-est">+ Nuevo</button>`}
       </div>
     </div>
     ${esMineduc ? htmlListaMineduc() : htmlListaMia(form)}`
  );

  $("#dir-ver-mineduc").onclick = () => {
    DIRECTORIO_MENU.vista = "mineduc";
    DIRECTORIO_MENU.form = null;
    renderDirectorioPanel();
  };
  $("#dir-ver-mios").onclick = () => {
    DIRECTORIO_MENU.vista = "mios";
    renderDirectorioPanel();
  };

  if (esMineduc) {
    const inp = $("#dir-filtro");
    if (inp) {
      inp.oninput = () => {
        DIRECTORIO_MENU.filtro = inp.value;
        DIRECTORIO_MENU.paginaMineduc = 1;
        pintarTablaMineduc();
      };
    }
    pintarTablaMineduc();
    return;
  }

  $("#btn-nuevo-est").onclick = () => abrirFormEstablecimiento(null);
  if ($("#dirf-cancelar")) {
    $("#dirf-cancelar").onclick = () => {
      DIRECTORIO_MENU.form = null;
      renderDirectorioPanel();
    };
  }
  if ($("#dirf-guardar")) $("#dirf-guardar").onclick = guardarFormEstablecimiento;

  // RBD: solo numeros, maximo 6 caracteres.
  const cod = $("#dirf-codigo");
  if (cod) {
    cod.addEventListener("input", () => {
      const limpio = cod.value.replace(/\D/g, "").slice(0, 6);
      if (cod.value !== limpio) cod.value = limpio;
    });
  }

  pintarTablaMios();
}

function htmlListaMineduc() {
  return `<div class="tarjeta">
      <p class="muted">Listado oficial de la comuna de <strong>Los Ángeles</strong> (Datos Abiertos MINEDUC). Busque por nombre o RBD y agregue el establecimiento a su lista.</p>
      <div class="campo" style="max-width:420px"><label>Buscar por nombre o RBD</label>
        <input type="text" id="dir-filtro" value="${esc(DIRECTORIO_MENU.filtro)}" placeholder="Ej: Escuela o 4201" autocomplete="off"></div>
    </div>
    <div id="dir-tabla"></div>`;
}

function pintarTablaMineduc() {
  const cont = $("#dir-tabla");
  if (!cont) return;
  if (DIRECTORIO_MENU.directorioError) {
    cont.innerHTML = `<div class="tarjeta muted">No se pudo cargar el listado MINEDUC. Revise la conexion e intente nuevamente.</div>`;
    return;
  }
  const texto = normalizarTexto(DIRECTORIO_MENU.filtro);
  const agregados = new Set(DIRECTORIO_MENU.mis.map((e) => String(e.codigo)));
  const lista = DIRECTORIO_MENU.directorio.filter((e) => {
    if (!texto) return true;
    return String(e.rbd).includes(texto) || normalizarTexto(e.nombre).includes(texto);
  });
  if (!lista.length) {
    cont.innerHTML = `<div class="tarjeta muted">Sin coincidencias en Establecimientos MINEDUC de Los Ángeles.</div>`;
    return;
  }
  const p = paginar(lista, DIRECTORIO_MENU.paginaMineduc);
  DIRECTORIO_MENU.paginaMineduc = p.actual;
  cont.innerHTML = `<div class="tarjeta">
      <p class="muted">${p.total} establecimiento(s) encontrado(s).</p>
      <table>
        <thead><tr><th>RBD</th><th>Establecimiento</th><th>Dependencia</th><th>Direccion</th><th>Matricula</th><th>Accion</th></tr></thead>
        <tbody>${p.items.map((e) => {
          const ya = agregados.has(String(e.rbd));
          return `<tr>
            <td>${esc(e.rbd)}</td>
            <td>${esc(e.nombre)}</td>
            <td>${e.dependencia ? `<span class="badge-rol">${esc(e.dependencia)}</span>` : esc(e.tipoDependencia || "-")}</td>
            <td>${esc(e.direccion || "-")}</td>
            <td>${e.matricula || 0}</td>
            <td><button class="btn btn-mini ${ya ? "" : "btn-ok"}" data-agregar-mineduc="${esc(e.rbd)}" ${ya ? "disabled" : ""}>${ya ? "Agregado" : "Agregar"}</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table>
      ${htmlPaginacion("mineduc", p)}
    </div>`;
  cont.querySelectorAll("[data-agregar-mineduc]").forEach((b) => {
    b.onclick = () => agregarDesdeMineduc(b.dataset.agregarMineduc);
  });
  cont.querySelectorAll('[data-pag="mineduc"]').forEach((b) => {
    b.onclick = () => {
      DIRECTORIO_MENU.paginaMineduc = Number(b.dataset.pagina);
      pintarTablaMineduc();
    };
  });
}

function htmlListaMia(form) {
  return `${form ? htmlFormEstablecimiento(form) : ""}
    <div class="tarjeta">
      <p class="muted">Establecimientos agregados por usted. Puede editarlos o eliminarlos.</p>
      <div id="mis-tabla"></div>
    </div>`;
}

function pintarTablaMios() {
  const cont = $("#mis-tabla");
  if (!cont) return;
  if (!DIRECTORIO_MENU.mis.length) {
    cont.innerHTML = `<p class="muted">Aun no ha agregado establecimientos. Use la lista de Establecimientos MINEDUC o el boton "+ Nuevo".</p>`;
    return;
  }
  const p = paginar(DIRECTORIO_MENU.mis, DIRECTORIO_MENU.paginaMios);
  DIRECTORIO_MENU.paginaMios = p.actual;
  cont.innerHTML = `<table>
       <thead><tr><th>RBD</th><th>Nombre</th><th>Dependencia</th><th>Direccion</th><th>Contacto</th><th>Acciones</th></tr></thead>
       <tbody>${p.items.map((e) => `<tr>
           <td>${esc(e.codigo)}</td>
           <td>${esc(e.nombre)}</td>
           <td>${esc(e.dependencia)}</td>
           <td>${esc(e.direccion || "-")}</td>
           <td>${esc(e.contacto || "-")}</td>
           <td style="white-space:nowrap">
             <button class="btn btn-mini" data-editar-est="${esc(e._id)}">Editar</button>
             <button class="btn btn-mini btn-err2" data-eliminar-est="${esc(e._id)}">Eliminar</button>
           </td>
         </tr>`).join("")}</tbody>
     </table>
     ${htmlPaginacion("mios", p)}`;

  cont.querySelectorAll("[data-editar-est]").forEach((b) => {
    b.onclick = () => abrirFormEstablecimiento(b.dataset.editarEst);
  });
  cont.querySelectorAll("[data-eliminar-est]").forEach((b) => {
    b.onclick = () => eliminarEstablecimientoUI(b.dataset.eliminarEst);
  });
  cont.querySelectorAll('[data-pag="mios"]').forEach((b) => {
    b.onclick = () => {
      DIRECTORIO_MENU.paginaMios = Number(b.dataset.pagina);
      pintarTablaMios();
    };
  });
}

function htmlFormEstablecimiento(form) {
  const esEditar = form.modo === "editar";
  const deps = CAT.dependencias && CAT.dependencias.length ? CAT.dependencias : ["Municipal", "Particular Subvencionado"];
  return `<div class="tarjeta">
      <h3>${esEditar ? "Editar establecimiento" : "Nuevo establecimiento"}</h3>
      <div class="grid-2">
        <div class="campo"><label>RBD (solo números, hasta 6)</label><input id="dirf-codigo" value="${esc(form.codigo || "")}" placeholder="Ej: 17791" inputmode="numeric" maxlength="6" autocomplete="off"></div>
        <div class="campo"><label>Nombre</label><input id="dirf-nombre" value="${esc(form.nombre || "")}"></div>
        <div class="campo"><label>Dependencia</label>
          <select id="dirf-dep">${deps.map((d) => `<option value="${esc(d)}" ${d === form.dependencia ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></div>
        <div class="campo"><label>Direccion</label><input id="dirf-dir" value="${esc(form.direccion || "")}"></div>
        <div class="campo"><label>Contacto</label><input id="dirf-contacto" value="${esc(form.contacto || "")}"></div>
      </div>
      <button class="btn btn-ok" id="dirf-guardar">Guardar</button>
      <button class="btn btn-mini" id="dirf-cancelar">Cancelar</button>
    </div>`;
}

function abrirFormEstablecimiento(id) {
  const est = id ? DIRECTORIO_MENU.mis.find((e) => String(e._id) === String(id)) : null;
  DIRECTORIO_MENU.vista = "mios";
  DIRECTORIO_MENU.form = est
    ? {
        modo: "editar",
        id: est._id,
        codigo: est.codigo,
        nombre: est.nombre,
        dependencia: est.dependencia,
        direccion: est.direccion || "",
        contacto: est.contacto || "",
      }
    : { modo: "nuevo", id: null, codigo: "", nombre: "", dependencia: (CAT.dependencias && CAT.dependencias[0]) || "Municipal", direccion: "", contacto: "" };
  renderDirectorioPanel();
}

async function guardarFormEstablecimiento() {
  const form = DIRECTORIO_MENU.form;
  if (!form) return;
  const datos = {
    codigo: $("#dirf-codigo").value.trim(),
    nombre: $("#dirf-nombre").value.trim(),
    dependencia: $("#dirf-dep").value,
    direccion: $("#dirf-dir").value.trim(),
    contacto: $("#dirf-contacto").value.trim(),
  };
  // El RBD debe ser numerico (1-6 digitos), sin letras ni simbolos.
  if (!/^\d{1,6}$/.test(datos.codigo)) {
    mostrarMensaje("El RBD debe tener solo numeros (1 a 6 digitos).", "error");
    return;
  // Validar que el RBD exista en el listado MINEDUC (solo al crear).
  if (form.modo !== "editar") {
    const existe = (DIRECTORIO_MENU.directorio || []).some((e) => String(e.rbd) === String(datos.codigo));
    if (!existe) {
      mostrarMensaje("El RBD no existe en el listado de Establecimientos MINEDUC.", "error");
      return;
    }
  }
  }
  try {
    if (form.modo === "editar") {
      await API.actualizarEstablecimiento(form.id, datos);
      mostrarMensaje("Establecimiento actualizado", "ok");
    } else {
      await API.crearEstablecimiento(datos);
      mostrarMensaje("Establecimiento agregado", "ok");
    }
    DIRECTORIO_MENU.form = null;
    DIRECTORIO_MENU.mis = await API.establecimientos();
    DIRECTORIO_MENU.paginaMios = 1;
    renderDirectorioPanel();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

async function agregarDesdeMineduc(rbd) {
  const item = DIRECTORIO_MENU.directorio.find((e) => String(e.rbd) === String(rbd));
  if (!item) return;
  try {
    await API.crearEstablecimiento({
      codigo: item.rbd,
      nombre: item.nombre,
      dependencia: item.dependencia || "Municipal",
      direccion: item.direccion || "",
    });
    mostrarMensaje(`"${item.nombre}" agregado`, "ok");
    DIRECTORIO_MENU.mis = await API.establecimientos();
    DIRECTORIO_MENU.paginaMios = 1;
    renderDirectorioPanel();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

async function eliminarEstablecimientoUI(id) {
  const est = DIRECTORIO_MENU.mis.find((e) => String(e._id) === String(id));
  if (!est) return;
  const ok = await confirmarMensaje(
    `Se eliminara "${est.nombre}" (${est.codigo}). Esta accion no se puede deshacer.`,
    "Eliminar establecimiento",
    "Eliminar",
    true
  );
  if (!ok) return;
  try {
    await API.eliminarEstablecimiento(est._id);
    mostrarMensaje("Establecimiento eliminado", "ok");
    if (DIRECTORIO_MENU.form && String(DIRECTORIO_MENU.form.id) === String(est._id)) DIRECTORIO_MENU.form = null;
    DIRECTORIO_MENU.mis = await API.establecimientos();
    renderDirectorioPanel();
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

async function panelAdminUsuarios() {
  const [usuarios, est] = await Promise.all([API.usuarios(), API.establecimientos()]);
  const opEst = est.map((e) => ({ valor: String(e._id), texto: `${e.codigo} - ${e.nombre}` }));
  contenido(
    `<div class="encabezado"><h2 class="pagina">Usuarios</h2><button class="btn btn-primario2" id="btn-nuevo-usr">+ Nuevo</button></div>
     <div id="form-nuevo-usr" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>RUT</label><input id="usr-rut"></div>
         <div class="campo"><label>Nombre</label><input id="usr-nombre"></div>
         <div class="campo"><label>Rol</label><select id="usr-rol"><option value="coordinador">Coordinador</option><option value="lector">Lector</option></select></div>
         <div class="campo"><label>Clave</label><input id="usr-clave"></div>
         <div class="campo"><label>Correo</label><input id="usr-correo" type="email"></div>
         <div class="campo"><label>Establecimiento</label>
           ${comboHtml("usr-est-txt", "Buscar establecimiento...")}<input type="hidden" id="usr-est"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-usr">Guardar</button>
     </div>
     <div id="form-editar-usr" class="tarjeta oculta">
       <h3>Editar usuario</h3>
       <div class="grid-2">
         <div class="campo"><label>RUT</label><input id="usr-edit-rut" readonly></div>
         <div class="campo"><label>Nombre</label><input id="usr-edit-nombre"></div>
         <div class="campo"><label>Rol</label><select id="usr-edit-rol"><option value="admin">Admin</option><option value="coordinador">Coordinador</option><option value="lector">Lector</option></select></div>
         <div class="campo"><label>Correo</label><input id="usr-edit-correo" type="email"></div>
         <div class="campo"><label>Establecimiento</label>
           ${comboHtml("usr-edit-est-txt", "Buscar establecimiento...")}<input type="hidden" id="usr-edit-est"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-edit-usr">Guardar cambios</button>
       <button class="btn btn-mini" id="btn-cancelar-edit-usr">Cancelar</button>
     </div>
     <div class="act-buscador">
       <input id="buscador-usr" type="search" placeholder="Buscar por nombre, RUT, rol o establecimiento..." aria-label="Buscar usuario">
       <select id="filtro-rol-usr" class="buscador-select" aria-label="Filtrar por rol">
         <option value="">Todos los roles</option>
         <option value="admin">Admin</option>
         <option value="coordinador">Coordinador</option>
         <option value="lector">Lector</option>
       </select>
       <select id="filtro-est-usr" class="buscador-select" aria-label="Filtrar por establecimiento">
         <option value="">Todos los establecimientos</option>
         ${est.map((e) => `<option value="${e._id}">${esc(e.codigo)} - ${esc(e.nombre)}</option>`).join("")}
       </select>
       <span id="cont-usr" class="act-buscador-contador">0 usuarios</span>
     </div>
     <p id="usr-sin-resultados" class="muted oculta" style="padding:14px">No se encontraron usuarios.</p>
     <div class="tarjeta"><div id="usr-tabla"></div></div>`
  );
  $("#btn-nuevo-usr").onclick = () => $("#form-nuevo-usr").classList.toggle("oculta");
  initCombo("usr-est-txt", opEst, (o) => { $("#usr-est").value = o.valor; }, "Buscar establecimiento...");
  $("#btn-guardar-usr").onclick = async () => {
    try {
      await API.crearUsuario({
        rut: $("#usr-rut").value, nombre: $("#usr-nombre").value, rol: $("#usr-rol").value,
        clave: $("#usr-clave").value, email: $("#usr-correo").value, establecimiento: $("#usr-est").value,
      });
      panelAdminUsuarios();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  let usrEditandoId = null;
  initCombo("usr-edit-est-txt", opEst, (o) => { $("#usr-edit-est").value = o.valor; }, "Buscar establecimiento...");
  $("#btn-cancelar-edit-usr").onclick = () => {
    usrEditandoId = null;
    $("#form-editar-usr").classList.add("oculta");
  };
  $("#btn-guardar-edit-usr").onclick = async () => {
    if (!usrEditandoId) return;
    try {
      await API.actualizarUsuario(usrEditandoId, {
        nombre: $("#usr-edit-nombre").value,
        rol: $("#usr-edit-rol").value,
        email: $("#usr-edit-correo").value,
        establecimiento: $("#usr-edit-est").value,
      });
      mostrarMensaje("Usuario actualizado", "ok");
      panelAdminUsuarios();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  const normUsr = (v) => String(v || "").toLowerCase().trim();
  const renderUsuarios = () => {
    const q = normUsr($("#buscador-usr").value);
    const r = $("#filtro-rol-usr").value;
    const e = $("#filtro-est-usr").value;
    const lista = usuarios.filter((u) => {
      const estId = u.establecimiento ? String(u.establecimiento._id || u.establecimiento) : "";
      const texto = normUsr([
        u.nombre, u.rut, u.rol, u.email,
        u.establecimiento ? (u.establecimiento.nombre || "") : "",
        u.establecimiento ? (u.establecimiento.codigo || "") : "",
      ].join(" "));
      return (!q || texto.includes(q)) && (!r || u.rol === r) && (!e || estId === e);
    });
    const p = paginarUI(lista, "usuarios");
    $("#usr-tabla").innerHTML = `<table><thead><tr><th>RUT</th><th>Nombre</th><th>Rol</th><th>Establecimiento</th><th>Correo</th><th>Acciones</th></tr></thead>
      <tbody>${p.items.length
        ? p.items.map((u) => `<tr>
        <td>${esc(u.rut)}</td><td>${esc(u.nombre)}</td><td>${esc(u.rol)}</td><td>${esc(u.establecimiento ? (u.establecimiento.nombre || u.establecimiento) : "-")}</td><td>${esc(u.email || "-")}</td>
        <td><button class="btn btn-mini" data-edit-usr="${esc(u._id)}">Editar</button> <button class="btn btn-err2 btn-mini" data-elim-usr="${esc(u._id)}" ${u._id === (API.usuario && API.usuario._id) ? "disabled" : ""}>Eliminar</button></td></tr>`).join("")
        : `<tr><td colspan="6" class="muted">Sin usuarios.</td></tr>`}</tbody></table>
      ${htmlPaginacion("usuarios", p)}`;
    document.querySelectorAll("[data-elim-usr]").forEach((b) => {
      b.onclick = async () => {
        const fila = b.closest("tr");
        const nombre = fila ? fila.querySelectorAll("td")[1].textContent.trim() : "";
        const si = await confirmarMensaje(`¿Eliminar al usuario ${nombre ? `"${nombre}" ` : ""}? Esta accion no se puede deshacer.`, "Eliminar usuario", "Eliminar", true);
        if (!si) return;
        try {
          await API.eliminarUsuario(b.dataset.elimUsr);
          panelAdminUsuarios();
        } catch (err) { mostrarMensaje(err.message, "error"); }
      };
    });
    document.querySelectorAll("[data-edit-usr]").forEach((b) => {
      b.onclick = () => {
        const u = usuarios.find((x) => String(x._id) === String(b.dataset.editUsr));
        if (!u) return;
        usrEditandoId = u._id;
        $("#usr-edit-rut").value = u.rut || "";
        $("#usr-edit-nombre").value = u.nombre || "";
        $("#usr-edit-rol").value = u.rol || "lector";
        $("#usr-edit-correo").value = u.email || "";
        const estId = u.establecimiento ? String(u.establecimiento._id || u.establecimiento) : "";
        $("#usr-edit-est").value = estId;
        const estObj = est.find((e) => String(e._id) === estId);
        $("#usr-edit-est-txt").value = estObj ? `${estObj.codigo} - ${estObj.nombre}` : "";
        $("#form-editar-usr").classList.remove("oculta");
        $("#form-editar-usr").scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    conectarPaginacion(renderUsuarios);
    const aviso = document.getElementById("usr-sin-resultados");
    if (aviso) aviso.classList.toggle("oculta", !((q || r || e) && lista.length === 0));
    const contador = document.getElementById("cont-usr");
    if (contador) contador.textContent = lista.length + " usuario(s)";
  };
  const buscarUsr = () => { reiniciarPaginaUI("usuarios"); renderUsuarios(); };
  $("#buscador-usr").addEventListener("input", buscarUsr);
  $("#filtro-rol-usr").addEventListener("change", buscarUsr);
  $("#filtro-est-usr").addEventListener("change", buscarUsr);
  renderUsuarios();
}

let __actEditando = null;

function categoriasATexto(categorias) {
  return (categorias || [])
    .map((c) => {
      const nombre = String(c.nombre || "").trim();
      const subs = (c.subcategorias || []).map((s) => String(s || "").trim()).filter(Boolean);
      return subs.length ? `${nombre} > ${subs.join(", ")}` : nombre;
    })
    .join("\n");
}

function textoACategorias(texto) {
  return String(texto || "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const [nombreRaw, subsRaw] = linea.split(">");
      const nombre = String(nombreRaw || "").trim();
      if (!nombre) return null;
      const subcategorias = String(subsRaw || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return { nombre, subcategorias };
    })
    .filter(Boolean);
}

async function panelAdminActividades() {
  const [act, ins, secs] = await Promise.all([
    API.actividades(),
    API.inscripciones(),
    API.secciones().catch(() => []),
  ]);
  const secPorId = {};
  secs.forEach((s) => { secPorId[s._id] = s; });
  const porAct = {};
  ins.forEach((i) => {
    if (!i || i.estado === "rechazada") return;
    const id = i.actividad ? String(i.actividad._id || i.actividad) : null;
    if (!id) return;
    porAct[id] = porAct[id] || {};
    const div = i.division || "Sin categoria";
    porAct[id][div] = porAct[id][div] || { total: 0, varones: 0, damas: 0 };
    (i.alumnos || []).forEach((al) => {
      porAct[id][div].total += 1;
      if (al.genero === "M") porAct[id][div].varones += 1;
      else if (al.genero === "F") porAct[id][div].damas += 1;
    });
  });

  const nombresCategorias = (a) => {
    if (a.categorias && a.categorias.length) return a.categorias.map((c) => c.nombre);
    return (a.divisiones || []).length ? a.divisiones : [];
  };
  const filasDesglose = (a, idA) => {
    const nombres = nombresCategorias(a);
    if (!nombres.length) {
      return `<tr><td>Sin categorias</td><td class="act-num">0</td><td class="act-num">0</td><td class="act-num">0</td></tr>`;
    }
    return nombres.map((nombreCat) => {
      const d = porAct[idA] && porAct[idA][nombreCat];
      const total = d ? d.total : 0;
      const varones = d ? d.varones : 0;
      const damas = d ? d.damas : 0;
      const cat = (a.categorias || []).find((c) => c.nombre === nombreCat);
      const subs = cat && cat.subcategorias && cat.subcategorias.length
        ? ` <span class="muted">(${esc(cat.subcategorias.join(" / "))})</span>` : "";
      return `<tr><td><strong>${esc(nombreCat)}</strong>${subs}</td><td class="act-num">${total}</td><td class="act-num">${varones}</td><td class="act-num">${damas}</td></tr>`;
    }).join("");
  };
  const totalesFila = (a, idA) => {
    const nombres = nombresCategorias(a);
    let t = 0, v = 0, d = 0;
    nombres.forEach((n) => {
      const c = porAct[idA] && porAct[idA][n];
      if (c) { t += c.total; v += c.varones; d += c.damas; }
    });
    return `<tr class="act-fila-tot"><td>Total</td><td class="act-num">${t}</td><td class="act-num">${v}</td><td class="act-num">${d}</td></tr>`;
  };
  const renderCategorias = (a) => {
    if (a.categorias && a.categorias.length) {
      return a.categorias
        .map((c) => {
          const subs = (c.subcategorias || []).join(" / ");
          return `<strong>${esc(c.nombre)}</strong>${subs ? ` <span class="muted">(${esc(subs)})</span>` : ""}`;
        })
        .join(" · ");
    }
    return esc((a.divisiones || []).join(", ") || "-");
  };

  const actConvSeccion = act.map((a) => ({
    ...a,
    seccionNombre: a.seccion && secPorId[a.seccion] ? secPorId[a.seccion].nombre : "Sin sección",
  }));

  const estadoAct = { q: "" };

  contenido(
    `<div class="encabezado"><h2 class="pagina">Actividades</h2>
       <button class="btn btn-primario2" id="btn-nuevo-act">+ Nueva</button>
       <button class="btn btn-mini" id="btn-nueva-area">+ Área</button>
       <button class="btn btn-mini" id="btn-seccion-act">+ Sección</button></div>

     <div class="act-buscador">
       <input id="buscador-acts" type="search" placeholder="Buscar actividad por nombre..." aria-label="Buscar actividad">
       <span id="cont-acts" class="act-buscador-contador">0 actividades</span>
     </div>
     <p id="act-sin-resultados" class="muted oculta" style="padding:14px">No se encontraron actividades con ese nombre.</p>

     <div id="form-nuevo-act" class="tarjeta oculta">
       <h3 id="act-form-titulo">Nueva actividad</h3>
       <div class="grid-2">
         <div class="campo"><label>Nombre</label><input id="act-nombre"></div>
         <div class="campo"><label>Area</label><select id="act-area">${(CAT.areas || []).map((a) => `<option>${esc(a)}</option>`).join("")}</select></div>
         <div class="campo"><label>Seccion</label>
           <select id="act-seccion"><option value="">Sin seccion</option>${secs.map((s) => `<option value="${s._id}">${esc(s.nombre)}</option>`).join("")}</select></div>
       </div>
       <div class="campo"><label>Categorias y subcategorias (una por linea: "Categoria > Sub1, Sub2")</label>
         <textarea id="act-categorias" rows="4" placeholder="SUB 13 > Damas, Varones"></textarea></div>
       <div class="grid-2">
         <div class="campo"><label>Recintos (separados por coma)</label><input id="act-recintos" placeholder="Cancha 1, Polideportivo"></div>
         <div class="campo"><label>Limite de inscritos (0 = sin limite)</label><input type="number" id="act-limite" value="0" min="0"></div>
         <div class="campo"><label>Estado</label><select id="act-estado">
           <option value="publicada">Publicada</option>
           <option value="en_inscripcion">En inscripcion</option>
           <option value="cerrada">Cerrada</option></select></div>
         <div class="campo"><label>Apertura inscripciones</label><input type="date" id="act-apertura"></div>
         <div class="campo"><label>Cierre inscripciones</label><input type="date" id="act-cierre"></div>
         <div class="campo"><label>Edad minima (opcional)</label><input type="number" id="act-edad-min" value="" min="0" max="120" placeholder="6"></div>
         <div class="campo"><label>Edad maxima (opcional)</label><input type="number" id="act-edad-max" value="" min="0" max="120" placeholder="18"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-act">Guardar</button>
       <button class="btn btn-mini" id="btn-cancelar-act">Cancelar</button>
     </div>

     <div id="act-lista"></div>`
  );

  const renderListaActividades = () => {
    const q = estadoAct.q.trim().toLowerCase();
    const filtradas = q
      ? actConvSeccion.filter((a) => String(a.nombre || "").toLowerCase().includes(q))
      : actConvSeccion;
    const p = paginarUI(filtradas, "actividades");
    const grupos = [];
    secs.forEach((s) => {
      const items = p.items.filter((a) => String(a.seccion) === String(s._id));
      if (items.length) grupos.push({ seccion: s.nombre, items });
    });
    const libres = p.items.filter((a) => !a.seccion);
    if (libres.length) grupos.push({ seccion: "Sin sección", items: libres });

    $("#act-lista").innerHTML = grupos.length
      ? grupos.map((g, gi) => `
        <div class="tarjeta sec-tarjeta">
         <button type="button" class="sec-titulo" data-toggle-sec="${gi}" aria-expanded="false">
           <span class="act-chevron">&#9656;</span><span class="sec-nombre-titulo">${esc(g.seccion)}</span>
           <span class="badge-rol">${g.items.length} ${g.items.length === 1 ? "actividad" : "actividades"}</span>
         </button>
         <div class="sec-desg oculta" id="sec-det-${gi}">
         ${g.items.map((a) => {
           const idA = String(a._id);
           const ahora = new Date();
           const abierta = a.estado === "en_inscripcion" || a.estado === "publicada";
           const inicio = a.fechaAperturaInscripcion ? new Date(a.fechaAperturaInscripcion) : null;
           const fin = a.fechaCierreInscripcion ? new Date(a.fechaCierreInscripcion) : null;
           const dentroVentana = (!inicio || ahora >= inicio) && (!fin || ahora <= fin);
           const estadoIns = (abierta && dentroVentana) ? "Inscripciones Abiertas" : "Cerrada";
           return `<div class="tarjeta act-tarjeta">
            <button type="button" class="act-titulo" data-toggle="${idA}" aria-expanded="false">
              <span class="act-chevron">&#9656;</span><span class="act-nombre-titulo">${esc(a.nombre)}</span> <span class="badge-rol">${esc(a.area)}</span>
            </button>
            <div class="act-desg oculta" id="act-det-${idA}">
              <div class="act-grid">
                <div class="act-campo"><span class="act-label">Categorias</span><span>${renderCategorias(a)}</span></div>
                <div class="act-campo"><span class="act-label">Seccion</span><span>${esc(a.seccionNombre)}</span></div>
                <div class="act-campo"><span class="act-label">Recintos</span><span>${esc((a.recintos || []).join(", ") || "-")}</span></div>
                <div class="act-campo"><span class="act-label">Estado</span><span>${esc(a.estado)}</span></div>
                <div class="act-campo"><span class="act-label">Limite inscritos</span><span>${a.limiteInscritos ? a.limiteInscritos : "Sin limite"}</span></div>
                ${(a.edadMinima || a.edadMaxima) ? `<div class="act-campo"><span class="act-label">Edad</span><span>${a.edadMinima ?? "?"}-${a.edadMaxima ?? "?"} anios</span></div>` : ""}
              </div>
              <div class="act-desglose">
                <h4 class="act-labdesg">Estudiantes por categoria</h4>
                <table class="tabla-desglose">
                  <thead><tr><th>Categoria</th><th>Total</th><th>Varones</th><th>Damas</th></tr></thead>
                  <tbody>${filasDesglose(a, idA)}${totalesFila(a, idA)}</tbody>
                </table>
              </div>
              <p class="muted act-fila"><span class="estado ${dentroVentana ? "est-activo" : "est-cancelado"}">${estadoIns}</span>
              ${inicio ? ` Apertura: ${inicio.toLocaleDateString("es-CL")}` : ""}${fin ? ` | Cierre: ${fin.toLocaleDateString("es-CL")}` : ""}</p>
<div class="seccion">
                <button class="btn btn-mini" data-editar-act="${idA}">Editar</button>
                <button class="btn btn-mini btn-peligro" data-eliminar-act="${idA}">Eliminar</button>
              </div>
            </div>
          </div>`;
         }).join("")}
         </div>
       </div>`).join("") + htmlPaginacion("actividades", p)
      : `<div class="tarjeta"><p class="muted">Sin actividades para mostrar.</p></div>`;

    document.querySelectorAll(".sec-titulo").forEach((b) => {
      b.onclick = () => {
        const det = document.getElementById(`sec-det-${b.dataset.toggleSec}`);
        const abierto = !det.classList.contains("oculta");
        det.classList.toggle("oculta", abierto);
        b.setAttribute("aria-expanded", String(!abierto));
        b.querySelector(".act-chevron").textContent = abierto ? "▸" : "▾";
      };
    });
    document.querySelectorAll(".act-titulo").forEach((b) => {
      b.onclick = () => {
        const det = document.getElementById(`act-det-${b.dataset.toggle}`);
        const abierto = !det.classList.contains("oculta");
        det.classList.toggle("oculta", abierto);
        b.setAttribute("aria-expanded", String(!abierto));
        b.querySelector(".act-chevron").textContent = abierto ? "▸" : "▾";
      };
    });
    document.querySelectorAll("[data-editar-act]").forEach((b) => {
      b.onclick = () => {
        const a = act.find((x) => String(x._id) === String(b.dataset.editarAct));
        if (!a) return;
        abrirFormActividad(a);
      };
    });
    document.querySelectorAll("[data-eliminar-act]").forEach((b) => {
      b.onclick = async () => {
        if (!await confirmarMensaje("Seguro que desea eliminar esta actividad?")) return;
        try {
          await API.eliminarActividad(b.dataset.eliminarAct);
          panelAdminActividades();
        } catch (err) { mostrarMensaje(err.message, "error"); }
      };
    });
    conectarPaginacion(renderListaActividades);

    const aviso = document.getElementById("act-sin-resultados");
    if (aviso) aviso.classList.toggle("oculta", !(q && filtradas.length === 0));
    const contador = document.getElementById("cont-acts");
    if (contador) contador.textContent = filtradas.length + " actividad(es)";
  };

  const buscarAct = () => {
    estadoAct.q = $("#buscador-acts").value || "";
    reiniciarPaginaUI("actividades");
    renderListaActividades();
  };
  $("#buscador-acts").addEventListener("input", buscarAct);
  renderListaActividades();


  $("#btn-nuevo-act").onclick = () => { abrirFormActividad(null); };
  $("#btn-nueva-area").onclick = async () => {
    const nombre = prompt("Nombre de la nueva area:");
    if (!nombre) return;
    try {
      await API.agregarArea(nombre.trim());
      await cargarCatalogos();
      panelAdminActividades();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  $("#btn-seccion-act").onclick = async () => {
    const nombre = prompt("Nombre de la nueva seccion:");
    if (!nombre) return;
    const area = prompt("Area (Competitivo, Amistoso o Artístico Cultural):");
    try {
      await API.crearSeccion({ nombre, area });
      panelAdminActividades();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  $("#btn-cancelar-act").onclick = () => {
    __actEditando = null;
    document.getElementById("form-nuevo-act").classList.add("oculta");
  };
  $("#btn-guardar-act").onclick = async () => {
    try {
      const datos = {
        nombre: $("#act-nombre").value,
        area: $("#act-area").value,
        seccion: $("#act-seccion").value || null,
        categorias: textoACategorias($("#act-categorias").value),
        recintos: $("#act-recintos").value.split(",").map((s) => s.trim()).filter(Boolean),
        limiteInscritos: Number($("#act-limite").value) || 0,
        estado: $("#act-estado").value,
        fechaAperturaInscripcion: $("#act-apertura").value || null,
        fechaCierreInscripcion: $("#act-cierre").value || null,
        edadMinima: $("#act-edad-min").value ? Number($("#act-edad-min").value) : null,
        edadMaxima: $("#act-edad-max").value ? Number($("#act-edad-max").value) : null,
        encuentros: [],
      };
      if (__actEditando) {
        delete datos.encuentros;
        await API.actualizarActividad(__actEditando, datos);
      } else {
        await API.crearActividad(datos);
      }
      __actEditando = null;
      panelAdminActividades();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
}

function abrirFormActividad(a) {
  const form = document.getElementById("form-nuevo-act");
  document.getElementById("act-form-titulo").textContent = a ? `Editar: ${a.nombre}` : "Nueva actividad";
  $("#act-nombre").value = a ? a.nombre : "";
  $("#act-area").value = a ? a.area : (CAT.areas && CAT.areas[0]);
  $("#act-seccion").value = a && a.seccion ? String(a.seccion) : "";
  $("#act-categorias").value = a ? categoriasATexto(a.categorias) : "";
  $("#act-recintos").value = a ? (a.recintos || []).join(", ") : "";
  $("#act-limite").value = a && a.limiteInscritos ? a.limiteInscritos : 0;
  $("#act-estado").value = a ? a.estado : "publicada";
  $("#act-apertura").value = a && a.fechaAperturaInscripcion ? String(a.fechaAperturaInscripcion).slice(0, 10) : "";
  $("#act-cierre").value = a && a.fechaCierreInscripcion ? String(a.fechaCierreInscripcion).slice(0, 10) : "";
  $("#act-edad-min").value = a && a.edadMinima != null ? a.edadMinima : "";
  $("#act-edad-max").value = a && a.edadMaxima != null ? a.edadMaxima : "";
  __actEditando = a ? String(a._id) : null;
  form.classList.remove("oculta");
  form.scrollIntoView({ behavior: "smooth" });
}

async function panelHistorialTorneos() {
  const todos = await API.torneos();
  const finalizados = todos.filter((t) => t.estado === "finalizado");
  const pagina = paginarUI(finalizados, "histTorneos");
  const porAnio = {};
  pagina.items.forEach((t) => {
    (porAnio[t.anio] = porAnio[t.anio] || []).push(t);
  });
  const anios = Object.keys(porAnio).sort((a, b) => b - a);

  const campeonDe = async (t) => {
    try {
      const llaves = await API.llaves(t._id);
      if (!llaves || !llaves.length) return null;
      const elim = llaves.filter((l) => l.nivel >= 1);
      if (!elim.length) return null;
      const maxNivel = Math.max(...elim.map((l) => l.nivel));
      const final = elim.find((l) => l.nivel === maxNivel) || elim[0];
      if (!final || !final.ganador) return null;
      const eq = (final.equipos || []).find((e) => e && (String(e._id) === String(final.ganador._id || final.ganador)));
      return eq ? eq.nombre : null;
    } catch {
      return null;
    }
  };

  const bloques = [];
  for (const anio of anios) {
    const filas = [];
    for (const t of porAnio[anio]) {
      const campeon = await campeonDe(t);
      filas.push(`<div class="tarjeta hist-tarjeta" id="hist-card-${t._id}">
        <h3>${esc(t.nombre)} <span class="badge-rol badge-formato-${t.formato === "competitivo" ? "competitivo" : "amistoso"}">${esc(t.formato === "competitivo" ? "Competitivo" : "Amistoso")}</span></h3>
        <p class="muted">Actividad: ${esc(t.actividad ? t.actividad.nombre : "-")} | Categoria: ${esc(t.division || "Sin categoria")}</p>
        <p><strong>Campeon:</strong> ${campeon ? esc(campeon) : "Sin registro de final"}</p>
        <div class="seccion"><button class="btn btn-mini" data-det-hist="${t._id}">Detalles</button><button class="btn btn-mini" data-mapa-hist="${t._id}" data-nombre="${esc(t.nombre)}">Ver Mapa del Torneo</button></div>
        <div class="hist-detalle oculto" id="hist-det-${t._id}"></div></div>`);
    }
    bloques.push(`<h3 class="hist-anio">Historial ${anio}</h3>${filas.join("")}`);
  }

  contenido(
    `<div class="encabezado"><h2 class="pagina">Historial de Torneos</h2><button class="btn btn-primario2" id="btn-volver-historial">Volver</button></div>
     <div class="encabezado-botones"></div>
     ${anios.length ? bloques.join("") + htmlPaginacion("histTorneos", pagina) : `<div class="tarjeta"><p class="muted">Aun no hay torneos finalizados.</p></div>`}`
  );
  conectarPaginacion(panelHistorialTorneos);
  $("#btn-volver-historial").onclick = () => CargarPanel(panelAdminTorneos);
  document.querySelectorAll("[data-det-hist]").forEach((b) => {
    b.onclick = () => toggleDetalleHistorial(b.dataset.detHist, b);
  });
  document.querySelectorAll("[data-mapa-hist]").forEach((b) => {
    b.onclick = () => abrirMapaTorneo(b.dataset.mapaHist, b.dataset.nombre).catch((err) => mostrarMensaje(err.message, "error"));
  });
}

// Desglose de un torneo finalizado: ranking de equipos con sus goles,
// y a la derecha los establecimientos con mas participantes inscritos.
// Se despliega dentro de la tarjeta del historial (sin cambiar de pantalla).
async function toggleDetalleHistorial(torneoId, boton) {
  const cont = document.getElementById(`hist-det-${torneoId}`);
  if (!cont) return;
  if (!cont.classList.contains("oculta")) {
    cont.classList.add("oculta");
    cont.innerHTML = "";
    boton.textContent = "Detalles";
    boton.disabled = false;
    return;
  }
  // Bloquea el boton mientras carga: evita que un segundo clic lo oculte
  // antes de que lleguen los datos. El panel sigue oculto hasta tener
  // contenido, para que no se vea una linea "cortada" sin desglose.
  boton.textContent = "Cargando...";
  boton.disabled = true;
  const [llaves, equipos, tabla] = await Promise.all([
    API.llaves(torneoId).catch(() => []),
    API.equipos(torneoId).catch(() => []),
    API.tabla(torneoId).catch(() => []),
  ]);

  // ---- Goles por equipo (suma de puntajes a favor en cada partida). ----
  const goleadores = {};
  llaves.forEach((l) => {
    if (l.bye || l.estado !== "jugado") return;
    (l.equipos || []).forEach((eq, i) => {
      if (!eq) return;
      const id = String(eq._id || eq);
      if (!goleadores[id]) goleadores[id] = { goles: 0, partidos: 0, ganados: 0, perdidos: 0, empatados: 0 };
      const p = i === 0 ? l.puntajeA : l.puntajeB;
      const rival = i === 0 ? l.puntajeB : l.puntajeA;
      if (p == null || rival == null) return;
      goleadores[id].goles += p;
      goleadores[id].partidos += 1;
      if (p > rival) goleadores[id].ganados += 1;
      else if (p < rival) goleadores[id].perdidos += 1;
      else goleadores[id].empatados += 1;
    });
  });

  // ---- Jerarquia: campeon (final) > finalista > resto por orden de tabla. ----
  const elim = llaves.filter((l) => l.nivel >= 1 && l.estado === "jugado" && l.ganador);
  const jerarquia = {};
  if (elim.length) {
    const maxNivel = Math.max(...elim.map((l) => l.nivel));
    const final = elim.find((l) => l.nivel === maxNivel);
    if (final) {
      const g = String(final.ganador._id || final.ganador);
      jerarquia[g] = 1;
      (final.equipos || []).forEach((eq) => {
        if (!eq) return;
        const id = String(eq._id || eq);
        if (id === g) return;
        jerarquia[id] = 2;
      });
    }
  }
  const tablaEq = ((tabla || [])[0] || {}).tabla || [];
  const ordenTabla = {};
  tablaEq.forEach((f, i) => {
    if (f.equipo) ordenTabla[String(f.equipo._id || f.equipo)] = i;
  });

  const equiposOrd = equipos.slice().sort((a, b) => {
    const ia = jerarquia[String(a._id)] || 99;
    const ib = jerarquia[String(b._id)] || 99;
    if (ia !== ib) return ia - ib;
    const ga = goleadores[String(a._id)] || { goles: 0 };
    const gb = goleadores[String(b._id)] || { goles: 0 };
    if (ga.goles !== gb.goles) return gb.goles - ga.goles;
    return String(a.nombre || "").localeCompare(String(b.nombre || ""));
  });

  const medals = { 1: "&#129351;", 2: "&#129354;", 3: "&#129353;" };
  const tablaOrd = (id) => {
    const idx = ordenTabla[String(id)];
    return Number.isInteger(idx) ? idx : null;
  };
  const filasEquipos = equiposOrd.map((eq, i) => {
    const g = goleadores[String(eq._id)] || { goles: 0, partidos: 0, ganados: 0, perdidos: 0, empatados: 0 };
    const pos = jerarquia[String(eq._id)] || (tablaOrd(eq._id) != null ? tablaOrd(eq._id) + 1 : i + 1);
    const integrantes = (eq.alumnos || []).map((a) => esc(a.nombre)).join(", ") || "Sin integrantes";
    return `<div class="det-equipo">
      <div class="det-equipo-cab"><span class="det-pos">${medals[pos] || `#${pos}`}</span><strong>${esc(eq.nombre || "Equipo")}</strong>
        <span class="det-goles">${g.goles} gol(es)</span></div>
      <div class="det-meta">Jugados: ${g.partidos} | Ganados: ${g.ganados} | Empatados: ${g.empatados} | Perdidos: ${g.perdidos}</div>
      <div class="det-integrantes">${integrantes}</div>
    </div>`;
  }).join("");

  // ---- Establecimientos ordered por participantes (de mayor a menor). ----
  const porEstablecimiento = {};
  equipos.forEach((eq) => {
    (eq.alumnos || []).forEach((a) => {
      const est = a.establecimiento;
      const nombre = est && est.nombre ? est.nombre : "Sin establecimiento";
      if (!porEstablecimiento[nombre]) porEstablecimiento[nombre] = { total: 0, equipos: new Set() };
      porEstablecimiento[nombre].total += 1;
      porEstablecimiento[nombre].equipos.add(eq.nombre || "Equipo");
    });
  });
  const maxPart = Math.max(1, ...Object.values(porEstablecimiento).map((x) => x.total));
  const ListaEst = Object.entries(porEstablecimiento)
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .map(([nombre, info]) => {
      const pct = Math.round((info.total / maxPart) * 100);
      return `<div class="det-est">
        <div class="det-est-cab"><strong>${esc(nombre)}</strong><span>${info.total} participante(s)</span></div>
        <div class="det-est-barra"><div class="det-est-fill" style="width:${pct}%"></div></div>
        <div class="det-est-eq">Equipos: ${esc([...info.equipos].join(", "))}</div>
      </div>`;
    }).join("");

  cont.classList.remove("oculta");
  cont.innerHTML = `<div class="det-layout">
       <div class="det-izq"><h4 class="det-titulo">Equipos y goles</h4>${filasEquipos || `<p class="muted">Sin equipos registrados.</p>`}</div>
       <div class="det-der"><h4 class="det-titulo">Participantes por establecimiento</h4>${ListaEst || `<p class="muted">Sin datos.</p>`}</div>
     </div>`;
  boton.textContent = "Ocultar";
  boton.disabled = false;
}

async function panelAdminTorneos() {
  const [torTodos, act] = await Promise.all([API.torneos(), API.actividades()]);
  // Los torneos finalizados solo se ven en el Historial.
  const tor = torTodos.filter((t) => t.estado !== "finalizado");
  window.__actividadesAdmin = act;
  const opActCat = opcionesActividadCategoria(act);
  const estadoTor = { q: "" };
  contenido(
    `<div class="encabezado"><h2 class="pagina">Torneos y Sorteo</h2><div class="encabezado-botones"><button class="btn btn-mini" id="btn-historial-tor">Historial</button><button class="btn btn-primario2" id="btn-nuevo-tor">+ Nuevo Torneo</button></div></div>
     <div class="act-buscador">
       <input id="buscador-tors" type="search" placeholder="Buscar torneo por nombre..." aria-label="Buscar torneo">
       <span id="cont-tors" class="act-buscador-contador">0 torneos</span>
     </div>
     <p id="tor-sin-resultados" class="muted oculta" style="padding:14px">No se encontraron torneos con ese nombre.</p>
     <div id="form-nuevo-tor" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Nombre</label><input id="tor-nombre"></div>
         <div class="campo"><label>Actividad (Categoria)</label>${comboHtml("tor-act-txt", "Buscar actividad y categoria...")}<input type="hidden" id="tor-act"><input type="hidden" id="tor-div"></div>
         <div class="campo"><label>Formato</label><select id="tor-formato"><option value="amistoso">Amistoso</option><option value="competitivo">Competitivo</option></select></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-tor">Guardar</button>
     </div>
     <div id="tor-lista"></div>`
  );

  const renderListaTorneos = () => {
    const q = estadoTor.q.trim().toLowerCase();
    const filtrados = q
      ? tor.filter((t) => String(t.nombre || "").toLowerCase().includes(q))
      : tor;
    const p = paginarUI(filtrados, "torneos");
    const runLabel = {
      activo: "Activo", en_curso: "En curso", inscripciones: "Inscripciones",
      pausado: "Pausado", postergado: "Postergado", suspendido: "Suspendido",
      cancelado: "Cancelado", finalizado: "Finalizado",
    };
    $("#tor-lista").innerHTML = p.items.length
      ? p.items.map((t) => `<div class="tarjeta tor-tarjeta" id="tor-tarjeta-${t._id}">
       <h3>${esc(t.nombre)} <span class="badge-rol">${esc(t.division || "Sin categoria")}</span> <span class="badge-rol badge-formato-${t.formato === "competitivo" ? "competitivo" : "amistoso"}">${esc(t.formato === "competitivo" ? "Competitivo" : "Amistoso")}</span> ${t.estado === "suspendido" ? `<span class="badge-estado-tor est-suspendido">Suspendido</span>` : `<span class="badge-estado-tor">${esc(runLabel[t.estado] || t.estado)}</span>`}</h3>
       <p class="muted">Actividad: ${esc(t.actividad ? t.actividad.nombre : "-")} | ${esc(t.anio)} | Llave unica</p>
       ${programacionTorneoResumen(t)}
 <div class="seccion">
       <button class="btn btn-mini" data-equipos="${t._id}">Equipos</button>
       <button class="btn btn-mini" data-partidos="${t._id}" data-nombre="${esc(t.nombre)}" data-formato="${esc(t.formato || "amistoso")}">Partidos</button>
       <button class="btn btn-primario2 btn-programar" data-programar="${t._id}">Programar Torneo</button>
       <button class="btn btn-mini" data-llaves="${t._id}" data-nombre="${esc(t.nombre)}">Ver Mapa del Torneo</button>
       <button class="btn btn-mini" data-suspender-torneo="${t._id}" data-nombre="${esc(t.nombre)}" data-estado="${esc(t.estado || "programado")}">${t.estado === "suspendido" ? "Reactivar" : "Suspender"}</button>
       <button class="btn btn-mini btn-peligro" data-eliminar-torneo="${t._id}" data-nombre="${esc(t.nombre)}">Eliminar definitivamente</button></div>
       <div class="form-programar oculta" data-form-programar="${t._id}" data-torneo-nombre="${esc(t.nombre)}" data-torneo-actividad="${esc(t.actividad ? t.actividad._id || t.actividad : "")}"></div>
      </div>`).join("") + htmlPaginacion("torneos", p)
      : `<div class="tarjeta"><p class="muted">Sin torneos para mostrar.</p></div>`;

    document.querySelectorAll("[data-equipos]").forEach((b) => {
      b.onclick = () => panelAdminEquipos(b.dataset.equipos);
    });
    document.querySelectorAll("[data-partidos]").forEach((b) => {
      b.onclick = () => verPartidos(b.dataset.partidos, b.dataset.nombre || "Partidos", b.dataset.formato || "amistoso");
    });
    document.querySelectorAll("[data-llaves]").forEach((b) => {
      b.onclick = () => abrirMapaTorneo(b.dataset.llaves, b.dataset.nombre).catch((err) => mostrarMensaje(err.message, "error"));
    });
    // Suspender/Reactivar: reversible. Suspender impide nuevas inscripciones del
    // coordinador (el torneo queda fuera de su panel) hasta que se reactive.
    document.querySelectorAll("[data-suspender-torneo]").forEach((b) => {
      b.onclick = async () => {
        const idT = b.dataset.suspenderTorneo;
        const esSuspendido = b.dataset.estado === "suspendido";
        const accion = esSuspendido ? "REACTIVAR" : "SUSPENDER";
        const msj = esSuspendido
          ? "Reactivar el torneo. Los coordinadores podran volver a inscribir estudiantes."
          : "Suspender el torneo. Los coordinadores no podran inscribir estudiantes hasta que se reactive.";
        if (!await confirmarMensaje(`Esta seguro de ${accion} el torneo?\n\n${msj}`)) return;
        try {
          if (esSuspendido) await API.reactivarTorneo(idT);
          else await API.suspenderTorneo(idT);
          panelAdminTorneos();
        } catch (err) { mostrarMensaje(err.message, "error"); }
      };
    });
    // Eliminacion definitiva: borra el torneo y todo lo que dependia de el
    // (equipos, posiciones, inscripciones y la referencia en los alumnos).
    document.querySelectorAll("[data-eliminar-torneo]").forEach((b) => {
      b.onclick = async () => {
        const idT = b.dataset.eliminarTorneo;
        const nombre = b.dataset.nombre || "el torneo";
        if (!await confirmarMensaje(`BORRADO DEFINITIVO de "${nombre}".\n\nSe eliminaran el torneo, sus equipos, posiciones, inscripciones y la referencia en los estudiantes. Esta accion NO se puede deshacer.\n\nContinuar?`)) return;
        try {
          await API.eliminarTorneo(idT);
          panelAdminTorneos();
        } catch (err) { mostrarMensaje(err.message, "error"); }
      };
    });
    document.querySelectorAll("[data-programar]").forEach((b) => {
      b.onclick = () => {
        const torneoId = b.dataset.programar;
        const box = document.querySelector(`[data-form-programar="${torneoId}"]`);
        if (!box) return;
        if (box.innerHTML === "") {
          const torneo = (window.__torneosProgramables || []).find((t) => String(t._id) === String(torneoId));
          box.innerHTML = formProgramarTorneo(torneo);
        }
        box.classList.toggle("oculta");
      };
    });
    conectarPaginacion(renderListaTorneos);

    const aviso = document.getElementById("tor-sin-resultados");
    if (aviso) aviso.classList.toggle("oculta", !(q && filtrados.length === 0));
    const contador = document.getElementById("cont-tors");
    if (contador) contador.textContent = filtrados.length + " torneo(s)";
  };

  $("#btn-nuevo-tor").onclick = () => $("#form-nuevo-tor").classList.toggle("oculta");
  $("#btn-historial-tor").onclick = () => CargarPanel(panelHistorialTorneos);
  initCombo("tor-act-txt", opActCat, (o) => {
    $("#tor-act").value = o.extra.actividad;
    $("#tor-div").value = o.extra.division;
    const nombre = $("#tor-nombre");
    if (nombre && !nombre.value.trim()) {
      nombre.value = o.extra.division ? `Torneo de ${o.extra.nombre} ${o.extra.division}` : `Torneo de ${o.extra.nombre}`;
    }
  });
  $("#btn-guardar-tor").onclick = async () => {
    try {
      const nombre = $("#tor-nombre").value.trim();
      if (!nombre) { mostrarMensaje("Indique el nombre del torneo"); return; }
      if (!$("#tor-act").value) { mostrarMensaje("Seleccione una actividad (categoria)"); return; }
      await API.crearTorneo({
        nombre, actividad: $("#tor-act").value, division: $("#tor-div").value,
        anio: new Date().getFullYear(),
        formato: $("#tor-formato").value,
        grupos: ["Llave"],
        formulario: {},
      });
      panelAdminTorneos();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };

  // Delegacion: guardar programacion y toggle de requisitos del formulario.
  const torCont = document.querySelector("#vista-contenido") || document.body;
  const onProgramarClick = async (e) => {
    const btn = e.target.closest("[data-guardar-programar]");
    if (!btn) return;
    const cont = btn.closest(".form-programar");
    const torneoId = cont?.dataset.formProgramar;
    if (!torneoId) { mostrarMensaje("Torneo invalido"); return; }
    const combinarFechaHora = (fecha, hora, porDefecto) => {
      if (!fecha) return null;
      const partes = String(hora || "");
      const hh = partes.slice(0, 2);
      const mm = partes.length >= 5 ? partes.slice(3, 5) : "00";
      const d = new Date(`${fecha}T00:00:00`);
      if (porDefecto === "finDia") {
        d.setHours(23, 59, 59, 999);
      }
      if (hh && !isNaN(Number(hh)) && hh !== "99") {
        d.setHours(Number(hh), Number(mm) || 0, porDefecto === "finDia" ? 59 : 0, porDefecto === "finDia" ? 999 : 0);
      }
      return d.toISOString();
    };
    const fApertura = combinarFechaHora(
      cont.querySelector(".pr-apertura")?.value,
      cont.querySelector(".pr-apertura-h")?.value,
      "00:00"
    );
    const fCierre = combinarFechaHora(
      cont.querySelector(".pr-cierre")?.value,
      cont.querySelector(".pr-cierre-h")?.value,
      "finDia"
    );
    const edadMin = cont.querySelector(".pr-edad-min")?.value ? Number(cont.querySelector(".pr-edad-min").value) : null;
    const edadMax = cont.querySelector(".pr-edad-max")?.value ? Number(cont.querySelector(".pr-edad-max").value) : null;

    // Validaciones antes de guardar: mensajes claros de error.
    if (fApertura && fCierre && new Date(fApertura) > new Date(fCierre)) {
      mostrarMensaje("No se pudo guardar: la fecha de apertura no puede ser despues de la fecha de cierre.");
      return;
    }
    if (edadMin != null && edadMax != null && Number(edadMin) > Number(edadMax)) {
      mostrarMensaje("No se pudo guardar: la edad minima no puede ser mayor que la edad maxima.");
      return;
    }

    const datos = {
      fechaAperturaInscripcion: fApertura,
      fechaCierreInscripcion: fCierre,
      requisitos: {
        activo: true,
        edadMinima: edadMin,
        edadMaxima: edadMax,
        genero: cont.querySelector(".pr-genero")?.value || "",
      },
    };
    try {
      const resultado = await API.actualizarTorneo(torneoId, datos);
      mostrarExito("Programacion guardada correctamente. El torneo ya esta disponible en el perfil del coordinador.");
      if (resultado && resultado.aviso) {
        setTimeout(() => mostrarExito(resultado.aviso), 350);
      }
      const desglose = cont.closest("[data-form-programar]");
      if (desglose) desglose.classList.add("oculta");
      panelAdminTorneos();
    } catch (err) {
      const detalle = (err && err.data && err.data.error) || err.message || "Error desconocido";
      mostrarMensaje("No se pudo guardar la programacion: " + detalle);
    }
  };
  torCont.addEventListener("click", onProgramarClick);
  torCont.addEventListener("change", onProgramarClick);
  window.__torneosProgramables = tor;

  const buscarTor = () => {
    estadoTor.q = $("#buscador-tors").value || "";
    reiniciarPaginaUI("torneos");
    renderListaTorneos();
  };
  $("#buscador-tors").addEventListener("input", buscarTor);
  renderListaTorneos();

}

// Rersumen de la programacion del torneo (fechas y requisitos).
function programacionTorneoResumen(t) {
  const r = t.requisitos || {};
  const partes = [];
  if (t.fechaAperturaInscripcion) partes.push(`Apertura: ${new Date(t.fechaAperturaInscripcion).toLocaleDateString("es-CL")}`);
  if (t.fechaCierreInscripcion) partes.push(`Cierre: ${new Date(t.fechaCierreInscripcion).toLocaleDateString("es-CL")}`);
  if (r.activo) {
    const req = [];
    if (r.edadMinima != null || r.edadMaxima != null) req.push(`Edad: ${r.edadMinima ?? "?"} - ${r.edadMaxima ?? "?"}`);
    if (r.genero) req.push(`Genero: ${r.genero}`);
    partes.push(`Requisitos: ${req.join(", ") || "ver requisitos"}`);
  } else {
    partes.push("Sin requisitos");
  }
  return partes.length ? `<p class="muted">${esc(partes.join(" | "))}</p>` : "";
}

// Formulario para programar la inscripcion del torneo (fechas y requisitos).
function formProgramarTorneo(t) {
  const torneo = t || {};
  const r = torneo.requisitos || {};
  const aFecha = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const aHora = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const fA = aFecha(torneo.fechaAperturaInscripcion);
  const fC = aFecha(torneo.fechaCierreInscripcion);
  const hA = aHora(torneo.fechaAperturaInscripcion);
  const hC = aHora(torneo.fechaCierreInscripcion);
  const selGenero = (v) => ["varones", "damas", "mixto"].map((g) => `<option value="${g}" ${String(r.genero) === g ? "selected" : ""}>${g === "varones" ? "Varones" : g === "damas" ? "Damas" : "Mixto"}</option>`).join("");
  return `<div class="tarjeta form-programar-inner">
      <p class="muted">Programe la ventana de inscripcion del torneo. Aparecera en el perfil del coordinador para inscribir estudiantes.</p>
      <div class="grid-2">
        <div class="campo">
          <label>Fecha de apertura</label><input type="date" class="pr-apertura" value="${fA}">
          <label style="margin-top:6px">Hora de apertura</label><input type="time" class="pr-apertura-h" value="${hA}" step="60">
        </div>
        <div class="campo">
          <label>Fecha de cierre</label><input type="date" class="pr-cierre" value="${fC}">
          <label style="margin-top:6px">Hora de cierre</label><input type="time" class="pr-cierre-h" value="${hC}" step="60">
          <p class="muted" style="margin-top:4px">Sin hora, el cierre sera a las 23:59 del dia indicado.</p>
        </div>
      </div>
      <div class="grid-2 pr-req-box">
        <div class="campo"><label>Edad minima</label><input type="number" class="pr-edad-min" min="0" value="${r.edadMinima ?? ""}"></div>
        <div class="campo"><label>Edad maxima</label><input type="number" class="pr-edad-max" min="0" value="${r.edadMaxima ?? ""}"></div>
        <div class="campo"><label>Genero permitido</label><select class="pr-genero">${selGenero()}</select></div>
      </div>
      <div class="seccion">
        <button class="btn btn-ok btn-mini" data-guardar-programar="${torneo._id || ""}">Guardar Programacion</button>
      </div>
    </div>`;
}

// Vista de la fase de grupos (todos contra todos) en horizontal con
// asignacion de horario (fecha, hora inicio, hora termino, lugar) que
// se sincroniza con la agenda.
async function verPartidos(torneoId, nombreTorneo = "Partidos", formato = "amistoso", llaveIdFoco) {
  const llaves = await API.llaves(torneoId);
  const todas = (llaves || []).slice().sort((a, b) => (a.nivel || 0) - (b.nivel || 0) || (a.orden || 0) - (b.orden || 0));

  const NOMBRE_FASES = { 1: "Final", 2: "Semifinal", 3: "Cuartos de Final", 4: "Octavos de Final" };
  const aTexto = (l) => (l.nivel >= 1 ? l.grupo || (NOMBRE_FASES[l.nivel] || "Eliminatoria") : "Fase de Grupos");
  const ORDEN_FASE = { "Fase de Grupos": 0, "Octavos de Final": 1, "Cuartos de Final": 2, "Semifinal": 3, Final: 4 };

  // Solo se muestran partidos con los dos equipos definidos (evita cruces
  // "Por definir VS Por definir" cuando el torneo aun no tiene equipos).
  const conEquipos = (l) => l && l.equipos && l.equipos.length === 2 && l.equipos.every((e) => e && e.nombre);

  // Competitivo: solo los cruces del mapa del torneo (eliminatorias).
  // Si viene un partido concreto para editar, se incluye siempre aunque su fase
  // no se muestre por defecto.
  let visibles = (formato === "competitivo" ? todas.filter((l) => (l.nivel || 0) >= 1) : todas).filter(conEquipos);
  if (llaveIdFoco) {
    const foco = todas.find((l) => String(l._id) === String(llaveIdFoco));
    if (foco && !visibles.some((l) => String(l._id) === String(foco._id))) visibles = visibles.concat(foco);
  }

  const grupos = {};
  const pPartidos = paginarUI(visibles, "partidos");
  pPartidos.items.forEach((l) => {
    const fase = aTexto(l);
    (grupos[fase] = grupos[fase] || []).push(l);
  });
  const fasesOrden = Object.keys(grupos).sort((x, y) => (ORDEN_FASE[x] ?? 9) - (ORDEN_FASE[y] ?? 9));

  const fechaVal = (f) => (f ? new Date(f) : null);
  const dateStr = (f) => (f ? new Date(f).toISOString().slice(0, 10) : "");

  const tarjetaPartido = (p) => `<div class="tarjeta partido-horario">
        <div class="partido-linea">
          <strong>${esc(p.equipos && p.equipos[0] ? p.equipos[0].nombre : "Por definir")}</strong>
          <span class="partido-vs">VS</span>
          <strong>${esc(p.equipos && p.equipos[1] ? p.equipos[1].nombre : "Por definir")}</strong>
          <button class="btn btn-mini btn-primario2 partido-asig" data-toggle-horario="${p._id}">Asignar Horario</button>
        </div>
        <p class="muted partido-asignado">${fechaVal(p.fecha)
          ? `Fecha: ${esc(new Date(p.fecha).toLocaleDateString("es-CL"))} · Hora: ${esc(p.hora || "-")}${p.horaTermino ? ` a ${esc(p.horaTermino)}` : ""} · Lugar: ${esc(p.lugar && p.lugar !== "Por definir" ? p.lugar : "-")}`
          : "Sin horario asignado"}</p>
        <div class="horario-form oculta" data-horario-llave="${p._id}">
          <div class="grid-4">
            <div class="campo"><label>Fecha</label><input type="date" class="h-fecha" data-horario="${p._id}" value="${dateStr(p.fecha)}"></div>
            <div class="campo"><label>Hora inicio</label><input type="time" class="h-hora" data-horario="${p._id}" value="${esc(p.hora || "")}"></div>
            <div class="campo"><label>Hora termino</label><input type="time" class="h-termino" data-horario="${p._id}" value="${esc(p.horaTermino || "")}"></div>
            <div class="campo"><label>Lugar</label><input class="h-lugar" data-horario="${p._id}" value="${esc(p.lugar && p.lugar !== "Por definir" ? p.lugar : "")}" placeholder="Gimnasio, cancha..."></div>
          </div>
          <button class="btn btn-ok" data-guardar-horario="${p._id}">Guardar Horario</button>
        </div>
      </div>`;

  const cuerpoPartidos = fasesOrden.length
    ? fasesOrden.map((fase) => `
        <div class="fase-bloque" data-fase="${esc(fase)}">
          <h3 class="subtitulo-fase fase-toggle" data-toggle-fase="${esc(fase)}">${esc(fase)} <span class="fase-flecha">▸</span></h3>
          <div class="fase-partidos" data-fase-partidos="${esc(fase)}">
            ${grupos[fase].map(tarjetaPartido).join("")}
          </div>
        </div>
      `).join("")
    : `<div class="tarjeta"><p class="muted">Aun no hay partidos con equipos definidos. Asigne equipos o ejecute el sorteo desde la seccion Equipos del torneo.</p></div>`;

  contenido(
    `<div class="encabezado"><h2 class="pagina">Partidos del Torneo</h2>
       <button class="btn btn-mini" id="btn-volver-partidos">Volver</button></div>
     <h3 class="nombre-torneo">${esc(nombreTorneo)}</h3>
     ${cuerpoPartidos}
     ${fasesOrden.length ? htmlPaginacion("partidos", pPartidos) : ""}`
  );
  conectarPaginacion(() => verPartidos(torneoId, nombreTorneo, formato, llaveIdFoco));
  $("#btn-volver-partidos").onclick = () => panelAdminTorneos();
  document.querySelectorAll("[data-toggle-fase]").forEach((b) => {
    b.onclick = () => {
      const fase = b.dataset.toggleFase;
      const cont = document.querySelector(`[data-fase-partidos="${fase}"]`);
      const flecha = b.querySelector(".fase-flecha");
      if (cont) {
        cont.classList.toggle("oculta");
        if (flecha) flecha.textContent = cont.classList.contains("oculta") ? "▾" : "▸";
      }
    };
  });
  document.querySelectorAll("[data-toggle-horario]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.toggleHorario;
      document.querySelector(`[data-horario-llave="${id}"]`)?.classList.toggle("oculta");
    };
  });
  document.querySelectorAll("[data-guardar-horario]").forEach((b) => {
    b.onclick = async () => {
      try {
        const id = b.dataset.guardarHorario;
        await API.actualizarLlave(id, {
          fecha: document.querySelector(`[data-horario="${id}"].h-fecha`)?.value,
          hora: document.querySelector(`[data-horario="${id}"].h-hora`)?.value,
          horaTermino: document.querySelector(`[data-horario="${id}"].h-termino`)?.value,
          lugar: document.querySelector(`[data-horario="${id}"].h-lugar`)?.value,
        });
        mostrarMensaje("Horario guardado");
        verPartidos(torneoId, nombreTorneo);
      } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });

  // Viniendo desde la agenda (boton "Editar"): abrir el horario del partido
  // correspondiente y resaltarlo para modificar el dia y guardar.
  if (llaveIdFoco) {
    const f = document.querySelector(`[data-horario-llave="${llaveIdFoco}"]`);
    const card = f ? f.closest(".partido-horario") : null;
    if (card) {
      f.classList.remove("oculta");
      card.style.boxShadow = "0 0 0 2px var(--acento)";
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

let __torneoBracket = null;

async function abrirModalBracket(torneoId) {
  __torneoBracket = torneoId;
  const modal = document.getElementById("modal-bracket");
  if (!modal) return;
  modal.classList.remove("oculta");
  const inter = document.getElementById("br-manual");
  if (inter) {
    inter.innerHTML = "";
    inter.classList.add("oculta");
  }
  const modo = document.getElementById("br-modo");
  if (modo) modo.value = "desempeno";
  modal.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function cargarCrucesManuales(contenedor) {
  if (!__torneoBracket) return;
  try {
    const tablas = await API.tabla(__torneoBracket);
    const tablaUnica = (tablas || [])[0] || { tabla: [] };
    const equipos = (tablaUnica.tabla || []).map((f) => f.equipo).filter(Boolean);
    if (equipos.length < 2) {
      contenedor.innerHTML = `<p class="muted">Se necesitan al menos 2 equipos con puntuacion.</p>`;
      return;
    }
    const par = equipos.map((e) => `<option value="${e._id}">${esc(e.nombre)}</option>`).join("");
    const nPares = Math.ceil(equipos.length / 2);
    let html = "<p class='muted'>Seleccione que equipo compite contra que equipo:</p>";
    for (let i = 0; i < nPares; i++) {
      html += `<div class="grid-2 br-par">
        <select data-br-eq-a>${par}</select>
        <select data-br-eq-b><option value="">(Libre / bye)</option>${par}</select>
      </div>`;
    }
    contenedor.innerHTML = html;
  } catch (err) {
    contenedor.innerHTML = `<p class="muted">${esc(err.message)}</p>`;
  }
}

async function generarBracket() {
  const torneoId = __torneoBracket;
  if (!torneoId) return;
  const modo = document.getElementById("br-modo")?.value || "desempeno";
  const datos = { modo };
  if (modo === "manual") {
    const pares = Array.from(document.querySelectorAll(".br-par")).map((p) => {
      const a = p.querySelector("[data-br-eq-a]").value;
      const b = p.querySelector("[data-br-eq-b]").value;
      return b ? [a, b] : [a];
    });
    datos.cruces = pares.filter((p) => p[0]);
  }
  try {
    const res = await API.ejecutarBracket(torneoId, datos);
    mostrarMensaje(`Eliminatorias generadas (${res.totalRondas} ronda${res.totalRondas > 1 ? "s" : ""})`);
    panelAdminEquipos(torneoId);
  } catch (err) {
    mostrarMensaje(err.message, "error");
  }
}

// Rellena el selector de categoria (division) con las categorias de la
// actividad seleccionada y sugiere un nombre de torneo para esa categoria.
// Panel de gestion de equipos del torneo (estudiantes de distintos
// establecimientos agrupados en equipos por sorteo automatico o manual).
const establecimientoNombre = (a) => (a && a.establecimiento ? a.establecimiento.nombre : "Sin establecimiento");

const tarjetaEquipo = (e, pool = []) => {
  const actuales = e.alumnos || [];
  const actualIds = new Set(actuales.map((a) => String(a._id || a.id)));
  const disponibles = pool.filter((a) => !actualIds.has(String(a._id || a.id)));
  return `<div class="tarjeta">
  <h3>${esc(e.nombre)}
    <button class="btn btn-mini float-der" data-elim-equipo="${e._id}">Eliminar</button>
    <button class="btn btn-mini float-der" data-edit-equipo="${e._id}" style="margin-right:6px">Editar</button>
  </h3>
  <ul class="lista-alumnos">${actuales.map((a) => `<li><strong>${esc(a.nombre)}</strong> <span class="muted">- ${esc(establecimientoNombre(a))}</span> <button class="btn btn-mini btn-peligro float-der oculta" data-expulsar="${e._id}__${a._id}">Expulsar</button></li>`).join("") || '<li class="muted">Sin estudiantes asignados</li>'}</ul>
  <div class="eq-editor oculta" data-editor="${e._id}">
    <div class="campo"><label>Agregar alumno disponible (${disponibles.length})</label>
      <div class="grid-2">
        ${comboHtml(`eq-agregar-${e._id}`, "Busque por nombre o apellido...")}
        <button class="btn btn-ok btn-mini" data-agregar-btn="${e._id}" ${disponibles.length ? "" : "disabled"}>Agregar</button>
      </div>
      ${disponibles.length ? "" : '<p class="muted">No hay estudiantes disponibles para este torneo.</p>'}
    </div>
  </div>
</div>`;
};

async function panelAdminEquipos(torneoId) {
  const [equipos, pool, torneos] = await Promise.all([
    API.equipos(torneoId),
    API.poolEquipos(torneoId),
    API.torneos().catch(() => []),
  ]);
  const torneo = Array.isArray(torneos) ? torneos.find((t) => String(t._id) === String(torneoId)) : null;
  window.__torneoBracket = torneoId;
  contenido(
    `<div class="encabezado"><div><h2 class="pagina">Equipos del Torneo</h2>
       <p class="tor-eq-nombre">${torneo ? esc(torneo.nombre) : ""}</p></div>
<button class="btn btn-mini" id="btn-volver-equipos">Volver</button></div>
     <div class="eq-layout">
<div class="eq-col eq-col-equipos">
          <h3 class="subtitulo-seccion">Equipos actuales (${equipos.length})</h3>
          <div class="campo"><label for="eq-buscar">Buscar equipo o alumno</label>
            <input id="eq-buscar" type="search" placeholder="Nombre del equipo o del alumno..." autocomplete="off"></div>
          <div id="eq-lista"></div>
        </div>
       <div class="eq-col eq-col-acciones">
          <div class="tarjeta">
            <h3>Sortear Equipos Automaticamente</h3>
            <p class="muted">Distribuye los ${pool.total} estudiantes sin equipo en la cantidad de equipos indicada (min 2 estudiantes por equipo).</p>
            <div class="campo"><label>Cantidad de equipos</label><input id="eq-cantidad" type="number" value="2" min="2"></div>
            <button class="btn btn-ok" id="btn-sortear-equipos">Sortear Equipos</button>
            <div id="eq-aviso" class="aviso-sorteo oculta"></div>
          </div>
          <div id="modal-bracket" class="tarjeta">
            <h3>Generar Eliminatorias</h3>
            <p class="muted">Ejecutar Sorteo genera la fase de grupos (todos contra todos) y arma las eliminatorias automaticamente segun la cantidad de equipos: 2 -> Final, 4 -> Semifinal, 8 -> Cuartos de Final, 16 -> Octavos de Final.</p>
            <button class="btn btn-ok" id="btn-ejecutar-sorteo-equipos">Ejecutar Sorteo</button>
            <p class="muted" style="margin-top:10px">Tambien puede generar solo el bracket de eliminacion: todos los equipos clasifican y se arma 4 equipos hasta Semifinal, 8 hasta Cuartos de Final, 16 hasta Octavos de Final.</p>
            <div class="campo"><label>Modo de sorteo</label>
              <select id="br-modo">
                <option value="desempeno">Desempeno (igualado: 1° con el ultimo)</option>
                <option value="azar">Al azar</option>
                <option value="manual">Manual (elegir los enfrentamientos)</option>
              </select>
            </div>
            <div id="br-manual" class="oculta"></div>
            <button class="btn btn-ok" id="btn-generar-bracket">Generar</button>
            <button class="btn btn-mini" id="btn-cancelar-bracket">Cancelar</button>
          </div>
<div class="tarjeta">
            <h3>Crear Equipo Manual / Mixto</h3>
            <p class="muted">Seleccione estudiantes de cualquier establecimiento (el equipo puede mezclar establecimientos).</p>
            <div class="campo"><label>Nombre del equipo</label><input id="eq-nombre" placeholder="Equipo Estrellas"></div>
            <div class="campo"><label>Agregar estudiante disponible (${pool.pool.length})</label>
              <div class="grid-2">
                ${comboHtml("eq-agregar-manual", "Busque por nombre o apellido...")}
                <button class="btn btn-ok btn-mini" id="btn-agregar-manual" ${pool.pool.length ? "" : "disabled"}>Agregar</button>
              </div>
              ${pool.pool.length ? "" : '<p class="muted">No hay estudiantes sin equipo en este torneo.</p>'}
            </div>
            <div class="campo"><label>Integrantes seleccionados</label>
              <ul class="lista-alumnos" id="eq-manual-lista"><li class="muted">Sin estudiantes seleccionados.</li></ul>
            </div>
            <button class="btn btn-ok" id="btn-crear-equipo">Crear Equipo</button>
          </div>
       </div>
     </div>`
   );
$("#btn-volver-equipos").onclick = () => panelAdminTorneos();
  const initCombosAgregar = () => {
    document.querySelectorAll("[data-editor]").forEach((editor) => {
      const equipoId = editor.dataset.editor;
      const inp = document.getElementById(`eq-agregar-${equipoId}`);
      if (!inp) return;
      const equipo = equipos.find((x) => String(x._id) === String(equipoId));
      const actualIds = new Set((equipo.alumnos || []).map((a) => String(a._id || a.id)));
      const disponibles = (pool.pool || []).filter((a) => !actualIds.has(String(a._id || a.id)));
      initCombo(`eq-agregar-${equipoId}`, disponibles.map((a) => ({
        valor: String(a._id),
        texto: `${a.nombre} - ${establecimientoNombre(a)}`,
      })), (o) => { inp.dataset.valor = o.valor; }, "Busque por nombre o apellido...");
      inp.addEventListener("input", () => { delete inp.dataset.valor; });
    });
  };
  const estadoEq = { q: "" };
  const renderEquipos = () => {
    const q = (estadoEq.q || "").trim().toLowerCase();
    const filtrados = equipos.filter((e) => {
      if (!q) return true;
      if ((e.nombre || "").toLowerCase().includes(q)) return true;
      return (e.alumnos || []).some((a) => (a.nombre || "").toLowerCase().includes(q));
    });
    const p = paginarUI(filtrados, "equipos");
    const lista = document.getElementById("eq-lista");
    if (lista) {
      lista.innerHTML = p.items.length
        ? p.items.map((e) => tarjetaEquipo(e, pool.pool)).join("") + htmlPaginacion("equipos", p)
        : '<p class="muted">Aun no hay equipos en este torneo.</p>';
      initCombosAgregar();
      conectarPaginacion(renderEquipos, lista);
    }
    const h3 = document.querySelector(".eq-col-equipos .subtitulo-seccion");
    if (h3) h3.textContent = q
      ? `Equipos actuales (${filtrados.length} de ${equipos.length})`
      : `Equipos actuales (${equipos.length})`;
  };
  const buscador = document.getElementById("eq-buscar");
  if (buscador) {
    buscador.addEventListener("input", () => {
      estadoEq.q = buscador.value || "";
      reiniciarPaginaUI("equipos");
      renderEquipos();
    });
  }
  renderEquipos();
  $("#btn-ejecutar-sorteo-equipos").onclick = async () => {
    try {
      await API.ejecutarSorteo(torneoId);
      mostrarMensaje("Sorteo ejecutado: fase de grupos + eliminatorias automaticas");
      panelAdminEquipos(torneoId);
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  $("#btn-generar-bracket")?.addEventListener("click", generarBracket);
  $("#btn-cancelar-bracket")?.addEventListener("click", () => {
    const inter = document.getElementById("br-manual");
    if (inter) {
      inter.innerHTML = "";
      inter.classList.add("oculta");
    }
    const modo = document.getElementById("br-modo");
    if (modo) modo.value = "desempeno";
    window.__torneoBracket = torneoId;
  });
  $("#br-modo")?.addEventListener("change", () => {
    const manual = document.getElementById("br-manual");
    if (!manual) return;
    manual.classList.toggle("oculta", document.getElementById("br-modo").value !== "manual");
    if (document.getElementById("br-modo").value === "manual") cargarCrucesManuales(manual);
  });
  $("#btn-sortear-equipos").onclick = async () => {
    try {
      const res = await API.sortearEquipos(torneoId, Number($("#eq-cantidad").value));
      const aviso = $("#eq-aviso");
      if (aviso) {
        if (res.sobrantes > 0) {
          aviso.textContent = `Se formaron ${res.totalEquipos} equipos de ${res.porEquipo} jugadores. Sobran ${res.sobrantes} estudiante${res.sobrantes > 1 ? "s" : ""} sin equipo: puede hacer otro sorteo o crear un equipo manual.`;
          aviso.classList.remove("oculta");
        } else {
          aviso.classList.add("oculta");
        }
      }
      const global = window.mostrarMensaje || mostrarMensaje;
      global(res.mensaje || "Equipos sorteados");
      panelAdminEquipos(torneoId);
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  const manualSel = new Set();
  const pintarManual = () => {
    const lista = document.getElementById("eq-manual-lista");
    if (!lista) return;
    const sel = pool.pool.filter((a) => manualSel.has(String(a._id || a.id)));
    lista.innerHTML = sel.length
      ? sel.map((a) => `<li><strong>${esc(a.nombre)}</strong> <span class="muted">- ${esc(establecimientoNombre(a))}</span> <button class="btn btn-mini btn-peligro float-der" data-manual-quitar="${a._id}">Quitar</button></li>`).join("")
      : '<li class="muted">Sin estudiantes seleccionados.</li>';
  };
  initCombo("eq-agregar-manual", pool.pool.map((a) => ({
    valor: String(a._id || a.id),
    texto: `${a.nombre} - ${establecimientoNombre(a)}`,
  })), (o) => { const inp = document.getElementById("eq-agregar-manual"); inp.dataset.valor = o.valor; }, "Busque por nombre o apellido...");
  document.getElementById("eq-agregar-manual").addEventListener("input", () => {
    delete document.getElementById("eq-agregar-manual").dataset.valor;
  });
  $("#btn-agregar-manual").onclick = () => {
    const inp = document.getElementById("eq-agregar-manual");
    const id = inp && inp.dataset.valor;
    if (!id) { mostrarMensaje("Busque y seleccione un estudiante de la lista"); return; }
    manualSel.add(id);
    inp.value = ""; delete inp.dataset.valor;
    pintarManual();
  };
  document.getElementById("eq-manual-lista").addEventListener("click", (ev) => {
    const quitar = ev.target.closest("[data-manual-quitar]");
    if (quitar) { manualSel.delete(quitar.dataset.manualQuitar); pintarManual(); }
  });
  $("#btn-crear-equipo").onclick = async () => {
    const alumnos = Array.from(manualSel);
    try {
      await API.crearEquipo(torneoId, { nombre: $("#eq-nombre").value, alumnos });
      panelAdminEquipos(torneoId);
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  const eqLista = document.getElementById("eq-lista");
  if (eqLista) {
    eqLista.addEventListener("click", async (ev) => {
      const editar = ev.target.closest("[data-edit-equipo]");
      if (editar) {
        const id = editar.dataset.editEquipo;
        const editor = document.querySelector(`[data-editor="${id}"]`);
        const tarjeta = editor.closest(".tarjeta");
        if (editor) editor.classList.toggle("oculta");
        tarjeta.classList.toggle("eq-editando");
        tarjeta.querySelectorAll("[data-expulsar]").forEach((b) => b.classList.toggle("oculta"));
        return;
      }
      const expulsar = ev.target.closest("[data-expulsar]");
      if (expulsar) {
        const [equipoId, alumnoId] = expulsar.dataset.expulsar.split("__");
        const equipo = equipos.find((x) => String(x._id) === String(equipoId));
        const alumnos = (equipo.alumnos || []).filter((a) => String(a._id || a.id) !== String(alumnoId)).map((a) => a._id || a.id);
        if (!await confirmarMensaje("Expulsar a este estudiante del equipo?")) return;
        try {
          await API.actualizarEquipo(torneoId, equipoId, { alumnos });
          mostrarMensaje("Estudiante expulsado del equipo");
          panelAdminEquipos(torneoId);
        } catch (err) { mostrarMensaje(err.message, "error"); }
        return;
      }
      const agregar = ev.target.closest("[data-agregar-btn]");
      if (agregar) {
        const equipoId = agregar.dataset.agregarBtn;
        const inp = document.getElementById(`eq-agregar-${equipoId}`);
        const alumnoId = inp && inp.dataset.valor;
        if (!alumnoId) { mostrarMensaje("Busque y seleccione un estudiante de la lista"); return; }
        const equipo = equipos.find((x) => String(x._id) === String(equipoId));
        const alumnos = (equipo.alumnos || []).map((a) => a._id || a.id);
        alumnos.push(alumnoId);
        try {
          await API.actualizarEquipo(torneoId, equipoId, { alumnos });
          mostrarMensaje("Estudiante agregado al equipo");
          panelAdminEquipos(torneoId);
        } catch (err) { mostrarMensaje(err.message, "error"); }
        return;
      }
      const eliminar = ev.target.closest("[data-elim-equipo]");
      if (eliminar) {
        if (!await confirmarMensaje("¿Eliminar este equipo?")) return;
        try { await API.eliminarEquipo(torneoId, eliminar.dataset.elimEquipo); panelAdminEquipos(torneoId); }
        catch (err) { mostrarMensaje(err.message, "error"); }
      }
    });
  }
}

// ============================================================
// Mapa (bracket) del torneo estilo Copa del Mundo.
// Se abre en pantalla completa: zoom (lupa), giro horizontal/
// vertical y arrastre con mouse o tacto (responsivo en movil).
// ============================================================
const MAPA = { CARD_W: 210, TH: 84, VS: 34, PAD: 18, H_COL_W: 260, H_GAP: 110, H_LBL: 32, V_GAP: 150, V_LEAF: 40 };
const wcMH = () => MAPA.TH * 2 + MAPA.VS;

const wcIdxGanador = (l) => {
  if (!l.ganador || !l.equipos || !l.equipos.length) return -1;
  const g = l.ganador._id || l.ganador;
  return String(l.equipos[0]._id || l.equipos[0]) === String(g) ? 0 : 1;
};

const wcTeamCard = (l, equipo, idx, top) => {
  if (!equipo) return `<div class="wc-team wc-libre" style="height:${MAPA.TH}px;top:${top}px"><span class="wc-nombre">Por definir</span></div>`;
  const gana = wcIdxGanador(l) === idx;
  const pts = l.puntajeA !== null && l.puntajeA !== undefined
    ? `<span class="wc-puntaje">${idx === 0 ? l.puntajeA : l.puntajeB}</span>` : "";
  return `<div class="wc-team ${gana ? "ganador" : ""}" style="height:${MAPA.TH}px;top:${top}px"><span class="wc-nombre">${esc(equipo.nombre || "Libre")}</span>${pts}</div>`;
};

const wcDuo = (l, x, y, equipos = []) => {
  const a = l.equipos && l.equipos[0] ? l.equipos[0] : null;
  const b = l.equipos && l.equipos[1] ? l.equipos[1] : null;
  const soloLectura = API.usuario && API.usuario.rol === "lector";
  const jugable = !soloLectura && !l.bye && l.estado === "pendiente" && a && b;
  const editable = !soloLectura && !l.bye && l.estado === "pendiente" && l.nivel >= 1;
  const MH = wcMH();
  const topB = MAPA.TH + MAPA.VS;
  const actualA = a ? String(a._id || a) : "";
  const actualB = b ? String(b._id || b) : "";
  const opcionesEq = (lado) => (equipos.length
    ? equipos.map((e) => `<option value="${e._id}" ${String(e._id) === (lado === "a" ? actualA : actualB) ? "selected" : ""}>${esc(e.nombre)}</option>`).join("")
    : "");

  // Tablita de acciones flotante sobre el partido: Registrar Resultado /
  // Editar Emparejamiento. Se superpone al mapa del torneo.
  const acciones = [];
  if (jugable) acciones.push(`<button class="wc-reg" data-toggle-llave="${l._id}">Registrar Resultado</button>`);
  if (editable) acciones.push(`<button class="wc-reg wc-reg-editar" data-edit-llave="${l._id}">Editar Emparejamiento</button>`);
  const barH = acciones.length ? acciones.length * 26 + 4 : 0;
  const barTop = acciones.length ? Math.round(MH / 2 - barH / 2 - 8) : 0;
  const barHTML = acciones.length ? `<div class="wc-acciones" style="top:${barTop}px">${acciones.join("")}</div>` : "";
  const formTop = acciones.length ? barTop + barH + 6 : MH + 8;
  const nombreA = a ? (a.nombre || "Equipo A") : "Equipo A";
  const nombreB = b ? (b.nombre || "Equipo B") : "Equipo B";

  return `<div class="wc-duo" style="left:${Math.round(x)}px;top:${Math.round(y)}px;width:${MAPA.CARD_W}px;height:${MH}px">
    ${wcTeamCard(l, a, 0, 0)}
    ${wcTeamCard(l, b, 1, topB)}
    <div class="wc-vs" style="top:${MAPA.TH + MAPA.VS / 2 - 10}px">${l.bye ? "BYE" : "VS"}</div>
    ${barHTML}
    ${jugable ? `<div class="wc-form oculta" data-form-llave="${l._id}" style="top:${formTop}px">
        <span class="wc-form-equipo">${esc(nombreA)}</span>
        <input class="llave-in" data-in-llave="${l._id}" data-lado="a" placeholder="0" inputmode="numeric">
        <span class="wc-form-equipo">${esc(nombreB)}</span>
        <input class="llave-in" data-in-llave="${l._id}" data-lado="b" placeholder="0" inputmode="numeric">
        <button class="wc-reg" data-guardar-llave="${l._id}">Guardar</button>
      </div>` : ""}
    ${editable ? `<div class="wc-form oculta" data-form-edit-llave="${l._id}" style="top:${formTop + 40}px">
        <select class="llave-in edit-a" data-in-edit-llave="${l._id}" data-lado="a">${opcionesEq("a")}</select>
        <select class="llave-in edit-b" data-in-edit-llave="${l._id}" data-lado="b">${opcionesEq("b")}</select>
        <button class="wc-reg" data-guardar-edicion="${l._id}">OK</button>
      </div>` : ""}
  </div>`;
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const MapaTorneo = { torneoId: null, or: "h", zoom: 1, panX: 0, panY: 0 };

// Renderiza el mapa (horizontal o vertical) dentro del contenedor dado.
async function mostrarBracket(torneoId, div, or = "h") {
  const [llaves, tablas, equipos] = await Promise.all([
    API.llaves(torneoId),
    API.tabla(torneoId).catch(() => []),
    API.equipos(torneoId).catch(() => []),
  ]);
  if (!llaves || !llaves.length) {
    div.innerHTML = `<div class="world-cup"><p class="world-cup-vacio">Aun no hay partidos. Ejecute el sorteo para ver el mapa del torneo.</p></div>`;
    return;
  }
  const llavesElim = llaves.filter((l) => l.nivel >= 1);

  // ---- Tabla de puntuacion unica del torneo ----
  const grupoUnico = (tablas || [])[0] || { grupo: null, tabla: [] };
  const enOrden = (grupoUnico.tabla || []).slice().sort((x, y) => (y.pts - x.pts) || String(x.equipo && x.equipo.nombre ? x.equipo.nombre : "").localeCompare(String(y.equipo && y.equipo.nombre ? y.equipo.nombre : "")));
  const filasT = enOrden.map((f) => `<tr class="${f.pos <= 3 ? "fase-clas" : ""}"><td>${f.pos}</td><td>${esc(f.equipo && f.equipo.nombre ? f.equipo.nombre : "")}</td><td class="fase-pts">${f.pts}</td></tr>`).join("");
  const clasifican = llavesElim.length
    ? "todos clasifican a las eliminatorias"
    : "puntaje general";
  const bandGrupos = `<div class="fase-grupos"><div class="fase-group">
      <div class="fase-titulo">Tabla de puntuacion <span class="fase-sub">${clasifican}</span></div>
      ${filasT ? `<table class="fase-tabla"><thead><tr><th>#</th><th>Equipo</th><th>Pts</th></tr></thead><tbody>${filasT}</tbody></table>` : `<p class="fase-vacio">Sin partidos jugados aun</p>`}
    </div></div>`;

  // ---- Eliminatorias (bracket de clasificacion segun cantidad de equipos) ----
  let elimHTML = "";
  if (llavesElim.length) {
    const maxNivel = Math.max(...llavesElim.map((l) => l.nivel));
    const porNivel = {};
    llavesElim.forEach((l) => {
      (porNivel[l.nivel] = porNivel[l.nivel] || []).push(l);
    });
    Object.values(porNivel).forEach((lista) => lista.sort((a, b) => (a.orden || 0) - (b.orden || 0)));

    const NOMBRES = { 1: ["Final"], 2: ["Semifinal", "Final"], 3: ["Cuartos de Final", "Semifinal", "Final"], 4: ["Octavos de Final", "Cuartos de Final", "Semifinal", "Final"] };
    const nombres = NOMBRES[maxNivel] || [];

    // Calculo del layout vertical del bracket clasico.
    const MH = wcMH();
    const gapV = 64;
    const top = {};
    (porNivel[1] || []).forEach((l, i) => { top[l._id] = 40 + i * (MH + gapV); });
    for (let nv = 2; nv <= maxNivel; nv++) {
      (porNivel[nv] || []).forEach((l, i) => {
        const h1 = porNivel[nv - 1][i * 2];
        const h2 = porNivel[nv - 1][i * 2 + 1];
        const c1 = h1 ? top[h1._id] + MH / 2 : 0;
        const c2 = h2 ? top[h2._id] + MH / 2 : c1;
        top[l._id] = Math.round((c1 + c2) / 2 - MH / 2);
      });
    }

    const colW = MAPA.CARD_W + 110;
    const altoTotal = Math.max(60, Math.max(...Object.keys(top).map((k) => top[k] + MH))) + 90 + 60;
    let canvas = "";
    for (let nv = 1; nv <= maxNivel; nv++) {
      const lista = porNivel[nv] || [];
      const duos = lista.map((l) => wcDuo(l, 26, top[l._id], equipos)).join("");
      canvas += `<div class="wc-col" style="left:${(nv - 1) * colW}px;width:${MAPA.CARD_W + 90}px">
        <div class="wc-ronda-nombre" style="height:26px">${(nombres[nv - 1] || "Ronda " + nv)}</div>
        ${duos}</div>`;
    }
    const final = porNivel[maxNivel] && porNivel[maxNivel][0];
    const campeonEq = final && final.ganador
      ? (final.equipos || []).find((e) => e && (String(e._id) === String(final.ganador._id || final.ganador)))
      : null;
    const campeonHTML = `<div class="wc-campeon" style="left:${maxNivel * colW + 18}px;top:${(top[final && final._id] || 0) + MH / 2 - 28}px">
      <div class="wc-cam-titulo">Campeon</div>
      <div class="wc-cam-nombre">${campeonEq ? esc(campeonEq.nombre) : "Por definir"}</div>
    </div>`;

    elimHTML = `<div class="world-cup"><div class="world-cup-titulo">Eliminatorias</div>
      <div class="world-cup-canvas" style="width:${maxNivel * colW + 240}px;height:${altoTotal}px;position:relative">
        ${campeonHTML}${canvas}
      </div></div>`;
  }

  div.innerHTML = `<div class="fase-layout">${bandGrupos}${elimHTML}</div>`;
  wcEnlazarAcciones(div, torneoId, or);
}

// Botones dentro del mapa (registro de resultados).
// Los botones de la tabla ("Registrar") y del mapa ("Registrar Resultado")
// estan sincronizados: abren/cierran el mismo formulario de la llave.
function wcEnlazarAcciones(cont, torneoId, or) {
  cont.querySelectorAll("[data-toggle-llave]").forEach((bb) => {
    bb.onclick = () => {
      const id = bb.dataset.toggleLlave;
      const form = cont.querySelector(`[data-form-llave="${id}"]`);
      const abierto = form && !form.classList.contains("oculta");
      cont.querySelectorAll(`[data-form-llave="${id}"]`).forEach((f) => f.classList.add("oculta"));
      cont.querySelectorAll(`[data-form-edit-llave="${id}"]`).forEach((f) => f.classList.add("oculta"));
      if (form && !abierto) form.classList.remove("oculta");
    };
  });
  cont.querySelectorAll("[data-in-llave]").forEach((inp) => {
    inp.oninput = () => {
      const id = inp.dataset.inLlave;
      const lado = inp.dataset.lado;
      cont.querySelectorAll(`[data-in-llave="${id}"][data-lado="${lado}"]`).forEach((o) => {
        if (o !== inp) o.value = inp.value;
      });
    };
  });
  cont.querySelectorAll("[data-guardar-llave]").forEach((bb) => {
    bb.onclick = async () => {
      try {
        const id = bb.dataset.guardarLlave;
        const pa = cont.querySelector(`[data-in-llave="${id}"][data-lado="a"]`).value;
        const pb = cont.querySelector(`[data-in-llave="${id}"][data-lado="b"]`).value;
        await API.registrarResultadoLlave(id, { puntajeA: pa, puntajeB: pb });
        mostrarMensaje("Resultado registrado");
        await refrescarMapa();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
  cont.querySelectorAll("[data-edit-llave]").forEach((bb) => {
    bb.onclick = () => {
      const id = bb.dataset.editLlave;
      const form = cont.querySelector(`[data-form-edit-llave="${id}"]`);
      const abierto = form && !form.classList.contains("oculta");
      cont.querySelectorAll(`[data-form-edit-llave="${id}"]`).forEach((f) => f.classList.add("oculta"));
      cont.querySelectorAll(`[data-form-llave="${id}"]`).forEach((f) => f.classList.add("oculta"));
      if (form && !abierto) form.classList.remove("oculta");
    };
  });
  cont.querySelectorAll("[data-guardar-edicion]").forEach((bb) => {
    bb.onclick = async () => {
      try {
        const id = bb.dataset.guardarEdicion;
        const a = cont.querySelector(`[data-in-edit-llave="${id}"][data-lado="a"]`).value;
        const b = cont.querySelector(`[data-in-edit-llave="${id}"][data-lado="b"]`).value;
        if (a === b) { mostrarMensaje("El equipo A y B no pueden ser el mismo"); return; }
        await API.actualizarLlave(id, { equipos: [a, b] });
        mostrarMensaje("Emparejamiento actualizado");
        await refrescarMapa();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
}

// ---------- Pantalla completa del mapa ----------
function asegurarOverlay() {
  let ovl = document.getElementById("mapa-ovl");
  if (ovl) return ovl;
  ovl = document.createElement("div");
  ovl.id = "mapa-ovl";
  ovl.className = "mapa-ovl oculta";
  ovl.innerHTML = `
    <div class="mapa-ovl-bar">
      <div class="mapa-ovl-titulo">Mapa del Torneo</div>
      <div class="mapa-ovl-ctrls">
        <span class="mapa-icono" title="Lupa (zoom)">&#128269;</span>
        <button class="mapa-btn" id="mapa-out" title="Alejar">-</button>
        <span class="mapa-zoom-val" id="mapa-pct">100%</span>
        <button class="mapa-btn" id="mapa-in" title="Acercar">+</button>
        <button class="mapa-btn" id="mapa-girar" title="Girar orientacion (horizontal/vertical)">Girar</button>
        <button class="mapa-btn mapa-btn-cerrar" id="mapa-cerrar" title="Salir del mapa">Salir</button>
      </div>
    </div>
    <div class="mapa-vista" id="mapa-vista">
      <div class="mapa-mundo" id="mapa-mundo">
        <div class="mapa-lienzo" id="mapa-lienzo"></div>
      </div>
      <div class="mapa-hint">Arrastra para desplazar · Girar: horizontal/vertical · Zoom: lupa o rueda (Ctrl)</div>
    </div>`;
  document.body.appendChild(ovl);

  document.getElementById("mapa-cerrar").onclick = cerrarMapa;
  document.getElementById("mapa-in").onclick = () => ajustarZoom(1.25);
  document.getElementById("mapa-out").onclick = () => ajustarZoom(1 / 1.25);
  document.getElementById("mapa-girar").onclick = async () => {
    MapaTorneo.or = MapaTorneo.or === "h" ? "v" : "h";
    await refrescarMapa();
    ajustarAjuste();
  };

  document.addEventListener("keydown", (e) => {
    if (!ovl.classList.contains("oculta") && e.key === "Escape") cerrarMapa();
  });

  // Arrastre (mouse / tactil) y zoom con rueda o pellizco.
  const vista = document.getElementById("mapa-vista");
  const puntos = new Map();
  let pinza = null;
  vista.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, input, select")) return;
    puntos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (puntos.size === 2) {
      const p = [...puntos.values()];
      pinza = { base: Math.max(1, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)), zoom: MapaTorneo.zoom };
    } else {
      pinza = null;
    }
    vista.classList.add("arrastrando");
    vista.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  vista.addEventListener("pointermove", (e) => {
    if (!puntos.has(e.pointerId)) return;
    const antes = puntos.get(e.pointerId);
    puntos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (puntos.size === 2 && pinza) {
      const p = [...puntos.values()];
      const md = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const zn = clamp(pinza.zoom * (md / pinza.base), 0.3, 3);
      const rect = vista.getBoundingClientRect();
      const mx = (p[0].x + p[1].x) / 2 - rect.left;
      const my = (p[0].y + p[1].y) / 2 - rect.top;
      MapaTorneo.panX = mx - (mx - MapaTorneo.panX) * (zn / MapaTorneo.zoom);
      MapaTorneo.panY = my - (my - MapaTorneo.panY) * (zn / MapaTorneo.zoom);
      MapaTorneo.zoom = zn;
    } else if (puntos.size === 1) {
      MapaTorneo.panX += e.clientX - antes.x;
      MapaTorneo.panY += e.clientY - antes.y;
    }
    aplicarVista();
  });
  const soltar = (e) => {
    puntos.delete(e.pointerId);
    pinza = null;
    if (puntos.size === 0) vista.classList.remove("arrastrando");
  };
  vista.addEventListener("pointerup", soltar);
  vista.addEventListener("pointercancel", soltar);
  vista.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      const rect = vista.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const zn = clamp(MapaTorneo.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.3, 3);
      MapaTorneo.panX = cx - (cx - MapaTorneo.panX) * (zn / MapaTorneo.zoom);
      MapaTorneo.panY = cy - (cy - MapaTorneo.panY) * (zn / MapaTorneo.zoom);
      MapaTorneo.zoom = zn;
    } else {
      MapaTorneo.panX -= e.deltaX;
      MapaTorneo.panY -= e.deltaY;
    }
    aplicarVista();
  }, { passive: false });

  return ovl;
}

async function refrescarMapa() {
  const lienzo = document.getElementById("mapa-lienzo");
  if (!lienzo) return;
  lienzo.innerHTML = "<div class='world-cup'><p class='world-cup-vacio'>Cargando mapa del torneo...</p></div>";
  try {
    await mostrarBracket(MapaTorneo.torneoId, lienzo, MapaTorneo.or);
  } catch (err) {
    lienzo.innerHTML = `<div class="world-cup"><p class="world-cup-vacio">${mensajeError(err)}</p></div>`;
  }
}

function aplicarVista() {
  const mundo = document.getElementById("mapa-mundo");
  const pct = document.getElementById("mapa-pct");
  if (mundo) mundo.style.transform = `translate(${MapaTorneo.panX}px, ${MapaTorneo.panY}px) scale(${MapaTorneo.zoom})`;
  if (pct) pct.textContent = Math.round(MapaTorneo.zoom * 100) + "%";
}

function centrarMapa() {
  const vista = document.getElementById("mapa-vista");
  const lienzo = document.getElementById("mapa-lienzo");
  if (!vista || !lienzo) return;
  const vw = vista.clientWidth;
  const vh = vista.clientHeight;
  const w = Math.max(lienzo.offsetWidth, 1);
  const h = Math.max(lienzo.offsetHeight, 1);
  MapaTorneo.panX = (vw - w * MapaTorneo.zoom) / 2;
  MapaTorneo.panY = (vh - h * MapaTorneo.zoom) / 2;
  aplicarVista();
}

// Ajusta el zoom inicial al 200% (mapa grande y legible) y lo centra.
function ajustarAjuste() {
  const vista = document.getElementById("mapa-vista");
  const lienzo = document.getElementById("mapa-lienzo");
  if (!vista || !lienzo) return;
  MapaTorneo.zoom = clamp(2, 0.3, 3);
  centrarMapa();
}

function ajustarZoom(factor) {
  const vista = document.getElementById("mapa-vista");
  const rect = vista ? vista.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const zn = clamp(MapaTorneo.zoom * factor, 0.3, 3);
  MapaTorneo.panX = cx - (cx - MapaTorneo.panX) * (zn / MapaTorneo.zoom);
  MapaTorneo.panY = cy - (cy - MapaTorneo.panY) * (zn / MapaTorneo.zoom);
  MapaTorneo.zoom = zn;
  aplicarVista();
}

async function abrirMapaTorneo(torneoId, nombreTorneo = "") {
  const ovl = asegurarOverlay();
  ovl.classList.remove("oculta");
  document.body.classList.add("mapa-abierto");
  MapaTorneo.torneoId = torneoId;
  const titulo = ovl.querySelector(".mapa-ovl-titulo");
  if (titulo) titulo.textContent = nombreTorneo || "Mapa del Torneo";
  MapaTorneo.or = "h";
  MapaTorneo.zoom = 2;
  MapaTorneo.panX = 0;
  MapaTorneo.panY = 0;
  await refrescarMapa();
  ajustarAjuste();
}

function cerrarMapa() {
  const ovl = document.getElementById("mapa-ovl");
  if (ovl) ovl.classList.add("oculta");
  document.body.classList.remove("mapa-abierto");
}

async function panelAdminInscripciones() {
  const [ins, est, act, tor] = await Promise.all([
    API.inscripciones(), API.establecimientos(), API.actividades(), API.torneos(),
  ]);
  const opEst = est.map((e) => ({ valor: String(e._id), texto: `${e.codigo} - ${e.nombre}` }));
  const opActCat = opcionesActividadCategoria(act);
  const opTor = tor.map((t) => ({ valor: String(t._id), texto: t.nombre }));
  contenido(
    `<h2 class="pagina">Control de Inscripciones</h2>
     <div class="seccion"><button class="btn btn-primario2" id="btn-nueva-ins">+ Nueva Inscripcion</button></div>
     <div id="form-nueva-ins" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Establecimiento</label>${comboHtml("ins-est-txt", "Buscar establecimiento...")}<input type="hidden" id="ins-est"></div>
         <div class="campo"><label>Actividad (Categoria)</label>${comboHtml("ins-act-txt", "Buscar actividad y categoria...")}<input type="hidden" id="ins-act"><input type="hidden" id="ins-div"></div>
         <div class="campo"><label>Torneo (opcional)</label>${comboHtml("ins-tor-txt", "Buscar torneo...")}<input type="hidden" id="ins-tor"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-ins">Enviar</button>
     </div>
     <div class="act-buscador">
       <input id="buscador-ins" type="search" placeholder="Buscar por establecimiento, actividad o categoria..." aria-label="Buscar inscripcion">
       <span id="cont-ins" class="act-buscador-contador">0 inscripciones</span>
     </div>
     <p id="ins-sin-resultados" class="muted oculta" style="padding:14px">No se encontraron inscripciones.</p>
     <div class="tarjeta"><div id="ins-tabla"></div></div>`
  );
  $("#btn-nueva-ins").onclick = () => $("#form-nueva-ins").classList.toggle("oculta");
  initCombo("ins-est-txt", opEst, (o) => { $("#ins-est").value = o.valor; }, "Buscar establecimiento...");
  initCombo("ins-act-txt", opActCat, (o) => {
    $("#ins-act").value = o.extra.actividad;
    $("#ins-div").value = o.extra.division;
  }, "Buscar actividad y categoria...");
  initCombo("ins-tor-txt", opTor, (o) => { $("#ins-tor").value = o.valor; }, "Buscar torneo...");
  $("#btn-guardar-ins").onclick = async () => {
    try {
      const nuevo = await API.crearInscripcion({ establecimiento: $("#ins-est").value, actividad: $("#ins-act").value, division: $("#ins-div").value });
      if ($("#ins-tor").value) { /* asociacion requiere endpoint aparte; se omite por simplicidad */ }
      void nuevo;
      panelAdminInscripciones();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  const normIns = (v) => String(v || "").toLowerCase().trim();
  const renderInscripciones = () => {
    const q = normIns($("#buscador-ins").value);
    const lista = ins.filter((i) => {
      if (!q) return true;
      const texto = normIns([
        i.establecimiento ? (i.establecimiento.nombre || i.establecimiento) : "",
        i.actividad ? (i.actividad.nombre || i.actividad) : "",
        i.division, i.estado,
      ].join(" "));
      return texto.includes(q);
    });
    const p = paginarUI(lista, "inscripciones");
    $("#ins-tabla").innerHTML = `<table><thead><tr><th>Establecimiento</th><th>Actividad</th><th>Division</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${p.items.length ? p.items.map((i) => `<tr>
        <td>${esc(i.establecimiento ? i.establecimiento.nombre : i.establecimiento)}</td>
        <td>${esc(i.actividad ? i.actividad.nombre : i.actividad)}</td>
        <td>${esc(i.division)}</td>
        <td><span class="estado est-${esc(i.estado)}">${esc(i.estado)}</span></td>
        <td>${i.estado === "en_proceso" ? `<button class="btn btn-ok btn-mini" data-acc="${i._id}" data-est="aceptada">Aceptar</button> <button class="btn btn-err2 btn-mini" data-acc="${i._id}" data-est="rechazada">Rechazar</button>` : "-"}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="muted">Sin inscripciones.</td></tr>`}</tbody></table>
      ${htmlPaginacion("inscripciones", p)}`;
    document.querySelectorAll("[data-acc]").forEach((b) => {
      b.onclick = async () => {
        try { await API.cambiarEstadoInscripcion(b.dataset.acc, b.dataset.est); panelAdminInscripciones(); }
        catch (err) { mostrarMensaje(err.message, "error"); }
      };
    });
    conectarPaginacion(renderInscripciones);
    const aviso = document.getElementById("ins-sin-resultados");
    if (aviso) aviso.classList.toggle("oculta", !(q && lista.length === 0));
    const contador = document.getElementById("cont-ins");
    if (contador) contador.textContent = lista.length + " inscripcion(es)";
  };
  const buscarIns = () => { reiniciarPaginaUI("inscripciones"); renderInscripciones(); };
  $("#buscador-ins").addEventListener("input", buscarIns);
  renderInscripciones();
}

async function panelAdminValoraciones() {
  const [est, act] = await Promise.all([API.establecimientos(), API.actividades()]);
  const opEst = est.map((e) => ({ valor: String(e._id), texto: `${e.codigo} - ${e.nombre}` }));
  const opActCat = opcionesActividadCategoria(act);
  contenido(
    `<div class="encabezado"><h2 class="pagina">Ranking de Cumplimiento</h2><button class="btn btn-primario2" id="btn-nueva-val">+ Asignar</button></div>
     <div id="form-nueva-val" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Establecimiento</label>${comboHtml("val-est-txt", "Buscar establecimiento...")}<input type="hidden" id="val-est"></div>
         <div class="campo"><label>Actividad (Categoria)</label>${comboHtml("val-act-txt", "Buscar actividad y categoria...")}<input type="hidden" id="val-act"></div>
         <div class="campo"><label>Estado</label><select id="val-estado"><option value="cumple">cumple</option><option value="regular">regular</option><option value="no_cumple">no_cumple</option></select></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-val">Guardar</button>
     </div>
     <div id="ranking"></div>`
  );
  $("#btn-nueva-val").onclick = () => $("#form-nueva-val").classList.toggle("oculta");
  initCombo("val-est-txt", opEst, (o) => { $("#val-est").value = o.valor; }, "Buscar establecimiento...");
  initCombo("val-act-txt", opActCat, (o) => { $("#val-act").value = o.extra.actividad; }, "Buscar actividad y categoria...");
  $("#btn-guardar-val").onclick = async () => {
    try {
      await API.asignarValoracion({
        establecimiento: $("#val-est").value, actividad: $("#val-act").value,
        estado: $("#val-estado").value, anio: new Date().getFullYear(), semestre: 1,
      });
      panelAdminValoraciones();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  const ranking = await API.ranking();
  const filasRanking = [];
  Object.entries(ranking).forEach(([nombre, filas]) => {
    (filas || []).forEach((f) => filasRanking.push({ actividad: nombre, ...f }));
  });
  const pRanking = paginarUI(filasRanking, "ranking");
  $("#ranking").innerHTML = `<div class="tarjeta"><table><thead><tr><th>Actividad</th><th>Establecimiento</th><th>Estado</th><th>Valor</th></tr></thead>
    <tbody>${pRanking.items.length
      ? pRanking.items.map((f) => `<tr><td>${esc(f.actividad)}</td><td>${esc(f.establecimiento)}</td><td><span class="badge-rol">${esc(f.estado)}</span></td><td>${f.valor}</td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">Sin valoraciones registradas.</td></tr>`}</tbody></table>
    ${htmlPaginacion("ranking", pRanking)}</div>`;
  conectarPaginacion(panelAdminValoraciones);
}

const SOLICITUDES_UI = { tabAdmin: "pend", tabCoord: "pend" };

function fechaSolicitud(valor) {
  if (!valor) return "-";
  const d = new Date(valor);
  return isNaN(d) ? String(valor) : d.toLocaleString("es-CL");
}

function filaSolicitudHtml(s, conAcciones) {
  const nAl = (s.alumnos && s.alumnos.length) ? s.alumnos.length : (s.alumno && s.alumno.rut ? 1 : 0);
  return `<tr>
    <td>${esc(s.tipo)}${s.codigo ? `<div class="muted">${esc(s.codigo)}</div>` : ""}</td>
    <td>${esc(s.detalle)} <span class="muted">(${nAl} estudiante${nAl === 1 ? "" : "s"})</span>${nAl > 1 ? ` <button class="btn btn-mini" data-ver-sol="${s._id}">Ver estudiantes</button>` : ""}${s.respuesta ? `<div class="muted">Respuesta: ${esc(s.respuesta)}</div>` : ""}</td>
    <td>${esc(s.establecimiento ? `${s.establecimiento.codigo} - ${s.establecimiento.nombre}` : "-")}</td>
    <td>${esc(s.rutSolicitante || "-")}</td>
    <td>${esc(fechaSolicitud(s.createdAt))}</td>
    <td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td>
    ${conAcciones ? `<td>
      <button class="btn btn-ok btn-mini" data-sol-acc="${s._id}" data-sol-est="aprobada">Aprobar</button>
      <button class="btn btn-err2 btn-mini" data-sol-acc="${s._id}" data-sol-est="rechazada">Rechazar</button>
    </td>` : ""}
  </tr>`;
}

function tablaSolicitudesHtml(items, prefijo, conAcciones) {
  const p = paginarUI(items, prefijo);
  return `<div class="tarjeta">
    <table><thead><tr><th>Tipo</th><th>Detalle</th><th>Establecimiento</th><th>Solicitante</th><th>Fecha</th><th>Estado</th>${conAcciones ? "<th>Acciones</th>" : ""}</tr></thead>
    <tbody>${p.items.length
      ? p.items.map((s) => filaSolicitudHtml(s, conAcciones)).join("")
      : `<tr><td colspan="${conAcciones ? 7 : 6}" class="muted">Sin solicitudes.</td></tr>`}</tbody></table>
    ${htmlPaginacion(prefijo, p)}
  </div>`;
}

// Botones superiores: alternan entre Pendientes e Historial (reemplazan el
// listado, no se muestran ambos a la vez).
function tabsSolicitudesHtml(tab, pendientes, historial, scope) {
  return `<div class="seccion">
      <button class="btn ${tab === "pend" ? "btn-primario2" : "btn-mini"}" data-sol-tab="pend" data-sol-scope="${scope}">Pendientes (${pendientes.length})</button>
      <button class="btn ${tab === "hist" ? "btn-primario2" : "btn-mini"}" data-sol-tab="hist" data-sol-scope="${scope}">Historial (${historial.length})</button>
    </div>`;
}

function conectarTabsSolicitudes(scope, recargar) {
  document.querySelectorAll(`[data-sol-scope="${scope}"]`).forEach((b) => {
    b.onclick = () => {
      const tab = b.dataset.solTab;
      if (scope === "admin") SOLICITUDES_UI.tabAdmin = tab;
      else SOLICITUDES_UI.tabCoord = tab;
      const prefijo = scope === "admin"
        ? (tab === "pend" ? "solPend" : "solHist")
        : (tab === "pend" ? "solCoordPend" : "solCoordHist");
      reiniciarPaginaUI(prefijo);
      recargar();
    };
  });
}

async function panelAdminSolicitudes() {
  const sol = await API.solicitudes();
  window.SOLICITUDES_CACHE = sol;
  const pendientes = sol.filter((s) => s.estado === "en_proceso");
  const historial = sol.filter((s) => s.estado !== "en_proceso");
  const tab = SOLICITUDES_UI.tabAdmin;
  const items = tab === "pend" ? pendientes : historial;
  const prefijo = tab === "pend" ? "solPend" : "solHist";
  contenido(
    `<h2 class="pagina">Solicitudes</h2>
     <p class="muted">Apruebe o rechace las solicitudes enviadas por los coordinadores. El estudiante se agrega a la nomina solo cuando la solicitud es aprobada.</p>
     ${tabsSolicitudesHtml(tab, pendientes, historial, "admin")}
     <h3 class="pagina">${tab === "pend" ? "Pendientes" : "Historial"} (${items.length})</h3>
     ${tablaSolicitudesHtml(items, prefijo, tab === "pend")}`
  );
  conectarTabsSolicitudes("admin", panelAdminSolicitudes);
  conectarPaginacion(panelAdminSolicitudes);
  document.querySelectorAll("[data-ver-sol]").forEach((b) => {
    b.onclick = () => {
      const s = (window.SOLICITUDES_CACHE || []).find((x) => String(x._id) === String(b.dataset.verSol));
      if (!s) return;
      const alumnos = s.alumnos && s.alumnos.length ? s.alumnos : (s.alumno && s.alumno.rut ? [s.alumno] : []);
      const txt = alumnos.map((a, i) => `${i + 1}. ${a.rut} - ${a.nombre} (${a.genero || "-"}) ${a.fechaNacimiento || ""}`).join("\\n");
      alert(`Estudiantes de la solicitud ${s.codigo || s._id}:\\n\\n${txt}`);
    };
  });
  document.querySelectorAll("[data-sol-acc]").forEach((b) => {
    b.onclick = async () => {
      const estado = b.dataset.solEst;
      if (estado === "rechazada") {
        const ok = await confirmarMensaje(
          "Se rechazara esta solicitud y el estudiante no sera agregado a la nomina.",
          "Rechazar solicitud",
          "Rechazar",
          true
        );
        if (!ok) return;
      }
      try {
        const r = await API.responderSolicitud(
          b.dataset.solAcc,
          estado,
          estado === "aprobada" ? "Aprobada por el Admin DAEM" : "Rechazada por el Admin DAEM"
        );
        mostrarMensaje(r.mensaje || "Solicitud respondida", "ok");
        panelAdminSolicitudes();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
}

async function panelAdminAgenda() {
  const { eventos } = await API.agendaTorneos().catch(() => ({ eventos: [] }));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const aYMD = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const hoyStr = aYMD(hoy);

  const eventosPorDia = {};
  for (const ev of eventos) {
    const d = new Date(ev.fecha);
    const clave = aYMD(d);
    if (!eventosPorDia[clave]) eventosPorDia[clave] = [];
    eventosPorDia[clave].push(ev);
  }

  // ------- Constructor del calendario mensual -------
  function construirCalendario() {
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();
    const primerDia = new Date(anio, mes, 1);
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const offset = primerDia.getDay(); // 0 = domingo
    const nombresDias = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    let html = `<div class="cal-nombre">${meses[mes]} ${anio}</div>`;
    html += `<div class="cal-grid cal-dias">${nombresDias.map((n) => `<div class="cal-dia-nombre">${n}</div>`).join("")}</div>`;
    html += `<div class="cal-grid">`;
    for (let i = 0; i < offset; i++) html += `<div class="cal-celda vacio"></div>`;
    for (let d = 1; d <= diasEnMes; d++) {
      const clave = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const hayEventos = !!eventosPorDia[clave];
      const esHoy = clave === hoyStr;
      html += `<div class="cal-celda ${esHoy ? "hoy" : ""} ${hayEventos ? "con-evento" : ""}" data-dia="${clave}">
        <span class="cal-num">${d}</span>
        ${hayEventos ? `<span class="punto-torneo" title="${eventosPorDia[clave].length} torneo(s)"></span>` : ""}
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  function listarEventos(seleccionDia, buscarTexto) {
    const buscar = (buscarTexto || "").toLowerCase().trim();
    const seleccion = seleccionDia || hoyStr;

    // Busqueda global: por nombre del torneo o por fecha.
    let filtrados = eventos;
    let esFecha = false;
    if (buscar) {
      const normBuscar = buscar
        .replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")
        .replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, (m, d, mo, y) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      esFecha = /^\d{4}-\d{2}-\d{2}$/.test(normBuscar);
      filtrados = eventos.filter((ev) => {
        if (esFecha) return aYMD(new Date(ev.fecha)) === normBuscar;
        return ev.torneo.toLowerCase().includes(buscar) || ev.actividad.toLowerCase().includes(buscar);
      });
    } else if (seleccionDia) {
      filtrados = eventos.filter((ev) => aYMD(new Date(ev.fecha)) === seleccionDia);
    } else {
      filtrados = eventos.filter((ev) => aYMD(new Date(ev.fecha)) === hoyStr);
    }
    filtrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const mostrando = buscar ? "Resultados de busqueda" : (seleccionDia ? `Torneos del ${seleccionDia}` : "Torneos de hoy");
    const puedeEditar = API.usuario && API.usuario.rol === "admin";

    const p = paginarUI(filtrados, "agenda");
    const lista = p.items.length ? p.items.map((ev) => `
      <div class="item-agenda">
        <div class="item-agenda-cuerpo">
          <strong>${esc(ev.torneo)}</strong>
          <span class="badge-rol">${esc(ev.division || ev.actividad)}</span>
          <p class="muted"><span class="badge-rol">${esc(ev.fase || ev.grupo || "Fase de Grupos")}</span></p>
          <p class="agenda-equipos"><strong>${esc(ev.equipos && ev.equipos[0] ? ev.equipos[0] : "Por definir")}</strong> vs <strong>${esc(ev.equipos && ev.equipos[1] ? ev.equipos[1] : "Por definir")}</strong></p>
          <p class="muted">${esc(new Date(ev.fecha).toLocaleDateString("es-CL"))} - ${esc(ev.hora)}${ev.horaTermino ? ` a ${esc(ev.horaTermino)}` : ""} @ ${esc(ev.lugar)}</p>
        </div>
        ${puedeEditar ? `<button class="btn btn-mini btn-primario2 item-agenda-editar" data-editar-partido="${ev.llaveId}" data-t-id="${ev.torneoId}" data-t-nombre="${esc(ev.torneo)}" data-t-formato="${esc(ev.formato || "amistoso")}">Editar</button>` : ""}
      </div>`).join("")
      : `<p class="muted">No hay torneos para esta fecha.</p>`;

    return `
      <div class="separador-agenda">${esc(mostrando)}</div>
      ${lista}
      ${p.items.length ? htmlPaginacion("agenda", p) : ""}`;
  }

  contenido(
    `<h2 class="pagina">Agenda de Torneos</h2>
     <div class="agenda-layout">
       <div class="panel-calendario">
         ${construirCalendario()}
       </div>
       <div class="panel-lista">
         <div class="campo">
           <label>Buscar torneo o fecha</label>
           <input id="agenda-buscar" placeholder="Nombre del torneo o fecha (aaaa-mm-dd)">
         </div>
         <div id="agenda-lista">${listarEventos(null, "")}</div>
       </div>
     </div>`
  );

  const renderAgenda = (dia, texto) => {
    const cont = $("#agenda-lista");
    cont.innerHTML = listarEventos(dia, texto);
    conectarPaginacion(() => renderAgenda(dia, texto), cont);
  };
  conectarPaginacion(() => renderAgenda(null, ""), $("#agenda-lista"));

  const render = () => {
    reiniciarPaginaUI("agenda");
    renderAgenda(null, $("#agenda-buscar").value);
  };

  $("#agenda-buscar").addEventListener("input", render);

  // Boton "Editar" de cada partido: abre los partidos del torneo (Torneos y Sorteo)
  // con el horario de ese partido listo para cambiar el dia y guardar.
  $("#agenda-lista").addEventListener("click", (e) => {
    const b = e.target.closest("[data-editar-partido]");
    if (!b) return;
    verPartidos(b.dataset.tId, b.dataset.tNombre || "Partidos", b.dataset.tFormato || "amistoso", b.dataset.editarPartido);
  });

  document.querySelectorAll(".cal-celda").forEach((c) => {
    if (c.classList.contains("vacio")) return;
    c.onclick = () => {
      document.querySelectorAll(".cal-celda").forEach((x) => x.classList.remove("seleccionado"));
      c.classList.add("seleccionado");
      $("#agenda-buscar").value = "";
      reiniciarPaginaUI("agenda");
      renderAgenda(c.dataset.dia, "");
    };
  });
}

async function panelAdminReportes() {
  const [part, ben, hist] = await Promise.all([
    API.participaciones().catch(() => []),
    API.beneficiarios().catch(() => ({ total: 0, semestres: [], porEstablecimiento: [] })),
    API.historico().catch(() => ({})),
  ]);
  const pBen = paginarUI(ben.porEstablecimiento || [], "repBen");
  const pPart = paginarUI(part, "repPart");
  contenido(
    `<h2 class="pagina">Reportes y Estadisticas</h2>
     <div class="tarjeta"><h3>Total de Estudiantes Participantes</h3>
       <div class="stat"><div class="num">${ben.total}</div><div class="lbl">Estudiantes participantes</div></div>
       ${(ben.semestres || []).map((s) => `<span class="stat"><div class="num">${s.total}</div><div class="lbl">Semestre ${s._id}</div></span>`).join("")}
       <div class="stat"><div class="num">${(ben.porEstablecimiento || []).length}</div><div class="lbl">Establecimientos participantes</div></div>
       <h4 style="margin:14px 0 8px">Estudiantes por establecimiento</h4>
       <table><thead><tr><th>Codigo</th><th>Establecimiento</th><th>Estudiantes</th></tr></thead>
       <tbody>${pBen.items.map((e) => `<tr><td>${esc(e.codigo)}</td><td>${esc(e.nombre)}</td><td>${e.total}</td></tr>`).join("")}</tbody></table>
       ${htmlPaginacion("repBen", pBen)}
     </div>
     <div class="tarjeta"><h3>Participaciones por Establecimiento</h3>
       <table><thead><tr><th>Codigo</th><th>Establecimiento</th><th>Total</th><th>Aceptadas</th></tr></thead>
       <tbody>${pPart.items.map((p) => `<tr><td>${esc(p.codigo)}</td><td>${esc(p.nombre)}</td><td>${p.total}</td><td>${p.aceptadas}</td></tr>`).join("")}</tbody></table>
       ${htmlPaginacion("repPart", pPart)}
     </div>
     <div class="tarjeta"><h3>Trazabilidad Historica</h3>
       <p class="muted">${esc(JSON.stringify(hist.porAnio || []))}</p>
     </div>`
  );
  conectarPaginacion(panelAdminReportes);
}

// ============================================================
// PANELES COORDINADOR
// ============================================================
async function panelCoordResumen() {
  const [nomina, notifs, tor] = await Promise.all([
    API.nomina().catch(() => ({ total: 0, porActividad: [] })),
    API.notificaciones().catch(() => ({ notificaciones: [], pendientes: 0 })),
    API.torneos().catch(() => []),
  ]);
  const lista = notifs.notificaciones || [];
  const pendientes = notifs.pendientes || 0;
  contenido(
    `<div class="postula-fila">
      <div class="postula-cartelera">
        <div class="cabeza-panel">
          <h2 class="pagina">Resumen del Establecimiento</h2>
        </div>
        <div class="stat"><div class="num">${nomina.total}</div><div class="lbl">Estudiantes inscritos</div></div>
        <div class="seccion">
          <button class="btn" id="btn-vercat">Ver Cartelera</button>
          <button class="btn" id="btn-ir-torneos">Ir a Torneos</button>
          ${bloqueInscribirNuevoHtml()}
        </div>
        ${formInscribirNuevoHtml()}
        <div id="cartelera" class="oculta"></div>
        ${bloqueTorneosInscripcionHtml(tor)}
      </div>
      <div class="postula-ins">${bloqueNotificacionesHtml(lista, pendientes)}</div>
     </div>`
  );
  $("#btn-vercat").onclick = () => cargarCarteleraEn("#cartelera");
  $("#btn-ir-torneos").onclick = () => navegar("coordTorneos");
  const btnHistorial = document.getElementById("btn-ver-historial-notifs");
  if (btnHistorial) btnHistorial.onclick = () => navegar("notificaciones");
  notifsEnlazar(() => panelCoordResumen());
  conectarPaginacion(panelCoordResumen);
  await enlazarInscribirNuevo(() => panelCoordResumen());
}

// Inscribir un estudiante nuevo a una actividad: boton directo en el
// dashboard del coordinador (Resumen y Postulaciones). El boton va dentro
// de la fila de acciones; el formulario es un bloque aparte (la fila es
// flex-row y no debe contener el formulario).
function bloqueInscribirNuevoHtml() {
  return `<button class="btn" id="btn-ins-nuevo">+ Agregar a Mi Nomina</button>`;
}

function formInscribirNuevoHtml() {
  return `<div id="form-ins-nuevo" class="tarjeta oculta" style="margin-top:10px">
      <h4>Solicitar inscripcion de estudiante nuevo a una actividad</h4>
      <p class="muted">La solicitud queda pendiente hasta que el Admin DAEM la apruebe.</p>
      <div class="grid-2">
        <div class="campo"><label>Actividad (Categoria)</label>${comboHtml("insn-act-txt", "Buscar actividad y categoria...")}<input type="hidden" id="insn-act"><input type="hidden" id="insn-div"></div>
        <div class="campo"><label>RUT</label><input id="insn-rut" autocomplete="off"></div>
        <div class="campo"><label>Nombres</label><input id="insn-nom" autocomplete="off"></div>
        <div class="campo"><label>Apellidos</label><input id="insn-ape" autocomplete="off"></div>
        <div class="campo"><label>Apoderado</label><input id="insn-apo" autocomplete="off"></div>
        <div class="campo"><label>Genero</label><select id="insn-gen"><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
        <div class="campo"><label>Fecha nacimiento</label><input type="date" id="insn-fec"></div>
        <div class="campo"><label>Edad (automatica)</label><input id="insn-edad" readonly></div>
        <div class="campo"><label>Email</label><input id="insn-email" autocomplete="off"></div>
        <div class="campo"><label>Telefono</label><input id="insn-tel" autocomplete="off"></div>
      </div>
      <button class="btn btn-ok" id="btn-guardar-insn">Enviar solicitud</button>
    </div>`;
}

async function enlazarInscribirNuevo(alRefrescar) {
  const btn = $("#btn-ins-nuevo");
  if (!btn) return;
  btn.onclick = () => $("#form-ins-nuevo").classList.toggle("oculta");
  const act = await API.actividades().catch(() => []);
  initCombo("insn-act-txt", opcionesActividadCategoria(act), (o) => {
    $("#insn-act").value = o.extra.actividad;
    $("#insn-div").value = o.extra.division;
  }, "Buscar actividad y categoria...");
  const fec = $("#insn-fec");
  if (fec) fec.addEventListener("input", () => {
    const nac = new Date(fec.value);
    const hoy = new Date();
    let edad = "";
    if (fec.value && !isNaN(nac)) {
      let e = hoy.getFullYear() - nac.getFullYear();
      const m = hoy.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
      edad = `${e} anio(s)`;
    }
    const campo = $("#insn-edad");
    if (campo) campo.value = edad;
  });
  $("#btn-guardar-insn").onclick = async () => {
    const division = $("#insn-div").value;
    const rut = $("#insn-rut").value.trim();
    const nom = $("#insn-nom").value.trim();
    const ape = $("#insn-ape").value.trim();
    const fecV = $("#insn-fec").value;
    const genero = $("#insn-gen").value;
    if (!division) { mostrarMensaje("Seleccione la actividad y categoría.", "error"); return; }
    if (!rut || !nom || !fecV) { mostrarMensaje("Complete al menos RUT, Nombres y Fecha de nacimiento.", "error"); return; }
    // Validación de requisitos en el cliente antes de enviar la solicitud
    const errorReq = validarRequisitosAlumnoFront(fecV, genero, division, null);
    if (errorReq) { mostrarMensaje(errorReq, "error"); return; }
    try {
      const r = await API.solicitarEstudiante({
        actividad: $("#insn-act").value,
        division,
        alumno: {
          rut,
          nombre: `${nom} ${ape}`.trim(),
          apoderado: $("#insn-apo").value.trim(),
          genero,
          fechaNacimiento: fecV,
          email: $("#insn-email").value.trim(),
          telefono: $("#insn-tel").value.trim(),
        },
      });
      mostrarMensaje(r.mensaje || "Solicitud enviada al Admin DAEM", "ok");
      alRefrescar();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
}

async function cargarCarteleraEn(sel) {
  const div = $(sel);
  if (div.innerHTML) { div.classList.toggle("oculta"); return; }
  const act = await API.actividades();

  // Cartelera solo informativa: lista de actividades disponibles,
  // generalizadas por nombre (la BD repite el mismo nombre en varias filas).
  // La inscripcion de estudiantes y la participacion en torneos se hace en
  // los bloques dedicados, y el torneo valida los requisitos al inscribir.
  // El backend entrega las actividades de la mas actualizada a la mas antigua;
  // la deduplicacion por nombre conserva la fila mas reciente.
  const vistos = new Set();
  const lista = [];
  for (const a of act) {
    const clave = String(a.nombre || "").toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    lista.push({ nombre: a.nombre, area: a.area });
  }

  div.innerHTML = `<div class="grid-2 cartelera-f">
      <div class="campo"><label>Buscar actividad</label><input id="cart-buscar" placeholder="Por nombre o area..." autocomplete="off"></div>
      <div class="campo"><label>Area</label><select id="cart-area"><option value="">Todas las areas</option>${(CAT.areas || []).map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}</select></div>
    </div><div id="cart-items"></div>`;
  const cartBuscar = $("#cart-buscar");
  const cartArea = $("#cart-area");
  const itemsCart = $("#cart-items");
  const estadoCart = { q: "", area: "" };
  const renderCart = () => {
    const q = estadoCart.q.trim().toLowerCase();
    const ar = estadoCart.area;
    const filtradas = lista.filter((a) =>
      (!q || (a.nombre + " " + a.area).toLowerCase().includes(q)) &&
      (!ar || a.area === ar)
    );
    const p = paginarUI(filtradas, "cartelera");
    itemsCart.innerHTML = filtradas.length
      ? p.items.map((a) => `<div class="tarjeta"><h3>${esc(a.nombre)} <span class="badge-rol">${esc(a.area)}</span></h3></div>`).join("") + htmlPaginacion("cartelera", p)
      : "<p class='muted'>No hay actividades publicadas.</p>";
    conectarPaginacion(renderCart, itemsCart);
  };
  if (cartBuscar) cartBuscar.oninput = () => { estadoCart.q = cartBuscar.value || ""; reiniciarPaginaUI("cartelera"); renderCart(); };
  if (cartArea) cartArea.onchange = () => { estadoCart.area = cartArea.value; reiniciarPaginaUI("cartelera"); renderCart(); };
  renderCart();
  div.classList.remove("oculta");
}

// Bloque informativo de torneos con inscripcion abierta (se muestra como
// seccion propia en el Resumen del coordinador, fuera de la cartelera).
function bloqueTorneosInscripcionHtml(tor) {
  const abiertos = (tor || []).filter((t) => !["suspendido", "cancelado", "finalizado"].includes(t.estado));
  if (!abiertos.length) return "";
  const p = paginarUI(abiertos, "coordTorResumen");
  return `<h3 class="pagina">Torneos con inscripcion</h3>` + p.items.map((t) => {
    const req = t.requisitos || {};
    const inicio = t.fechaAperturaInscripcion ? new Date(t.fechaAperturaInscripcion) : null;
    const fin = t.fechaCierreInscripcion ? new Date(t.fechaCierreInscripcion) : null;
    const reqTxt = req.activo
      ? `Edad ${req.edadMinima ?? "?"}-${req.edadMaxima ?? "?"} anios${req.genero ? ` | Solo ${req.genero}` : ""}`
      : "Sin requisitos";
    return `<div class="tarjeta"><h3>${esc(t.nombre)} <span class="badge-rol">${esc(t.division || "")}</span></h3>
    <p class="muted">Actividad: ${esc(t.actividad ? t.actividad.nombre : "-")} | Categoria: ${esc(t.division || "Sin categoria")}</p>
    <p class="muted">Apertura: ${inicio ? inicio.toLocaleDateString("es-CL") : "-"} | Cierre: ${fin ? fin.toLocaleDateString("es-CL") : "-"}</p>
    <p class="muted">Requisitos: ${esc(reqTxt)}</p></div>`;
  }).join("") + htmlPaginacion("coordTorResumen", p);
}

async function panelCoordLectores() {
  const usuarios = await API.usuarios();
  const p = paginarUI(usuarios, "lectores");
  contenido(
    `<div class="encabezado"><h2 class="pagina">Lectores del Establecimiento</h2><button class="btn btn-primario2" id="btn-nuevo-enc">+ Nuevo Lector</button></div>
     <div id="form-nuevo-enc" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>RUT</label><input id="enc-rut"></div>
         <div class="campo"><label>Nombre</label><input id="enc-nombre"></div>
         <div class="campo"><label>Clave</label><input id="enc-clave"></div>
         <div class="campo"><label>Correo</label><input id="enc-correo" type="email"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-enc">Guardar</button>
     </div>
     <div class="tarjeta"><table><thead><tr><th>RUT</th><th>Nombre</th><th>Establecimiento</th><th>Correo</th><th>Acciones</th></tr></thead>
     <tbody>${p.items.map((u) => `<tr><td>${esc(u.rut)}</td><td>${esc(u.nombre)}</td><td>${esc(u.establecimiento ? u.establecimiento.nombre : "-")}</td><td>${esc(u.email || "-")}</td>
     <td><button class="btn btn-err2 btn-mini" data-elim-enc="${esc(u._id)}">Eliminar</button></td></tr>`).join("")}</tbody></table>
     ${htmlPaginacion("lectores", p)}</div>`
  );
  conectarPaginacion(panelCoordLectores);
  $("#btn-nuevo-enc").onclick = () => $("#form-nuevo-enc").classList.toggle("oculta");
  $("#btn-guardar-enc").onclick = async () => {
    try {
      await API.crearUsuario({
        rut: $("#enc-rut").value, nombre: $("#enc-nombre").value, rol: "lector",
        clave: $("#enc-clave").value, email: $("#enc-correo").value, establecimiento: API.usuario.establecimiento._id,
      });
      panelCoordLectores();
    } catch (err) { mostrarMensaje(err.message, "error"); }
  };
  document.querySelectorAll("[data-elim-enc]").forEach((b) => {
    b.onclick = async () => {
      const fila = b.closest("tr");
      const nombre = fila ? fila.querySelectorAll("td")[1].textContent.trim() : "";
      const si = await confirmarMensaje(`¿Eliminar al lector ${nombre ? `"${nombre}" ` : ""}? Esta accion no se puede deshacer.`, "Eliminar lector", "Eliminar", true);
      if (!si) return;
      try {
        await API.eliminarUsuario(b.dataset.elimEnc);
        panelCoordLectores();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
}

// ============================================================
// Mis inscripciones: tabla + checklist de participantes. El coordinador
// marca, alumno por alumno, quienes de la inscripcion quieren jugar el
// torneo que corresponde a su actividad/categoria.
// Se usa en Postulaciones y en el dashboard del coordinador.
// ============================================================
function bloqueMisInscripcionesHtml(ins) {
  const p = paginarUI(ins, "misIns");
  return `<div class="postula-ins tarjeta">
          <div class="cabeza-panel" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
            <h3 style="margin:0">Mi Nomina</h3>
            ${bloqueInscribirNuevoHtml()}
          </div>
          ${formInscribirNuevoHtml()}
          <table><thead><tr><th>Actividad</th><th>Division</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${p.items.length
            ? p.items.map((i) => `<tr>
            <td>${esc(i.actividad ? i.actividad.nombre : "-")}</td><td>${esc(i.division)}</td>
            <td><span class="estado est-${esc(i.estado)}">${esc(i.estado)}</span></td>
            <td>${i.estado === "en_proceso" ? '<button class="btn btn-err2 btn-mini" data-retract="' + i._id + '">Retractar</button>' : "-"}</td>
          </tr>`).join("")
            : `<tr><td colspan="4" class="muted">Todavia no tienes inscripciones.</td></tr>`}</tbody></table>
          ${htmlPaginacion("misIns", p)}
          <div id="participacion-c" style="margin-top:12px"></div>
        </div>`;
}

function enlazarMisInscripciones(ins, alRefrescar) {
  document.querySelectorAll("[data-retract]").forEach((b) => {
    b.onclick = async () => {
      try { await API.peticion("DELETE", `/api/inscripciones/${b.dataset.retract}`); alRefrescar(); }
      catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
  conectarPaginacion(alRefrescar);
  cargarParticipacion("#participacion-c", alRefrescar);
}

// Carga la participacion (torneo coincidente + alumnos marcados) de las
// inscripciones del coordinador y dibuja un checklist por inscripcion.
async function cargarParticipacion(selector, alRefrescar) {
  const cont = $(selector);
  if (!cont) return;
  try {
    const res = await API.participaciones();
    const datos = res.datos || [];
    const conTorneo = datos.filter((d) => d.torneo);
    if (!conTorneo.length) {
      cont.innerHTML = `<p class="muted">No hay inscripciones con un torneo programado de esa actividad y categoria.</p>`;
      return;
    }
    const p = paginarUI(conTorneo, "participacion");
    cont.innerHTML = p.items
      .map((d) => tarjetaParticipacionHtml(d))
      .join("") + htmlPaginacion("participacion", p);
    conectarPaginacion(() => cargarParticipacion(selector, alRefrescar), cont);
    cont.querySelectorAll("[data-participa]").forEach((cb) => {
      cb.onchange = async () => {
        const insId = cb.dataset.participa;
        const aId = cb.dataset.alumno;
        const participa = cb.checked;
        cb.disabled = true;
        try {
          await API.marcarParticipacion(insId, aId, participa);
          const etiqueta = cb.parentElement.querySelector(".parti-badge");
          if (etiqueta) etiqueta.remove();
          if (participa) {
            const nueva = document.createElement("span");
            nueva.className = "parti-badge";
            nueva.textContent = "participa";
            cb.parentElement.appendChild(nueva);
          }
          mostrarMensaje(participa ? "Estudiante marcado para participar" : "Estudiante retirado del torneo");
        } catch (err) {
          cb.checked = !participa;
          mostrarMensaje(err.message, "error");
        } finally {
          cb.disabled = false;
        }
      };
    });
  } catch (err) {
    cont.innerHTML = `<p class="muted">No se pudo cargar la participacion: ${esc(err.message)}</p>`;
  }
}

function tarjetaParticipacionHtml(d) {
  const t = d.torneo;
  const alumnos = d.alumnos || [];
  if (!d.puedePostular) {
    return `<div class="parti-tarjeta">
        <div class="parti-titulo"><strong>${esc(d.inscripcion.actividad ? d.inscripcion.actividad.nombre : "-")} / ${esc(d.inscripcion.division)}</strong>
        <span class="muted">Torneo: ${esc(t.nombre)}</span></div>
        <p class="muted" style="margin-top:4px">${esc(d.motivo)}</p>
        ${alumnos.length ? `<p class="muted">Inscritos en la nomina: ${alumnos.map((a) => esc(a.nombre)).join(", ")}.</p>` : ""}
      </div>`;
  }
  const celdas = alumnos.length
    ? alumnos
        .map(
          (a) => `<label class="parti-alumno">
            <input type="checkbox" data-participa="${d.inscripcion._id}" data-alumno="${a._id}" ${a.participa ? "checked" : ""}>
            <span>${esc(a.nombre)}</span>${a.participa ? '<span class="parti-badge">participa</span>' : ""}
          </label>`
        )
        .join("")
    : `<p class="muted">Esta inscripcion no tiene alumnos en la nomina.</p>`;
  return `<div class="parti-tarjeta">
      <div class="parti-titulo"><strong>${esc(d.inscripcion.actividad ? d.inscripcion.actividad.nombre : "-")} / ${esc(d.inscripcion.division)}</strong>
      <span>Torneo: <em>${esc(t.nombre)}</em></span></div>
      <p style="margin-top:4px">Marca quiénes quieren participar:</p>
      <div class="parti-lista">${celdas}</div>
    </div>`;
}

async function panelCoordInscribir() {
  const ins = await API.inscripciones().catch(() => []);
  contenido(
    `<h2 class="pagina">Postulaciones</h2>
     <div class="postula-fila">
       <div class="postula-cartelera">
         <div class="cabeza-panel">
           <h3>Cartelera de Actividades</h3>
         </div>
         <div id="cartelera-c"></div>
       </div>
       ${bloqueMisInscripcionesHtml(ins)}
     </div>`
  );
  cargarCarteleraEn("#cartelera-c");
  enlazarMisInscripciones(ins, () => panelCoordInscribir());
  await enlazarInscribirNuevo(() => panelCoordInscribir());
}

{ /* notas de soporte para agregar alumnos dentro del panel coordinador */ }
function panelCoordSolicitudes() { return panelCoordSolicitudesImpl(); }

// Modulo del coordinador: postular estudiantes a los torneos programados por
// el Admin DAEM. Se puede postular desde la nomina de la actividad/categoria
// del torneo o registrando un estudiante nuevo (queda en la nomina y se
// inscribe al torneo).
async function panelCoordTorneos() {
  const [torneos, nomina] = await Promise.all([
    API.torneosPostulables().catch(() => []),
    API.nomina().catch(() => ({ alumnos: [] })),
  ]);
  const alumnos = nomina.alumnos || [];
  const FILTRO_FORMATO_TOR = window.__filtroFormatoTor || "";
  const torneosFiltrados = FILTRO_FORMATO_TOR
    ? torneos.filter((t) => (t.formato || "amistoso") === FILTRO_FORMATO_TOR)
    : torneos;
  const pTorneos = paginarUI(torneosFiltrados, "coordTorneos");

  const tarjetaTorneo = (t) => {
    const actId = t.actividad ? String(t.actividad._id || t.actividad) : "";
    const actNombre = t.actividad ? t.actividad.nombre : "Sin actividad";
    const division = t.division || "";

    const yaPostulados = alumnos.filter((a) =>
      (a.torneos || []).some((x) => String(x._id || x) === String(t._id))
    );
    const candidatos = alumnos.filter((a) => {
      if (a.actividad && String(a.actividad._id || a.actividad) !== actId) return false;
      if (a.division !== division) return false;
      return !(a.torneos || []).some((x) => String(x._id || x) === String(t._id));
    });

    const opciones = candidatos.length
      ? candidatos.map((a) => `<option value="${a._id}">${esc(a.rut)} - ${esc(a.nombre)} (${esc(a.division)})</option>`).join("")
      : `<option value="">Sin estudiantes disponibles en esta categoria</option>`;

    const aYTxt = [
      t.fechaAperturaInscripcion ? `Apertura: ${new Date(t.fechaAperturaInscripcion).toLocaleDateString("es-CL")}` : "",
      t.fechaCierreInscripcion ? `Cierre: ${new Date(t.fechaCierreInscripcion).toLocaleDateString("es-CL")}` : "",
    ].filter(Boolean).join(" | ");

    return `<div class="tarjeta">
      <h3>${esc(t.nombre)} <span class="badge-rol">${esc(division)}</span> <span class="badge-rol badge-formato-${t.formato === "competitivo" ? "competitivo" : "amistoso"}">${esc(t.formato === "competitivo" ? "Competitivo" : "Amistoso")}</span></h3>
      <p class="muted">Actividad: ${esc(actNombre)} | ${esc(aYTxt)} | Postulados de mi establecimiento: ${t.postulados ?? yaPostulados.length}</p>
      <div class="grid-2">
        <div class="campo">
          <label>Postular desde la nomina (${esc(actNombre)} - ${esc(division)})</label>
          ${candidatos.length
            ? `<div class="lote-candidatos" data-tor-lote="${t._id}" style="max-height:160px;overflow:auto;border:1px solid var(--borde);padding:6px;border-radius:6px;margin-bottom:6px">${candidatos.map((a) => `<label style="display:block"><input type="checkbox" value="${a._id}"> ${esc(a.rut)} - ${esc(a.nombre)}</label>`).join("")}</div><button class="btn btn-ok btn-mini" data-post-lote="${t._id}">Postular seleccionados</button>`
            : `<p class="muted">Sin estudiantes disponibles en esta categoria</p>`}
        </div>
<div class="campo">
            <label>O registrar un estudiante nuevo</label>
            <div class="grid-2">
              <div class="campo"><label for="n-rut-${t._id}">RUT</label><input id="n-rut-${t._id}" data-n-rut="${t._id}" placeholder="Ej: 12.345.678-9"></div>
              <div class="campo"><label for="n-nom-${t._id}">Nombres</label><input id="n-nom-${t._id}" data-n-nom="${t._id}" placeholder="Primer y segundo nombre"></div>
              <div class="campo"><label for="n-ape-${t._id}">Apellidos</label><input id="n-ape-${t._id}" data-n-ape="${t._id}" placeholder="Paterno materno"></div>
              <div class="campo"><label for="n-gen-${t._id}">Genero</label><select id="n-gen-${t._id}" data-n-gen="${t._id}"><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
              <div class="campo"><label for="n-fec-${t._id}">Fecha de nacimiento</label><input type="date" id="n-fec-${t._id}" data-n-fec="${t._id}"></div>
              <div class="campo"><label for="n-edad-${t._id}">Edad (auto)</label><input id="n-edad-${t._id}" data-n-edad="${t._id}" placeholder="Se calcula sola" readonly></div>
            </div>
            <button class="btn btn-ok btn-mini" data-post-nuevo="${t._id}">Solicitar postulacion</button>
          </div>
      </div>
      <p class="muted" style="margin-top:8px">Postulados:</p>
      ${yaPostulados.length
        ? `<table class="tabla-desglose"><thead><tr><th>RUT</th><th>Nombre</th><th>Categoria</th></tr></thead>
           <tbody>${yaPostulados.map((a) => `<tr><td>${esc(a.rut)}</td><td>${esc(a.nombre)}</td><td>${esc(a.division)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">Aun no hay postulados de su establecimiento.</p>`}
    </div>`;
  };

  contenido(
    `<h2 class="pagina">Postular a Torneos</h2>
     <div class="act-buscador">
       <label>Formato:</label>
       <select id="filtro-formato-tor">
         <option value="">Todos</option>
         <option value="competitivo">Competitivo</option>
         <option value="amistoso">Amistoso</option>
       </select>
     </div>
     <p class="muted">Torneos programados por el Admin DAEM. Postule estudiantes de la nomina de la actividad correspondiente o solicite el registro de uno nuevo (el Admin DAEM debe aprobarlo antes de agregarlo a la nomina y al torneo).</p>
     ${torneos.length ? pTorneos.items.map(tarjetaTorneo).join("") + htmlPaginacion("coordTorneos", pTorneos) : `<div class="tarjeta"><p class="muted">No hay torneos en periodo de inscripciones.</p></div>`}`
  );

  // Edad automatica al elegir la fecha de nacimiento del estudiante nuevo.
  const calcEdad = (fec) => {
    if (!fec) return "";
    const nac = new Date(fec);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return Number.isFinite(edad) ? `${edad} anio(s)` : "";
  };
  document.querySelectorAll("[data-n-fec]").forEach((f) => {
    f.addEventListener("input", () => {
      const campo = document.querySelector(`[data-n-edad="${f.dataset.nFec}"]`);
      if (campo) campo.value = calcEdad(f.value);
    });
  });

  const obtenerNuevo = (id) => ({
    rut: document.querySelector(`[data-n-rut="${id}"]`)?.value.trim() || "",
    nombre: document.querySelector(`[data-n-nom="${id}"]`)?.value.trim() || "",
    apellidos: document.querySelector(`[data-n-ape="${id}"]`)?.value.trim() || "",
    genero: document.querySelector(`[data-n-gen="${id}"]`)?.value || "M",
    fechaNacimiento: document.querySelector(`[data-n-fec="${id}"]`)?.value || "",
  });

  const refrescar = () => panelCoordTorneos();

  document.querySelectorAll("[data-post-lote]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.postLote;
      const cont = document.querySelector(`[data-tor-lote="${id}"]`);
      const checks = cont ? [...cont.querySelectorAll("input[type=checkbox]:checked")] : [];
      const ids = checks.map((c) => c.value);
      if (!ids.length) { mostrarMensaje("Seleccione al menos un estudiante.", "error"); return; }
      let ok = 0, fail = 0;
      for (const aid of ids) {
        try { await API.postularTorneo(id, { alumnoId: aid }); ok++; }
        catch (err) { fail++; mostrarMensaje(err.message, "error"); }
      }
      mostrarMensaje(`Postulados: ${ok}${fail ? `, fallidos: ${fail}` : ""}`, ok ? "ok" : "error");
      refrescar();
    };
  });

  document.querySelectorAll("[data-post-nuevo]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.postNuevo;
      const n = obtenerNuevo(id);
      if (!n.rut || !n.nombre || !n.fechaNacimiento) { mostrarMensaje("Complete RUT, Nombres y Fecha de nacimiento.", "error"); return; }
      // Buscar el torneo correspondiente para obtener sus requisitos
      const torneo = torneos.find((t) => String(t._id) === String(id));
      const reqTorneo = torneo ? (torneo.requisitos || null) : null;
      const division = torneo ? (torneo.division || "") : "";
      // Validación de requisitos en el cliente antes de enviar la solicitud
      const errorReq = validarRequisitosAlumnoFront(n.fechaNacimiento, n.genero, division, reqTorneo);
      if (errorReq) { mostrarMensaje(errorReq, "error"); return; }
      try {
        const r = await API.solicitarEstudiante({
          torneo: id,
          alumno: { rut: n.rut, nombre: `${n.nombre} ${n.apellidos}`.trim(), genero: n.genero, fechaNacimiento: n.fechaNacimiento },
        });
        mostrarMensaje(r.mensaje || "Solicitud enviada al Admin DAEM", "ok"); refrescar();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
  const selFiltro = document.getElementById("filtro-formato-tor");
  if (selFiltro) {
    selFiltro.value = window.__filtroFormatoTor || "";
    selFiltro.onchange = () => {
      window.__filtroFormatoTor = selFiltro.value;
      panelCoordTorneos();
    };
  }
  conectarPaginacion(panelCoordTorneos);
}

async function panelCoordSolicitudesImpl() {
  const [solicitudes, encAlumnos, torneosDisp] = await Promise.all([
    API.solicitudes(),
    API.inscripciones(),
    API.torneosPostulables().catch(() => []),
  ]);
  window.SOLICITUDES_CACHE = solicitudes;
  const opAlIns = encAlumnos.filter((i) => i.estado === "aceptada")
    .map((i) => ({ valor: String(i._id), texto: `${i.actividad ? i.actividad.nombre : ""} - ${i.division}` }));
  const pendientes = solicitudes.filter((s) => s.estado === "en_proceso");
  const historial = solicitudes.filter((s) => s.estado !== "en_proceso");
  const tab = SOLICITUDES_UI.tabCoord;
  const items = tab === "pend" ? pendientes : historial;
  const prefijo = tab === "pend" ? "solCoordPend" : "solCoordHist";

  // Opciones de torneos para el selector
  const opcionesTorneos = torneosDisp.length
    ? torneosDisp.map((t) => `<option value="${t._id}">${esc(t.nombre)} — ${esc(t.division || "Sin categoria")}</option>`).join("")
    : `<option value="">Sin torneos disponibles para postular</option>`;

  contenido(
    `<h2 class="pagina">Solicitudes y Estado</h2>
     <p class="muted">Solicite la inscripcion de un estudiante. El Admin DAEM debe aprobarla antes de que se agregue a la nomina.</p>
     <div class="seccion"><button class="btn btn-ok" id="btn-agregar-alumno">+ Añadir Inscripción</button></div>
     <div id="agregar-alumno-box" class="oculta tarjeta">
       <div class="seccion" style="margin-bottom:12px">
         <strong>Vincular solicitud a:</strong>&nbsp;&nbsp;
         <label style="margin-right:16px"><input type="radio" name="al-destino" value="inscripcion" checked> Inscripción aceptada</label>
         <label><input type="radio" name="al-destino" value="torneo"> Torneo disponible</label>
       </div>
       <div id="al-bloque-inscripcion">
         <div class="campo"><label>Inscripción (aceptada)</label>${comboHtml("al-ins-txt", "Buscar inscripcion...")}<input type="hidden" id="al-ins"></div>
       </div>
       <div id="al-bloque-torneo" class="oculta">
         <div class="campo">
           <label>Torneo disponible</label>
           <select id="al-torneo"><option value="">-- Seleccione un torneo --</option>${opcionesTorneos}</select>
         </div>
         <div id="al-torneo-info" class="muted" style="font-size:0.85em;margin-bottom:8px"></div>
       </div>
       <div class="grid-2" style="margin-top:10px">
         <div class="campo"><label>RUT alumno</label><input id="al-rut"></div>
         <div class="campo"><label>Nombre completo</label><input id="al-nombre"></div>
         <div class="campo"><label>Género</label><select id="al-genero"><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option></select></div>
         <div class="campo"><label>Fecha nacimiento</label><input type="date" id="al-fecha"></div>
       </div>
        <button class="btn btn-mini" id="btn-agregar-al-lote">+ Agregar a la lista</button>
        <div id="al-lote-lista" style="margin-top:10px"></div>
        <button class="btn btn-ok" id="btn-guardar-al" style="margin-top:10px">Enviar solicitud (lote)</button>
     </div>
     ${tabsSolicitudesHtml(tab, pendientes, historial, "coord")}
     <h3 class="pagina">${tab === "pend" ? "Pendientes" : "Historial"} (${items.length})</h3>
     ${tablaSolicitudesHtml(items, prefijo, false)}`
  );

  conectarTabsSolicitudes("coord", panelCoordSolicitudes);
  conectarPaginacion(panelCoordSolicitudes);
  document.querySelectorAll("[data-ver-sol]").forEach((b) => {
    b.onclick = () => {
      const s = (window.SOLICITUDES_CACHE || []).find((x) => String(x._id) === String(b.dataset.verSol));
      if (!s) return;
      const alumnos = s.alumnos && s.alumnos.length ? s.alumnos : (s.alumno && s.alumno.rut ? [s.alumno] : []);
      const txt = alumnos.map((a, i) => `${i + 1}. ${a.rut} - ${a.nombre} (${a.genero || "-"}) ${a.fechaNacimiento || ""}`).join("\\n");
      alert(`Estudiantes de la solicitud ${s.codigo || s._id}:\\n\\n${txt}`);
    };
  });
  $("#btn-agregar-alumno").onclick = () => $("#agregar-alumno-box").classList.toggle("oculta");
  initCombo("al-ins-txt", opAlIns, (o) => { $("#al-ins").value = o.valor; }, "Buscar inscripcion...");

  // Mostrar/ocultar bloques según radio seleccionado
  document.querySelectorAll("[name='al-destino']").forEach((r) => {
    r.addEventListener("change", () => {
      const esTorneo = document.querySelector("[name='al-destino']:checked")?.value === "torneo";
      $("#al-bloque-inscripcion").classList.toggle("oculta", esTorneo);
      $("#al-bloque-torneo").classList.toggle("oculta", !esTorneo);
    });
  });

  // Mostrar requisitos del torneo seleccionado en tiempo real
  const selTor = $("#al-torneo");
  const infoTor = $("#al-torneo-info");
  if (selTor) {
    selTor.addEventListener("change", () => {
      const tId = selTor.value;
      const t = torneosDisp.find((x) => String(x._id) === String(tId));
      if (!t || !infoTor) return;
      const req = t.requisitos || {};
      const partes = [];
      if (req.activo) {
        if (req.edadMinima != null) partes.push(`Edad mínima: ${req.edadMinima} años`);
        if (req.edadMaxima != null) partes.push(`Edad máxima: ${req.edadMaxima} años`);
        if (req.genero) partes.push(`Solo ${req.genero}`);
      }
      const ap = t.fechaAperturaInscripcion ? new Date(t.fechaAperturaInscripcion).toLocaleDateString("es-CL") : null;
      const ci = t.fechaCierreInscripcion   ? new Date(t.fechaCierreInscripcion).toLocaleDateString("es-CL")   : null;
      if (ap) partes.push(`Apertura: ${ap}`);
      if (ci) partes.push(`Cierre: ${ci}`);
      infoTor.textContent = partes.length ? partes.join("  |  ") : "Sin requisitos especiales.";
    });
  }

  // Envío del formulario
  let alumnosLote = [];
  const renderLote = () => {
    const cont = $("#al-lote-lista");
    if (!cont) return;
    if (!alumnosLote.length) { cont.innerHTML = "<p class=\"muted\">Sin estudiantes en el lote.</p>"; return; }
    cont.innerHTML = `<table class="tabla-desglose"><thead><tr><th>RUT</th><th>Nombre</th><th>Genero</th><th>Fecha nac.</th><th></th></tr></thead><tbody>${alumnosLote.map((a, i) => `<tr><td>${esc(a.rut)}</td><td>${esc(a.nombre)}</td><td>${esc(a.genero)}</td><td>${esc(a.fechaNacimiento)}</td><td><button class="btn btn-mini btn-err2" data-quitar-lote="${i}">Quitar</button></td></tr>`).join("")}</tbody></table>`;
    cont.querySelectorAll("[data-quitar-lote]").forEach((b) => {
      b.onclick = () => { alumnosLote.splice(Number(b.dataset.quitarLote), 1); renderLote(); };
    });
  };
  renderLote();
  $("#btn-agregar-al-lote").onclick = () => {
    const destino = document.querySelector("[name='al-destino']:checked")?.value || "inscripcion";
    const rut = $("#al-rut").value.trim();
    const nombre = $("#al-nombre").value.trim();
    const genero = $("#al-genero").value;
    const fecha = $("#al-fecha").value;
    if (!rut || !nombre) { mostrarMensaje("Complete al menos RUT y Nombre del alumno.", "error"); return; }
    if (destino === "torneo" && !fecha) { mostrarMensaje("Ingrese la fecha de nacimiento del alumno.", "error"); return; }
    alumnosLote.push({ rut, nombre, genero, fechaNacimiento: fecha, apoderado: "", email: "", telefono: "" });
    $("#al-rut").value = ""; $("#al-nombre").value = ""; $("#al-fecha").value = "";
    renderLote();
  };
  $("#btn-guardar-al").onclick = async () => {
    const destino = document.querySelector("[name='al-destino']:checked")?.value || "inscripcion";
    // Si hay datos en los campos pero no se agregaron, agregarlos automaticamente
    const rut = $("#al-rut").value.trim();
    const nombre = $("#al-nombre").value.trim();
    if (rut && nombre && !alumnosLote.length) {
      alumnosLote.push({ rut, nombre, genero: $("#al-genero").value, fechaNacimiento: $("#al-fecha").value, apoderado: "", email: "", telefono: "" });
    }
    if (!alumnosLote.length) { mostrarMensaje("Agregue al menos un estudiante al lote.", "error"); return; }
    if (destino === "torneo") {
      const tId = selTor ? selTor.value : "";
      if (!tId) { mostrarMensaje("Seleccione un torneo disponible.", "error"); return; }
      try {
        const r = await API.solicitarEstudiante({ torneo: tId, alumnos: alumnosLote });
        mostrarMensaje(r.mensaje || "Solicitud enviada al Admin DAEM", "ok");
        panelCoordSolicitudes();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    } else {
      if (!$("#al-ins").value) { mostrarMensaje("Seleccione una inscripción aceptada.", "error"); return; }
      try {
        const r = await API.solicitarEstudiante({ inscripcion: $("#al-ins").value, alumnos: alumnosLote });
        mostrarMensaje(r.mensaje || "Solicitud enviada al Admin DAEM", "ok");
        panelCoordSolicitudes();
      } catch (err) { mostrarMensaje(err.message, "error"); }
    }
  };
}

// Tabla de la nomina (reutilizada por el listado siempre visible del panel).
function tablaAlumnosNomina(alumnos) {
  const p = paginarUI(alumnos, "nomina");
  return `<div class="tarjeta"><h3>Nomina de Estudiantes <span class="muted">(${alumnos.length})</span></h3>
    <table><thead><tr><th>RUT</th><th>Nombre</th><th>Genero</th><th>Actividad</th><th>Categoria</th></tr></thead>
    <tbody>${p.items.length
      ? p.items.map((a) => `<tr><td>${esc(a.rut)}</td><td>${esc(a.nombre)}</td><td>${esc(a.genero === "M" ? "Masc" : a.genero === "F" ? "Fem" : "Otro")}</td><td>${esc(a.actividad ? a.actividad.nombre : "")}</td><td>${esc(a.division)}</td></tr>`).join("")
      : '<tr><td colspan="5" class="muted">Sin estudiantes para los filtros seleccionados.</td></tr>'}</tbody></table>
    ${htmlPaginacion("nomina", p)}
  </div>`;
}

async function panelCoordNomina() {
  const [nomina, solicitudes] = await Promise.all([API.nomina().catch(() => ({ alumnos: [], total: 0 })), API.solicitudes().catch(() => [])]);
  const alumnos = nomina.alumnos || [];
  const solicitados = [];
  for (const sol of solicitudes) {
    const als = (sol.alumnos && sol.alumnos.length) ? sol.alumnos : (sol.alumno && sol.alumno.rut ? [sol.alumno] : []);
    for (const a of als) {
      solicitados.push({
        _id: sol._id,
        estudiante: a.nombre || a.rut,
        rut: a.rut,
        actividad: sol.actividad ? sol.actividad.nombre : "-",
        division: sol.division || "-",
        estado: sol.estado,
      });
    }
  }
  // Actividades y categorias presentes en la nomina del propio establecimiento.
  const actividades = [...new Set(alumnos.map((a) => a.actividad && a.actividad.nombre).filter(Boolean))].sort();
  const categorias = [...new Set(alumnos.map((a) => a.division).filter(Boolean))].sort();
  const subcategorias = ["Damas", "Varones"].map((s) => ({ valor: s, texto: s }));

  const resumenPorActividad = actividades.map((act) => ({
    actividad: act,
    total: alumnos.filter((a) => a.actividad && a.actividad.nombre === act).length,
  }));

  contenido(
    `<div class="encabezado"><h2 class="pagina">Nomina Interna de Estudiantes</h2>
       <button class="btn btn-primario2" id="btn-filtrar">Filtrar</button></div>
     <div class="stat"><div class="num">${nomina.total}</div><div class="lbl">Total</div></div>
     <div class="tarjeta" style="margin-bottom:12px">
       <h3>Estudiantes solicitados</h3>
       <table><thead><tr><th>Estudiante</th><th>Actividad</th><th>Division</th><th>Estado</th><th>Acciones</th></tr></thead>
       <tbody>${solicitados.length
         ? solicitados.map((r) => `<tr><td>${esc(r.estudiante)} <span class="muted">${esc(r.rut)}</span></td><td>${esc(r.actividad)}</td><td>${esc(r.division)}</td><td><span class="estado est-${esc(r.estado)}">${esc(r.estado)}</span></td><td>${r.estado === "en_proceso" ? `<button class="btn btn-err2 btn-mini" data-retract-sol="${r._id}">Retractar</button>` : "-"}</td></tr>`).join("")
         : `<tr><td colspan="4" class="muted">Sin estudiantes solicitados.</td></tr>`}</tbody></table>
     </div>
       <div class="nomina-lista" id="alumnos-lista"></div>
       <div class="tarjeta oculta nomina-filtros" id="nomina-filtros">
         <h3>Filtrar</h3>
         <div class="campo"><label>Nombre</label><input id="flt-nombre" autocomplete="off"></div>
         <div class="campo"><label>Actividad</label>${comboHtml("flt-act-txt", "Buscar actividad...")}</div>
         <div class="campo"><label>Categoria</label>${comboHtml("flt-cat-txt", "Buscar categoria...")}</div>
         <div class="campo"><label>Subcategoria</label>${comboHtml("flt-sub-txt", "Damas / Varones...")}</div>
         <button class="btn btn-mini" id="btn-limpiar-filtros">Limpiar filtros</button>
       </div>
     </div>`
  );

  const filtro = { nombre: "", actividad: "", categoria: "", subcategoria: "" };
  const norm = (v) => String(v || "").toLowerCase().trim();

  const render = () => {
    const fNombre = norm(filtro.nombre);
    const fAct = norm(filtro.actividad);
    const fCat = norm(filtro.categoria);
    const fSub = norm(filtro.subcategoria);
    const lista = alumnos.filter((a) => {
      if (fNombre && !norm(a.nombre).includes(fNombre)) return false;
      if (fAct && !norm(a.actividad && a.actividad.nombre).includes(fAct)) return false;
      if (fCat && !norm(a.division).includes(fCat)) return false;
      if (fSub) {
        const genero = fSub.includes("dam") || fSub.includes("fem") ? "F"
          : (fSub.includes("var") || fSub.includes("masc")) ? "M" : "";
        if (genero && String(a.genero) !== genero) return false;
      }
      return true;
    });
    $("#alumnos-lista").innerHTML = tablaAlumnosNomina(lista);
    conectarPaginacion(render, $("#alumnos-lista"));
  };
  const aplicarFiltro = () => { reiniciarPaginaUI("nomina"); render(); };

  $("#btn-filtrar").onclick = () => $("#nomina-filtros").classList.toggle("oculta");
  $("#flt-nombre").addEventListener("input", (e) => { filtro.nombre = e.target.value; aplicarFiltro(); });
  initCombo("flt-act-txt", actividades.map((n) => ({ valor: n, texto: n })), (o) => { filtro.actividad = o.texto; aplicarFiltro(); }, "Buscar actividad...");
  initCombo("flt-cat-txt", categorias.map((d) => ({ valor: d, texto: d })), (o) => { filtro.categoria = o.texto; aplicarFiltro(); }, "Buscar categoria...");
  initCombo("flt-sub-txt", subcategorias, (o) => { filtro.subcategoria = o.texto; aplicarFiltro(); }, "Damas / Varones...");
  $("#flt-act-txt").addEventListener("input", (e) => { filtro.actividad = e.target.value; aplicarFiltro(); });
  $("#flt-cat-txt").addEventListener("input", (e) => { filtro.categoria = e.target.value; aplicarFiltro(); });
  $("#flt-sub-txt").addEventListener("input", (e) => { filtro.subcategoria = e.target.value; aplicarFiltro(); });
  $("#btn-limpiar-filtros").onclick = () => {
    filtro.nombre = filtro.actividad = filtro.categoria = filtro.subcategoria = "";
    $("#flt-nombre").value = "";
    $("#flt-act-txt").value = $("#flt-cat-txt").value = $("#flt-sub-txt").value = "";
    aplicarFiltro();
  };
  render();

  document.querySelectorAll("[data-retract-sol]").forEach((b) => {
    b.onclick = async () => {
      if (!await confirmarMensaje("Retractar esta solicitud?", "Retractar", "Retractar", true)) return;
      try { await API.eliminarSolicitud(b.dataset.retractSol); panelCoordNomina(); }
      catch (err) { mostrarMensaje(err.message, "error"); }
    };
  });
}

// ============================================================
// PANELES LECTOR (SOLO LECTURA)
// ============================================================
async function panelLectorResumen() {
  const u = API.usuario || {};
  const establecimiento = u.establecimiento && u.establecimiento.nombre ? u.establecimiento.nombre : null;
  const [act, tor] = await Promise.all([
    API.actividades().catch(() => []),
    API.torneos().catch(() => []),
  ]);

  const etiquetasEstado = {
    activo: { label: "Activo", clase: "est-activo" },
    en_curso: { label: "En curso", clase: "est-activo" },
    inscripciones: { label: "Inscripciones", clase: "est-inscripciones" },
    pausado: { label: "Pausado", clase: "est-pausado" },
    postergado: { label: "Postergado", clase: "est-postergado" },
    suspendido: { label: "Suspendido", clase: "est-suspendido" },
    cancelado: { label: "Cancelado", clase: "est-cancelado" },
    finalizado: { label: "Finalizado", clase: "est-finalizado" },
  };
  const formatearEstado = (est) =>
    etiquetasEstado[est]
      ? `<span class="estado ${etiquetasEstado[est].clase}">${etiquetasEstado[est].label}</span>`
      : `<span class="estado">${esc(est)}</span>`;

  const torneosVigentes = tor.filter((t) => ["activo", "en_curso", "inscripciones"].includes(t.estado));
  const pTor = paginarUI(torneosVigentes, "lectorTor");
  const pAct = paginarUI(act, "lectorAct");

  contenido(
    `<div class="encabezado"><h2 class="pagina">Vista de Solo Lectura</h2><p class="muted">Perfil Lector - no puede modificar datos.${establecimiento ? ` | Establecimiento: ${esc(establecimiento)}` : ""}</p></div>
     <div class="tarjeta"><h3>Torneos Vigentes</h3>
       ${pTor.items.length
         ? pTor.items.map((t) => `<div class="cambio-torneo tor-fila">
              <div class="tor-fila-info">
                <div>${formatearEstado(t.estado)} <strong>${esc(t.nombre)}</strong></div>
                <div class="muted">${esc(t.actividad ? t.actividad.nombre : "")} | ${esc(new Date((t.updatedAt || t.createdAt)).toLocaleDateString("es-CL"))}</div>
              </div>
              <button class="btn btn-mini" data-llaves="${t._id}" data-nombre="${esc(t.nombre)}">Ver Mapa</button>
            </div>`).join("")
         : "<p class='muted'>No hay torneos vigentes.</p>"}
       ${htmlPaginacion("lectorTor", pTor)}
     </div>
     <div class="tarjeta"><h3>Cartelera de Actividades</h3>
       ${pAct.items.length
         ? pAct.items.map((a) => {
             const inicio = a.fechaAperturaInscripcion ? new Date(a.fechaAperturaInscripcion) : null;
             const fin = a.fechaCierreInscripcion ? new Date(a.fechaCierreInscripcion) : null;
             return `<div class="cambio-torneo"><strong>${esc(a.nombre)}</strong> <span class="badge-rol">${esc(a.area)}</span> <span class="muted">| Categorias: ${esc(a.divisiones.join(", "))} | Estado: ${esc(a.estado)}</span>
             ${(inicio || fin) ? `<span class="muted">| Inscripcion: ${inicio ? inicio.toLocaleDateString("es-CL") : "-"} a ${fin ? fin.toLocaleDateString("es-CL") : "-"}</span>` : ""}</div>`;
           }).join("")
         : "<p class='muted'>No hay actividades publicadas.</p>"}
       ${htmlPaginacion("lectorAct", pAct)}
     </div>`
  );
  conectarPaginacion(panelLectorResumen);
  document.querySelectorAll("[data-llaves]").forEach((b) => {
    b.onclick = () => abrirMapaTorneo(b.dataset.llaves, b.dataset.nombre).catch((err) => mostrarMensaje(err.message, "error"));
  });
}

// Nomina del propio establecimiento: estudiantes con la actividad en que participan.
async function panelLectorEstudiantes() {
  const u = API.usuario || {};
  const establecimiento = u.establecimiento && u.establecimiento.nombre ? u.establecimiento.nombre : "";
  const nomina = await API.nomina();
  const pPorAct = paginarUI(nomina.porActividad, "lectorPorAct");
  const pAlumnos = paginarUI(nomina.alumnos, "lectorAlumnos");
  contenido(
    `<div class="encabezado"><h2 class="pagina">Estudiantes del Establecimiento</h2>
       <p class="muted">${establecimiento ? esc(establecimiento) : "Sin establecimiento asignado"} - solo lectura</p></div>
     <div class="stat"><div class="num">${nomina.total}</div><div class="lbl">Estudiantes inscritos</div></div>
     <div class="tarjeta"><h3>Por Actividad</h3>
       ${pPorAct.items.length
         ? `<table><thead><tr><th>Actividad</th><th>Cantidad</th></tr></thead>
            <tbody>${pPorAct.items.map((p) => `<tr><td>${esc(p.actividad)}</td><td>${p.cantidad}</td></tr>`).join("")}</tbody></table>`
         : "<p class='muted'>Sin estudiantes registrados.</p>"}
       ${htmlPaginacion("lectorPorAct", pPorAct)}
     </div>
     <div class="tarjeta"><h3>Listado de Estudiantes</h3>
       ${pAlumnos.items.length
         ? `<table><thead><tr><th>RUT</th><th>Nombre</th><th>Genero</th><th>Actividad</th><th>Division</th></tr></thead>
            <tbody>${pAlumnos.items.map((a) => `<tr><td>${esc(a.rut)}</td><td>${esc(a.nombre)}</td><td>${esc(a.genero === "M" ? "Masc" : a.genero === "F" ? "Fem" : "Otro")}</td><td>${esc(a.actividad ? a.actividad.nombre : "")}</td><td>${esc(a.division)}</td></tr>`).join("")}</tbody></table>`
         : "<p class='muted'>Sin estudiantes registrados.</p>"}
       ${htmlPaginacion("lectorAlumnos", pAlumnos)}
     </div>`
  );
  conectarPaginacion(panelLectorEstudiantes);
}

// ---------- Init ----------
function init() {
  API.loadToken();
  document.addEventListener("input", (e) => {
    if (e.target && e.target.tagName === "INPUT") normalizarCampo(e.target);
  });
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-error").classList.add("oculta");
    try {
      await iniciarSesion($("#login-rut").value, $("#login-clave").value);
    } catch (err) {
      $("#login-error").textContent = err.message;
      $("#login-error").classList.remove("oculta");
    }
  });
  $("#btn-olvidar").onclick = () => { mostrarRecuperar(); };
  $("#btn-volver-recuperar").onclick = () => { vistaLoginForma(); };
  $("#btn-ok-recuperar").onclick = async () => {
    $("#recuperar-msg").classList.add("oculta");
    const rut = $("#recuperar-rut").value.trim();
    if (!rut) {
      $("#recuperar-msg").textContent = "Debe ingresar su RUT";
      $("#recuperar-msg").classList.remove("oculta");
      return;
    }
    try {
      const r = await API.recuperarClave(rut);
      $("#recuperar-rut").value = "";
      $("#recuperar-msg").style.color = "var(--ok, green)";
      $("#recuperar-msg").textContent = r.mensaje || "Correo enviado.";
      $("#recuperar-msg").classList.remove("oculta");
      $("#recuperar-msg").style.color = "";
    } catch (err) {
      $("#recuperar-msg").style.color = "";
      $("#recuperar-msg").textContent = err.message;
      $("#recuperar-msg").classList.remove("oculta");
    }
  };
  $("#btn-ok-reset").onclick = async () => {
    $("#reset-msg").classList.add("oculta");
    const c1 = $("#reset-clave").value;
    const c2 = $("#reset-clave2").value;
    if (c1.length < 6) {
      $("#reset-msg").textContent = "La clave debe tener al menos 6 caracteres";
      $("#reset-msg").classList.remove("oculta");
      return;
    }
    if (c1 !== c2) {
      $("#reset-msg").textContent = "Las claves no coinciden";
      $("#reset-msg").classList.remove("oculta");
      return;
    }
    try {
      const r = await API.restablecerClave(RESET_TOKEN, c1);
      RESET_TOKEN = "";
      $("#reset-msg").style.color = "var(--ok, green)";
      $("#reset-msg").textContent = r.mensaje || "Clave cambiada.";
      $("#reset-msg").classList.remove("oculta");
      $("#reset-msg").style.color = "";
      setTimeout(vistaLoginForma, 2500);
    } catch (err) {
      $("#reset-msg").style.color = "";
      $("#reset-msg").textContent = err.message;
      $("#reset-msg").classList.remove("oculta");
    }
  };
  $("#btn-volver-reset").onclick = () => { RESET_TOKEN = ""; vistaLoginForma(); };
  $("#btn-salir").onclick = () => { API.limpiar(); mostrarLogin(); };

  const tokReset = new URLSearchParams(location.search).get("reset");

  if (tokReset) {
    RESET_TOKEN = tokReset;
    history.replaceState(null, "", location.pathname);
    mostrarLogin();
    mostrarReset();
  } else if (API.token) {
    API.perfil()
      .then(async () => { await cargarCatalogos(); mostrarDashboard(); })
      .catch(() => { API.limpiar(); mostrarLogin(); });
  } else {
    mostrarLogin();
  }
}

init();
