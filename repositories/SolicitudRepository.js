const SolicitudModel = require("../models/solicitud.model");

class SolicitudRepository {
  async crear(solicitud) {
    const doc = await SolicitudModel.create({
      tipo: solicitud.tipo,
      detalle: solicitud.detalle,
      estado: solicitud.estado,
      rutEncargado: solicitud.rutEncargado,
      rutCoordinador: solicitud.rutCoordinador,
      actividad: solicitud.actividad || null,
      establecimiento: solicitud.establecimiento || null,
    });
    return doc;
  }

  async obtenerTodos(filtro = {}) {
    return SolicitudModel.find(filtro)
      .populate("actividad")
      .populate("establecimiento")
      .sort({ createdAt: -1 })
      .lean();
  }

  async obtenerPorId(id) {
    return SolicitudModel.findById(id)
      .populate("actividad")
      .populate("establecimiento")
      .lean();
  }

  async actualizar(id, datos) {
    const resultado = await SolicitudModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async cambiarEstado(id, estado, respuesta = "") {
    return this.actualizar(id, { estado, respuesta });
  }

  async eliminar(id) {
    const resultado = await SolicitudModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = SolicitudRepository;