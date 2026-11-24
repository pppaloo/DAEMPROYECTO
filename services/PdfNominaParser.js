const { spawnSync } = require("child_process");
const zlib = require("zlib");

function decodificarBufferPdf(archivoPdf) {
  if (!archivoPdf) return Buffer.alloc(0);
  const str = String(archivoPdf).trim();
  const base64 = str.includes(",") ? str.split(",").pop() : str;
  return Buffer.from(base64, "base64");
}

function extraerTextoFallbackNode(buffer) {
  const raw = buffer.toString("latin1");
  const trozos = [];

  // 1. Intentar descomprimir streams FlateDecode
  const reStream = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = reStream.exec(raw)) !== null) {
    const contenido = Buffer.from(m[1], "latin1");
    let descomprimido = null;
    try {
      descomprimido = zlib.inflateSync(contenido).toString("latin1");
    } catch {
      try {
        descomprimido = zlib.inflateRawSync(contenido).toString("latin1");
      } catch {
        descomprimido = m[1];
      }
    }
    if (descomprimido) {
      extraerCadenasPdf(descomprimido, trozos);
    }
  }

  // 2. También revisar texto sin comprimir en el PDF
  extraerCadenasPdf(raw, trozos);

  // 3. Si es texto plano (CSV/TXT subido como archivo)
  const utf8 = buffer.toString("utf8");
  if (!utf8.startsWith("%PDF") && /[a-zA-Z0-9]/.test(utf8)) {
    trozos.push(utf8);
  }

  return trozos.join("\n");
}

function extraerCadenasPdf(contenido, destino) {
  // Bloques BT ... ET
  const reBt = /BT([\s\S]*?)ET/g;
  let b;
  while ((b = reBt.exec(contenido)) !== null) {
    const bloque = b[1];
    const lineasBloque = [];
    const reTj = /\((?:\\.|[^\\()])*\)\s*Tj|\[([\s\S]*?)\]\s*TJ/g;
    let t;
    while ((t = reTj.exec(bloque)) !== null) {
      const fragmento = t[0];
      const partes = [];
      const reStr = /\(((?:\\.|[^\\()])*)\)/g;
      let s;
      while ((s = reStr.exec(fragmento)) !== null) {
        partes.push(
          s[1]
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, " ")
            .replace(/\\t/g, " ")
            .replace(/\\\(/g, "(")
            .replace(/\\\)/g, ")")
            .replace(/\\\\/g, "\\")
        );
      }
      if (partes.length) lineasBloque.push(partes.join(""));
    }
    if (lineasBloque.length) destino.push(lineasBloque.join("\n"));
  }
}

function decodificarEntidadesXml(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function leerArchivosZip(buffer) {
  const archivos = {};
  // Buscar End of Central Directory (0x06054b50)
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    let ptr = cdOffset;
    for (let i = 0; i < totalEntries && ptr + 46 <= buffer.length; i++) {
      if (buffer.readUInt32LE(ptr) !== 0x02014b50) break;
      const metodo = buffer.readUInt16LE(ptr + 10);
      const compSize = buffer.readUInt32LE(ptr + 20);
      const nameLen = buffer.readUInt16LE(ptr + 28);
      const extraLen = buffer.readUInt16LE(ptr + 30);
      const commentLen = buffer.readUInt16LE(ptr + 32);
      const localOffset = buffer.readUInt32LE(ptr + 42);
      const nombre = buffer.slice(ptr + 46, ptr + 46 + nameLen).toString("utf8");
      ptr += 46 + nameLen + extraLen + commentLen;

      if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
        const lNameLen = buffer.readUInt16LE(localOffset + 26);
        const lExtraLen = buffer.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + lNameLen + lExtraLen;
        const rawData = buffer.slice(dataStart, dataStart + compSize);
        try {
          if (metodo === 0) {
            archivos[nombre] = rawData.toString("utf8");
          } else if (metodo === 8) {
            archivos[nombre] = zlib.inflateRawSync(rawData).toString("utf8");
          }
        } catch {
          // ignorar entrada dañada
        }
      }
    }
  }
  return archivos;
}

