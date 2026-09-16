const mongoose = require("mongoose");

// Torneo organizado para una actividad; contiene grupos y definicion
// del formulario de inscripcion.
const torneoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", required: true },
    division: { type: String, default: "" },
    formato: { type: String, enum: ["amistoso", "competitivo"], default: "amistoso" },
    anio: { type: Number, required: true },
    semestre: { type: Number, required: true, enum: [1, 2] },
    estado: {
      type: String,
      enum: ["inscripciones", "activo", "en_curso", "pausado", "postergado", "cancelado", "finalizado"],
      default: "inscripciones",
    },
    grupos: [{ type: String }],
    formulario: { type: mongoose.Schema.Types.Mixed, default: {} },
    requisitos: {
      activo: { type: Boolean, default: false },
      edadMinima: { type: Number, default: null },
      edadMaxima: { type: Number, default: null },
      genero: {
        type: String,
        enum: ["varones", "damas", "mixto", ""],
        default: "",
      },
    },
    fechaAperturaInscripcion: { type: Date, default: null },
    fechaCierreInscripcion: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Torneo", torneoSchema);