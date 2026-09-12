const Inscripcion = require("../domain/Inscripcion");
const Division = require("../domain/Division");
const Alumno = require("../domain/Alumno");
const InscripcionRepository = require("../repositories/InscripcionRepository");
const AlumnoRepository = require("../repositories/AlumnoRepository");
const ActividadModel = require("../models/actividad.model");
const TorneoModel = require("../models/torneo.model");

class InscripcionService {
  #inscripciones;
  #alumnos;

  constructor() {
    this.#inscripciones = new InscripcionRepository();
    this.#alumnos = new AlumnoRepository();
  }

  // El coordinador inscribe a su establecimiento en una actividad/division.
  async crear(datos, usuario) {
    if (usuario.rol !== "admin" && String(datos.establecimiento) !== String(usuario.establecimiento?._id)) {
      throw new Error("El coordinador solo puede inscribir a su propio establecimiento");
    }

    const actividad = await ActividadModel.findById(datos.actividad).lean();
    if (!actividad) throw new Error("Actividad no encontrada");
    if (!actividad.divisiones.includes(datos.division)) {
      throw new Error(`La actividad no ofrece la division ${datos.division}`);
    }

    // Validacion de ventana de inscripcion.
    const ahora = new Date();
    if (actividad.fechaAperturaInscripcion && ahora < actividad.fechaAperturaInscripcion) {
      throw new Error(
        `Las inscripciones abre el ${actividad.fechaAperturaInscripcion.toLocaleDateString("es-CL")}`
      );
    }
    if (actividad.fechaCierreInscripcion && ahora > actividad.fechaCierreInscripcion) {
      throw new Error(
        `Las inscripciones cerradas desde el ${actividad.fechaCierreInscripcion.toLocaleDateString("es-CL")}`
      );
    }

    // Validaciones de estado/cupo.
    const existente = await this.#inscripciones.buscar(
      datos.establecimiento,
      datos.actividad,
      datos.division
    );
    if (existente) {
      throw new Error("Este establecimiento ya esta inscrito a esa actividad/division");
    }

    const inscripcion = new Inscripcion(
      datos.establecimiento,
      datos.actividad,
      datos.division,
      usuario.rut
    );

