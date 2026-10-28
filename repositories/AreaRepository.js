const { obtenerConexion } = require("../db/conexion");
const { aplanar, nowISO } = require("../db/util");

class AreaRepository {
  crear(nombre) {
    const bd = obtenerConexion();
    const r = bd
      .prepare(`INSERT INTO areas (nombre) VALUES (?)`)
      .run(nombre);
    return this.obtenerPorId(r.lastInsertRowid);
  }

  obtenerTodos() {
    const bd = obtenerConexion();
    return bd
      .prepare(`SELECT * FROM areas ORDER BY nombre COLLATE NOCASE`)
      .all()
      .map((f) => aplanar("areas", f));
  }

  obtenerPorNombre(nombre) {
    const bd = obtenerConexion();
    const fila = bd.prepare(`SELECT * FROM areas WHERE nombre = ? COLLATE NOCASE`).get(nombre);
    return fila ? aplanar("areas", fila) : null;
  }

  obtenerPorId(id) {
    const bd = obtenerConexion();
    const fila = bd.prepare(`SELECT * FROM areas WHERE id = ?`).get(id);
    return fila ? aplanar("areas", fila) : null;
  }

  // Areas en uso por actividades o secciones (para no perderlas del catalogo).
  obtenerAreasEnUso() {
    const bd = obtenerConexion();
    const filas = bd
      .prepare(`SELECT DISTINCT area AS nombre FROM actividades UNION SELECT DISTINCT area AS nombre FROM secciones`)
      .all();
    return filas.map((f) => f.nombre).filter(Boolean);
  }

  actualizar(id, datos) {
    const bd = obtenerConexion();
    const campos = [];
    const params = [];
    if (datos.nombre !== undefined) {
      campos.push("nombre = ?");
      params.push(datos.nombre);
    }
    if (!campos.length) return this.obtenerPorId(id);
    campos.push(`updatedAt = ?`);
    params.push(nowISO());
    params.push(id);
    bd.prepare(`UPDATE areas SET ${campos.join(", ")} WHERE id = ?`).run(...params);
    return this.obtenerPorId(id);
  }

  eliminar(id) {
    const bd = obtenerConexion();
    const r = bd.prepare(`DELETE FROM areas WHERE id = ?`).run(id);
    return r.changes > 0;
  }
}

module.exports = AreaRepository;