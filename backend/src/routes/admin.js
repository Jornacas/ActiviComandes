/**
 * Rutas para la Admin App
 * Endpoints migrados de Code.gs
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const sheets = require('../services/sheets');
const cache = require('../services/cache');

// Aplicar autenticación a todas las rutas
router.use(authenticateRequest);

// ======================================================
// GESTIÓN DE PEDIDOS
// ======================================================

/**
 * GET /api/admin/orders
 * Carga todos los pedidos (equivalente a loadRespostesData)
 */
router.get('/orders', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        data: {
          headers: getDefaultHeaders(),
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      });
    }

    if (data.length < 2) {
      return res.json({
        success: true,
        data: {
          headers: getDefaultHeaders(),
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      });
    }

    const headersRow = data[0];
    let rows = data.slice(1).map(row => row.slice(0, headersRow.length));

    if (limit && limit > 0) {
      rows = rows.slice(0, limit);
    }

    // Mapear headers a formato camelCase
    const headers = headersRow.map(h => {
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
        'Monitor_Intermediari': 'monitorIntermediari',
        'Escola_Destino_Intermediari': 'escolaDestinoIntermediari',
        'Data_Entrega_Prevista': 'dataEntregaPrevista',
        'Data_Lliurament_Prevista': 'dataLliuramentPrevista',
        'Distancia_Academia': 'distanciaAcademia',
        'Notes_Entrega': 'notesEntrega'
      };
      return map[h] || String(h).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    });

    const allRows = data.slice(1);
    const estatColIndex = headersRow.findIndex(h => h === 'Estat');
    const dataLliuramentColIndex = headersRow.findIndex(h => h === 'Data_Lliurament_Prevista');
    const dataNecessitatColIndex = headersRow.findIndex(h => h === 'Data_Necessitat');

    // Procesar fechas
    const processedRows = rows.map(row => {
      const processedRow = [...row];

      // Procesar Data_Necessitat
      if (dataNecessitatColIndex !== -1 && processedRow[dataNecessitatColIndex]) {
        const rawDate = processedRow[dataNecessitatColIndex];
        if (rawDate instanceof Date) {
          processedRow[dataNecessitatColIndex] = formatDate(rawDate);
        }
      }

      // Procesar Data_Lliurament_Prevista
      if (dataLliuramentColIndex !== -1 && processedRow[dataLliuramentColIndex]) {
        const rawDate = processedRow[dataLliuramentColIndex];
        if (rawDate instanceof Date) {
          processedRow[dataLliuramentColIndex] = formatDate(rawDate);
        }
      }

      return processedRow;
    });

    // Calcular estadísticas
    const stats = {
      total: allRows.length,
      pendents: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Pendent').length : 0,
      enProces: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'En proces').length : 0,
      preparats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Preparat').length : 0,
      entregats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Entregat').length : 0
    };

    res.json({
      success: true,
      data: {
        headers: headers,
        rows: processedRows,
        estadisticas: stats
      }
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).json({
      success: false,
      error: 'Error carregant dades: ' + error.message
    });
  }
});

/**
 * POST /api/admin/orders/process
 * Procesa respuestas y calcula estadísticas
 */
router.post('/orders/process', async (req, res) => {
  try {
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: true,
        nuevosRegistros: 0,
        message: "No hi ha noves sol·licituds per processar.",
        estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
      });
    }

    const totalRows = data.length - 1;
    const headers = data[0];
    const estatIndex = headers.findIndex(h => h === 'Estat');

    let pendents = 0;
    let enProces = 0;
    let preparats = 0;
    let entregats = 0;

    if (estatIndex !== -1) {
      for (let i = 1; i < data.length; i++) {
        const estat = data[i][estatIndex];
        switch (estat) {
          case 'Pendent':
            pendents++;
            break;
          case 'En proces':
            enProces++;
            break;
          case 'Preparat':
            preparats++;
            break;
          case 'Entregat':
            entregats++;
            break;
        }
      }
    }

    res.json({
      success: true,
      nuevosRegistros: totalRows,
      message: `Sincronització completada. ${totalRows} sol·licituds processades.`,
      estadisticas: {
        total: totalRows,
        pendents: pendents,
        enProces: enProces,
        preparats: preparats,
        entregats: entregats
      }
    });
  } catch (error) {
    console.error('Error processing orders:', error);
    res.status(500).json({
      success: false,
      error: 'Error processant les dades: ' + error.message
    });
  }
});

