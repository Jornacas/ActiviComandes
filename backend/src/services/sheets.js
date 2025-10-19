/**
 * Servicio de Google Sheets
 * Maneja toda la interacción con Google Sheets API
 */

const { google } = require('googleapis');
const cache = require('./cache');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Inicializar cliente de Google Sheets y autenticación compartida
let sheetsClient = null;

// Configurar autenticación: desde archivo en desarrollo, desde variable de entorno en producción
let authConfig = {
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/chat.bot',
    'https://www.googleapis.com/auth/chat.spaces',
    'https://www.googleapis.com/auth/chat.messages'
  ],
};

// Si existe GOOGLE_SERVICE_ACCOUNT_JSON (Vercel), usar esas credenciales
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  try {
    authConfig.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    console.log('[SHEETS] Usando credenciales de variable de entorno');
  } catch (error) {
    console.error('[SHEETS] Error al parsear GOOGLE_SERVICE_ACCOUNT_JSON:', error.message);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Si existe el archivo de credenciales (desarrollo local), usarlo
  authConfig.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('[SHEETS] Usando credenciales desde archivo:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

// Crear objeto de autenticación compartido (para chat.js y otros servicios)
const auth = new google.auth.GoogleAuth(authConfig);

/**
 * Obtiene el cliente autenticado de Google Sheets
 */
async function getSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  try {
    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: authClient });

    console.log('[SHEETS] Cliente de Google Sheets inicializado correctamente');
    return sheetsClient;
  } catch (error) {
    console.error('[SHEETS] Error al inicializar cliente:', error);
    throw new Error('No se pudo conectar a Google Sheets: ' + error.message);
  }
}

/**
 * Obtiene datos de una hoja con caché opcional
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} cacheKey - Clave para caché (opcional)
 * @param {number} cacheTTL - TTL del caché en segundos (default: 3600)
 * @returns {Promise<Array>} - Datos de la hoja
 */
async function getCachedData(sheetName, cacheKey = null, cacheTTL = 3600) {
  // Si hay cacheKey, intentar obtener del caché
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // No hay caché, obtener de Sheets
  const data = await getSheetData(sheetName);

  // Guardar en caché si se proporcionó cacheKey
  if (cacheKey && data) {
    cache.set(cacheKey, data, cacheTTL);
  }

  return data;
}

/**
 * Obtiene todos los datos de una hoja
 * @param {string} sheetName - Nombre de la hoja
 * @returns {Promise<Array>} - Datos de la hoja
 */
async function getSheetData(sheetName) {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`, // Leer todas las columnas hasta Z
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`[SHEETS] Error al leer hoja '${sheetName}':`, error.message);
    throw new Error(`No se pudo leer la hoja '${sheetName}': ` + error.message);
  }
}

/**
 * Añade una fila a una hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {Array} rowData - Datos de la fila a añadir
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function appendRow(sheetName, rowData) {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowData]
      }
    });

    console.log(`[SHEETS] Fila añadida a '${sheetName}'`);

    // Invalidar caché de esta hoja
    cache.del(`cache_${sheetName.toLowerCase()}`);

    return response.data;
  } catch (error) {
    console.error(`[SHEETS] Error al añadir fila a '${sheetName}':`, error.message);
    throw new Error(`No se pudo añadir la fila: ` + error.message);
  }
}

/**
 * Actualiza una celda o rango específico
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} range - Rango a actualizar (ej: 'A2:B2')
 * @param {Array} values - Valores a escribir
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function updateRange(sheetName, range, values) {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values
      }
    });

    console.log(`[SHEETS] Rango '${range}' actualizado en '${sheetName}'`);

    // Invalidar caché de esta hoja
    cache.del(`cache_${sheetName.toLowerCase()}`);

    return response.data;
  } catch (error) {
    console.error(`[SHEETS] Error al actualizar rango en '${sheetName}':`, error.message);
    throw new Error(`No se pudo actualizar el rango: ` + error.message);
  }
}

/**
 * Elimina filas de una hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {number} startIndex - Índice de inicio (0-indexed)
 * @param {number} endIndex - Índice de fin (0-indexed, exclusivo)
 * @returns {Promise<Object>} - Respuesta de la API
 */
async function deleteRows(sheetName, startIndex, endIndex) {
  try {
    const sheets = await getSheetsClient();

    // Primero necesitamos obtener el sheetId
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });

    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) {
      throw new Error(`Hoja '${sheetName}' no encontrada`);
    }

    const sheetId = sheet.properties.sheetId;

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: startIndex,
              endIndex: endIndex
            }
          }
        }]
      }
    });

    console.log(`[SHEETS] Filas ${startIndex}-${endIndex} eliminadas de '${sheetName}'`);

    // Invalidar caché de esta hoja
    cache.del(`cache_${sheetName.toLowerCase()}`);

    return response.data;
  } catch (error) {
    console.error(`[SHEETS] Error al eliminar filas de '${sheetName}':`, error.message);
    throw new Error(`No se pudieron eliminar las filas: ` + error.message);
  }
}

/**
 * Obtiene múltiples rangos de una vez (batch)
 * @param {Array<string>} ranges - Array de rangos a obtener
 * @returns {Promise<Object>} - Respuesta con múltiples rangos
 */
async function batchGet(ranges) {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ranges
    });

    return response.data;
  } catch (error) {
    console.error('[SHEETS] Error en batchGet:', error.message);
    throw new Error('Error al obtener múltiples rangos: ' + error.message);
  }
}

module.exports = {
  auth,
  getSheetsClient,
  getCachedData,
  getSheetData,
  appendRow,
  updateRange,
  deleteRows,
  batchGet
};
