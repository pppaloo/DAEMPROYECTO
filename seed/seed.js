require("dotenv").config();
const { initDatabase } = require("../config/database");

const AuthService = require("../services/AuthService");
const EstablecimientoService = require("../services/EstablecimientoService");
const UsuarioService = require("../services/UsuarioService");
const ActividadService = require("../services/ActividadService");
const TorneoService = require("../services/TorneoService");
const InscripcionService = require("../services/InscripcionService");
const ValoracionService = require("../services/ValoracionService");

const EstablecimientoModel = require("../models/establecimiento.model");
const UsuarioModel = require("../models/usuario.model");
const ActividadModel = require("../models/actividad.model");
const TorneoModel = require("../models/torneo.model");
const InscripcionModel = require("../models/inscripcion.model");
const ValoracionModel = require("../models/valoracion.model");

const ROLES_ADMIN = { rut: process.env.SEED_ADMIN_RUT, clave: process.env.SEED_ADMIN_CLAVE, nombre: "Directora DAEM" };

const COLEGIOS = [
  { codigo: "A-59", nombre: "Escuela Basica Los Aromos", dependencia: "Municipal" },
  { codigo: "B-112", nombre: "Liceo San Gabriel", dependencia: "Particular Subvencionado" },
  { codigo: "C-204", nombre: "Colegio Amanecer de La Serena", dependencia: "Particular Subvencionado" },
  { codigo: "D-868", nombre: "Escuela Diferencial Aurora", dependencia: "Municipal" },
];

const COORDINADORES = [
  { rut: "22222222-2", nombre: "Pedro Gonzalez", email: "pedro@a59.cl", colegio: "A-59" },
  { rut: "33333333-3", nombre: "Maria Fuentes", email: "maria@b112.cl", colegio: "B-112" },
  { rut: "44444444-4", nombre: "Jorge Rojas", email: "jorge@c204.cl", colegio: "C-204" },
  { rut: "55555555-5", nombre: "Carolina Diaz", email: "carolina@d868.cl", colegio: "D-868" },
];

const ACTIVIDADES = [
  {
    nombre: "Futbol",
    area: "Deportiva",
    divisiones: ["MINIS", "SUB 13", "JUVENIL", "VARONES"],
    recintos: ["Cancha 1", "Polideportivo"],
    encuentros: [
      { fecha: "2026-04-15", hora: "10:00", lugar: "Cancha 1" },
      { fecha: "2026-04-22", hora: "15:00", lugar: "Polideportivo" },
    ],
  },
  {
    nombre: "Basquetbol",
    area: "Deportiva",
    divisiones: ["SUB 13", "JUVENIL", "DAMAS"],
    recintos: ["Polideportivo", "Gimnasio B"],
    encuentros: [{ fecha: "2026-04-18", hora: "11:00", lugar: "Polideportivo" }],
  },
  {
    nombre: "Danza",
    area: "Artístico/Cultural",
    divisiones: ["DAMAS", "VARONES", "JUVENIL"],
    recintos: ["Sala de Artes"],
    encuentros: [{ fecha: "2026-05-02", hora: "17:00", lugar: "Sala de Artes" }],
  },
  {
    nombre: "Ajedrez",
    area: "Deportiva",
    divisiones: ["MINIS", "SUB 13"],
    recintos: ["Sala 204"],
    encuentros: [{ fecha: "2026-05-09", hora: "09:30", lugar: "Sala 204" }],
  },
];

// Filtro de division solamente para valoraciones de ejemplo (Futbol/Ajedrez).
const VALORACIONES = [
  { colegio: "A-59", actividad: "Futbol", estado: "cumple" },
  { colegio: "B-112", actividad: "Futbol", estado: "regular" },
  { colegio: "C-204", actividad: "Futbol", estado: "no_cumple" },
  { colegio: "D-868", actividad: "Futbol", estado: "regular" },
  { colegio: "C-204", actividad: "Ajedrez", estado: "no_cumple" },
  { colegio: "A-59", actividad: "Ajedrez", estado: "cumple" },
];

async function existenDocumentos(modelo) {
  return (await modelo.countDocuments()) > 0;
}

