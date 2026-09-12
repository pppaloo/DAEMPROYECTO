// ============================================================
// SPA DAEM: orquesta login, autenticacion por rol y paneles.
// ============================================================

const $ = (sel) => document.querySelector(sel);
const esc = (txt = "") => String(txt).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let CAT = {}; // catalogos cargados

function cargarCatalogos() {
  return API.catalogos().then((c) => { CAT = c; });
}

// ---------- Autenticacion ----------
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
    { clave: "adminInscripciones", label: "Inscripciones" },
    { clave: "adminSolicitudes", label: "Solicitudes" },
    { clave: "adminAgenda", label: "Agenda" },
    { clave: "adminValoraciones", label: "Ranking Cumplimiento" },
    { clave: "adminReportes", label: "Reportes" },
  ],
  coordinador: [
    { clave: "coordResumen", label: "Resumen" },
    { clave: "coordEncargados", label: "Encargados" },
    { clave: "coordInscribir", label: "Cartelera / Inscribir" },
    { clave: "coordSolicitudes", label: "Mis Solicitudes" },
    { clave: "coordNomina", label: "Nomina Estudiantes" },
  ],
  encargado: [
    { clave: "encAgenda", label: "Mi Agenda" },
    { clave: "encAlumnos", label: "Mis Alumnos" },
    { clave: "encSolicitudes", label: "Solicitudes" },
  ],
  director: [
    { clave: "directorResumen", label: "Resumen" },
    { clave: "directorAgenda", label: "Agenda" },
    { clave: "directorEstablecimientos", label: "Establecimientos" },
    { clave: "directorRanking", label: "Ranking Cumplimiento" },
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
  coordEncargados: () => CargarPanel(panelCoordEncargados),
  coordInscribir: () => CargarPanel(panelCoordInscribir),
  coordSolicitudes: () => CargarPanel(panelCoordSolicitudes),
  coordNomina: () => CargarPanel(panelCoordNomina),
  encAgenda: () => CargarPanel(panelEncAgenda),
  encAlumnos: () => CargarPanel(panelEncAlumnos),
  encSolicitudes: () => CargarPanel(panelEncSolicitudes),
  directorResumen: () => CargarPanel(panelDirectorResumen),
  directorAgenda: () => CargarPanel(panelAdminAgenda),
  directorEstablecimientos: () => CargarPanel(panelDirectorEstablecimientos),
  directorRanking: () => CargarPanel(panelDirectorRanking),
};

async function panelBienvenida() {
  const u = API.usuario;
  contenido(
    `<div class="encabezado"><div><h2 class="pagina">Bienvenido/a, ${esc(u.nombre)}</h2><p class="muted">Perfil: ${esc(u.rol)}</p></div></div>
     <div class="tarjeta"><p>Seleccione una opcion del menu lateral para comenzar.</p></div>`
  );
}

// ============================================================
// PANELES ADMIN
// ============================================================
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
    cancelado: { label: "Cancelado", clase: "est-cancelado" },
    finalizado: { label: "Finalizado", clase: "est-finalizado" },
  };

  const torneosVigentes = tor.filter((t) => ["activo", "en_curso", "inscripciones"].includes(t.estado));

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

  contenido(
    `<h2 class="pagina">Resumen DAEM</h2>
     <div class="stats-fila">
       <div class="stat">
         <div class="num">${est.length}</div><div class="lbl">Establecimientos</div>
       </div>
       <div class="stat">
         <div class="num">${act.length}</div><div class="lbl">Actividades</div>
       </div>
       <div class="stat">
         <div class="num">${tor.length}</div><div class="lbl">Torneos</div>
       </div>
       <div class="stat">
         <div class="num">${solicitudesPendientes.length}</div><div class="lbl">Solicitudes Pend.</div>
       </div>
     </div>
     <div class="seccion">
       <button class="btn btn-primario2" id="btn-admin-sol">Solicitudes</button>
       <button class="btn btn-primario2" id="btn-admin-agenda">Agenda</button>
     </div>

     <h3 class="subtitulo-seccion">Torneos Activos</h3>
     <div class="tarjeta">
       ${torneosVigentes.length ? `
         <table><thead><tr><th>Torneo</th><th>Actividad / Deporte</th><th>Ano / Semestre</th><th>Estado</th></tr></thead>
         <tbody>${torneosVigentes.map((t) => `
           <tr>
             <td><strong>${esc(t.nombre)}</strong></td>
             <td>${esc(t.actividad ? t.actividad.nombre : "-")}</td>
             <td>${esc(t.anio)} S${esc(t.semestre)}</td>
             <td>${formatearEstado(t.estado)}</td>
           </tr>`).join("")}</tbody></table>`
         : "<p class='muted'>No hay torneos activos en este momento.</p>"}
     </div>

     <h3 class="subtitulo-seccion">Cambios Recientes (ultimo mes)</h3>
     <div class="tarjeta">
       ${cambiosRecientes.length ? cambiosRecientes.map((t) => {
         const creadoRecientemente = t.createdAt && new Date(t.createdAt).getTime() >= haceUnMes;
         return `<div class="campo cambio-torneo">
           <strong>${esc(t.nombre)}</strong>
           <span class="badge-rol cambio-tipo ${creadoRecientemente ? "cambio-nuevo" : ""}">${creadoRecientemente ? "Nuevo" : "Modificado"}</span>
           ${formatearEstado(t.estado)}
           <p class="muted">${esc(t.actividad ? t.actividad.nombre : "-")} | ${esc(new Date((t.updatedAt || t.createdAt)).toLocaleDateString("es-CL"))}</p>
         </div>`;
       }).join("") : "<p class='muted'>No hubo cambios de torneos en el ultimo mes.</p>"}
     </div>`
  );

  $("#btn-admin-sol").onclick = () => navegar("adminSolicitudes");
  $("#btn-admin-agenda").onclick = () => navegar("adminAgenda");
}

