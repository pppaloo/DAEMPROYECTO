const LlaveModel = require("../models/llave.model");

class LlaveRepository {
  async crear(llave) {
    const doc = await LlaveModel.create(llave);
    return doc;
  }

  async crearMuchas(llaves) {
    return LlaveModel.insertMany(llaves);
  }

  async obtenerTodos(filtro = {}) {
    return LlaveModel.find(filtro)
      .populate({ path: "torneo", populate: { path: "actividad" } })
      .populate("equipos")
      .populate("ganador")
      .sort({ nivel: 1, orden: 1, createdAt: 1 })
      .lean();
  }

  async obtenerPorId(id) {
    return LlaveModel.findById(id)
      .populate({ path: "torneo", populate: { path: "actividad" } })
      .populate("equipos")
      .populate("ganador")
      .lean();
  }

  async actualizar(id, datos) {
    const resultado = await LlaveModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async registrarResultado(id, { puntajeA, puntajeB, ganador }) {
    const datos = { puntajeA, puntajeB, ganador, estado: "jugado" };
    const resultado = await LlaveModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async eliminarPorTorneo(torneoId) {
    return LlaveModel.deleteMany({ torneo: torneoId });
  }
}

module.exports = LlaveRepository;