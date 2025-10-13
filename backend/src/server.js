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
