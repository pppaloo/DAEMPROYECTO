const mongoose = require("mongoose");

// Establecimiento educacional participante (ej: codigo A-59, D-868).
const establecimientoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    nombre: { type: String, required: true, trim: true },
    dependencia: {
      type: String,
      required: true,
      enum: ["Municipal", "Particular Subvencionado"],
    },
    direccion: { type: String, trim: true, default: "" },
    contacto: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Establecimiento", establecimientoSchema);