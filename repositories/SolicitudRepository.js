const { obtenerConexion } = require("../db/conexion");
const { nowISO } = require("../db/util");

const SQL_SOLICITUDES = `
  SELECT s.*,
         a.id AS actividadId, a.nombre AS actividadNombre, a.area AS actividadArea,
         a.anio AS actividadAnio, a.estado AS actividadEstado,
         e.id AS establecimientoId, e.nombre AS establecimientoNombre,
         e.codigo AS establecimientoCodigo, e.dependencia AS establecimientoDependencia,
         e.direccion AS establecimientoDireccion, e.contacto AS establecimientoContacto,
         e.createdAt AS establecimientoCreatedAt, e.updatedAt AS establecimientoUpdatedAt
  FROM solicitudes s
  LEFT JOIN actividades a ON a.id = s.actividad
  LEFT JOIN establecimientos e ON e.id = s.establecimiento
`;

const COLUMNAS_SOLICITUD = new Set([
  "tipo", "detalle", "estado", "rutSolicitante", "rutCoordinador",
  "actividad", "establecimiento", "respuesta", "inscripcion", "torneo",
  "division", "alumnoRut", "alumnoNombre", "alumnoGenero",
  "alumnoFechaNacimiento", "alumnoApoderado", "alumnoEmail", "alumnoTelefono",
]);

