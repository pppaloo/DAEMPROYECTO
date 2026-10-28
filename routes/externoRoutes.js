const express = require("express");
const autenticar = require("../middleware/auth");
const ExternoController = require("../controllers/ExternoController");

const router = express.Router();
const controller = new ExternoController();

// APIs externas abiertas (solo requieren sesion). Lectura -> sin reCAPTCHA.
router.get("/feriados", autenticar, (req, res) => controller.feriados(req, res));
router.get("/feriados/es", autenticar, (req, res) => controller.esFeriado(req, res));
router.get("/directorio", autenticar, (req, res) => controller.directorio(req, res));

module.exports = router;
