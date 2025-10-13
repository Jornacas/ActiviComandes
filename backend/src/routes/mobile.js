/**
 * Rutas para la Mobile App
 * Endpoints migrados de Code.gs
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const sheets = require('../services/sheets');

// Aplicar autenticación a todas las rutas
router.use(authenticateRequest);

// ======================================================
// ENDPOINTS DE CONSULTA
// ======================================================

/**
 * GET /api/schools
 * Obtiene lista de escuelas únicas
 */
router.get('/schools', async (req, res) => {
  try {
    const data = await sheets.getCachedData('Dades', 'cache_dades_schools');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No es van poder carregar les dades d'escoles de la hoja 'Dades'."
      });
    }

    const schools = data.slice(1)
      .filter(row => row[0] && row[0].toString().trim() !== '')
      .map(row => row[0].toString().trim());

    const uniqueSchools = [...new Set(schools)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({ success: true, data: uniqueSchools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/monitors
 * Obtiene lista de monitores únicos
 */
router.get('/monitors', async (req, res) => {
  try {
    const data = await sheets.getCachedData('Dades', 'cache_dades_monitors');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No s'han pogut carregar les dades de monitors de la hoja 'Dades'."
      });
    }

    const monitors = data.slice(1)
      .filter(row => row[1] && row[1].toString().trim() !== '')
      .map(row => row[1].toString().trim());

    const uniqueMonitors = [...new Set(monitors)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({ success: true, data: uniqueMonitors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities
 * Obtiene lista de actividades únicas
 */
router.get('/activities', async (req, res) => {
  try {
    const data = await sheets.getCachedData('Dades', 'cache_dades_activities');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No es van poder carregar les dades d'activitats de la hoja 'Dades'."
      });
    }

    const activities = data.slice(1)
      .filter(row => row[5] && row[5].toString().trim() !== '')
      .map(row => row[5].toString().trim());

    const uniqueActivities = [...new Set(activities)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({ success: true, data: uniqueActivities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/materials
 * Obtiene lista de materiales
 */
router.get('/materials', async (req, res) => {
  try {
    const data = await sheets.getCachedData('Materiales', 'cache_materials');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No se pudieron cargar los datos de materiales de la hoja 'Materiales'."
      });
    }

    const materials = data.slice(1)
      .filter(row => row[0])
      .map(row => row[0].toString().trim());

    const uniqueMaterials = [...new Set(materials)];

    res.json({ success: true, data: uniqueMaterials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// ENDPOINTS CON PARÁMETROS
// ======================================================

/**
 * GET /api/activities/by-school?school=...
 * Obtiene actividades de una escuela específica
 */
router.get('/activities/by-school', async (req, res) => {
  try {
    const schoolName = req.query.school;

    if (!schoolName) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat el nom de l'escola"
      });
    }

    const data = await sheets.getCachedData('Dades', 'cache_dades_activities_by_school');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No es van poder carregar les dades de la hoja 'Dades'."
      });
    }

    const schoolActivities = data.slice(1)
      .filter(row => {
        const escola = row[0] ? row[0].toString().trim() : '';
        const activitat = row[5] ? row[5].toString().trim() : '';
        return escola === schoolName && activitat !== '';
      })
      .map(row => row[5].toString().trim());

    const uniqueActivities = [...new Set(schoolActivities)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({
      success: true,
      data: uniqueActivities,
      school: schoolName,
      count: uniqueActivities.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/schools/by-monitor?monitor=...
 * Obtiene escuelas de un monitor específico
 */
router.get('/schools/by-monitor', async (req, res) => {
  try {
    const monitorName = req.query.monitor;

    if (!monitorName) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat el nom del monitor"
      });
    }

    const data = await sheets.getCachedData('Dades', 'cache_dades_schools_by_monitor');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No es van poder carregar les dades de la hoja 'Dades'."
      });
    }

    const monitorSchools = data.slice(1)
      .filter(row => {
        const escola = row[0] ? row[0].toString().trim() : '';
        const monitora = row[1] ? row[1].toString().trim() : '';
        return monitora === monitorName && escola !== '';
      })
      .map(row => row[0].toString().trim());

    const uniqueSchools = [...new Set(monitorSchools)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({
      success: true,
      data: uniqueSchools,
      monitor: monitorName,
      count: uniqueSchools.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities/by-monitor-and-school?monitor=...&school=...
 * Obtiene actividades de un monitor y escuela específicos
 */
router.get('/activities/by-monitor-and-school', async (req, res) => {
  try {
    const monitorName = req.query.monitor;
    const schoolName = req.query.school;

    if (!monitorName) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat el nom del monitor"
      });
    }

    if (!schoolName) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat el nom de l'escola"
      });
    }

    const data = await sheets.getCachedData('Dades', 'cache_dades_activities_by_monitor_school');

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: "No es van poder carregar les dades de la hoja 'Dades'."
      });
    }

    const monitorSchoolActivities = data.slice(1)
      .filter(row => {
        const escola = row[0] ? row[0].toString().trim() : '';
        const monitora = row[1] ? row[1].toString().trim() : '';
        const activitat = row[5] ? row[5].toString().trim() : '';
        return monitora === monitorName && escola === schoolName && activitat !== '';
      })
      .map(row => row[5].toString().trim());

    const uniqueActivities = [...new Set(monitorSchoolActivities)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({
      success: true,
      data: uniqueActivities,
      monitor: monitorName,
      school: schoolName,
      count: uniqueActivities.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/materials/by-activity?activity=...
 * Obtiene materiales de una actividad específica
 */
router.get('/materials/by-activity', async (req, res) => {
  try {
    const activityCode = req.query.activity;

    if (!activityCode) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat el codi d'activitat"
      });
    }

    const baseActivity = parseActivityCode(activityCode);

    if (!baseActivity) {
      return res.json({
        success: false,
        error: "Codi d'activitat no reconegut: " + activityCode
      });
    }

    // Caso especial para actividades TC - requieren entrada manual
    if (baseActivity === 'TC') {
      return res.json({
        success: true,
        data: [],
        activityCode: activityCode,
        baseActivity: baseActivity,
        requiresManualEntry: true,
        message: "Activitat TC requereix entrada manual de materials"
      });
    }

    const sheetConfig = getSheetConfigForActivity(baseActivity);

    if (!sheetConfig) {
      return res.json({
        success: false,
        error: "No s'ha trobat configuració per a l'activitat: " + baseActivity
      });
    }

    const data = await sheets.getCachedData(sheetConfig.sheetName, `cache_materials_${baseActivity}`);

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        error: `No s'ha pogut carregar la hoja '${sheetConfig.sheetName}' per a l'activitat ${baseActivity}`
      });
    }

    const columnIndex = sheetConfig.column === 'A' ? 0 : 1;
    const materials = data.slice(1)
      .filter(row => row[columnIndex] && row[columnIndex].toString().trim() !== '')
      .map(row => row[columnIndex].toString().trim());

    const uniqueMaterials = [...new Set(materials)].sort((a, b) => a.localeCompare(b, 'ca'));

    res.json({
      success: true,
      data: uniqueMaterials,
      activityCode: activityCode,
      baseActivity: baseActivity,
      sheetUsed: sheetConfig.sheetName,
      columnUsed: sheetConfig.column
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// ENDPOINTS DE CREACIÓN
// ======================================================

/**
 * POST /api/sollicitud
 * Crea una solicitud individual
 */
router.post('/sollicitud', async (req, res) => {
  try {
    const sollicitudData = req.body.sollicitud || req.body;

    // Validación básica
    if (!sollicitudData.nomCognoms || !sollicitudData.escola) {
      return res.json({
        success: false,
        error: "Falten dades obligatòries"
      });
    }

    const timestamp = new Date();
    const uuid = generateUUID();

    const rowData = [
      timestamp,
      uuid,
      uuid,
      sollicitudData.nomCognoms || '',
      sollicitudData.dataNecessitat || '',
      sollicitudData.escola || '',
      sollicitudData.activitat || '',
      sollicitudData.material || '',
      sollicitudData.unitats || '',
      sollicitudData.altresMaterials || '',
      'Pendent'
    ];

    await sheets.appendRow('Respostes', rowData);

    res.json({
      success: true,
      message: 'Sol·licitud creada correctament',
      uuid: uuid
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sollicitud/multiple
 * Crea múltiples solicitudes (carrito de compras)
 */
router.post('/sollicitud/multiple', async (req, res) => {
  try {
    const data = req.body;

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return res.json({
        success: false,
        error: "No hi ha items per crear"
      });
    }

    const timestamp = new Date();
    const basePedidoId = generateUUID();
    const createdItems = [];

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const itemId = `${basePedidoId}-${i + 1}`;

      const rowData = [
        timestamp,
        basePedidoId,
        itemId,
        data.nomCognoms || '',
        data.dataNecessitat || '',
        item.escola || '',
        item.activitat || '',
        item.material || '',
        item.quantitat || 1,
        data.altresMaterials || '',
        'Pendent'
      ];

      await sheets.appendRow('Respostes', rowData);
      createdItems.push({ itemId, material: item.material });
    }

    res.json({
      success: true,
      message: `${data.items.length} items creats correctament`,
      pedidoId: basePedidoId,
      items: createdItems
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function parseActivityCode(activityCode) {
  if (activityCode.startsWith('CO')) {
    return 'CO';
  }

  const matches = activityCode.match(/^([A-Z]+\d*)/);
  return matches ? matches[1] : null;
}

function getSheetConfigForActivity(baseActivity) {
  const config = {
    'CO': { sheetName: 'Materiales', column: 'A' },
    'CS': { sheetName: 'Materiales', column: 'A' },
    'JP': { sheetName: 'Jocs Populars', column: 'A' },
    'TR': { sheetName: 'Taller de Reciclatge', column: 'A' },
    'RC': { sheetName: 'Taller de Reciclatge', column: 'A' },
    'AA': { sheetName: 'Arts', column: 'A' },
    'MA': { sheetName: 'Manualitats', column: 'A' },
    'CI': { sheetName: 'Ciencia', column: 'A' },
    'GR': { sheetName: 'Graffiti', column: 'A' },
    'DJ': { sheetName: 'Dj', column: 'A' },
    'TC': { sheetName: null, column: null }
  };

  return config[baseActivity] || null;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = router;
