/**
 * Middleware de compatibilidad con Apps Script
 * Traduce llamadas ?action=xxx al formato REST
 */

function legacyCompatibility(req, res, next) {
  const action = req.query.action || (req.body && req.body.action);

  if (!action) {
    return next();
  }

  console.log(`[LEGACY] Traduciendo action=${action} a ruta REST`);

  // Mapeo de actions antiguas a rutas REST
  const actionMap = {
    // Mobile App
    'getSchools': { method: 'GET', path: '/api/schools' },
    'getEscoles': { method: 'GET', path: '/api/schools' },
    'getMonitors': { method: 'GET', path: '/api/monitors' },
    'getMaterials': { method: 'GET', path: '/api/materials' },
    'getActivities': { method: 'GET', path: '/api/activities' },
    'getActivitats': { method: 'GET', path: '/api/activities' },
    'getActivitiesBySchool': { method: 'GET', path: '/api/activities/by-school' },
    'getSchoolsByMonitor': { method: 'GET', path: '/api/schools/by-monitor' },
    'getActivitiesByMonitorAndSchool': { method: 'GET', path: '/api/activities/by-monitor-and-school' },
    'getMaterialsByActivity': { method: 'GET', path: '/api/materials/by-activity' },
    'createSollicitud': { method: 'POST', path: '/api/sollicitud' },
    'createMultipleSollicitud': { method: 'POST', path: '/api/sollicitud/multiple' },

    // Admin App
    'loadData': { method: 'GET', path: '/api/admin/orders' },
    'loadDataFast': { method: 'GET', path: '/api/admin/orders', params: { limit: 100 } },
    'processFormResponses': { method: 'POST', path: '/api/admin/orders/process' },
    'updateOrderStatus': { method: 'POST', path: '/api/admin/orders/update-status' },
    'deleteOrders': { method: 'POST', path: '/api/admin/orders/delete' },
    'createOrder': { method: 'POST', path: '/api/admin/orders/create' },
    'getStats': { method: 'POST', path: '/api/admin/stats' },
    'getPreparatedOrders': { method: 'GET', path: '/api/admin/orders/preparated' },
    'getDeliveryOptions': { method: 'POST', path: '/api/admin/delivery/options' },
    'createDelivery': { method: 'POST', path: '/api/admin/delivery/create' },
    'removeIntermediaryAssignment': { method: 'POST', path: '/api/admin/delivery/remove-intermediary' },
    'calculateDistances': { method: 'POST', path: '/api/admin/calculate-distances' },
    'sendManualNotification': { method: 'POST', path: '/api/admin/notifications/send' },
    'getNotificationStatus': { method: 'GET', path: '/api/admin/notifications/status' },
    'getMultipleNotificationStatuses': { method: 'POST', path: '/api/admin/notifications/statuses' },
    'updateInternalNotes': { method: 'POST', path: '/api/admin/orders/update-notes' }
  };

  const mapping = actionMap[action];

  if (!mapping) {
    console.warn(`[LEGACY] Action desconocida: ${action}`);
    return next();
  }

  // Reescribir la request para que use la ruta REST
  req.url = mapping.path;
  req.path = mapping.path;

  // Si cambiamos de GET a POST, trasladar query params a body
  const originalMethod = req.method;
  req.method = mapping.method;

  if (originalMethod === 'GET' && mapping.method === 'POST') {
    // Trasladar todos los query params al body (excepto action)
    const { action, ...queryParams } = req.query;

    // Parsear valores que son JSON strings
    const parsedParams = {};
    for (const [key, value] of Object.entries(queryParams)) {
      try {
        // Intentar parsear como JSON si parece un array o objeto
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          parsedParams[key] = JSON.parse(value);
        } else {
          parsedParams[key] = value;
        }
      } catch (e) {
        // Si falla el parse, usar el valor original
        parsedParams[key] = value;
      }
    }

    req.body = { ...req.body, ...parsedParams };
    req.query = {};
  }

  // Agregar parámetros adicionales si existen en el mapeo
  if (mapping.params) {
    if (mapping.method === 'POST') {
      Object.assign(req.body, mapping.params);
    } else {
      Object.assign(req.query, mapping.params);
    }
  }

  // Limpiar el action de los parámetros
  delete req.query.action;
  if (req.body) {
    delete req.body.action;
  }

  console.log(`[LEGACY] Redirigido a ${mapping.method} ${mapping.path}`);

  next();
}

module.exports = { legacyCompatibility };