    const doc = await this.#inscripciones.crear(inscripcion);
    return this.#inscripciones.obtenerPorId(doc._id);
  }

  async asociarTorneo(inscripcionId, torneoId) {
    const inscripcion = await this.#inscripciones.obtenerPorId(inscripcionId);
    if (!inscripcion) throw new Error("Inscripcion no encontrada");
    return this.#inscripciones.actualizar(inscripcionId, { torneo: torneoId, grupo: "" });
  }

  async obtenerTodos(usuario, filtro = {}) {
    if (usuario.rol === "coordinador") {
      filtro.establecimiento = usuario.establecimiento?._id;
    }
    if (usuario.rol === "encargado") {
      const ids = (usuario.actividades || []).map((a) => a._id || a);
      filtro.actividad = { $in: ids.length ? ids : [null] };
    }
    return this.#inscripciones.obtenerTodos(filtro);
  }

  async obtenerPorId(id) {
    return this.#inscripciones.obtenerPorId(id);
  }

  // El admin acepta o rechaza la solicitud del coordinador.
  async cambiarEstado(id, estado, usuario) {
    if (usuario.rol !== "admin") throw new Error("Solo el Admin DAEM puede aceptar o rechazar");
    if (!["aceptada", "rechazada"].includes(estado)) {
      throw new Error("Estado invalido: use aceptada/rechazada");
    }
    return this.#inscripciones.cambiarEstado(id, estado);
  }

  // El coordinador modifica o retracta su solicitud mientras este en proceso.
  async modificar(id, datos, usuario) {
    const inscripcion = await this.#inscripciones.obtenerPorId(id);
    if (!inscripcion) throw new Error("Inscripcion no encontrada");
    if (usuario.rol !== "admin" && String(inscripcion.establecimiento._id) !== String(usuario.establecimiento?._id)) {
      throw new Error("No puede modificar una inscripcion de otro establecimiento");
    }
    if (inscripcion.estado !== "en_proceso") {
      throw new Error("Solo se puede modificar una inscripcion en estado 'en proceso'");
    }

    const actualizar = {};
    if (datos.division) {
      const actividad = inscripcion.actividad;
      if (!actividad.divisiones.includes(datos.division)) {
        throw new Error(`La actividad no ofrece la division ${datos.division}`);
      }
      actualizar.division = datos.division;
    }
    if (datos.detalle !== undefined) actualizar.detalle = datos.detalle;

    return this.#inscripciones.actualizar(id, actualizar);
  }

  async retractar(id, usuario) {
    const inscripcion = await this.#inscripciones.obtenerPorId(id);
    if (!inscripcion) throw new Error("Inscripcion no encontrada");
    if (usuario.rol !== "admin" && String(inscripcion.establecimiento._id) !== String(usuario.establecimiento?._id)) {
      throw new Error("No puede retractar una inscripcion de otro establecimiento");
    }
    if (inscripcion.estado === "aceptada") {
      throw new Error("Una inscripcion aceptada no puede retractarse; contacte al DAEM");
    }
    return this.#inscripciones.eliminar(id);
  }

  // El coordinador agrega un alumno validando su año de nacimiento por division.
  async agregarAlumno(inscripcionId, datos, usuario) {
    const inscripcion = await this.#inscripciones.obtenerPorId(inscripcionId);
    if (!inscripcion) throw new Error("Inscripcion no encontrada");
    if (usuario.rol !== "admin" && String(inscripcion.establecimiento._id) !== String(usuario.establecimiento?._id)) {
      throw new Error("No puede agregar alumnos a esa inscripcion");
    }

    // Validacion de categoria por años de nacimiento (clase Division).
    new Division(inscripcion.division).validarFechaNacimiento(datos.fechaNacimiento);

    const alumno = new Alumno(
      datos.rut,
      datos.nombre,
      datos.fechaNacimiento,
      datos.apoderado,
      datos.email,
      datos.telefono,
      datos.genero
    );

    // Validacion de rango de edad definido por la actividad.
    const edadAlumno = alumno.calcularEdad();
    const eMin = inscripcion.actividad.edadMinima;
    const eMax = inscripcion.actividad.edadMaxima;
    if (eMin != null && edadAlumno < eMin) {
      throw new Error(`El alumno tiene ${edadAlumno} anios, menor a la edad minima de ${eMin}`);
    }
    if (eMax != null && edadAlumno > eMax) {
      throw new Error(`El alumno tiene ${edadAlumno} anios, mayor a la edad maxima de ${eMax}`);
    }

    const duplicado = await this.#alumnos.buscarPorRutEnActividad(alumno.rut, inscripcion.actividad._id);
    if (duplicado) throw new Error(`El alumno ${alumno.nombre} ya esta registrado en esta actividad`);

    const limite = inscripcion.actividad.limiteInscritos || 0;
    if (limite > 0 && inscripcion.alumnos.length >= limite) {
      throw new Error(`La actividad ${inscripcion.actividad.nombre} alcanzo su limite de ${limite} inscritos`);
    }

    const doc = await this.#alumnos.crear({
      rut: alumno.rut,
      nombre: alumno.nombre,
      genero: alumno.genero,
      fechaNacimiento: alumno.fechaNacimiento,
      apoderado: alumno.apoderado,
      email: alumno.email,
      telefono: alumno.telefono,
      establecimiento: inscripcion.establecimiento._id,
      actividad: inscripcion.actividad._id,
      division: inscripcion.division,
      inscripcion: inscripcion._id,
    });

    await this.#inscripciones.actualizar(inscripcionId, {
      alumnos: [...inscripcion.alumnos.map((a) => a._id), doc._id],
    });

    return this.#alumnos.obtenerPorId(doc._id);
  }

  async eliminarAlumno(inscripcionId, alumnoId, usuario) {
    const inscripcion = await this.#inscripciones.obtenerPorId(inscripcionId);
    if (!inscripcion) throw new Error("Inscripcion no encontrada");
    if (usuario.rol !== "admin" && String(inscripcion.establecimiento._id) !== String(usuario.establecimiento?._id)) {
      throw new Error("No puede eliminar alumnos de esa inscripcion");
    }
    const nuevos = inscripcion.alumnos
      .filter((a) => String(a._id) !== String(alumnoId))
      .map((a) => a._id);
    await this.#inscripciones.actualizar(inscripcionId, { alumnos: nuevos });
    return this.#alumnos.eliminar(alumnoId);
  }

  // Nómina interna: registro centralizado de estudiantes del establecimiento.
  async nominaEstablecimiento(usuario) {
    const estId = usuario.establecimiento?._id;
    if (!estId) {
      return { total: 0, alumnos: [], porActividad: [] };
    }
    const alumnos = await this.#alumnos.obtenerTodos({ establecimiento: estId });
    const porActividad = alumnos.reduce((acc, a) => {
      const clave = a.actividad ? a.actividad.nombre : "Sin actividad";
      acc[clave] = (acc[clave] || 0) + 1;
      return acc;
    }, {});
    return {
      total: alumnos.length,
      alumnos,
      porActividad: Object.entries(porActividad).map(([actividad, cantidad]) => ({ actividad, cantidad })),
    };
  }
}

module.exports = InscripcionService;