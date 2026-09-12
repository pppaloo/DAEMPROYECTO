const AlumnoModel = require("../models/alumno.model");

class AlumnoRepository {
  async crear(alumno) {
    const doc = await AlumnoModel.create({
      rut: alumno.rut,
      nombre: alumno.nombre,
      genero: alumno.genero,
      fechaNacimiento: alumno.fechaNacimiento,
      apoderado: alumno.apoderado,
      email: alumno.email,
      telefono: alumno.telefono,
      establecimiento: alumno.establecimiento,
      actividad: alumno.actividad,
      division: alumno.division,
      inscripcion: alumno.inscripcion,
    });
    return doc;
  }

  async obtenerPorId(id) {
    return AlumnoModel.findById(id)
      .populate("establecimiento")
      .populate("actividad")
      .lean();
  }

  async obtenerTodos(filtro = {}) {
    return AlumnoModel.find(filtro)
      .populate("establecimiento")
      .populate("actividad")
      .sort({ nombre: 1 })
      .lean();
  }

  async buscarPorRutEnActividad(rut, actividad) {
    return AlumnoModel.findOne({ rut, actividad }).lean();
  }

  async actualizar(id, datos) {
    const resultado = await AlumnoModel.findByIdAndUpdate(id, datos, { new: true });
    return resultado ? resultado.toObject() : null;
  }

  async registrarAsistencia(id, encuentroId, presente) {
    const resultado = await AlumnoModel.findByIdAndUpdate(
      id,
      { $push: { asistencia: { encuentro: encuentroId, presente } } },
      { new: true }
    );
    return resultado ? resultado.toObject() : null;
  }

  async eliminar(id) {
    const resultado = await AlumnoModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = AlumnoRepository;