async function panelAdminEstablecimientos() {
  const est = await API.establecimientos();
  contenido(
    `<div class="encabezado"><h2 class="pagina">Establecimientos</h2><button class="btn btn-primario2" id="btn-nuevo-est">+ Nuevo</button></div>
     <div id="form-nuevo-est" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Codigo (ej. A-59)</label><input id="est-codigo" placeholder="A-59"></div>
         <div class="campo"><label>Nombre</label><input id="est-nombre"></div>
         <div class="campo"><label>Dependencia</label>
           <select id="est-dep">${(CAT.dependencias || []).map((d) => `<option>${esc(d)}</option>`).join("")}</select></div>
       </div>
       <div class="campo"><label>Direccion</label><input id="est-dir"></div>
       <button class="btn btn-ok" id="btn-guardar-est">Guardar</button>
     </div>
     <div class="tarjeta"><table><thead><tr><th>Codigo</th><th>Nombre</th><th>Dependencia</th></tr></thead>
     <tbody>${est.map((e) => `<tr><td>${esc(e.codigo)}</td><td>${esc(e.nombre)}</td><td>${esc(e.dependencia)}</td></tr>`).join("")}</tbody></table></div>`
  );
  $("#btn-nuevo-est").onclick = () => $("#form-nuevo-est").classList.toggle("oculta");
  $("#btn-guardar-est").onclick = async () => {
    try {
      await API.crearEstablecimiento({
        codigo: $("#est-codigo").value, nombre: $("#est-nombre").value,
        dependencia: $("#est-dep").value, direccion: $("#est-dir").value,
      });
      panelAdminEstablecimientos();
    } catch (err) { alert(err.message); }
  };
}

async function panelAdminUsuarios() {
  const [usuarios, est] = await Promise.all([API.usuarios(), API.establecimientos()]);
  contenido(
    `<div class="encabezado"><h2 class="pagina">Usuarios</h2><button class="btn btn-primario2" id="btn-nuevo-usr">+ Nuevo</button></div>
     <div id="form-nuevo-usr" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>RUT</label><input id="usr-rut"></div>
         <div class="campo"><label>Nombre</label><input id="usr-nombre"></div>
         <div class="campo"><label>Rol</label><select id="usr-rol"><option value="coordinador">Coordinador</option><option value="encargado">Encargado</option></select></div>
         <div class="campo"><label>Clave</label><input id="usr-clave"></div>
         <div class="campo"><label>Establecimiento</label>
           <select id="usr-est"><option value="">--</option>${est.map((e) => `<option value="${e._id}">${esc(e.codigo)} - ${esc(e.nombre)}</option>`).join("")}</select></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-usr">Guardar</button>
     </div>
     <div class="tarjeta"><table><thead><tr><th>RUT</th><th>Nombre</th><th>Rol</th><th>Establecimiento</th></tr></thead>
     <tbody>${usuarios.map((u) => `<tr><td>${esc(u.rut)}</td><td>${esc(u.nombre)}</td><td>${esc(u.rol)}</td><td>${esc(u.establecimiento ? u.establecimiento.nombre : "-")}</td></tr>`).join("")}</tbody></table></div>`
  );
  $("#btn-nuevo-usr").onclick = () => $("#form-nuevo-usr").classList.toggle("oculta");
  $("#btn-guardar-usr").onclick = async () => {
    try {
      await API.crearUsuario({
        rut: $("#usr-rut").value, nombre: $("#usr-nombre").value, rol: $("#usr-rol").value,
        clave: $("#usr-clave").value, establecimiento: $("#usr-est").value,
      });
      panelAdminUsuarios();
    } catch (err) { alert(err.message); }
  };
}

async function panelAdminActividades() {
  const act = await API.actividades();
  const divs = (CAT.divisiones || []).map((d) => d.nombre);
  contenido(
    `<div class="encabezado"><h2 class="pagina">Actividades</h2><button class="btn btn-primario2" id="btn-nuevo-act">+ Nueva</button></div>
     <div id="form-nuevo-act" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Nombre</label><input id="act-nombre"></div>
         <div class="campo"><label>Area</label><select id="act-area">${(CAT.areas || []).map((a) => `<option>${esc(a)}</option>`).join("")}</select></div>
         <div class="campo"><label>Divisiones</label>
           <select id="act-div" multiple size="4">${divs.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}</select></div>
         <div class="campo"><label>Recintos (separados por coma)</label><input id="act-recintos" placeholder="Cancha 1, Polideportivo"></div>
         <div class="campo"><label>Limite de inscritos (0 = sin limite)</label><input type="number" id="act-limite" value="0" min="0"></div>
         <div class="campo"><label>Apertura inscripciones</label><input type="date" id="act-apertura"></div>
         <div class="campo"><label>Cierre inscripciones</label><input type="date" id="act-cierre"></div>
         <div class="campo"><label>Edad minima (opcional)</label><input type="number" id="act-edad-min" value="" min="0" max="120" placeholder="6"></div>
         <div class="campo"><label>Edad maxima (opcional)</label><input type="number" id="act-edad-max" value="" min="0" max="120" placeholder="18"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-act">Guardar</button>
     </div>
     ${act.map((a) => {
        const ahora = new Date();
        const abierta = a.estado === "en_inscripcion" || a.estado === "publicada";
        const inicio = a.fechaAperturaInscripcion ? new Date(a.fechaAperturaInscripcion) : null;
        const fin = a.fechaCierreInscripcion ? new Date(a.fechaCierreInscripcion) : null;
        const dentroVentana = (!inicio || ahora >= inicio) && (!fin || ahora <= fin);
        const estadoIns = (abierta && dentroVentana) ? "Inscripciones Abiertas" : "Cerrada";
        return `<div class="tarjeta"><h3>${esc(a.nombre)} <span class="badge-rol">${esc(a.area)}</span></h3>
          <p class="muted">Divisiones: ${esc(a.divisiones.join(", "))} | Recintos: ${esc(a.recintos.join(", ") || "-")} | Estado: ${esc(a.estado)} | Limite inscritos: ${a.limiteInscritos || "Sin limite"}${a.edadMinima || a.edadMaxima ? ` | Edad: ${a.edadMinima ?? "?"}-${a.edadMaxima ?? "?"} anios` : ""}</p>
          <p class="muted"><span class="estado ${dentroVentana ? "est-activo" : "est-cancelado"}">${estadoIns}</span>
          ${inicio ? ` Apertura: ${inicio.toLocaleDateString("es-CL")}` : ""}${fin ? ` | Cierre: ${fin.toLocaleDateString("es-CL")}` : ""}</p></div>`;
      }).join("")}`
  );
  $("#btn-nuevo-act").onclick = () => $("#form-nuevo-act").classList.toggle("oculta");
  $("#btn-guardar-act").onclick = async () => {
    try {
      const divsSel = Array.from($("#act-div").selectedOptions).map((o) => o.value);
      await API.crearActividad({
        nombre: $("#act-nombre").value, area: $("#act-area").value, divisiones: divsSel,
        recintos: $("#act-recintos").value.split(",").map((s) => s.trim()).filter(Boolean),
        limiteInscritos: Number($("#act-limite").value) || 0,
        fechaAperturaInscripcion: $("#act-apertura").value || null,
        fechaCierreInscripcion: $("#act-cierre").value || null,
        edadMinima: $("#act-edad-min").value ? Number($("#act-edad-min").value) : null,
        edadMaxima: $("#act-edad-max").value ? Number($("#act-edad-max").value) : null,
        estado: "publicada", encuentros: [],
      });
      panelAdminActividades();
    } catch (err) { alert(err.message); }
  };
}

