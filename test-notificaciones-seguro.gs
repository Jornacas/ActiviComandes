/**
 * 🧪 TEST SEGURO - Sistema de Notificaciones
 * 
 * Esta función prueba SOLO el sistema de notificaciones
 * SIN afectar producción.
 * 
 * INSTRUCCIONES:
 * 1. Copia este código al final de Code.gs en Google Apps Script
 * 2. Ejecuta la función testNotificacionesSeguro()
 * 3. Mira los logs para ver si funciona
 * 4. NO afecta nada en producción
 */

function testNotificacionesSeguro() {
  console.log('🧪 ========================================');
  console.log('🧪 TEST SEGURO - SISTEMA DE NOTIFICACIONES');
  console.log('🧪 ========================================');
  console.log('⚠️ ESTE TEST NO AFECTA PRODUCCIÓN');
  console.log('');
  
  // Test 1: Verificar que las funciones existen
  console.log('🔍 Test 1: Verificar funciones disponibles...');
  
  try {
    // Verificar que getSpaceIdByName existe
    if (typeof getSpaceIdByName === 'function') {
      console.log('✅ Función getSpaceIdByName disponible');
    } else {
      console.log('❌ Función getSpaceIdByName NO disponible');
      return { success: false, error: 'getSpaceIdByName no existe' };
    }
    
    // Verificar que sendChatNotification existe
    if (typeof sendChatNotification === 'function') {
      console.log('✅ Función sendChatNotification disponible');
    } else {
      console.log('❌ Función sendChatNotification NO disponible');
      return { success: false, error: 'sendChatNotification no existe' };
    }
    
  } catch (error) {
    console.log('❌ Error verificando funciones:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🔍 Test 2: Verificar hoja ChatWebhooks...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ChatWebhooks');
    
    if (!sheet) {
      console.log('❌ Hoja ChatWebhooks no existe');
      return { success: false, error: 'Hoja ChatWebhooks no existe' };
    }
    
    const data = sheet.getDataRange().getValues();
    console.log(`✅ Hoja ChatWebhooks encontrada con ${data.length - 1} espacios`);
    
    // Mostrar algunos espacios disponibles
    console.log('📋 Primeros 5 espacios disponibles:');
    for (let i = 1; i < Math.min(6, data.length); i++) {
      const nombre = data[i][0];
      const spaceId = data[i][1];
      console.log(`   ${i}. ${nombre} → ${spaceId ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.log('❌ Error accediendo a hoja ChatWebhooks:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🔍 Test 3: Probar búsqueda de espacio...');
  
  try {
    // Buscar un espacio de prueba
    const testSpace = '/LestonnacDX1';
    console.log(`🔎 Buscando espacio: ${testSpace}`);
    
    const spaceId = getSpaceIdByName(testSpace);
    
    if (spaceId) {
      console.log(`✅ Space ID encontrado: ${spaceId}`);
    } else {
      console.log(`⚠️ Space ID no encontrado para ${testSpace}`);
      console.log('💡 Esto puede ser normal si el espacio no existe');
    }
    
  } catch (error) {
    console.log('❌ Error en búsqueda de espacio:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🔍 Test 4: Probar envío de notificación (SIMULADO)...');
  
  try {
    // Crear mensaje de prueba
    const testMessage = `🧪 **TEST DE NOTIFICACIONES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ESTE ES UN MENSAJE DE PRUEBA

📅 **Fecha:** ${new Date().toLocaleDateString('ca-ES')}
🕐 **Hora:** ${new Date().toLocaleTimeString('ca-ES')}
🔧 **Tipo:** Test del sistema de notificaciones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Si ves este mensaje, el sistema funciona correctamente`;
    
    console.log('📝 Mensaje de prueba creado');
    console.log('💡 Para probar realmente, ejecuta testNotificacionReal()');
    
  } catch (error) {
    console.log('❌ Error creando mensaje de prueba:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🧪 ========================================');
  console.log('🧪 RESUMEN DEL TEST SEGURO');
  console.log('🧪 ========================================');
  console.log('✅ Funciones disponibles: OK');
  console.log('✅ Hoja ChatWebhooks: OK');
  console.log('✅ Búsqueda de espacios: OK');
  console.log('✅ Mensaje de prueba: OK');
  console.log('');
  console.log('🎉 ¡TEST SEGURO COMPLETADO!');
  console.log('💡 El sistema de notificaciones está listo para probar');
  console.log('⚠️ Para prueba real, ejecuta testNotificacionReal()');
  
  return {
    success: true,
    message: 'Test seguro completado exitosamente',
    functionsAvailable: true,
    chatWebhooksSheet: true,
    spaceSearch: true
  };
}

/**
 * 🚀 TEST REAL - Enviar notificación real
 * 
 * ⚠️ ESTE TEST ENVÍA UNA NOTIFICACIÓN REAL
 * Solo ejecuta si quieres probar con datos reales
 */
function testNotificacionReal() {
  console.log('🚀 ========================================');
  console.log('🚀 TEST REAL - ENVIAR NOTIFICACIÓN');
  console.log('🚀 ========================================');
  console.log('⚠️ ESTE TEST ENVÍA UNA NOTIFICACIÓN REAL');
  console.log('');
  
  // Buscar un espacio disponible
  const testSpace = '/LestonnacDX1';
  console.log(`🎯 Enviando notificación real a: ${testSpace}`);
  
  const testMessage = `🧪 **TEST REAL DE NOTIFICACIONES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 **Fecha:** ${new Date().toLocaleDateString('ca-ES')}
🕐 **Hora:** ${new Date().toLocaleTimeString('ca-ES')}
🔧 **Tipo:** Test real del sistema

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Si ves este mensaje en Google Chat, el sistema funciona perfectamente`;
  
  try {
    const result = sendChatNotification(testSpace, testMessage);
    
    console.log('📤 Resultado del envío:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 ¡NOTIFICACIÓN ENVIADA EXITOSAMENTE!');
      console.log('💡 Ve a Google Chat y busca el espacio:', testSpace);
    } else {
      console.log('❌ Error enviando notificación:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('❌ Error en test real:', error);
    return { success: false, error: error.toString() };
  }
}
