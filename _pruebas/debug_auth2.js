require("dotenv").config();
const fs = require("fs");
let code = fs.readFileSync("services/AuthService.js", "utf8");
code = code.replace(
  "        usuario = todos.find((u) => [\"coordinador\", \"lector\"].includes(String(u.rol)) && String(u.establecimiento && (u.establecimiento.id ?? u.establecimiento._id ?? u.establecimiento)) === String(est.id));",
  "        const found = todos.find((u) => [\"coordinador\", \"lector\"].includes(String(u.rol)) && String(u.establecimiento && (u.establecimiento.id ?? u.establecimiento._id ?? u.establecimiento)) === String(est.id));\n        console.log('DEBUG found', found ? found.rut : null);\n        usuario = found;"
);
fs.writeFileSync("_pruebas/AuthService_debug2.js", code);
const AuthService = require("../_pruebas/AuthService_debug2");
const s = new AuthService();
s.login("4160", "coord123").then(r => console.log("OK", r.usuario.nombre)).catch(e => console.error("FAIL", e.message));
