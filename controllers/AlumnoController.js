const AlumnoRepository = require("../repositories/AlumnoRepository");
const InscripcionModel = require("../models/inscripcion.model");

// Gestion del Encargado sobre sus alumnos y el registro de asistencia.
class AlumnoController {
  #alumnos;

  constructor() {
    this.#alumnos = new AlumnoRepository();
  }

  // Lista los alumnos de las actividades asignadas al encargado.
  async obtenerMios(req, res) {
    try {
      const actividades = (req.usuario.actividades || []).map((a) => a._id || a);
      const filtro = actividades.length ? { actividad: { $in: actividades } } : { actividad: null };
      const alumnos = await this.#alumnos.obtenerTodos(filtro);
      res.json(alumnos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Agenda del encargado: calendario de las actividades que ejecuta.
  async agenda(req, res) {
    try {
      const actividades = (req.usuario.actividades || []).map((a) => a._id || a);
      const inscripciones = await InscripcionModel.find(
        actividades.length ? { actividad: { $in: actividades } } : { actividad: null }
      )
        .populate("establecimiento")
        .populate("actividad")
        .lean();

      const encuentros = [];
      for (const insc of inscripciones) {
        if (!insc.actividad || !insc.actividad.encuentros) continue;
        for (const e of insc.actividad.encuentros) {
          encuentros.push({
            encuentro: e,
            actividad: insc.actividad.nombre,
            area: insc.actividad.area,
            division: insc.division,
            establecimiento: insc.establecimiento ? insc.establecimiento.nombre : "",
            lugar: e.lugar,
          });
        }
      }

      // Agenda general: tambien los encuentros de otras actividades publicas.
      const ActividadModel = require("../models/actividad.model");
      const todas = await ActividadModel.find({}).lean();

      encuentros.sort((a, b) => new Date(a.encuentro.fecha) - new Date(b.encuentro.fecha));
      res.json({
        mios: encuentros,
        actividadesPublicas: todas.map((t) => ({
          id: t._id,
          nombre: t.nombre,
          area: t.area,
          encuentros: t.encuentros,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Registra asistencia de un alumno a un encuentro de su actividad.
  async registrarAsistencia(req, res) {
    try {
      const { presente } = req.body;
      const alumno = await this.#alumnos.obtenerPorId(req.params.id);
      if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });

      const permitidas = (req.usuario.actividades || []).map((a) => a._id || a);
      if (req.usuario.rol !== "admin" && !permitidas.some((a) => String(a) === String(alumno.actividad._id))) {
        return res.status(403).json({ error: "La actividad del alumno no esta asignada a usted" });
      }

      const actualizado = await this.#alumnos.registrarAsistencia(
        alumno._id,
        req.params.encuentroId,
        presente !== false
      );
      res.json({ mensaje: "Asistencia registrada", alumno: actualizado });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = AlumnoController;