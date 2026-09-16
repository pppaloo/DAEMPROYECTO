const EquipoModel = require("../models/equipo.model");

class EquipoRepository {
  async crear(datos) {
    const doc = await EquipoModel.create(datos);
    return doc;
  }

  async obtenerPorTorneo(torneoId) {
    return EquipoModel.find({ torneo: torneoId })
      .populate({ path: "alumnos", populate: { path: "establecimiento", model: "Establecimiento" } })
      .sort({ nombre: 1 })
      .lean();
  }

  async obtenerPorId(id) {
    return EquipoModel.findById(id)
      .populate({ path: "alumnos", populate: { path: "establecimiento", model: "Establecimiento" } })
      .lean();
  }

  async eliminar(id) {
    const resultado = await EquipoModel.findByIdAndDelete(id);
    return !!resultado;
  }

  async eliminarPorTorneo(torneoId) {
    return EquipoModel.deleteMany({ torneo: torneoId });
  }
}

module.exports = EquipoRepository;