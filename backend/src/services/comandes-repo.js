/**
 * Repositori de comandes.
 *
 * Substitueix el full "Respostes" per la taula comandes_app.comandes, però
 * exposa la MATEIXA forma que retornava el Sheet: `[capçaleres, ...files]`, amb
 * les files com a arrays de valors en el mateix ordre de columnes.
 *
 * Això és deliberat. Tota la lògica de negoci (orders, delivery, notifications,
 * copilot) i el frontend de l'admin llegeixen per nom de capçalera i índex de
 * columna. Canviant només l'origen, la migració es queda continguda aquí dins;
 * si a més canviéssim el contracte, s'hauria de reescriure mig projecte alhora.
 *
 * El model es podrà normalitzar més endavant, amb l'app ja funcionant sobre la BD.
 */

const activihub = require('./activihub');
const cache = require('./cache');

const CACHE_KEY = 'cache_respostes_data';
const CACHE_TTL = 60; // segons; qualsevol escriptura la invalida igualment

/**
 * Mapa columna del full ↔ columna de la taula.
 * L'ordre és el del full, perquè les capçaleres surtin igual.
 *
 * `surt` converteix el valor de la BD al text que el frontend espera veure.
 * `entra` fa el camí invers quan es desa.
 */
const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

const buit = v => v === null || v === undefined || v === '';
const textPla = v => (buit(v) ? '' : String(v));

/** "01/10/2025 18:30:42" (format antic del full) o ISO → ISO */
function aInstant(v) {
  if (buit(v)) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (m) {
    const [, d, mes, a, h, min, seg] = m;
    return new Date(+a, +mes - 1, +d, +h, +min, +seg).toISOString();
  }
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString();
}

