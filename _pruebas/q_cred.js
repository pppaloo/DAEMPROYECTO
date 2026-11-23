const r = require("better-sqlite3");
const db = r("data/daem.db");
console.log(db.prepare("SELECT u.rut,u.nombre,u.rol,e.codigo,e.nombre FROM usuarios u LEFT JOIN establecimientos e ON e.id=u.establecimiento WHERE u.rol IN ('coordinador','lector')").all());
