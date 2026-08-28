/**
 * Credencials del compte de servei de Google.
 *
 * L'únic que en queda viu és publicar a Google Chat (chat.js): des de la Fase 2
 * ni les dades ni les comandes passen per Google Sheets. Aquest mòdul substitueix
 * l'antic services/sheets.js, que ja no tenia raó de ser.
 *
 * Tres orígens possibles, en aquest ordre:
 *   GOOGLE_SERVICE_ACCOUNT_BASE64  (el que hi ha a Vercel)
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *   GOOGLE_APPLICATION_CREDENTIALS (fitxer, en local)
 */

const path = require('path');

let credencials = null;

function getCredentials() {
  if (credencials) return credencials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    credencials = JSON.parse(json);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credencials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const ruta = path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS
      : path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
    credencials = require(ruta);
  } else {
    throw new Error(
      'No hi ha credencials de compte de servei: cal GOOGLE_SERVICE_ACCOUNT_BASE64, ' +
      'GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS'
    );
  }

  console.log(`[GOOGLE] Compte de servei: ${credencials.client_email}`);
  return credencials;
}

module.exports = { getCredentials };
