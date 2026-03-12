/**
 * Rutes del Copilot IA
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const copilot = require('../services/copilot');

// Autenticació per a totes les rutes
router.use(authenticateRequest);

/**
 * POST /api/admin/copilot/chat
 * Envia un missatge al copilot i rep la resposta
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.json({
        success: false,
        error: 'Cal proporcionar un missatge',
      });
    }

    // Generar sessionId si no existeix
    const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🤖 Copilot [${sid}]: "${message.substring(0, 80)}..."`);

    const result = await copilot.processMessage(sid, message.trim());

    res.json(result);
  } catch (error) {
    console.error('Error al copilot route:', error);
    res.status(500).json({
      success: false,
      error: 'Error processant el missatge: ' + error.message,
    });
  }
});

module.exports = router;
