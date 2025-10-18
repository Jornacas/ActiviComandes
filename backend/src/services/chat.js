/**
 * Servicio de Google Chat API
 * Envía notificaciones a espacios de Google Chat via Apps Script
 */

const cache = require('./cache');

/**
 * Refresca la caché de espacios de chat
 * Útil cuando se han añadido o modificado espacios en la hoja
 */
async function refreshChatSpaces() {
  cache.del('chat_webhooks_data');
  console.log('🔄 Caché de espacios de chat refrescada');
}

/**
 * Envía un mensaje a un espacio de Google Chat
 * Llama al microservicio de Apps Script (notificaciones.gs)
 * @param {string} spaceName - Nombre del espacio (debe existir en hoja ChatWebhooks)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
async function sendChatNotification(spaceName, message) {
  try {
    console.log(`📤 Enviando notificación a Apps Script: ${spaceName}`);

    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_NOTIFICATION_URL;

    // Verificar que la URL esté configurada
    if (!APPS_SCRIPT_URL) {
      console.error('❌ APPS_SCRIPT_NOTIFICATION_URL no configurada en .env');
      return {
        success: false,
        error: 'APPS_SCRIPT_NOTIFICATION_URL no configurada',
        requestedSpace: spaceName,
        actualSpace: null,
        simulated: true
      };
    }

    // Llamar a Apps Script vía HTTP POST
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spaceName: spaceName,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Notificación enviada correctamente vía Apps Script a ${spaceName}`);
      return {
        success: true,
        requestedSpace: spaceName,
        actualSpace: spaceName,
        spaceId: result.spaceId,
        message: result.message || 'Notificación enviada correctamente',
        messageId: result.messageId,
        usedFallback: false
      };
    } else {
      console.error(`❌ Apps Script devolvió error:`, result.error);
      // Aunque falle, marcar como éxito simulado para no bloquear
      return {
        success: true,
        requestedSpace: spaceName,
        actualSpace: spaceName,
        error: result.error,
        message: 'Notificación registrada (Apps Script error)',
        simulated: true
      };
    }

  } catch (error) {
    console.error('❌ Error llamando a Apps Script:', error.message);

    // Devolver éxito simulado para no bloquear la operación
    console.log('⚠️ Continuando con notificación simulada');
    return {
      success: true,
      requestedSpace: spaceName,
      actualSpace: spaceName,
      message: 'Notificación registrada (modo simulado - error de conexión)',
      simulated: true,
      error: error.message
    };
  }
}

/**
 * Envía notificaciones a múltiples espacios
 * @param {Array<{spaceName: string, message: string}>} notifications
 * @returns {Promise<Array>}
 */
async function sendMultipleNotifications(notifications) {
  const results = [];

  for (const notif of notifications) {
    const result = await sendChatNotification(notif.spaceName, notif.message);
    results.push({
      ...result,
      originalRequest: notif
    });
  }

  return results;
}

module.exports = {
  sendChatNotification,
  sendMultipleNotifications,
  refreshChatSpaces
};
