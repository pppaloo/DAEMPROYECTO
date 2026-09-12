const mongoose = require("mongoose");

// Inscripcion de un establecimiento (via coordinador) a una actividad.
const inscripcionSchema = new mongoose.Schema(
  {
    establecimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establecimiento",
      required: true,
    },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", required: true },
    division: { type: String, required: true },
    estado: {
      type: String,
      enum: ["en_proceso", "aceptada", "rechazada"],
      default: "en_proceso",
    },
    rutCoordinador: { type: String, trim: true, required: true },
    torneo: { type: mongoose.Schema.Types.ObjectId, ref: "Torneo", default: null },
    grupo: { type: String, default: "" },
    alumnos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Alumno" }],
    detalle: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

inscripcionSchema.index({ establecimiento: 1, actividad: 1, division: 1 }, { unique: true });

module.exports = mongoose.model("Inscripcion", inscripcionSchema);