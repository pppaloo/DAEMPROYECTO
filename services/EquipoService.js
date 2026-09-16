const Equipo = require("../domain/Equipo");
const EquipoRepository = require("../repositories/EquipoRepository");
const InscripcionModel = require("../models/inscripcion.model");
const TorneoModel = require("../models/torneo.model");
const AlumnoModel = require("../models/alumno.model");

// Gestiona los equipos de un torneo. Un equipo agrupa estudiantes de
// distintos establecimientos: se puede armar por sorteo automatico
// (distribuye la nomina de inscritos) o manualmente.
class EquipoService {
  #equipos;

  constructor() {
    this.#equipos = new EquipoRepository();
  }

  // Pool de estudiantes disponibles: los de inscripciones aceptadas del
  // torneo que aun no estan asignados a ningun equipo.
  async obtenerPool(torneoId) {
    const inscripciones = await InscripcionModel.find({
      torneo: torneoId,
      estado: "aceptada",
    })
      .populate("alumnos")
      .lean();

    const asignados = await this.#equipos.obtenerPorTorneo(torneoId);
    const usados = new Set();
    asignados.forEach((e) => (e.alumnos || []).forEach((a) => usados.add(String(a._id))));

    const alumnos = [];
    const vistos = new Set();
    for (const insc of inscripciones) {
      for (const a of insc.alumnos || []) {
        const id = String(a._id);
        if (vistos.has(id) || usados.has(id)) continue;
        vistos.add(id);
        alumnos.push(a);
      }
    }

    return this.#enriquecerConEstablecimiento(alumnos);
  }

  async #enriquecerConEstablecimiento(alumnos) {
    const ids = alumnos.map((a) => a._id);
    const ricos = ids.length
      ? await AlumnoModel.find({ _id: { $in: ids } })
          .populate("establecimiento")
          .lean()
      : [];
    const porId = {};
    ricos.forEach((a) => { porId[String(a._id)] = a; });
    return alumnos.map((a) => porId[String(a._id)] || a);
  }

  // Distribuye automaticamente a los inscritos en N equipos balanceados.
  async sortear(torneoId, { cantidad }) {
    const torneo = await TorneoModel.findById(torneoId).lean();
    if (!torneo) throw new Error("Torneo no encontrado");
    const pool = await this.obtenerPool(torneoId);
    if (pool.length < 2) {
      throw new Error(
        "Necesita al menos 2 estudiantes inscritos (sin equipo) para sortear equipos"
      );
    }

    const n = Math.max(2, parseInt(cantidad, 10) || 2);
    if (n > pool.length) {
      throw new Error(`No puede crear ${n} equipos con solo ${pool.length} estudiantes`);
    }

    // Orden alfabetico: los equipos no llevan numeros, se nombran con una
    // letra del abecedario (Equipo A, Equipo B, ...).
    const base = pool.slice().sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
    const torque = Array.from({ length: n }, (_, i) => ({
      torneo: torneoId,
      nombre: `Equipo ${String.fromCharCode(65 + i)}`,
      alumnos: [],
    }));
    base.forEach((a, idx) => torque[idx % n].alumnos.push(a._id));

    await this.#eliminarPorTorneo(torneoId);
    const creados = [];
    for (const t of torque) creados.push(await this.#equipos.crear(t));
    return this.#equipos.obtenerPorTorneo(torneoId);
  }

  // Crea un equipo manual con estudiantes seleccionados del pool.
  async crear(torneoId, { nombre, alumnos = [] }) {
    const torneo = await TorneoModel.findById(torneoId).lean();
    if (!torneo) throw new Error("Torneo no encontrado");
    const pool = await this.obtenerPool(torneoId);
    const disponibles = new Set(pool.map((a) => String(a._id)));
    const ids = (Array.isArray(alumnos) ? alumnos : [])
      .filter((id) => id && disponibles.has(String(id)))
      .map((id) => String(id));

    if (!ids.length) throw new Error("Seleccione al menos 1 estudiante disponible");

    const equipo = new Equipo(torneoId, nombre, ids);
    const doc = await this.#equipos.crear(equipo.obtenerResumen());
    return this.#equipos.obtenerPorId(doc._id);
  }

  async listar(torneoId) {
    return this.#equipos.obtenerPorTorneo(torneoId);
  }

  async eliminar(torneoId, equipoId) {
    const equipo = await this.#equipos.obtenerPorId(equipoId);
    if (!equipo || String(equipo.torneo?._id || equipo.torneo) !== String(torneoId)) {
      throw new Error("Equipo no encontrado en este torneo");
    }
    return this.#equipos.eliminar(equipoId);
  }

  async #eliminarPorTorneo(torneoId) {
    return this.#equipos.eliminarPorTorneo(torneoId);
  }
}

module.exports = EquipoService;