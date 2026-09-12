const Solicitud = require("../domain/Solicitud");
const SolicitudRepository = require("../repositories/SolicitudRepository");

class SolicitudService {
  #solicitudes;

  constructor() {
    this.#solicitudes = new SolicitudRepository();
  }

  // El encargado levanta una solicitud (recursos/participacion) a su coordinador.
  async crear(datos, usuario) {
    if (usuario.rol !== "encargado") {
      throw new Error("Solo un Encargado puede levantar solicitudes internas");
    }
    const rutCoordinador = datos.rutCoordinador || "";
    const solicitud = new Solicitud(
      datos.tipo,
      datos.detalle,
      usuario.rut,
      rutCoordinador,
      datos.actividad || null
    );

    const doc = await this.#solicitudes.crear({
      ...solicitud.obtenerResumen(),
      establecimiento: usuario.establecimiento?._id || null,
    });

    return this.#solicitudes.obtenerPorId(doc._id);
  }

  // Encargado ve las suyas; coordinador ve las de su establecimiento.
  async obtenerTodos(usuario) {
    if (usuario.rol === "encargado") {
      return this.#solicitudes.obtenerTodos({ rutEncargado: usuario.rut });
    }
    if (usuario.rol === "coordinador") {
      return this.#solicitudes.obtenerTodos({
        establecimiento: usuario.establecimiento?._id,
      });
    }
    return this.#solicitudes.obtenerTodos();
  }

  // El coordinador aprueba o rechaza la solicitud de su encargado.
  async cambiarEstado(id, estado, respuesta, usuario) {
    if (usuario.rol !== "coordinador") {
      throw new Error("Solo el Coordinador puede responder solicitudes internas");
    }
    if (!["aprobada", "rechazada"].includes(estado)) {
      throw new Error("Estado invalido: use aprobada/rechazada");
    }
    const solicitud = await this.#solicitudes.obtenerPorId(id);
    if (!solicitud) throw new Error("Solicitud no encontrada");
    if (String(solicitud.establecimiento?._id) !== String(usuario.establecimiento?._id)) {
      throw new Error("La solicitud no pertenece a su establecimiento");
    }
    return this.#solicitudes.cambiarEstado(id, estado, respuesta || "");
  }

  async eliminar(id, usuario) {
    const solicitud = await this.#solicitudes.obtenerPorId(id);
    if (!solicitud) throw new Error("Solicitud no encontrada");
    if (usuario.rol === "encargado" && solicitud.rutEncargado !== usuario.rut) {
      throw new Error("Solo el autor puede eliminar la solicitud");
    }
    if (solicitud.estado !== "en_proceso") {
      throw new Error("No se puede eliminar una solicitud ya respondida");
    }
    return this.#solicitudes.eliminar(id);
  }
}

module.exports = SolicitudService;