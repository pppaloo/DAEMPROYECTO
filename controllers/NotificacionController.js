const NotificacionService = require("../services/NotificacionService");

class NotificacionController {
  #service;
  constructor(service) {
    this.#service = service || new NotificacionService();
  }

  async listar(req, res) {
    try {
      const [notificaciones, pendientes] = await Promise.all([
        this.#service.listar(req.usuario._id),
        this.#service.noDescartadas(req.usuario._id),
      ]);
      res.json({ notificaciones, pendientes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async descartar(req, res) {
    try {
      const r = await this.#service.descartar(req.params.id, req.usuario._id);
      res.json(r);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async descartarTodas(req, res) {
    try {
      const r = await this.#service.descartarTodas(req.usuario._id);
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async restaurar(req, res) {
    try {
      const n = await this.#service.restaurar(req.params.id, req.usuario._id);
      res.json(n);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async restaurarTodas(req, res) {
    try {
      const r = await this.#service.restaurarTodas(req.usuario._id);
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = NotificacionController;