function aSolicitud(s) {
  return {
    id: s.id,
    _id: s.id,
    codigo: s.codigo || "",
    tipo: s.tipo,
    detalle: s.detalle,
    estado: s.estado,
    rutSolicitante: s.rutSolicitante,
    rutCoordinador: s.rutCoordinador,
    actividad: s.actividadId == null ? null : {
      _id: s.actividadId,
      id: s.actividadId,
      nombre: s.actividadNombre,
      area: s.actividadArea,
      anio: s.actividadAnio,
      estado: s.actividadEstado,
    },
    establecimiento: s.establecimientoId == null ? null : {
      _id: s.establecimientoId,
      id: s.establecimientoId,
      codigo: s.establecimientoCodigo,
      nombre: s.establecimientoNombre,
      dependencia: s.establecimientoDependencia,
      direccion: s.establecimientoDireccion,
      contacto: s.establecimientoContacto,
      createdAt: s.establecimientoCreatedAt,
      updatedAt: s.establecimientoUpdatedAt,
    },
    respuesta: s.respuesta,
    inscripcion: s.inscripcion == null ? null : s.inscripcion,
    torneo: s.torneo == null ? null : s.torneo,
    division: s.division,
    alumno: {
      rut: s.alumnoRut,
      nombre: s.alumnoNombre,
      genero: s.alumnoGenero,
      fechaNacimiento: s.alumnoFechaNacimiento,
      apoderado: s.alumnoApoderado,
      email: s.alumnoEmail,
      telefono: s.alumnoTelefono,
    },
    alumnos: [],
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function cargarAlumnos(bd, solicitud) {
  if (!solicitud) return solicitud;
  const filas = bd.prepare(`SELECT * FROM solicitud_alumnos WHERE solicitud = ?`).all(solicitud.id);
  solicitud.alumnos = filas.map((f) => ({
    id: f.id,
    _id: f.id,
    rut: f.rut,
    nombre: f.nombre,
    genero: f.genero,
    fechaNacimiento: f.fechaNacimiento,
    apoderado: f.apoderado,
    email: f.email,
    telefono: f.telefono,
  }));
  // compatibilidad: si no hay alumnos en la tabla, usar el alumno legacy
  if (!solicitud.alumnos.length && solicitud.alumno && solicitud.alumno.rut) {
    solicitud.alumnos = [{ ...solicitud.alumno, id: null, _id: null }];
  }
  return solicitud;
}

function construirFiltro(filtro) {
  const cond = [];
  const params = [];
  for (const [k, v] of Object.entries(filtro || {})) {
    if (v === undefined) continue;
    if (!COLUMNAS_SOLICITUD.has(k)) continue;
    if (v === null) {
      cond.push(`s.${k} IS NULL`);
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v) && "$in" in v) {
      const lista = (Array.isArray(v.$in) ? v.$in : []).filter((x) => x != null && x !== "");
      if (!lista.length) {
        cond.push("0");
      } else {
        cond.push(`s.${k} IN (${lista.map(() => "?").join(",")})`);
        params.push(...lista);
      }
      continue;
    }
    cond.push(`s.${k} = ?`);
    params.push(v);
  }
  return { where: cond.length ? `WHERE ${cond.join(" AND ")}` : "", params };
}

class SolicitudRepository {
  crear(solicitud) {
    const bd = obtenerConexion();
    const codigo = solicitud.codigo || `SOL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const r = bd
      .prepare(
        `INSERT INTO solicitudes
          (codigo, tipo, detalle, estado, rutSolicitante, rutCoordinador, actividad,
           establecimiento, respuesta, inscripcion, torneo, division,
           alumnoRut, alumnoNombre, alumnoGenero, alumnoFechaNacimiento,
           alumnoApoderado, alumnoEmail, alumnoTelefono)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        codigo,
        solicitud.tipo,
        solicitud.detalle,
        solicitud.estado ?? "en_proceso",
        solicitud.rutSolicitante,
        solicitud.rutCoordinador ?? "",
        solicitud.actividad ?? null,
        solicitud.establecimiento ?? null,
        solicitud.respuesta ?? "",
        solicitud.inscripcion ?? null,
        solicitud.torneo ?? null,
        solicitud.division ?? "",
        (solicitud.alumnos && solicitud.alumnos[0]?.rut) || solicitud.alumno?.rut || "",
        (solicitud.alumnos && solicitud.alumnos[0]?.nombre) || solicitud.alumno?.nombre || "",
        (solicitud.alumnos && solicitud.alumnos[0]?.genero) || solicitud.alumno?.genero || "",
        (solicitud.alumnos && solicitud.alumnos[0]?.fechaNacimiento) || solicitud.alumno?.fechaNacimiento || null,
        (solicitud.alumnos && solicitud.alumnos[0]?.apoderado) || solicitud.alumno?.apoderado || "",
        (solicitud.alumnos && solicitud.alumnos[0]?.email) || solicitud.alumno?.email || "",
        (solicitud.alumnos && solicitud.alumnos[0]?.telefono) || solicitud.alumno?.telefono || ""
      );
    const sid = r.lastInsertRowid;
    const alumnos = Array.isArray(solicitud.alumnos) ? solicitud.alumnos : (solicitud.alumno ? [solicitud.alumno] : []);
    const insertAl = bd.prepare(`INSERT INTO solicitud_alumnos (solicitud, rut, nombre, genero, fechaNacimiento, apoderado, email, telefono) VALUES (?,?,?,?,?,?,?,?)`);
    for (const a of alumnos) {
      insertAl.run(sid, a.rut || "", a.nombre || "", a.genero || "", a.fechaNacimiento || null, a.apoderado || "", a.email || "", a.telefono || "");
    }
    return cargarAlumnos(bd, this.obtenerPorId(sid));
  }

  obtenerTodos(filtro = {}) {
    const bd = obtenerConexion();
    const { where, params } = construirFiltro(filtro);
    return bd
      .prepare(`${SQL_SOLICITUDES} ${where} ORDER BY s.updatedAt DESC, s.id DESC`)
      .all(...params)
      .map(aSolicitud)
      .map((s) => cargarAlumnos(bd, s));
  }

  obtenerPorId(id) {
    const bd = obtenerConexion();
    const fila = bd.prepare(`${SQL_SOLICITUDES} WHERE s.id = ?`).get(id);
    return fila ? cargarAlumnos(bd, aSolicitud(fila)) : null;
  }

  actualizar(id, datos) {
    const bd = obtenerConexion();
    const campos = [];
    const params = [];
    for (const c of [...COLUMNAS_SOLICITUD]) {
      if (datos[c] === undefined) continue;
      campos.push(`${c} = ?`);
      params.push(datos[c]);
    }
    if (campos.length) {
      campos.push(`updatedAt = ?`);
      params.push(nowISO());
      params.push(id);
      bd.prepare(`UPDATE solicitudes SET ${campos.join(", ")} WHERE id = ?`).run(...params);
    }
    return this.obtenerPorId(id);
  }

  cambiarEstado(id, estado, respuesta = "") {
    return this.actualizar(id, { estado, respuesta });
  }

  eliminar(id) {
    const bd = obtenerConexion();
    const r = bd.prepare(`DELETE FROM solicitudes WHERE id = ?`).run(id);
    return r.changes > 0;
  }
}

module.exports = SolicitudRepository;