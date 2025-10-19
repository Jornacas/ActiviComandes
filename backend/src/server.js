require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mobileRoutes = require('./routes/mobile');
const adminRoutes = require('./routes/admin');
const { legacyCompatibility } = require('./middleware/legacy');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requests (útil para debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Compatibilidad con formato antiguo de Apps Script (?action=xxx)
app.use(legacyCompatibility);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ActiviComandes Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint
app.get('/debug/env', (req, res) => {
  // Parsear credenciales para obtener email
  let serviceAccountEmail = 'N/A';
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const creds = JSON.parse(decoded);
      serviceAccountEmail = creds.client_email;
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      serviceAccountEmail = creds.client_email;
    }
  } catch (e) {
    serviceAccountEmail = 'Error: ' + e.message;
  }

  res.json({
    hasSpreadsheetId: !!process.env.SPREADSHEET_ID,
    hasAuthToken: !!process.env.AUTH_TOKEN,
    hasGoogleBase64: !!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
    hasGoogleJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    hasGoogleFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    spreadsheetIdLength: process.env.SPREADSHEET_ID?.length || 0,
    spreadsheetIdPrefix: process.env.SPREADSHEET_ID?.substring(0, 10) || 'N/A',
    serviceAccountEmail: serviceAccountEmail,
    authMethod: process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 ? 'BASE64' :
                process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'JSON' :
                process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'FILE' : 'NONE'
  });
});

// Test Google Sheets connection
app.get('/debug/test-sheets', async (req, res) => {
  const { google } = require('googleapis');

  try {
    // Configurar autenticación igual que en sheets.js
    let authConfig = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      authConfig.credentials = JSON.parse(decoded);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      authConfig.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      authConfig.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    const auth = new google.auth.GoogleAuth(authConfig);
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Primero intentar obtener metadata del spreadsheet
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
    });

    // Listar todas las hojas
    const sheetNames = metadata.data.sheets.map(sheet => sheet.properties.title);

    // Intentar leer una celda de la primera hoja
    const firstSheet = sheetNames[0];
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${firstSheet}!A1`,
    });

    res.json({
      success: true,
      message: 'Conexión exitosa a Google Sheets',
      availableSheets: sheetNames,
      testedSheet: firstSheet,
      data: response.data,
      spreadsheetId: process.env.SPREADSHEET_ID?.substring(0, 10) + '...'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      code: error.code,
      status: error.status,
      details: error.errors || [],
      spreadsheetId: process.env.SPREADSHEET_ID?.substring(0, 10) + '...'
    });
  }
});

// Routes
app.use('/api', mobileRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   ActiviComandes Backend API                  ║
║   Servidor corriendo en http://localhost:${PORT}  ║
║   Entorno: ${process.env.NODE_ENV || 'development'}                    ║
╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;

