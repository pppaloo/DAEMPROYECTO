// Verificacion de tokens reCAPTCHA v3 contra Google (siteverify).
// Devuelve el JSON de Google: { success, score, action, ... }.

async function verificar(token, secreto, ip) {
  const params = new URLSearchParams({
    secret: secreto,
    response: token,
    remoteip: ip || "",
  });
  const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!resp.ok) throw new Error(`siteverify HTTP ${resp.status}`);
  return resp.json();
}

module.exports = { verificar };