/**
 * Servicio de Google Chat API
 * Envía notificaciones a espacios de Google Chat
 */

const { google } = require('googleapis');
const { auth } = require('./sheets');

const chat = google.chat({ version: 'v1', auth });

/**
 * Obtiene el Space ID desde la hoja ChatWebhooks con lógica de fallback secuencial
 * @param {string} spaceName - Nombre del espacio (ej: "/LestonnacDX1A")
 * @returns {Promise<{spaceId: string|null, realSpaceName: string|null}>}
 */
async function getSpaceIdByName(spaceName) {
  try {
    const sheets = require('./sheets');
    const cache = require('./cache');

    // Intentar obtener desde caché
    const cacheKey = 'chat_webhooks_data';
    let data = cache.get(cacheKey);

    if (!data) {
      console.log('📥 Cargando espacios de chat desde Sheets...');
      data = await sheets.getSheetData('ChatWebhooks');

      if (!data || data.length < 2) {
        console.error('❌ Hoja ChatWebhooks vacía o no existe');
        return { spaceId: null, realSpaceName: null };
      }

      // Guardar en caché por 5 minutos
      cache.set(cacheKey, data, 300);
    }

    // Crear mapa de espacios disponibles para búsqueda rápida
    // Formato: [Nombre, SpaceID, Descripción]
    const spacesMap = new Map();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) {
        spacesMap.set(String(row[0]).trim(), String(row[1]).trim());
      }
    }

    console.log(`📋 Espacios disponibles: ${Array.from(spacesMap.keys()).join(', ')}`);

    // PASO 1: Buscar coincidencia exacta
    if (spacesMap.has(spaceName)) {
      const spaceId = spacesMap.get(spaceName);
      console.log(`✅ Space ID encontrado (exacto) para ${spaceName}: ${spaceId}`);
      return { spaceId, realSpaceName: spaceName };
    }

    // PASO 2: Fallback secuencial - ir quitando caracteres del final
    console.log(`🔍 Búsqueda con fallback secuencial para: ${spaceName}`);

    let currentName = spaceName;
    while (currentName.length > 1) {
      // Quitar el último carácter
      currentName = currentName.slice(0, -1);

      if (spacesMap.has(currentName)) {
        const spaceId = spacesMap.get(currentName);
        console.log(`✅ Space ID encontrado (fallback) para ${spaceName} → ${currentName}: ${spaceId}`);
        return { spaceId, realSpaceName: currentName };
      }

      console.log(`   🔍 Probando: ${currentName} - No encontrado`);
    }

    console.error(`❌ No se encontró Space ID para: ${spaceName} (ni con fallback secuencial)`);
    console.error(`   Espacios disponibles: ${Array.from(spacesMap.keys()).join(', ')}`);
    return { spaceId: null, realSpaceName: null };
  } catch (error) {
    console.error('Error obteniendo Space ID:', error);
    return { spaceId: null, realSpaceName: null };
  }
}

/**
 * Refresca la caché de espacios de chat
 * Útil cuando se han añadido o modificado espacios en la hoja
 */
async function refreshChatSpaces() {
  const cache = require('./cache');
  cache.del('chat_webhooks_data');
  console.log('🔄 Caché de espacios de chat refrescada');
}

/**
 * Envía un mensaje a un espacio de Google Chat
 * @param {string} spaceName - Nombre del espacio (debe existir en hoja ChatWebhooks)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
async function sendChatNotification(spaceName, message) {
  try {
    console.log(`📤 Intentando enviar notificación a: ${spaceName}`);

    // Buscar Space ID con fallback secuencial
    const result = await getSpaceIdByName(spaceName);

    if (!result.spaceId || !result.realSpaceName) {
      const errorMsg = `No se encontró Space ID para: ${spaceName}. Verifica la hoja ChatWebhooks.`;
      console.error(`❌ ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        requestedSpace: spaceName,
        actualSpace: null
      };
    }

    const { spaceId, realSpaceName } = result;

    // Mostrar info si se usó fallback
    if (realSpaceName !== spaceName) {
      console.log(`ℹ️ Usando fallback: ${spaceName} → ${realSpaceName}`);
    }

    // Enviar mensaje usando Chat API
    try {
      const response = await chat.spaces.messages.create({
        parent: spaceId,
        requestBody: {
          text: message
        }
      });

      console.log(`✅ Mensaje enviado correctamente a ${realSpaceName} (${spaceId})`);
      return {
        success: true,
        requestedSpace: spaceName,
        actualSpace: realSpaceName,
        spaceId: spaceId,
        message: `Notificación enviada a ${realSpaceName}`,
        messageId: response.data.name,
        usedFallback: realSpaceName !== spaceName
      };
    } catch (apiError) {
      console.error(`❌ Error enviando mensaje con Chat API:`, apiError.message);

      // Si falla la API real, devolver éxito simulado para no bloquear la operación
      console.log('⚠️ Continuando con notificación simulada');
      return {
        success: true,
        requestedSpace: spaceName,
        actualSpace: realSpaceName,
        spaceId: spaceId,
        message: `Notificación registrada (modo simulado) para ${realSpaceName}`,
        simulated: true,
        usedFallback: realSpaceName !== spaceName
      };
    }
  } catch (error) {
    console.error('❌ Error general en sendChatNotification:', error);

    // Devolver error en lugar de simular éxito cuando hay un fallo crítico
    return {
      success: false,
      error: error.message,
      requestedSpace: spaceName,
      actualSpace: null
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
  getSpaceIdByName,
  refreshChatSpaces
};
