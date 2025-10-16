/**
 * Módulo para construir mensajes de notificación personalizados
 */

/**
 * Construye el mensaje para el intermediario
 * Solo info relevante: destinatario, fecha, escola destino
 * @param {Object} deliveryData - Datos de la entrega
 * @returns {string} - Mensaje formateado
 */
function buildIntermediaryMessage(deliveryData) {
  const {
    destinatarioNom,
    dataLliuramentDestino,  // Fecha de entrega al destinatario
    dataRecollida,          // Fecha de recogida del material
    escolaDestino,          // Escola donde debe entregar al destinatario
    escolaOrigen            // Escola donde recoge el material
  } = deliveryData;

  let message = `📦 *Tens una entrega per un altre company*\n\n`;

  // Primero: Dónde y cuándo recoge el material
  if (escolaOrigen && dataRecollida) {
    message += `📍 Recollir el material a l'escola *${escolaOrigen}*\n`;
    message += `📅 El: ${formatDateCatalan(dataRecollida)}\n\n`;
  }

  // Después: Destinatario y dónde/cuándo entregar
  message += `👤 *Destinatari:* ${destinatarioNom}\n`;
  message += `🏫 *Escola de lliurament:* ${escolaDestino}\n`;
  message += `📅 *Data prevista:* ${formatDateCatalan(dataLliuramentDestino)}\n`;

  return message;
}

/**
 * Construye el mensaje para el solicitante/destinatario
 * Info completa: quién entrega, dónde, cuándo, qué materiales
 * @param {Object} deliveryData - Datos de la entrega
 * @returns {string} - Mensaje formateado
 */
function buildRecipientMessage(deliveryData) {
  const {
    destinatarioNom,
    dataLliurament,
    escolaReceptora,       // Escola donde el destinatario recibirá el material
    monitorLliurament,
    materials,
    modalitat
  } = deliveryData;

  let message = `📦 *Material preparat per a tu*\n\n`;

  // Info de entrega
  if (modalitat === 'DIRECTA') {
    // Entrega directa: recoge en la academia/origen
    message += `🏫 *Recollir a:* Academia (Eixos Creativa)\n`;
    message += `📅 *Data prevista:* ${formatDateCatalan(dataLliurament)}\n`;
  } else {
    // Entrega con intermediario: el monitor te lo entrega en TU escola
    message += `👤 *T'ho entregarà:* ${monitorLliurament}\n`;
    message += `🏫 *A l'escola:* ${escolaReceptora}\n`;
    message += `📅 *Data prevista:* ${formatDateCatalan(dataLliurament)}\n`;
  }

  // Listado de materiales
  if (materials && materials.length > 0) {
    message += `\n📋 *Materials:*\n`;

    // Agrupar por escola solicitante (para mostrar materiales por centro)
    const materialsBySchool = new Map();
    materials.forEach(item => {
      const escolaSolicitante = item.escola;
      if (!materialsBySchool.has(escolaSolicitante)) {
        materialsBySchool.set(escolaSolicitante, []);
      }
      materialsBySchool.get(escolaSolicitante).push(item);
    });

    // Mostrar materiales agrupados por escola solicitante
    for (const [escolaSolicitante, items] of materialsBySchool) {
      // SIEMPRE mostrar el nombre de la escola (tanto en directa como con intermediario)
      message += `   🏫 *Per ${escolaSolicitante}:*\n`;

      items.forEach(item => {
        message += `   • ${item.material}`;
        if (item.unitats && item.unitats > 1) {
          message += ` (${item.unitats} unitats)`;
        }
        message += `\n`;
      });

      if (materialsBySchool.size > 1) {
        message += `\n`; // Espacio entre grupos
      }
    }

    // Aviso si hay materiales para otras escuelas
    if (materialsBySchool.size > 1) {
      message += `⚠️ *Nota:* Hi ha material per diferents centres. Revisa el detall.`;
    }
  }

  return message;
}

/**
 * Formatea una fecha al formato catalán legible
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada (ej: "dimarts 22 d'octubre")
 */
function formatDateCatalan(date) {
  if (!date) return 'Data no especificada';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const dies = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
  const mesos = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
                 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

  const diaNom = dies[dateObj.getDay()];
  const dia = dateObj.getDate();
  const mes = mesos[dateObj.getMonth()];

  return `${diaNom} ${dia} de ${mes}`;
}

/**
 * Construye el espacio de chat basado en la actividad
 * @param {string} escola - Nombre de la escola
 * @param {string} activitat - Código de actividad (ej: "DX1")
 * @returns {string} - Nombre del espacio (ej: "/LestonnacDX1")
 */
function buildChatSpace(escola, activitat) {
  // Normalizar nombre de escola (quitar caracteres especiales, espacios, etc.)
  let spaceName = escola.replace(/\s+/g, '');

  // Añadir "/" al principio si no lo tiene
  if (!spaceName.startsWith('/')) {
    spaceName = '/' + spaceName;
  }

  // Añadir actividad si existe
  if (activitat && activitat !== 'N/A' && activitat.trim() !== '') {
    spaceName += activitat;
  }

  return spaceName;
}

module.exports = {
  buildIntermediaryMessage,
  buildRecipientMessage,
  formatDateCatalan,
  buildChatSpace
};
