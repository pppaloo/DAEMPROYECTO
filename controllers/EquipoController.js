const EquipoService = require("../services/EquipoService");

class EquipoController {
  #service;

  constructor() {
    this.#service = new EquipoService();
  }

  async listar(req, res) {
    try {
      const equipos = await this.#service.listar(req.params.id);
      res.json(equipos);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async pool(req, res) {
    try {
      const pool = await this.#service.obtenerPool(req.params.id);
      res.json({ pool, total: pool.length });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async sortear(req, res) {
    try {
      const resultado = await this.#service.sortear(req.params.id, req.body || {});
      res.json({
        mensaje: `Equipos sorteado correctamente (${resultado.totalEquipos} equipos de ${resultado.porEquipo} jugadores${resultado.sobrantes ? `, ${resultado.sobrantes} sin equipo` : ""})`,
        equipos: resultado.equipos,
        totalEquipos: resultado.totalEquipos,
        porEquipo: resultado.porEquipo,
        sobrantes: resultado.sobrantes,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async crear(req, res) {
    try {
      const equipo = await this.#service.crear(req.params.id, req.body || {});
      res.status(201).json({ mensaje: "Equipo creado", equipo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async eliminar(req, res) {
    try {
      const eliminado = await this.#service.eliminar(req.params.id, req.params.equipoId);
      if (!eliminado) return res.status(404).json({ error: "Equipo no encontrado" });
      res.json({ mensaje: "Equipo eliminado" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async actualizar(req, res) {
    try {
      const equipo = await this.#service.actualizar(req.params.id, req.params.equipoId, req.body || {});
      res.json({ mensaje: "Equipo actualizado", equipo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = EquipoController;