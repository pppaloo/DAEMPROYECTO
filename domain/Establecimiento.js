const { DEPENDENCIAS } = require("../constants/catalogos");

// Establecimiento educacional participante (RBD del MINEDUC, solo numeros).
class Establecimiento {
  #codigo;
  #nombre;
  #dependencia;
  #direccion;
  #contacto;

  constructor(codigo, nombre, dependencia, direccion = "", contacto = "") {
    this.codigo = codigo;
    this.nombre = nombre;
    this.dependencia = dependencia;
    this.direccion = direccion;
    this.contacto = contacto;
  }

  static esDependenciaValida(dependencia) {
    return Object.values(DEPENDENCIAS).includes(dependencia);
  }

  get codigo() {
    return this.#codigo;
  }

  set codigo(valor) {
    const limpio = String(valor || "").trim();
    // RBD del MINEDUC: solo numeros, de 1 a 6 digitos (sin letras ni simbolos).
    if (!/^\d{1,6}$/.test(limpio)) {
      throw new Error("El RBD debe tener solo numeros (1 a 6 digitos)");
    }
    this.#codigo = limpio;
  }

  get nombre() {
    return this.#nombre;
  }

  set nombre(valor) {
    const limpio = String(valor || "").trim();
    if (limpio.length < 3) throw new Error("El nombre del establecimiento es obligatorio");
    this.#nombre = limpio;
  }

  get dependencia() {
    return this.#dependencia;
  }

  set dependencia(valor) {
    if (!Establecimiento.esDependenciaValida(valor)) {
      throw new Error(`Dependencia invalida. Opciones: ${Object.values(DEPENDENCIAS).join(", ")}`);
    }
    this.#dependencia = valor;
  }

  get direccion() {
    return this.#direccion;
  }

  set direccion(valor) {
    this.#direccion = String(valor || "").trim();
  }

  get contacto() {
    return this.#contacto;
  }

  set contacto(valor) {
    this.#contacto = String(valor || "").trim();
  }

  obtenerResumen() {
    return {
      codigo: this.#codigo,
      nombre: this.#nombre,
      dependencia: this.#dependencia,
      direccion: this.#direccion,
      contacto: this.#contacto,
    };
  }
}

module.exports = Establecimiento;