const mongoose = require("mongoose");

// Posicion final de un establecimiento en un torneo (1º, 2º, 3º).
const posicionSchema = new mongoose.Schema(
  {
    torneo: { type: mongoose.Schema.Types.ObjectId, ref: "Torneo", required: true },
    establecimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establecimiento",
      required: true,
    },
    posicion: { type: String, enum: ["1º", "2º", "3º"], required: true },
  },
  { timestamps: true }
);

posicionSchema.index({ torneo: 1, establecimiento: 1, posicion: 1 }, { unique: true });

module.exports = mongoose.model("Posicion", posicionSchema);