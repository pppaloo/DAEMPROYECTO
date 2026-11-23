require("dotenv").config();
const DirectorioService = require("../services/DirectorioService");
const fs = require("fs");
const d = new DirectorioService();
d.buscar({ limite: 2000 }).then((r) => {
  fs.writeFileSync("_pruebas/directorio_biobio.json", JSON.stringify(r.resultados, null, 2));
  console.log("Guardados", r.resultados.length, "establecimientos");
}).catch((e) => console.error("ERR", e.message));
