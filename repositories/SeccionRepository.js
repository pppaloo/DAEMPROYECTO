const SeccionModel = require("../models/seccion.model");

class SeccionRepository {
  async crear(seccion) {
    const doc = await SeccionModel.create({
      nombre: seccion.nombre,
      area: seccion.area,
      anio: seccion.anio,
    });
    return doc;
  }

  async obtenerTodos(filtro = {}) {
    return SeccionModel.find(filtro).sort({ area: 1, nombre: 1 }).lean();
  }

  async obtenerPorId(id) {
    return SeccionModel.findById(id).lean();
  }

  async actualizar(id, datos) {
    const resultado = await SeccionModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async eliminar(id) {
    const resultado = await SeccionModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = SeccionRepository;