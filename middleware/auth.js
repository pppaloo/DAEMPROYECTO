const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model");

// Verifica el token JWT y adjunta el usuario autenticado al request.
async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ mensaje: "Token no proporcionado" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "daem_clave_super_secreta");

    const usuario = await Usuario.findById(payload.sub)
      .populate("establecimiento")
      .populate("actividades");

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ mensaje: "Usuario no valido o desactivado" });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: `No autorizado: ${err.message}` });
  }
}

module.exports = autenticar;