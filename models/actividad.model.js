const mongoose = require("mongoose");

// Encendido/evento del calendario dentro de una actividad.
const encuentroSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    hora: { type: String, required: true },
    lugar: { type: String, default: "Por definir" },
  },
  { _id: true }
);

// Actividad extraprogramatica publicada por el Admin DAEM.
const actividadSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    area: { type: String, required: true, enum: ["Deportiva", "Artístico/Cultural"] },
    divisiones: [{ type: String }],
    anio: { type: Number, required: true, default: () => new Date().getFullYear() },
    estado: {
      type: String,
      enum: ["publicada", "en_inscripcion", "cerrada"],
      default: "publicada",
    },
    fechaAperturaInscripcion: { type: Date, default: null },
    fechaCierreInscripcion: { type: Date, default: null },
    edadMinima: { type: Number, default: null },
    edadMaxima: { type: Number, default: null },
    recintos: [{ type: String }],
    limiteInscritos: { type: Number, default: 0 },
    encuentros: [encuentroSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Actividad", actividadSchema);