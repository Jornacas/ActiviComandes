/**
 * Rutes de l'app mòbil (la del monitor).
 *
 * Les dades mestres (escoles, monitors, activitats) venen d'ActiviHub des del
 * 28-08-2026: el full "Dades" va quedar mort (#REF!) i amb ell l'app sencera.
 * El catàleg de materials i les comandes viuen a comandes_app (Supabase) des de
 * la Fase 2. Ja no es toca cap Google Sheet.
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const activihub = require('../services/activihub');
const catalegs = require('../services/catalegs');
const comandes = require('../services/comandes-repo');
const { generateUUID } = require('../utils/helpers');

router.use(authenticateRequest);

/** Embolcall comú: converteix una excepció en la resposta que espera l'app. */
function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error(`[MOBILE] ${req.method} ${req.path}:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

// ======================================================
// DADES MESTRES (ActiviHub)
// ======================================================

/** GET /api/schools — escoles amb activitat el curs vigent */
router.get('/schools', handle(async (req, res) => {
  const data = await activihub.getSchools();
  res.json({ success: true, data });
}));

/** GET /api/monitors */
router.get('/monitors', handle(async (req, res) => {
  const data = await activihub.getMonitors();
  res.json({ success: true, data });
}));

/** GET /api/activities — codis d'activitat (CO1A, DX2B, HC2B-EN…) */
router.get('/activities', handle(async (req, res) => {
  const data = await activihub.getActivities();
  res.json({ success: true, data });
}));

/** GET /api/activities/by-school?school=... */
router.get('/activities/by-school', handle(async (req, res) => {
  const school = req.query.school;
  if (!school) {
    return res.json({ success: false, error: "No s'ha proporcionat el nom de l'escola" });
  }

  const data = await activihub.getActivitiesBySchool(school);
  res.json({ success: true, data, school, count: data.length });
}));

/** GET /api/schools/by-monitor?monitor=... */
router.get('/schools/by-monitor', handle(async (req, res) => {
  const monitor = req.query.monitor;
  if (!monitor) {
    return res.json({ success: false, error: "No s'ha proporcionat el nom del monitor" });
  }

  const data = await activihub.getSchoolsByMonitor(monitor);
  res.json({ success: true, data, monitor, count: data.length });
}));

/** GET /api/activities/by-monitor-and-school?monitor=...&school=... */
router.get('/activities/by-monitor-and-school', handle(async (req, res) => {
  const { monitor, school } = req.query;
  if (!monitor) {
    return res.json({ success: false, error: "No s'ha proporcionat el nom del monitor" });
  }
  if (!school) {
    return res.json({ success: false, error: "No s'ha proporcionat el nom de l'escola" });
  }

  const data = await activihub.getActivitiesByMonitorAndSchool(monitor, school);
  res.json({ success: true, data, monitor, school, count: data.length });
}));

// ======================================================
// CATÀLEG DE MATERIALS (comandes_app.materials)
// ======================================================

/**
 * Del codi d'activitat en surt l'àrea i el nivell: TC2A → {TC, 2}, HC2B-EN → {HC, 2}.
 * La versió anterior retornava "TC2" i buscava una configuració que no existia,
 * així que TOTES les activitats de TC i JL donaven error en lloc de caure a
 * l'entrada manual de materials (70 i 8 activitats del curs 2627).
 */
function parseActivityCode(activityCode) {
  const match = String(activityCode || '').toUpperCase().match(/^(CO|DX|HC|TC|JL)(\d+)?/);
  if (!match) return null;
  return { area: match[1], nivell: match[2] ? parseInt(match[2], 10) : null };
}

/**
 * Nivell del catàleg per a una àrea. CO en té un de sol (nivell null); DX i HC
 * en tenen un per nivell. TC i JL encara no en tenen: entrada manual.
 */
function nivellCataleg({ area, nivell }) {
  switch (area) {
    case 'CO': return { nivell: null };
    case 'DX': return { nivell: nivell === 1 ? 1 : 2 };
    case 'HC': return { nivell: nivell === 1 ? 1 : 2 };
    default:   return null;
  }
}

/** GET /api/materials/by-activity?activity=... */
router.get('/materials/by-activity', handle(async (req, res) => {
  const activityCode = req.query.activity;
  if (!activityCode) {
    return res.json({ success: false, error: "No s'ha proporcionat el codi d'activitat" });
  }

  const parsed = parseActivityCode(activityCode);
  if (!parsed) {
    return res.json({ success: false, error: "Codi d'activitat no reconegut: " + activityCode });
  }

  const cataleg = nivellCataleg(parsed);

  if (!cataleg) {
    return res.json({
      success: true,
      data: [],
      activityCode,
      baseActivity: parsed.area,
      requiresManualEntry: true,
      message: `L'activitat ${parsed.area} requereix entrada manual de materials`
    });
  }

  const materials = await catalegs.getMaterials(parsed.area, cataleg.nivell);

  res.json({
    success: true,
    data: materials,
    activityCode,
    baseActivity: parsed.area,
    nivell: cataleg.nivell,
    requiresManualEntry: materials.length === 0
  });
}));

