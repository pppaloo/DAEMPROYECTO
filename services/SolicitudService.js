const SolicitudRepository = require("../repositories/SolicitudRepository");
const InscripcionRepository = require("../repositories/InscripcionRepository");
const ActividadRepository = require("../repositories/ActividadRepository");
const TorneoRepository = require("../repositories/TorneoRepository");
const InscripcionService = require("./InscripcionService");
const Solicitud = require("../domain/Solicitud");
const { TIPOS_SOLICITUD } = require("../constants/catalogos");

class SolicitudService {
  #solicitudes;
  #inscripciones;
  #actividades;
  #torneos;
  #inscripcionService;

  constructor() {
    this.#solicitudes = new SolicitudRepository();
    this.#inscripciones = new InscripcionRepository();
    this.#actividades = new ActividadRepository();
    this.#torneos = new TorneoRepository();
    this.#inscripcionService = new InscripcionService();
  }

  // El coordinador ve las solicitudes de su establecimiento; admin las ve todas.
  async obtenerTodos(usuario) {
    if (usuario.rol === "coordinador") {
      const estId = usuario.establecimiento?.id ?? usuario.establecimiento?._id;
      if (!estId) return [];
      return this.#solicitudes.obtenerTodos({ establecimiento: estId });
    }
    return this.#solicitudes.obtenerTodos();
  }

