require("dotenv").config();
const AuthService = require("../services/AuthService");
// Read the file and patch with debug
const fs = require("fs");
let code = fs.readFileSync("services/AuthService.js", "utf8");
code = code.replace(
  "      if (est) {\n        const todos = await this.#usuarios.obtenerTodos();\n        usuario = todos.find",
  "      if (est) {\n        const todos = await this.#usuarios.obtenerTodos();\n        console.log('DEBUG est.id', est.id, 'todos count', todos.length);\n        console.log('DEBUG coords', todos.filter(u=>u.rol==='coordinador').map(u=>({rut:u.rut,est:u.establecimiento})));\n        usuario = todos.find"
);
const m = new (require("module").Module)();
// eval with module context
const vm = require("vm");
const ctx = { require, console, process, __dirname: process.cwd() };
vm.runInNewContext(code, ctx);
// AuthService is not exported from eval; instead, instantiate via require of original but patched file
// Simpler: write patched file and require
fs.writeFileSync("_pruebas/AuthService_debug.js", code);
const AS = require("../_pruebas/AuthService_debug");
const s = new AS();
s.login("4160", "coord123").then(r => console.log("OK", r.usuario.nombre)).catch(e => console.error("FAIL", e.message));
