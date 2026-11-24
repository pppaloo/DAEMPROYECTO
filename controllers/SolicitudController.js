const SolicitudService = require("../services/SolicitudService");

class SolicitudController {
  #service;

  constructor() {
    this.#service = new SolicitudService();
  }

  async obtenerTodos(req, res) {
    try {
      const solicitudes = await this.#service.obtenerTodos(req.usuario);
      res.json(solicitudes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async crearEstudiante(req, res) {
    try {
      const solicitud = await this.#service.crearSolicitudEstudiante(req.body, req.usuario);
      res.status(201).json({
        mensaje: "Solicitud enviada al Admin DAEM para su aprobacion",
        solicitud,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async extraerNomina(req, res) {
    try {
      const resultado = await this.#service.extraerNominaPdf(req.body, req.usuario);
      res.json(resultado);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async descargarArchivo(req, res) {
    try {
      const { archivoNombre, buffer } = await this.#service.obtenerArchivo(req.params.id, req.usuario);
      const disp = req.query.inline === "1" ? "inline" : "attachment";
      const nombreSeguro = String(archivoNombre || "nomina.pdf").replace(/["\r\n]/g, "_");
      const low = nombreSeguro.toLowerCase();
      let mime = "application/pdf";
      if (low.endsWith(".xlsx")) mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      else if (low.endsWith(".xls")) mime = "application/vnd.ms-excel";
      else if (low.endsWith(".csv")) mime = "text/csv; charset=utf-8";
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `${disp}; filename="${nombreSeguro}"`);
      res.send(buffer);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async cambiarEstado(req, res) {
    try {
      const solicitud = await this.#service.cambiarEstado(
        req.params.id,
        req.body.estado,
        req.body.respuesta,
        req.usuario
      );
      res.json({ mensaje: `Solicitud ${req.body.estado}`, solicitud });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminar(req, res) {
    try {
      const eliminado = await this.#service.eliminar(req.params.id, req.usuario);
      if (!eliminado) return res.status(404).json({ error: "Solicitud no encontrada" });
      res.json({ mensaje: "Solicitud eliminada" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = SolicitudController;