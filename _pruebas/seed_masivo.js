const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..");
const { obtenerConexion } = require(path.join(base, "db", "conexion"));
const { crearEsquema } = require(path.join(base, "db", "esquema"));
const bcrypt = require("bcryptjs");

// 1. Borrar DB
const dbPath = path.join(base, "data", "daem.db");
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
for (const ext of ["-wal", "-shm"]) {
  const p = dbPath + ext;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
console.log("DB borrada");

// 2. Crear esquema
crearEsquema();
const bd = obtenerConexion();
console.log("Esquema creado");

const now = new Date().toISOString();
const anio = 2026;

// 3. Admin
const adminHash = bcrypt.hashSync("admin123", 10);
bd.prepare(`INSERT INTO usuarios (rut,nombre,email,rol,claveHash,establecimiento,activo,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,?,?)`).run(
  "11111111-1", "Directora DAEM", "admin@daem.local", "admin", adminHash, null, now, now
);
console.log("Admin creado");

// 4. Establecimientos
const dir = JSON.parse(fs.readFileSync(path.join(base, "_pruebas", "directorio_biobio.json"), "utf8"));
const insertEst = bd.prepare(`INSERT INTO establecimientos (codigo,nombre,dependencia,direccion,contacto,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)`);
const estIds = {};
for (const e of dir) {
  const dep = e.dependencia || "Municipal";
  const r = insertEst.run(e.rbd, e.nombre, dep, e.direccion || "", "", now, now);
  estIds[e.rbd] = r.lastInsertRowid;
}
console.log("Establecimientos insertados:", Object.keys(estIds).length);

// 5. Actividades
const acts = [
  { nombre: "Futsal", area: "Deportiva", divisiones: ["SUB 13", "SUB 14", "JUVENIL"] },
  { nombre: "Basquetbol", area: "Deportiva", divisiones: ["SUB 13", "JUVENIL"] },
  { nombre: "Voleibol", area: "Deportiva", divisiones: ["SUB 13", "SUB 14", "JUVENIL"] },
  { nombre: "Teatro", area: "Artístico/Cultural", divisiones: ["Enseñanza Básica", "Enseñanza Media"] },
  { nombre: "Coro", area: "Artístico/Cultural", divisiones: ["Enseñanza Básica", "Enseñanza Media"] },
];
const actIds = {};
for (const a of acts) {
  const r = bd.prepare(`INSERT INTO actividades (nombre,area,categorias,divisiones,anio,semestre,estado,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`).run(
    a.nombre, a.area, JSON.stringify(a.divisiones.map(d => ({nombre: d, subcategorias: []}))), JSON.stringify(a.divisiones), anio, 1, "publicada", now, now
  );
  actIds[a.nombre] = r.lastInsertRowid;
}
console.log("Actividades creadas:", Object.keys(actIds));

// 6. Coordinadores
const estCodes = Object.keys(estIds);
const coordEst1 = estCodes[0];
const coordEst2 = estCodes[5];
const coord1Rut = "22222222-2";
const coord2Rut = "33333333-3";
const coordHash = bcrypt.hashSync("coord123", 10);
bd.prepare(`INSERT INTO usuarios (rut,nombre,email,rol,claveHash,establecimiento,activo,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,?,?)`).run(
  coord1Rut, "Coordinador Uno", "coord1@test.cl", "coordinador", coordHash, estIds[coordEst1], now, now
);
bd.prepare(`INSERT INTO usuarios (rut,nombre,email,rol,claveHash,establecimiento,activo,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,?,?)`).run(
  coord2Rut, "Coordinador Dos", "coord2@test.cl", "coordinador", coordHash, estIds[coordEst2], now, now
);
console.log("Coordinadores creados: RBD", coordEst1, coordEst2);

// 7. Lectores
const lectorHash = bcrypt.hashSync("director123", 10);
const lector1Rut = "77777777-7";
const lector2Rut = "88888888-8";
bd.prepare(`INSERT INTO usuarios (rut,nombre,email,rol,claveHash,establecimiento,activo,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,?,?)`).run(
  lector1Rut, "Director Uno", "dir1@test.cl", "lector", lectorHash, estIds[coordEst1], now, now
);
bd.prepare(`INSERT INTO usuarios (rut,nombre,email,rol,claveHash,establecimiento,activo,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,?,?)`).run(
  lector2Rut, "Director Dos", "dir2@test.cl", "lector", lectorHash, estIds[coordEst2], now, now
);
console.log("Lectores creados");

// 8. Estudiantes, inscripciones, solicitudes
const estudiantes = [
  { rut: "11.111.111-1", nombre: "Juan Perez", genero: "M", fecha: "2012-05-10", act: "Futsal", div: "SUB 13" },
  { rut: "22.222.222-2", nombre: "Maria Lopez", genero: "F", fecha: "2012-08-15", act: "Futsal", div: "SUB 13" },
  { rut: "33.333.333-3", nombre: "Pedro Rojas", genero: "M", fecha: "2011-03-10", act: "Basquetbol", div: "JUVENIL" },
  { rut: "44.444.444-4", nombre: "Ana Diaz", genero: "F", fecha: "2011-07-20", act: "Basquetbol", div: "JUVENIL" },
  { rut: "55.555.555-5", nombre: "Luis Soto", genero: "M", fecha: "2010-11-05", act: "Voleibol", div: "SUB 14" },
  { rut: "66.666.666-6", nombre: "Carla Mena", genero: "F", fecha: "2010-02-14", act: "Voleibol", div: "SUB 14" },
  { rut: "77.777.777-7", nombre: "Diego Fuentes", genero: "M", fecha: "2009-09-30", act: "Teatro", div: "Enseñanza Básica" },
  { rut: "88.888.888-8", nombre: "Sofia Vera", genero: "F", fecha: "2009-04-22", act: "Teatro", div: "Enseñanza Básica" },
  { rut: "99.999.999-9", nombre: "Carlos Muñoz", genero: "M", fecha: "2013-06-01", act: "Coro", div: "Enseñanza Media" },
  { rut: "10.101.010-0", nombre: "Lucia Rios", genero: "F", fecha: "2013-09-15", act: "Coro", div: "Enseñanza Media" },
];

const inscMap = {};
for (const estName of ["Futsal", "Basquetbol", "Voleibol", "Teatro", "Coro"]) {
  const actId = actIds[estName];
  const divs = acts.find(a => a.nombre === estName).divisiones;
  for (const div of divs.slice(0,1)) {
    const r = bd.prepare(`INSERT INTO inscripciones (establecimiento,actividad,division,estado,rutCoordinador,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)`).run(
      estIds[coordEst1], actId, div, "aceptada", coord1Rut, now, now
    );
    inscMap[estName + "-" + div] = r.lastInsertRowid;
  }
}

const porAct = {};
for (const e of estudiantes) {
  if (!porAct[e.act]) porAct[e.act] = [];
  porAct[e.act].push(e);
}
for (const [actName, ests] of Object.entries(porAct)) {
  const actId = actIds[actName];
  const div = ests[0].div;
  const inscId = inscMap[actName + "-" + div];
  const code = "SOL-" + actName.toUpperCase().slice(0,4) + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
  const sol = bd.prepare(`INSERT INTO solicitudes (codigo,tipo,detalle,estado,rutSolicitante,rutCoordinador,actividad,establecimiento,inscripcion,division,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    code, "inscripcion", `Inscripcion de ${ests.length} estudiantes en ${actName} - ${div}`, "aprobada", coord1Rut, coord1Rut, actId, estIds[coordEst1], inscId, div, now, now
  );
  const sid = sol.lastInsertRowid;
  for (const e of ests) {
    bd.prepare(`INSERT INTO solicitud_alumnos (solicitud,rut,nombre,genero,fechaNacimiento) VALUES (?,?,?,?,?)`).run(sid, e.rut, e.nombre, e.genero, e.fecha);
  }
  for (const e of ests) {
    const al = bd.prepare(`INSERT INTO alumnos (rut,nombre,genero,fechaNacimiento,establecimiento,actividad,division,inscripcion,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      e.rut, e.nombre, e.genero, e.fecha, estIds[coordEst1], actId, div, inscId, now, now
    );
    bd.prepare(`INSERT OR IGNORE INTO inscripcion_alumnos (inscripcion, alumno) VALUES (?,?)`).run(inscId, al.lastInsertRowid);
  }
}
console.log("Solicitudes y alumnos creados");

// 9. Torneos
const torneos = [
  { nombre: "Torneo Futsal SUB 13", act: "Futsal", div: "SUB 13", formato: "competitivo", estado: "inscripciones" },
  { nombre: "Torneo Voleibol JUVENIL", act: "Voleibol", div: "JUVENIL", formato: "amistoso", estado: "activo" },
  { nombre: "Torneo Basquetbol SUB 13", act: "Basquetbol", div: "SUB 13", formato: "competitivo", estado: "inscripciones" },
  { nombre: "Torneo Teatro Enseñanza Básica", act: "Teatro", div: "Enseñanza Básica", formato: "amistoso", estado: "en_curso" },
  { nombre: "Torneo Coro Enseñanza Media", act: "Coro", div: "Enseñanza Media", formato: "amistoso", estado: "inscripciones" },
];
for (const t of torneos) {
  const actId = actIds[t.act];
  const x = bd.prepare(`INSERT INTO torneos (nombre,actividad,division,formato,anio,semestre,estado,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`).run(t.nombre, actId, t.div, t.formato, anio, 1, t.estado, now, now);
  bd.prepare(`INSERT INTO llaves (torneo,actividad,division,fecha,hora,lugar,estado) VALUES (?,?,?,?,?,?,?)`).run(x.lastInsertRowid, actId, t.div, "2026-11-15", "10:00", "Cancha Principal", "pendiente");
}
console.log("Torneos creados:", torneos.length);

console.log("\n=== LISTADO DE USUARIOS ===");
console.log("Admin: RUT 11111111-1 / clave admin123");
console.log(`Coordinador 1: RBD ${coordEst1} / clave coord123 (RUT ${coord1Rut})`);
console.log(`Coordinador 2: RBD ${coordEst2} / clave coord123 (RUT ${coord2Rut})`);
console.log(`Director 1: RBD ${coordEst1} / clave director123 (RUT ${lector1Rut})`);
console.log(`Director 2: RBD ${coordEst2} / clave director123 (RUT ${lector2Rut})`);
console.log("\nEstablecimientos:", Object.keys(estIds).length);
console.log("Actividades:", Object.keys(actIds).join(", "));
console.log("Estudiantes:", estudiantes.length);
console.log("Inscripciones:", Object.keys(inscMap).length);
console.log("Solicitudes:", Object.keys(porAct).length);
console.log("Torneos:", torneos.length);
