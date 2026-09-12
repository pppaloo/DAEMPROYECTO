const mongoose = require("mongoose");

// Torneo organizado para una actividad; contiene grupos y definicion
// del formulario de inscripcion.
const torneoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", required: true },
    anio: { type: Number, required: true },
    semestre: { type: Number, required: true, enum: [1, 2] },
    estado: {
      type: String,
      enum: ["inscripciones", "activo", "en_curso", "pausado", "postergado", "cancelado", "finalizado"],
      default: "inscripciones",
    },
    grupos: [{ type: String }],
    formulario: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Torneo", torneoSchema);