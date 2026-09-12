const EstablecimientoModel = require("../models/establecimiento.model");

class EstablecimientoRepository {
  async crear(establecimiento) {
    const doc = await EstablecimientoModel.create({
      codigo: establecimiento.codigo,
      nombre: establecimiento.nombre,
      dependencia: establecimiento.dependencia,
      direccion: establecimiento.direccion,
      contacto: establecimiento.contacto,
    });
    return doc;
  }

  async obtenerTodos() {
    return EstablecimientoModel.find().sort({ codigo: 1 }).lean();
  }

  async obtenerPorId(id) {
    return EstablecimientoModel.findById(id).lean();
  }

  async obtenerPorCodigo(codigo) {
    return EstablecimientoModel.findOne({ codigo: String(codigo).toUpperCase() }).lean();
  }

  async actualizar(id, datos) {
    const resultado = await EstablecimientoModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async eliminar(id) {
    const resultado = await EstablecimientoModel.findByIdAndDelete(id);
    return !!resultado;
  }

  async contar() {
    return EstablecimientoModel.countDocuments();
  }
}

module.exports = EstablecimientoRepository;