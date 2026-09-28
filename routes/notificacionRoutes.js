const { Router } = require("express");
const autenticar = require("../middleware/auth");
const autorizarRol = require("../middleware/validateRol");
const controller = new (require("../controllers/NotificacionController"))();

const router = Router();

router.use(autenticar);

// Historial del usuario logueado (campana y panel del dashboard).
router.get("/", autorizarRol("coordinador", "admin"), (req, res) => controller.listar(req, res));
// Quitar (X) una notificacion: sale del dashboard y del contador, pero queda
// en el historial.
router.post("/:id/descartar", autorizarRol("coordinador", "admin"), (req, res) => controller.descartar(req, res));
// Quitar todas las que estan en el dashboard.
router.post("/descartar-todas", autorizarRol("coordinador", "admin"), (req, res) => controller.descartarTodas(req, res));
// Revertir un descarte: la notificacion vuelve al dashboard.
router.post("/:id/restaurar", autorizarRol("coordinador", "admin"), (req, res) => controller.restaurar(req, res));
// Revertir todos los descartes.
router.post("/restaurar-todas", autorizarRol("coordinador", "admin"), (req, res) => controller.restaurarTodas(req, res));

module.exports = router;
