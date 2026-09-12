const Sorteo = require("../domain/Sorteo");
const Valoracion = require("../domain/Valoracion");
const Torneo = require("../domain/Torneo");
const TorneoRepository = require("../repositories/TorneoRepository");
const LlaveRepository = require("../repositories/LlaveRepository");
const ValoracionRepository = require("../repositories/ValoracionRepository");
const PosicionRepository = require("../repositories/PosicionRepository");
const InscripcionModel = require("../models/inscripcion.model");

class TorneoService {
  #torneos;
  #llaves;
  #valoraciones;
  #posiciones;

  constructor() {
    this.#torneos = new TorneoRepository();
    this.#llaves = new LlaveRepository();
    this.#valoraciones = new ValoracionRepository();
    this.#posiciones = new PosicionRepository();
  }

  async crear(datos) {
    const torneo = new Torneo(
      datos.nombre,
      datos.actividad,
      datos.anio,
      datos.semestre,
      datos.estado,
      datos.grupos,
      datos.formulario
    );
    const doc = await this.#torneos.crear(torneo);
    return this.#torneos.obtenerPorId(doc._id);
  }

  async obtenerTodos(filtro = {}) {
    return this.#torneos.obtenerTodos(filtro);
  }

  async obtenerPorId(id) {
    return this.#torneos.obtenerPorId(id);
  }

  async actualizar(id, datos) {
    const existente = await this.#torneos.obtenerPorId(id);
    if (!existente) throw new Error("Torneo no encontrado");

    const actualizar = {};
    if (datos.nombre) actualizar.nombre = datos.nombre;
    if (datos.estado) actualizar.estado = datos.estado;
    if (datos.grupos) actualizar.grupos = datos.grupos;
    if (datos.formulario !== undefined) actualizar.formulario = datos.formulario;

    return this.#torneos.actualizar(id, actualizar);
  }

