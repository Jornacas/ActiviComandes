/**
 * Orders Service
 * Lògica de negoci de comandes extreta de routes/admin.js
 */

const sheets = require('./sheets');
const cache = require('./cache');
const { generateUUID, formatDate, parseTimestamp, getDefaultHeaders, getColumnIndices, invalidateOrdersCache, mapHeaderToKey } = require('../utils/helpers');

/**
 * Obté totes les comandes amb estadístiques.
 * @param {number|null} limit - Nombre màxim de files a retornar (null = totes)
 * @returns {object} { headers, rows, estadisticas }
 */
async function getOrders(limit) {
  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length === 0) {
    return {
      headers: getDefaultHeaders(),
      rows: [],
      estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
    };
  }

  if (data.length < 2) {
    return {
      headers: getDefaultHeaders(),
      rows: [],
      estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
    };
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

  if (timestampIdx !== -1) {
    rows.sort((a, b) => {
      // Convertir timestamps en formato DD/MM/YYYY HH:MM:SS a objetos Date
      const parseTs = (ts) => {
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

      const dateA = parseTs(a[timestampIdx]);
      const dateB = parseTs(b[timestampIdx]);

      return dateB - dateA; // Orden descendente (más nuevos primero)
    });
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
      'Escola_Recollida_Intermediari': 'pickupSchool',
      'Activitat_Intermediari': 'activitatIntermediari',
      'Data_Entrega_Prevista': 'dataEntregaPrevista',
      'Data_Lliurament_Prevista': 'dataLliuramentPrevista',
      'ID_Lliurament': 'idLliurament',
      'Distancia_Academia': 'idLliurament', // Columna V reutilizada como ID_Lliurament
      'Notes_Entrega': 'notesEntrega',
      'Notificacion_Intermediari': 'notificacionIntermediari',
      'Notificacion_Destinatari': 'notificacionDestinatari'
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
  const estadisticas = {
    total: allRows.length,
    pendents: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Pendent').length : 0,
    enProces: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'En proces').length : 0,
    preparats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Preparat').length : 0,
    assignats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Assignat').length : 0,
    lliurats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Lliurat').length : 0
  };

  return {
    headers: headers,
    rows: processedRows,
    estadisticas: estadisticas
  };
}

/**
 * Processa respostes i calcula estadístiques.
 * @returns {object} { success, nuevosRegistros, message, estadisticas }
 */
async function processOrders() {
  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length < 2) {
    return {
      success: true,
      nuevosRegistros: 0,
      message: "No hi ha noves sol·licituds per processar.",
      estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
    };
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

  return {
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
  };
}

/**
 * Actualitza l'estat de comandes.
 * @param {string[]} uuids - Array d'IDs a actualitzar
 * @param {string} newStatus - Nou estat
 * @returns {object} { success, changesMade, message, error? }
 */
async function updateOrderStatus(uuids, newStatus) {
  if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
    return {
      success: false,
      error: "No s'han proporcionat UUIDs vàlids"
    };
  }

  if (!newStatus) {
    return {
      success: false,
      error: "No s'ha proporcionat l'estat nou"
    };
  }

  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length <= 1) {
    return {
      success: false,
      error: "No hay datos en la hoja 'Respostes' para actualizar."
    };
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
  const pickupSchoolIndex = headers.findIndex(h => h === "Escola_Recollida_Intermediari");
  const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");
  const notifIntermediariIndex = headers.findIndex(h => h === "Notificacion_Intermediari");
  const notifDestinatariIndex = headers.findIndex(h => h === "Notificacion_Destinatari");
  const idLliuramentIndex = headers.findIndex(h => h === "ID_Lliurament");

  if (idPedidoIndex === -1 && idItemIndex === -1) {
    return {
      success: false,
      error: "No se encontraron las columnas de ID"
    };
  }

  if (estatIndex === -1) {
    return {
      success: false,
      error: "La columna 'Estat' no se encontró"
    };
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
          if (pickupSchoolIndex !== -1) {
            row[pickupSchoolIndex] = '';
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
          console.log(`Limpiando campos de asignación para ${rowIdItem || rowIdPedido}`);
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

    return {
      success: true,
      changesMade: changesMade,
      message: `S'han actualitzat ${changesMade} elements a l'estat: ${newStatus}`
    };
  } else {
    return {
      success: true,
      changesMade: 0,
      message: "No s'han trobat elements per actualitzar amb els IDs proporcionats."
    };
  }
}

/**
 * Actualitza les notes internes d'una comanda.
 * @param {string} orderId - ID de la comanda
 * @param {string} notes - Notes noves
 * @returns {object} { success, message, error? }
 */
async function updateOrderNotes(orderId, notes) {
  if (!orderId) {
    return {
      success: false,
      error: "No s'ha proporcionat l'ID de la comanda"
    };
  }

  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length <= 1) {
    return {
      success: false,
      error: "No hi ha dades a la fulla 'Respostes'"
    };
  }

  const headers = data[0];
  const idItemIndex = headers.findIndex(h => h === "ID_Item");
  const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
  const notesInternesIndex = headers.findIndex(h => h === "Notes_Internes");

  if (idItemIndex === -1 && idPedidoIndex === -1) {
    return {
      success: false,
      error: "No s'han trobat les columnes d'identificador"
    };
  }

  if (notesInternesIndex === -1) {
    return {
      success: false,
      error: "No s'ha trobat la columna 'Notes_Internes'"
    };
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

    return {
      success: true,
      message: "Notes actualitzades correctament"
    };
  } else {
    return {
      success: false,
      error: "No s'ha trobat la comanda amb l'ID proporcionat"
    };
  }
}