async function panelAdminTorneos() {
  const [tor, act] = await Promise.all([API.torneos(), API.actividades()]);
  contenido(
    `<div class="encabezado"><h2 class="pagina">Torneos y Sorteo</h2><button class="btn btn-primario2" id="btn-nuevo-tor">+ Nuevo Torneo</button></div>
     <div id="form-nuevo-tor" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Nombre</label><input id="tor-nombre"></div>
         <div class="campo"><label>Actividad</label><select id="tor-act">${act.map((a) => `<option value="${a._id}">${esc(a.nombre)}</option>`).join("")}</select></div>
         <div class="campo"><label>Semestre</label><select id="tor-sem"><option value="1">1</option><option value="2">2</option></select></div>
         <div class="campo"><label>Grupos (separados por coma)</label><input id="tor-grupos" value="Grupo A, Grupo B"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-tor">Guardar</button>
     </div>
     ${tor.map((t) => `<div class="tarjeta">
       <h3>${esc(t.nombre)} <span class="badge-rol">${esc(t.estado)}</span></h3>
       <p class="muted">Actividad: ${esc(t.actividad ? t.actividad.nombre : "-")} | ${esc(t.anio)} S${esc(t.semestre)} | Grupos: ${esc((t.grupos || []).join(", "))}</p>
       <div class="seccion"><button class="btn btn-primario2 btn-mini" data-sorteo="${t._id}">Ejecutar Sorteo</button>
       <button class="btn btn-mini" data-llaves="${t._id}">Ver Mapa del Torneo</button></div>
       <div id="llaves-${t._id}" class="oculta"></div>
     </div>`).join("")}`
  );
  $("#btn-nuevo-tor").onclick = () => $("#form-nuevo-tor").classList.toggle("oculta");
  $("#btn-guardar-tor").onclick = async () => {
    try {
      await API.crearTorneo({
        nombre: $("#tor-nombre").value, actividad: $("#tor-act").value,
        semestre: Number($("#tor-sem").value), anio: new Date().getFullYear(),
        grupos: $("#tor-grupos").value.split(",").map((s) => s.trim()).filter(Boolean),
        formulario: {},
      });
      panelAdminTorneos();
    } catch (err) { alert(err.message); }
  };
  document.querySelectorAll("[data-sorteo]").forEach((b) => {
    b.onclick = async () => { try { await API.ejecutarSorteo(b.dataset.sorteo); alert("Sorteo ejecutado"); panelAdminTorneos(); } catch (err) { alert(err.message); } };
  });
  document.querySelectorAll("[data-llaves]").forEach((b) => {
    b.onclick = async () => {
      const div = $(`#llaves-${b.dataset.llaves}`);
      div.classList.toggle("oculta");
      if (div.innerHTML) return;
      div.innerHTML = "<p class='muted'>Cargando mapa del torneo...</p>";
      try {
        await mostrarBracket(b.dataset.llaves, div);
      } catch (err) { div.innerHTML = mensajeError(err); }
    };
  });
}

// Mapa (bracket) del torneo: rondas, cruces, puntajes y ganadores.
const nombreRonda = (cantidadLlaves) => {
  if (cantidadLlaves <= 1) return "Final";
  if (cantidadLlaves === 2) return "Semifinal";
  if (cantidadLlaves === 4) return "Cuartos de Final";
  if (cantidadLlaves === 8) return "Octavos de Final";
  return `Ronda (${cantidadLlaves} cruces)`;
};

