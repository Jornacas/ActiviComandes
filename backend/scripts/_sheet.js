/**
 * Lector mínim del Google Sheet, només per als scripts de migració.
 *
 * L'app ja no toca cap full: això existeix per poder rellegir l'arxiu històric
 * si mai cal tornar a importar alguna cosa.
 */
const { google } = require('googleapis');
const googleAuth = require('../src/services/google-auth');

async function getSheetData(nomFull) {
  const auth = new google.auth.GoogleAuth({
    credentials: googleAuth.getCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${nomFull}!A:AZ`,
  });

  return res.data.values || [];
}

module.exports = { getSheetData };
