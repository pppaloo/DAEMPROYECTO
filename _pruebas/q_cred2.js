const r = require("better-sqlite3");
const db = r("data/daem.db");
console.log(db.prepare("SELECT rut,nombre,rol,establecimiento FROM usuarios WHERE rol IN ('coordinador','lector')").all());
