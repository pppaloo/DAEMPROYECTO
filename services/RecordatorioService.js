const { obtenerConexion } = require("../db/conexion");
const { nowISO } = require("../db/util");
const CorreoService = require("./CorreoService");

const VENTANAS = [
  { clave: "1d", ms: 24 * 60 * 60 * 1000, tolerancia: 30 * 60 * 1000 },
  { clave: "1h", ms: 60 * 60 * 1000, tolerancia: 5 * 60 * 1000 },
];

class RecordatorioService {
  #correo;
  constructor() {
    this.#correo = new CorreoService();
    this.#asegurarTabla();
  }

  #asegurarTabla() {
    const bd = obtenerConexion();
    bd.exec(`CREATE TABLE IF NOT EXISTS recordatorios_enviados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT NOT NULL UNIQUE,
      enviadoAt TEXT NOT NULL
    )`);
  }

  #yaEnviado(clave) {
    const bd = obtenerConexion();
    return !!bd.prepare(`SELECT 1 FROM recordatorios_enviados WHERE clave = ?`).get(clave);
  }

  #marcarEnviado(clave) {
    const bd = obtenerConexion();
    bd.prepare(`INSERT OR IGNORE INTO recordatorios_enviados (clave, enviadoAt) VALUES (?,?)`).run(clave, nowISO());
  }

  async #destinatarios() {
    const bd = obtenerConexion();
    return bd
      .prepare(`SELECT email, nombre FROM usuarios WHERE activo = 1 AND email IS NOT NULL AND email <> ''`)
      .all();
  }

  async #enviarATodos(asunto, html, clave) {
    if (this.#yaEnviado(clave)) return;
    const dests = await this.#destinatarios();
    for (const u of dests) {
      try {
        await this.#correo.enviar(u.email, asunto, html);
      } catch (e) {
        console.error("[RecordatorioService] error enviando a", u.email, e.message);
      }
    }
    this.#marcarEnviado(clave);
  }

  #parseFechaHora(fecha, hora) {
    if (!fecha) return null;
    const base = String(fecha).slice(0, 10);
    const h = String(hora || "00:00").slice(0, 5);
    const d = new Date(`${base}T${h}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  #enVentana(fechaEvento, ventana) {
    const ahora = Date.now();
    const diff = fechaEvento.getTime() - ahora;
    // dentro de la ventana: diff <= ms + tolerancia y diff >= ms - tolerancia
    return diff <= ventana.ms + ventana.tolerancia && diff >= ventana.ms - ventana.tolerancia;
  }

  async verificarYEnviar() {
    const bd = obtenerConexion();
    const ahora = Date.now();

    // 1) Encuentros de actividades
    const encuentros = bd
      .prepare(
        `SELECT e.id, e.fecha, e.hora, e.lugar, a.nombre AS actividadNombre
         FROM encuentros e JOIN actividades a ON a.id = e.actividad`
      )
      .all();
    for (const e of encuentros) {
      const fe = this.#parseFechaHora(e.fecha, e.hora);
      if (!fe) continue;
      for (const v of VENTANAS) {
        if (this.#enVentana(fe, v)) {
          const clave = `encuentro:${e.id}:${v.clave}`;
          const html = `<p>Recordatorio: el encuentro de la actividad <b>${e.actividadNombre}</b> se realizará el ${fe.toLocaleString("es-CL")} en ${e.lugar || "por definir"}.</p>`;
          await this.#enviarATodos(`Recordatorio de actividad: ${e.actividadNombre}`, html, clave);
        }
      }
    }

    // 2) Partidos de torneos (llaves)
    const llaves = bd
      .prepare(
        `SELECT l.id, l.fecha, l.hora, l.lugar, t.nombre AS torneoNombre
         FROM llaves l JOIN torneos t ON t.id = l.torneo
         WHERE l.fecha IS NOT NULL`
      )
      .all();
    for (const l of llaves) {
      const fe = this.#parseFechaHora(l.fecha, l.hora);
      if (!fe) continue;
      for (const v of VENTANAS) {
        if (this.#enVentana(fe, v)) {
          const clave = `llave:${l.id}:${v.clave}`;
          const html = `<p>Recordatorio: partido del torneo <b>${l.torneoNombre}</b> el ${fe.toLocaleString("es-CL")} en ${l.lugar || "por definir"}.</p>`;
          await this.#enviarATodos(`Recordatorio de torneo: ${l.torneoNombre}`, html, clave);
        }
      }
    }

    // 3) Apertura/cierre de inscripciones de actividades
    const acts = bd
      .prepare(`SELECT id, nombre, fechaAperturaInscripcion, fechaCierreInscripcion FROM actividades`)
      .all();
    for (const a of acts) {
      for (const [campo, etiqueta] of [
        ["fechaAperturaInscripcion", "apertura"],
        ["fechaCierreInscripcion", "cierre"],
      ]) {
        const fe = a[campo] ? new Date(a[campo]) : null;
        if (!fe || Number.isNaN(fe.getTime())) continue;
        for (const v of VENTANAS) {
          if (this.#enVentana(fe, v)) {
            const clave = `act-insc:${a.id}:${campo}:${v.clave}`;
            const html = `<p>Recordatorio: ${etiqueta} de inscripciones para la actividad <b>${a.nombre}</b> el ${fe.toLocaleString("es-CL")}.</p>`;
            await this.#enviarATodos(`Inscripciones ${etiqueta}: ${a.nombre}`, html, clave);
          }
        }
      }
    }

    // 4) Apertura/cierre de inscripciones de torneos
    const torneos = bd
      .prepare(`SELECT id, nombre, fechaAperturaInscripcion, fechaCierreInscripcion FROM torneos`)
      .all();
    for (const t of torneos) {
      for (const [campo, etiqueta] of [
        ["fechaAperturaInscripcion", "apertura"],
        ["fechaCierreInscripcion", "cierre"],
      ]) {
        const fe = t[campo] ? new Date(t[campo]) : null;
        if (!fe || Number.isNaN(fe.getTime())) continue;
        for (const v of VENTANAS) {
          if (this.#enVentana(fe, v)) {
            const clave = `torneo-insc:${t.id}:${campo}:${v.clave}`;
            const html = `<p>Recordatorio: ${etiqueta} de inscripciones para el torneo <b>${t.nombre}</b> el ${fe.toLocaleString("es-CL")}.</p>`;
            await this.#enviarATodos(`Inscripciones ${etiqueta}: ${t.nombre}`, html, clave);
          }
        }
      }
    }
  }

  iniciarScheduler() {
    // primera ejecucion tras 30s, luego cada 60s
    setTimeout(() => {
      this.verificarYEnviar().catch((e) => console.error("[RecordatorioService]", e));
      setInterval(() => {
        this.verificarYEnviar().catch((e) => console.error("[RecordatorioService]", e));
      }, 60 * 1000);
    }, 30 * 1000);
  }
}

module.exports = RecordatorioService;
module.exports.VENTANAS = VENTANAS;