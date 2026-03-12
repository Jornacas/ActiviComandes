/**
 * Utils/helpers.js - Funcions utilitàries centralitzades
 * Extretes de admin.js i mobile.js per evitar duplicació
 */

/**
 * Genera un UUID v4 aleatori
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Formata un objecte Date a string YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parseja un timestamp en format DD/MM/YYYY HH:MM:SS a objecte Date.
 * Si ja és un Date, el retorna directament.
 * Si no coincideix amb el format, intenta un parse genèric.
 */
function parseTimestamp(ts) {
  if (!ts) return new Date(0);

  // Si ya es un objeto Date, devolverlo
  if (ts instanceof Date) return ts;

  const str = String(ts);

  // Formato: DD/MM/YYYY HH:MM:SS
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (match) {
    const [_, day, month, year, hour, minute, second] = match;
    // Los meses en JavaScript son 0-indexed
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                    parseInt(hour), parseInt(minute), parseInt(second));
  }

  // Intentar parsear como fecha normal si no coincide con el formato
  return new Date(ts);
}

/**
 * Retorna les capçaleres per defecte del full de Respostes
 */
function getDefaultHeaders() {
  return [
    "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
    "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
    "comentarisGenerals", "entregaManual", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
  ];
}

/**
 * Mapeja un nom de capçalera del full a la seva clau camelCase.
 * Suporta noms alternatius de columnes (Modalitat_Entrega / Modalitat_Lliurament, etc.)
 */
function mapHeaderToKey(header) {
  const map = {
    'Timestamp': 'timestamp',
    'ID_Pedido': 'idPedido',
    'ID_Item': 'idItem',
    'Nom_Cognoms': 'nomCognoms',
    'Data_Necessitat': 'dataNecessitat',
    'Escola': 'escola',
    'Activitat': 'activitat',
    'Material': 'material',
    'Es_Material_Personalitzat': 'esMaterialPersonalitzat',
    'Unitats': 'unitats',
    'Comentaris_Generals': 'comentarisGenerals',
    'Estat': 'estat',
    'Data_Estat': 'dataEstat',
    'Responsable_Preparacio': 'responsablePreparacio',
    'Notes_Internes': 'notesInternes',
    'Modalitat_Entrega': 'modalitatEntrega',
    'Modalitat_Lliurament': 'modalitatEntrega', // Support both column names
    'Monitor_Intermediari': 'monitorIntermediari',
    'Escola_Destino_Intermediari': 'escolaDestinoIntermediari',
    'Escola_Recollida_Intermediari': 'pickupSchool',
    'Activitat_Intermediari': 'activitatIntermediari',
    'Data_Entrega_Prevista': 'dataEntregaPrevista',
    'Data_Lliurament_Prevista': 'dataLliuramentPrevista',
    'ID_Lliurament': 'idLliurament',
    'Distancia_Academia': 'idLliurament', // Columna V reutilizada como ID_Lliurament
    'Notes_Entrega': 'notesEntrega'
  };
  return map[header] || String(header).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

/**
 * Centralitza el patró repetit de headers.findIndex() per a les columnes comunes
 * del full de Respostes. Retorna un objecte amb els índexs de cada columna.
 *
 * @param {string[]} headers - Array de capçaleres del full
 * @returns {object} Objecte amb els índexs de les columnes
 */
function getColumnIndices(headers) {
  const idItemIndex = headers.findIndex(h => h === 'ID_Item');
  const idPedidoIndex = headers.findIndex(h => h === 'ID_Pedido');
  const estatIndex = headers.findIndex(h => h === 'Estat');
  const dataEstatIndex = headers.findIndex(h => h === 'Data_Estat');

  // Modalitat: suporta ambdós noms de columna
  let modalitatEntregaIndex = headers.findIndex(h => h === 'Modalitat_Entrega');
  if (modalitatEntregaIndex === -1) {
    modalitatEntregaIndex = headers.findIndex(h => h === 'Modalitat_Lliurament');
  }

  const monitorIntermediariIndex = headers.findIndex(h => h === 'Monitor_Intermediari');
  const escolaDestinoIndex = headers.findIndex(h => h === 'Escola_Destino_Intermediari');
  const pickupSchoolIndex = headers.findIndex(h => h === 'Escola_Recollida_Intermediari');
  const dataLliuramentIndex = headers.findIndex(h => h === 'Data_Lliurament_Prevista');
  const dataNecessitatIndex = headers.findIndex(h => h === 'Data_Necessitat');
  const notifIntermediariIndex = headers.findIndex(h => h === 'Notificacion_Intermediari');
  const notifDestinatariIndex = headers.findIndex(h => h === 'Notificacion_Destinatari');
  const notesInternesIndex = headers.findIndex(h => h === 'Notes_Internes');
  const responsablePreparacioIndex = headers.findIndex(h => h === 'Responsable_Preparacio');
  const escolaIndex = headers.findIndex(h => h === 'Escola');
  const activitatIndex = headers.findIndex(h => h === 'Activitat');
  const materialIndex = headers.findIndex(h => h === 'Material');
  const unitatsIndex = headers.findIndex(h => h === 'Unitats');
  const comentarisIndex = headers.findIndex(h => h === 'Comentaris_Generals');

  // Activitat intermediari: suporta ambdós noms
  const activitatIntermediariIndex = headers.findIndex(h => h === 'Activitat_Intermediari');

  // ID_Lliurament: suporta el nom alternatiu Distancia_Academia
  let idLliuramentIndex = headers.findIndex(h => h === 'ID_Lliurament');
  if (idLliuramentIndex === -1) {
    idLliuramentIndex = headers.findIndex(h => h === 'Distancia_Academia');
  }

  return {
    idItemIndex,
    idPedidoIndex,
    estatIndex,
    dataEstatIndex,
    modalitatEntregaIndex,
    monitorIntermediariIndex,
    escolaDestinoIndex,
    pickupSchoolIndex,
    dataLliuramentIndex,
    dataNecessitatIndex,
    notifIntermediariIndex,
    notifDestinatariIndex,
    notesInternesIndex,
    responsablePreparacioIndex,
    escolaIndex,
    activitatIndex,
    materialIndex,
    unitatsIndex,
    comentarisIndex,
    activitatIntermediariIndex,
    idLliuramentIndex
  };
}

/**
 * Invalida la caché de comandes (Respostes).
 * Centralitza el patró repetit de cache.del('cache_respostes_data').
 *
 * @param {object} cache - Instància de node-cache
 */
function invalidateOrdersCache(cache) {
  cache.del('cache_respostes_data');
}

module.exports = {
  generateUUID,
  formatDate,
  parseTimestamp,
  getDefaultHeaders,
  mapHeaderToKey,
  getColumnIndices,
  invalidateOrdersCache
};
