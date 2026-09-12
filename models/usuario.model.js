const mongoose = require("mongoose");

// Usuario: Admin DAEM, Coordinador de establecimiento o Encargado de actividad.
const usuarioSchema = new mongoose.Schema(
  {
    rut: { type: String, required: true, unique: true, trim: true, uppercase: true },
    nombre: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    telefono: { type: String, trim: true, default: "" },
    rol: {
      type: String,
      required: true,
      enum: ["admin", "coordinador", "encargado", "director"],
      default: "coordinador",
    },
    claveHash: { type: String, required: true },
    establecimiento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establecimiento",
      default: null,
    },
    // Actividades asignadas (solo relevante para encargados).
    actividades: [{ type: mongoose.Schema.Types.ObjectId, ref: "Actividad" }],
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

usuarioSchema.methods.obtenerPublico = function () {
  return {
    id: this._id,
    rut: this.rut,
    nombre: this.nombre,
    email: this.email,
    telefono: this.telefono,
    rol: this.rol,
    establecimiento: this.establecimiento,
    actividades: this.actividades,
    activo: this.activo,
  };
};

module.exports = mongoose.model("Usuario", usuarioSchema);