async function mostrarBracket(torneoId, div) {
  const llaves = await API.llaves(torneoId);
  if (!llaves || !llaves.length) {
    div.innerHTML = "<p class='muted'>Aun no hay llaves. Ejecute el sorteo para ver el mapa del torneo.</p>";
    return;
  }

  const porNivel = {};
  llaves.forEach((l) => { (porNivel[l.nivel] = porNivel[l.nivel] || []).push(l); });
  const niveles = Object.keys(porNivel).map(Number).sort((a, b) => a - b);

  const cardEquipo = (equipo, idx, llave) => {
    const idEquipo = equipo ? (equipo._id || equipo) : null;
    const gana = llave.ganador && idEquipo && String(idEquipo) === String(llave.ganador._id || llave.ganador);
    const puntaje = llave.puntajeA !== null && llave.puntajeA !== undefined
      ? `<span class="match-puntaje">${idx === 0 ? llave.puntajeA : llave.puntajeB}</span>` : "";
    if (!equipo) return `<div class="match-equipo libre">Por definir</div>`;
    return `<div class="match-equipo ${gana ? "ganador" : ""}">${esc(equipo.nombre || "Libre")}${puntaje}${gana ? "<span class='badge-rol'>GANA</span>" : ""}</div>`;
  };

  const columnas = niveles.map((n) => {
    const llavesNivel = porNivel[n];
    const cruces = llavesNivel.map((l) => {
      const a = l.equipos && l.equipos[0] ? l.equipos[0] : null;
      const b = l.equipos && l.equipos[1] ? l.equipos[1] : null;
      const jugable = !l.bye && l.estado === "pendiente" && l.equipos && l.equipos.length === 2;
      return `<div class="match-card ${l.bye ? "match-bye" : ""}">
        <div class="match-cabecera">${esc(l.grupo)} <span class="muted">· ${esc(l.division)}</span> <span class="estado est-${esc(l.estado)}">${esc(l.estado)}</span></div>
        ${cardEquipo(a, 0, l)}
        <div class="match-sep">vs</div>
        ${cardEquipo(b, 1, l)}
        ${jugable ? `<div class="match-acciones"><button class="btn btn-ok btn-mini" data-llave="${l._id}">Registrar Resultado</button>
          <div id="form-llave-${l._id}" class="oculta">
            <input id="pa-${l._id}" style="width:64px" placeholder="A">&nbsp;:&nbsp;<input id="pb-${l._id}" style="width:64px" placeholder="B">
            <button class="btn btn-ok btn-mini" data-guardar-llave="${l._id}">Guardar</button>
          </div></div>` : ""}
      </div>`;
    }).join("");
    return `<div class="bracket-col"><div class="bracket-ronda">${nombreRonda(llavesNivel.length)}</div><div class="bracket-cruces">${cruces}</div></div>`;
  }).join("");

  div.innerHTML = `<div class="bracket">${columnas}</div>`;

  div.querySelectorAll("[data-llave]").forEach((bb) => {
    bb.onclick = () => $(`#form-llave-${bb.dataset.llave}`).classList.toggle("oculta");
  });
  div.querySelectorAll("[data-guardar-llave]").forEach((bb) => {
    bb.onclick = async () => {
      try {
        await API.registrarResultadoLlave(bb.dataset.guardarLlave, {
          puntajeA: $(`#pa-${bb.dataset.guardarLlave}`).value,
          puntajeB: $(`#pb-${bb.dataset.guardarLlave}`).value,
        });
        alert("Resultado registrado; el ganador avanza de ronda");
        div.innerHTML = "<p class='muted'>Cargando mapa del torneo...</p>";
        await mostrarBracket(torneoId, div);
      } catch (err) { alert(err.message); }
    };
  });
}

async function panelAdminInscripciones() {
  const [ins, est, act, tor] = await Promise.all([
    API.inscripciones(), API.establecimientos(), API.actividades(), API.torneos(),
  ]);
  contenido(
    `<h2 class="pagina">Control de Inscripciones</h2>
     <div class="seccion"><button class="btn btn-primario2" id="btn-nueva-ins">+ Nueva Inscripcion</button></div>
     <div id="form-nueva-ins" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Establecimiento</label><select id="ins-est">${est.map((e) => `<option value="${e._id}">${esc(e.codigo)} - ${esc(e.nombre)}</option>`).join("")}</select></div>
         <div class="campo"><label>Actividad</label><select id="ins-act">${act.map((a) => `<option value="${a._id}">${esc(a.nombre)}</option>`).join("")}</select></div>
         <div class="campo"><label>Division</label><select id="ins-div">${(CAT.divisiones || []).map((d) => `<option>${esc(d.nombre)}</option>`).join("")}</select></div>
         <div class="campo"><label>Torneo</label><select id="ins-tor"><option value="">--</option>${tor.map((t) => `<option value="${t._id}">${esc(t.nombre)}</option>`).join("")}</select></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-ins">Enviar</button>
     </div>
     <div class="tarjeta"><table><thead><tr><th>Establecimiento</th><th>Actividad</th><th>Division</th><th>Estado</th><th>Acciones</th></tr></thead>
     <tbody>${ins.map((i) => `<tr>
       <td>${esc(i.establecimiento ? i.establecimiento.nombre : i.establecimiento)}</td>
       <td>${esc(i.actividad ? i.actividad.nombre : i.actividad)}</td>
       <td>${esc(i.division)}</td>
       <td><span class="estado est-${esc(i.estado)}">${esc(i.estado)}</span></td>
       <td>${i.estado === "en_proceso" ? `<button class="btn btn-ok btn-mini" data-acc="${i._id}" data-est="aceptada">Aceptar</button> <button class="btn btn-err2 btn-mini" data-acc="${i._id}" data-est="rechazada">Rechazar</button>` : "-"}</td>
     </tr>`).join("")}</tbody></table></div>`
  );
  $("#btn-nueva-ins").onclick = () => $("#form-nueva-ins").classList.toggle("oculta");
  $("#btn-guardar-ins").onclick = async () => {
    try {
      const nuevo = await API.crearInscripcion({ establecimiento: $("#ins-est").value, actividad: $("#ins-act").value, division: $("#ins-div").value });
      if ($("#ins-tor").value) { /* asociacion requiere endpoint aparte; se omite por simplicidad */ }
      void nuevo;
      panelAdminInscripciones();
    } catch (err) { alert(err.message); }
  };
  document.querySelectorAll("[data-acc]").forEach((b) => {
    b.onclick = async () => {
      try { await API.cambiarEstadoInscripcion(b.dataset.acc, b.dataset.est); panelAdminInscripciones(); }
      catch (err) { alert(err.message); }
    };
  });
}

