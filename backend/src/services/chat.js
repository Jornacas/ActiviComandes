/**
 * Notificacions a Google Chat.
 *
 * Publica directament amb la Chat API. El compte de servei suplanta un usuari del
 * Workspace (delegació de domini) i els missatges surten en nom seu, igual que feia
 * l'Apps Script amb "Execute as: Me".
 *
 * Muntatge (fet el 28-08-2026, no cal repetir-lo):
 *  1. admin.google.com → Controls d'API → Delegació de tot el domini:
 *     client ID del compte de servei + scope chat.messages.create
 *  2. console.cloud.google.com → projecte activiconta → Google Chat API →
 *     Configuració: nom, avatar i descripció, amb les funcions interactives
 *     DESACTIVADES. Sense aquest pas la API respon "Google Chat app not found",
 *     encara que la delegació sigui correcta.
 *  3. GOOGLE_CHAT_IMPERSONATE_USER al .env (i a Vercel).
 *
 * Comprovació: `node backend/scripts/check-chat.js "<espai>"`.
 *
 * Nota: aquest servei diu la veritat quan un enviament falla. El webhook d'Apps
 * Script que hi havia abans retornava `success: true` encara que el missatge no
 * sortís, i notifications.js fa servir aquest valor per marcar la comanda com a
 * notificada — o sigui que els errors quedaven enterrats.
 */

const { google } = require('googleapis');
const cache = require('./cache');
const sheets = require('./sheets');

const IMPERSONATE_USER = process.env.GOOGLE_CHAT_IMPERSONATE_USER;
// Mínim privilegi: només publicar. `chat.messages` a seques també permetria
// llegir, editar i esborrar tots els missatges del compte suplantat.
const CHAT_SCOPES = ['https://www.googleapis.com/auth/chat.messages.create'];

if (!IMPERSONATE_USER) {
  console.warn('WARNING: GOOGLE_CHAT_IMPERSONATE_USER no està configurada. Les notificacions de Google Chat fallaran.');
}

let chatClient = null;

/** Client de la Chat API que publica en nom de l'usuari suplantat. */
async function getChatClient() {
  if (chatClient) return chatClient;

  if (!IMPERSONATE_USER) {
    throw new Error('GOOGLE_CHAT_IMPERSONATE_USER no està configurada');
  }

  const credentials = sheets.getCredentials();
  const jwt = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: CHAT_SCOPES,
    subject: IMPERSONATE_USER
  });

  await jwt.authorize();
  chatClient = google.chat({ version: 'v1', auth: jwt });
  console.log(`[CHAT] Client autoritzat com a ${IMPERSONATE_USER}`);
  return chatClient;
}

/**
 * Busca el Space ID pel nom al full ChatWebhooks.
 *
 * Manté el fallback seqüencial que feia l'Apps Script: si no troba
 * "/LestonnacDX1A", prova "/LestonnacDX1", "/LestonnacDX"… fins a "/Lestonnac".
 * Així una activitat sense espai propi acaba a l'espai de l'escola.
 */
async function getSpaceIdByName(spaceName) {
  let webhooks = cache.get('chat_webhooks_data');

  if (!webhooks) {
    const data = await sheets.getSheetData('ChatWebhooks');
    webhooks = new Map();
    for (const row of (data || []).slice(1)) {
      if (row[0] && row[1]) webhooks.set(String(row[0]).trim(), String(row[1]).trim());
    }
    cache.set('chat_webhooks_data', webhooks, 3600);
  }

  const demanat = String(spaceName || '').trim();
  let name = demanat;

  while (name.length > 1) {
    const spaceId = webhooks.get(name);
    if (spaceId) {
      return { spaceId, matchedName: name, usedFallback: name !== demanat };
    }
    name = name.slice(0, -1);
  }

  return null;
}

/**
 * Envia un missatge a un espai de Google Chat.
 * @param {string} spaceName - Nom de l'espai al full ChatWebhooks
 * @param {string} message - Text del missatge
 */
async function sendChatNotification(spaceName, message) {
  const match = await getSpaceIdByName(spaceName);

  if (!match) {
    const error = `No s'ha trobat cap Space ID per a "${spaceName}" al full ChatWebhooks`;
    console.error(`[CHAT] ✗ ${error}`);
    return { success: false, error, requestedSpace: spaceName, actualSpace: null };
  }

  const { spaceId, matchedName, usedFallback } = match;

  // El fallback pot acabar en un espai molt més ampli que el demanat (per exemple
  // "**/Staff/GESTIÓ" → "**/Staff", de 3 a 7 persones) si el nom no coincideix
  // exactament, cosa que passa fàcil amb accents. Que es vegi.
  if (usedFallback) {
    console.warn(`[CHAT] ⚠ "${spaceName}" no existeix: s'envia a "${matchedName}" (fallback)`);
  }

  try {
    const chat = await getChatClient();
    const response = await chat.spaces.messages.create({
      parent: spaceId,
      requestBody: { text: message }
    });

    console.log(`[CHAT] ✓ Missatge enviat a ${matchedName} (${spaceId})`);
    return {
      success: true,
      requestedSpace: spaceName,
      actualSpace: matchedName,
      spaceId,
      messageId: response.data.name,
      message: usedFallback
        ? `Notificació enviada a "${matchedName}" (l'espai "${spaceName}" no existeix)`
        : 'Notificació enviada correctament',
      usedFallback
    };
  } catch (error) {
    const detail = error.errors?.[0]?.message || error.message;
    console.error(`[CHAT] ✗ Error enviant a ${matchedName} (${spaceId}): ${detail}`);
    return {
      success: false,
      error: `Chat API: ${detail}`,
      requestedSpace: spaceName,
      actualSpace: null,
      spaceId
    };
  }
}

/** Envia a diversos espais, en sèrie. */
async function sendMultipleNotifications(notifications) {
  const results = [];
  for (const notif of notifications) {
    const result = await sendChatNotification(notif.spaceName, notif.message);
    results.push({ ...result, originalRequest: notif });
  }
  return results;
}

/** Buida la caché d'espais (quan s'han afegit o canviat files a ChatWebhooks). */
async function refreshChatSpaces() {
  cache.del('chat_webhooks_data');
  console.log('[CHAT] Caché d\'espais buidada');
}

module.exports = {
  sendChatNotification,
  sendMultipleNotifications,
  refreshChatSpaces,
  getSpaceIdByName
};
