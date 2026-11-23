const r = require("better-sqlite3");
const db = r("data/daem.db");
console.log(db.prepare("SELECT id,codigo,nombre FROM establecimientos WHERE id IN (122,127)").all());
