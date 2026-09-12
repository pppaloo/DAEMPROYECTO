const { ESTADOS_TORNEO } = require("../constants/catalogos");

// Torneo organizado por el Admin DAEM para una actividad.
// Genera grupos (ej: Grupo A) y contiene las llaves del sorteo.
class Torneo {
  #nombre;
  #actividad;
  #anio;
  #semestre;
  #estado;
  #grupos;
  #formulario;

  constructor(nombre, actividad, anio, semestre, estado = ESTADOS_TORNEO.INSCRIPCIONES, grupos = [], formulario = {}) {
    this.nombre = nombre;
    this.actividad = actividad;
    this.anio = anio;
    this.semestre = semestre;
    this.estado = estado;
    this.grupos = grupos;
    this.formulario = formulario;
  }

  get nombre() {
    return this.#nombre;
  }

  set nombre(valor) {
    const limpio = String(valor || "").trim();
    if (limpio.length < 3) throw new Error("El nombre del torneo debe tener al menos 3 caracteres");
    this.#nombre = limpio;
  }

  get actividad() {
    return this.#actividad;
  }

  set actividad(valor) {
    if (!valor) throw new Error("El torneo requiere una actividad asociada");
    this.#actividad = valor;
  }

  get anio() {
    return this.#anio;
  }

  set anio(valor) {
    const n = parseInt(valor, 10);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new Error("Anio invalido");
    this.#anio = n;
  }

  get semestre() {
    return this.#semestre;
  }

  set semestre(valor) {
    const n = parseInt(valor, 10);
    if (n !== 1 && n !== 2) throw new Error("El semestre debe ser 1 o 2");
    this.#semestre = n;
  }

  get estado() {
    return this.#estado;
  }

  set estado(valor) {
    if (!Object.values(ESTADOS_TORNEO).includes(valor)) {
      throw new Error("Estado de torneo invalido");
    }
    this.#estado = valor;
  }

  get grupos() {
    return this.#grupos;
  }

  set grupos(valor) {
    const lista = Array.isArray(valor) ? valor : [];
    this.#grupos = lista.length
      ? lista.filter((g) => String(g || "").trim().length > 0)
      : ["Grupo A"];
  }

  get formulario() {
    return this.#formulario;
  }

  set formulario(valor) {
    this.#formulario = valor && typeof valor === "object" ? valor : {};
  }

  permitirInscripciones() {
    return this.#estado === ESTADOS_TORNEO.INSCRIPCIONES;
  }

  obtenerResumen() {
    return {
      nombre: this.#nombre,
      actividad: this.#actividad,
      anio: this.#anio,
      semestre: this.#semestre,
      estado: this.#estado,
      grupos: this.#grupos,
      formulario: this.#formulario,
    };
  }
}

module.exports = Torneo;