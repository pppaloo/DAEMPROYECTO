const AuthService = require("../services/AuthService");

class AuthController {
  #service;

  constructor() {
    this.#service = new AuthService();
  }

  async login(req, res) {
    try {
      const { rut, clave } = req.body || {};
      if (!rut || !clave) {
        return res.status(400).json({ error: "Debe ingresar RUT y clave" });
      }
      const resultado = await this.#service.login(rut, clave);
      res.json({
        mensaje: "Sesion iniciada correctamente",
        token: resultado.token,
        usuario: resultado.usuario.obtenerPublico ? resultado.usuario.obtenerPublico() : resultado.usuario,
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async perfil(req, res) {
    try {
      const usuario = req.usuario;
      const publico = usuario.obtenerPublico ? usuario.obtenerPublico() : usuario;
      res.json(publico);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async recuperar(req, res) {
    try {
      const { rut } = req.body || {};
      if (!rut) return res.status(400).json({ error: "Debe ingresar su RUT" });
      await this.#service.recuperar(rut.trim());
      res.json({ mensaje: "Si el RUT esta registrado, se envio un correo con instrucciones." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async restablecer(req, res) {
    try {
      const { token, nuevaClave } = req.body || {};
      await this.#service.restablecer(token, nuevaClave);
      res.json({ mensaje: "Clave reestablecida correctamente. Ya puede iniciar sesion." });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = AuthController;