const bcrypt = require("bcryptjs");
const UsuarioModel = require("../models/usuario.model");

class UsuarioRepository {
  async crear(usuario) {
    const doc = await UsuarioModel.create({
      rut: usuario.rut,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      claveHash: bcrypt.hashSync(usuario.clave, 10),
      establecimiento: usuario.establecimiento || null,
      actividades: usuario.actividades || [],
    });
    return doc;
  }

  async obtenerPorRut(rut) {
    return UsuarioModel.findOne({ rut: String(rut).toUpperCase() }).lean();
  }

  async obtenerPorId(id) {
    return UsuarioModel.findById(id)
      .populate("establecimiento")
      .populate("actividades")
      .lean();
  }

  async obtenerTodos(filtro = {}) {
    return UsuarioModel.find(filtro)
      .populate("establecimiento")
      .sort({ nombre: 1 })
      .lean();
  }

  async actualizar(id, datos) {
    return UsuarioModel.findByIdAndUpdate(id, datos, { new: true });
  }

  async cambiarClave(id, claveHash) {
    return UsuarioModel.findByIdAndUpdate(id, { claveHash }, { new: true });
  }

  async eliminar(id) {
    const resultado = await UsuarioModel.findByIdAndDelete(id);
    return !!resultado;
  }
}

module.exports = UsuarioRepository;