/**
 * POST /api/admin/orders/update-status
 * Actualiza el estado de pedidos
 */
router.post('/orders/update-status', async (req, res) => {
  try {
    const { uuids, newStatus } = req.body;

    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      return res.json({
        success: false,
        error: "No s'han proporcionat UUIDs vàlids"
      });
    }

    if (!newStatus) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat l'estat nou"
      });
    }

    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return res.json({
        success: false,
        error: "No hay datos en la hoja 'Respostes' para actualizar."
      });
    }

    const headers = data[0];
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const estatIndex = headers.findIndex(h => h === "Estat");
    const dataEstatIndex = headers.findIndex(h => h === "Data_Estat");

    if (idPedidoIndex === -1 && idItemIndex === -1) {
      return res.json({
        success: false,
        error: "No se encontraron las columnas de ID"
      });
    }

    if (estatIndex === -1) {
      return res.json({
        success: false,
        error: "La columna 'Estat' no se encontró"
      });
    }

    let changesMade = 0;
    const currentTimestamp = new Date();

    const updatedData = data.map((row, index) => {
      if (index === 0) return row;

      const rowIdPedido = row[idPedidoIndex];
      const rowIdItem = row[idItemIndex];

      const matchesUuid = uuids.some(uuid =>
        uuid === rowIdPedido || uuid === rowIdItem ||
        rowIdPedido?.includes(uuid) || rowIdItem?.includes(uuid)
      );

      if (matchesUuid) {
        if (row[estatIndex] !== newStatus) {
          row[estatIndex] = newStatus;
          if (dataEstatIndex !== -1) {
            row[dataEstatIndex] = currentTimestamp;
          }
          changesMade++;
        }
      }
      return row;
    });

    if (changesMade > 0) {
      // Actualizar en Sheets
      await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);

      // Invalidar caché
      cache.del('cache_respostes_data');

      return res.json({
        success: true,
        changesMade: changesMade,
        message: `S'han actualitzat ${changesMade} elements a l'estat: ${newStatus}`
      });
    } else {
      return res.json({
        success: true,
        changesMade: 0,
        message: "No s'han trobat elements per actualitzar amb els IDs proporcionats."
      });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualitzant l\'estat: ' + error.message
    });
  }
});

/**
 * POST /api/admin/orders/delete
 * Elimina pedidos
 */
router.post('/orders/delete', async (req, res) => {
  try {
    const { uuids } = req.body;

    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      return res.json({
        success: false,
        error: "No s'han proporcionat UUIDs per eliminar"
      });
    }

    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return res.json({
        success: false,
        error: "No hi ha dades per eliminar"
      });
    }

    const headers = data[0];
    const possibleUuidColumns = ['ID_Pedido', 'ID_Item', 'UUID', 'uuid', 'id', 'Id', 'ID Pedido', 'ID Item'];

    let uuidColumnIndex = -1;
    for (const colName of possibleUuidColumns) {
      uuidColumnIndex = headers.findIndex(h => h === colName);
      if (uuidColumnIndex !== -1) break;
    }

    if (uuidColumnIndex === -1) {
      return res.json({
        success: false,
        error: "No s'ha trobat la columna d'identificador"
      });
    }

    // Encontrar filas a eliminar (de abajo hacia arriba)
    const rowsToDelete = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const rowUuid = data[i][uuidColumnIndex];
      if (uuids.includes(String(rowUuid))) {
        rowsToDelete.push(i);
      }
    }

    // Eliminar filas
    let deletedCount = 0;
    for (const rowIndex of rowsToDelete) {
      await sheets.deleteRows('Respostes', rowIndex, rowIndex + 1);
      deletedCount++;
    }

    // Invalidar caché
    const cacheKeys = [
      'cache_respostes_data',
      'cache_dades_schools_by_monitor',
      'cache_dades_activities_by_monitor_school',
      'cache_dades_activities_by_school'
    ];

    cacheKeys.forEach(key => cache.del(key));

    res.json({
      success: true,
      data: { deletedCount }
    });
  } catch (error) {
    console.error("Error deleting orders:", error);
    res.status(500).json({
      success: false,
      error: "Error eliminant sol·licituds: " + error.message
    });
  }
});

