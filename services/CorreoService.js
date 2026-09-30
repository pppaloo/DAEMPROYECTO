const nodemailer = require("nodemailer");

class CorreoService {
  #transporte;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    if (host && user) {
      this.#transporte = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
        auth: { user, pass: process.env.SMTP_PASS || "" },
      });
    } else {
      this.#transporte = null;
    }
  }

  async enviar(destino, asunto, html) {
    if (!destino) return false;
    if (!this.#transporte) {
      console.log("[CorreoService] (sin SMTP configurado) no se envio correo a", destino);
      console.log("[CorreoService] asunto:", asunto);
      console.log("[CorreoService] cuerpo:");
      console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      return false;
    }
    await this.#transporte.sendMail({
      from: process.env.MAIL_FROM || `"DAEM" <${process.env.SMTP_USER}>`,
      to: destino,
      subject: asunto,
      html,
    });
    return true;
  }
}

module.exports = CorreoService;