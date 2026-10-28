const express = require("express");
const autenticar = require("../middleware/auth");
const autorizarRol = require("../middleware/validateRol");
const {
  ROLES,
  AREAS,
  DEPENDENCIAS,
  DIVISIONES,
  ESTADOS_INSCRIPCION,
  ESTADOS_SOLICITUD,
  ESTADOS_ACTIVIDAD,
  ESTADOS_TORNEO,
  ESTADOS_CUMPLIMIENTO,
  TIPOS_SOLICITUD,
  POSICIONES,
} = require("../constants/catalogos");
const AreaRepository = require("../repositories/AreaRepository");

const router = express.Router();

function unificarAreas() {
  const repos = new AreaRepository();
  const unidos = new Set();
  for (const a of Object.values(AREAS)) unidos.add(a);
  for (const a of repos.obtenerTodos()) unidos.add(a.nombre);
  for (const a of repos.obtenerAreasEnUso()) unidos.add(a);
  return [...unidos].sort((x, y) => x.localeCompare(y, "es"));
}

// Catalogos de la aplicacion para poblar formularios del frontend.
router.get("/", autenticar, (req, res) => {
  res.json({
    roles: ROLES,
    areas: unificarAreas(),
    dependencias: Object.values(DEPENDENCIAS),
    divisiones: DIVISIONES,
    estadosInscripcion: ESTADOS_INSCRIPCION,
    estadosSolicitud: ESTADOS_SOLICITUD,
    estadosActividad: ESTADOS_ACTIVIDAD,
    estadosTorneo: ESTADOS_TORNEO,
    estadosCumplimiento: ESTADOS_CUMPLIMIENTO,
    tiposSolicitud: TIPOS_SOLICITUD,
    posiciones: POSICIONES,
  });
});

// Agregar una area nueva (solo admin).
router.post("/areas", autenticar, autorizarRol("admin"), (req, res) => {
  const nombre = String((req.body || {}).nombre || "").trim();
  if (!nombre) return res.status(400).json({ error: "Debe indicar el nombre del area" });
  if (nombre.length > 40) return res.status(400).json({ error: "El area no puede superar 40 caracteres" });
  try {
    const repos = new AreaRepository();
    if (unificarAreas().some((a) => String(a).toLowerCase() === nombre.toLowerCase())) {
      return res.status(400).json({ error: "Esa area ya existe" });
    }
    const area = repos.crear(nombre);
    res.status(201).json({ mensaje: "Area creada", area });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;