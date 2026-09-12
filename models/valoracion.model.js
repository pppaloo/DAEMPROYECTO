const mongoose = require("mongoose");

// Valoracion (ranking de cumplimiento) de un establecimiento en una actividad.
const valoracionSchema = new mongoose.Schema(
  {
    establecimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establecimiento",
      required: true,
    },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", required: true },
    estado: {
      type: String,
      enum: ["cumple", "regular", "no_cumple"],
      default: "regular",
    },
    anio: { type: Number, required: true },
    semestre: { type: Number, required: true, enum: [1, 2] },
  },
  { timestamps: true }
);

valoracionSchema.index(
  { establecimiento: 1, actividad: 1, anio: 1, semestre: 1 },
  { unique: true }
);

module.exports = mongoose.model("Valoracion", valoracionSchema);