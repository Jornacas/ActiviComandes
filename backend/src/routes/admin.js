/**
 * Rutas para la Admin App
 * Endpoints migrados de Code.gs
 */

const express = require('express');
const router = express.Router();
const { authenticateRequest } = require('../middleware/auth');
const sheets = require('../services/sheets');
const cache = require('../services/cache');
const maps = require('../services/maps');
const chat = require('../services/chat');

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
    let rows = data.slice(1)
      .map(row => row.slice(0, headersRow.length))
      .filter(row => {
        // Filtrar filas vacías: verificar que al menos tenga timestamp o ID
        const hasTimestamp = row[0] && String(row[0]).trim() !== '';
        const hasIdPedido = row[1] && String(row[1]).trim() !== '';
        const hasIdItem = row[2] && String(row[2]).trim() !== '';
        return hasTimestamp || hasIdPedido || hasIdItem;
      });

    // Ordenar por timestamp (más nuevos primero)
    const timestampIdx = headersRow.findIndex(h => h === 'Timestamp');
    console.log('📅 timestampIdx:', timestampIdx);
    console.log('📅 First 3 timestamps BEFORE sort:', rows.slice(0, 3).map(r => r[timestampIdx]));

    if (timestampIdx !== -1) {
      rows.sort((a, b) => {
        // Convertir timestamps en formato DD/MM/YYYY HH:MM:SS a objetos Date
        const parseTimestamp = (ts) => {
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
        };

        const dateA = parseTimestamp(a[timestampIdx]);
        const dateB = parseTimestamp(b[timestampIdx]);

        return dateB - dateA; // Orden descendente (más nuevos primero)
      });
      console.log('📅 First 3 timestamps AFTER sort:', rows.slice(0, 3).map(r => r[timestampIdx]));
    }

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

    console.log('🔄 UPDATE STATUS request received');
    console.log('🔄 req.body:', req.body);
    console.log('🔄 uuids:', uuids);
    console.log('🔄 uuids type:', typeof uuids);
    console.log('🔄 uuids isArray:', Array.isArray(uuids));
    console.log('🔄 uuids length:', uuids?.length);
    console.log('🔄 newStatus:', newStatus);

    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      console.log('🔄 VALIDATION FAILED - returning error');
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
 * POST /api/admin/orders/update-notes
 * Actualiza las notas internas de un pedido
 */
