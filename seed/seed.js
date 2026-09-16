require("dotenv").config();
const { initDatabase } = require("../config/database");

const AuthService = require("../services/AuthService");
const EstablecimientoService = require("../services/EstablecimientoService");
const UsuarioService = require("../services/UsuarioService");
const ActividadService = require("../services/ActividadService");
const SeccionService = require("../services/SeccionService");
const TorneoService = require("../services/TorneoService");
const InscripcionService = require("../services/InscripcionService");
const ValoracionService = require("../services/ValoracionService");
const EquipoService = require("../services/EquipoService");

const EstablecimientoModel = require("../models/establecimiento.model");
const UsuarioModel = require("../models/usuario.model");
const ActividadModel = require("../models/actividad.model");
const SeccionModel = require("../models/seccion.model");
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

const ACTIVIDADES_BASE = [
  {
    clave: "Futbol",
    nombre: "Futbol",
    area: "Deportiva",
    seccion: null,
    divisiones: ["MINIS", "SUB 13", "SUB 14", "JUVENIL"],
    recintos: ["Cancha 1", "Polideportivo"],
    encuentros: [
      { fecha: "2026-04-15", hora: "10:00", lugar: "Cancha 1" },
      { fecha: "2026-04-22", hora: "15:00", lugar: "Polideportivo" },
    ],
  },
  {
    clave: "Basquetbol",
    nombre: "Basquetbol",
    area: "Deportiva",
    seccion: null,
    divisiones: ["SUB 13", "JUVENIL", "DAMAS"],
    recintos: ["Polideportivo", "Gimnasio B"],
    encuentros: [{ fecha: "2026-04-18", hora: "11:00", lugar: "Polideportivo" }],
  },
  {
    clave: "Danza",
    nombre: "Danza",
    area: "Artístico/Cultural",
    seccion: null,
    divisiones: ["DAMAS", "JUVENIL"],
    recintos: ["Sala de Artes"],
    encuentros: [{ fecha: "2026-05-02", hora: "17:00", lugar: "Sala de Artes" }],
  },
  {
    clave: "Ajedrez",
    nombre: "Ajedrez",
    area: "Deportiva",
    seccion: null,
    divisiones: ["MINIS", "SUB 13"],
    recintos: ["Sala 204"],
    encuentros: [{ fecha: "2026-05-09", hora: "09:30", lugar: "Sala 204" }],
  },
];

// Categorias del listado "Creacion de Actividades Extraescolares".
// Seccion -> Actividad (disciplina) -> Categoria -> Subcategoria.
const DC = (nombre, subcategorias = []) => ({ nombre, subcategorias });
const DV = ["Damas", "Varones"];

const SECCIONES = [
  { clave: "JDM", nombre: "Juegos Deportivos Municipales de la Educación Pública", area: "Deportiva" },
  { clave: "JDE", nombre: "Juegos Deportivos Escolares (JDE) Intercursos", area: "Deportiva" },
  { clave: "ENCMINI", nombre: "Encuentros Mini", area: "Deportiva" },
  { clave: "DIAESP", nombre: "Días Especiales", area: "Deportiva" },
  { clave: "ARTISTICO", nombre: "Artístico Cultural", area: "Artístico/Cultural" },
  { clave: "MUESTRAS", nombre: "Muestras Culturales", area: "Artístico/Cultural" },
];

// Disciplinas segun el listado (Juegos Deportivos Municipales de la
// Educacion Publica): los torneos municipales se despliegan por categoria.
const ACTIVIDADES_JDM = [
  "Futsal", "Basquetbol", "Voleibol", "Balonmano",
  "Tenis de mesa", "Ajedrez", "Atletismo",
];

// En JUVENIL el listado no incluye Futsal (solo SUB 13).
const ACTIVIDADES_JDM_JUVENIL = [
  "Basquetbol", "Voleibol", "Balonmano",
  "Tenis de mesa", "Ajedrez", "Atletismo",
];

// JDE Intercursos: SUB 14 y JUVENIL. Futsal solo en SUB 14.
const ACTIVIDADES_JDE = [
  "Futsal", "Basquetbol", "Voleibol", "Balonmano", "Tenis de mesa",
  "Ajedrez", "Atletismo", "Para atletismo", "Ciclismo", "Judo", "Natación",
];
const ACTIVIDADES_JDE_JUVENIL = [
  "Basquetbol", "Voleibol", "Balonmano", "Tenis de mesa",
  "Ajedrez", "Atletismo", "Para atletismo", "Ciclismo", "Judo", "Natación",
];

