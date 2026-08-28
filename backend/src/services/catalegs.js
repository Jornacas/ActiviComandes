/**
 * Catàlegs propis d'ActiviComandes, a comandes_app: materials per àrea i nivell,
 * caché de distàncies i espais de Google Chat.
 *
 * Abans vivien als fulls MatCO/MatDX1/MatDX2/MatHC1/MatHC2/MatTC, Distancies i
 * ChatWebhooks.
 */

const activihub = require('./activihub');
const cache = require('./cache');

const db = () => activihub.getClient('comandes_app');

// ======================================================
// MATERIALS
// ======================================================

/**
 * Materials d'una àrea i nivell. TC i JL encara no en tenen: es retorna llista
 * buida i l'app cau a l'entrada manual, com fins ara.
 */
async function getMaterials(codiArea, nivell = null) {
  const clau = `cataleg_materials_${codiArea}_${nivell ?? 'x'}`;
  const cached = cache.get(clau);
  if (cached) return cached;

  let query = db().from('materials')
    .select('concepte')
    .eq('codi_area', codiArea)
    .eq('actiu', true);

  // CO té un únic catàleg (nivell null); DX i HC en tenen un per nivell.
  query = nivell === null ? query.is('nivell', null) : query.eq('nivell', nivell);

  const { data, error } = await query;
  if (error) throw new Error(`Catàleg de materials (${codiArea}): ${error.message}`);

  const materials = [...new Set(data.map(m => m.concepte))]
    .sort((a, b) => a.localeCompare(b, 'ca'));

  cache.set(clau, materials, 1800);
  return materials;
}

/** Tot el catàleg junt. */
async function getTotsElsMaterials() {
  const cached = cache.get('cataleg_materials_tots');
  if (cached) return cached;

  const { data, error } = await db().from('materials').select('concepte').eq('actiu', true);
  if (error) throw new Error(`Catàleg de materials: ${error.message}`);

  const materials = [...new Set(data.map(m => m.concepte))]
    .sort((a, b) => a.localeCompare(b, 'ca'));

  cache.set('cataleg_materials_tots', materials, 1800);
  return materials;
}

// ======================================================
// DISTÀNCIES
// ======================================================

/**
 * Totes les distàncies guardades, indexades per adreça.
 *
 * La versió del full estava trencada: llegia `data.values` sobre una cosa que ja
 * era un array, així que sempre retornava buit i cada consulta acabava trucant
 * (i facturant) a Routes API. A més, desar sempre afegia una fila nova: 442
 * files per a 46 adreces.
 */
async function getDistancies() {
  const cached = cache.get('cataleg_distancies');
  if (cached) return cached;

  const { data, error } = await db().from('distancies').select('*');
  if (error) {
    console.error('[CATALEGS] Error llegint distàncies:', error.message);
    return new Map();
  }

  const perAdreca = new Map(data.map(d => [d.adreca, d]));
  cache.set('cataleg_distancies', perAdreca, 900);
  return perAdreca;
}

/** Desa o actualitza una distància. L'adreça és la clau primària. */
async function saveDistancia(escola, adreca, distanciaMetres, duracioMinuts) {
  if (!adreca) return { success: false, message: 'Falta adreça' };

  const { error } = await db().from('distancies').upsert({
    adreca,
    escola: escola || null,
    distancia_metres: Math.round(distanciaMetres) || 0,
    duracio_minuts: duracioMinuts || 0,
    actualitzat_el: new Date().toISOString()
  }, { onConflict: 'adreca' });

  if (error) {
    console.error('[CATALEGS] Error desant distància:', error.message);
    return { success: false, message: error.message };
  }

  cache.del('cataleg_distancies');
  return { success: true };
}

// ======================================================
// ESPAIS DE GOOGLE CHAT
// ======================================================

/** Espais indexats per nom. */
async function getChatEspais() {
  const cached = cache.get('chat_webhooks_data');
  if (cached) return cached;

  const { data, error } = await db().from('chat_espais').select('nom, space_id');
  if (error) throw new Error(`Espais de Chat: ${error.message}`);

  const perNom = new Map(data.map(e => [e.nom, e.space_id]));
  cache.set('chat_webhooks_data', perNom, 3600);
  return perNom;
}

function invalidateChatEspais() {
  cache.del('chat_webhooks_data');
}

module.exports = {
  getMaterials,
  getTotsElsMaterials,
  getDistancies,
  saveDistancia,
  getChatEspais,
  invalidateChatEspais
};
