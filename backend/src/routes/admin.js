/**
 * Rutas para la Admin App
 * Endpoints migrados de Code.gs (en progreso)
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateRequest);

// ======================================================
// ENDPOINTS ADMIN (TODO: Migrar desde Code.gs)
// ======================================================

/**
 * GET /api/admin/orders
 * Carga todos los pedidos
 */
router.get('/orders', async (req, res) => {
  res.json({
    success: true,
    message: 'Endpoint en desarrollo',
    data: []
  });
});

/**
 * POST /api/admin/orders/update
 * Actualiza estado de pedidos
 */
router.post('/orders/update', async (req, res) => {
  res.json({
    success: true,
    message: 'Endpoint en desarrollo'
  });
});

/**
 * GET /api/admin/stats
 * Obtiene estadísticas del dashboard
 */
router.get('/stats', async (req, res) => {
  res.json({
    success: true,
    message: 'Endpoint en desarrollo',
    data: {}
  });
});

// TODO: Migrar resto de endpoints de Admin (18 total)
// - loadData
// - processFormResponses
// - deleteOrders
// - updateDeliveryInfo
// - createOrder
// - getPreparatedOrders
// - getDeliveryOptions
// - createDelivery
// - sendManualNotification
// - getNotificationStatus
// - removeIntermediaryAssignment
// - calculateDistances
// ... etc

module.exports = router;
