const { AREAS, ESTADOS_ACTIVIDAD, DIVISIONES } = require("../constants/catalogos");

// Actividad extraprogramatica publicada por el Admin DAEM.
// Se clasifica por area (Deportiva | Artistico/Cultural) y puede
// llevarse en una o mas divisiones. Incluye su calendario de encuentros.
class Actividad {
  #nombre;
  #area;
  #divisiones;
  #anio;
  #estado;
  #fechaAperturaInscripcion;
  #fechaCierreInscripcion;
  #edadMinima;
  #edadMaxima;
  #recintos;
  #encuentros;

  constructor(
    nombre,
    area,
    divisiones = [],
    anio = new Date().getFullYear(),
    estado = ESTADOS_ACTIVIDAD.PUBLICADA,
    fechaAperturaInscripcion = null,
    fechaCierreInscripcion = null,
    recintos = [],
    edadMinima = null,
    edadMaxima = null
  ) {
    this.nombre = nombre;
    this.area = area;
    this.divisiones = divisiones;
    this.anio = anio;
    this.estado = estado;
    this.fechaAperturaInscripcion = fechaAperturaInscripcion;
    this.fechaCierreInscripcion = fechaCierreInscripcion;
    this.recintos = recintos;
    this.edadMinima = edadMinima;
    this.edadMaxima = edadMaxima;
    this.#encuentros = [];
  }

  static esAreaValida(area) {
    return Object.values(AREAS).includes(area);
  }

  get nombre() {
    return this.#nombre;
  }

  set nombre(valor) {
    const limpio = String(valor || "").trim();
    if (limpio.length < 2) throw new Error("El nombre de la actividad es obligatorio");
    this.#nombre = limpio;
  }

  get area() {
    return this.#area;
  }

  set area(valor) {
    if (!Actividad.esAreaValida(valor)) {
      throw new Error(`Area invalida. Opciones: ${Object.values(AREAS).join(", ")}`);
    }
    this.#area = valor;
  }

  get divisiones() {
    return this.#divisiones;
  }

  set divisiones(valor) {
    const lista = Array.isArray(valor) ? valor : [valor];
    const validas = lista.filter((d) => DIVISIONES.some((x) => x.nombre === d));
    if (validas.length === 0) {
      throw new Error("Debe indicar al menos una division valida");
    }
    this.#divisiones = [...new Set(validas)];
  }

  get anio() {
    return this.#anio;
  }

  set anio(valor) {
    const n = parseInt(valor, 10);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new Error("Anio invalido");
    this.#anio = n;
  }

  get estado() {
    return this.#estado;
  }

  set estado(valor) {
    if (!Object.values(ESTADOS_ACTIVIDAD).includes(valor)) {
      throw new Error("Estado de actividad invalido");
    }
    this.#estado = valor;
  }

  get fechaAperturaInscripcion() {
    return this.#fechaAperturaInscripcion;
  }

  set fechaAperturaInscripcion(valor) {
    this.#fechaAperturaInscripcion = valor ? new Date(valor) : null;
  }

  get fechaCierreInscripcion() {
    return this.#fechaCierreInscripcion;
  }

  set fechaCierreInscripcion(valor) {
    this.#fechaCierreInscripcion = valor ? new Date(valor) : null;
  }

get edadMinima() {
    return this.#edadMinima;
  }

  set edadMinima(valor) {
    const n = valor === null || valor === undefined || valor === "" ? null : parseInt(valor, 10);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 120)) throw new Error("Edad minima invalida");
    this.#edadMinima = n;
  }

  get edadMaxima() {
    return this.#edadMaxima;
  }

  set edadMaxima(valor) {
    const n = valor === null || valor === undefined || valor === "" ? null : parseInt(valor, 10);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 120)) throw new Error("Edad maxima invalida");
    this.#edadMaxima = n;
  }

  get recintos() {
    return this.#recintos;
  }

  set recintos(valor) {
    this.#recintos = Array.isArray(valor)
      ? valor.filter((r) => String(r || "").trim().length > 0)
      : [];
  }

  get encuentros() {
    return this.#encuentros;
  }

  set encuentros(valor) {
    this.#encuentros = Array.isArray(valor) ? valor : [];
  }

  // Agrega un encuentro (fecha, hora, lugar fisico) al calendario de la actividad.
  agregarEncuentro(fecha, hora, lugar) {
    const nuevo = {
      fecha: new Date(fecha),
      hora,
      lugar: String(lugar || "").trim() || "Por definir",
    };
    if (Number.isNaN(nuevo.fecha.getTime())) throw new Error("Fecha de encuentro invalida");
    if (!nuevo.hora) throw new Error("La hora del encuentro es obligatoria");
    this.#encuentros.push(nuevo);
    return this.#encuentros.length - 1;
  }

  solicitudesAbiertas() {
    const ahora = new Date();
    const abierta = this.#estado === ESTADOS_ACTIVIDAD.PUBLICADA || this.#estado === ESTADOS_ACTIVIDAD.EN_INSCRIPCION;
    if (this.#fechaAperturaInscripcion && ahora < this.#fechaAperturaInscripcion) return false;
    if (this.#fechaCierreInscripcion && ahora > this.#fechaCierreInscripcion) return false;
    return abierta;
  }

  obtenerResumen() {
    return {
      nombre: this.#nombre,
      area: this.#area,
      divisiones: this.#divisiones,
      anio: this.#anio,
      estado: this.#estado,
      fechaAperturaInscripcion: this.#fechaAperturaInscripcion,
      fechaCierreInscripcion: this.#fechaCierreInscripcion,
      edadMinima: this.#edadMinima,
      edadMaxima: this.#edadMaxima,
      recintos: this.#recintos,
      encuentros: this.#encuentros,
    };
  }
}

module.exports = Actividad;