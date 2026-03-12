/**
 * Notification service - Business logic for notifications
 * Extracted from routes/admin.js
 */

const sheets = require('./sheets');
const cache = require('./cache');
const chat = require('./chat');

/**
 * Sends a notification via chat and records status in sheet.
 * @param {string} spaceName - Chat space name
 * @param {string} message - Message to send
 * @param {string} orderId - Order ID (optional)
 * @param {string} notificationType - 'intermediario' or 'destinatario' (optional)
 * @returns {object} Result with success, message, data
 */
async function sendNotification(spaceName, message, orderId, notificationType) {
  console.log('📨 SEND NOTIFICATION request received');
  console.log('📨 spaceName:', spaceName);
  console.log('📨 notificationType:', notificationType);
  console.log('📨 orderId:', orderId);

  if (!spaceName || !message) {
    return {
      success: false,
      error: "Falten dades obligatòries (spaceName, message)"
    };
  }

  // Enviar notificación usando el servicio de chat
  const result = await chat.sendChatNotification(spaceName, message);

  if (result.success) {
    // Si hay orderId, actualizar el estado de notificación en Sheets
    if (orderId && notificationType) {
      try {
        const data = await sheets.getSheetData('Respostes');

        if (data && data.length > 1) {
          const headers = data[0];
          const idItemIndex = headers.findIndex(h => h === 'ID_Item');
          const notifColumn = notificationType === 'intermediario'
            ? headers.findIndex(h => h === 'Notificacion_Intermediari')
            : headers.findIndex(h => h === 'Notificacion_Destinatari');

          if (idItemIndex !== -1 && notifColumn !== -1) {
            const updatedData = data.map((row, index) => {
              if (index === 0) return row;
              if (row[idItemIndex] === orderId) {
                row[notifColumn] = 'Enviada';
              }
              return row;
            });

            await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);
            cache.del('cache_respostes_data');
            console.log(`✅ Estado de notificación actualizado para ${orderId}`);
          }
        }
      } catch (updateError) {
        console.error('Error actualizando estado de notificación:', updateError);
        // No fallar si hay error actualizando el estado
      }
    }

    return {
      success: true,
      message: result.message || 'Notificació enviada correctament',
      data: {
        spaceName: result.spaceName,
        spaceId: result.spaceId,
        messageId: result.messageId,
        simulated: result.simulated || false
      }
    };
  } else {
    return {
      success: false,
      error: result.error || 'Error enviant notificació'
    };
  }
}

/**
 * Gets notification status for a single order.
 * @param {string} orderId - Order ID
 * @returns {object} Result with success and status data
 */
async function getNotificationStatus(orderId) {
  console.log('📊 GET NOTIFICATION STATUS request received');
  console.log('📊 orderId:', orderId);

  if (!orderId) {
    return {
      success: false,
      error: "No s'ha proporcionat l'ID de la comanda"
    };
  }

  // Obtener datos del sheet Respostes
  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length < 2) {
    return {
      success: true,
      data: {
        orderId: orderId,
        intermediario: 'Pendent',
        destinatario: 'Pendent'
      }
    };
  }

  const headers = data[0];
  const idItemIndex = headers.findIndex(h => h === 'ID_Item');
  const notifIntermediarioIndex = headers.findIndex(h => h === 'Notificacion_Intermediari');
  const notifDestinatarioIndex = headers.findIndex(h => h === 'Notificacion_Destinatari');

  if (idItemIndex === -1) {
    return {
      success: false,
      error: "Columna ID_Item no trobada"
    };
  }

  // Buscar la fila correspondiente
  const row = data.slice(1).find(r => r[idItemIndex] === orderId);

  if (row) {
    return {
      success: true,
      data: {
        orderId: orderId,
        intermediario: notifIntermediarioIndex !== -1 ? (row[notifIntermediarioIndex] || 'Pendent') : 'Pendent',
        destinatario: notifDestinatarioIndex !== -1 ? (row[notifDestinatarioIndex] || 'Pendent') : 'Pendent'
      }
    };
  } else {
    return {
      success: false,
      error: "No s'ha trobat la comanda amb l'ID proporcionat"
    };
  }
}

