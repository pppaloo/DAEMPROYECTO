const fs = require("fs");
const p = "public/js/api.js";
let lines = fs.readFileSync(p, "utf8").split("\n");
const idx = lines.findIndex((l) => l.includes("async solicitarEstudiante"));
console.log("idx", idx);
// insert after the closing "}," of that method
let i = idx;
while (i < lines.length && !lines[i].trim().endsWith("},") && !lines[i].trim().endsWith("}")) i++;
console.log("end", i, lines[i]);
lines.splice(i + 1, 0, "  async actualizarAlumno(id, datos) { return this.peticion(\"PUT\", `/api/alumnos/${id}`, datos); },");
fs.writeFileSync(p, lines.join("\n"));
console.log("done");
