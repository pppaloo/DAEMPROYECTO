const fs = require("fs");
const p = "services/AuthService.js";
let s = fs.readFileSync(p, "utf8");
const old = '      if (est) {\n        const todos = await this.#usuarios.obtenerTodos();\n        usuario = todos.find';
const neu = '      if (est) {\n        const todos = await this.#usuarios.obtenerTodos();\n        console.log("DEBUG est.id", est.id, "todos", todos.length);\n        console.log("DEBUG coords", todos.filter(u=>u.rol==="coordinador").map(u=>({rut:u.rut,est:u.establecimiento})));\n        usuario = todos.find';
if (!s.includes(old)) { console.error("old not found"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("patched");
