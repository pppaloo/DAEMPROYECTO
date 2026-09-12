const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../domain/Usuario");
const UsuarioRepository = require("../repositories/UsuarioRepository");

class AuthService {
  #usuarios;

  constructor() {
    this.#usuarios = new UsuarioRepository();
  }

  async login(rut, clave) {
    if (!rut || !clave) throw new Error("Debe ingresar RUT y clave");

    const usuario = await this.#usuarios.obtenerPorRut(rut);
    if (!usuario) throw new Error("Credenciales invalidas");

    const claveValida = bcrypt.compareSync(clave, usuario.claveHash);
    if (!claveValida) throw new Error("Credenciales invalidas");

    if (!usuario.activo) throw new Error("El usuario esta desactivado");

    const token = jwt.sign(
      { sub: usuario._id, rut: usuario.rut, rol: usuario.rol },
      process.env.JWT_SECRET || "daem_clave_super_secreta",
      { expiresIn: "12h" }
    );

    return { token, usuario: this.#limpiarUsuario(usuario) };
  }

  #limpiarUsuario(usuario) {
    if (!usuario) return usuario;
    const copia = { ...usuario };
    delete copia.claveHash;
    if (copia._doc) {
      const limpio = copia._doc.toObject ? copia._doc.toObject() : { ...copia._doc };
      delete limpio.claveHash;
      // Asegura que los campos de nivel superior queden limpios.
      const result = { ...copia, ...limpio };
      delete result._doc;
      delete result.claveHash;
      return result;
    }
    // Respuestas .lean() de Mongoose: elimina el hash a nivel raiz.
    delete copia.claveHash;
    return copia;
  }

  async crearAdmin(rut, nombre, clave) {
    const existente = await this.#usuarios.obtenerPorRut(rut);
    if (existente) return null; // ya existe un admin

    const admin = new Usuario(
      rut,
      nombre || "Administrador DAEM",
      "admin@daem.local",
      "",
      "admin",
      clave || "admin123"
    );

    const doc = await this.#usuarios.crear(admin);
    const poblado = await this.#usuarios.obtenerPorId(doc._id);
    return poblado;
  }
}

module.exports = AuthService;