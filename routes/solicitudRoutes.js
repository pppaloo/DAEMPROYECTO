const express = require("express");
const SolicitudController = require("../controllers/SolicitudController");
const autenticar = require("../middleware/auth");
const autorizarRol = require("../middleware/validateRol");
const soloLecturaDireccion = require("../middleware/soloLectura");

const router = express.Router();
const controller = new SolicitudController();

router.use(autenticar);
router.use(soloLecturaDireccion);

// El coordinador responde las solicitudes internas de su establecimiento y
// propone estudiantes; el admin aprueba/rechaza las inscripciones.
router.get("/", autorizarRol("admin", "coordinador"), (req, res) =>
  controller.obtenerTodos(req, res)
);
router.post("/estudiante", autorizarRol("admin", "coordinador"), (req, res) =>
  controller.crearEstudiante(req, res)
);
router.put("/:id/estado", autorizarRol("admin", "coordinador"), (req, res) =>
  controller.cambiarEstado(req, res)
);
router.delete("/:id", autorizarRol("admin", "coordinador"), (req, res) => controller.eliminar(req, res));

module.exports = router;