async function panelAdminValoraciones() {
  const [est, act] = await Promise.all([API.establecimientos(), API.actividades()]);
  contenido(
    `<div class="encabezado"><h2 class="pagina">Ranking de Cumplimiento</h2><button class="btn btn-primario2" id="btn-nueva-val">+ Asignar</button></div>
     <div id="form-nueva-val" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>Establecimiento</label><select id="val-est">${est.map((e) => `<option value="${e._id}">${esc(e.codigo)} - ${esc(e.nombre)}</option>`).join("")}</select></div>
         <div class="campo"><label>Actividad</label><select id="val-act">${act.map((a) => `<option value="${a._id}">${esc(a.nombre)}</option>`).join("")}</select></div>
         <div class="campo"><label>Estado</label><select id="val-estado"><option value="cumple">cumple</option><option value="regular">regular</option><option value="no_cumple">no_cumple</option></select></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-val">Guardar</button>
     </div>
     <div id="ranking"></div>`
  );
  $("#btn-nueva-val").onclick = () => $("#form-nueva-val").classList.toggle("oculta");
  $("#btn-guardar-val").onclick = async () => {
    try {
      await API.asignarValoracion({
        establecimiento: $("#val-est").value, actividad: $("#val-act").value,
        estado: $("#val-estado").value, anio: new Date().getFullYear(), semestre: 1,
      });
      panelAdminValoraciones();
    } catch (err) { alert(err.message); }
  };
  const ranking = await API.ranking();
  $("#ranking").innerHTML = Object.entries(ranking).map(([nombre, filas]) =>
    `<div class="tarjeta"><h3>${esc(nombre)}</h3>` +
    filas.map((f) => `<span class="stat"><strong>${esc(f.establecimiento)}</strong><br><span class="badge-rol">${esc(f.estado)} (${f.valor})</span></span>`).join("") +
    `</div>`).join("");
}

