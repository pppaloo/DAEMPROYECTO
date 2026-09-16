const mongoose = require("mongoose");

// Equipo de un torneo: agrupa estudiantes de distintos establecimientos.
const equipoSchema = new mongoose.Schema(
  {
    torneo: { type: mongoose.Schema.Types.ObjectId, ref: "Torneo", required: true },
    nombre: { type: String, required: true, trim: true },
    alumnos: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Alumno" },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipo", equipoSchema);