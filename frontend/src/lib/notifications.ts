// Sistema de notificaciones automáticas
export interface NotificationData {
  orderId: string;
  monitorIntermediario: string;
  escolaDestino: string;
  dataEntrega: string;
  material: string;
  solicitante: string;
  escolaDestinoIntermediario: string;
}

// Función para enviar notificación al intermediario
export const sendNotificationToIntermediary = async (data: NotificationData): Promise<boolean> => {
  try {
    // Por ahora, simulamos el envío
    // TODO: Implementar Google Chat API
    console.log('📱 Notificación al intermediario:', {
      destinatario: data.monitorIntermediario,
      mensaje: `🔔 NOVA ASSIGNACIÓ DE MATERIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Intermediari: ${data.monitorIntermediario}

📥 RECEBIRÀS MATERIAL:
🏫 Escola: ${data.escolaDestinoIntermediario}
📅 Data: ${data.dataEntrega}
📦 Material: ${data.material}

📤 LLIURARÀS MATERIAL:
🏫 Escola: ${data.escolaDestino}
📅 Data: ${data.dataEntrega}
👤 Per: ${data.solicitante}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✅ Confirmar recepció] [❌ Hi ha un problema]`
    });
    
    return true;
  } catch (error) {
    console.error('Error enviando notificación al intermediario:', error);
    return false;
  }
};

// Función para enviar notificación al destinatario final
export const sendNotificationToDestinatario = async (data: NotificationData): Promise<boolean> => {
  try {
    // Por ahora, simulamos el envío
    // TODO: Implementar Google Chat API
    console.log('📱 Notificación al destinatario final:', {
      destinatario: data.solicitante,
      mensaje: `📦 MATERIAL ASSIGNAT PER LLIURAMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Sol·licitant: ${data.solicitante}

📦 MATERIAL:
${data.material}

🚚 LLIURAMENT:
👤 Intermediari: ${data.monitorIntermediario}
🏫 Escola: ${data.escolaDestino}
📅 Data: ${data.dataEntrega}
⏰ Hora: Durant l'activitat

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✅ Confirmar recepció] [❌ Hi ha un problema]`
    });
    
    return true;
  } catch (error) {
    console.error('Error enviando notificación al destinatario:', error);
    return false;
  }
};

// Función principal para enviar todas las notificaciones
export const sendAllNotifications = async (data: NotificationData): Promise<{
  intermediarySuccess: boolean;
  destinatarioSuccess: boolean;
}> => {
  console.log('🚀 Enviando notificaciones automáticas...');
  
  // Enviar notificaciones en paralelo
  const [intermediaryResult, destinatarioResult] = await Promise.all([
    sendNotificationToIntermediary(data),
    sendNotificationToDestinatario(data)
  ]);
  
  return {
    intermediarySuccess: intermediaryResult,
    destinatarioSuccess: destinatarioResult
  };
};