async function panelAdminSolicitudes() {
  const sol = await API.solicitudes();
  contenido(
    `<h2 class="pagina">Solicitudes Pendientes</h2>
     <div class="tarjeta"><table><thead><tr><th>Tipo</th><th>Detalle</th><th>Estado</th><th>Acciones</th></tr></thead>
     <tbody>${sol.map((s) => `<tr>
       <td>${esc(s.tipo)}</td>
       <td>${esc(s.detalle)}</td>
       <td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td>
       <td>${s.estado === "en_proceso" ? `<button class="btn btn-ok btn-mini" data-sol-acc="${s._id}" data-sol-est="aprobada">Aprobar</button> <button class="btn btn-err2 btn-mini" data-sol-acc="${s._id}" data-sol-est="rechazada">Rechazar</button>` : "-"}</td>
     </tr>`).join("")}</tbody></table></div>`
  );
  document.querySelectorAll("[data-sol-acc]").forEach((b) => {
    b.onclick = async () => {
      try {
        await API.responderSolicitud(b.dataset.solAcc, b.dataset.solEst, "");
        panelAdminSolicitudes();
      } catch (err) { alert(err.message); }
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

    const lista = filtrados.length ? filtrados.map((ev) => `
      <div class="item-agenda">
        <strong>${esc(ev.torneo)}</strong>
        <span class="badge-rol">${esc(ev.actividad)}</span>
        <p class="muted">${esc(new Date(ev.fecha).toLocaleDateString("es-CL"))} - ${esc(ev.hora)} @ ${esc(ev.lugar)}</p>
        <p class="muted">Grupo: ${esc(ev.grupo)} | Division: ${esc(ev.division)}</p>
      </div>`).join("")
      : `<p class="muted">No hay torneos para esta fecha.</p>`;

    return `
      <div class="separador-agenda">${esc(mostrando)}</div>
      ${lista}`;
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

  const render = () => {
    $("#agenda-lista").innerHTML = listarEventos(null, $("#agenda-buscar").value);
  };

  $("#agenda-buscar").addEventListener("input", render);

  document.querySelectorAll(".cal-celda").forEach((c) => {
    if (c.classList.contains("vacio")) return;
    c.onclick = () => {
      document.querySelectorAll(".cal-celda").forEach((x) => x.classList.remove("seleccionado"));
      c.classList.add("seleccionado");
      $("#agenda-buscar").value = "";
      $("#agenda-lista").innerHTML = listarEventos(c.dataset.dia, "");
    };
  });
}

async function panelAdminReportes() {
  const [part, ben, hist] = await Promise.all([
    API.participaciones().catch(() => []),
    API.beneficiarios().catch(() => ({ total: 0, semestres: [], porEstablecimiento: [] })),
    API.historico().catch(() => ({})),
  ]);
  contenido(
    `<h2 class="pagina">Reportes y Estadisticas</h2>
     <div class="tarjeta"><h3>Total de Beneficiarios</h3>
       <div class="stat"><div class="num">${ben.total}</div><div class="lbl">Beneficiarios</div></div>
       ${(ben.semestres || []).map((s) => `<span class="stat"><div class="num">${s.total}</div><div class="lbl">Semestre ${s._id}</div></span>`).join("")}
     </div>
     <div class="tarjeta"><h3>Participaciones por Establecimiento</h3>
       <table><thead><tr><th>Codigo</th><th>Establecimiento</th><th>Total</th><th>Aceptadas</th></tr></thead>
       <tbody>${part.map((p) => `<tr><td>${esc(p.codigo)}</td><td>${esc(p.nombre)}</td><td>${p.total}</td><td>${p.aceptadas}</td></tr>`).join("")}</tbody></table>
     </div>
     <div class="tarjeta"><h3>Trazabilidad Historica</h3>
       <p class="muted">${esc(JSON.stringify(hist.porAnio || []))}</p>
     </div>`
  );
}

// ============================================================
// PANELES COORDINADOR
// ============================================================
async function panelCoordResumen() {
  const nomina = await API.nomina().catch(() => ({ total: 0, porActividad: [] }));
  contenido(
    `<h2 class="pagina">Resumen del Establecimiento</h2>
     <div class="stat"><div class="num">${nomina.total}</div><div class="lbl">Estudiantes inscritos</div></div>
     <div class="seccion"><button class="btn" id="btn-vercat">Ver Cartelera</button></div>
     <div id="cartelera" class="oculta"></div>`
  );
  $("#btn-vercat").onclick = () => cargarCarteleraEn("#cartelera");
}

async function cargarCarteleraEn(sel) {
  const div = $(sel);
  if (div.innerHTML) { div.classList.toggle("oculta"); return; }
  const act = await API.actividades();
  div.innerHTML = act.map((a) => {
    const ahora = new Date();
    const inicio = a.fechaAperturaInscripcion ? new Date(a.fechaAperturaInscripcion) : null;
    const fin = a.fechaCierreInscripcion ? new Date(a.fechaCierreInscripcion) : null;
    const dentroVentana = (!inicio || ahora >= inicio) && (!fin || ahora <= fin);
    const abierta = a.estado === "en_inscripcion" || a.estado === "publicada";
    const puedeInscribir = abierta && dentroVentana;
    return `<div class="tarjeta"><h3>${esc(a.nombre)} <span class="badge-rol">${esc(a.area)}</span></h3>
    <p class="muted">Divisiones: ${esc(a.divisiones.join(", "))} | Estado: ${esc(a.estado)}${a.limiteInscritos ? ` | Cupos: ${a.limiteInscritos}` : ""}${a.edadMinima || a.edadMaxima ? ` | Edad: ${a.edadMinima ?? "?"}-${a.edadMaxima ?? "?"} anios` : ""}</p>
    <p class="muted"><span class="estado ${puedeInscribir ? "est-activo" : "est-cancelado"}">${puedeInscribir ? "Inscripciones Abiertas" : "Cerrada"}</span>
    ${inicio ? ` Apertura: ${inicio.toLocaleDateString("es-CL")}` : ""}${fin ? ` | Cierre: ${fin.toLocaleDateString("es-CL")}` : ""}</p>
    ${puedeInscribir ? `<button class="btn btn-mini" data-ins-act="${a._id}">Inscribir</button>` : ""}
    <div id="form-act-${a._id}" class="oculta campo">
      <label>Division</label><select id="div-${a._id}">${a.divisiones.map((d) => `<option>${esc(d)}</option>`).join("")}</select>
      <button class="btn btn-ok btn-mini" data-guardar-ins="${a._id}">Enviar Inscripcion</button>
    </div></div>`;
  }).join("");
  div.classList.remove("oculta");
  div.querySelectorAll("[data-ins-act]").forEach((b) => b.onclick = () => $(`#form-act-${b.dataset.insAct}`).classList.toggle("oculta"));
  div.querySelectorAll("[data-guardar-ins]").forEach((b) => {
    b.onclick = async () => {
      try {
        await API.crearInscripcion({ establecimiento: API.usuario.establecimiento._id, actividad: b.dataset.guardarIns, division: $(`#div-${b.dataset.guardarIns}`).value });
        alert("Inscripcion enviada (en proceso)"); location.hash = "#coordSolicitudes";
      } catch (err) { alert(err.message); }
    };
  });
}

async function panelCoordEncargados() {
  const usuarios = await API.usuarios();
  const act = await API.actividades();
  contenido(
    `<div class="encabezado"><h2 class="pagina">Encargados del Establecimiento</h2><button class="btn btn-primario2" id="btn-nuevo-enc">+ Nuevo Encargado</button></div>
     <div id="form-nuevo-enc" class="tarjeta oculta">
       <div class="grid-2">
         <div class="campo"><label>RUT</label><input id="enc-rut"></div>
         <div class="campo"><label>Nombre</label><input id="enc-nombre"></div>
         <div class="campo"><label>Clave</label><input id="enc-clave"></div>
         <div class="campo"><label>Actividad</label><select id="enc-act">${act.map((a) => `<option value="${a._id}">${esc(a.nombre)}</option>`).join("")}</select></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-enc">Guardar</button>
     </div>
     <div class="tarjeta"><table><thead><tr><th>RUT</th><th>Nombre</th><th>Actividades</th></tr></thead>
     <tbody>${usuarios.map((u) => `<tr><td>${esc(u.rut)}</td><td>${esc(u.nombre)}</td><td>${esc((u.actividades || []).map((a) => a.nombre || a).join(", "))}</td></tr>`).join("")}</tbody></table></div>`
  );
  $("#btn-nuevo-enc").onclick = () => $("#form-nuevo-enc").classList.toggle("oculta");
  $("#btn-guardar-enc").onclick = async () => {
    try {
      await API.crearUsuario({
        rut: $("#enc-rut").value, nombre: $("#enc-nombre").value, rol: "encargado",
        clave: $("#enc-clave").value, establecimiento: API.usuario.establecimiento._id,
        actividades: [$("#enc-act").value],
      });
      panelCoordEncargados();
    } catch (err) { alert(err.message); }
  };
}

async function panelCoordInscribir() {
  const ins = await API.inscripciones();
  contenido(
    `<h2 class="pagina">Inscripciones y Cartelera</h2>
     <div class="seccion"><button class="btn btn-primario2" id="btn-cartelera">Ver Cartelera de Actividades</button></div>
     <div id="cartelera-c" class="oculta"></div>
     <div class="tarjeta"><h3>Mis Inscripciones</h3>
      <table><thead><tr><th>Actividad</th><th>Division</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${ins.map((i) => `<tr>
        <td>${esc(i.actividad ? i.actividad.nombre : "-")}</td><td>${esc(i.division)}</td>
        <td><span class="estado est-${esc(i.estado)}">${esc(i.estado)}</span></td>
        <td>${i.estado === "en_proceso" ? '<button class="btn btn-err2 btn-mini" data-retract="' + i._id + '">Retractar</button>' : "-"}</td>
      </tr>`).join("")}</tbody></table>
      <h3>Inscribir Estudiantes</h3><div id="alumnos-forms"></div>
     </div>`
  );
  $("#btn-cartelera").onclick = () => cargarCarteleraEn("#cartelera-c");
  document.querySelectorAll("[data-retract]").forEach((b) => {
    b.onclick = async () => { try { await API.peticion("DELETE", `/api/inscripciones/${b.dataset.retract}`); panelCoordInscribir(); } catch (err) { alert(err.message); } };
  });
}

{ /* notas de soporte para agregar alumnos dentro del panel coordinador */ }
function panelCoordSolicitudes() { return panelCoordSolicitudesImpl(); }

async function panelCoordSolicitudesImpl() {
  const solicitudes = await API.solicitudes();
  const encAlumnos = await API.inscripciones();
  contenido(
    `<h2 class="pagina">Solicitudes y Estado</h2>
     <div class="seccion"><button class="btn btn-ok" id="btn-agregar-alumno">Agregar Estudiante a Inscripcion</button>
     <button class="btn btn-primario2" id="btn-ver-alumnos">Ver Alumnos</button></div>
     <div id="agregar-alumno-box" class="oculta tarjeta">
       <div class="grid-2">
         <div class="campo"><label>Inscripcion (aceptada)</label><select id="al-ins">${encAlumnos.filter((i) => i.estado === "aceptada").map((i) => `<option value="${i._id}">${esc(i.actividad ? i.actividad.nombre : "")} - ${esc(i.division)}</option>`).join("")}</select></div>
         <div class="campo"><label>RUT alumno</label><input id="al-rut"></div>
         <div class="campo"><label>Nombre</label><input id="al-nombre"></div>
         <div class="campo"><label>Genero</label><select id="al-genero"><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option></select></div>
         <div class="campo"><label>Fecha nacimiento (validada por categoria)</label><input type="date" id="al-fecha"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-al">Agregar</button>
     </div>
     <div id="alumnos-lista" class="oculta"></div>
     <div class="tarjeta"><h3>Estado de Solicitudes</h3>
       <table><thead><tr><th>Tipo</th><th>Detalle</th><th>Estado</th></tr></thead>
       <tbody>${solicitudes.map((s) => `<tr><td>${esc(s.tipo)}</td><td>${esc(s.detalle)}</td><td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td></tr>`).join("")}</tbody></table>
     </div>`
  );
  $("#btn-ver-alumnos").onclick = () => cargarAlumnos("#alumnos-lista");
  $("#btn-agregar-alumno").onclick = () => $("#agregar-alumno-box").classList.toggle("oculta");
  $("#btn-guardar-al").onclick = async () => {
    try {
      await API.agregarAlumno($("#al-ins").value, {
        rut: $("#al-rut").value, nombre: $("#al-nombre").value, fechaNacimiento: $("#al-fecha").value, genero: $("#al-genero").value,
      });
      alert("Estudiante agregado (la categoria valida el anio de nacimiento)"); panelCoordSolicitudes();
    } catch (err) { alert(err.message); }
  };
}

async function cargarAlumnos(sel) {
  const div = $(sel);
  if (div.innerHTML) { div.classList.toggle("oculta"); return; }
  const nomina = await API.nomina();
  div.innerHTML = `<div class="tarjeta"><h3>Nomina de Estudiantes</h3>
    <table><thead><tr><th>RUT</th><th>Nombre</th><th>Genero</th><th>Actividad</th><th>Division</th></tr></thead>
    <tbody>${nomina.alumnos.map((a) => `<tr><td>${esc(a.rut)}</td><td>${esc(a.nombre)}</td><td>${esc(a.genero === "M" ? "Masc" : a.genero === "F" ? "Fem" : "Otro")}</td><td>${esc(a.actividad ? a.actividad.nombre : "")}</td><td>${esc(a.division)}</td></tr>`).join("")}</tbody></table>
  </div>`;
  div.classList.remove("oculta");
}

async function panelCoordNomina() {
  const nomina = await API.nomina();
  contenido(
    `<h2 class="pagina">Nomina Interna de Estudiantes</h2>
     <div class="stat"><div class="num">${nomina.total}</div><div class="lbl">Total</div></div>
     <div class="tarjeta"><h3>Por Actividad</h3>
       <table><thead><tr><th>Actividad</th><th>Cantidad</th></tr></thead>
       <tbody>${nomina.porActividad.map((p) => `<tr><td>${esc(p.actividad)}</td><td>${p.cantidad}</td></tr>`).join("")}</tbody></table>
     </div>`
  );
}

// ============================================================
// PANELES ENCARGADO
// ============================================================
async function panelEncAgenda() {
  const ag = await API.agenda();
  contenido(
    `<h2 class="pagina">Mi Agenda de Encuentros</h2>
     <div class="tarjeta">${ag.mios.length ?
       ag.mios.map((m) => `<div class="campo">${esc(new Date(m.encuentro.fecha).toLocaleDateString())} - ${esc(m.encuentro.hora)} @ ${esc(m.encuentro.lugar)} (${esc(m.actividad ? m.actividad.nombre : "-")})</div>`).join("")
       : "<p class='muted'>No hay encuentros asignados.</p>"}
     </div>` 
  );
}

async function panelEncAlumnos() {
  const alumnos = await API.misAlumnos();
  contenido(
    `<h2 class="pagina">Gestion de Alumnos / Asistencia</h2>
     <div class="tarjeta"><table><thead><tr><th>RUT</th><th>Nombre</th><th>Genero</th><th>Actividad</th><th>Division</th></tr></thead>
     <tbody>${alumnos.map((a) => `<tr><td>${esc(a.rut)}</td><td>${esc(a.nombre)}</td><td>${esc(a.genero === "M" ? "Masc" : a.genero === "F" ? "Fem" : "Otro")}</td><td>${esc(a.actividad ? a.actividad.nombre : "")}</td><td>${esc(a.division)}</td></tr>`).join("")}</tbody></table>
     <p class="muted">La asistencia se registra via endpoint /api/alumnos/:id/asistencia/:encuentroId</p></div>`
  );
}

async function panelEncSolicitudes() {
  const solicitudes = await API.solicitudes();
  contenido(
    `<h2 class="pagina">Solicitudes Internas</h2>
     <div class="seccion"><button class="btn btn-primario2" id="btn-nueva-sol">+ Nueva Solicitud</button></div>
     <div id="form-nueva-sol" class="oculta tarjeta">
       <div class="grid-2">
         <div class="campo"><label>Tipo</label><select id="sol-tipo"><option value="recursos">recursos</option><option value="participacion">participacion</option><option value="otro">otro</option></select></div>
         <div class="campo"><label>Detalle</label><input id="sol-detalle"></div>
       </div>
       <button class="btn btn-ok" id="btn-guardar-sol">Enviar al Coordinador</button>
     </div>
     <div class="tarjeta"><table><thead><tr><th>Tipo</th><th>Detalle</th><th>Estado</th></tr></thead>
     <tbody>${solicitudes.map((s) => `<tr><td>${esc(s.tipo)}</td><td>${esc(s.detalle)}</td><td><span class="estado est-${esc(s.estado)}">${esc(s.estado)}</span></td></tr>`).join("")}</tbody></table>
     </div>`
  );
  $("#btn-nueva-sol").onclick = () => $("#form-nueva-sol").classList.toggle("oculta");
  $("#btn-guardar-sol").onclick = async () => {
    try {
      await API.crearSolicitud({ tipo: $("#sol-tipo").value, detalle: $("#sol-detalle").value });
      panelEncSolicitudes();
    } catch (err) { alert(err.message); }
  };
}

// ============================================================
// PANELES DIRECTOR (SOLO LECTURA)
// ============================================================
async function panelDirectorResumen() {
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
    cancelado: { label: "Cancelado", clase: "est-cancelado" },
    finalizado: { label: "Finalizado", clase: "est-finalizado" },
  };
  const formatearEstado = (est) =>
    etiquetasEstado[est]
      ? `<span class="estado ${etiquetasEstado[est].clase}">${etiquetasEstado[est].label}</span>`
      : `<span class="estado">${esc(est)}</span>`;

  const torneosVigentes = tor.filter((t) => ["activo", "en_curso", "inscripciones"].includes(t.estado));

  contenido(
    `<div class="encabezado"><h2 class="pagina">Vista de Solo Lectura</h2><p class="muted">Perfil Director - no puede modificar datos.</p></div>
     <div class="tarjeta"><h3>Torneos Vigentes</h3>
       ${torneosVigentes.length
         ? torneosVigentes.map((t) => `<div class="cambio-torneo">${formatearEstado(t.estado)} <strong>${esc(t.nombre)}</strong> <span class="muted">${esc(t.actividad ? t.actividad.nombre : "")} | ${esc(new Date((t.updatedAt || t.createdAt)).toLocaleDateString("es-CL"))}</span></div>`).join("")
         : "<p class='muted'>No hay torneos vigentes.</p>"}
     </div>
     <div class="tarjeta"><h3>Cartelera de Actividades</h3>
       ${act.length
         ? act.map((a) => {
             const inicio = a.fechaAperturaInscripcion ? new Date(a.fechaAperturaInscripcion) : null;
             const fin = a.fechaCierreInscripcion ? new Date(a.fechaCierreInscripcion) : null;
             return `<div class="cambio-torneo"><strong>${esc(a.nombre)}</strong> <span class="badge-rol">${esc(a.area)}</span> <span class="muted">| Divisiones: ${esc(a.divisiones.join(", "))} | Estado: ${esc(a.estado)}</span>
             ${(inicio || fin) ? `<span class="muted">| Inscripcion: ${inicio ? inicio.toLocaleDateString("es-CL") : "-"} a ${fin ? fin.toLocaleDateString("es-CL") : "-"}</span>` : ""}</div>`;
           }).join("")
         : "<p class='muted'>No hay actividades publicadas.</p>"}
     </div>`
  );
}

async function panelDirectorEstablecimientos() {
  const est = await API.establecimientos();
  contenido(
    `<h2 class="pagina">Establecimientos</h2>
     <div class="tarjeta"><table><thead><tr><th>Codigo</th><th>Nombre</th><th>Dependencia</th><th>Direccion</th></tr></thead>
     <tbody>${est.map((e) => `<tr><td>${esc(e.codigo)}</td><td>${esc(e.nombre)}</td><td>${esc(e.dependencia)}</td><td>${esc(e.direccion || "-")}</td></tr>`).join("")}</tbody></table></div>`
  );
}

async function panelDirectorRanking() {
  const ranking = await API.ranking();
  contenido(
    `<h2 class="pagina">Ranking de Cumplimiento</h2>
     ${Object.keys(ranking).length
       ? Object.entries(ranking).map(([nombre, filas]) =>
           `<div class="tarjeta"><h3>${esc(nombre)}</h3>` +
           filas.map((f) => `<span class="stat"><strong>${esc(f.establecimiento)}</strong><br><span class="badge-rol">${esc(f.estado)} (${f.valor})</span></span>`).join("") +
           `</div>`).join("")
       : "<div class='tarjeta'><p class='muted'>Sin valoraciones registradas.</p></div>"}`
  );
}

// ---------- Init ----------
function init() {
  API.loadToken();
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
  $("#btn-salir").onclick = () => { API.limpiar(); mostrarLogin(); };

  if (API.token) {
    API.perfil()
      .then(async () => { await cargarCatalogos(); mostrarDashboard(); })
      .catch(() => { API.limpiar(); mostrarLogin(); });
  } else {
    mostrarLogin();
  }
}

init();
