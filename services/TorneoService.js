const Sorteo = require("../domain/Sorteo");
const Torneo = require("../domain/Torneo");
const TorneoRepository = require("../repositories/TorneoRepository");
const LlaveRepository = require("../repositories/LlaveRepository");
const PosicionRepository = require("../repositories/PosicionRepository");
const InscripcionModel = require("../models/inscripcion.model");
const LlaveModel = require("../models/llave.model");
const EquipoModel = require("../models/equipo.model");

class TorneoService {
  #torneos;
  #llaves;
  #posiciones;

  constructor() {
    this.#torneos = new TorneoRepository();
    this.#llaves = new LlaveRepository();
    this.#posiciones = new PosicionRepository();
  }

  async crear(datos) {
    const torneo = new Torneo(
      datos.nombre,
      datos.actividad,
      datos.division,
      datos.anio,
      datos.semestre,
      datos.estado,
      datos.grupos,
      {
        ...(datos.formulario || {}),
        requisitos: datos.requisitos,
        fechaAperturaInscripcion: datos.fechaAperturaInscripcion,
        fechaCierreInscripcion: datos.fechaCierreInscripcion,
      },
      datos.formato || "amistoso"
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
    if (datos.division !== undefined) actualizar.division = datos.division;
    if (datos.formato !== undefined) {
      const f = String(datos.formato || "").trim().toLowerCase();
      if (!["amistoso", "competitivo"].includes(f)) throw new Error("Formato de torneo invalido");
      actualizar.formato = f;
    }
    if (datos.estado) actualizar.estado = datos.estado;
    if (datos.grupos) actualizar.grupos = datos.grupos;
    if (datos.formulario !== undefined) actualizar.formulario = datos.formulario;
    if (datos.requisitos !== undefined) actualizar.requisitos = datos.requisitos;
    if (datos.fechaAperturaInscripcion !== undefined) {
      actualizar.fechaAperturaInscripcion = datos.fechaAperturaInscripcion ? new Date(datos.fechaAperturaInscripcion) : null;
    }
    if (datos.fechaCierreInscripcion !== undefined) {
      actualizar.fechaCierreInscripcion = datos.fechaCierreInscripcion ? new Date(datos.fechaCierreInscripcion) : null;
    }

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
  // Fase de grupos: genera round-robin por grupo.
  // La eliminatoria se genera aparte con ejecutarBracket().
  // Los participantes son los EQUIPOS del torneo (estudiantes de
  // distintos establecimientos), no los establecimientos.
  // ============================================================
  async #obtenerParticipantes(torneoId) {
    const torneo = await this.#torneos.obtenerPorId(torneoId);
    if (!torneo) throw new Error("Torneo no encontrado");
    const equipos = await EquipoModel.find({ torneo: torneoId }).lean();
    if (!equipos.length) {
      throw new Error(
        "El torneo no tiene equipos. Cree o sortee los equipos antes de ejecutar el sorteo"
      );
    }
    return equipos.map((eq) => ({
      establecimiento: eq._id,
      nombre: eq.nombre,
      division: "Libre",
      estado: "regular",
      valor: 1,
    }));
  }

  async ejecutarSorteo(torneoId) {
    const torneo = await this.#torneos.obtenerPorId(torneoId);
    if (!torneo) throw new Error("Torneo no encontrado");
    const participantes = await this.#obtenerParticipantes(torneoId);
    if (participantes.length < 2) throw new Error("Se necesitan al menos 2 equipos para el sorteo");
    await this.#llaves.eliminarPorTorneo(torneoId);

    // Competitivo: sin fase de grupos; todos avanzan directo al bracket.
    if (torneo.formato === "competitivo") {
      const bracket = await this.ejecutarBracket(torneoId, { modo: "desempeno" });
      return { faseGrupos: false, ...bracket, llaves: await this.#llaves.obtenerTodos({ torneo: torneoId }) };
    }

    const grupos = ["Llave"];
    const repartidos = Sorteo.repartirEnGrupos(participantes, grupos);
    const resumen = [];
    for (const g of repartidos) {
      const cruces = Sorteo.crucesRoundRobin(g.participantes);
      if (cruces.length) {
        await this.#llaves.crearMuchas(cruces.map(([a, b], idx) => ({
          torneo: torneoId, actividad: torneo.actividad._id, division: [a.division, b.division].find(Boolean) || "Libre",
          grupo: g.nombre, equipos: [a.establecimiento, b.establecimiento], bye: false, estado: "pendiente", nivel: 0, orden: idx,
        })));
      }
      resumen.push({ grupo: g.nombre, equipos: g.participantes.length });
    }
    await this.#torneos.actualizar(torneoId, { estado: "en_curso" });
    // El bracket se genera automaticamente segun la cantidad de equipos:
    // 2 -> Final, 4 -> Semifinal, 8 -> Cuartos, 16 -> Octavos.
    const bracket = await this.ejecutarBracket(torneoId, { modo: "desempeno" });
    return { faseGrupos: true, grupos: resumen, ...bracket, llaves: await this.#llaves.obtenerTodos({ torneo: torneoId }) };
  }

  // Tabla de posiciones de la fase de grupos.
  async obtenerTabla(torneoId) {
    const llavesGrupo = await this.#llaves.obtenerTodos({ torneo: torneoId, nivel: 0 });
    const porGrupo = {};
    for (const l of llavesGrupo) {
      const name = l.grupo || "Llave";
      porGrupo[name] = porGrupo[name] || { nombre: name, llaves: [] };
      porGrupo[name].llaves.push(l);
    }
    return Object.values(porGrupo).map((g) => {
      const filas = {};
      g.llaves.forEach((l) => {
        (l.equipos || []).forEach((e) => {
          if (!e) return; const id = String(e._id || e);
          if (!filas[id]) filas[id] = { equipo: e, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
        });
        if (l.estado !== "jugado") return;
        const [a, b] = l.equipos || [];
        if (!a || !b) return;
        const pa = l.puntajeA ?? 0, pb = l.puntajeB ?? 0;
        const filaA = filas[String(a._id || a)], filaB = filas[String(b._id || b)];
        if (filaA) { filaA.pj++; filaA.gf += pa; filaA.gc += pb; if (pa > pb) filaA.g++; else if (pa === pb) filaA.e++; else filaA.p++; }
        if (filaB) { filaB.pj++; filaB.gf += pb; filaB.gc += pa; if (pb > pa) filaB.g++; else if (pb === pa) filaB.e++; else filaB.p++; }
      });
      const tabla = Object.values(filas).map((f) => { f.dg = f.gf - f.gc; f.pts = f.g * 3 + f.e; return f; });
      tabla.sort((x, y) => (y.pts - x.pts) || (y.dg - x.dg) || (y.gf - x.gf) || String(x.equipo.nombre || "").localeCompare(String(y.equipo.nombre || "")));
      tabla.forEach((f, i) => { f.pos = i + 1; });
      return { grupo: g.nombre, tabla };
    });
  }

  // Bracket eliminatorio: todos los equipos clasifican despues de la fase
  // de grupos. La primera ronda depende de la cantidad de equipos:
  // 4 -> semifinal, 8 -> cuartos de final, 16 -> octavos de final.
  // El emparejamiento se hace segun `modo` ("desempeno" igualando al mejor
  // con el peor segun la tabla, "azar" o "manual" con cruces indicados).
  async ejecutarBracket(torneoId, { modo = "desempeno", crucesManuales = [] } = {}) {
    const torneo = await this.#torneos.obtenerPorId(torneoId);
    if (!torneo) throw new Error("Torneo no encontrado");
    const tablas = await this.obtenerTabla(torneoId);
    const participantes = await this.#obtenerParticipantes(torneoId);
    const porId = {};
    participantes.forEach((p) => { porId[String(p.establecimiento)] = p; });

    // Competitivo: no existe fase de grupos, clasifican todos los equipos inscritos.
    // Amistoso: todos los equipos de la fase de grupos clasifican al bracket.
    let clasificados;
    if (torneo.formato === "competitivo") {
      clasificados = participantes;
    } else {
      const tablaUnica = (tablas && tablas[0]) || { tabla: [] };
      clasificados = tablaUnica.tabla
        .map((f) => porId[String(f.equipo._id || f.equipo)])
        .filter(Boolean);
    }
    if (clasificados.length < 2) {
      throw new Error("Se necesitan al menos 2 equipos con puntuacion para armar las eliminatorias");
    }
    const idsClasificados = clasificados.map((p) => String(p.establecimiento));
    await LlaveModel.deleteMany({ torneo: torneoId, nivel: { $gte: 1 } });

    // Primera ronda segun el modo de sorteo elegido.
    let cruces;
    if (modo === "manual" && crucesManuales.length) {
      cruces = crucesManuales.map((par) => {
        const ids = (Array.isArray(par) ? par : []).map((x) => (x ? String(x) : null));
        return ids.length === 1 ? [ids[0], null] : ids;
      });
    } else if (modo === "azar") {
      const revueltos = Sorteo.mezclar(idsClasificados);
      cruces = [];
      for (let i = 0; i < revueltos.length; i += 2) {
        cruces.push([revueltos[i], revueltos[i + 1] || null]);
      }
    } else {
      // Desempeno (igualado): 1° con el ultimo, 2° con el penultimo, etc.
      cruces = [];
      let i = 0;
      let j = idsClasificados.length - 1;
      while (i <= j) {
        cruces.push([idsClasificados[i], i === j ? null : idsClasificados[j]]);
        i += 1;
        j -= 1;
      }
    }

    const NOMBRES_FASES = {
      1: ["Final"],
      2: ["Semifinal", "Final"],
      3: ["Cuartos de Final", "Semifinal", "Final"],
      4: ["Octavos de Final", "Cuartos de Final", "Semifinal", "Final"],
    };
    const totalRondas = Sorteo.nivelesNecesarios(clasificados.length);
    const fases = NOMBRES_FASES[totalRondas] || ["Final"];

    const docsR1 = [];
    cruces.forEach(([a, b], idx) => {
      docsR1.push({
        torneo: torneoId, actividad: torneo.actividad._id, division: "Libre",
        grupo: fases[0] || "Eliminatoria", equipos: [a, b].filter(Boolean),
        bye: !b, estado: "pendiente", nivel: 1, orden: idx,
      });
    });
    const ronda1 = await this.#llaves.crearMuchas(docsR1);
    let rondaAnterior = ronda1;
    for (let nivel = 2; nivel <= totalRondas; nivel++) {
      const count = Math.ceil(rondaAnterior.length / 2);
      const specs = [];
      for (let i = 0; i < count; i++) {
        specs.push({ torneo: torneoId, actividad: torneo.actividad._id, division: "Libre", grupo: fases[nivel - 1] || "Eliminatoria", equipos: [], bye: false, estado: "pendiente", nivel, orden: i });
      }
      const docsNivel = await this.#llaves.crearMuchas(specs);
      for (let i = 0; i < docsNivel.length; i++) {
        const padre = docsNivel[i];
        const hijos = [rondaAnterior[i * 2]];
        if (rondaAnterior[i * 2 + 1]) hijos.push(rondaAnterior[i * 2 + 1]);
        await this.#llaves.actualizar(padre._id, { hijos: hijos.map((h) => h._id) });
        for (const h of hijos) await this.#llaves.actualizar(h._id, { padre: padre._id });
      }
      rondaAnterior = docsNivel;
    }
    const llavesBye = await this.#llaves.obtenerTodos({ torneo: torneoId, bye: true, nivel: 1 });
    for (const l of llavesBye) {
      if (l.equipos.length === 1) {
        const ganadorId = l.equipos[0]._id || l.equipos[0];
        await this.#llaves.actualizar(l._id, { estado: "jugado", ganador: ganadorId });
        await this.#avanzar(ganadorId, l.padre);
      }
    }
    return { totalRondas, fases, totalLlaves: Math.ceil(clasificados.length / 2), llaves: await this.#llaves.obtenerTodos({ torneo: torneoId }) };
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
      const equipos = (l.equipos || []).map((e) => e && (e.nombre || e._id)).filter(Boolean);
      return {
        fecha: l.fecha,
        hora: l.hora,
        horaTermino: l.horaTermino || "",
        lugar: l.lugar,
        grupo: l.grupo,
        fase: l.nivel >= 1 ? l.grupo : "Fase de Grupos",
        division: torneo.division || l.division || "",
        torneoId: torneo._id || l.torneo,
        torneo: torneo.nombre || "Torneo",
        actividad: torneo.actividad ? torneo.actividad.nombre : "-",
        equipos,
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
    if (datos.horaTermino !== undefined) actualizar.horaTermino = datos.horaTermino;
    if (datos.lugar) actualizar.lugar = datos.lugar;
    if (datos.grupo) actualizar.grupo = datos.grupo;
    // Edicion manual del sorteo: permite reasignar los equipos de la llave.
    if (datos.equipos !== undefined) {
      if (llave.estado === "jugado") throw new Error("No puede editar los equipos de una llave ya jugada");
      actualizar.equipos = (Array.isArray(datos.equipos) ? datos.equipos : [])
        .filter((e) => e)
        .map((e) => String(e));
    }
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