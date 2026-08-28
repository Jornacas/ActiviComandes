/**
 * Comprovació de les notificacions de Google Chat.
 *   node backend/scripts/check-chat.js                    → només comprova la delegació
 *   node backend/scripts/check-chat.js "**\/Staff/COMPRES" → a més, ENVIA un missatge de prova
 *
 * Sense argument no publica res: només intercanvia el JWT per un token, que és el
 * que falla si la delegació de domini no està autoritzada.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const sheets = require('../src/services/sheets');
const chat = require('../src/services/chat');

const USER = process.env.GOOGLE_CHAT_IMPERSONATE_USER;
const SCOPE = 'https://www.googleapis.com/auth/chat.messages.create';

async function main() {
  if (!USER) {
    console.log('GOOGLE_CHAT_IMPERSONATE_USER no està al .env — el backend usarà el webhook d\'Apps Script.');
    process.exit(1);
  }

  const credentials = sheets.getCredentials();
  console.log(`· Compte de servei: ${credentials.client_email}`);
  console.log(`· Client ID:        ${credentials.client_id}`);
  console.log(`· Suplantant:       ${USER}`);

  const jwt = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [SCOPE],
    subject: USER
  });

  try {
    await jwt.authorize();
    console.log('· Delegació:        OK');
  } catch (error) {
    const code = error.response?.data?.error || error.message;
    console.log(`· Delegació:        KO (${code})`);
    console.log('');
    if (String(code).includes('unauthorized_client')) {
      console.log('  Falta autoritzar el client ID a admin.google.com:');
      console.log('    Seguretat → Accés i control de dades → Controls d\'API');
      console.log('    → Delegació de tot el domini → Afegir nova');
      console.log(`      ID de client: ${credentials.client_id}`);
      console.log(`      Àmbits:       ${SCOPE}`);
      console.log('  Cal ser superadministrador. Triga uns minuts a propagar-se.');
    } else if (String(code).includes('invalid_grant')) {
      console.log(`  El client ID està autoritzat però "${USER}" no serveix com a compte`);
      console.log('  suplantat: ha de ser un USUARI real del domini, no un àlies ni un grup.');
    }
    process.exit(1);
  }

  const espai = process.argv[2];
  if (!espai) {
    console.log('');
    console.log('OK — la delegació funciona. Per provar un enviament real:');
    console.log('  node backend/scripts/check-chat.js "<nom de l\'espai a ChatWebhooks>"');
    return;
  }

  console.log('');
  console.log(`· Enviant missatge de prova a ${espai}…`);
  const result = await chat.sendChatNotification(
    espai,
    '🧪 Prova d\'ActiviComandes: notificacions directes des del backend, sense Apps Script.'
  );

  if (result.success) {
    if (result.usedFallback) {
      console.log(`· ATENCIÓ: "${espai}" no existeix al full; s'ha enviat a "${result.actualSpace}"`);
    }
    console.log(`· Enviat OK · space ${result.spaceId} · id ${result.messageId}`);
    console.log('');
    console.log('OK — es pot retirar notificaciones.gs i APPS_SCRIPT_NOTIFICATION_URL.');
  } else {
    console.log(`· KO · ${result.error}`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('KO —', e.message);
  process.exit(1);
});
