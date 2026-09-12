const ActividadModel = require("../models/actividad.model");

class ActividadRepository {
  async crear(actividad) {
    const doc = await ActividadModel.create({
      nombre: actividad.nombre,
      area: actividad.area,
      divisiones: actividad.divisiones,
      anio: actividad.anio,
      estado: actividad.estado,
      fechaAperturaInscripcion: actividad.fechaAperturaInscripcion,
      fechaCierreInscripcion: actividad.fechaCierreInscripcion,
      edadMinima: actividad.edadMinima,
      edadMaxima: actividad.edadMaxima,
      recintos: actividad.recintos,
      limiteInscritos: actividad.limiteInscritos || 0,
      encuentros: actividad.encuentros,
    });
    return doc;
  }

  async obtenerTodos(filtro = {}) {
    return ActividadModel.find(filtro).sort({ anio: -1, nombre: 1 }).lean();
  }

  async obtenerPorId(id) {
    return ActividadModel.findById(id).lean();
  }

  async actualizar(id, datos) {
    const resultado = await ActividadModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async agregarEncuentro(id, encuentro) {
    const resultado = await ActividadModel.findByIdAndUpdate(
      id,
      { $push: { encuentros: encuentro } },
      { new: true }
    );
    return resultado ? resultado.toObject() : null;
  }

  async eliminar(id) {
    const resultado = await ActividadModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = ActividadRepository;