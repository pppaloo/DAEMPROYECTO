const Usuario = require("../domain/Usuario");
const UsuarioRepository = require("../repositories/UsuarioRepository");

class UsuarioService {
  #usuarios;

  constructor() {
    this.#usuarios = new UsuarioRepository();
  }

  async crearUsuario(datos, usuarioLogueado) {
    // Admin: puede crear coordinadores/encargados.
    // Coordinador: crea encargados de SU establecimiento.
    if (usuarioLogueado.rol === "admin") {
      if (datos.rol === "encargado" && !datos.establecimiento) {
        throw new Error("Un encargado debe tener un establecimiento asignado");
      }
    } else if (usuarioLogueado.rol === "coordinador") {
      if (datos.rol !== "encargado") {
        throw new Error("El coordinador solo puede crear perfiles de Encargado");
      }
      const propio = usuarioLogueado.establecimiento?._id;
      if (!datos.establecimiento || String(datos.establecimiento) !== String(propio)) {
        throw new Error("El encargado debe asignarse al establecimiento del coordinador");
      }
    } else {
      throw new Error("No tiene permisos para crear usuarios");
    }

    const usuario = new Usuario(
      datos.rut,
      datos.nombre,
      datos.email,
      datos.telefono,
      datos.rol,
      datos.clave,
      datos.establecimiento || null
    );
    if (usuario.rol === "coordinador" && !datos.establecimiento) {
      throw new Error("Un coordinador debe tener un establecimiento asignado");
    }

    const doc = await this.#usuarios.crear(usuario);
    if (datos.actividades) {
      const lista = Array.isArray(datos.actividades) ? datos.actividades : [datos.actividades];
      await this.#usuarios.actualizar(doc._id, { actividades: lista });
    }
    return this.#usuarios.obtenerPorId(doc._id);
  }

  async obtenerTodos(usuarioLogueado) {
    const filtro = {};
    if (usuarioLogueado.rol === "coordinador") {
      filtro.rol = "encargado";
      filtro.establecimiento = usuarioLogueado.establecimiento?._id;
    }
    return this.#usuarios.obtenerTodos(filtro);
  }

  async obtenerPorId(id) {
    return this.#usuarios.obtenerPorId(id);
  }

  async actualizar(id, datos, usuarioLogueado) {
    const existente = await this.#usuarios.obtenerPorId(id);
    if (!existente) throw new Error("Usuario no encontrado");

    if (usuarioLogueado.rol === "coordinador") {
      if (existente.rol !== "encargado") {
        throw new Error("El coordinador solo administra a sus Encargados");
      }
      if (String(existente.establecimiento?._id) !== String(usuarioLogueado.establecimiento?._id)) {
        throw new Error("El Encargado no pertenece a su establecimiento");
      }
    }

    // Valida con la clase de dominio (POO) los campos sensibles.
    if (datos.rut || datos.nombre || datos.rol) {
      new Usuario(
        datos.rut || existente.rut,
        datos.nombre || existente.nombre,
        datos.email || existente.email,
        datos.telefono || existente.telefono,
        datos.rol || existente.rol,
        "XXXXXXXXXX" // placeholder, no se envia clave al actualizar perfil
      );
    }

    const actualizar = {};
    if (datos.nombre) actualizar.nombre = datos.nombre;
    if (datos.email !== undefined) actualizar.email = datos.email;
    if (datos.telefono !== undefined) actualizar.telefono = datos.telefono;
    if (datos.rol) actualizar.rol = datos.rol;
    if (datos.establecimiento !== undefined) actualizar.establecimiento = datos.establecimiento;
    if (datos.actividades !== undefined) actualizar.actividades = datos.actividades;
    if (datos.activo !== undefined) actualizar.activo = datos.activo;

    await this.#usuarios.actualizar(id, actualizar);
    return this.#usuarios.obtenerPorId(id);
  }

  async asignarActividades(id, actividades, usuarioLogueado) {
    const existente = await this.#usuarios.obtenerPorId(id);
    if (!existente) throw new Error("Usuario no encontrado");
    if (existente.rol !== "encargado") {
      throw new Error("Solo se pueden asignar actividades a un encargado");
    }
    if (usuarioLogueado.rol === "coordinador") {
      if (String(existente.establecimiento?._id) !== String(usuarioLogueado.establecimiento?._id)) {
        throw new Error("El Encargado no pertenece a su establecimiento");
      }
    }
    const lista = Array.isArray(actividades) ? actividades : [actividades];
    await this.#usuarios.actualizar(id, { actividades: lista });
    return this.#usuarios.obtenerPorId(id);
  }

  async eliminar(id, usuarioLogueado) {
    const existente = await this.#usuarios.obtenerPorId(id);
    if (!existente) throw new Error("Usuario no encontrado");
    if (usuarioLogueado.rol === "coordinador") {
      if (existente.rol !== "encargado") {
        throw new Error("El coordinador solo administra a sus Encargados");
      }
      if (String(existente.establecimiento?._id) !== String(usuarioLogueado.establecimiento?._id)) {
        throw new Error("El Encargado no pertenece a su establecimiento");
      }
    }
    return this.#usuarios.eliminar(id);
  }
}

module.exports = UsuarioService;