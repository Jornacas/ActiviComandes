/**
 * Rutas para la Admin App
 * Capa fina de routing - la lògica de negoci està als serveis
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const maps = require('../services/maps');

// Serveis
const orders = require('../services/orders');
const delivery = require('../services/delivery');
const notifications = require('../services/notifications');

// Autenticació a totes les rutes
router.use(authenticateRequest);

// ======================================================
// GESTIÓ DE PEDIDOS
// ======================================================

router.get('/orders', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const result = await orders.getOrders(limit);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders/process', async (req, res) => {
  try {
    const result = await orders.processOrders();
    res.json(result);
  } catch (error) {
    console.error('Error processing orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders/update-status', async (req, res) => {
  try {
    const { uuids, newStatus } = req.body;

    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      return res.json({ success: false, error: "No s'han proporcionat UUIDs vàlids" });
    }
    if (!newStatus) {
      return res.json({ success: false, error: "No s'ha proporcionat l'estat nou" });
    }

    const result = await orders.updateOrderStatus(uuids, newStatus);
    res.json(result);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders/update-notes', async (req, res) => {
  try {
    const { orderId, notes } = req.body;

    if (!orderId) {
      return res.json({ success: false, error: "No s'ha proporcionat l'ID del pedido" });
    }

    const result = await orders.updateOrderNotes(orderId, notes || '');
    res.json(result);
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/orders/:idItem', async (req, res) => {
  try {
    const { idItem } = req.params;
    const updates = req.body;
    const result = await orders.updateOrderFields(idItem, updates);
    res.json(result);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders/delete', async (req, res) => {
  try {
    const { uuids } = req.body;

    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      return res.json({ success: false, error: "No s'han proporcionat UUIDs vàlids" });
    }

    const result = await orders.deleteOrders(uuids);
    res.json(result);
  } catch (error) {
    console.error('Error deleting orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders/create', async (req, res) => {
  try {
    const orderData = req.body.orderData || req.body;

    if (!orderData.nomCognoms || !orderData.escola) {
      return res.json({ success: false, error: "Falten dades obligatòries" });
    }

    const result = await orders.createOrder(orderData);
    res.json(result);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/stats', async (req, res) => {
  try {
    const filters = req.body || {};
    const result = await orders.getStats(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/preparated', async (req, res) => {
  try {
    const result = await orders.getPreparatedOrders();
    res.json(result);
  } catch (error) {
    console.error('Error getting preparated orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// GESTIÓ D'ENTREGUES
// ======================================================

router.post('/delivery/options', async (req, res) => {
  try {
    const { orders: orderList } = req.body;

    if (!orderList || !Array.isArray(orderList)) {
      return res.json({ success: false, error: "No s'han proporcionat comandes" });
    }

    const result = await delivery.getDeliveryOptions(orderList);
    res.json(result);
  } catch (error) {
    console.error('Error getting delivery options:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/delivery/create', async (req, res) => {
  try {
    const result = await delivery.createDelivery(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/delivery/remove-intermediary', async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.json({ success: false, error: "No s'han proporcionat IDs vàlids" });
    }

    const result = await delivery.removeIntermediary(orderIds);
    res.json(result);
  } catch (error) {
    console.error('Error removing intermediary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// NOTIFICACIONS
// ======================================================

router.post('/notifications/send', async (req, res) => {
  try {
    const { spaceName, message, orderId, notificationType } = req.body;

    if (!spaceName || !message) {
      return res.json({ success: false, error: "Falten dades obligatòries (spaceName, message)" });
    }

    const result = await notifications.sendNotification(spaceName, message, orderId, notificationType);
    res.json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/notifications/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await notifications.getNotificationStatus(orderId);
    res.json(result);
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notifications/statuses', async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.json({ success: false, error: "No s'han proporcionat IDs vàlids" });
    }

    const result = await notifications.getNotificationStatuses(orderIds);
    res.json(result);
  } catch (error) {
    console.error('Error getting notification statuses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notifications/send-grouped', async (req, res) => {
  try {
    const { spaceName, message, orderIds, notificationType } = req.body;

    if (!spaceName || !message) {
      return res.json({ success: false, error: "Falten dades obligatòries" });
    }

    const result = await notifications.sendGroupedNotification(spaceName, message, orderIds, notificationType);
    res.json(result);
  } catch (error) {
    console.error('Error sending grouped notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/chat/refresh-spaces', async (req, res) => {
  try {
    const result = await notifications.refreshChatSpaces();
    res.json(result);
  } catch (error) {
    console.error('Error refreshing spaces:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notifications/send-to-compres', async (req, res) => {
  try {
    const { dataNecessitat, notes } = req.body;

    if (!dataNecessitat || !notes) {
      return res.json({ success: false, error: "Falten dades obligatòries (dataNecessitat, notes)" });
    }

    const result = await notifications.sendToCompres(dataNecessitat, notes);
    res.json(result);
  } catch (error) {
    console.error('Error sending to compres:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// UTILITATS
// ======================================================

router.post('/calculate-distances', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.json({ success: false, error: "No s'han proporcionat adreces vàlides" });
    }

    const result = await maps.calculateDistances(addresses);
    res.json(result.success ? { success: true, data: result.data } : { success: false, error: result.error });
  } catch (error) {
    console.error('Error calculating distances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
