const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Usuario = require("../domain/Usuario");
const UsuarioRepository = require("../repositories/UsuarioRepository");
const CorreoService = require("./CorreoService");

class AuthService {
  #usuarios;
  #correo;

  constructor() {
    this.#usuarios = new UsuarioRepository();
    this.#correo = new CorreoService();
  }

  async login(rut, clave) {
    if (!rut || !clave) throw new Error("Debe ingresar RUT y clave");

    const usuario = await this.#usuarios.obtenerPorRut(rut);
    if (!usuario) throw new Error("Credenciales invalidas");

    const claveValida = bcrypt.compareSync(clave, usuario.claveHash);
    if (!claveValida) throw new Error("Credenciales invalidas");

    if (!usuario.activo) throw new Error("El usuario esta desactivado");

    const token = jwt.sign(
      { sub: usuario.id, rut: usuario.rut, rol: usuario.rol },
      process.env.JWT_SECRET || "daem_clave_super_secreta",
      { expiresIn: "12h" }
    );

    return { token, usuario: this.#limpiarUsuario(usuario) };
  }

  // El repositorio ya devuelve objetos planos (id numerico): solo elimina el
  // hash y asegura `_id` para la respuesta de login del front.
  #limpiarUsuario(usuario) {
    if (!usuario) return usuario;
    const copia = { ...usuario, _id: usuario.id };
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

    const doc = await this.#usuarios.crear({
      ...admin.obtenerResumen(),
      claveHash: bcrypt.hashSync(admin.clave, 10),
    });
    const poblado = await this.#usuarios.obtenerPorId(doc.id);
    return poblado;
  }

  async recuperar(rut) {
    const usuario = await this.#usuarios.obtenerPorRut(rut);
    if (!usuario || !usuario.email) return;
    if (!usuario.activo) return;

    const token = jwt.sign(
      { sub: usuario.id, tipo: "reset", rut: usuario.rut },
      process.env.JWT_SECRET || "daem_clave_super_secreta",
      { expiresIn: "1h" }
    );

    const appUrl = String(process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    const enlace = `${appUrl}/?reset=${encodeURIComponent(token)}`;

    await this.#correo.enviar(
      usuario.email,
      "Recuperacion de clave - DAEM",
      `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:8px">
        <h2 style="margin-top:0">Hola ${usuario.nombre}</h2>
        <p>Recibimos una solicitud para reestablecer tu clave de acceso al sistema DAEM.</p>
        <p>Haz clic en el boton para crear una clave nueva (el enlace es valido por 1 hora):</p>
        <p style="text-align:center">
          <a href="${enlace}" style="display:inline-block;background:#0d6efd;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
            Reestablecer clave
          </a>
        </p>
        <p>Si no fuiste tu, ignora este correo y tu clave seguira igual.</p>
        <p style="color:#888;font-size:12px">Si el boton no funciona, copia este enlace en tu navegador:<br>${enlace}</p>
      </div>`
    );
  }

  async restablecer(token, nuevaClave) {
    if (!token) throw new Error("El enlace de recuperacion es invalido o expiro");
    if (!nuevaClave || nuevaClave.length < 6) {
      throw new Error("La clave debe tener al menos 6 caracteres");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "daem_clave_super_secreta");
    } catch {
      throw new Error("El enlace de recuperacion es invalido o expiro");
    }
    if (!payload || payload.tipo !== "reset") {
      throw new Error("El enlace de recuperacion es invalido o expiro");
    }

    const usuario = await this.#usuarios.obtenerPorId(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new Error("El usuario no existe o esta desactivado");
    }

    await this.#usuarios.actualizar(usuario.id, {
      claveHash: bcrypt.hashSync(nuevaClave, 10),
    });
  }
}

module.exports = AuthService;