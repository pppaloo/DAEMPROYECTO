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

    const alumnosInput = Array.isArray(datos.alumnos) && datos.alumnos.length
      ? datos.alumnos
      : (datos.alumno ? [datos.alumno] : []);
    if (!alumnosInput.length) throw new Error("Debe indicar al menos un estudiante");

    // Validar cada alumno
    const alumnos = alumnosInput.map((al) => {
      const rut = String(al.rut || "").trim();
      const nombre = String(al.nombre || "").trim();
      const fechaNacimiento = al.fechaNacimiento || "";
      if (!rut) throw new Error("El RUT del estudiante es obligatorio");
      if (!nombre) throw new Error("El nombre del estudiante es obligatorio");
      if (!fechaNacimiento) throw new Error("La fecha de nacimiento es obligatoria");
      return {
        rut,
        nombre,
        genero: al.genero || "",
        fechaNacimiento,
        apoderado: al.apoderado || "",
        email: al.email || "",
        telefono: al.telefono || "",
      };
    });

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

    const detalleAlumnos = alumnos.length === 1
      ? `Inscripcion de ${alumnos[0].nombre} (${alumnos[0].rut}) en ${destino}`
      : `Inscripcion de ${alumnos.length} estudiantes en ${destino}`;

    const solicitud = new Solicitud(
      TIPOS_SOLICITUD.INSCRIPCION,
      detalleAlumnos,
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
      alumnos,
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
    const alumnos = (solicitud.alumnos && solicitud.alumnos.length)
      ? solicitud.alumnos
      : (solicitud.alumno && solicitud.alumno.rut ? [solicitud.alumno] : []);
    if (!alumnos.length) throw new Error("La solicitud no tiene estudiantes");

    const resultados = [];
    for (const al of alumnos) {
      const alumno = {
        rut: al.rut,
        nombre: al.nombre,
        genero: al.genero,
        fechaNacimiento: al.fechaNacimiento,
        apoderado: al.apoderado,
        email: al.email,
        telefono: al.telefono,
      };
      if (solicitud.inscripcion) {
        resultados.push(await this.#inscripcionService.agregarAlumno(solicitud.inscripcion, alumno, usuario));
      } else if (solicitud.torneo) {
        resultados.push(await this.#inscripcionService.postularTorneo(
          solicitud.torneo,
          { alumno, establecimiento: estId },
          usuario
        ));
      } else if (solicitud.actividad) {
        resultados.push(await this.#inscripcionService.postular(
          {
            actividad: solicitud.actividad.id ?? solicitud.actividad,
            division: solicitud.division,
            establecimiento: estId,
            alumno,
          },
          usuario
        ));
      } else {
        throw new Error("La solicitud no indica donde inscribir al estudiante");
      }
    }
    return resultados;
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
