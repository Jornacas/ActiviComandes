/**
 * Autenticació per token.
 *
 * `AUTH_TOKEN` és el vigent. `AUTH_TOKEN_ANTERIOR` és opcional i serveix només
 * per rotar sense tallar el servei: mentre hi és, el backend accepta els dos, i
 * s'esborra quan tots els frontals ja s'han tornat a desplegar amb el nou.
 *
 * El token viatja al navegador (NEXT_PUBLIC_API_TOKEN): no és cap secret fort,
 * és una barrera perquè l'API no quedi oberta a qualsevol. Per això mai ha
 * d'anar escrit al repositori, només a les variables d'entorn de Vercel.
 */

const TOKENS = [process.env.AUTH_TOKEN, process.env.AUTH_TOKEN_ANTERIOR].filter(Boolean);

if (!TOKENS.length) {
  console.warn('WARNING: AUTH_TOKEN no està configurat. Es rebutjaran totes les peticions.');
} else if (TOKENS.length > 1) {
  console.warn('AVÍS: hi ha un AUTH_TOKEN_ANTERIOR actiu. Esborra\'l quan la rotació hagi acabat.');
}

/** Comparació en temps constant, per no filtrar informació pel temps de resposta. */
function igual(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

function authenticateRequest(req, res, next) {
  // El token pot venir per query (?token=), al cos, o a la capçalera Authorization
  const token = req.query.token
    || (req.body && req.body.token)
    || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token d\'autenticació requerit' });
  }

  if (!TOKENS.some(valid => igual(String(token), valid))) {
    return res.status(403).json({ success: false, error: 'Token d\'autenticació invàlid' });
  }

  next();
}

module.exports = { authenticateRequest };