/** Qualsevol format raonable → "YYYY-MM-DD" */
function aData(v) {
  if (buit(v)) return null;
  const s = String(v).trim();
  if (ISO_DATA.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

const aBool = v => ['true', 'sí', 'si', 'yes', '1'].includes(String(v ?? '').trim().toLowerCase());
const deBool = v => (v ? 'TRUE' : 'FALSE');

const COLUMNES = [
  { cap: 'Timestamp',                     col: 'data_creacio',                  surt: textPla, entra: aInstant },
  { cap: 'ID_Pedido',                     col: 'id_pedido',                     surt: textPla, entra: v => textPla(v) || null },
  { cap: 'ID_Item',                       col: 'id_item',                       surt: textPla, entra: v => textPla(v) || null },
  { cap: 'Nom_Cognoms',                   col: 'nom_cognoms',                   surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Data_Necessitat',               col: 'data_necessitat',               surt: textPla, entra: aData },
  { cap: 'Escola',                        col: 'escola',                        surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Activitat',                     col: 'activitat',                     surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Material',                      col: 'material',                      surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Es_Material_Personalitzat',     col: 'es_material_personalitzat',     surt: deBool,  entra: aBool },
  { cap: 'Unitats',                       col: 'unitats',                       surt: textPla, entra: v => (buit(v) ? null : parseFloat(String(v).replace(',', '.')) || null) },
  { cap: 'Comentaris_Generals',           col: 'comentaris_generals',           surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Lliurament_Manual',             col: 'lliurament_manual',             surt: deBool,  entra: aBool },
  { cap: 'Estat',                         col: 'estat',                         surt: textPla, entra: v => textPla(v).trim() || 'Pendent' },
  { cap: 'Data_Estat',                    col: 'data_estat',                    surt: textPla, entra: aInstant },
  { cap: 'Responsable_Preparacio',        col: 'responsable_preparacio',        surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Notes_Internes',                col: 'notes_internes',                surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Modalitat_Lliurament',          col: 'modalitat_lliurament',          surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Monitor_Intermediari',          col: 'monitor_intermediari',          surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Escola_Destino_Intermediari',   col: 'escola_destino_intermediari',   surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Escola_Recollida_Intermediari', col: 'escola_recollida_intermediari', surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Activitat_Intermediari',        col: 'activitat_intermediari',        surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Data_Lliurament_Prevista',      col: 'data_lliurament_prevista',      surt: textPla, entra: aData },
  { cap: 'ID_Lliurament',                 col: 'id_lliurament',                 surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Notes_Entrega',                 col: null,                            surt: () => '', entra: () => null },
  { cap: 'Notificacion_Intermediari',     col: 'notificacio_intermediari',      surt: textPla, entra: v => textPla(v).trim() || null },
  { cap: 'Notificacion_Destinatari',      col: 'notificacio_destinatari',       surt: textPla, entra: v => textPla(v).trim() || null },
];

const CAPCALERES = COLUMNES.map(c => c.cap);
const IDX_ID_ITEM = CAPCALERES.indexOf('ID_Item');

const db = () => activihub.getClient('comandes_app');

/** Un registre de la BD → array de valors, en l'ordre de les capçaleres. */
function aFila(registre) {
  return COLUMNES.map(c => (c.col ? c.surt(registre[c.col]) : c.surt()));
}

/** Array de valors → objecte per desar a la BD. */
function aRegistre(fila) {
  const registre = {};
  COLUMNES.forEach((c, i) => {
    if (c.col) registre[c.col] = c.entra(fila[i]);
  });
  registre.actualitzat_el = new Date().toISOString();
  return registre;
}

/**
 * Equivalent a sheets.getSheetData('Respostes'): capçaleres + files.
 * Ordena per data de creació ascendent, com feia el full.
 */
async function getSheetData() {
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  const files = [];
  const MIDA = 1000; // PostgREST no en retorna més, i ho fa en silenci
  let desde = 0;

  for (;;) {
    const { data, error } = await db()
      .from('comandes')
      .select('*')
      .order('data_creacio', { ascending: true })
      .order('id_item', { ascending: true })
      .range(desde, desde + MIDA - 1);

    if (error) throw new Error(`Comandes · error llegint: ${error.message}`);

    files.push(...data);
    if (data.length < MIDA) break;
    desde += MIDA;
  }

  const resultat = [CAPCALERES, ...files.map(aFila)];
  cache.set(CACHE_KEY, resultat, CACHE_TTL);
  return resultat;
}

/**
 * Equivalent a sheets.updateRange('Respostes', 'A1:Z…', dades): desa el bloc
 * sencer. Només fa upsert de les files amb ID_Item; la resta s'ignora.
 */
async function saveSheetData(dades) {
  if (!Array.isArray(dades) || dades.length < 2) return { updated: 0 };

  const registres = dades.slice(1)
    .filter(fila => fila && String(fila[IDX_ID_ITEM] || '').trim() !== '')
    .map(aRegistre);

  for (let i = 0; i < registres.length; i += 200) {
    const lot = registres.slice(i, i + 200);
    const { error } = await db().from('comandes').upsert(lot, { onConflict: 'id_item' });
    if (error) throw new Error(`Comandes · error desant: ${error.message}`);
  }

  invalidate();
  return { updated: registres.length };
}

/** Equivalent a sheets.appendRow('Respostes', fila). */
async function appendRow(fila) {
  const registre = aRegistre(fila);
  if (!registre.id_item) throw new Error('Comandes · falta ID_Item');

  const { error } = await db().from('comandes').insert(registre);
  if (error) throw new Error(`Comandes · error inserint: ${error.message}`);

  invalidate();
  return registre.id_item;
}

/**
 * Esborra per ID_Item. Substitueix sheets.deleteRows(inici, fi), que anava per
 * posició de fila: a una taula, la posició no vol dir res.
 */
async function deleteByIdItems(idItems) {
  const ids = [...new Set((idItems || []).filter(Boolean))];
  if (!ids.length) return 0;

  const { error, count } = await db()
    .from('comandes')
    .delete({ count: 'exact' })
    .in('id_item', ids);

  if (error) throw new Error(`Comandes · error esborrant: ${error.message}`);

  invalidate();
  return count ?? ids.length;
}

function invalidate() {
  cache.del(CACHE_KEY);
}

module.exports = {
  CAPCALERES,
  getSheetData,
  saveSheetData,
  appendRow,
  deleteByIdItems,
  invalidate
};