function colExcelAIndice(refCelda) {
  const m = String(refCelda || "").match(/^([A-Z]+)/i);
  if (!m) return -1;
  const letras = m[1].toUpperCase();
  let idx = 0;
  for (let i = 0; i < letras.length; i++) {
    idx = idx * 26 + (letras.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function serialExcelAFecha(num) {
  const n = Number(num);
  if (!Number.isFinite(n) || n < 25000 || n > 55000) return "";
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function extraerTextoXlsx(buffer) {
  const archivos = leerArchivosZip(buffer);
  const sharedStrings = [];
  const ssXml = archivos["xl/sharedStrings.xml"] || "";
  if (ssXml) {
    const reSi = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
    let m;
    while ((m = reSi.exec(ssXml)) !== null) {
      const textos = [];
      const reT = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi;
      let tm;
      while ((tm = reT.exec(m[1])) !== null) {
        textos.push(decodificarEntidadesXml(tm[1]));
      }
      sharedStrings.push(textos.join(""));
    }
  }

  const hojas = Object.keys(archivos)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
    .sort();

  const lineasSalida = [];
  for (const hoja of hojas) {
    const xml = archivos[hoja];
    const reRow = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
    let rm;
    while ((rm = reRow.exec(xml)) !== null) {
      const filaXml = rm[1];
      const celdas = [];
      const reCell = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/gi;
      let cm;
      while ((cm = reCell.exec(filaXml)) !== null) {
        const attrs = cm[1] || "";
        const inner = cm[2] || "";
        const mRef = attrs.match(/\br="([A-Z]+\d+)"/i);
        const mType = attrs.match(/\bt="([^"]+)"/i);
        const tipo = mType ? mType[1] : "";
        let valor = "";

        if (tipo === "inlineStr") {
          const textos = [];
          const reT = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi;
          let tm;
          while ((tm = reT.exec(inner)) !== null) {
            textos.push(decodificarEntidadesXml(tm[1]));
          }
          valor = textos.join("");
        } else {
          const mVal = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
          const rawVal = mVal ? decodificarEntidadesXml(mVal[1]).trim() : "";
          if (tipo === "s") {
            const idx = parseInt(rawVal, 10);
            valor = Number.isFinite(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : rawVal;
          } else if (tipo === "str" || tipo === "b") {
            valor = rawVal;
          } else {
            // Si es un número de serie de fecha de Excel (ej: 41744 -> 2014-04-15)
            if (/^\d{5}(?:\.\d+)?$/.test(rawVal)) {
              const posibleFecha = serialExcelAFecha(rawVal);
              valor = posibleFecha || rawVal;
            } else {
              valor = rawVal;
            }
          }
        }

        const colIdx = mRef ? colExcelAIndice(mRef[1]) : celdas.length;
        if (colIdx >= 0) {
          while (celdas.length <= colIdx) celdas.push("");
          celdas[colIdx] = String(valor || "").replace(/\s+/g, " ").trim();
        } else {
          celdas.push(String(valor || "").replace(/\s+/g, " ").trim());
        }
      }
      if (celdas.some((c) => c !== "")) {
        lineasSalida.push(celdas.filter((c) => c !== "").join("   "));
      }
    }
  }
  return lineasSalida.join("\n");
}

function extraerTextoPdf(archivoPdf) {
  const buffer = decodificarBufferPdf(archivoPdf);
  if (!buffer.length) return "";

  // 1. Si es un archivo Excel .xlsx (ZIP que comienza con PK\x03\x04)
  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    const textoXlsx = extraerTextoXlsx(buffer);
    if (textoXlsx && textoXlsx.trim()) return textoXlsx;
  }

  // 2. Si no empieza con %PDF, tratar como CSV / TSV / XML / HTML (.xls o .csv)
  if (!buffer.slice(0, 5).toString("utf8").startsWith("%PDF")) {
    const textoPlano = buffer.toString("utf8");
    // Si es un XML o tabla HTML guardada como .xls, convertir celdas en columnas separadas
    if (/<(?:table|row|tr|td|Cell|Data)\b/i.test(textoPlano)) {
      return textoPlano
        .replace(/<\/(?:tr|row)>/gi, "\n")
        .replace(/<\/(?:td|th|Cell|Data)>/gi, "   ")
        .replace(/<[^>]+>/g, " ")
        .split(/\r?\n/)
        .map((l) => decodificarEntidadesXml(l).replace(/[ \t]{2,}/g, "   ").trim())
        .filter(Boolean)
        .join("\n");
    }
    return textoPlano;
  }

  // 3. Intentar con pdftotext (Poppler) conservando el layout tabular
  try {
    const res = spawnSync("pdftotext", ["-layout", "-", "-"], {
      input: buffer,
      encoding: "utf8",
      timeout: 8000,
    });
    if (res.status === 0 && res.stdout && res.stdout.trim()) {
      return res.stdout;
    }
  } catch {
    // fallback a extractor en Node
  }

  return extraerTextoFallbackNode(buffer);
}

function normalizarFecha(valor) {
  if (!valor) return "";
  const limpio = String(valor).trim();
  // YYYY-MM-DD o YYYY/MM/DD
  let m = limpio.match(/\b((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }
  // DD/MM/YYYY o DD-MM-YYYY
  m = limpio.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})\b/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return "";
}

function normalizarGenero(valor) {
  if (!valor) return "M";
  const v = String(valor).trim().toLowerCase();
  if (v === "f" || v.startsWith("fem") || v.startsWith("dam") || v.startsWith("muj")) return "F";
  if (v === "m" || v.startsWith("mas") || v.startsWith("var") || v.startsWith("hom")) return "M";
  return "M";
}

function separarNombresApellidos(nombreCompleto) {
  const limpio = String(nombreCompleto || "").replace(/\s+/g, " ").trim();
  if (!limpio) return { nombres: "", apellidos: "", nombre: "" };
  const partes = limpio.split(" ");
  if (partes.length === 1) {
    return { nombres: partes[0], apellidos: "", nombre: partes[0] };
  }
  if (partes.length === 2) {
    return { nombres: partes[0], apellidos: partes[1], nombre: limpio };
  }
  if (partes.length === 3) {
    return { nombres: partes[0], apellidos: partes.slice(1).join(" "), nombre: limpio };
  }
  const mitad = Math.ceil(partes.length / 2);
  return {
    nombres: partes.slice(0, mitad).join(" "),
    apellidos: partes.slice(mitad).join(" "),
    nombre: limpio,
  };
}

function parsearPorEtiquetas(texto) {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const alumnos = [];
  let actual = {};
  let actividadSugerida = "";
  let divisionSugerida = "";

  const guardarActual = () => {
    if (actual.rut || actual.nombres || actual.nombre) {
      const nom = actual.nombres || "";
      const ape = actual.apellidos || "";
      const nombreFinal = actual.nombre || `${nom} ${ape}`.trim();
      const sep = separarNombresApellidos(nombreFinal);
      alumnos.push({
        rut: actual.rut || "",
        nombres: nom || sep.nombres,
        apellidos: ape || sep.apellidos,
        nombre: nombreFinal || sep.nombre,
        apoderado: actual.apoderado || "",
        genero: normalizarGenero(actual.genero),
        fechaNacimiento: normalizarFecha(actual.fechaNacimiento),
        email: actual.email || "",
      });
    }
    actual = {};
  };

  // Soporta múltiples pares etiqueta: valor en la misma línea o en líneas separadas
  const reEtiqueta = /(?:^|\s{2,}|\|)(Actividad(?:\s*\(Categor[ií]a\))?|Categor[ií]a|Divisi[oó]n|RUT|Nombres|Apellidos|Nombre(?:\s+completo)?|Apoderado|G[eé]nero|Sexo|Fecha(?:\s+de)?\s+nacimiento|Nacimiento|Email|Correo(?:\s+electr[oó]nico)?)\s*[:=-]\s*([^\n|]+?)(?=\s{2,}(?:Actividad|Categor[ií]a|Divisi[oó]n|RUT|Nombres|Apellidos|Nombre|Apoderado|G[eé]nero|Sexo|Fecha|Nacimiento|Email|Correo)\s*[:=-]|$)/gi;

  for (const linea of lineas) {
    let m;
    reEtiqueta.lastIndex = 0;
    while ((m = reEtiqueta.exec(linea)) !== null) {
      const clave = m[1]
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const valor = m[2].trim();
      if (!valor) continue;

      if (clave.startsWith("actividad")) {
        actividadSugerida = actividadSugerida || valor;
      } else if (clave.startsWith("categoria") || clave.startsWith("division")) {
        divisionSugerida = divisionSugerida || valor;
      } else if (clave === "rut") {
        if (actual.rut) guardarActual();
        const rutMatch = valor.match(/(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/);
        actual.rut = rutMatch ? rutMatch[1].toUpperCase() : valor;
      } else if (clave === "nombres") {
        actual.nombres = valor;
      } else if (clave === "apellidos") {
        actual.apellidos = valor;
      } else if (clave.startsWith("nombre")) {
        actual.nombre = valor;
      } else if (clave.startsWith("apoderado")) {
        actual.apoderado = valor;
      } else if (clave.startsWith("genero") || clave.startsWith("sexo")) {
        actual.genero = valor;
      } else if (clave.includes("nacimiento") || clave.startsWith("fecha")) {
        actual.fechaNacimiento = valor;
      } else if (clave.startsWith("email") || clave.startsWith("correo")) {
        const em = valor.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        actual.email = em ? em[0] : valor;
      }
    }
  }
  guardarActual();

  return { alumnos: alumnos.filter((a) => a.rut && a.nombre), actividadSugerida, divisionSugerida };
}

function parsearPorFilasTabulares(texto) {
  // Si en una misma línea vienen varios RUTs concatenados, separarlos en líneas distintas
  const textoSeparado = texto.replace(
    /(\S.*?)(\s+(?=\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b))/g,
    (full, antes) => (/\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/.test(antes) ? `${antes}\n` : full)
  );
  const lineas = textoSeparado
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Detectar encabezados de tabla si existen para saber orden de columnas
  let tieneColApellidos = false;
  let tieneColApoderado = false;
  for (const l of lineas.slice(0, 10)) {
    const low = l.toLowerCase();
    if (low.includes("rut") && (low.includes("nombre") || low.includes("apellido"))) {
      if (low.includes("apellido")) tieneColApellidos = true;
      if (low.includes("apoderado") || low.includes("tutor")) tieneColApoderado = true;
    }
  }

  const alumnos = [];
  const reRut = /\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\b/;
  const reEmail = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
  const reFecha = /\b((?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2})\b/;
  const reGeneroPalabra = /\b(Masculino|Femenino|Var[oó]n|Dama|Hombre|Mujer)\b/i;

  for (const lineaOriginal of lineas) {
    // Ignorar encabezados o líneas con "Solicitante / Coordinador"
    if (/^(n[°ºo]?|#)?\s*rut\b/i.test(lineaOriginal)) continue;
    if (/\b(rut\s+solicitante|rut\s+coordinador)\b/i.test(lineaOriginal)) continue;
    // Ignorar líneas que son etiquetas de formulario ("RUT: 12.345.678-9") ya procesadas por parsearPorEtiquetas
    if (/^rut\s*[:=-]/i.test(lineaOriginal)) continue;

    // Limpiar prefijos de cabecera si quedaron pegados antes del RUT
    const linea = lineaOriginal.replace(/^.*?(?:Actividad|Categor[ií]a|Divisi[oó]n)\s*[:=-][^\d]+(?=\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/i, "").trim();

    const mRut = linea.match(reRut);
    if (!mRut) continue;
    const rut = mRut[1].toUpperCase();

    const mEmail = linea.match(reEmail);
    const email = mEmail ? mEmail[1] : "";

    const mFecha = linea.match(reFecha);
    const fechaNacimiento = mFecha ? normalizarFecha(mFecha[1]) : "";

    // Género: palabra completa o columna M/F aislada
    let genero = "M";
    let tokenGeneroEliminado = "";
    const mGenPal = linea.match(reGeneroPalabra);
    if (mGenPal) {
      genero = normalizarGenero(mGenPal[1]);
      tokenGeneroEliminado = mGenPal[0];
    } else {
      const mGenLetra = linea.match(/(?:^|[\s|;,])([MFmf])(?=$|[\s|;,])/);
      if (mGenLetra) {
        genero = normalizarGenero(mGenLetra[1]);
        tokenGeneroEliminado = mGenLetra[1];
      }
    }

    // Limpiar la línea de RUT, fecha, email, edad ("12 años") y género para extraer Nombres, Apellidos y Apoderado
    let resto = linea
      .replace(mRut[0], " | ")
      .replace(mEmail ? mEmail[0] : "", " | ")
      .replace(mFecha ? mFecha[0] : "", " | ")
      .replace(/\b\d{1,2}\s*a[ñn]os?(?:\s*\(s\))?\b/gi, " | ");

    if (tokenGeneroEliminado) {
      const escGen = tokenGeneroEliminado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      resto = resto.replace(new RegExp(`(?:^|[\\s|;,])${escGen}(?=$|[\\s|;,])`, "i"), " | ");
    }

    // Quitar numeración inicial de fila (ej: "1.", "01 -")
    resto = resto.replace(/^\s*\d{1,3}\s*[.)-]\s*/, "");

    // Dividir por separadores de columna (2+ espacios, tab, |, ;, ,)
    const columnas = resto
      .split(/\s{2,}|\t|\||;|,/)
      .map((c) => c.replace(/\s+/g, " ").trim())
      .filter((c) => c && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(c));

    let nombres = "";
    let apellidos = "";
    let nombre = "";
    let apoderado = "";

    if (columnas.length >= 3) {
      if (tieneColApellidos) {
        nombres = columnas[0];
        apellidos = columnas[1];
        nombre = `${nombres} ${apellidos}`.trim();
        apoderado = columnas[2] || "";
      } else {
        const sep = separarNombresApellidos(columnas[0]);
        nombres = sep.nombres;
        apellidos = sep.apellidos;
        nombre = sep.nombre;
        apoderado = columnas[1] || "";
      }
    } else if (columnas.length === 2) {
      if (tieneColApellidos && !tieneColApoderado) {
        nombres = columnas[0];
        apellidos = columnas[1];
        nombre = `${nombres} ${apellidos}`.trim();
      } else if (tieneColApoderado && !tieneColApellidos) {
        const sep = separarNombresApellidos(columnas[0]);
        nombres = sep.nombres;
        apellidos = sep.apellidos;
        nombre = sep.nombre;
        apoderado = columnas[1];
      } else {
        // Heurística: si cada una de las 2 columnas tiene 1-2 palabras, suelen ser Nombres | Apellidos
        // Si la primera columna tiene 3+ palabras, es Nombre Completo | Apoderado
        const palabras0 = columnas[0].split(" ").length;
        if (palabras0 >= 3) {
          const sep = separarNombresApellidos(columnas[0]);
          nombres = sep.nombres;
          apellidos = sep.apellidos;
          nombre = sep.nombre;
          apoderado = columnas[1];
        } else {
          nombres = columnas[0];
          apellidos = columnas[1];
          nombre = `${nombres} ${apellidos}`.trim();
        }
      }
    } else if (columnas.length === 1) {
      const sep = separarNombresApellidos(columnas[0]);
      nombres = sep.nombres;
      apellidos = sep.apellidos;
      nombre = sep.nombre;
    }

    if (rut && nombre) {
      alumnos.push({
        rut,
        nombres,
        apellidos,
        nombre,
        apoderado,
        genero,
        fechaNacimiento,
        email,
      });
    }
  }

  return alumnos;
}

function detectarActividadYDivision(texto) {
  let divisionSugerida = "";
  const mDiv = texto.match(/\b(MINIS|SUB\s*13|SUB\s*14|JUVENIL|DAMAS|VARONES)\b/i);
  if (mDiv) {
    divisionSugerida = mDiv[1].toUpperCase().replace(/\s+/g, " ");
  }
  let actividadSugerida = "";
  const mAct = texto.match(/(?:Actividad|Disciplina)\s*[:=-]\s*([^\n|()]+)/i);
  if (mAct) {
    actividadSugerida = mAct[1].trim();
  }
  return { actividadSugerida, divisionSugerida };
}

function extraerDatosNominaPdf(archivoPdf) {
  const texto = extraerTextoPdf(archivoPdf);
  if (!texto || !texto.trim()) {
    return { alumnos: [], actividadSugerida: "", divisionSugerida: "", textoExtraido: "" };
  }

  const porEtiquetas = parsearPorEtiquetas(texto);
  const porTablas = parsearPorFilasTabulares(texto);
  const meta = detectarActividadYDivision(texto);

  // Elegir el método que haya encontrado más registros válidos o combinarlos sin duplicar RUT
  const mapaPorRut = new Map();
  for (const al of [...porEtiquetas.alumnos, ...porTablas]) {
    if (!al.rut) continue;
    const existente = mapaPorRut.get(al.rut);
    if (!existente) {
      mapaPorRut.set(al.rut, al);
    } else {
      mapaPorRut.set(al.rut, {
        rut: al.rut,
        nombres: existente.nombres || al.nombres,
        apellidos: existente.apellidos || al.apellidos,
        nombre: existente.nombre || al.nombre,
        apoderado: existente.apoderado || al.apoderado,
        genero: existente.genero || al.genero,
        fechaNacimiento: existente.fechaNacimiento || al.fechaNacimiento,
        email: existente.email || al.email,
      });
    }
  }

  return {
    alumnos: [...mapaPorRut.values()],
    actividadSugerida: porEtiquetas.actividadSugerida || meta.actividadSugerida || "",
    divisionSugerida: porEtiquetas.divisionSugerida || meta.divisionSugerida || "",
    textoExtraido: texto,
  };
}

module.exports = {
  extraerDatosNominaPdf,
  decodificarBufferPdf,
};
