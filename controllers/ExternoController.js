const FeriadosService = require("../services/FeriadosService");
const DirectorioService = require("../services/DirectorioService");

// Expone APIs externas abiertas: feriados de Chile y Directorio MINEDUC.
class ExternoController {
  #feriados;
  #directorio;

  constructor() {
    this.#feriados = new FeriadosService();
    this.#directorio = new DirectorioService();
  }

  async feriados(req, res) {
    try {
      const anio = Number(req.query.anio) || new Date().getFullYear();
      const datos = await this.#feriados.obtenerAnio(anio);
      const proximo = req.query.proximo ? await this.#feriados.proximo() : null;
      res.json({ ...datos, proximo });
    } catch (error) {
      res.status(502).json({ error: `No se pudo consultar la API de feriados: ${error.message}` });
    }
  }

  async esFeriado(req, res) {
    try {
      res.json(await this.#feriados.esFeriado(req.query.fecha));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async directorio(req, res) {
    const q = String(req.query.q || "").trim();
    const rbd = String(req.query.rbd || "").trim();
    try {
      const datos = await this.#directorio.buscar({ q, rbd, limite: req.query.limite });
      res.json(datos);
    } catch (error) {
      res.status(502).json({ error: `No se pudo consultar el Directorio MINEDUC: ${error.message}` });
    }
  }
}

module.exports = ExternoController;
