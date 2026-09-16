const SeccionRepository = require("../repositories/SeccionRepository");
const ActividadModel = require("../models/actividad.model");
const { AREAS } = require("../constants/catalogos");

class SeccionService {
  #secciones;

  constructor() {
    this.#secciones = new SeccionRepository();
  }

  async crear(datos) {
    const nombre = String(datos.nombre || "").trim();
    if (nombre.length < 3) throw new Error("El nombre de la seccion es obligatorio");
    if (!Object.values(AREAS).includes(datos.area)) {
      throw new Error(`Area invalida. Opciones: ${Object.values(AREAS).join(", ")}`);
    }
    const yaExiste = await this.#secciones.obtenerTodos({});
    for (const s of yaExiste) {
      if (String(s.nombre).toLowerCase() === nombre.toLowerCase()) {
        throw new Error("Ya existe una seccion con ese nombre");
      }
    }
    const doc = await this.#secciones.crear({
      nombre,
      area: datos.area,
      anio: datos.anio || new Date().getFullYear(),
    });
    return this.#secciones.obtenerPorId(doc._id);
  }

  async obtenerTodos() {
    return this.#secciones.obtenerTodos();
  }

  async actualizar(id, datos) {
    const existente = await this.#secciones.obtenerPorId(id);
    if (!existente) throw new Error("Seccion no encontrada");
    const cambio = {};
    if (datos.nombre !== undefined) {
      const nombre = String(datos.nombre).trim();
      if (nombre.length < 3) throw new Error("El nombre de la seccion es obligatorio");
      cambio.nombre = nombre;
    }
    if (datos.area !== undefined && Object.values(AREAS).includes(datos.area)) {
      cambio.area = datos.area;
    }
    return this.#secciones.actualizar(id, cambio);
  }

  async eliminar(id) {
    const usada = await ActividadModel.countDocuments({ seccion: id });
    if (usada > 0) {
      throw new Error("La seccion tiene actividades asociadas; reasignelas antes de eliminar");
    }
    return this.#secciones.eliminar(id);
  }
}

module.exports = SeccionService;