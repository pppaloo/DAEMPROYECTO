const express = require("express");
const InscripcionController = require("../controllers/InscripcionController");
const autenticar = require("../middleware/auth");
const autorizarRol = require("../middleware/validateRol");
const soloLecturaDireccion = require("../middleware/soloLectura");

const router = express.Router();
const controller = new InscripcionController();

router.use(autenticar);
router.use(soloLecturaDireccion);

// Coordinador y Admin interactuan con las inscripciones.
router.get("/", autorizarRol("admin", "coordinador"), (req, res) => controller.obtenerTodos(req, res));
router.get("/nomina", autorizarRol("coordinador"), (req, res) => controller.nomina(req, res));
router.get("/:id", autorizarRol("admin", "coordinador"), (req, res) => controller.obtenerPorId(req, res));

router.post("/", autorizarRol("coordinador", "admin"), (req, res) => controller.crear(req, res));
router.post("/:id/alumnos", autorizarRol("coordinador", "admin"), (req, res) =>
  controller.agregarAlumno(req, res)
);
router.post("/:id/torneo", autorizarRol("admin"), (req, res) => controller.asociarTorneo(req, res));

router.put("/:id/estado", autorizarRol("admin"), (req, res) => controller.cambiarEstado(req, res));
router.put("/:id", autorizarRol("coordinador", "admin"), (req, res) => controller.modificar(req, res));
router.delete("/:id/alumnos/:alumnoId", autorizarRol("coordinador", "admin"), (req, res) =>
  controller.eliminarAlumno(req, res)
);
router.delete("/:id", autorizarRol("coordinador", "admin"), (req, res) => controller.retractar(req, res));

module.exports = router;