async function ejecutarSeed() {
  const auth = new AuthService();
  const estService = new EstablecimientoService();
  const usuService = new UsuarioService();
  const actService = new ActividadService();
  const torService = new TorneoService();
  const inscService = new InscripcionService();
  const valService = new ValoracionService();

  const anio = 2026;
  const semestre = 1;

  // 1) Admin DAEM
  if (!(await existenDocumentos(UsuarioModel))) {
    await auth.crearAdmin(ROLES_ADMIN.rut, ROLES_ADMIN.nombre, ROLES_ADMIN.clave);
    console.log("[SEED] Admin DAEM creado:", ROLES_ADMIN.rut);
  }

  // 2) Establecimientos
  const idsColegios = {};
  if (!(await existenDocumentos(EstablecimientoModel))) {
    for (const c of COLEGIOS) {
      const creado = await estService.crear(c);
      idsColegios[c.codigo] = creado._id;
      console.log("[SEED] Establecimiento:", c.codigo, "-", c.nombre);
    }
  } else {
    for (const c of COLEGIOS) {
      idsColegios[c.codigo] = (await EstablecimientoModel.findOne({ codigo: c.codigo }).lean())._id;
    }
  }

  // 3) Coordinadores por establecimiento
  if (!(await existenDocumentos(UsuarioModel.where({ rol: "coordinador" })))) {
    for (const coord of COORDINADORES) {
      await usuService.crearUsuario(
        {
          rut: coord.rut,
          nombre: coord.nombre,
          email: coord.email,
          rol: "coordinador",
          clave: "coord123",
          establecimiento: idsColegios[coord.colegio],
        },
        { rol: "admin" }
      );
      console.log("[SEED] Coordinador:", coord.nombre, "->", coord.colegio);
    }
  }

  // 4) Actividades
  const idsActividades = {};
  if (!(await existenDocumentos(ActividadModel))) {
    for (const a of ACTIVIDADES) {
      const creada = await actService.crear({ ...a, anio, estado: "en_inscripcion" });
      idsActividades[a.nombre] = creada._id;
      console.log("[SEED] Actividad:", a.nombre, "(" + a.area + ")");
    }
  } else {
    for (const a of ACTIVIDADES) {
      idsActividades[a.nombre] = (await ActividadModel.findOne({ nombre: a.nombre }).lean())._id;
    }
  }

  // 5) Encargado de ejemplo (historico de coordinador A-59)
  const coordinadorA59 = await UsuarioModel.findOne({
    rut: "22222222-2",
    rol: "coordinador",
  }).lean();
  if (coordinadorA59 && !(await existenDocumentos(UsuarioModel.where({ rut: "66666666-6" })))) {
    await usuService.crearUsuario(
      {
        rut: "66666666-6",
        nombre: "Roberto Mendez",
        email: "roberto@a59.cl",
        rol: "encargado",
        clave: "encarg123",
        establecimiento: idsColegios["A-59"],
        actividades: idsActividades.Futbol ? [idsActividades.Futbol] : [],
      },
      { rol: "coordinador", establecimiento: { _id: idsColegios["A-59"] } }
    );
    console.log("[SEED] Encargado: Roberto Mendez (Futbol / A-59)");
  }

  // 5b) Director de ejemplo (perfil solo lectura a nivel comunal)
  if (!(await existenDocumentos(UsuarioModel.where({ rut: "77777777-7" })))) {
    await usuService.crearUsuario(
      {
        rut: "77777777-7",
        nombre: "Director DAEM",
        email: "director@daem.cl",
        rol: "director",
        clave: "director123",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    console.log("[SEED] Director: Director DAEM (solo lectura)");
  }

  // 6) Torneo de Futbol
  let torneo = await TorneoModel.findOne({ nombre: "Torneo Comunal de Futbol 2026" }).lean();
  if (!torneo) {
    const doc = await torService.crear({
      nombre: "Torneo Comunal de Futbol 2026",
      actividad: idsActividades.Futbol,
      anio,
      semestre,
      estado: "inscripciones",
      grupos: ["Grupo A", "Grupo B"],
      formulario: { permiteEncargados: true, fechaToPe: new Date("2026-03-30") },
    });
    torneo = await TorneoModel.findById(doc._id).lean();
    console.log("[SEED] Torneo:", torneo.nombre);
  }

  // 7) Inscripciones de establecimientos al torneo (una aceptada, otra en proceso)
  let inscripciones = await InscripcionModel.find({ torneo: torneo._id }).lean();
  if (inscripciones.length === 0) {
    const coordB112 = await UsuarioModel.findOne({ rut: "33333333-3" }).lean();

    const inscA = await inscService.crear(
      {
        establecimiento: idsColegios["A-59"],
        actividad: idsActividades.Futbol,
        division: "SUB 13",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.asociarTorneo(inscA._id, torneo._id);
    await inscService.cambiarEstado(inscA._id, "aceptada", { rol: "admin" });

    const inscB = await inscService.crear(
      {
        establecimiento: idsColegios["B-112"],
        actividad: idsActividades.Futbol,
        division: "SUB 13",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.asociarTorneo(inscB._id, torneo._id);
    await inscService.cambiarEstado(inscB._id, "aceptada", { rol: "admin" });

    // Alumnos de ejemplo en la inscripcion aceptada (validan categoria SUB 13).
    await inscService.agregarAlumno(
      inscA._id,
      {
        rut: "12121212-9",
        nombre: "Mateo Aguilera",
        genero: "M",
        fechaNacimiento: "2014-05-10",
        apoderado: "Luis Aguilera",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.agregarAlumno(
      inscA._id,
      {
        rut: "13131313-6",
        nombre: "Ignacia Rojas",
        genero: "F",
        fechaNacimiento: "2013-02-14",
        apoderado: "Paula Rojas",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );

    const inscB2 = await inscService.crear(
      {
        establecimiento: idsColegios["C-204"],
        actividad: idsActividades.Futbol,
        division: "MINIS",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.asociarTorneo(inscB2._id, torneo._id);
    await inscService.cambiarEstado(inscB2._id, "aceptada", { rol: "admin" });

    const inscC = await inscService.crear(
      {
        establecimiento: idsColegios["D-868"],
        actividad: idsActividades.Futbol,
        division: "JUVENIL",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.asociarTorneo(inscC._id, torneo._id);
    await inscService.cambiarEstado(inscC._id, "aceptada", { rol: "admin" });

    console.log("[SEED] Inscripciones y alumnos de ejemplo creados");
    void coordB112;
  }

  // 7b) Sorteo de ejemplo y fechas de encuentro (para la agenda de torneos)
  const LlaveModel = require("../models/llave.model");
  const tieneLlaves = await LlaveModel.countDocuments({ torneo: torneo._id });
  if (tieneLlaves === 0) {
    try {
      await torService.ejecutarSorteo(torneo._id);
      const hoy = new Date();
      const fecha = (df) => { const d = new Date(df); d.setHours(0,0,0,0); return d; };
      await LlaveModel.updateMany(
        { torneo: torneo._id, estado: "pendiente" },
        { $set: { estado: "pendiente", fecha: fecha(hoy), hora: "10:00", lugar: "Cancha 1" } }
      );
      console.log("[SEED] Sorteo de ejemplo ejecutado y fechas asignadas");
    } catch (e) {
      console.log("[SEED] Sorteo omitido:", e.message);
    }
  } else {
    // Asignar fechas a llaves que aun no tienen fecha (para que se vean en la agenda).
    const hoy = new Date();
    await LlaveModel.updateMany(
      { torneo: torneo._id, fecha: null },
      { $set: { fecha: hoy, hora: "10:00", lugar: "Cancha 1" } }
    );
  }

  // 8) Valoraciones (ranking de cumplimiento) para el sorteo
  for (const v of VALORACIONES) {
    const existe = await ValoracionModel.findOne({
      establecimiento: idsColegios[v.colegio],
      actividad: idsActividades[v.actividad],
      anio,
      semestre,
    }).lean();
    if (!existe) {
      await valService.asignar({
        establecimiento: idsColegios[v.colegio],
        actividad: idsActividades[v.actividad],
        estado: v.estado,
        anio,
        semestre,
      });
    }
  }
  console.log("[SEED] Valoraciones de cumplimiento listas");
}

if (require.main === module) {
  initDatabase()
    .then(async () => {
      await ejecutarSeed();
      console.log("[SEED] Proceso completado");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[SEED] Error:", err);
      process.exit(1);
    });
}

module.exports = { ejecutarSeed };