/** GET /api/materials — tot el catàleg junt */
router.get('/materials', handle(async (req, res) => {
  const data = await catalegs.getTotsElsMaterials();
  res.json({ success: true, data });
}));

// ======================================================
// CREACIÓ DE SOL·LICITUDS
// ======================================================

/**
 * Construeix la fila d'una comanda, en l'ordre de columnes del repositori.
 * La versió anterior n'escrivia 11 de 21 i deixava l'estat a la columna de
 * comentaris.
 */
function buildComandaRow({ timestamp, idPedido, idItem, nomCognoms, dataNecessitat,
                             escola, activitat, material, esPersonalitzat, unitats,
                             comentaris, entregaManual }) {
  return [
    timestamp,                              // Timestamp
    idPedido,                               // ID_Pedido
    idItem,                                 // ID_Item
    nomCognoms,                             // Nom_Cognoms
    dataNecessitat,                         // Data_Necessitat
    escola,                                 // Escola
    activitat,                              // Activitat
    material,                               // Material
    esPersonalitzat ? 'TRUE' : 'FALSE',     // Es_Material_Personalitzat
    unitats,                                // Unitats
    comentaris,                             // Comentaris_Generals
    entregaManual ? 'TRUE' : 'FALSE',       // Lliurament_Manual
    'Pendent',                              // Estat
    timestamp,                              // Data_Estat
    '',                                     // Responsable_Preparacio
    '',                                     // Notes_Internes
    entregaManual ? 'MANUAL' : 'NORMAL',    // Modalitat_Lliurament
    '',                                     // Monitor_Intermediari
    '',                                     // Escola_Destino_Intermediari
    '',                                     // Escola_Recollida_Intermediari
    ''                                      // Activitat_Intermediari
  ];
}

/** POST /api/sollicitud — una sola sol·licitud */
router.post('/sollicitud', handle(async (req, res) => {
  const s = req.body.sollicitud || req.body;

  if (!s.nomCognoms || !s.escola) {
    return res.json({ success: false, error: 'Falten dades obligatòries' });
  }

  const timestamp = new Date();
  const idPedido = generateUUID();
  const idItem = `${idPedido}-001`;
  const material = s.customMaterial || s.material || '';

  await comandes.appendRow(buildComandaRow({
    timestamp,
    idPedido,
    idItem,
    nomCognoms: s.nomCognoms,
    dataNecessitat: s.dataNecessitat || '',
    escola: s.escola,
    activitat: s.activitat || '',
    material,
    esPersonalitzat: Boolean(s.customMaterial),
    unitats: s.unitats || 0,
    comentaris: s.altresMaterials || '',
    entregaManual: Boolean(s.entregaManual)
  }));

  res.json({
    success: true,
    data: {
      message: 'Sol·licitud creada correctament',
      idPedido,
      items: [{ idPedido, idItem, material }],
      totalItems: 1,
      timestamp
    }
  });
}));

/** POST /api/sollicitud/multiple — el carret sencer */
router.post('/sollicitud/multiple', handle(async (req, res) => {
  const data = req.body;

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return res.json({ success: false, error: 'No hi ha items per crear' });
  }

  const timestamp = new Date();
  const idPedido = generateUUID();
  const addedItems = [];

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const idItem = `${idPedido}-${String(i + 1).padStart(3, '0')}`;
    const material = item.customMaterial || item.material || '';
    const unitats = item.unitats ?? item.quantitat ?? 0;

    await comandes.appendRow(buildComandaRow({
      timestamp,
      idPedido,
      idItem,
      nomCognoms: data.nomCognoms || '',
      dataNecessitat: data.dataNecessitat || '',
      escola: item.escola || '',
      activitat: item.activitat || '',
      material,
      esPersonalitzat: Boolean(item.customMaterial),
      unitats,
      comentaris: data.altresMaterials || '',
      entregaManual: Boolean(data.entregaManual)
    }));

    addedItems.push({
      idPedido,
      idItem,
      escola: item.escola,
      activitat: item.activitat,
      material,
      isCustom: Boolean(item.customMaterial),
      unitats
    });
  }

  res.json({
    success: true,
    data: {
      message: `Sol·licitud múltiple enviada correctament! ${data.items.length} materials sol·licitats.`,
      idPedido,
      items: addedItems,
      totalItems: addedItems.length,
      totalUnits: addedItems.reduce((sum, i) => sum + (Number(i.unitats) || 0), 0),
      timestamp
    }
  });
}));

module.exports = router;
