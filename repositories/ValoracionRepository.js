const ValoracionModel = require("../models/valoracion.model");

class ValoracionRepository {
  async crear(valoracion) {
    const doc = await ValoracionModel.create({
      establecimiento: valoracion.establecimiento,
      actividad: valoracion.actividad,
      estado: valoracion.estado,
      anio: valoracion.anio,
      semestre: valoracion.semestre,
    });
    return doc;
  }

  async obtenerTodos(filtro = {}) {
    return ValoracionModel.find(filtro)
      .populate("establecimiento")
      .populate("actividad")
      .sort({ anio: -1, semestre: -1 })
      .lean();
  }

  async buscar(establecimiento, actividad, anio, semestre) {
    return ValoracionModel.findOne({ establecimiento, actividad, anio, semestre }).lean();
  }

  async upsert(valoracion) {
    const filtro = {
      establecimiento: valoracion.establecimiento,
      actividad: valoracion.actividad,
      anio: valoracion.anio,
      semestre: valoracion.semestre,
    };
    const resultado = await ValoracionModel.findOneAndUpdate(
      filtro,
      { estado: valoracion.estado },
      { new: true, upsert: true }
    );
    return resultado ? resultado.toObject() : null;
  }
}

module.exports = ValoracionRepository;