router.post('/orders/update-notes', async (req, res) => {
  try {
    const { orderId, notes } = req.body;

    console.log('📝 UPDATE NOTES request received');
    console.log('📝 orderId:', orderId);
    console.log('📝 notes:', notes);

    if (!orderId) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat l'ID de la comanda"
      });
    }

    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return res.json({
        success: false,
        error: "No hi ha dades a la fulla 'Respostes'"
      });
    }

    const headers = data[0];
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const notesInternesIndex = headers.findIndex(h => h === "Notes_Internes");

    if (idItemIndex === -1 && idPedidoIndex === -1) {
      return res.json({
        success: false,
        error: "No s'han trobat les columnes d'identificador"
      });
    }

    if (notesInternesIndex === -1) {
      return res.json({
        success: false,
        error: "No s'ha trobat la columna 'Notes_Internes'"
      });
    }

    let updated = false;

    const updatedData = data.map((row, index) => {
      if (index === 0) return row;

      const rowIdItem = row[idItemIndex];
      const rowIdPedido = row[idPedidoIndex];

      if (orderId === rowIdItem || orderId === rowIdPedido) {
        row[notesInternesIndex] = notes || '';
        updated = true;
      }

      return row;
    });

    if (updated) {
      // Actualizar en Sheets
      await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);

      // Invalidar caché
      cache.del('cache_respostes_data');

      return res.json({
        success: true,
        message: "Notes actualitzades correctament"
      });
    } else {
      return res.json({
        success: false,
        error: "No s'ha trobat la comanda amb l'ID proporcionat"
      });
    }
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualitzant les notes: ' + error.message
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

    console.log('🗑️ DELETE request received');
    console.log('🗑️ req.body:', req.body);
    console.log('🗑️ uuids:', uuids);
    console.log('🗑️ uuids type:', typeof uuids);
    console.log('🗑️ uuids isArray:', Array.isArray(uuids));
    console.log('🗑️ uuids length:', uuids?.length);

    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      console.log('🗑️ VALIDATION FAILED - returning error');
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

    // Obtener datos de escuelas y monitores
    const schoolData = await getSchoolMonitorData();
    if (!schoolData.success) {
      return res.json(schoolData);
    }

    // PASO 1: Agrupar pedidos por persona + escuela + día
    const groupedOrders = new Map();

    orders.forEach(order => {
      // Crear clave única para agrupar: persona + escuela + día
      const groupKey = `${order.nomCognoms}|${order.escola}|${order.dataNecessitat}`;

      if (!groupedOrders.has(groupKey)) {
        groupedOrders.set(groupKey, {
          nomCognoms: order.nomCognoms,
          escola: order.escola,
          dataNecessitat: order.dataNecessitat,
          orders: []
        });
      }

      groupedOrders.get(groupKey).orders.push(order);
    });

    console.log(`📦 Grouped ${orders.length} orders into ${groupedOrders.size} groups`);

    const deliveryOptions = [];

    // PASO 2: Procesar cada grupo
    for (const [groupKey, group] of groupedOrders) {
      console.log(`🎯 Processing group: ${group.nomCognoms} - ${group.escola} - ${group.dataNecessitat}`);
      console.log(`   📋 Orders in group: ${group.orders.length}`);

      // Buscar información de la escuela
      const directSchool = schoolData.data.schoolsMap.get(group.escola);

      if (directSchool) {
        // OPCIÓN 1: Entrega directa (con todos los pedidos del grupo)
        const directOption = {
          tipus: "Lliurament Directe",
          escola: group.escola,
          adreça: directSchool.adreça,
          eficiencia: "Calculant...",
          prioritat: 99999,
          nomCognoms: group.nomCognoms, // Añadir nombre para mostrar en UI
          dataNecessitat: group.dataNecessitat, // Añadir fecha de necesidad
          monitorsDisponibles: directSchool.monitors.map(monitor => {
            // Buscar actividad del monitor en esta escuela
            const monitorInfo = schoolData.data.monitorsMap.get(monitor);
            const schoolInfo = monitorInfo?.escoles.find(e => e.escola === group.escola);

            return {
              nom: monitor,
              dies: directSchool.dies,
              tipus: "directa",
              activitat: schoolInfo?.activitat || 'N/A' // Info de actividad
            };
          }),
          descripció: `Entrega directa a ${group.escola} per ${group.nomCognoms}`,
          distanciaAcademia: "Calculant...",
          tempsAcademia: "Calculant...",
          comandes: group.orders, // TODOS los pedidos del grupo
          destinatari: {
            nom: group.nomCognoms,
            activitat: group.orders[0]?.activitat || 'N/A' // Actividad del destinatario
          }
        };

        deliveryOptions.push(directOption);

        // OPCIÓN 2: Entrega con intermediario (con todos los pedidos del grupo)
        if (schoolData.data.monitors) {
          schoolData.data.monitors.forEach(monitor => {
            if (monitor.escoles?.length > 1) {
              const targetSchoolInfo = monitor.escoles.find(s => s.escola === group.escola);

              if (targetSchoolInfo) {
                monitor.escoles.forEach(intermediarySchoolInfo => {
                  if (intermediarySchoolInfo.escola !== group.escola) {
                    const intermediaryOption = {
                      tipus: "Lliurament amb Intermediari",
                      escola: intermediarySchoolInfo.escola,
                      escolaDestino: group.escola,
                      adreça: intermediarySchoolInfo.adreça,
                      eficiencia: "Calculant...",
                      prioritat: 99999,
                      nomCognoms: group.nomCognoms, // Añadir nombre para mostrar en UI
                      dataNecessitat: group.dataNecessitat, // Añadir fecha de necesidad
                      monitorsDisponibles: [{
                        nom: monitor.nom,
                        dies: intermediarySchoolInfo.dies,
                        tipus: "intermediari",
                        escolaOrigen: intermediarySchoolInfo.escola,
                        activitat: intermediarySchoolInfo.activitat || 'N/A',  // Actividad en escola origen
                        destinoFinal: {
                          escola: group.escola,
                          dies: targetSchoolInfo.dies,
                          activitat: targetSchoolInfo.activitat || 'N/A'
                        }
                      }],
                      descripció: `Entrega a ${intermediarySchoolInfo.escola} → ${monitor.nom} transporta a ${group.escola} per ${group.nomCognoms}`,
                      distanciaAcademia: "Calculant...",
                      tempsAcademia: "Calculant...",
                      notes: "Monitor multicentre",
                      comandes: group.orders, // TODOS los pedidos del grupo
                      destinatari: {
                        nom: group.nomCognoms,
                        activitat: group.orders[0]?.activitat || 'N/A'
                      }
                    };

                    deliveryOptions.push(intermediaryOption);
                  }
                });
              }
            }
          });
        }
      }
    }

    // Calcular distancias reales para todas las opciones
    const addressesMap = new Map();
    deliveryOptions.forEach(option => {
      if (option.adreça) {
        addressesMap.set(option.adreça, option.escola);
      }
    });

    const addresses = Array.from(addressesMap.keys());
    console.log('🗺️ Calculating distances for addresses:', addresses);

    // Calcular distancias usando Google Maps API
    const distanceResults = await maps.calculateDistances(addresses);

    if (distanceResults.success) {
      // Aplicar distancias calculadas a las opciones
      deliveryOptions.forEach(option => {
        const distanceData = distanceResults.data.find(d => d.address === option.adreça);
        if (distanceData) {
          option.distanciaAcademia = distanceData.distance;
          option.tempsAcademia = distanceData.duration;
          option.prioritat = distanceData.distanceValue;

          // Calcular eficiencia basada en distancia
          const km = distanceData.distanceValue / 1000;
          if (km < 2) option.eficiencia = "Màxima";
          else if (km < 4) option.eficiencia = "Alta";
          else if (km < 6) option.eficiencia = "Mitjana";
          else option.eficiencia = "Baixa";
        }
      });
    } else {
      // Si falla el cálculo de distancias, asignar valores por defecto
      console.warn('⚠️ Distance calculation failed, using default values');
      deliveryOptions.forEach((option, index) => {
        option.distanciaAcademia = "N/A";
        option.tempsAcademia = "N/A";
        option.prioritat = index + 1;
        option.eficiencia = "Alta";
      });
    }

    // Ordenar por prioridad (menor distancia = mayor eficiencia = primero)
    deliveryOptions.sort((a, b) => a.prioritat - b.prioritat);

    res.json({
      success: true,
      data: deliveryOptions
    });
  } catch (error) {
    console.error('Error getting delivery options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function getSchoolMonitorData() {
  try {
    const data = await sheets.getSheetData('Dades');

    if (!data || data.length === 0) {
      return { success: false, error: "La hoja 'Dades' está vacía" };
    }

    const headers = data[0];
    const escolaIdx = headers.findIndex(h => h === 'ESCOLA');
    const monitoraIdx = headers.findIndex(h => h === 'MONITORA');
    const diaIdx = headers.findIndex(h => h === 'DIA');
    const adreçaIdx = headers.findIndex(h => h === 'ADREÇA');
    const activitatIdx = headers.findIndex(h => h === 'ACTIVITAT'); // Nueva columna

    if (escolaIdx === -1 || monitoraIdx === -1) {
      return { success: false, error: "No s'han trobat les columnes necessàries (ESCOLA, MONITORA)" };
    }

    const schools = new Map();
    const monitors = new Map();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const escola = row[escolaIdx]?.toString().trim();
      const monitora = row[monitoraIdx]?.toString().trim();
      const dia = row[diaIdx]?.toString().trim() || '';
      const adreça = row[adreçaIdx]?.toString().trim() || '';
      const activitat = activitatIdx !== -1 ? (row[activitatIdx]?.toString().trim() || '') : '';

      if (!escola || !monitora) continue;

      if (!schools.has(escola)) {
        schools.set(escola, { nom: escola, adreça: adreça, monitors: [], dies: [] });
      }

      const schoolData = schools.get(escola);
      if (!schoolData.monitors.includes(monitora)) {
        schoolData.monitors.push(monitora);
      }
      if (dia && !schoolData.dies.includes(dia)) {
        schoolData.dies.push(dia);
      }

      if (!monitors.has(monitora)) {
        monitors.set(monitora, { nom: monitora, escoles: [] });
      }

      const monitorData = monitors.get(monitora);
      const existingSchool = monitorData.escoles.find(s => s.escola === escola);

      if (!existingSchool) {
        monitorData.escoles.push({
          escola: escola,
          adreça: adreça,
          dies: dia ? [dia] : [],
          activitat: activitat // Guardar actividad
        });
      } else {
        if (dia && !existingSchool.dies.includes(dia)) {
          existingSchool.dies.push(dia);
        }
        // Actualizar actividad si existe
        if (activitat && !existingSchool.activitat) {
          existingSchool.activitat = activitat;
        }
      }
    }

    return {
      success: true,
      data: {
        schools: Array.from(schools.values()),
        monitors: Array.from(monitors.values()),
        schoolsMap: schools,
        monitorsMap: monitors
      }
    };
  } catch (error) {
    console.error('Error in getSchoolMonitorData:', error);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/admin/delivery/create
 * Crea una entrega
 */
router.post('/delivery/create', async (req, res) => {
  try {
    const { deliveryData } = req.body;

    console.log('🚚 CREATE DELIVERY request received');
    console.log('🚚 deliveryData:', deliveryData);

    if (!deliveryData) {
      return res.json({
        success: false,
        error: "No s'han proporcionat dades d'entrega"
      });
    }

    const { orderIds, modalitat, monitorIntermediaria, escolaDestino, dataEntrega } = deliveryData;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.json({
        success: false,
        error: "No s'han proporcionat IDs de comandes"
      });
    }

    if (!modalitat) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat la modalitat de lliurament"
      });
    }

    // Obtener datos de la hoja Respostes
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return res.json({
        success: false,
        error: "No hi ha dades per actualitzar"
      });
    }

    const headers = data[0];
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const estatIndex = headers.findIndex(h => h === "Estat");
    const modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    const monitorIntermediariIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");

    if (idItemIndex === -1 && idPedidoIndex === -1) {
      return res.json({
        success: false,
        error: "No s'han trobat les columnes d'identificador"
      });
    }

    let updatedRows = 0;
    const currentTimestamp = new Date();

    // Actualizar las filas correspondientes
    const updatedData = data.map((row, index) => {
      if (index === 0) return row; // Skip header

      const rowIdItem = row[idItemIndex];
      const rowIdPedido = row[idPedidoIndex];

      // Verificar si este row es uno de los seleccionados
      const matchesId = orderIds.some(orderId =>
        orderId === rowIdItem || orderId === rowIdPedido
      );

      if (matchesId) {
        // Actualizar estado a "Assignat"
        if (estatIndex !== -1) {
          row[estatIndex] = 'Assignat';
        }

        // Actualizar modalidad de entrega
        if (modalitatEntregaIndex !== -1) {
          row[modalitatEntregaIndex] = modalitat === 'Directa' ? 'DIRECTA' : 'INTERMEDIARI';
        }

        // Si es entrega con intermediario, guardar datos del intermediario
        if (modalitat === 'Intermediari') {
          if (monitorIntermediariIndex !== -1) {
            row[monitorIntermediariIndex] = monitorIntermediaria || '';
          }
          if (escolaDestinoIndex !== -1) {
            row[escolaDestinoIndex] = escolaDestino || '';
          }
        } else {
          // Si es directa, limpiar campos de intermediario
          if (monitorIntermediariIndex !== -1) {
            row[monitorIntermediariIndex] = '';
          }
          if (escolaDestinoIndex !== -1) {
            row[escolaDestinoIndex] = '';
          }
        }

        // Actualizar fecha de lliurament prevista
        if (dataLliuramentIndex !== -1 && dataEntrega) {
          // Convertir la fecha string YYYY-MM-DD a objeto Date
          const dateObj = new Date(dataEntrega);
          row[dataLliuramentIndex] = dateObj;
        }

        updatedRows++;
        console.log(`✅ Updated row ${index}: ${rowIdItem || rowIdPedido}`);
      }

      return row;
    });

    if (updatedRows > 0) {
      // Actualizar en Sheets
      await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);

      // Invalidar caché
      cache.del('cache_respostes_data');

      console.log(`✅ Successfully updated ${updatedRows} rows`);

      return res.json({
        success: true,
        updatedRows: updatedRows,
        message: `Lliurament assignat correctament. ${updatedRows} comand${updatedRows > 1 ? 'es' : 'a'} actualitzad${updatedRows > 1 ? 'es' : 'a'}.`
      });
    } else {
      return res.json({
        success: false,
        error: "No s'han trobat comandes per actualitzar amb els IDs proporcionats"
      });
    }
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({
      success: false,
      error: 'Error creant el lliurament: ' + error.message
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

    console.log('🔄 REMOVE INTERMEDIARY request received');
    console.log('🔄 orderIds:', orderIds);

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.json({
        success: false,
        error: "No s'han proporcionat IDs de comandes"
      });
    }

    // Obtener datos de la hoja Respostes
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return res.json({
        success: false,
        error: "No hi ha dades per actualitzar"
      });
    }

    const headers = data[0];
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const estatIndex = headers.findIndex(h => h === "Estat");
    const modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    const monitorIntermediariIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");

    if (idItemIndex === -1 && idPedidoIndex === -1) {
      return res.json({
        success: false,
        error: "No s'han trobat les columnes d'identificador"
      });
    }

    let updatedRows = 0;

    // Actualizar las filas correspondientes
    const updatedData = data.map((row, index) => {
      if (index === 0) return row; // Skip header

      const rowIdItem = row[idItemIndex];
      const rowIdPedido = row[idPedidoIndex];

      // Verificar si este row es uno de los seleccionados
      const matchesId = orderIds.some(orderId =>
        orderId === rowIdItem || orderId === rowIdPedido
      );

      if (matchesId) {
        // Volver el estado a "Preparat"
        if (estatIndex !== -1) {
          row[estatIndex] = 'Preparat';
        }

        // Limpiar modalidad de entrega
        if (modalitatEntregaIndex !== -1) {
          row[modalitatEntregaIndex] = '';
        }

        // Limpiar datos del intermediario
        if (monitorIntermediariIndex !== -1) {
          row[monitorIntermediariIndex] = '';
        }
        if (escolaDestinoIndex !== -1) {
          row[escolaDestinoIndex] = '';
        }

        // Limpiar fecha de lliurament
        if (dataLliuramentIndex !== -1) {
          row[dataLliuramentIndex] = '';
        }

        updatedRows++;
        console.log(`✅ Removed intermediary from row ${index}: ${rowIdItem || rowIdPedido}`);
      }

      return row;
    });

    if (updatedRows > 0) {
      // Actualizar en Sheets
      await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);

      // Invalidar caché
      cache.del('cache_respostes_data');

      console.log(`✅ Successfully removed intermediary from ${updatedRows} rows`);

      return res.json({
        success: true,
        updatedRows: updatedRows,
        message: `Assignació d'intermediari eliminada. ${updatedRows} comand${updatedRows > 1 ? 'es' : 'a'} actualitzad${updatedRows > 1 ? 'es' : 'a'}.`
      });
    } else {
      return res.json({
        success: false,
        error: "No s'han trobat comandes per actualitzar amb els IDs proporcionats"
      });
    }
  } catch (error) {
    console.error('Error removing intermediary:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminant intermediari: ' + error.message
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

    console.log('📨 SEND NOTIFICATION request received');
    console.log('📨 spaceName:', spaceName);
    console.log('📨 notificationType:', notificationType);
    console.log('📨 orderId:', orderId);

    if (!spaceName || !message) {
      return res.json({
        success: false,
        error: "Falten dades obligatòries (spaceName, message)"
      });
    }

    // Enviar notificación usando el servicio de chat
    const result = await chat.sendChatNotification(spaceName, message);

    if (result.success) {
      // Si hay orderId, actualizar el estado de notificación en Sheets
      if (orderId && notificationType) {
        try {
          const data = await sheets.getSheetData('Respostes');

          if (data && data.length > 1) {
            const headers = data[0];
            const idItemIndex = headers.findIndex(h => h === 'ID_Item');
            const notifColumn = notificationType === 'intermediario'
              ? headers.findIndex(h => h === 'Notificacion_Intermediari')
              : headers.findIndex(h => h === 'Notificacion_Destinatari');

            if (idItemIndex !== -1 && notifColumn !== -1) {
              const updatedData = data.map((row, index) => {
                if (index === 0) return row;
                if (row[idItemIndex] === orderId) {
                  row[notifColumn] = 'Enviada';
                }
                return row;
              });

              await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);
              cache.del('cache_respostes_data');
              console.log(`✅ Estado de notificación actualizado para ${orderId}`);
            }
          }
        } catch (updateError) {
          console.error('Error actualizando estado de notificación:', updateError);
          // No fallar si hay error actualizando el estado
        }
      }

      return res.json({
        success: true,
        message: result.message || 'Notificació enviada correctament',
        data: {
          spaceName: result.spaceName,
          spaceId: result.spaceId,
          messageId: result.messageId,
          simulated: result.simulated || false
        }
      });
    } else {
      return res.json({
        success: false,
        error: result.error || 'Error enviant notificació'
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviant notificació: ' + error.message
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

    console.log('📊 GET NOTIFICATION STATUS request received');
    console.log('📊 orderId:', orderId);

    if (!orderId) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat l'ID de la comanda"
      });
    }

    // Obtener datos del sheet Respostes
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: true,
        data: {
          orderId: orderId,
          intermediario: 'Pendent',
          destinatario: 'Pendent'
        }
      });
    }

    const headers = data[0];
    const idItemIndex = headers.findIndex(h => h === 'ID_Item');
    const notifIntermediarioIndex = headers.findIndex(h => h === 'Notificacion_Intermediari');
    const notifDestinatarioIndex = headers.findIndex(h => h === 'Notificacion_Destinatari');

    if (idItemIndex === -1) {
      return res.json({
        success: false,
        error: "Columna ID_Item no trobada"
      });
    }

    // Buscar la fila correspondiente
    const row = data.slice(1).find(r => r[idItemIndex] === orderId);

    if (row) {
      return res.json({
        success: true,
        data: {
          orderId: orderId,
          intermediario: notifIntermediarioIndex !== -1 ? (row[notifIntermediarioIndex] || 'Pendent') : 'Pendent',
          destinatario: notifDestinatarioIndex !== -1 ? (row[notifDestinatarioIndex] || 'Pendent') : 'Pendent'
        }
      });
    } else {
      return res.json({
        success: false,
        error: "No s'ha trobat la comanda amb l'ID proporcionat"
      });
    }
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Error obtenint estat de notificacions: ' + error.message
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

    console.log('[NOTIFICATIONS] Request body:', req.body);
    console.log('[NOTIFICATIONS] orderIds:', orderIds);

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.json({
        success: false,
        error: "No s'han proporcionat IDs"
      });
    }

    // Obtener datos del sheet Respostes
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: true,
        results: {}
      });
    }

    const headers = data[0];
    const idItemIndex = headers.findIndex(h => h === 'ID_Item');
    const notifIntermediarioIndex = headers.findIndex(h => h === 'Notificacion_Intermediari');
    const notifDestinatarioIndex = headers.findIndex(h => h === 'Notificacion_Destinatari');

    console.log('[NOTIFICATIONS] Headers:', headers);
    console.log('[NOTIFICATIONS] Indices:', { idItemIndex, notifIntermediarioIndex, notifDestinatarioIndex });

    if (idItemIndex === -1) {
      return res.json({
        success: false,
        error: "Columna ID_Item no trobada"
      });
    }

    // Buscar estados de notificación para cada orderId
    const results = {};

    for (const orderId of orderIds) {
      // Buscar la fila correspondiente
      const row = data.slice(1).find(r => r[idItemIndex] === orderId);

      if (row) {
        results[orderId] = {
          intermediario: notifIntermediarioIndex !== -1 ? (row[notifIntermediarioIndex] || 'Pendent') : 'Pendent',
          destinatario: notifDestinatarioIndex !== -1 ? (row[notifDestinatarioIndex] || 'Pendent') : 'Pendent'
        };
      } else {
        // Si no se encuentra la fila, devolver estados por defecto
        results[orderId] = {
          intermediario: 'Pendent',
          destinatario: 'Pendent'
        };
      }
    }

    console.log('[NOTIFICATIONS] Results:', results);

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Error getting notification statuses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/chat/refresh-spaces
 * Refresca la caché de espacios de chat
 */
router.post('/chat/refresh-spaces', async (req, res) => {
  try {
    console.log('🔄 REFRESH CHAT SPACES request received');

    // Refrescar caché de espacios
    await chat.refreshChatSpaces();

    res.json({
      success: true,
      message: 'Caché d\'espais de xat refrescada correctament'
    });
  } catch (error) {
    console.error('Error refreshing chat spaces:', error);
    res.status(500).json({
      success: false,
      error: 'Error refrescant espais de xat: ' + error.message
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

    console.log('🗺️ CALCULATE DISTANCES request received');
    console.log('🗺️ addresses:', addresses);

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.json({
        success: false,
        error: "No s'han proporcionat adreces vàlides"
      });
    }

    // Usar el servicio de maps para calcular distancias
    const result = await maps.calculateDistances(addresses);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      return res.json({
        success: false,
        error: result.error || 'Error calculant distàncies'
      });
    }
  } catch (error) {
    console.error('Error calculating distances:', error);
    res.status(500).json({
      success: false,
      error: 'Error calculant distàncies: ' + error.message
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