const ACTIVIDADES_ARTISTICAS = [
  { nombre: "Cueca", categorias: [DC("Huasa", ["Básica", "Media"]), DC("Lugareña", ["Básica", "Media"])] },
  { nombre: "Dibujo y pintura", categorias: ["NT1 y NT2", "1° a 2° Básico", "3° a 4° Básico", "5° a 6° Básico", "7° a 8° Básico", "1° a 4° Medio"].map((c) => DC(c)) },
  { nombre: "Declamación", categorias: ["NT1 y NT2", "1° a 4° Básico", "5° a 8° Básico", "1° a 4° Medio"].map((c) => DC(c)) },
  { nombre: "Festival de la voz", categorias: ["1° a 4° Básico", "5° a 8° Básico", "1° a 4° Medio", "Docentes/Asistentes de la educación"].map((c) => DC(c)) },
  { nombre: "Team de baile", categorias: ["1° Ciclo Básica", "2° Ciclo Básica", "Enseñanza Media"].map((c) => DC(c)) },
];

const ACTIVIDADES_MUESTRAS = [
  "Muestra de Danzas Folclóricas", "Muestra de conjuntos folclóricos",
  "Pañuelos al viento", "Teatro",
];

const ACTIVIDADES_MINI = [
  "Mini Basquetbol", "Mini Voleibol", "Mini Balonmano", "Mini Futsal",
  "Mini Tenis de mesa", "Mini Atletismo", "Mini Ajedrez",
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
  const equipoService = new EquipoService();

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

  // 3b) Secciones (eventos que agrupan actividades)
  const idsSecciones = {};
  const secService = new SeccionService();
  if (!(await existenDocumentos(SeccionModel))) {
    for (const s of SECCIONES) {
      const creada = await secService.crear({ nombre: s.nombre, area: s.area, anio });
      idsSecciones[s.clave] = creada._id;
      console.log("[SEED] Seccion:", s.nombre, "(" + s.area + ")");
    }
  } else {
    for (const s of SECCIONES) {
      const doc = await SeccionModel.findOne({ nombre: s.nombre }).lean();
      idsSecciones[s.clave] = doc ? doc._id : null;
    }
  }

  // 4) Actividades (base + listado extraescolar jerarquico)
  const idsActividades = {};

  async function crearActividadSiNoExiste(a) {
    const filtro = { nombre: a.nombre, area: a.area };
    if (a.seccion) filtro.seccion = a.seccion;
    const existente = await ActividadModel.findOne(filtro).lean();
    if (existente) return existente._id;
    const creada = await actService.crear({ ...a, anio, estado: "en_inscripcion" });
    console.log("[SEED] Actividad:", a.nombre, "(" + a.area + ")" + (a.seccion ? " [seccion]" : ""));
    return creada._id;
  }

  async function sembrarActividades() {
    for (const a of ACTIVIDADES_BASE) {
      idsActividades[a.clave] = await crearActividadSiNoExiste(a);
    }

    const categoriasCon = (cats) =>
      cats.map((c) => (typeof c === "string" ? { nombre: c, subcategorias: [] } : c));

    // Juegos Deportivos Municipales: SUB 13 (Damas/Varones) y JUVENIL.
    for (const disciplina of ACTIVIDADES_JDM) {
      const categorias = [DC("SUB 13", DV)];
      if (ACTIVIDADES_JDM_JUVENIL.includes(disciplina)) categorias.push(DC("JUVENIL", DV));
      const id = await crearActividadSiNoExiste({
        clave: disciplina,
        nombre: disciplina,
        area: "Deportiva",
        seccion: idsSecciones.JDM,
        categorias,
      });
      idsActividades[`JDM_${disciplina}`] = id;
    }

    // JDE Intercursos: SUB 14 (Damas/Varones) y JUVENIL.
    for (const disciplina of ACTIVIDADES_JDE) {
      const categorias = [DC("SUB 14", DV)];
      if (ACTIVIDADES_JDE_JUVENIL.includes(disciplina)) categorias.push(DC("JUVENIL", DV));
      const id = await crearActividadSiNoExiste({
        clave: disciplina,
        nombre: disciplina,
        area: "Deportiva",
        seccion: idsSecciones.JDE,
        categorias,
      });
      idsActividades[`JDE_${disciplina}`] = id;
    }

    // Encuentros Mini: disciplinas mini (sin categorias fijas).
    for (const disciplina of ACTIVIDADES_MINI) {
      await crearActividadSiNoExiste({
        clave: disciplina,
        nombre: disciplina,
        area: "Deportiva",
        seccion: idsSecciones.ENCMINI,
        categorias: [],
      });
    }

    // Dias Especiales (no competitivos): sin categorias.
    for (const nombre of ["Día de la Actividad Física", "Día del Extraescolar"]) {
      await crearActividadSiNoExiste({
        clave: nombre,
        nombre,
        area: "Deportiva",
        seccion: idsSecciones.DIAESP,
        categorias: [],
      });
    }

    // Artistico Cultural: actividades con categorias libres.
    for (const a of ACTIVIDADES_ARTISTICAS) {
      await crearActividadSiNoExiste({
        clave: a.nombre,
        nombre: a.nombre,
        area: "Artístico/Cultural",
        seccion: idsSecciones.ARTISTICO,
        categorias: categoriasCon(a.categorias),
      });
    }

    // Muestras Culturales: actividades con Enseñanza Basica / Media.
    for (const nombre of ACTIVIDADES_MUESTRAS) {
      await crearActividadSiNoExiste({
        clave: nombre,
        nombre,
        area: "Artístico/Cultural",
        seccion: idsSecciones.MUESTRAS,
        categorias: [DC("Enseñanza Básica"), DC("Enseñanza Media")],
      });
    }
  }

  if (!(await existenDocumentos(ActividadModel))) {
    await sembrarActividades();
  } else {
    for (const a of ACTIVIDADES_BASE) {
      idsActividades[a.clave] = (await ActividadModel.findOne({ nombre: a.nombre }).lean())._id;
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

  // 6) Torneo de Futbol (una categoria especifica de la actividad)
  let torneo = await TorneoModel.findOne({ nombre: "Torneo Comunal de Futbol SUB 13 2026" }).lean();
  if (!torneo) {
    const doc = await torService.crear({
      nombre: "Torneo Comunal de Futbol SUB 13 2026",
      actividad: idsActividades.Futbol,
      division: "SUB 13",
      anio,
      semestre,
      estado: "inscripciones",
      grupos: ["Llave"],
      formulario: { permiteEncargados: true, fechaToPe: new Date("2026-03-30") },
      requisitos: { activo: false, edadMinima: null, edadMaxima: null, genero: "" },
      fechaAperturaInscripcion: new Date(`2026-01-01`),
      fechaCierreInscripcion: new Date(`2027-12-31`),
    });
    torneo = await TorneoModel.findById(doc._id).lean();
    console.log("[SEED] Torneo:", torneo.nombre, "|", torneo.division);
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
    await inscService.asociarTorneo(inscA._id, torneo._id, { rol: "admin", rut: ROLES_ADMIN.rut });
    await inscService.cambiarEstado(inscA._id, "aceptada", { rol: "admin" });

    const inscB = await inscService.crear(
      {
        establecimiento: idsColegios["B-112"],
        actividad: idsActividades.Futbol,
        division: "SUB 13",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.asociarTorneo(inscB._id, torneo._id, { rol: "admin", rut: ROLES_ADMIN.rut });
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

    // Alumnos para el resto de inscripciones del torneo: el pool de
    // estudiantes permite formar equipos mixtos (sorteo automatico).
    await inscService.agregarAlumno(
      inscB._id,
      {
        rut: "17171717-5",
        nombre: "Fernando Silva",
        genero: "M",
        fechaNacimiento: "2014-11-03",
        apoderado: "Rosa Silva",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.agregarAlumno(
      inscB._id,
      {
        rut: "18181818-2",
        nombre: "Camila Nunez",
        genero: "F",
        fechaNacimiento: "2013-06-21",
        apoderado: "Diego Nunez",
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
    await inscService.asociarTorneo(inscB2._id, torneo._id, { rol: "admin", rut: ROLES_ADMIN.rut });
    await inscService.cambiarEstado(inscB2._id, "aceptada", { rol: "admin" });
    await inscService.agregarAlumno(
      inscB2._id,
      {
        rut: "20202020-8",
        nombre: "Mateo Paredes",
        genero: "M",
        fechaNacimiento: "2017-04-12",
        apoderado: "Andrea Paredes",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );

    const inscC = await inscService.crear(
      {
        establecimiento: idsColegios["D-868"],
        actividad: idsActividades.Futbol,
        division: "JUVENIL",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.asociarTorneo(inscC._id, torneo._id, { rol: "admin", rut: ROLES_ADMIN.rut });
    await inscService.cambiarEstado(inscC._id, "aceptada", { rol: "admin" });
    await inscService.agregarAlumno(
      inscC._id,
      {
        rut: "23232323-K",
        nombre: "Diego Fuentes",
        genero: "M",
        fechaNacimiento: "2010-09-19",
        apoderado: "Sara Fuentes",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );

    // A-59 (coordinador Pedro Gonzalez) recibe inscripciones aceptadas en varias
    // categorias para que pueda agregar estudiantes a mas de una division.
    const inscA59Minis = await inscService.crear(
      {
        establecimiento: idsColegios["A-59"],
        actividad: idsActividades.Futbol,
        division: "MINIS",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.cambiarEstado(inscA59Minis._id, "aceptada", { rol: "admin" });

    const inscA59Juvenil = await inscService.crear(
      {
        establecimiento: idsColegios["A-59"],
        actividad: idsActividades.Futbol,
        division: "JUVENIL",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.cambiarEstado(inscA59Juvenil._id, "aceptada", { rol: "admin" });

    const inscA59Basquet = await inscService.crear(
      {
        establecimiento: idsColegios["A-59"],
        actividad: idsActividades.Basquetbol,
        division: "JUVENIL",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.cambiarEstado(inscA59Basquet._id, "aceptada", { rol: "admin" });

    // Ajedrez: inscripciones aceptadas con alumnos para el desglose por
    // categoria y el total de participantes del modulo Actividades.
    const inscAjeA = await inscService.crear(
      {
        establecimiento: idsColegios["A-59"],
        actividad: idsActividades.Ajedrez,
        division: "MINIS",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.cambiarEstado(inscAjeA._id, "aceptada", { rol: "admin" });
    await inscService.agregarAlumno(
      inscAjeA._id,
      {
        rut: "14141414-3",
        nombre: "Emma Soto",
        genero: "F",
        fechaNacimiento: "2017-03-22",
        apoderado: "Claudia Soto",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.agregarAlumno(
      inscAjeA._id,
      {
        rut: "15151515-0",
        nombre: "Benjamin Cruz",
        genero: "M",
        fechaNacimiento: "2016-07-08",
        apoderado: "Rosa Cruz",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );

    const inscAjeB = await inscService.crear(
      {
        establecimiento: idsColegios["C-204"],
        actividad: idsActividades.Ajedrez,
        division: "SUB 13",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );
    await inscService.cambiarEstado(inscAjeB._id, "aceptada", { rol: "admin" });
    await inscService.agregarAlumno(
      inscAjeB._id,
      {
        rut: "16161616-8",
        nombre: "Valentina Pino",
        genero: "F",
        fechaNacimiento: "2013-09-30",
        apoderado: "Jorge Pino",
      },
      { rol: "admin", rut: ROLES_ADMIN.rut }
    );

    console.log("[SEED] Inscripciones y alumnos de ejemplo creados");
    void coordB112;
  }

  // 7b) Sorteo de ejemplo y fechas de encuentro (para la agenda de torneos)
  const LlaveModel = require("../models/llave.model");
  const EquipoModel = require("../models/equipo.model");
  const tieneEquipos = await EquipoModel.countDocuments({ torneo: torneo._id });
  if (tieneEquipos === 0) {
    try {
      await equipoService.sortear(torneo._id, { cantidad: 4 });
      console.log("[SEED] Equipos sorteados para el torneo de Futbol");
    } catch (e) {
      console.log("[SEED] Sorteo de equipos omitido:", e.message);
    }
  }
  const tieneLlaves = await LlaveModel.countDocuments({ torneo: torneo._id });
  if (tieneLlaves === 0) {
    try {
      await torService.ejecutarSorteo(torneo._id);
      const llavesGrupo = await LlaveModel.find({ torneo: torneo._id, nivel: 0 }).lean();
      // Juega algunos cruces de la fase de grupos para una tabla de puntajes viva.
      const marcadores = [1, 2, 0];
      for (let i = 0; i < llavesGrupo.length && i < 3; i++) {
        const l = llavesGrupo[i];
        if (!l.equipos || l.equipos.length < 2) continue;
        const pa = marcadores[i % marcadores.length];
        const pb = pa === 0 ? 2 : pa - 1;
        await torService.registrarResultado(l._id, { puntajeA: pa, puntajeB: pb });
      }
      await torService.ejecutarBracket(torneo._id);
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