/**
 * POST /api/admin/orders/create
 * Crea un nuevo pedido desde el admin
 */
router.post('/orders/create', async (req, res) => {
  try {
    const orderData = req.body.orderData || req.body;

    // Validación básica
    if (!orderData.nomCognoms || !orderData.escola) {
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
      orderData.nomCognoms || '',
      orderData.dataNecessitat || '',
      orderData.escola || '',
      orderData.activitat || '',
      orderData.material || '',
      orderData.esMaterialPersonalitzat || '',
      orderData.unitats || 1,
      orderData.comentarisGenerals || '',
      orderData.entregaManual || '',
      'Pendent',
      timestamp,
      '',
      orderData.notesInternes || ''
    ];

    await sheets.appendRow('Respostes', rowData);

    // Invalidar caché
    cache.del('cache_respostes_data');

    res.json({
      success: true,
      message: 'Comanda creada correctament',
      uuid: uuid
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======================================================
// ESTADÍSTICAS Y DASHBOARD
// ======================================================

/**
 * POST /api/admin/stats
 * Obtiene estadísticas del dashboard con filtros
 */
router.post('/stats', async (req, res) => {
  try {
    const filters = req.body.filters || req.body || {};

    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: true,
        data: {
          total: 0,
          pendents: 0,
          enProces: 0,
          preparats: 0,
          entregats: 0
        }
      });
    }

    const headers = data[0];
    const estatIndex = headers.findIndex(h => h === 'Estat');
    const escolaIndex = headers.findIndex(h => h === 'Escola');
    const dataIndex = headers.findIndex(h => h === 'Data_Necessitat');

    let rows = data.slice(1);

    // Aplicar filtros si existen
    if (filters.escola) {
      rows = rows.filter(row => row[escolaIndex] === filters.escola);
    }

    if (filters.dateFrom || filters.dateTo) {
      rows = rows.filter(row => {
        const rowDate = new Date(row[dataIndex]);
        if (filters.dateFrom && rowDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && rowDate > new Date(filters.dateTo)) return false;
        return true;
      });
    }

    // Calcular estadísticas
    const stats = {
      total: rows.length,
      pendents: estatIndex >= 0 ? rows.filter(row => row[estatIndex] === 'Pendent').length : 0,
      enProces: estatIndex >= 0 ? rows.filter(row => row[estatIndex] === 'En proces').length : 0,
      preparats: estatIndex >= 0 ? rows.filter(row => row[estatIndex] === 'Preparat').length : 0,
      entregats: estatIndex >= 0 ? rows.filter(row => row[estatIndex] === 'Entregat').length : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/orders/preparated
 * Obtiene pedidos preparados para entrega
 */
router.get('/orders/preparated', async (req, res) => {
  try {
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const headers = data[0];
    const estatIndex = headers.findIndex(h => h === 'Estat');

    if (estatIndex === -1) {
      return res.json({
        success: false,
        error: "Columna 'Estat' no trobada"
      });
    }

    // Filtrar solo pedidos preparados o asignados
    const preparatedRows = data.slice(1).filter(row => {
      const estat = row[estatIndex];
      return estat === 'Preparat' || estat === 'Assignat';
    });

    // Mapear a formato de objeto
    const orders = preparatedRows.map(row => {
      const order = {};
      headers.forEach((header, index) => {
        const key = mapHeaderToKey(header);
        order[key] = row[index];
      });
      return order;
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error getting preparated orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======================================================
// SISTEMA DE ENTREGAS
// ======================================================

/**
 * POST /api/admin/delivery/options
 * Obtiene opciones de entrega para pedidos seleccionados
 */
router.post('/delivery/options', async (req, res) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.json({
        success: false,
        error: "No s'han proporcionat comandes"
      });
    }

    // TODO: Implementar lógica completa de getDeliveryOptions
    // Por ahora devolvemos estructura básica

    res.json({
      success: true,
      message: 'Endpoint en desarrollo',
      data: {
        modalitats: ['Entrega directa', 'Recollida intermediària'],
        monitors: []
      }
    });
  } catch (error) {
    console.error('Error getting delivery options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/delivery/create
 * Crea una entrega
 */
router.post('/delivery/create', async (req, res) => {
  try {
    const { deliveryData } = req.body;

    if (!deliveryData) {
      return res.json({
        success: false,
        error: "No s'han proporcionat dades d'entrega"
      });
    }

    // TODO: Implementar lógica completa de createDelivery
    // Por ahora estructura básica

    res.json({
      success: true,
      message: 'Endpoint en desarrollo'
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/delivery/remove-intermediary
 * Elimina asignación de intermediario
 */
router.post('/delivery/remove-intermediary', async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.json({
        success: false,
        error: "No s'han proporcionat IDs de comandes"
      });
    }

    // TODO: Implementar lógica de removeIntermediaryAssignment

    res.json({
      success: true,
      message: 'Endpoint en desarrollo'
    });
  } catch (error) {
    console.error('Error removing intermediary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======================================================
// NOTIFICACIONES
// ======================================================

/**
 * POST /api/admin/notifications/send
 * Envía notificación manual
 */
router.post('/notifications/send', async (req, res) => {
  try {
    const { spaceName, message, orderId, notificationType } = req.body;

    if (!spaceName || !message) {
      return res.json({
        success: false,
        error: "Falten dades obligatòries"
      });
    }

    // TODO: Implementar integración con Google Chat
    console.log('[NOTIFICATION] Send notification:', { spaceName, message, orderId, notificationType });

    res.json({
      success: true,
      message: 'Notificació enviada (simulat - integració Google Chat pendent)'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/notifications/status/:orderId
 * Obtiene estado de notificaciones de un pedido
 */
router.get('/notifications/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // TODO: Implementar lógica de getNotificationStatus

    res.json({
      success: true,
      message: 'Endpoint en desarrollo',
      data: {
        orderId: orderId,
        notificacions: []
      }
    });
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/notifications/statuses
 * Obtiene estados de múltiples notificaciones
 */
router.post('/notifications/statuses', async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.json({
        success: false,
        error: "No s'han proporcionat IDs"
      });
    }

    // TODO: Implementar lógica de getMultipleNotificationStatuses

    res.json({
      success: true,
      message: 'Endpoint en desarrollo',
      data: []
    });
  } catch (error) {
    console.error('Error getting notification statuses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======================================================
// UTILIDADES
// ======================================================

/**
 * POST /api/admin/calculate-distances
 * Calcula distancias entre direcciones
 */
router.post('/calculate-distances', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses)) {
      return res.json({
        success: false,
        error: "No s'han proporcionat adreces"
      });
    }

    // TODO: Implementar integración con Google Maps API

    res.json({
      success: true,
      message: 'Endpoint en desarrollo - Google Maps API pendent',
      data: []
    });
  } catch (error) {
    console.error('Error calculating distances:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function getDefaultHeaders() {
  return [
    "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
    "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
    "comentarisGenerals", "entregaManual", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
  ];
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    'Monitor_Intermediari': 'monitorIntermediari',
    'Escola_Destino_Intermediari': 'escolaDestinoIntermediari',
    'Data_Entrega_Prevista': 'dataEntregaPrevista',
    'Data_Lliurament_Prevista': 'dataLliuramentPrevista',
    'Distancia_Academia': 'distanciaAcademia',
    'Notes_Entrega': 'notesEntrega'
  };
  return map[header] || String(header).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

module.exports = router;