  // Empuja el ganador de una llave hacia la llave de la siguiente ronda.
  async #avanzar(ganadorId, padreId) {
    if (!ganadorId || !padreId) return;
    const padre = await this.#llaves.obtenerPorId(padreId);
    if (!padre) return;
    const ids = (padre.equipos || []).map((e) => String((e && e._id) || e));
    if (!ids.includes(String(ganadorId))) {
      const nuevos = [...ids, String(ganadorId)];
      await this.#llaves.actualizar(padreId, { equipos: nuevos });
    }
  }

  // ============================================================
  // Sorteo: genera el bracket completo del torneo (varias rondas).
  // Nivela las llaves de la primera ronda por valor de cumplimiento;
  // el ganador de cada llave avanza automaticamente a la siguiente.
  // ============================================================
  async ejecutarSorteo(torneoId) {
    const torneo = await this.#torneos.obtenerPorId(torneoId);
    if (!torneo) throw new Error("Torneo no encontrado");

    const inscripciones = await InscripcionModel.find({
      torneo: torneoId,
      estado: "aceptada",
    })
      .populate("establecimiento")
      .lean();

    if (inscripciones.length < 2) {
      throw new Error("Se necesitan al menos 2 inscripciones aceptadas en el torneo");
    }

    const pisoAnio = torneo.anio;

    // Arma la lista de participantes agregando su valor de cumplimiento.
    const participantes = [];
    for (const insc of inscripciones) {
      if (!insc.establecimiento) continue; // Sin establecimiento valido: se omite.
      const valoracion = await this.#valoraciones.buscar(
        insc.establecimiento._id,
        insc.actividad,
        pisoAnio,
        torneo.semestre
      );
      const estado = valoracion ? valoracion.estado : "regular";
      participantes.push({
        establecimiento: insc.establecimiento._id,
        division: insc.division,
        estado,
        valor: Valoracion.valorNumerico(estado),
      });
    }

    if (participantes.length < 2) {
      throw new Error("Se necesitan al menos 2 inscripciones aceptadas con establecimiento valido");
    }

    const sorteo = new Sorteo(participantes, torneo.grupos);
    const ronda1 = sorteo.construirLlaves();
    const totalRondas = Sorteo.nivelesNecesarios(inscripciones.length);

    // Regenera las llaves del torneo (sorteo nuevo).
    await this.#llaves.eliminarPorTorneo(torneoId);

    // ---- Ronda 1 con los emparejamientos reales ----
    const docsR1 = await this.#llaves.crearMuchas(
      ronda1.map((l, idx) => ({
        torneo: torneoId,
        actividad: torneo.actividad._id,
        division: l.division,
        grupo: l.grupo,
        equipos: l.equipos.filter(Boolean),
        bye: l.bye,
        estado: "pendiente",
        nivel: 1,
        orden: idx,
      }))
    );

    let rondaAnterior = docsR1;
    for (let nivel = 2; nivel <= totalRondas; nivel++) {
      const count = Math.ceil(rondaAnterior.length / 2);
      const specs = [];
      for (let i = 0; i < count; i++) {
        specs.push({
          torneo: torneoId,
          actividad: torneo.actividad._id,
          division: rondaAnterior[i * 2].division,
          grupo: rondaAnterior[i * 2].grupo,
          equipos: [],
          bye: false,
          estado: "pendiente",
          nivel,
          orden: i,
        });
      }
      const docsNivel = await this.#llaves.crearMuchas(specs);

      // Vincula hijos <-> padre.
      for (let i = 0; i < docsNivel.length; i++) {
        const padre = docsNivel[i];
        const hijos = [rondaAnterior[i * 2]];
        if (rondaAnterior[i * 2 + 1]) hijos.push(rondaAnterior[i * 2 + 1]);
        const hijosIds = hijos.map((h) => h._id);
        await this.#llaves.actualizar(padre._id, { hijos: hijosIds });
        for (const h of hijos) {
          await this.#llaves.actualizar(h._id, { padre: padre._id });
        }
      }
      rondaAnterior = docsNivel;
    }

    // ---- Llaves libres (bye): el equipo pasa de ronda automatico ----
    const llavesBye = await this.#llaves.obtenerTodos({ torneo: torneoId, bye: true, nivel: 1 });
    for (const l of llavesBye) {
      if (l.equipos.length === 1) {
        const ganadorId = l.equipos[0]._id || l.equipos[0];
        await this.#llaves.actualizar(l._id, { estado: "jugado", ganador: ganadorId });
        await this.#avanzar(ganadorId, l.padre);
      }
    }

    // El torneo pasa a "en curso" si habia inscripciones abiertas.
    await this.#torneos.actualizar(torneoId, { estado: "en_curso" });

    return {
      totalRondas,
      totalLlaves: docsR1.length,
      llaves: await this.#llaves.obtenerTodos({ torneo: torneoId }),
    };
  }

  async obtenerLlaves(torneoId) {
    return this.#llaves.obtenerTodos({ torneo: torneoId });
  }

  async obtenerAgenda() {
    const torneosVigentes = await this.#torneos.obtenerTodos({
      estado: { $in: ["activo", "en_curso", "inscripciones"] },
    });
    const ids = torneosVigentes.map((t) => t._id);
    const llaves = ids.length
      ? await this.#llaves.obtenerTodos({ torneo: { $in: ids } })
      : [];

    const llavesConFecha = llaves.filter((l) => l.fecha);
    const mapaTorneo = {};
    for (const t of torneosVigentes) mapaTorneo[String(t._id)] = t;

    const eventos = llavesConFecha.map((l) => {
      const torneo = mapaTorneo[String(l.torneo._id || l.torneo)] || {};
      return {
        fecha: l.fecha,
        hora: l.hora,
        lugar: l.lugar,
        grupo: l.grupo,
        division: l.division,
        torneoId: torneo._id || l.torneo,
        torneo: torneo.nombre || "Torneo",
        actividad: torneo.actividad ? torneo.actividad.nombre : "-",
      };
    });

    eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return { eventos };
  }

  async actualizarLlave(llaveId, datos) {
    const llave = await this.#llaves.obtenerPorId(llaveId);
    if (!llave) throw new Error("Llave no encontrada");
    const actualizar = {};
    if (datos.fecha) actualizar.fecha = new Date(datos.fecha);
    if (datos.hora) actualizar.hora = datos.hora;
    if (datos.lugar) actualizar.lugar = datos.lugar;
    if (datos.grupo) actualizar.grupo = datos.grupo;
    return this.#llaves.actualizar(llaveId, actualizar);
  }

  // Registro de resultados y puntajes de una llave.
  async registrarResultado(llaveId, { puntajeA, puntajeB }) {
    const llave = await this.#llaves.obtenerPorId(llaveId);
    if (!llave) throw new Error("Llave no encontrada");
    if (llave.bye) throw new Error("Una llave 'libre' no registra resultados");

    const pa = parseInt(puntajeA, 10);
    const pb = parseInt(puntajeB, 10);
    if (Number.isNaN(pa) || Number.isNaN(pb) || pa < 0 || pb < 0) {
      throw new Error("Puntajes invalidos");
    }

    const ganador = pa === pb ? null : pa > pb ? llave.equipos[0] : llave.equipos[1];
    const ganadorId = ganador ? (ganador._id || ganador) : null;
    const doc = await this.#llaves.registrarResultado(llaveId, {
      puntajeA: pa,
      puntajeB: pb,
      ganador: ganadorId,
    });
    // El ganador avanza a la siguiente ronda del bracket.
    await this.#avanzar(ganadorId, doc.padre || null);
    return doc;
  }

  // Posiciones finales (1º, 2º, 3º) del torneo.
  async registrarPosiciones(torneoId, posiciones) {
    const existente = await this.#torneos.obtenerPorId(torneoId);
    if (!existente) throw new Error("Torneo no encontrado");

    const aInsertar = posiciones.map((p) => ({
      torneo: torneoId,
      establecimiento: p.establecimiento,
      posicion: p.posicion,
    }));

    await this.#posiciones.reemplazarPorTorneo(torneoId, aInsertar);
    await this.#torneos.actualizar(torneoId, { estado: "finalizado" });
    return this.#posiciones.obtenerPorTorneo(torneoId);
  }

  async obtenerPosiciones(torneoId) {
    return this.#posiciones.obtenerPorTorneo(torneoId);
  }

  async eliminar(id) {
    await this.#llaves.eliminarPorTorneo(id);
    return this.#torneos.eliminar(id);
  }
}

module.exports = TorneoService;