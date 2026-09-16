const TorneoModel = require("../models/torneo.model");

class TorneoRepository {
  async crear(torneo) {
    const doc = await TorneoModel.create({
      nombre: torneo.nombre,
      actividad: torneo.actividad,
      division: torneo.division,
      formato: torneo.formato || "amistoso",
      anio: torneo.anio,
      semestre: torneo.semestre,
      estado: torneo.estado,
      grupos: torneo.grupos,
      formulario: torneo.formulario,
      requisitos: torneo.requisitos || {},
      fechaAperturaInscripcion: torneo.fechaAperturaInscripcion || null,
      fechaCierreInscripcion: torneo.fechaCierreInscripcion || null,
    });
    return doc;
  }

  async obtenerTodos(filtro = {}) {
    return TorneoModel.find(filtro)
      .populate({ path: "actividad", select: "nombre area divisiones anio" })
      .sort({ anio: -1, semestre: -1 })
      .lean();
  }

  async obtenerPorId(id) {
    return TorneoModel.findById(id)
      .populate({ path: "actividad", select: "nombre area divisiones anio" })
      .lean();
  }

  async actualizar(id, datos) {
    const resultado = await TorneoModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async eliminar(id) {
    const resultado = await TorneoModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = TorneoRepository;