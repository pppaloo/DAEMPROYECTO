const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { initDatabase, detenerDatabase } = require("./config/database");
const { ejecutarSeed } = require("./seed/seed");

const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const establecimientoRoutes = require("./routes/establecimientoRoutes");
const actividadRoutes = require("./routes/actividadRoutes");
const seccionRoutes = require("./routes/seccionRoutes");
const torneoRoutes = require("./routes/torneoRoutes");
const inscripcionRoutes = require("./routes/inscripcionRoutes");
const alumnoRoutes = require("./routes/alumnoRoutes");
const solicitudRoutes = require("./routes/solicitudRoutes");
const resultadoRoutes = require("./routes/resultadoRoutes");
const reporteRoutes = require("./routes/reporteRoutes");
const catalogRoutes = require("./routes/catalogRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/establecimientos", establecimientoRoutes);
app.use("/api/actividades", actividadRoutes);
app.use("/api/secciones", seccionRoutes);
app.use("/api/torneos", torneoRoutes);
app.use("/api/inscripciones", inscripcionRoutes);
app.use("/api/alumnos", alumnoRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/resultados", resultadoRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/catalogos", catalogRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    estado: "activo",
    proyecto: "DAEM",
    version: "1.0.0",
    baseDatos: "MongoDB",
    roles: ["admin", "coordinador", "encargado", "director"],
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function iniciarServidor() {
  await initDatabase();
  await ejecutarSeed();
  app.listen(PORT, () => {
    console.log(`DAEM corriendo en http://localhost:${PORT}`);
    console.log(`API disponible en http://localhost:${PORT}/api`);
  });
}

iniciarServidor().catch((err) => {
  console.error("Error al iniciar:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await detenerDatabase().catch(() => {});
  process.exit(0);
});

module.exports = app;