/**
 * Gets notification statuses for multiple orders (batch).
 * @param {string[]} orderIds - Array of order IDs
 * @returns {object} Result with success and results map
 */
async function getNotificationStatuses(orderIds) {
  console.log('[NOTIFICATIONS] orderIds:', orderIds);

  if (!orderIds || !Array.isArray(orderIds)) {
    return {
      success: false,
      error: "No s'han proporcionat IDs"
    };
  }

  // Obtener datos del sheet Respostes
  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length < 2) {
    return {
      success: true,
      results: {}
    };
  }

  const headers = data[0];
  const idItemIndex = headers.findIndex(h => h === 'ID_Item');
  const notifIntermediarioIndex = headers.findIndex(h => h === 'Notificacion_Intermediari');
  const notifDestinatarioIndex = headers.findIndex(h => h === 'Notificacion_Destinatari');

  console.log('[NOTIFICATIONS] Headers:', headers);
  console.log('[NOTIFICATIONS] Indices:', { idItemIndex, notifIntermediarioIndex, notifDestinatarioIndex });

  if (idItemIndex === -1) {
    return {
      success: false,
      error: "Columna ID_Item no trobada"
    };
  }

  // Buscar estados de notificación para cada orderId
  const results = {};

  for (const orderId of orderIds) {
    // Buscar la fila correspondiente
    const row = data.slice(1).find(r => r[idItemIndex] === orderId);

    if (row) {
      results[orderId] = {
        intermediario: notifIntermediarioIndex !== -1 ? (row[notifIntermediarioIndex] || 'Pendent') : 'Pendent',
        destinatario: notifDestinatarioIndex !== -1 ? (row[notifDestinatarioIndex] || 'Pendent') : 'Pendent'
      };
    } else {
      // Si no se encuentra la fila, devolver estados por defecto
      results[orderId] = {
        intermediario: 'Pendent',
        destinatario: 'Pendent'
      };
    }
  }

  console.log('[NOTIFICATIONS] Results:', results);

  return {
    success: true,
    results: results
  };
}

/**
 * Sends a grouped notification and updates multiple orders.
 * @param {string} spaceName - Chat space name
 * @param {string} message - Message to send
 * @param {string[]} orderIds - Array of order IDs in the group
 * @param {string} notificationType - 'intermediario' or 'destinatario'
 * @returns {object} Result with success, message, data
 */
async function sendGroupedNotification(spaceName, message, orderIds, notificationType) {
  console.log('📨📦 SEND GROUPED NOTIFICATION request received');
  console.log('📨 spaceName:', spaceName);
  console.log('📨 notificationType:', notificationType);
  console.log('📨 orderIds (group):', orderIds);

  if (!spaceName || !message) {
    return {
      success: false,
      error: "Falten dades obligatòries (spaceName, message)"
    };
  }

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return {
      success: false,
      error: "No s'han proporcionat IDs de comandes"
    };
  }

  // Enviar UNA sola notificación para todo el grupo
  const result = await chat.sendChatNotification(spaceName, message);

  if (result.success) {
    // Actualizar TODOS los pedidos del grupo como notificados
    if (notificationType) {
      try {
        const data = await sheets.getSheetData('Respostes');

        if (data && data.length > 1) {
          const headers = data[0];
          const idItemIndex = headers.findIndex(h => h === 'ID_Item');
          const idPedidoIndex = headers.findIndex(h => h === 'ID_Pedido');
          const notifColumn = notificationType === 'intermediario'
            ? headers.findIndex(h => h === 'Notificacion_Intermediari')
            : headers.findIndex(h => h === 'Notificacion_Destinatari');

          if ((idItemIndex !== -1 || idPedidoIndex !== -1) && notifColumn !== -1) {
            let updatedCount = 0;

            const updatedData = data.map((row, index) => {
              if (index === 0) return row;

              const rowIdItem = row[idItemIndex];
              const rowIdPedido = row[idPedidoIndex];

              // Verificar si este pedido está en el grupo
              const isInGroup = orderIds.some(orderId =>
                orderId === rowIdItem || orderId === rowIdPedido
              );

              if (isInGroup) {
                row[notifColumn] = 'Enviada';
                updatedCount++;
                console.log(`✅ Marked notification sent for ${rowIdItem || rowIdPedido}`);
              }

              return row;
            });

            await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);
            cache.del('cache_respostes_data');
            console.log(`✅ Estado de notificación actualizado para ${updatedCount} pedidos del grupo`);
          }
        }
      } catch (updateError) {
        console.error('Error actualizando estado de notificación:', updateError);
        // No fallar si hay error actualizando el estado
      }
    }

    return {
      success: true,
      message: result.message || 'Notificació enviada correctament',
      data: {
        spaceName: result.actualSpace || result.spaceName,
        spaceId: result.spaceId,
        messageId: result.messageId,
        simulated: result.simulated || false,
        usedFallback: result.usedFallback || false,
        groupSize: orderIds.length
      }
    };
  } else {
    return {
      success: false,
      error: result.error || 'Error enviant notificació'
    };
  }
}

