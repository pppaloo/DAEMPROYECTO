const mongoose = require("mongoose");

let servidorMemoria = null;

async function iniciarMongoMemoria() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  servidorMemoria = await MongoMemoryServer.create();
  return servidorMemoria.getUri();
}

async function initDatabase() {
  const enMemoria = process.env.DB_MODO === "mongodb-memory" || !process.env.MONGO_URI;
  let uri = process.env.MONGO_URI;

  try {
    if (enMemoria) {
      uri = await iniciarMongoMemoria();
    }
    await mongoose.connect(uri);
    console.log(`[DB] Conectado a MongoDB (${enMemoria ? "en memoria - mongodb-memory-server" : "Atlas/Documento"})`);
  } catch (err) {
    if (!enMemoria) {
      console.warn("[DB] No se pudo conectar a MONGO_URI; usando MongoDB en memoria...");
      try {
        uri = await iniciarMongoMemoria();
        await mongoose.connect(uri);
        console.log("[DB] Conectado a MongoDB (en memoria)");
      } catch (err2) {
        console.error("[DB] Error de conexion:", err2.message);
        throw err2;
      }
    } else {
      console.error("[DB] Error de conexion a MongoDB en memoria:", err.message);
      throw err;
    }
  }
}

async function detenerDatabase() {
  if (mongoose.connection) {
    await mongoose.connection.close();
  }
  if (servidorMemoria) {
    await servidorMemoria.stop();
    servidorMemoria = null;
  }
}

module.exports = { initDatabase, detenerDatabase };