/**
 * Actualitza camps individuals d'una comanda (Material, Unitats, Comentaris, Responsable).
 * @param {string} idItem - ID_Item de la comanda
 * @param {object} updates - Camps a actualitzar { material, unitats, comentaris_generals, responsable_preparacio }
 * @returns {object} { success, message, updatedFields?, error? }
 */
async function updateOrderFields(idItem, updates) {
  if (!idItem) {
    return {
      success: false,
      error: "No s'ha proporcionat l'ID de la comanda"
    };
  }

  // Validar que hi hagi almenys un camp a actualitzar
  const allowedFields = ['material', 'unitats', 'comentaris_generals', 'responsable_preparacio'];
  const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));

  if (fieldsToUpdate.length === 0) {
    return {
      success: false,
      error: "No s'ha proporcionat cap camp vàlid per actualitzar"
    };
  }

  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length <= 1) {
    return {
      success: false,
      error: "No hi ha dades a la fulla 'Respostes'"
    };
  }

  const headers = data[0];
  const idItemIndex = headers.findIndex(h => h === "ID_Item");

  if (idItemIndex === -1) {
    return {
      success: false,
      error: "No s'ha trobat la columna 'ID_Item'"
    };
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
      return {
        success: false,
        error: `No s'ha trobat la columna per al camp '${field}'`
      };
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

    return {
      success: true,
      message: "Camps actualitzats correctament",
      updatedFields: fieldsToUpdate
    };
  } else {
    return {
      success: false,
      error: "No s'ha trobat la comanda amb l'ID proporcionat"
    };
  }
}

/**
 * Elimina comandes.
 * @param {string[]} uuids - Array d'IDs a eliminar
 * @returns {object} { success, data?: { deletedCount }, error? }
 */
async function deleteOrders(uuids) {
  if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
    return {
      success: false,
      error: "No s'han proporcionat UUIDs per eliminar"
    };
  }

  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length <= 1) {
    return {
      success: false,
      error: "No hi ha dades per eliminar"
    };
  }

  const headers = data[0];

  // Buscar columnas de ID (priorizar ID_Item que es más específico)
  const idItemIndex = headers.findIndex(h => h === 'ID_Item');
  const idPedidoIndex = headers.findIndex(h => h === 'ID_Pedido');

  if (idItemIndex === -1 && idPedidoIndex === -1) {
    return {
      success: false,
      error: "No s'ha trobat la columna d'identificador (ID_Item o ID_Pedido)"
    };
  }

  // Encontrar filas a eliminar (de abajo hacia arriba)
  // Buscar coincidencias tanto en ID_Item como en ID_Pedido
  const rowsToDelete = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const rowIdItem = idItemIndex !== -1 ? String(data[i][idItemIndex] || '') : '';
    const rowIdPedido = idPedidoIndex !== -1 ? String(data[i][idPedidoIndex] || '') : '';

    // Comprobar si alguno de los UUIDs coincide con ID_Item o ID_Pedido
    const matches = uuids.some(uuid =>
      uuid === rowIdItem || uuid === rowIdPedido ||
      rowIdItem.startsWith(uuid) || rowIdPedido.startsWith(uuid) ||
      uuid.startsWith(rowIdItem) || uuid.startsWith(rowIdPedido)
    );

    if (matches) {
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

  return {
    success: true,
    data: { deletedCount }
  };
}

/**
 * Crea una nova comanda des de l'admin.
 * @param {object} orderData - Dades de la comanda
 * @returns {object} { success, message, uuid?, error? }
 */
async function createOrder(orderData) {
  // Validación básica
  if (!orderData.nomCognoms || !orderData.escola) {
    return {
      success: false,
      error: "Falten dades obligatòries"
    };
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

  return {
    success: true,
    message: 'Comanda creada correctament',
    uuid: uuid
  };
}

/**
 * Obté estadístiques del dashboard amb filtres.
 * @param {object} filters - Filtres opcionals { escola, dateFrom, dateTo }
 * @returns {object} { total, pendents, enProces, preparats, entregats }
 */
async function getStats(filters) {
  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length < 2) {
    return {
      total: 0,
      pendents: 0,
      enProces: 0,
      preparats: 0,
      entregats: 0
    };
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

  return stats;
}

/**
 * Obté comandes preparades per a entrega.
 * @returns {object} { success, data: orders[], error? }
 */
async function getPreparatedOrders() {
  const data = await sheets.getSheetData('Respostes');

  if (!data || data.length < 2) {
    return {
      success: true,
      data: []
    };
  }

  const headers = data[0];
  const estatIndex = headers.findIndex(h => h === 'Estat');

  if (estatIndex === -1) {
    return {
      success: false,
      error: "Columna 'Estat' no trobada"
    };
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

  return {
    success: true,
    data: orders
  };
}

module.exports = {
  getOrders,
  processOrders,
  updateOrderStatus,
  updateOrderNotes,
  updateOrderFields,
  deleteOrders,
  createOrder,
  getStats,
  getPreparatedOrders
};