  // El coordinador propone inscribir un estudiante. El estudiante NO se agrega
  // a la nomina hasta que el Admin DAEM apruebe la solicitud.
  async crearSolicitudEstudiante(datos, usuario) {
    if (!["coordinador", "admin"].includes(usuario.rol)) {
      throw new Error("Solo el Coordinador puede solicitar inscripciones");
    }
    const estId = datos.establecimiento || usuario.establecimiento?._id;
    if (!estId) throw new Error("No hay establecimiento asignado");
    if (usuario.rol !== "admin" && String(estId) !== String(usuario.establecimiento?._id)) {
      throw new Error("Solo puede solicitar inscripciones para su establecimiento");
    }

    const alumno = datos.alumno || {};
    const rut = String(alumno.rut || "").trim();
    const nombre = String(alumno.nombre || "").trim();
    const fechaNacimiento = alumno.fechaNacimiento || "";
    if (!rut) throw new Error("El RUT del estudiante es obligatorio");
    if (!nombre) throw new Error("El nombre del estudiante es obligatorio");
    if (!fechaNacimiento) throw new Error("La fecha de nacimiento es obligatoria");

    const inscripcionId = datos.inscripcion ? Number(datos.inscripcion) : null;
    const torneoId = datos.torneo ? Number(datos.torneo) : null;
    let actividadId = datos.actividad ? Number(datos.actividad) : null;
    let division = String(datos.division || "").trim();
    let destino = "";

    if (inscripcionId) {
      const inscripcion = await this.#inscripciones.obtenerPorId(inscripcionId);
      if (!inscripcion) throw new Error("Inscripcion no encontrada");
      if (String(inscripcion.establecimiento.id) !== String(estId)) {
        throw new Error("La inscripcion no pertenece a su establecimiento");
      }
      if (inscripcion.estado !== "aceptada") {
        throw new Error("La inscripcion debe estar aceptada para agregar estudiantes");
      }
      actividadId = Number(inscripcion.actividad.id);
      division = inscripcion.division;
      destino = `${inscripcion.actividad.nombre} - ${inscripcion.division}`;
    } else if (torneoId) {
      const torneo = await this.#torneos.obtenerPorId(torneoId);
      if (!torneo) throw new Error("Torneo no encontrado");
      const actId = torneo.actividad && (torneo.actividad.id ?? torneo.actividad);
      if (!actId) throw new Error("El torneo no tiene actividad definida");
      actividadId = Number(actId);
      division = torneo.division || division;
      destino = `Torneo ${torneo.nombre} - ${torneo.division || "sin categoria"}`;
    } else if (actividadId) {
      const actividad = await this.#actividades.obtenerPorId(actividadId);
      if (!actividad) throw new Error("Actividad no encontrada");
      if (!division) throw new Error("Seleccione la categoria");
      if (!actividad.divisiones.includes(division)) {
        throw new Error(`La actividad no ofrece la division ${division}`);
      }
      destino = `${actividad.nombre} - ${division}`;
    } else {
      throw new Error("Seleccione la inscripcion, el torneo o la actividad/categoria");
    }

    const solicitud = new Solicitud(
      TIPOS_SOLICITUD.INSCRIPCION,
      `Inscripcion de ${nombre} (${rut}) en ${destino}`,
      usuario.rut,
      usuario.rol === "coordinador" ? usuario.rut : "",
      actividadId
    );

    return this.#solicitudes.crear({
      tipo: solicitud.tipo,
      detalle: solicitud.detalle,
      estado: solicitud.estado,
      rutSolicitante: solicitud.rutSolicitante,
      rutCoordinador: solicitud.rutCoordinador,
      actividad: actividadId,
      establecimiento: estId,
      inscripcion: inscripcionId,
      torneo: torneoId,
      division,
      alumno: {
        rut,
        nombre,
        genero: alumno.genero || "",
        fechaNacimiento,
        apoderado: alumno.apoderado || "",
        email: alumno.email || "",
        telefono: alumno.telefono || "",
      },
    });
  }

  // El Admin DAEM aprueba/rechaza cualquier solicitud. El coordinador solo
  // responde las solicitudes internas (recursos/participacion) de su colegio;
  // las inscripciones de estudiantes las resuelve exclusivamente el admin.
  async cambiarEstado(id, estado, respuesta, usuario) {
    if (!["aprobada", "rechazada"].includes(estado)) {
      throw new Error("Estado invalido: use aprobada/rechazada");
    }
    const solicitud = await this.#solicitudes.obtenerPorId(id);
    if (!solicitud) throw new Error("Solicitud no encontrada");
    if (solicitud.estado !== "en_proceso") {
      throw new Error("La solicitud ya fue respondida");
    }

    const esInscripcion = solicitud.tipo === TIPOS_SOLICITUD.INSCRIPCION;
    if (usuario.rol === "coordinador") {
      if (esInscripcion) {
        throw new Error("Solo el Admin DAEM puede aprobar o rechazar inscripciones de estudiantes");
      }
      if (String(solicitud.establecimiento?.id) !== String(usuario.establecimiento?.id)) {
        throw new Error("La solicitud no pertenece a su establecimiento");
      }
    } else if (usuario.rol !== "admin") {
      throw new Error("No puede responder solicitudes");
    }

    // Al aprobar una inscripcion se agrega al estudiante a la nomina. Si la
    // validacion falla, la solicitud queda pendiente y se guarda el motivo.
    if (esInscripcion && estado === "aprobada") {
      try {
        await this.#agregarEstudiante(solicitud, usuario);
      } catch (err) {
        await this.#solicitudes.actualizar(id, {
          respuesta: `No se pudo inscribir: ${err.message}`,
        });
        throw new Error(`No se pudo inscribir al estudiante: ${err.message}`);
      }
    }

    return this.#solicitudes.cambiarEstado(id, estado, respuesta || "");
  }

  async #agregarEstudiante(solicitud, usuario) {
    const estId = solicitud.establecimiento?.id;
    if (!estId) throw new Error("La solicitud no tiene establecimiento");
    const alumno = {
      rut: solicitud.alumno.rut,
      nombre: solicitud.alumno.nombre,
      genero: solicitud.alumno.genero,
      fechaNacimiento: solicitud.alumno.fechaNacimiento,
      apoderado: solicitud.alumno.apoderado,
      email: solicitud.alumno.email,
      telefono: solicitud.alumno.telefono,
    };

    if (solicitud.inscripcion) {
      return this.#inscripcionService.agregarAlumno(solicitud.inscripcion, alumno, usuario);
    }
    if (solicitud.torneo) {
      return this.#inscripcionService.postularTorneo(
        solicitud.torneo,
        { alumno, establecimiento: estId },
        usuario
      );
    }
    if (solicitud.actividad) {
      return this.#inscripcionService.postular(
        {
          actividad: solicitud.actividad.id ?? solicitud.actividad,
          division: solicitud.division,
          establecimiento: estId,
          alumno,
        },
        usuario
      );
    }
    throw new Error("La solicitud no indica donde inscribir al estudiante");
  }

  async eliminar(id, usuario) {
    const solicitud = await this.#solicitudes.obtenerPorId(id);
    if (!solicitud) throw new Error("Solicitud no encontrada");
    if (solicitud.estado !== "en_proceso") {
      throw new Error("No se puede eliminar una solicitud ya respondida");
    }
    return this.#solicitudes.eliminar(id);
  }
}

module.exports = SolicitudService;
