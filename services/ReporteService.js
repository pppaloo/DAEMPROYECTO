const InscripcionModel = require("../models/inscripcion.model");
const AlumnoModel = require("../models/alumno.model");
const EstablecimientoModel = require("../models/establecimiento.model");
const TorneoModel = require("../models/torneo.model");
const PosicionModel = require("../models/posicion.model");
const LlaveModel = require("../models/llave.model");

// Reportes y estadisticas: nomina de establecimientos, participaciones,
// beneficiarios y trazabilidad historica por anio/semestre.
class ReporteService {
  async nomina() {
    return EstablecimientoModel.find().sort({ codigo: 1 }).lean();
  }

  // Total de participaciones por establecimiento.
  async participaciones(filtro = {}) {
    const pipeline = [
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$establecimiento",
          total: { $sum: 1 },
          aceptadas: {
            $sum: { $cond: [{ $eq: ["$estado", "aceptada"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "establecimientos",
          localField: "_id",
          foreignField: "_id",
          as: "est",
        },
      },
      { $unwind: "$est" },
      {
        $project: {
          _id: 1,
          codigo: "$est.codigo",
          nombre: "$est.nombre",
          dependencia: "$est.dependencia",
          total: 1,
          aceptadas: 1,
        },
      },
      { $sort: { total: -1 } },
    ];

    if (filtro.anio) {
      const ini = new Date(`${filtro.anio}-01-01`);
      const fin = new Date(`${Number(filtro.anio) + 1}-01-01`);
      pipeline.unshift({ $match: { createdAt: { $gte: ini, $lt: fin } } });
    }

    return InscripcionModel.aggregate(pipeline);
  }

  // Total de beneficiarios (alumnos inscritos) general y semestral.
  async beneficiarios(filtro = {}) {
    const match = {};
    if (filtro.anio) {
      const ini = new Date(`${filtro.anio}-01-01`);
      const fin = new Date(`${Number(filtro.anio) + 1}-01-01`);
      match.createdAt = { $gte: ini, $lt: fin };
    }

    const total = await AlumnoModel.countDocuments(match);

    // Desglose por semestre del mismo anio.
    const porSemestre = await AlumnoModel.aggregate([
      { $match: match },
      {
        $project: {
          semestre: {
            $cond: [{ $gte: [{ $month: "$createdAt" }, 7] }, 2, 1],
          },
        },
      },
      { $group: { _id: "$semestre", total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const porEstablecimiento = await AlumnoModel.aggregate([
      { $match: match },
      { $group: { _id: "$establecimiento", total: { $sum: 1 } } },
      {
        $lookup: {
          from: "establecimientos",
          localField: "_id",
          foreignField: "_id",
          as: "est",
        },
      },
      { $unwind: "$est" },
      { $project: { _id: 1, nombre: "$est.nombre", codigo: "$est.codigo", total: 1 } },
      { $sort: { total: -1 } },
    ]);

    return {
      total,
      semestres: porSemestre,
      porEstablecimiento,
    };
  }

  // Trazabilidad historica: comparacion anual de participacion.
  async historico() {
    const inscripciones = await InscripcionModel.aggregate([
      {
        $project: {
          anio: { $year: "$createdAt" },
          establecimiento: 1,
        },
      },
      {
        $group: {
          _id: { anio: "$anio", establecimiento: "$establecimiento" },
          inscripciones: { $sum: 1 },
        },
      },
      { $sort: { "_id.anio": -1 } },
    ]);

    const alumnos = await AlumnoModel.aggregate([
      { $project: { anio: { $year: "$createdAt" } } },
      { $group: { _id: "$anio", beneficiarios: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const colegios = await EstablecimientoModel.countDocuments();

    return {
      colegios: { total: colegios },
      porAnio: alumnos.map((a) => ({
        anio: a._id,
        beneficiarios: a.beneficiarios,
      })),
      inscripcionesPorAnio: inscripciones.reduce((acc, fila) => {
        const anio = fila._id.anio;
        if (!acc[anio]) acc[anio] = { anio, establecimientos: [], total: 0 };
        acc[anio].establecimientos.push({
          establecimiento: fila._id.establecimiento,
          inscripciones: fila.inscripciones,
        });
        acc[anio].total += fila.inscripciones;
        return acc;
      }, {}),
    };
  }

  // Resumen de torneos: llaves jugadas y posiciones.
  async torneos(filtro = {}) {
    const torneos = await TorneoModel.find(filtro)
      .populate({ path: "actividad", select: "nombre area" })
      .sort({ anio: -1, semestre: -1 })
      .lean();

    const resumen = [];
    for (const t of torneos) {
      const llaves = await LlaveModel.countDocuments({ torneo: t._id });
      const jugadas = await LlaveModel.countDocuments({ torneo: t._id, estado: "jugado" });
      const posiciones = await PosicionModel.find({ torneo: t._id })
        .populate("establecimiento")
        .sort({ posicion: 1 })
        .lean();
      resumen.push({
        torneo: t.nombre,
        actividad: t.actividad ? t.actividad.nombre : "",
        area: t.actividad ? t.actividad.area : "",
        anio: t.anio,
        semestre: t.semestre,
        estado: t.estado,
        llaves,
        jugadas,
        posiciones: posiciones.map((p) => ({
          posicion: p.posicion,
          establecimiento: p.establecimiento ? p.establecimiento.nombre : "",
        })),
      });
    }
    return resumen;
  }
}

module.exports = ReporteService;