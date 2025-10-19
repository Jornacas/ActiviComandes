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

    const idLliuramentIdx = headersRow.findIndex(h => String(h || '').trim() === 'ID_Lliurament');
    const distanciaIdx = headersRow.findIndex(h => String(h || '').trim() === 'Distancia_Academia');

    let rows = data.slice(1)
      .map(row => {
        // Asegurar que todas las filas tengan la misma longitud que el header
        // Rellenar con valores vacíos si la fila es más corta
        const filledRow = [...row];
        while (filledRow.length < headersRow.length) {
          filledRow.push('');
        }
        return filledRow.slice(0, headersRow.length);
      })
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
      // IMPORTANTE: Hacer trim() para eliminar espacios al principio/final
      const headerTrimmed = String(h || '').trim();

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
        'Activitat_Intermediari': 'activitatIntermediari',
        'Data_Entrega_Prevista': 'dataEntregaPrevista',
        'Data_Lliurament_Prevista': 'dataLliuramentPrevista',
        'ID_Lliurament': 'idLliurament',
        'Distancia_Academia': 'idLliurament', // Columna V reutilizada como ID_Lliurament
        'Notes_Entrega': 'notesEntrega'
      };
      return map[headerTrimmed] || String(headerTrimmed).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
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
        } else if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Si es un string en formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS), mantenerlo
          processedRow[dataNecessitatColIndex] = rawDate.split('T')[0];
        }
      }

      // Procesar Data_Lliurament_Prevista
      if (dataLliuramentColIndex !== -1 && processedRow[dataLliuramentColIndex]) {
        const rawDate = processedRow[dataLliuramentColIndex];
        if (rawDate instanceof Date) {
          processedRow[dataLliuramentColIndex] = formatDate(rawDate);
        } else if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Si es un string en formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS), extraer solo la fecha
          processedRow[dataLliuramentColIndex] = rawDate.split('T')[0];
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
      assignats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Assignat').length : 0,
      lliurats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Lliurat').length : 0
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

    // Intentar encontrar la columna de modalidad con ambos nombres posibles
    let modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    if (modalitatEntregaIndex === -1) {
      modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Lliurament");
    }

    const monitorIntermediariIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");
    const notifIntermediariIndex = headers.findIndex(h => h === "Notificacion_Intermediari");
    const notifDestinatariIndex = headers.findIndex(h => h === "Notificacion_Destinatari");
    const idLliuramentIndex = headers.findIndex(h => h === "ID_Lliurament");

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

          // Si el nuevo estado NO es "Assignat" ni "Lliurat", limpiar campos de lliurament
          if (newStatus !== 'Assignat' && newStatus !== 'Lliurat') {
            if (modalitatEntregaIndex !== -1) {
              row[modalitatEntregaIndex] = '';
            }
            if (monitorIntermediariIndex !== -1) {
              row[monitorIntermediariIndex] = '';
            }
            if (escolaDestinoIndex !== -1) {
              row[escolaDestinoIndex] = '';
            }
            if (dataLliuramentIndex !== -1) {
              row[dataLliuramentIndex] = '';
            }
            if (notifIntermediariIndex !== -1) {
              row[notifIntermediariIndex] = '';
            }
            if (notifDestinatariIndex !== -1) {
              row[notifDestinatariIndex] = '';
            }
            // Limpiar ID_Lliurament cuando se cancela el lliurament
            if (idLliuramentIndex !== -1) {
              row[idLliuramentIndex] = '';
            }
            console.log(`🧹 Limpiando campos de asignación para ${rowIdItem || rowIdPedido}`);
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
 * PUT /api/admin/orders/:idItem
 * Actualitza camps individuals d'una comanda (Material, Unitats, Comentaris, Responsable)
 */
router.put('/orders/:idItem', async (req, res) => {
  try {
    const { idItem } = req.params;
    const updates = req.body; // { material, unitats, comentaris_generals, responsable_preparacio }

    console.log('✏️ UPDATE ORDER FIELDS request received');
    console.log('✏️ idItem:', idItem);
    console.log('✏️ updates:', updates);

    if (!idItem) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat l'ID de la comanda"
      });
    }

    // Validar que hi hagi almenys un camp a actualitzar
    const allowedFields = ['material', 'unitats', 'comentaris_generals', 'responsable_preparacio'];
    const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      return res.json({
        success: false,
        error: "No s'ha proporcionat cap camp vàlid per actualitzar"
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

    if (idItemIndex === -1) {
      return res.json({
        success: false,
        error: "No s'ha trobat la columna 'ID_Item'"
      });
    }

    // Trobar índexs de les columnes a actualitzar
    const columnMapping = {
      'material': headers.findIndex(h => h === "Material"),
      'unitats': headers.findIndex(h => h === "Unitats"),
      'comentaris_generals': headers.findIndex(h => h === "Comentaris_Generals"),
      'responsable_preparacio': headers.findIndex(h => h === "Responsable_Preparacio")
    };

    // Validar que totes les columnes existeixin
    for (const field of fieldsToUpdate) {
      if (columnMapping[field] === -1) {
        return res.json({
          success: false,
          error: `No s'ha trobat la columna per al camp '${field}'`
        });
      }
    }

    let updated = false;
    let updatedRow = null;

    const updatedData = data.map((row, index) => {
      if (index === 0) return row;

      const rowIdItem = row[idItemIndex];

      if (idItem === rowIdItem) {
        // Actualitzar els camps especificats
        for (const field of fieldsToUpdate) {
          const columnIndex = columnMapping[field];
          row[columnIndex] = updates[field] !== undefined ? updates[field] : '';
          console.log(`✏️ Updating ${field}: "${row[columnIndex]}"`);
        }
        updated = true;
        updatedRow = row;
      }

      return row;
    });

    if (updated) {
      // Actualitzar a Google Sheets
      await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);

      // Invalidar caché
      cache.del('cache_respostes_data');

      console.log('✅ Order fields updated successfully');

      return res.json({
        success: true,
        message: "Camps actualitzats correctament",
        updatedFields: fieldsToUpdate
      });
    } else {
      return res.json({
        success: false,
        error: "No s'ha trobat la comanda amb l'ID proporcionat"
      });
    }
  } catch (error) {
    console.error('❌ Error updating order fields:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualitzant els camps: ' + error.message
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

    // Mapear a formato de objeto con procesamiento de fechas
    const dataLliuramentColIndex = headers.findIndex(h => h === 'Data_Lliurament_Prevista');
    const dataNecessitatColIndex = headers.findIndex(h => h === 'Data_Necessitat');

    const orders = preparatedRows.map(row => {
      const order = {};
      headers.forEach((header, index) => {
        const key = mapHeaderToKey(header);
        let value = row[index];

        // Procesar Data_Lliurament_Prevista
        if (index === dataLliuramentColIndex && value) {
          if (value instanceof Date) {
            value = formatDate(value);
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Si es un string en formato ISO, extraer solo la fecha
            value = value.split('T')[0];
          }
        }

        // Procesar Data_Necessitat
        if (index === dataNecessitatColIndex && value) {
          if (value instanceof Date) {
            value = formatDate(value);
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Si es un string en formato ISO, extraer solo la fecha
            value = value.split('T')[0];
          }
        }

        order[key] = value;
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

    // PASO 1: Agrupar pedidos por persona + rango de fechas (independiente de escola)
    const groupedOrders = new Map();

    // Función para comparar si dos fechas están dentro de un rango aceptable (3 días)
    const datesAreClose = (date1, date2, maxDays = 3) => {
      if (!date1 || !date2) return false;
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    };

    orders.forEach(order => {
      // Buscar si ya existe un grupo para esta persona con fechas cercanas
      let matchingGroup = null;

      for (const [key, group] of groupedOrders) {
        if (group.nomCognoms === order.nomCognoms) {
          // Verificar si las fechas están cercanas
          if (datesAreClose(group.dataNecessitat, order.dataNecessitat)) {
            matchingGroup = key;
            break;
          }
        }
      }

      if (matchingGroup) {
        // Añadir al grupo existente
        const group = groupedOrders.get(matchingGroup);
        group.orders.push(order);

        // Añadir la escola al grupo si no está ya
        if (!group.escoles.includes(order.escola)) {
          group.escoles.push(order.escola);
        }

        // Usar la fecha más temprana como fecha de necesidad del grupo
        const currentDate = new Date(group.dataNecessitat);
        const newDate = new Date(order.dataNecessitat);
        if (newDate < currentDate) {
          group.dataNecessitat = order.dataNecessitat;
        }
      } else {
        // Crear nuevo grupo
        const groupKey = `${order.nomCognoms}|${order.dataNecessitat}|${Date.now()}`;
        groupedOrders.set(groupKey, {
          nomCognoms: order.nomCognoms,
          escoles: [order.escola], // Ahora es un array de escoles
          dataNecessitat: order.dataNecessitat,
          orders: [order]
        });
      }
    });

    console.log(`📦 Grouped ${orders.length} orders into ${groupedOrders.size} groups (por persona + rango de dates)`);

    const deliveryOptions = [];

    // PASO 2: Procesar cada grupo
    for (const [groupKey, group] of groupedOrders) {
      console.log(`🎯 Processing group: ${group.nomCognoms} - Escoles: [${group.escoles.join(', ')}] - ${group.dataNecessitat}`);
      console.log(`   📋 Orders in group: ${group.orders.length}`);
      console.log(`   🏫 Schools in group: ${group.escoles.length}`);

      // OPCIÓN 1: RECOLLIDA A EIXOS CREATIVA (el destinatario recoge en la oficina)
      // Esta opción SIEMPRE está disponible independientemente de las escuelas
      const pickupOption = {
        tipus: "Recollida a Eixos Creativa",
        escola: "Eixos Creativa", // Recoge en la oficina de Eixos
        escoles: group.escoles, // Pero los materiales son para múltiples escoles
        adreça: "Carrer de la Llacuna, 162, 08018 Barcelona", // Dirección de Eixos Creativa
        eficiencia: "Màxima", // Recogida en oficina es siempre máxima eficiencia
        prioritat: 1, // Máxima prioridad
        nomCognoms: group.nomCognoms,
        dataNecessitat: group.dataNecessitat,
        monitorsDisponibles: [{
          nom: "Recollida a oficina",
          dies: ["dilluns", "dimarts", "dimecres", "dijous", "divendres"],
          tipus: "recollida",
          activitat: 'N/A'
        }],
        descripció: `${group.nomCognoms} recull el material a Eixos Creativa (Llacuna 162)`,
        distanciaAcademia: "Ubicació: Eixos Creativa",
        tempsAcademia: "Horari: 9h-18h",
        comandes: group.orders,
        destinatari: {
          nom: group.nomCognoms,
          activitat: group.orders[0]?.activitat || 'N/A'
        }
      };

      deliveryOptions.push(pickupOption);

      // OPCIÓN 2: ENTREGA DIRECTA DESDE EIXOS (alguien de Eixos lleva a la escuela)
      // Crear una opción para cada escuela del destinatario
      for (const escolaDestino of group.escoles) {
        // Buscar la dirección de esta escuela en los datos de monitores
        let escolaAddress = null;
        if (schoolData.data.monitors) {
          for (const monitor of schoolData.data.monitors) {
            const schoolInfo = monitor.escoles?.find(s => s.escola === escolaDestino);
            if (schoolInfo?.adreça) {
              escolaAddress = schoolInfo.adreça;
              break;
            }
          }
        }

        const directDeliveryOption = {
          tipus: "Entrega Directa des d'Eixos",
          escola: escolaDestino, // Escuela de destino
          escoles: group.escoles,
          adreça: escolaAddress || "Adreça no disponible",
          eficiencia: "Calculant...",
          prioritat: 2, // Prioridad media (después de recollida pero antes de intermediari)
          nomCognoms: group.nomCognoms,
          dataNecessitat: group.dataNecessitat,
          monitorsDisponibles: [{
            nom: "Equip Eixos Creativa",
            dies: ["dilluns", "dimarts", "dimecres", "dijous", "divendres"],
            tipus: "entrega-directa",
            activitat: 'N/A'
          }],
          descripció: `Eixos Creativa entrega directament a ${escolaDestino} per ${group.nomCognoms}`,
          distanciaAcademia: "Calculant...",
          tempsAcademia: "Calculant...",
          notes: "Entrega directa per l'equip d'Eixos",
          comandes: group.orders,
          destinatari: {
            nom: group.nomCognoms,
            activitat: group.orders[0]?.activitat || 'N/A'
          }
        };

        deliveryOptions.push(directDeliveryOption);
      }

      // OPCIÓN 3: Entrega con INTERMEDIARIO
      // Buscar monitores que coincidan con el destinatario en AL MENOS UNA de las escoles
      if (schoolData.data.monitors) {
        schoolData.data.monitors.forEach(monitor => {
          if (monitor.escoles?.length > 1) {
            // Verificar si este monitor coincide con el destinatario en alguna escola del grupo
            for (const escolaDestino of group.escoles) {
              const targetSchoolInfo = monitor.escoles.find(s => s.escola === escolaDestino);

              if (targetSchoolInfo) {
                // Este monitor va a la escola del destinatario
                // Buscar otras escoles donde el monitor trabaja (para recoger el material)
                monitor.escoles.forEach(intermediarySchoolInfo => {
                  if (intermediarySchoolInfo.escola !== escolaDestino) {
                    const intermediaryOption = {
                      tipus: "Lliurament amb Intermediari",
                      escola: intermediarySchoolInfo.escola, // Escola donde recoge
                      escolaDestino: escolaDestino, // Escola donde entrega
                      escoles: group.escoles, // Todas las escoles del grupo (para mostrar en materiales)
                      adreça: intermediarySchoolInfo.adreça,
                      eficiencia: "Calculant...",
                      prioritat: 99999,
                      nomCognoms: group.nomCognoms,
                      dataNecessitat: group.dataNecessitat,
                      monitorsDisponibles: [{
                        nom: monitor.nom,
                        dies: intermediarySchoolInfo.dies,
                        tipus: "intermediari",
                        escolaOrigen: intermediarySchoolInfo.escola,
                        activitat: intermediarySchoolInfo.activitat || 'N/A',
                        destinoFinal: {
                          escola: escolaDestino,
                          dies: targetSchoolInfo.dies,
                          activitat: targetSchoolInfo.activitat || 'N/A'
                        }
                      }],
                      descripció: `Entrega a ${intermediarySchoolInfo.escola} → ${monitor.nom} transporta a ${escolaDestino} per ${group.nomCognoms}`,
                      distanciaAcademia: "Calculant...",
                      tempsAcademia: "Calculant...",
                      notes: "Monitor multicentre",
                      comandes: group.orders,
                      destinatari: {
                        nom: group.nomCognoms,
                        activitat: group.orders[0]?.activitat || 'N/A'
                      }
                    };

                    // Evitar duplicados: solo añadir si no existe ya esta combinación
                    const isDuplicate = deliveryOptions.some(opt =>
                      opt.nomCognoms === intermediaryOption.nomCognoms &&
                      opt.escola === intermediaryOption.escola &&
                      opt.escolaDestino === intermediaryOption.escolaDestino &&
                      opt.monitorsDisponibles[0]?.nom === intermediaryOption.monitorsDisponibles[0]?.nom
                    );

                    if (!isDuplicate) {
                      deliveryOptions.push(intermediaryOption);
                    }
                  }
                });

                // Solo procesar una escola destino (para evitar múltiples opciones redundantes)
                break;
              }
            }
          }
        });
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

/**
 * Busca la actividad de un monitor en una escola específica desde la hoja Dades
 * @param {string} monitorName - Nombre del monitor
 * @param {string} escolaName - Nombre de la escola
 * @returns {Promise<string|null>} - Actividad del monitor o null si no se encuentra
 */
async function getMonitorActivityInSchool(monitorName, escolaName) {
  try {
    const data = await sheets.getSheetData('Dades');

    if (!data || data.length === 0) {
      console.error('❌ Hoja Dades vacía');
      return null;
    }

    const headers = data[0];
    const escolaIdx = headers.findIndex(h => h === 'ESCOLA');
    const monitoraIdx = headers.findIndex(h => h === 'MONITORA');
    const activitatIdx = headers.findIndex(h => h === 'ACTIVITAT');

    if (escolaIdx === -1 || monitoraIdx === -1 || activitatIdx === -1) {
      console.error('❌ No se encontraron columnas necesarias en Dades');
      return null;
    }

    // Buscar fila que coincida con monitor y escola
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowMonitor = row[monitoraIdx]?.toString().trim();
      const rowEscola = row[escolaIdx]?.toString().trim();
      const rowActivitat = row[activitatIdx]?.toString().trim();

      if (rowMonitor === monitorName && rowEscola === escolaName && rowActivitat) {
        console.log(`✅ Actividad encontrada para ${monitorName} en ${escolaName}: ${rowActivitat}`);
        return rowActivitat;
      }
    }

    console.warn(`⚠️ No se encontró actividad para ${monitorName} en ${escolaName}`);
    return null;
  } catch (error) {
    console.error('Error buscando actividad del monitor:', error);
    return null;
  }
}

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
    console.log('📋 Headers found in sheet (delivery/create):', headers);

    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const estatIndex = headers.findIndex(h => h === "Estat");

    // Intentar encontrar la columna de modalidad con ambos nombres posibles
    let modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    if (modalitatEntregaIndex === -1) {
      modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Lliurament");
      console.log('⚠️ Using Modalitat_Lliurament column instead of Modalitat_Entrega');
    }

    const monitorIntermediariIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");

    // Buscar columna de Activitat_Intermediari (puede que no exista todavía)
    let activitatIntermediariIndex = headers.findIndex(h => h === "Activitat_Intermediari");

    // Buscar columna ID_Lliurament (Columna V / Distancia_Academia reutilizada)
    let idLliuramentIndex = headers.findIndex(h => h === "ID_Lliurament");
    if (idLliuramentIndex === -1) {
      idLliuramentIndex = headers.findIndex(h => h === "Distancia_Academia");
      console.log('⚠️ Using Distancia_Academia column as ID_Lliurament');
    }

    // Generar ID único para este lliurament (UUID simplificado con timestamp)
    const idLliurament = `LLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (idItemIndex === -1 && idPedidoIndex === -1) {
      return res.json({
        success: false,
        error: "No s'han trobat les columnes d'identificador"
      });
    }

    let updatedRows = 0;
    const currentTimestamp = new Date();

    // Si hay intermediario, buscar su actividad en la hoja Dades
    let activitatIntermediariValue = null;
    if (modalitat === 'Intermediari' && monitorIntermediaria && escolaDestino) {
      // La escolaDestino es donde ENTREGA el intermediario (escola destino final)
      // Necesitamos buscar la actividad del intermediario en ESA escola
      activitatIntermediariValue = await getMonitorActivityInSchool(monitorIntermediaria, escolaDestino);
    }

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
          // Guardar actividad del intermediario si existe
          if (activitatIntermediariIndex !== -1 && activitatIntermediariValue) {
            row[activitatIntermediariIndex] = activitatIntermediariValue;
          }
        } else {
          // Si es directa, escribir "DIRECTA" en Monitor_Intermediari
          if (monitorIntermediariIndex !== -1) {
            row[monitorIntermediariIndex] = 'DIRECTA';
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

        // Asignar ID_Lliurament único a todos los pedidos de este lote
        if (idLliuramentIndex !== -1) {
          row[idLliuramentIndex] = idLliurament;
        }

        updatedRows++;
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

    // Intentar encontrar la columna de modalidad con ambos nombres posibles
    let modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    if (modalitatEntregaIndex === -1) {
      modalitatEntregaIndex = headers.findIndex(h => h === "Modalitat_Lliurament");
    }

    const monitorIntermediariIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");
    const notifIntermediariIndex = headers.findIndex(h => h === "Notificacion_Intermediari");
    const notifDestinatariIndex = headers.findIndex(h => h === "Notificacion_Destinatari");

    // Buscar columna ID_Lliurament (Columna V / Distancia_Academia reutilizada)
    let idLliuramentIndex = headers.findIndex(h => h === "ID_Lliurament");
    if (idLliuramentIndex === -1) {
      idLliuramentIndex = headers.findIndex(h => h === "Distancia_Academia");
    }

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

        // Limpiar ID_Lliurament
        if (idLliuramentIndex !== -1) {
          row[idLliuramentIndex] = '';
        }

        // Limpiar estados de notificaciones
        if (notifIntermediariIndex !== -1) {
          row[notifIntermediariIndex] = '';
        }
        if (notifDestinatariIndex !== -1) {
          row[notifDestinatariIndex] = '';
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
 * POST /api/admin/notifications/send-grouped
 * Envía una notificación para un grupo de pedidos
 * Todos los pedidos del grupo se marcan como notificados al enviar uno solo
 */
router.post('/notifications/send-grouped', async (req, res) => {
  try {
    const { spaceName, message, orderIds, notificationType } = req.body;

    console.log('📨📦 SEND GROUPED NOTIFICATION request received');
    console.log('📨 spaceName:', spaceName);
    console.log('📨 notificationType:', notificationType);
    console.log('📨 orderIds (group):', orderIds);

    if (!spaceName || !message) {
      return res.json({
        success: false,
        error: "Falten dades obligatòries (spaceName, message)"
      });
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.json({
        success: false,
        error: "No s'han proporcionat IDs de comandes"
      });
    }

    // Enviar UNA sola notificación para todo el grupo
    const result = await chat.sendChatNotification(spaceName, message);

    if (result.success) {
      // Actualizar TODOS los pedidos del grupo como notificados
      if (notificationType) {
        try {
          const data = await sheets.getSheetData('Respostes');

          if (data && data.length > 1) {
            const headers = data[0];
            const idItemIndex = headers.findIndex(h => h === 'ID_Item');
            const idPedidoIndex = headers.findIndex(h => h === 'ID_Pedido');
            const notifColumn = notificationType === 'intermediario'
              ? headers.findIndex(h => h === 'Notificacion_Intermediari')
              : headers.findIndex(h => h === 'Notificacion_Destinatari');

            if ((idItemIndex !== -1 || idPedidoIndex !== -1) && notifColumn !== -1) {
              let updatedCount = 0;

              const updatedData = data.map((row, index) => {
                if (index === 0) return row;

                const rowIdItem = row[idItemIndex];
                const rowIdPedido = row[idPedidoIndex];

                // Verificar si este pedido está en el grupo
                const isInGroup = orderIds.some(orderId =>
                  orderId === rowIdItem || orderId === rowIdPedido
                );

                if (isInGroup) {
                  row[notifColumn] = 'Enviada';
                  updatedCount++;
                  console.log(`✅ Marked notification sent for ${rowIdItem || rowIdPedido}`);
                }

                return row;
              });

              await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);
              cache.del('cache_respostes_data');
              console.log(`✅ Estado de notificación actualizado para ${updatedCount} pedidos del grupo`);
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
          spaceName: result.actualSpace || result.spaceName,
          spaceId: result.spaceId,
          messageId: result.messageId,
          simulated: result.simulated || false,
          usedFallback: result.usedFallback || false,
          groupSize: orderIds.length
        }
      });
    } else {
      return res.json({
        success: false,
        error: result.error || 'Error enviant notificació'
      });
    }
  } catch (error) {
    console.error('Error sending grouped notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviant notificació agrupada: ' + error.message
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

/**
 * POST /api/admin/notifications/send-to-compres
 * Envía notificación al espacio /Staff/COMPRES cuando un pedido se pone en "En Procés"
 */
router.post('/notifications/send-to-compres', async (req, res) => {
  try {
    const { dataNecessitat, notes } = req.body;

    console.log('🛒 SEND TO COMPRES request received');
    console.log('🛒 dataNecessitat:', dataNecessitat);
    console.log('🛒 notes:', notes);

    if (!dataNecessitat || !notes) {
      return res.json({
        success: false,
        error: "Falten dades obligatòries (dataNecessitat, notes)"
      });
    }

    // Formatear la fecha de forma legible (ej: "dimarts 25 de novembre")
    const formatDate = (dateStr) => {
      let date;

      // Detectar el formato: DD/MM/YYYY o YYYY-MM-DD
      if (dateStr.includes('/')) {
        // Formato DD/MM/YYYY
        const [day, month, year] = dateStr.split('/');
        date = new Date(year, month - 1, day);
      } else if (dateStr.includes('-')) {
        // Formato ISO YYYY-MM-DD
        date = new Date(dateStr);
      } else {
        // Formato desconocido, intentar parsear directamente
        date = new Date(dateStr);
      }

      const diasSemana = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
      const mesesAny = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny',
                        'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

      const diaSemana = diasSemana[date.getDay()];
      const dia = date.getDate();
      const mes = mesesAny[date.getMonth()];

      return `${diaSemana} ${dia} de ${mes}`;
    };

    const dataFormatada = formatDate(dataNecessitat);

    // Formatear el mensaje simple
    const message = `📅 **Data necessitat: ${dataFormatada}**\n\n💬 **Notes**: ${notes}`;

    // Enviar al espacio **/Staff/COMPRES
    const result = await chat.sendChatNotification('**/Staff/COMPRES', message);

    if (result.success) {
      console.log('✅ Notificación enviada a **/Staff/COMPRES');
      return res.json({
        success: true,
        message: 'Notificació enviada a **/Staff/COMPRES correctament'
      });
    } else {
      return res.json({
        success: false,
        error: result.error || 'Error enviant notificació a **/Staff/COMPRES'
      });
    }
  } catch (error) {
    console.error('Error sending notification to COMPRES:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviant notificació a COMPRES: ' + error.message
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
    'Modalitat_Lliurament': 'modalitatEntrega', // Support both column names
    'Monitor_Intermediari': 'monitorIntermediari',
    'Escola_Destino_Intermediari': 'escolaDestinoIntermediari',
    'Activitat_Intermediari': 'activitatIntermediari',
    'Data_Entrega_Prevista': 'dataEntregaPrevista',
    'Data_Lliurament_Prevista': 'dataLliuramentPrevista',
    'ID_Lliurament': 'idLliurament',
    'Distancia_Academia': 'idLliurament', // Columna V reutilizada como ID_Lliurament
    'Notes_Entrega': 'notesEntrega'
  };
  return map[header] || String(header).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

// ======================================================
// ENDPOINT TEMPORAL - CARGAR ID_LLIURAMENT
// ======================================================

/**
 * GET /api/admin/list-current-orders
 * TEMPORAL: Lista todos los pedidos actuales con sus IDs
 */
router.get('/list-current-orders', async (req, res) => {
  try {
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: true,
        orders: []
      });
    }

    const headers = data[0];
    const rows = data.slice(1);

    const idItemIndex = headers.findIndex(h => h === 'ID_Item');
    const nomCognomsIndex = headers.findIndex(h => h === 'Nom_i_Cognoms');
    const escolaIndex = headers.findIndex(h => h === 'Escola_Destino' || h === 'Escola');
    const monitorIndex = headers.findIndex(h => h === 'Monitor_Intermediari');
    const estatIndex = headers.findIndex(h => h === 'Estat');

    const orders = rows
      .filter(row => row[idItemIndex]) // Solo filas con ID_Item
      .map(row => ({
        idItem: row[idItemIndex] || 'N/A',
        nomCognoms: row[nomCognomsIndex] || 'N/A',
        escola: row[escolaIndex] || 'N/A',
        monitor: row[monitorIndex] || '',
        estat: row[estatIndex] || ''
      }));

    res.json({
      success: true,
      total: orders.length,
      orders
    });
  } catch (error) {
    console.error('Error listando pedidos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/load-ids-lliurament
 * TEMPORAL: Carga IDs de lliurament a pedidos existentes
 * Este endpoint puede eliminarse después de usarlo
 *
 * Body: { grupos: [{ id: 'LLI-001', descripcion: '...', idItems: ['uuid-001', 'uuid-002'] }] }
 */
router.post('/load-ids-lliurament', async (req, res) => {
  try {
    console.log('🔄 Iniciando carga de ID_Lliurament...');

    // Obtener grupos del body o usar valores por defecto
    const GRUPOS = req.body.grupos || [];

    // Obtener datos actuales
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length < 2) {
      return res.json({
        success: false,
        error: 'No se encontraron datos en la hoja'
      });
    }

    const headers = data[0];
    const rows = data.slice(1);

    // Encontrar índices
    const idItemIndex = headers.findIndex(h => h === 'ID_Item');
    let idLliuramentIndex = headers.findIndex(h => h === 'ID_Lliurament' || h === 'Distancia_Academia');

    console.log('📍 Headers actuales:', headers);
    console.log('📍 Índice ID_Item:', idItemIndex);
    console.log('📍 Índice ID_Lliurament:', idLliuramentIndex);

    if (idItemIndex === -1) {
      return res.json({
        success: false,
        error: 'No se encontró la columna ID_Item'
      });
    }

    // Si no existe la columna, buscar la primera columna vacía o usar columna V (índice 21)
    if (idLliuramentIndex === -1) {
      // Buscar primera columna completamente vacía
      idLliuramentIndex = headers.findIndex((h, i) => i > 0 && (!h || h.trim() === ''));

      // Si no hay columnas vacías, usar columna V (índice 21) por defecto
      if (idLliuramentIndex === -1) {
        idLliuramentIndex = 21; // Columna V
        console.log('⚠️  No se encontró columna vacía, usando columna V (índice 21)');
      } else {
        console.log(`✅ Columna vacía encontrada en índice ${idLliuramentIndex}`);
      }

      // Crear el header
      console.log('📝 Creando columna ID_Lliurament...');
      const colLetter = String.fromCharCode(65 + idLliuramentIndex);
      await sheets.updateRange('Respostes', `${colLetter}1`, [['ID_Lliurament']]);
      console.log(`✅ Columna ID_Lliurament creada en columna ${colLetter}`);
    } else if (headers[idLliuramentIndex] === 'Distancia_Academia') {
      // Cambiar encabezado si es necesario
      console.log('📝 Cambiando encabezado de Distancia_Academia a ID_Lliurament...');
      const colLetter = String.fromCharCode(65 + idLliuramentIndex);
      await sheets.updateRange('Respostes', `${colLetter}1`, [['ID_Lliurament']]);
      console.log('✅ Encabezado actualizado');
    }

    // Procesar cada grupo
    const resultados = [];
    let totalActualizados = 0;

    for (const grupo of GRUPOS) {
      console.log(`\n📦 Procesando ${grupo.id}: ${grupo.descripcion}`);

      const actualizacionesGrupo = [];

      for (const idItem of grupo.idItems) {
        // Buscar la fila correspondiente
        const rowIndex = rows.findIndex(row => row[idItemIndex] === idItem);

        if (rowIndex === -1) {
          console.log(`⚠️  No se encontró: ${idItem}`);
          actualizacionesGrupo.push({
            idItem,
            status: 'no_encontrado'
          });
          continue;
        }

        // Fila en el Sheet (1-indexed + header)
        const sheetRow = rowIndex + 2;
        const colLetter = String.fromCharCode(65 + idLliuramentIndex);

        // Actualizar la celda
        await sheets.updateRange('Respostes', `${colLetter}${sheetRow}`, [[grupo.id]]);

        console.log(`✅ ${idItem} → fila ${sheetRow} → ${grupo.id}`);
        totalActualizados++;

        actualizacionesGrupo.push({
          idItem,
          fila: sheetRow,
          idLliurament: grupo.id,
          status: 'actualizado'
        });
      }

      resultados.push({
        grupo: grupo.id,
        descripcion: grupo.descripcion,
        actualizaciones: actualizacionesGrupo
      });
    }

    console.log(`\n🎉 Proceso completado: ${totalActualizados} pedidos actualizados`);

    // Invalidar caché
    cache.del('cache_respostes');

    res.json({
      success: true,
      totalActualizados,
      grupos: resultados,
      message: `Se actualizaron ${totalActualizados} pedidos con sus ID_Lliurament correspondientes`
    });

  } catch (error) {
    console.error('❌ Error al cargar IDs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