/**
 * Refreshes chat spaces cache.
 * @returns {object} Result with success and message
 */
async function refreshChatSpaces() {
  console.log('🔄 REFRESH CHAT SPACES request received');

  await chat.refreshChatSpaces();

  return {
    success: true,
    message: 'Caché d\'espais de xat refrescada correctament'
  };
}

/**
 * Sends notification to /Staff/COMPRES space.
 * @param {string} dataNecessitat - Date needed (DD/MM/YYYY or YYYY-MM-DD)
 * @param {string} notes - Notes for the purchase
 * @returns {object} Result with success and message
 */
async function sendToCompres(dataNecessitat, notes) {
  console.log('🛒 SEND TO COMPRES request received');
  console.log('🛒 dataNecessitat:', dataNecessitat);
  console.log('🛒 notes:', notes);

  if (!dataNecessitat || !notes) {
    return {
      success: false,
      error: "Falten dades obligatòries (dataNecessitat, notes)"
    };
  }

  // Formatear la fecha de forma legible (ej: "dimarts 25 de novembre")
  const formatDateCatalan = (dateStr) => {
    let date;

    // Detectar el formato: DD/MM/YYYY o YYYY-MM-DD
    if (dateStr.includes('/')) {
      // Formato DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      date = new Date(year, month - 1, day);
    } else if (dateStr.includes('-')) {
      // Formato ISO YYYY-MM-DD
      date = new Date(dateStr);
    } else {
      // Formato desconocido, intentar parsear directamente
      date = new Date(dateStr);
    }

    const diasSemana = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
    const mesesAny = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
                      'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

    const diaSemana = diasSemana[date.getDay()];
    const dia = date.getDate();
    const mes = mesesAny[date.getMonth()];

    return `${diaSemana} ${dia} de ${mes}`;
  };

  const dataFormatada = formatDateCatalan(dataNecessitat);

  // Formatear el mensaje simple
  const message = `📅 **Data necessitat: ${dataFormatada}**\n\n💬 **Notes**: ${notes}`;

  // Enviar al espacio **/Staff/COMPRES
  const result = await chat.sendChatNotification('**/Staff/COMPRES', message);

  if (result.success) {
    console.log('✅ Notificación enviada a **/Staff/COMPRES');
    return {
      success: true,
      message: 'Notificació enviada a **/Staff/COMPRES correctament'
    };
  } else {
    return {
      success: false,
      error: result.error || 'Error enviant notificació a **/Staff/COMPRES'
    };
  }
}

module.exports = {
  sendNotification,
  getNotificationStatus,
  getNotificationStatuses,
  sendGroupedNotification,
  refreshChatSpaces,
  sendToCompres
};
