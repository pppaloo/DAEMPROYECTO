const TorneoService = require("../services/TorneoService");

class TorneoController {
  #service;

  constructor() {
    this.#service = new TorneoService();
  }

  async crear(req, res) {
    try {
      const torneo = await this.#service.crear(req.body);
      res.status(201).json({ mensaje: "Torneo creado", torneo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerTodos(req, res) {
    try {
      const filtro = {};
      if (req.query.actividad) filtro.actividad = req.query.actividad;
      if (req.query.estado) filtro.estado = req.query.estado;
      const torneos = await this.#service.obtenerTodos(filtro);
      res.json(torneos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async obtenerPorId(req, res) {
    try {
      const torneo = await this.#service.obtenerPorId(req.params.id);
      if (!torneo) return res.status(404).json({ error: "Torneo no encontrado" });
      res.json(torneo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async actualizar(req, res) {
    try {
      const torneo = await this.#service.actualizar(req.params.id, req.body);
      if (!torneo) return res.status(404).json({ error: "Torneo no encontrado" });
      res.json({ mensaje: "Torneo actualizado", torneo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Sorteo y emparejamiento de contrincantes.
  async ejecutarSorteo(req, res) {
    try {
      const resultado = await this.#service.ejecutarSorteo(req.params.id);
      res.json({ mensaje: "Sorteo ejecutado", ...resultado });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerLlaves(req, res) {
    try {
      const llaves = await this.#service.obtenerLlaves(req.params.id);
      res.json(llaves);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async obtenerAgenda(req, res) {
    try {
      const agenda = await this.#service.obtenerAgenda();
      res.json(agenda);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async actualizarLlave(req, res) {
    try {
      const llave = await this.#service.actualizarLlave(req.params.llaveId, req.body);
      res.json({ mensaje: "Llave actualizada", llave });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async registrarResultado(req, res) {
    try {
      const llave = await this.#service.registrarResultado(req.params.llaveId, req.body);
      res.json({ mensaje: "Resultado registrado", llave });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async registrarPosiciones(req, res) {
    try {
      const posiciones = await this.#service.registrarPosiciones(req.params.id, req.body.posiciones || []);
      res.json({ mensaje: "Posiciones registradas", posiciones });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async obtenerPosiciones(req, res) {
    try {
      const posiciones = await this.#service.obtenerPosiciones(req.params.id);
      res.json(posiciones);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async eliminar(req, res) {
    try {
      const eliminado = await this.#service.eliminar(req.params.id);
      if (!eliminado) return res.status(404).json({ error: "Torneo no encontrado" });
      res.json({ mensaje: "Torneo eliminado" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TorneoController;