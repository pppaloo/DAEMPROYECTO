// Directorio Oficial de Establecimientos Educacionales (Datos Abiertos MINEDUC),
// consultado a traves del servicio ArcGIS publico de la IDE (SMA). No requiere
// llave.
//
// El panel muestra SOLO los establecimientos de la comuna de Los Angeles
// (region del Biobio). Se descarga una vez la comuna completa y se filtra en
// memoria, porque el servicio no permite buscar por texto en las columnas de
// nombre (solo permite filtrar por codigo de comuna, que es numerico).
const SERVICIO =
  "https://ideserver.sma.gob.cl/arcgis/rest/services/IDE/Infraestructura_rural_urbana/MapServer";

// Codigo de comuna MINEDUC de Los Angeles (region 8 - Biobio).
const COD_COMUNA_LOS_ANGELES = 8301;
const COMUNA_LOS_ANGELES = "Los Ángeles";

const CAMPOS = [
  "RBD",
  "DGV_RBD",
  "NOM_RBD",
  "NOM_REG_RB",
  "NOM_COM_RB",
  "NOM_DEPROV",
  "TIPO_SOST",
  "TIPO_DEPEN",
  "DIRECCION",
  "NUMERO",
  "LATITUD",
  "LONGITUD",
  "MAT_TOTAL",
].join(",");

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas

async function traerJson(url, ms = 12000) {
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

// Codigos TIPO_DEPEN del MINEDUC -> dependencias del catalogo DAEM.
function dependenciaDAEM(tipo) {
  const t = Number(tipo);
  if (t === 1 || t === 2) return "Municipal";
  if (t === 3 || t === 4 || t === 5) return "Particular Subvencionado";
  return "";
}

function num(valor) {
  const n = Number(String(valor == null ? "" : valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// minusculas y sin tildes, para comparar nombres escritos de cualquier forma.
function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mapear(at) {
  const direccion = [at.DIRECCION, at.NUMERO].filter(Boolean).join(" ").trim();
  return {
    rbd: at.RBD != null ? String(at.RBD) : "",
    dv: at.DGV_RBD != null ? String(at.DGV_RBD) : "",
    nombre: at.NOM_RBD || "",
    region: at.NOM_REG_RB || "",
    comuna: at.NOM_COM_RB || "",
    provincia: at.NOM_DEPROV || "",
    dependencia: dependenciaDAEM(at.TIPO_DEPEN),
    tipoDependencia: at.TIPO_DEPEN != null ? String(at.TIPO_DEPEN) : "",
    tipoSostenedor: at.TIPO_SOST != null ? String(at.TIPO_SOST) : "",
    direccion,
    latitud: num(at.LATITUD),
    longitud: num(at.LONGITUD),
    matricula: Number(at.MAT_TOTAL) || 0,
  };
}

class DirectorioService {
  #cache = null; // { ts, establecimientos }

  async #cargarComuna() {
    if (this.#cache && Date.now() - this.#cache.ts < CACHE_TTL) return this.#cache.establecimientos;
    const params = new URLSearchParams({
      where: `COD_COM_RB=${COD_COMUNA_LOS_ANGELES}`,
      outFields: CAMPOS,
      returnGeometry: "false",
      f: "json",
    });
    const json = await traerJson(`${SERVICIO}/5/query?${params.toString()}`);
    const establecimientos = ((json && json.features) || [])
      .map((f) => mapear(f.attributes))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    this.#cache = { ts: Date.now(), establecimientos };
    return establecimientos;
  }

  async buscar({ q = "", rbd = "", limite = 200 } = {}) {
    const tope = Math.min(Math.max(Number(limite) || 200, 1), 200);
    const texto = normalizar(q);
    const codigo = String(rbd || "").replace(/[^0-9]/g, "");

    const todos = await this.#cargarComuna();
    let coincidencias = todos;
    if (codigo) {
      coincidencias = todos.filter((e) => e.rbd === codigo);
    } else if (texto) {
      coincidencias = todos.filter((e) => normalizar(e.nombre).includes(texto));
    }
    return {
      comuna: COMUNA_LOS_ANGELES,
      total: coincidencias.length,
      resultados: coincidencias.slice(0, tope),
    };
  }
}

module.exports = DirectorioService;
