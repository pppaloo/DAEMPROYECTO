const mongoose = require("mongoose");

// Seccion/evento que agrupa actividades (ej. "Juegos Deportivos
// Municipales de la Educacion Publica", "JDE Intercursos").
const seccionSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    area: { type: String, required: true, enum: ["Deportiva", "Artístico/Cultural"] },
    anio: { type: Number, required: true, default: () => new Date().getFullYear() },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seccion", seccionSchema);