const mongoose = require("mongoose");

// Registro de asistencia de un alumno a un encuentro.
const asistenciaSchema = new mongoose.Schema({
  encuentro: { type: mongoose.Schema.Types.ObjectId, required: true },
  presente: { type: Boolean, default: true },
});

// Alumno participante en una actividad.
const alumnoSchema = new mongoose.Schema(
  {
    rut: { type: String, required: true, trim: true, uppercase: true },
    nombre: { type: String, required: true, trim: true },
    genero: { type: String, enum: ["M", "F", "Otro"], required: true },
    fechaNacimiento: { type: Date, required: true },
    apoderado: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    telefono: { type: String, trim: true, default: "" },
    establecimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establecimiento",
      required: true,
    },
    actividad: { type: mongoose.Schema.Types.ObjectId, ref: "Actividad", required: true },
    division: { type: String, required: true },
    inscripcion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inscripcion",
      required: true,
    },
    asistencia: [asistenciaSchema],
  },
  { timestamps: true }
);

alumnoSchema.index({ rut: 1, actividad: 1 }, { unique: true });

module.exports = mongoose.model("Alumno", alumnoSchema);