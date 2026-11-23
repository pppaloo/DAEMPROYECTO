require("dotenv").config();
const AuthService = require("../services/AuthService");
const s = new AuthService();
// Monkey-patch to debug
const orig = s.login.bind(s);
s.login = async (rut, clave) => {
  console.log("login called with", rut, clave);
  try { return await orig(rut, clave); }
  catch (e) { console.error("login error", e.message); throw e; }
};
s.login("4160", "coord123").then(r => console.log("OK", r.usuario.nombre)).catch(e => console.error("FAIL", e.message));
