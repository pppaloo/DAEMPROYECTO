const express = require("express");
const SolicitudController = require("../controllers/SolicitudController");
const autenticar = require("../middleware/auth");
const autorizarRol = require("../middleware/validateRol");
const soloLecturaDireccion = require("../middleware/soloLectura");

const router = express.Router();
const controller = new SolicitudController();

router.use(autenticar);
router.use(soloLecturaDireccion);

// El encargado levanta solicitudes; el coordinador las responde.
router.post("/", autorizarRol("encargado"), (req, res) => controller.crear(req, res));
router.get("/", autorizarRol("admin", "coordinador", "encargado"), (req, res) =>
  controller.obtenerTodos(req, res)
);
router.put("/:id/estado", autorizarRol("coordinador"), (req, res) => controller.cambiarEstado(req, res));
router.delete("/:id", autorizarRol("encargado", "admin"), (req, res) => controller.eliminar(req, res));

module.exports = router;