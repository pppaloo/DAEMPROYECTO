const mongoose = require("mongoose");

// Llave / encuentro generado por el sorteo dentro de un torneo.
const llaveSchema = new mongoose.Schema(
  {
    torneo: { type: mongoose.Schema.Types.ObjectId, ref: "Torneo", required: true },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", required: true },
    division: { type: String, required: true },
    grupo: { type: String, default: "Llave" },
    equipos: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Equipo" },
    ],
    bye: { type: Boolean, default: false },
    fecha: { type: Date, default: null },
    hora: { type: String, default: "" },
    horaTermino: { type: String, default: "" },
    lugar: { type: String, default: "Por definir" },
    estado: { type: String, enum: ["pendiente", "jugado"], default: "pendiente" },
    puntajeA: { type: Number, default: null },
    puntajeB: { type: Number, default: null },
    ganador: { type: mongoose.Schema.Types.ObjectId, ref: "Equipo", default: null },
    posicion: { type: String, default: "" },
    // Estructura de llaves (mapa del torneo).
    nivel: { type: Number, default: 1 },
    orden: { type: Number, default: 0 },
    padre: { type: mongoose.Schema.Types.ObjectId, ref: "Llave", default: null },
    hijos: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Llave" },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Llave", llaveSchema);