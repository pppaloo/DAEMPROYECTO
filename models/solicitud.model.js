const mongoose = require("mongoose");

// Solicitud interna (recursos/participacion) del Encargado al Coordinador.
const solicitudSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["recursos", "participacion", "otro"], required: true },
    detalle: { type: String, required: true, trim: true },
    estado: {
      type: String,
      enum: ["en_proceso", "aprobada", "rechazada"],
      default: "en_proceso",
    },
    rutEncargado: { type: String, trim: true, required: true },
    rutCoordinador: { type: String, trim: true, default: "" },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", default: null },
    establecimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establecimiento",
      default: null,
    },
    respuesta: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Solicitud", solicitudSchema);