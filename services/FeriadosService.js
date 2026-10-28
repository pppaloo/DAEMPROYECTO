// Feriados oficiales de Chile a traves de una API externa abierta.
// Fuente principal: api.boostr.cl  |  Respaldo: api.roison.cl
// (no requiere llave). Los resultados se cachean para no golpear la API.
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

async function traerJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizarBoostr(json) {
  const lista = (json && json.data) || [];
  return lista.map((h) => ({
    fecha: h.date,
    titulo: h.title,
    tipo: h.type || "",
    irrenunciable: !!h.inalienable,
    extra: h.extra || "",
  }));
}

function normalizarRoison(json, anio) {
  const lista = (json && json.data) || [];
  return lista
    .filter((h) => String(h.date || "").startsWith(String(anio)))
    .map((h) => ({
      fecha: h.date,
      titulo: h.title,
      tipo: h.type || "",
      irrenunciable: !!h.is_irrenunciable,
      extra: h.scope || "",
    }));
}

class FeriadosService {
  #cache = new Map();

  async obtenerAnio(anio) {
    const clave = Number(anio);
    if (!Number.isInteger(clave) || clave < 2000 || clave > 2100) {
      throw new Error("Año invalido");
    }
    const guardado = this.#cache.get(clave);
    if (guardado && Date.now() - guardado.ts < CACHE_TTL) return guardado.datos;

    let feriados = [];
    let fuente = "api.boostr.cl";
    try {
      feriados = normalizarBoostr(await traerJson(`https://api.boostr.cl/holidays/${clave}.json`));
    } catch {
      feriados = [];
    }
    if (!feriados.length) {
      fuente = "api.roison.cl";
      feriados = normalizarRoison(await traerJson("https://api.roison.cl/feriados.json"), clave);
    }
    feriados.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const datos = { anio: clave, feriados, fuente };
    this.#cache.set(clave, { ts: Date.now(), datos });
    return datos;
  }

  async esFeriado(fecha) {
    const f = String(fecha || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) throw new Error("Fecha invalida (use YYYY-MM-DD)");
    const { feriados } = await this.obtenerAnio(Number(f.slice(0, 4)));
    const feriado = feriados.find((x) => x.fecha === f) || null;
    return { fecha: f, esFeriado: !!feriado, feriado };
  }

  async proximo(desde) {
    const hoy = String(desde || new Date().toISOString().slice(0, 10));
    const { feriados } = await this.obtenerAnio(Number(hoy.slice(0, 4)));
    return feriados.find((f) => f.fecha >= hoy) || null;
  }
}

module.exports = FeriadosService;
