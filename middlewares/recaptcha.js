const { verificar } = require("../services/RecaptchaService");

// UMBRAL de score reCAPTCHA v3 (0.0-1.0): por debajo se rechaza.
const UMBRAL = Number(process.env.RECAPTCHA_UMBRAL || 0.5);

// Middleware de reCAPTCHA v3 para peticiones de escritura (/api).
// - Sin RECAPTCHA_SECRET_KEY configurada -> se omite (modo desarrollo).
// - GET/HEAD/OPTIONS -> se omiten.
// - El token llega por cabecera "x-recaptcha-token" (o "recaptchaToken" en el body).
function verificarRecaptcha(req, res, next) {
  const metodo = String(req.method || "").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(metodo)) return next();

  const secreto = process.env.RECAPTCHA_SECRET_KEY;
  if (!secreto) return next();

  const token =
    req.header("x-recaptcha-token") || (req.body && req.body.recaptchaToken);
  if (!token) {
    return res.status(403).json({ error: "Verificacion de captcha requerida" });
  }

  const ip = req.ip || (req.socket && req.socket.remoteAddress) || "";
  verificar(token, secreto, ip)
    .then((resultado) => {
      if (!resultado || resultado.success !== true) {
        return res.status(403).json({ error: "Token de captcha invalido" });
      }
      if ((resultado.score || 0) < UMBRAL) {
        return res
          .status(403)
          .json({ error: "No se pudo confirmar que eres humano. Intenta de nuevo." });
      }
      next();
    })
    .catch(() =>
      res.status(500).json({ error: "No se pudo verificar el captcha. Intenta de nuevo." })
    );
}

module.exports = verificarRecaptcha;