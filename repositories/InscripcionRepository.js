const InscripcionModel = require("../models/inscripcion.model");

class InscripcionRepository {
  async crear(inscripcion) {
    const doc = await InscripcionModel.create({
      establecimiento: inscripcion.establecimiento,
      actividad: inscripcion.actividad,
      division: inscripcion.division,
      estado: inscripcion.estado,
      rutCoordinador: inscripcion.rutCoordinador,
      torneo: inscripcion.torneo || null,
      grupo: inscripcion.grupo || "",
      detalle: inscripcion.detalle || "",
    });
    return doc;
  }

  async obtenerTodos(filtro = {}) {
    return InscripcionModel.find(filtro)
      .populate("establecimiento")
      .populate("actividad")
      .populate("alumnos")
      .sort({ createdAt: -1 })
      .lean();
  }

  async obtenerPorId(id) {
    return InscripcionModel.findById(id)
      .populate("establecimiento")
      .populate("actividad")
      .populate("alumnos")
      .lean();
  }

  async buscar(establecimiento, actividad, division) {
    return InscripcionModel.findOne({ establecimiento, actividad, division }).lean();
  }

  async actualizar(id, datos) {
    const resultado = await InscripcionModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async cambiarEstado(id, estado) {
    return this.actualizar(id, { estado });
  }

  async eliminar(id) {
    const resultado = await InscripcionModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = InscripcionRepository;