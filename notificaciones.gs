/**
 * notificaciones.gs
 *
 * Microservicio de Apps Script SOLO para enviar notificaciones a Google Chat
 * El backend Node.js llama a este script vía HTTP cuando necesita enviar notificaciones
 *
 * DEPLOY COMO WEB APP:
 * 1. Deploy → New deployment → Web app
 * 2. Execute as: Me
 * 3. Who has access: Anyone (o tu dominio si tienes Workspace)
 * 4. Copiar URL y añadirla a .env del backend como APPS_SCRIPT_NOTIFICATION_URL
 */

// ID del Google Sheet con los datos
const SPREADSHEET_ID = '1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw';

/**
 * Función que recibe llamadas HTTP POST desde el backend Node.js
 * @param {Object} e - Evento con los datos del POST
 * @return {Object} - Respuesta en formato JSON
 */
function doPost(e) {
  try {
    console.log('📨 Recibida petición de notificación desde backend');

    // Parsear datos recibidos
    const data = JSON.parse(e.postData.contents);
    const spaceName = data.spaceName;
    const message = data.message;

    console.log(`📋 SpaceName: ${spaceName}`);
    console.log(`📝 Message length: ${message.length} caracteres`);

    // Validar datos
    if (!spaceName || !message) {
      return createJsonResponse({
        success: false,
        error: 'Faltan parámetros: spaceName y message son requeridos'
      });
    }

    // Enviar notificación usando la función existente
    const result = sendChatNotification(spaceName, message);

    console.log(`📤 Resultado: ${result.success ? 'Éxito' : 'Error'}`);

    return createJsonResponse(result);

  } catch (error) {
    console.error('❌ Error en doPost:', error);
    return createJsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * Función GET para verificar que el endpoint está activo
 * @param {Object} e - Evento
 * @return {Object} - Respuesta de estado
 */
function doGet(e) {
  return createJsonResponse({
    success: true,
    service: 'ActiviComandes Notificaciones',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    message: 'Servicio de notificaciones de Google Chat funcionando correctamente'
  });
}

/**
 * Crea una respuesta JSON para devolver al cliente
 * @param {Object} data - Datos a devolver
 * @return {TextOutput} - Respuesta formateada
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Busca el Space ID por nombre en la hoja ChatWebhooks con lógica de fallback
 * @param {string} spaceName - Nombre del espacio (ej: "/LestonnacDX1A")
 * @return {string|null} - Space ID o null si no se encuentra
 */
function getSpaceIdByName(spaceName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('ChatWebhooks');

    if (!sheet) {
      console.error('❌ Hoja ChatWebhooks no existe');
      return null;
    }

    const data = sheet.getDataRange().getValues();

    // Función auxiliar para buscar un nombre específico
    const findSpaceId = (name) => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === name) {
          const spaceId = data[i][1]; // Columna B = Space ID
          console.log(`✅ Space ID encontrado para ${name}: ${spaceId}`);
          return spaceId;
        }
      }
      return null;
    };

    // 1. Intentar búsqueda exacta
    let spaceId = findSpaceId(spaceName);
    if (spaceId) return spaceId;

    // 2. Si no se encuentra, intentar fallback secuencial (quitar último carácter)
    console.log(`🔍 Búsqueda con fallback secuencial para: ${spaceName}`);

    let currentName = spaceName;
    while (currentName.length > 1) {
      // Quitar el último carácter
      currentName = currentName.slice(0, -1);

      spaceId = findSpaceId(currentName);
      if (spaceId) {
        console.log(`✅ Space ID encontrado (fallback) para ${spaceName} → ${currentName}: ${spaceId}`);
        return spaceId;
      }

      console.log(`   🔍 Probando: ${currentName} - No encontrado`);
    }

    console.warn(`⚠️ No se encontró Space ID para: ${spaceName} (ni con fallback)`);
    return null;
  } catch (error) {
    console.error('❌ Error buscando Space ID:', error);
    return null;
  }
}

/**
 * Envía una notificación a un espacio de Google Chat usando Chat API
 * @param {string} spaceName - Nombre del espacio (ej: "/LestonnacDX1A")
 * @param {string} message - Mensaje a enviar
 * @return {Object} - Resultado del envío
 */
function sendChatNotification(spaceName, message) {
  try {
    console.log(`📤 Intentando enviar notificación a: ${spaceName}`);

    // Buscar Space ID
    const spaceId = getSpaceIdByName(spaceName);

    if (!spaceId) {
      const errorMsg = `No se encontró Space ID para: ${spaceName}. Verifica la hoja ChatWebhooks.`;
      console.error(`❌ ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        spaceName: spaceName
      };
    }

    // Enviar mensaje usando Chat API REST
    try {
      const url = `https://chat.googleapis.com/v1/${spaceId}/messages`;
      const payload = JSON.stringify({
        text: message
      });

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
        },
        payload: payload,
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        const result = JSON.parse(response.getContentText());
        console.log(`✅ Mensaje enviado correctamente a ${spaceName} (${spaceId})`);
        return {
          success: true,
          spaceName: spaceName,
          spaceId: spaceId,
          message: 'Notificación enviada correctamente',
          messageId: result.name
        };
      } else {
        const errorText = response.getContentText();
        console.error(`❌ Error ${responseCode} enviando mensaje:`, errorText);
        return {
          success: false,
          error: `Error de Chat API (${responseCode}): ${errorText}`,
          spaceName: spaceName,
          spaceId: spaceId
        };
      }

    } catch (apiError) {
      console.error(`❌ Error enviando mensaje con Chat API:`, apiError);
      return {
        success: false,
        error: `Error de Chat API: ${apiError.toString()}`,
        spaceName: spaceName,
        spaceId: spaceId
      };
    }
  } catch (error) {
    console.error('❌ Error general en sendChatNotification:', error);
    return {
      success: false,
      error: error.toString(),
      spaceName: spaceName
    };
  }
}

/**
 * Función de prueba manual
 * Ejecuta esto para probar que todo funciona
 */
function testNotification() {
  const testSpaceName = '/VilaOlimpicaCO';
  const testMessage = '🧪 TEST: Mensaje de prueba desde notificaciones.gs';

  console.log('=== INICIANDO TEST DE NOTIFICACIÓN ===');
  const result = sendChatNotification(testSpaceName, testMessage);

  console.log('\n=== RESULTADO ===');
  console.log(JSON.stringify(result, null, 2));

  return result;
}
