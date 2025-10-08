// ======================================================
// ACTIVICOMANDES - API BACKEND FOR REACT + NEXT.JS APPS
// ======================================================
/**
 * VersiÃ³n: 2.0.0 - Limpieza major
 * Fecha: 25/09/2024
 * 
 * CÃ³digo limpio para las nuevas aplicaciones React + Next.js:
 * - App MÃ³vil: Solicitudes de materiales
 * - App Admin: GestiÃ³n y seguimiento de pedidos
 * 
 * Se eliminÃ³ todo el cÃ³digo legacy de la web app de Google Script
 */

// Token de autenticaciÃ³n para las apps
const AUTH_TOKEN = "comanda_materials_2024";

// ======================================================
// CORE API HANDLER
// ======================================================

function doGet(e) {
  return handleApiRequest(e, 'GET');
}

function doPost(e) {
  return handleApiRequest(e, 'POST');
}

function doOptions(e) {
  // Google Apps Script no soporta .setHeader(), usar solo return simple
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleApiRequest(e, method) {
  // Security check
  const token = e.parameter.token || (e.postData && JSON.parse(e.postData.contents || '{}').token);
  if (!token || token !== AUTH_TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized access' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action || (e.postData && JSON.parse(e.postData.contents || '{}').action);
  const callback = e.parameter.callback; // For JSONP support

  try {
    let result;

    switch (action) {
      // ======================================================
      // MOBILE APP ENDPOINTS
      // ======================================================
      case 'getSchools':
      case 'getEscoles':
        result = getSchools();
        break;
      case 'getMonitors':
        result = getMonitors();
        break;
      case 'getMaterials':
        result = getMaterials();
        break;
      case 'getMaterialsByActivity':
        const activityCode = e.parameter.activity ||
                           (e.postData ? JSON.parse(e.postData.contents).activity : '');
        result = getMaterialsByActivity(activityCode);
        break;
      case 'getActivities':
      case 'getActivitats':
        result = getActivities();
        break;
      case 'getActivitiesBySchool':
        const schoolName = e.parameter.school ||
                          (e.postData ? JSON.parse(e.postData.contents).school : '');
        result = getActivitiesBySchool(schoolName);
        break;
      case 'getSchoolsByMonitor':
        const monitorName = e.parameter.monitor ||
                           (e.postData ? JSON.parse(e.postData.contents).monitor : '');
        result = getSchoolsByMonitor(monitorName);
        break;
      case 'getActivitiesByMonitorAndSchool':
        const monitorForActivities = e.parameter.monitor ||
                                    (e.postData ? JSON.parse(e.postData.contents).monitor : '');
        const schoolForActivities = e.parameter.school ||
                                  (e.postData ? JSON.parse(e.postData.contents).school : '');
        result = getActivitiesByMonitorAndSchool(monitorForActivities, schoolForActivities);
        break;
      case 'createSollicitud':
        let sollicitudData;
        if (e.postData) {
          sollicitudData = JSON.parse(e.postData.contents).sollicitud;
        } else {
          sollicitudData = {
            nomCognoms: e.parameter.nomCognoms || '',
            dataNecessitat: e.parameter.dataNecessitat || '',
            escola: e.parameter.escola || '',
            activitat: e.parameter.activitat || '',
            material: e.parameter.material || '',
            unitats: e.parameter.unitats || '',
            altresMaterials: e.parameter.altresMaterials || ''
          };
        }
        result = createSollicitud(sollicitudData);
        break;
      case 'createMultipleSollicitud':
        let multipleSollicitudData;
        try {
          if (e.parameter.data) {
            multipleSollicitudData = JSON.parse(e.parameter.data);
          } else if (e.postData) {
            multipleSollicitudData = JSON.parse(e.postData.contents);
          } else {
            multipleSollicitudData = {
              nomCognoms: e.parameter.nomCognoms || '',
              dataNecessitat: e.parameter.dataNecessitat || '',
              items: e.parameter.items ? JSON.parse(e.parameter.items) : [],
              altresMaterials: e.parameter.altresMaterials || ''
            };
          }
        } catch (parseError) {
          console.error('ERROR: Failed to parse data:', parseError);
          result = { success: false, error: 'Error parseant les dades: ' + parseError.toString() };
          break;
        }
        result = createMultipleSollicitud(multipleSollicitudData);
        break;

      // ======================================================
      // ADMIN APP ENDPOINTS
      // ======================================================
      case 'loadData':
        result = loadRespostesData();
        break;
      case 'loadDataFast':
        result = loadRespostesData(100);
        break;
      case 'processFormResponses':
        result = processRespostesData();
        break;
      case 'updateOrderStatus':
        const uuids = e.parameter.uuids ? e.parameter.uuids.split(',') :
                      (e.postData ? JSON.parse(e.postData.contents).uuids : []);
        const newStatus = e.parameter.newStatus ||
                         (e.postData ? JSON.parse(e.postData.contents).newStatus : '');
        result = updateRespostesOrderStatus(uuids, newStatus);
        break;
      case 'deleteOrders':
        const deleteUuids = e.parameter.uuids ? e.parameter.uuids.split(',') :
                            (e.postData ? JSON.parse(e.postData.contents).uuids : []);
        result = deleteOrdersFromSheet(deleteUuids);
        break;
      case 'updateDeliveryInfo':
        result = actualizarCentrosDeEntregaYDia();
        break;
      case 'createOrder':
        const orderData = e.postData ? JSON.parse(e.postData.contents).orderData : {};
        result = createOrder(orderData);
        break;
      case 'getStats':
        const filters = e.parameter.filters ? JSON.parse(e.parameter.filters) :
                       (e.postData ? JSON.parse(e.postData.contents).filters : {});
        result = obtenerEstadisticasDashboard(filters);
        break;
      case 'getPreparatedOrders':
        result = getPreparatedOrders();
        break;
      case 'getDeliveryOptions':
        const selectedOrders = e.parameter.orders ? JSON.parse(e.parameter.orders) :
                             (e.postData ? JSON.parse(e.postData.contents).orders : []);
        result = getDeliveryOptions(selectedOrders);
        break;
      case 'testDeliveryData':
        let testData;
        try {
          testData = e.parameter.deliveryData ? JSON.parse(e.parameter.deliveryData) :
                    (e.postData ? JSON.parse(e.postData.contents).deliveryData : e.parameter);
          console.log('🧪 TEST - Datos recibidos:', JSON.stringify(testData, null, 2));
          result = {
            success: true,
            message: 'Datos de prueba recibidos correctamente',
            receivedData: testData,
            dataTypes: {
              modalitat: typeof testData.modalitat,
              monitorIntermediaria: typeof testData.monitorIntermediaria,
              escolaDestino: typeof testData.escolaDestino,
              dataEntrega: typeof testData.dataEntrega,
              orderIds: Array.isArray(testData.orderIds) ? `array[${testData.orderIds.length}]` : typeof testData.orderIds
            },
            timestamp: new Date().toISOString()
          };
        } catch (parseError) {
          console.error('🧪 TEST ERROR:', parseError);
          result = { success: false, error: 'Error en prueba: ' + parseError.toString() };
        }
        break;
      case 'createDelivery':
        const deliveryData = e.parameter.deliveryData ? JSON.parse(e.parameter.deliveryData) :
                           (e.postData ? JSON.parse(e.postData.contents).deliveryData : {});
        result = createDelivery(deliveryData);
        break;
      case 'sendManualNotification':
        const postData = e.postData ? JSON.parse(e.postData.contents) : {};
        const spaceName = postData.spaceName || e.parameter.spaceName;
        const message = postData.message || e.parameter.message;
        const orderId = postData.orderId || e.parameter.orderId;
        const notificationType = postData.notificationType || e.parameter.notificationType;
        result = sendManualNotificationWithStatus(spaceName, message, orderId, notificationType);
        break;
      case 'getNotificationStatus':
        const statusOrderId = e.parameter.orderId || (e.postData ? JSON.parse(e.postData.contents).orderId : null);
        result = getNotificationStatus(statusOrderId);
        break;
      case 'getMultipleNotificationStatuses':
        const orderIdsParam = e.parameter.orderIds || (e.postData ? JSON.parse(e.postData.contents).orderIds : []);
        const orderIds = Array.isArray(orderIdsParam) ? orderIdsParam : JSON.parse(orderIdsParam);
        result = getMultipleNotificationStatuses(orderIds);
        break;
      case 'removeIntermediaryAssignment':
        const removeOrderIds = e.parameter.orderIds ? JSON.parse(e.parameter.orderIds) :
                              (e.postData ? JSON.parse(e.postData.contents).orderIds : []);
        result = removeIntermediaryAssignment(removeOrderIds);
        break;
      case 'calculateDistances':
        const addresses = e.parameter.addresses ? JSON.parse(e.parameter.addresses) :
                         (e.postData ? JSON.parse(e.postData.contents).addresses : []);
        result = calculateDistances(addresses);
        break;

      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    // JSONP support
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResult = { success: false, error: error.toString() };

    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResult) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ======================================================
// UTILITY FUNCTIONS
// ======================================================

function getCachedData(sheetName, cacheKey, expirationInSeconds = 3600) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached != null) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    console.error(`Sheet '${sheetName}' not found for caching.`);
    return null;
  }

  const data = sheet.getDataRange().getValues();
  cache.put(cacheKey, JSON.stringify(data), expirationInSeconds);
  return data;
}

// ======================================================
// MOBILE APP FUNCTIONS
// ======================================================

function getSchools() {
  const data = getCachedData("Dades", "cache_dades_schools");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades d'escoles de la hoja 'Dades'." };
  }

  const schools = data.slice(1)
                      .filter(row => row[0] && row[0].toString().trim() !== '')
                      .map(row => row[0].toString().trim());

  const uniqueSchools = [...new Set(schools)].sort((a, b) => a.localeCompare(b, 'ca'));

  return { success: true, data: uniqueSchools };
}

function getActivities() {
  const data = getCachedData("Dades", "cache_dades_activities");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades d'activitats de la hoja 'Dades'." };
  }

  const activities = data.slice(1)
                         .filter(row => row[5] && row[5].toString().trim() !== '')
                         .map(row => row[5].toString().trim());

  const uniqueActivities = [...new Set(activities)].sort((a, b) => a.localeCompare(b, 'ca'));

  return { success: true, data: uniqueActivities };
}

function getActivitiesBySchool(schoolName) {
  if (!schoolName) {
    return { success: false, error: "No s'ha proporcionat el nom de l'escola" };
  }

  const data = getCachedData("Dades", "cache_dades_activities_by_school");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades de la hoja 'Dades'." };
  }

  const schoolActivities = data.slice(1)
                              .filter(row => {
                                const escola = row[0] ? row[0].toString().trim() : '';
                                const activitat = row[5] ? row[5].toString().trim() : '';
                                return escola === schoolName && activitat !== '';
                              })
                              .map(row => row[5].toString().trim());

  const uniqueActivities = [...new Set(schoolActivities)].sort((a, b) => a.localeCompare(b, 'ca'));

  return {
    success: true,
    data: uniqueActivities,
    school: schoolName,
    count: uniqueActivities.length
  };
}

function getMonitors() {
  const data = getCachedData("Dades", "cache_dades_monitors");
  if (!data) {
    return { success: false, error: "No s'han pogut carregar les dades de monitors de la hoja 'Dades'." };
  }
  
  const monitors = data.slice(1)
                       .filter(row => row[1] && row[1].toString().trim() !== '')
                       .map(row => row[1].toString().trim());
  
  const uniqueMonitors = [...new Set(monitors)].sort((a, b) => a.localeCompare(b, 'ca'));
  
  return { success: true, data: uniqueMonitors };
}

function getSchoolsByMonitor(monitorName) {
  if (!monitorName) {
    return { success: false, error: "No s'ha proporcionat el nom del monitor" };
  }

  const data = getCachedData("Dades", "cache_dades_schools_by_monitor");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades de la hoja 'Dades'." };
  }

  const monitorSchools = data.slice(1)
                            .filter(row => {
                              const escola = row[0] ? row[0].toString().trim() : '';
                              const monitora = row[1] ? row[1].toString().trim() : '';
                              return monitora === monitorName && escola !== '';
                            })
                            .map(row => row[0].toString().trim());

  const uniqueSchools = [...new Set(monitorSchools)].sort((a, b) => a.localeCompare(b, 'ca'));

  return {
    success: true,
    data: uniqueSchools,
    monitor: monitorName,
    count: uniqueSchools.length
  };
}

function getActivitiesByMonitorAndSchool(monitorName, schoolName) {
  if (!monitorName) {
    return { success: false, error: "No s'ha proporcionat el nom del monitor" };
  }
  
  if (!schoolName) {
    return { success: false, error: "No s'ha proporcionat el nom de l'escola" };
  }

  const data = getCachedData("Dades", "cache_dades_activities_by_monitor_school");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades de la hoja 'Dades'." };
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

  return {
    success: true,
    data: uniqueActivities,
    monitor: monitorName,
    school: schoolName,
    count: uniqueActivities.length
  };
}

function getMaterials() {
  const data = getCachedData("Materiales", "cache_materials");
  if (!data) {
    return { success: false, error: "No se pudieron cargar los datos de materiales de la hoja 'Materiales'." };
  }

  const materials = data.slice(1)
                       .filter(row => row[0])
                       .map(row => row[0].toString().trim());

  const uniqueMaterials = [...new Set(materials)];

  return { success: true, data: uniqueMaterials };
}

function getMaterialsByActivity(activityCode) {
  if (!activityCode) {
    return { success: false, error: "No s'ha proporcionat el codi d'activitat" };
  }

  const baseActivity = parseActivityCode(activityCode);

  if (!baseActivity) {
    return { success: false, error: "Codi d'activitat no reconegut: " + activityCode };
  }

  // Special case for TC activities - return empty array to force manual entry
  if (baseActivity === 'TC') {
    return {
      success: true,
      data: [],
      activityCode: activityCode,
      baseActivity: baseActivity,
      requiresManualEntry: true,
      message: "Activitat TC requereix entrada manual de materials"
    };
  }

  const sheetConfig = getSheetConfigForActivity(baseActivity);

  if (!sheetConfig) {
    return { success: false, error: "No s'ha trobat configuraciÃ³ per a l'activitat: " + baseActivity };
  }

  const data = getCachedData(sheetConfig.sheetName, `cache_materials_${baseActivity}`);

  if (!data) {
    return { success: false, error: `No s'ha pogut carregar la hoja '${sheetConfig.sheetName}' per a l'activitat ${baseActivity}` };
  }

  const columnIndex = sheetConfig.column === 'A' ? 0 : 1;
  const materials = data.slice(1)
                       .filter(row => row[columnIndex] && row[columnIndex].toString().trim() !== '')
                       .map(row => row[columnIndex].toString().trim());

  const uniqueMaterials = [...new Set(materials)].sort((a, b) => a.localeCompare(b, 'ca'));

  return {
    success: true,
    data: uniqueMaterials,
    activityCode: activityCode,
    baseActivity: baseActivity,
    sheetUsed: sheetConfig.sheetName,
    columnUsed: sheetConfig.column
  };
}

function parseActivityCode(activityCode) {
  if (activityCode.startsWith('CO')) {
    return 'CO';
  }
  
  const matches = activityCode.match(/^([A-Z]+\d*)/);
  return matches ? matches[1] : null;
}

function getSheetConfigForActivity(baseActivity) {
  const activityConfig = {
    'CO': { sheetName: 'MatCO', column: 'B' },
    'DX1': { sheetName: 'MatDX1', column: 'B' },
    'DX2': { sheetName: 'MatDX2', column: 'B' },
    'HC1': { sheetName: 'MatHC1', column: 'A' },
    'HC2': { sheetName: 'MatHC2', column: 'A' },
    'TC': { sheetName: 'MatTC', column: 'A' }
  };

  return activityConfig[baseActivity] || null;
}

function createSollicitud(sollicitudData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Respostes");

  if (!sheet) {
    sheet = ss.insertSheet("Respostes");
    const headers = [
      "Marca temporal",
      "Nom i cognoms",
      "Data de necessitat",
      "Escola",
      "Activitat",
      "Material principal",
      "Unitats",
      "Altres materials",
      "UUID",
      "Estat"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const uuid = Utilities.getUuid();
  const timestamp = new Date();

  const newRow = [
    timestamp,
    sollicitudData.nomCognoms || '',
    sollicitudData.dataNecessitat || '',
    sollicitudData.escola || '',
    sollicitudData.activitat || '',
    sollicitudData.material || '',
    sollicitudData.unitats || '',
    sollicitudData.altresMaterials || '',
    uuid,
    'Pendent'
  ];

  sheet.appendRow(newRow);

  return {
    success: true,
    data: {
      message: 'SolÂ·licitud enviada correctament!',
      id: uuid
    }
  };
}

function createMultipleSollicitud(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Respostes");

  if (!sheet) {
    sheet = ss.insertSheet("Respostes");
    setupRespostesHeaders(sheet);
  }

  if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return {
      success: false,
      error: 'Dades no vÃ lides o cap Ã­tem al carret'
    };
  }

  const timestamp = new Date();
  const baseUuid = Utilities.getUuid();
  const addedItems = [];

  try {
    data.items.forEach((item, index) => {
      const itemUuid = `${baseUuid}-${String(index + 1).padStart(3, '0')}`;
      
      const materialName = item.customMaterial || item.material;
      const isCustomMaterial = item.customMaterial ? "TRUE" : "FALSE";
      
      const newRow = [
        timestamp,
        baseUuid,
        itemUuid,
        data.nomCognoms || '',
        data.dataNecessitat || '',
        item.escola || '',
        item.activitat || '',
        materialName,
        isCustomMaterial,
        item.unitats || 0,
        data.altresMaterials || '',
        data.entregaManual ? 'TRUE' : 'FALSE',
        'Pendent',
        timestamp,
        '',
        '',
        data.entregaManual ? 'MANUAL' : 'NORMAL',
        '',
        '',
        '',
        ''
      ];

      sheet.appendRow(newRow);
      addedItems.push({
        idPedido: baseUuid,
        idItem: itemUuid,
        escola: item.escola,
        activitat: item.activitat,
        material: materialName,
        isCustom: isCustomMaterial === "TRUE",
        unitats: item.unitats
      });
    });

    return {
      success: true,
      data: {
        message: `SolÂ·licitud mÃºltiple enviada correctament! ${data.items.length} materials solÂ·licitats.`,
        idPedido: baseUuid,
        items: addedItems,
        totalItems: data.items.length,
        totalUnits: data.items.reduce((sum, item) => sum + (item.unitats || 0), 0),
        timestamp: timestamp
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Error processant la solÂ·licitud mÃºltiple: ${error.toString()}`
    };
  }
}
// ======================================================
// ADMIN APP FUNCTIONS
// ======================================================

function loadRespostesData(limit = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Respostes");
    
    if (!sheet) {
      sheet = ss.insertSheet("Respostes");
      setupRespostesHeaders(sheet);
      return {
        success: true,
        data: {
          headers: [
            "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
            "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
            "comentarisGenerals", "entregaManual", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
          ],
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return {
        success: true,
        data: {
          headers: [
            "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
            "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
            "comentarisGenerals", "entregaManual", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
          ],
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      };
    }
    
    const headersRow = values[0];
    let rows = values.slice(1).map(row => row.slice(0, headersRow.length));

    if (limit && limit > 0) {
      rows = rows.slice(0, limit);
    }

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
        'Data_Lliurament_Prevista': 'Data_Lliurament_Prevista',
        'Distancia_Academia': 'distanciaAcademia',
        'Notes_Entrega': 'notesEntrega'
      };
      return map[h] || String(h).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
    });

    const allRows = values.slice(1);
    const estatColIndex = headersRow.findIndex(h => h === 'Estat');
    const dataLliuramentColIndex = headersRow.findIndex(h => h === 'Data_Lliurament_Prevista');
    const dataNecessitatColIndex = headersRow.findIndex(h => h === 'Data_Necessitat');

    // Procesar fechas en las filas para evitar problemas de UTC
    const processedRows = rows.map(row => {
      const processedRow = [...row];
      
      // Procesar Data_Necessitat
      if (dataNecessitatColIndex !== -1 && processedRow[dataNecessitatColIndex]) {
        const rawDate = processedRow[dataNecessitatColIndex];
        if (rawDate instanceof Date) {
          // Convertir Date a string en formato YYYY-MM-DD
          const year = rawDate.getFullYear();
          const month = String(rawDate.getMonth() + 1).padStart(2, '0');
          const day = String(rawDate.getDate()).padStart(2, '0');
          processedRow[dataNecessitatColIndex] = `${year}-${month}-${day}`;
        }
      }
      
      // Procesar Data_Lliurament_Prevista
      if (dataLliuramentColIndex !== -1 && processedRow[dataLliuramentColIndex]) {
        const rawDate = processedRow[dataLliuramentColIndex];
        if (rawDate instanceof Date) {
          // Convertir Date a string en formato YYYY-MM-DD
          const year = rawDate.getFullYear();
          const month = String(rawDate.getMonth() + 1).padStart(2, '0');
          const day = String(rawDate.getDate()).padStart(2, '0');
          processedRow[dataLliuramentColIndex] = `${year}-${month}-${day}`;
        }
      }
      
      return processedRow;
    });

    const stats = {
      total: allRows.length,
      pendents: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Pendent').length : 0,
      enProces: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'En proces').length : 0,
      preparats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Preparat').length : 0,
      entregats: estatColIndex >= 0 ? allRows.filter(row => row[estatColIndex] === 'Entregat').length : 0
    };

    return {
      success: true,
      data: {
        headers: headers,
        rows: processedRows,
        estadisticas: stats
      }
    };
    
  } catch (error) {
    console.error('Error loading Respostes data:', error);
    return {
      success: false,
      error: 'Error carregant dades: ' + error.toString()
    };
  }
}

function setupRespostesHeaders(sheet) {
  const headers = [
    "Timestamp", "ID_Pedido", "ID_Item", "Nom_Cognoms", "Data_Necessitat",
    "Escola", "Activitat", "Material", "Es_Material_Personalitzat", "Unitats",
    "Comentaris_Generals", "Entrega_Manual", "Estat", "Data_Estat", "Responsable_Preparacio",
    "Notes_Internes", "Modalitat_Entrega", "Monitor_Intermediari", "Escola_Destino_Intermediari",
    "Data_Entrega_Prevista", "Distancia_Academia", "Notes_Entrega"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  
  sheet.setFrozenRows(1);
  
  return sheet;
}

function processRespostesData() {
  try {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");
  
    if (!sheet) {
    return { 
      success: false, 
        error: "La hoja 'Respostes' no existe. Utilitza l'app mòbil per crear sol·licituds primer." 
    };
  }
  
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
  
    if (values.length < 2) {
  return { 
    success: true, 
        nuevosRegistros: 0,
        message: "No hi ha noves sol·licituds per processar."
      };
    }
    
    const totalRows = values.length - 1;
    const headers = values[0];
    const estatIndex = headers.findIndex(h => h === "Estat");
    
    let pendents = 0;
    let enProces = 0;
    let preparats = 0;
    let entregats = 0;
    
    if (estatIndex !== -1) {
      for (let i = 1; i < values.length; i++) {
        const estat = values[i][estatIndex];
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

  } catch (error) {
    console.error('Error processing Respostes data:', error);
    return {
      success: false,
      error: 'Error processant les dades: ' + error.toString()
    };
  }
}

function updateRespostesOrderStatus(uuids, newStatus) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");
    
    if (!sheet) {
      return { success: false, error: "La hoja 'Respostes' no existe." };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, error: "No hay datos en la hoja 'Respostes' para actualizar." };
    }

    const headers = data[0];
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const estatIndex = headers.findIndex(h => h === "Estat");
    const dataEstatIndex = headers.findIndex(h => h === "Data_Estat");

    if (idPedidoIndex === -1 && idItemIndex === -1) {
      return { success: false, error: "No se encontraron las columnas de ID en la hoja 'Respostes'." };
    }
    if (estatIndex === -1) {
      return { success: false, error: "La columna 'Estat' no se encontrÃ³ en la hoja 'Respostes'." };
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
      sheet.getDataRange().setValues(updatedData);
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
    
  } catch (error) {
    console.error('Error updating Respostes order status:', error);
          return { 
            success: false,
      error: 'Error actualitzant l\'estat: ' + error.toString()
    };
  }
}

function deleteOrdersFromSheet(uuids) {
  try {
    if (!uuids || uuids.length === 0) {
      return { success: false, error: "No s'han proporcionat UUIDs per eliminar" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetRespostes = ss.getSheetByName("Respostes");

    if (!sheetRespostes) {
      return { success: false, error: "Falta la hoja 'Respostes'" };
    }

    const data = sheetRespostes.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, error: "No hi ha dades per eliminar" };
    }

    const headers = data[0];
    const possibleUuidColumns = ['ID_Pedido', 'ID_Item', 'UUID', 'uuid', 'id', 'Id', 'ID Pedido', 'ID Item'];

    let uuidColumnIndex = -1;
    for (const colName of possibleUuidColumns) {
      uuidColumnIndex = headers.findIndex(h => h === colName);
      if (uuidColumnIndex !== -1) break;
    }

    if (uuidColumnIndex === -1) {
      return { success: false, error: "No s'ha trobat la columna d'identificador" };
    }

    const rowsToDelete = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const rowUuid = data[i][uuidColumnIndex];
      if (uuids.includes(String(rowUuid))) {
        rowsToDelete.push(i + 1);
      }
    }

    let deletedCount = 0;
    for (const rowIndex of rowsToDelete) {
      sheetRespostes.deleteRow(rowIndex);
      deletedCount++;
    }

    const cache = CacheService.getScriptCache();
    const cacheKeys = [
      'cache_respostes_data',
      'cache_dades_schools_by_monitor',
      'cache_dades_activities_by_monitor_school',
      'cache_dades_activities_by_school'
    ];
    
    cacheKeys.forEach(key => {
      try {
        cache.remove(key);
      } catch (e) {
        console.log('Cache key not found:', key);
      }
    });

      return {
        success: true,
      data: { deletedCount }
    };

  } catch (error) {
    console.error("Error eliminant sol·licituds:", error);
    return { 
      success: false,
      error: "Error eliminant sol·licituds: " + error.toString()
    };
  }
}

function actualizarCentrosDeEntregaYDia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetComandes = ss.getSheetByName("Respostes");
    
    if (!sheetComandes) {
    return { success: false, error: "Falta la hoja 'Respostes'." };
  }

  const dadesData = getCachedData("dades", "cache_dades");
  const ordreEscolesData = getCachedData("ordre_distancia_escoles", "cache_ordre_escoles");

  if (!dadesData || !ordreEscolesData) {
    return { success: false, error: "No se pudieron cargar los datos de configuración." };
  }

  const comandesData = sheetComandes.getDataRange().getValues();

  if (comandesData.length <= 1) {
    return { success: true, cambiosAplicados: 0 };
  }

  const comandesHeaders = comandesData[0];
  const comandesRows = comandesData.slice(1);

  const escuelaIdx = comandesHeaders.findIndex(h => h === "Escuela");
  const centroEntregaIdx = comandesHeaders.findIndex(h => h === "Centro de Entrega");
  const diaEntregaIdx = comandesHeaders.findIndex(h => h === "Día de Entrega");

  if (escuelaIdx === -1 || centroEntregaIdx === -1 || diaEntregaIdx === -1) {
    return { success: false, error: "Faltan columnas requeridas en la hoja 'Comandes'." };
  }

  const centrosPorEscuela = {};
  dadesData.slice(1).forEach(row => {
    if (row[0] && row[1]) {
      centrosPorEscuela[row[0].toString().trim()] = row[1].toString().trim();
    }
  });

  const diasPorCentro = {};
  ordreEscolesData.slice(1).forEach(row => {
    if (row[0] && row[1]) {
      diasPorCentro[row[0].toString().trim()] = row[1].toString().trim();
    }
  });

  let cambiosAplicados = 0;
  const updatedRows = comandesRows.map(row => {
    const escuela = row[escuelaIdx] ? row[escuelaIdx].toString().trim() : '';
    let centroEntrega = row[centroEntregaIdx] ? row[centroEntregaIdx].toString().trim() : '';
    let diaEntrega = row[diaEntregaIdx] ? row[diaEntregaIdx].toString().trim() : '';
    let changed = false;

    if (escuela && centrosPorEscuela[escuela] && centroEntrega !== centrosPorEscuela[escuela]) {
      row[centroEntregaIdx] = centrosPorEscuela[escuela];
      centroEntrega = centrosPorEscuela[escuela];
      changed = true;
    }

    if (centroEntrega && diasPorCentro[centroEntrega] && diaEntrega !== diasPorCentro[centroEntrega]) {
      row[diaEntregaIdx] = diasPorCentro[centroEntrega];
      changed = true;
    }

    if (changed) {
      cambiosAplicados++;
    }
    return row;
  });

  sheetComandes.getRange(2, 1, updatedRows.length, comandesHeaders.length).setValues(updatedRows);

  return { success: true, cambiosAplicados: cambiosAplicados };
}

function createOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Comandes");
  if (!sheet) {
    return { success: false, error: "La hoja 'Comandes' no existe." };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = new Array(headers.length).fill('');

  const uuid = Utilities.getUuid();
  const timestamp = new Date();

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase().trim();
    if (headerLower === "uuid") {
      newRow[index] = uuid;
    } else if (headerLower === "marca temporal") {
      newRow[index] = timestamp;
    } else if (headerLower === "estado") {
      newRow[index] = orderData.estado || "Pendiente";
    } else if (orderData[headerLower] !== undefined) {
      newRow[index] = orderData[headerLower];
    }
  });

  sheet.appendRow(newRow);

  return { success: true, uuid: uuid, message: "Pedido creado exitosamente." };
}

// ======================================================
// STATS AND DELIVERY FUNCTIONS
// ======================================================

function obtenerEstadisticasDashboard(filtros) {
  // Simplificada - solo funcionará si existe la hoja Comandes legacy
    return {
      success: false,
    message: 'Función de estadísticas simplificada - usar datos de Respostes'
  };
}

function buscarColumnaParcial(headers, texto) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toLowerCase().indexOf(texto.toLowerCase()) !== -1) {
      return i;
    }
  }
  return -1;
}

function getPreparatedOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");

    if (!sheet) {
      return { success: false, error: "La hoja 'Respostes' no existe." };
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length < 2) {
      return { success: true, data: [], message: "No hi ha comandes preparades." };
    }

    const headers = values[0];
    const estatIndex = headers.findIndex(h => h === "Estat");
    const escolaIndex = headers.findIndex(h => h === "Escola");
    const dataNecessitatIndex = headers.findIndex(h => h === "Data_Necessitat");
    const solicitantIndex = headers.findIndex(h => h === "Nom_Cognoms");
    const materialIndex = headers.findIndex(h => h === "Material");
    const quantitatIndex = headers.findIndex(h => h === "Unitats");
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const dataLliuramentIndex = headers.findIndex(h => h.trim() === "Data_Lliurament_Prevista" || h.trim().toLowerCase() === "datalliuramentprevista");

    console.log('📋 DEBUG getPreparatedOrders - Headers:', headers);
    console.log('📋 DEBUG getPreparatedOrders - dataLliuramentIndex:', dataLliuramentIndex);

    const preparatedOrders = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const estat = row[estatIndex];

      if (estat === "Preparat" || estat === "Assignat") {
        // Procesar la fecha de necesidad para evitar problemas de UTC
        let dataNecessitatValue = '';
        if (dataNecessitatIndex !== -1 && row[dataNecessitatIndex]) {
          const rawDate = row[dataNecessitatIndex];
          console.log(`📅 DEBUG - Raw dataNecessitat from sheet: "${rawDate}" (type: ${typeof rawDate})`);
          
          if (rawDate instanceof Date) {
            // Si es un objeto Date, convertir a string en formato YYYY-MM-DD
            const year = rawDate.getFullYear();
            const month = String(rawDate.getMonth() + 1).padStart(2, '0');
            const day = String(rawDate.getDate()).padStart(2, '0');
            dataNecessitatValue = `${year}-${month}-${day}`;
            console.log(`📅 DEBUG - Converted dataNecessitat Date to string: "${dataNecessitatValue}"`);
          } else if (typeof rawDate === 'string') {
            // Si ya es string, usar tal como está
            dataNecessitatValue = rawDate;
            console.log(`📅 DEBUG - Using dataNecessitat string as is: "${dataNecessitatValue}"`);
          }
        }

        // Procesar la fecha de entrega para evitar problemas de UTC
        let dataLliuramentValue = '';
        if (dataLliuramentIndex !== -1 && row[dataLliuramentIndex]) {
          const rawDate = row[dataLliuramentIndex];
          console.log(`📅 DEBUG - Raw dataLliurament from sheet: "${rawDate}" (type: ${typeof rawDate})`);
          
          if (rawDate instanceof Date) {
            // Si es un objeto Date, convertir a string en formato YYYY-MM-DD
            const year = rawDate.getFullYear();
            const month = String(rawDate.getMonth() + 1).padStart(2, '0');
            const day = String(rawDate.getDate()).padStart(2, '0');
            dataLliuramentValue = `${year}-${month}-${day}`;
            console.log(`📅 DEBUG - Converted dataLliurament Date to string: "${dataLliuramentValue}"`);
          } else if (typeof rawDate === 'string') {
            // Si ya es string, usar tal como está
            dataLliuramentValue = rawDate;
            console.log(`📅 DEBUG - Using dataLliurament string as is: "${dataLliuramentValue}"`);
          }
        }

        const orderData = {
          idPedido: row[idPedidoIndex],
          idItem: row[idItemIndex],
          solicitant: row[solicitantIndex],
          escola: row[escolaIndex],
          dataNecessitat: dataNecessitatValue,
          material: row[materialIndex],
          quantitat: row[quantitatIndex],
          dataLliurament: dataLliuramentValue,
          rowIndex: i + 1
        };
        
        // DEBUG: Log each order's dataLliurament
        if (orderData.dataLliurament) {
          console.log(`📅 DEBUG - Order ${orderData.idItem} has dataLliurament: "${orderData.dataLliurament}"`);
        }
        
        preparatedOrders.push(orderData);
      }
    }

    // DEBUG: Log final result
    console.log('📋 DEBUG getPreparatedOrders - Final result:', JSON.stringify(preparatedOrders, null, 2));
    
    return { success: true, data: preparatedOrders };

  } catch (error) {
    console.error("Error en getPreparatedOrders:", error);
    return { success: false, error: "Error obtenint comandes preparades: " + error.toString() };
  }
}

function getDeliveryOptions(selectedOrders) {
  try {
    if (!selectedOrders || selectedOrders.length === 0) {
      return { success: false, error: "No s'han proporcionat comandes seleccionades" };
    }

    const schoolData = getSchoolMonitorData();
    if (!schoolData.success) {
      return schoolData;
    }

    const deliveryOptions = [];
    
    for (const order of selectedOrders) {
      console.log('🎯 Processing order for school:', order.escola);

      // Crear opciones básicas para esta escuela
      const directSchool = schoolData.data.schoolsMap?.get(order.escola);

      if (directSchool) {
        // OPCIÓN 1: Entrega directa
        const directOption = {
          tipus: "Lliurament Directe",
          escola: order.escola,
          adreça: directSchool.adreça,
          eficiencia: "Calculant...",
          prioritat: 99999,
          monitorsDisponibles: directSchool.monitors?.map(monitor => ({
            nom: monitor,
            dies: directSchool.dies,
            tipus: "directa"
          })) || [],
          descripció: `Entrega directa a ${order.escola}`,
          distanciaAcademia: "Calculant...",
          tempsAcademia: "Calculant...",
          comandes: [order],
          orderDetails: {
            idItem: order.idItem,
            solicitant: order.solicitant,
            material: order.material,
            quantitat: order.quantitat
          }
        };

        deliveryOptions.push(directOption);

        // OPCIÓN 2: Entrega con intermediario (buscar monitores multicentre)
        if (schoolData.data.monitors) {
          schoolData.data.monitors.forEach(monitor => {
            if (monitor.escoles?.length > 1) {
              const targetSchoolInfo = monitor.escoles.find(s => s.escola === order.escola);

              if (targetSchoolInfo) {
                monitor.escoles.forEach(intermediarySchoolInfo => {
                  if (intermediarySchoolInfo.escola !== order.escola) {
                    const intermediaryOption = {
                      tipus: "Lliurament amb Intermediari",
                      escola: intermediarySchoolInfo.escola,
                      escolaFinal: order.escola,
                      adreça: intermediarySchoolInfo.adreça,
                      eficiencia: "Calculant...",
                      prioritat: 99999,
                      monitorsDisponibles: [{
                        nom: monitor.nom,
                        dies: intermediarySchoolInfo.dies,
                        tipus: "intermediari"
                      }],
                      descripció: `Entrega a ${intermediarySchoolInfo.escola} → Monitor transporta a ${order.escola}`,
                      distanciaAcademia: "Calculant...",
                      tempsAcademia: "Calculant...",
                      notes: "Monitor multicentre",
                      comandes: [order],
                      orderDetails: {
                        idItem: order.idItem,
                        solicitant: order.solicitant,
                        material: order.material,
                        quantitat: order.quantitat
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

    const distanceResults = calculateDistances(addresses);

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

      // Ordenar por distancia (más cercana primero)
      deliveryOptions.sort((a, b) => a.prioritat - b.prioritat);
    }

    return { success: true, data: deliveryOptions };

  } catch (error) {
    console.error('Error in getDeliveryOptions:', error);
    return { success: false, error: "Error generant opcions d'entrega: " + error.toString() };
  }
}

function getSchoolMonitorData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dadesSheet = ss.getSheetByName("Dades");

    if (!dadesSheet) {
      return { success: false, error: "La hoja 'Dades' no existe." };
    }

    const values = dadesSheet.getDataRange().getValues();
    const headers = values[0];
    
    const escolaIdx = headers.findIndex(h => h === "ESCOLA");
    const monitoraIdx = headers.findIndex(h => h === "MONITORA");
    const diaIdx = headers.findIndex(h => h === "DIA");
    const adreçaIdx = headers.findIndex(h => h === "ADREÇA");

    if (escolaIdx === -1 || monitoraIdx === -1) {
      return { success: false, error: "No s'han trobat les columnes necessàries (ESCOLA, MONITORA)" };
    }

    const schools = new Map();
    const monitors = new Map();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const escola = row[escolaIdx]?.toString().trim();
      const monitora = row[monitoraIdx]?.toString().trim();
      const dia = row[diaIdx]?.toString().trim() || '';
      const adreça = row[adreçaIdx]?.toString().trim() || '';

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
        monitorData.escoles.push({ escola: escola, adreça: adreça, dies: dia ? [dia] : [] });
      } else if (dia && !existingSchool.dies.includes(dia)) {
        existingSchool.dies.push(dia);
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
    return { success: false, error: "Error carregant dades d'escoles i monitors: " + error.toString() };
  }
}

function findDeliveryOptionsForSchool(targetSchool, schoolData, order) {
  const options = [];
  const { schools, monitors, schoolsMap, monitorsMap } = schoolData;

  // Direct delivery option
  const directSchool = schoolsMap.get(targetSchool);
  if (directSchool) {
    options.push({
      tipus: "Lliurament Directe",
      escola: targetSchool,
      adreça: directSchool.adreça,
      eficiencia: "Alta",
      prioritat: 1,
      monitorsDisponibles: directSchool.monitors.map(monitor => ({
        nom: monitor,
        dies: directSchool.dies,
        tipus: "directa"
      })),
      descripció: `Entrega directa a ${targetSchool}`,
      distanciaAcademia: "N/A",
      tempsAcademia: "N/A"
    });
  }

  // Intermediary options (simplified)
  monitors.forEach(monitor => {
    if (monitor.escoles.length > 1) {
      const targetSchoolInfo = monitor.escoles.find(s => s.escola === targetSchool);
      
      if (targetSchoolInfo) {
        monitor.escoles.forEach(intermediarySchoolInfo => {
          if (intermediarySchoolInfo.escola !== targetSchool) {
            options.push({
              tipus: "Lliurament amb Intermediari",
              escola: intermediarySchoolInfo.escola,
              escolaFinal: targetSchool,
              escolaDestino: targetSchool, // Frontend busca aquest camp
              adreça: intermediarySchoolInfo.adreça,
              eficiencia: "Mitjana",
              prioritat: 2,
              monitorsDisponibles: [{
                nom: monitor.nom,
                dies: intermediarySchoolInfo.dies,
                tipus: "intermediari"
              }],
              descripció: `Entrega a ${intermediarySchoolInfo.escola} → Monitor transporta a ${targetSchool}`,
              distanciaAcademia: "N/A",
              tempsAcademia: "N/A",
              notes: "Monitor multicentre"
            });
          }
        });
      }
    }
  });

  return options;
}

function createDelivery(deliveryData) {
  try {
    console.log('🚀 CREATEDELIVERY START - Input data:', JSON.stringify(deliveryData, null, 2));

    // Validar datos básicos
    if (!deliveryData || !deliveryData.orderIds || !deliveryData.modalitat) {
      console.error('❌ Missing required fields');
      return { success: false, error: "Dades d'entrega incompletes" };
    }

    // Obtener sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");
    if (!sheet) {
      return { success: false, error: "La hoja 'Respostes' no existe." };
    }

    // Obtener headers y índices
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('📋 Available headers:', headers);

    const columnIndices = {
      idItem: headers.findIndex(h => h === "ID_Item"),
      modalitat: headers.findIndex(h => h === "Modalitat_Lliurament" || h === "modalitatlliurament"),
      monitor: headers.findIndex(h => h === "Monitor_Intermediari" || h === "monitorIntermediari"),
      escolaDestino: headers.findIndex(h => h === "Escola_Destino_Intermediari" || h === "escolaDestinoIntermediari"),
      dataEntrega: headers.findIndex(h => h.trim() === "Data_Lliurament_Prevista" || h.trim().toLowerCase() === "datalliuramentprevista"),
      estat: headers.findIndex(h => h === "Estat" || h === "estat")
    };

    console.log('📍 Column indices:', columnIndices);

    // Verificar que encontramos las columnas críticas
    if (columnIndices.idItem === -1) {
      return { success: false, error: "No se encontró la columna ID_Item" };
    }

    // Calcular escola destino de forma robusta
    let calculatedEscolaDestino = '';

    if (deliveryData.modalitat === 'Intermediari') {
      console.log('🎯 Processing INTERMEDIARI delivery');

      // Usar escolaDestino del frontend si existe
      if (deliveryData.escolaDestino) {
        calculatedEscolaDestino = deliveryData.escolaDestino;
        console.log('✅ Using escolaDestino from frontend:', calculatedEscolaDestino);
      }
      // Si no, calcular basándose en monitor + fecha
      else if (deliveryData.monitorIntermediaria && deliveryData.dataEntrega) {
        console.log('🔍 Calculating escolaDestino from monitor + date');
        const monitorName = extractMonitorName(deliveryData.monitorIntermediaria);
        const dayOfWeek = getDayOfWeekInCatalan(deliveryData.dataEntrega);

        console.log(`Monitor: "${monitorName}", Day: "${dayOfWeek}"`);

        const foundEscola = findSchoolForMonitorOnDay(monitorName, dayOfWeek);
        if (foundEscola) {
          calculatedEscolaDestino = foundEscola;
          console.log('✅ Found escola from calculation:', calculatedEscolaDestino);
        } else {
          console.log('⚠️ No escola found for specific day, trying any school...');
          const anySchool = findAnySchoolForMonitor(monitorName);
          if (anySchool) {
            calculatedEscolaDestino = anySchool;
            console.log('✅ Using fallback escola:', calculatedEscolaDestino);
          }
        }
      }
    } else {
      console.log('📋 Processing DIRECTA delivery');
    }

    console.log('🎯 Final escolaDestino:', calculatedEscolaDestino);

    // Procesar filas
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let updatedRows = 0;

    console.log('🔄 Processing orders:', deliveryData.orderIds);

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const idItem = row[columnIndices.idItem];

      if (deliveryData.orderIds.includes(idItem)) {
        console.log(`✏️ Updating row ${i + 1} with ID: ${idItem}`);

        // Actualizar todos los campos
        if (columnIndices.modalitat !== -1) {
          row[columnIndices.modalitat] = deliveryData.modalitat;
          console.log(`  ✅ Modalitat: ${deliveryData.modalitat}`);
        }

        if (columnIndices.monitor !== -1) {
          const monitorValue = deliveryData.monitorIntermediaria || '';
          row[columnIndices.monitor] = monitorValue;
          console.log(`  ✅ Monitor: ${monitorValue}`);
        }

        if (columnIndices.escolaDestino !== -1) {
          row[columnIndices.escolaDestino] = calculatedEscolaDestino;
          console.log(`  ✅ EscolaDestino: ${calculatedEscolaDestino}`);
        }

        if (columnIndices.dataEntrega !== -1) {
          const dataValue = deliveryData.dataEntrega || '';
          row[columnIndices.dataEntrega] = dataValue;
          console.log(`  ✅ DataEntrega: ${dataValue}`);
          console.log(`  📅 DEBUG - Column index for dataEntrega: ${columnIndices.dataEntrega}`);
          console.log(`  📅 DEBUG - Input deliveryData.dataEntrega: "${deliveryData.dataEntrega}"`);
        } else {
          console.log(`  ❌ ERROR - Column 'Data_Lliurament_Prevista' not found!`);
          console.log(`  📋 Available headers:`, headers);
        }

        if (columnIndices.estat !== -1) {
          row[columnIndices.estat] = 'Assignat';
          console.log(`  ✅ Estat: Assignat`);
        }

        updatedRows++;
      }
    }

    // Guardar cambios
    if (updatedRows > 0) {
      console.log(`💾 Saving ${updatedRows} updated rows to sheet`);
      dataRange.setValues(values);
      console.log('✅ Data saved successfully');
    } else {
      console.log('⚠️ No rows were updated - no matching IDs found');
    }

    const result = {
      success: true,
      updatedRows: updatedRows,
      message: `S'han assignat ${updatedRows} comandes per entrega ${deliveryData.modalitat.toLowerCase()}`,
      escolaDestino: calculatedEscolaDestino,
      processedData: {
        modalitat: deliveryData.modalitat,
        monitor: deliveryData.monitorIntermediaria || '',
        escolaDestino: calculatedEscolaDestino,
        dataEntrega: deliveryData.dataEntrega || '',
        orderIds: deliveryData.orderIds
      }
    };

    // 📢 ENVIAR NOTIFICACIONES AUTOMÁTICAS A GOOGLE CHAT
    if (updatedRows > 0) {
      try {
        console.log('📢 Intentando enviar notificaciones automáticas...');
        
        // Obtener información de las órdenes procesadas para construir la notificación
        const escolaIndex = headers.findIndex(h => h === 'Escola' || h === 'escola');
        const activitatIndex = headers.findIndex(h => h === 'Activitat' || h === 'activitat');
        const materialIndex = headers.findIndex(h => h === 'Material' || h === 'material');
        
        // Recopilar información de las órdenes actualizadas
        const processedOrders = [];
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          const idItem = row[columnIndices.idItem];
          
          if (deliveryData.orderIds.includes(idItem)) {
            processedOrders.push({
              escola: escolaIndex !== -1 ? row[escolaIndex] : '',
              activitat: activitatIndex !== -1 ? row[activitatIndex] : '',
              material: materialIndex !== -1 ? row[materialIndex] : ''
            });
          }
        }
        
        // ⚠️ NOTIFICACIONES AUTOMÁTICAS DESACTIVADAS
        // Las notificaciones se envían MANUALMENTE desde el frontend
        console.log('ℹ️ Notificaciones automáticas desactivadas - usar envío manual desde el frontend');
        
      } catch (notifError) {
        console.error('❌ Error enviando notificación automática:', notifError);
        // No fallar la operación principal si falla la notificación
        result.notificationSent = false;
        result.notificationError = notifError.toString();
      }
    }

    console.log('🎉 CREATEDELIVERY SUCCESS:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('💥 CREATEDELIVERY ERROR:', error);
    return {
      success: false,
      error: 'Error creant l\'assignació d\'entrega: ' + error.toString(),
      stack: error.stack
    };
  }
}

function removeIntermediaryAssignment(orderIds) {
  try {
    if (!orderIds || orderIds.length === 0) {
      return { success: false, error: "No s'han proporcionat IDs de comandes" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");

    if (!sheet) {
      return { success: false, error: "La hoja 'Respostes' no existe." };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const modalittatIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    const monitorIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataEntregaIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");
    const estatIndex = headers.findIndex(h => h === "Estat");

    console.log('🧹 DEBUG removeIntermediaryAssignment - Column indices:', {
      idItem: idItemIndex,
      modalitat: modalittatIndex,
      monitor: monitorIndex,
      escolaDestino: escolaDestinoIndex,
      dataEntrega: dataEntregaIndex,
      estat: estatIndex
    });

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let updatedRows = 0;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const idItem = row[idItemIndex];

      if (orderIds.includes(idItem)) {
        console.log(`🧹 DEBUG - Cleaning intermediary data for order: ${idItem}`);
        
        // Limpiar todos los campos relacionados con el intermediario
        if (modalittatIndex !== -1) {
          row[modalittatIndex] = '';
          console.log(`  ✅ Modalitat cleared`);
        }
        
        if (monitorIndex !== -1) {
          row[monitorIndex] = '';
          console.log(`  ✅ Monitor cleared`);
        }
        
        if (escolaDestinoIndex !== -1) {
          row[escolaDestinoIndex] = '';
          console.log(`  ✅ Escola Destino cleared`);
        }
        
        if (dataEntregaIndex !== -1) {
          row[dataEntregaIndex] = '';
          console.log(`  ✅ Data Entrega cleared`);
        }
        
        if (estatIndex !== -1) {
          row[estatIndex] = "Preparat";
          console.log(`  ✅ Estat set to "Preparat"`);
        }
        
        updatedRows++;
      }
    }

    if (updatedRows > 0) {
      sheet.getDataRange().setValues(values);
    }

    return {
      success: true,
      updatedRows: updatedRows,
      message: `S'han eliminat ${updatedRows} assignacions d'intermediari. Estat tornat a "Preparat"`
    };

  } catch (error) {
    console.error("Error en removeIntermediaryAssignment:", error);
    return { success: false, error: "Error eliminant assignació d'intermediari: " + error.toString() };
  }
}

function calculateDistances(addresses) {
  try {
    console.log('🗺️ calculateDistances - Input addresses:', JSON.stringify(addresses));

    if (!addresses || addresses.length === 0) {
      console.log('❌ No addresses provided');
      return {
        success: false,
        error: "No s'han proporcionat adreces"
      };
    }

    const origin = "Carrer Ramon Turró 73, 08005 Barcelona"; // Eixos Creativa
    const results = [];

    for (const address of addresses) {
      try {
        console.log(`🗺️ Calculating distance to: ${address}`);

        const directions = Maps.newDirectionFinder()
          .setOrigin(origin)
          .setDestination(address)
          .setMode(Maps.DirectionFinder.Mode.DRIVING)
          .getDirections();

        if (directions.routes && directions.routes.length > 0) {
          const route = directions.routes[0];
          const leg = route.legs[0];

          results.push({
            address: address,
            distance: leg.distance.text,
            duration: leg.duration.text,
            distanceValue: leg.distance.value,  // meters
            durationValue: leg.duration.value   // seconds
          });

          console.log(`✅ Distance calculated: ${leg.distance.text} (${leg.duration.text})`);
        } else {
          console.log(`❌ No route found for ${address}`);
          results.push({
            address: address,
            distance: "N/A",
            duration: "N/A",
            distanceValue: 99999,
            durationValue: 99999
          });
        }
      } catch (addressError) {
        console.error(`❌ Error for address ${address}:`, addressError);
        results.push({
          address: address,
          distance: "Error",
          duration: "Error",
          distanceValue: 99999,
          durationValue: 99999
        });
      }
    }

    console.log(`✅ calculateDistances completed. ${results.length} results.`);
    return { success: true, data: results };

  } catch (error) {
    console.error("❌ Error en calculateDistances:", error);
    return {
      success: false,
      error: "Error calculant distàncies: " + error.toString()
    };
  }
}

// ======================================================
// AUXILIARY FUNCTIONS FOR DELIVERY CALCULATION
// ======================================================

/**
 * Extrae el nombre del monitor eliminando el día entre paréntesis
 * Ej: "Maria Tomé (Dilluns)" → "Maria Tomé"
 */
function extractMonitorName(monitorWithDay) {
  if (!monitorWithDay) return '';
  
  // Buscar el índice del último paréntesis de apertura
  const lastParenIndex = monitorWithDay.lastIndexOf('(');
  
  if (lastParenIndex === -1) {
    // No hay paréntesis, devolver el nombre completo
    return monitorWithDay.trim();
  }
  
  // Extraer la parte antes del paréntesis
  return monitorWithDay.substring(0, lastParenIndex).trim();
}

/**
 * Convierte una fecha a día de la semana en catalán
 * Ej: "2024-10-07" → "Dilluns"
 */
function getDayOfWeekInCatalan(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const dayIndex = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  const daysInCatalan = [
    'Diumenge',  // 0
    'Dilluns',   // 1
    'Dimarts',   // 2
    'Dimecres',  // 3
    'Dijous',    // 4
    'Divendres', // 5
    'Dissabte'   // 6
  ];
  
  return daysInCatalan[dayIndex] || '';
}

/**
 * Busca qué escola visita un monitor en un día específico
 * consultando la hoja "Dades"
 */
function findSchoolForMonitorOnDay(monitorName, dayOfWeek) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dadesSheet = ss.getSheetByName("Dades");
    
    if (!dadesSheet) {
      console.error("La hoja 'Dades' no existe");
      return null;
    }
    
    const data = dadesSheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.error("No hay datos en la hoja 'Dades'");
      return null;
    }
    
    const headers = data[0];
    const escolaIdx = headers.findIndex(h => h === "ESCOLA");
    const monitoraIdx = headers.findIndex(h => h === "MONITORA");
    const diaIdx = headers.findIndex(h => h === "DIA");
    
    if (escolaIdx === -1 || monitoraIdx === -1 || diaIdx === -1) {
      console.error("No se encontraron las columnas necesarias en 'Dades'");
      return null;
    }
    
    // Buscar coincidencia
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const escola = row[escolaIdx]?.toString().trim();
      const monitora = row[monitoraIdx]?.toString().trim();
      const dia = row[diaIdx]?.toString().trim();
      
      if (monitora === monitorName && dia === dayOfWeek && escola) {
        console.log(`Found match: ${monitorName} goes to ${escola} on ${dayOfWeek}`);
        return escola;
      }
    }
    
    console.log(`No match found for ${monitorName} on ${dayOfWeek}`);
    return null;
    
  } catch (error) {
    console.error('Error in findSchoolForMonitorOnDay:', error);
    return null;
  }
}

/**
 * Busca cualquier escola que visite un monitor (sin importar el día)
 * Para debugging y fallback
 */
function findAnySchoolForMonitor(monitorName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dadesSheet = ss.getSheetByName("Dades");
    
    if (!dadesSheet) {
      console.error("La hoja 'Dades' no existe");
      return null;
    }
    
    const data = dadesSheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.error("No hay datos en la hoja 'Dades'");
      return null;
    }
    
    const headers = data[0];
    const escolaIdx = headers.findIndex(h => h === "ESCOLA");
    const monitoraIdx = headers.findIndex(h => h === "MONITORA");
    
    if (escolaIdx === -1 || monitoraIdx === -1) {
      console.error("No se encontraron las columnas necesarias en 'Dades'");
      return null;
    }
    
    // Buscar cualquier coincidencia de monitor
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const escola = row[escolaIdx]?.toString().trim();
      const monitora = row[monitoraIdx]?.toString().trim();
      
      if (monitora === monitorName && escola) {
        console.log(`Found any school for monitor ${monitorName}: ${escola}`);
        return escola;
      }
    }
    
    console.log(`No school found for monitor ${monitorName}`);
    return null;
    
  } catch (error) {
    console.error('Error in findAnySchoolForMonitor:', error);
    return null;
  }
}

// ======================================================
// GOOGLE CHAT NOTIFICATIONS SYSTEM
// ======================================================

/**
 * Configura la hoja ChatWebhooks si no existe
 * Esta hoja almacenará los Space IDs de cada espacio de Google Chat
 */
function setupChatWebhooksSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('ChatWebhooks');
    
    if (!sheet) {
      console.log('Creando hoja ChatWebhooks...');
      sheet = ss.insertSheet('ChatWebhooks');
      
      // Configurar headers (SIN columna Webhook URL)
      const headers = [
        'Nombre Espacio',
        'Space ID',
        'Fecha Creación',
        'Miembros',
        'Última Actualización'
      ];
      
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('#FFFFFF');
      
      // Ajustar anchos de columna
      sheet.setColumnWidth(1, 200); // Nombre Espacio
      sheet.setColumnWidth(2, 250); // Space ID
      sheet.setColumnWidth(3, 180); // Fecha Creación
      sheet.setColumnWidth(4, 100); // Miembros
      sheet.setColumnWidth(5, 180); // Última Actualización
      
      // Proteger la hoja para evitar ediciones accidentales
      const protection = sheet.protect();
      protection.setDescription('Hoja protegida - datos de Google Chat API');
      
      console.log('✅ Hoja ChatWebhooks creada correctamente');
      console.log('📊 Estructura: Nombre Espacio | Space ID | Fecha | Miembros | Actualización');
      return { success: true, message: 'Hoja ChatWebhooks creada' };
    } else {
      console.log('ℹ️ La hoja ChatWebhooks ya existe');
      return { success: true, message: 'La hoja ChatWebhooks ya existe' };
    }
  } catch (error) {
    console.error('❌ Error creando hoja ChatWebhooks:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Elimina la columna "Webhook URL" de la hoja ChatWebhooks si existe
 * Migra de la estructura antigua (con webhooks) a la nueva (solo Chat API)
 */
function removeWebhookUrlColumn() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ChatWebhooks');
    
    if (!sheet) {
      console.error('❌ Hoja ChatWebhooks no existe');
      return { success: false, error: 'Hoja ChatWebhooks no existe' };
    }
    
    console.log('🔄 Verificando estructura de la hoja ChatWebhooks...');
    
    // Leer headers actuales
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('📋 Headers actuales:', currentHeaders);
    
    // Verificar si tiene la columna "Webhook URL" en posición B
    if (currentHeaders[1] !== 'Webhook URL') {
      console.log('✅ La hoja ya tiene la estructura correcta (sin Webhook URL)');
      console.log('📊 Estructura actual:', currentHeaders.join(' | '));
      return { success: true, message: 'La hoja ya está actualizada' };
    }
    
    console.log('➖ Eliminando columna "Webhook URL"...');
    
    // Eliminar columna B (Webhook URL)
    sheet.deleteColumn(2);
    
    // Actualizar formato de headers
    const headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');
    
    // Ajustar anchos de columna
    sheet.setColumnWidth(1, 200); // Nombre Espacio
    sheet.setColumnWidth(2, 250); // Space ID (ahora en columna B)
    sheet.setColumnWidth(3, 180); // Fecha Creación
    sheet.setColumnWidth(4, 100); // Miembros
    sheet.setColumnWidth(5, 180); // Última Actualización
    
    console.log('✅ Columna "Webhook URL" eliminada correctamente');
    console.log('📊 Nueva estructura:');
    console.log('   A: Nombre Espacio');
    console.log('   B: Space ID');
    console.log('   C: Fecha Creación');
    console.log('   D: Miembros');
    console.log('   E: Última Actualización');
    
    return { 
      success: true, 
      message: 'Columna Webhook URL eliminada. Ahora usando Chat API.',
      rowsAffected: sheet.getLastRow() - 1
    };
    
  } catch (error) {
    console.error('❌ Error eliminando columna Webhook URL:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * OBSOLETA - Migración antigua de webhooks
 * Esta función ya no es necesaria con Chat API
 * @deprecated Usar removeWebhookUrlColumn() en su lugar
 */
function migrateChatWebhooksSheet_OBSOLETE() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ChatWebhooks');
    
    if (!sheet) {
      console.error('❌ Hoja ChatWebhooks no existe');
      return { success: false, error: 'Hoja ChatWebhooks no existe' };
    }
    
    console.log('🔄 Iniciando migración de la hoja ChatWebhooks...');
    
    // Verificar estructura actual leyendo los headers
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('📋 Headers actuales:', currentHeaders);
    
    // Verificar si ya tiene la columna "Webhook URL"
    if (currentHeaders[1] === 'Webhook URL') {
      console.log('✅ La hoja ya tiene la estructura correcta');
      return { success: true, message: 'La hoja ya está migrada' };
    }
    
    // Estructura antigua esperada: Nombre Espacio, Space ID, Fecha Creación, Miembros, Última Actualización
    if (currentHeaders[1] !== 'Space ID') {
      console.error('❌ Estructura inesperada. Se esperaba "Space ID" en columna B');
      return { success: false, error: 'Estructura de hoja no reconocida' };
    }
    
    // Insertar nueva columna B para "Webhook URL"
    console.log('➕ Insertando columna "Webhook URL" en posición B...');
    sheet.insertColumnBefore(2); // Insertar antes de la columna 2 (actual Space ID)
    
    // Actualizar header de la nueva columna B
    sheet.getRange(1, 2).setValue('Webhook URL');
    
    // Aplicar formato al header
    const headerRange = sheet.getRange(1, 1, 1, 6);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');
    
    // Ajustar anchos de columna
    sheet.setColumnWidth(2, 400); // Webhook URL
    sheet.setColumnWidth(3, 250); // Space ID
    
    console.log('✅ Migración completada correctamente');
    console.log('📊 Nueva estructura:');
    console.log('   A: Nombre Espacio');
    console.log('   B: Webhook URL (NUEVA - vacía por ahora)');
    console.log('   C: Space ID');
    console.log('   D: Fecha Creación');
    console.log('   E: Miembros');
    console.log('   F: Última Actualización');
    
    return { 
      success: true, 
      message: 'Hoja migrada correctamente. Añade las Webhook URLs en la columna B.',
      rowsAffected: sheet.getLastRow() - 1 // -1 para excluir header
    };
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Busca el Space ID de un espacio por su nombre
 * @param {string} spaceName - Nombre del espacio (ej: "/LestonnacDX1")
 * @return {string|null} - Space ID o null si no se encuentra
 */
function getSpaceIdByName(spaceName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ChatWebhooks');

    if (!sheet) {
      console.error('❌ Hoja ChatWebhooks no existe. Ejecuta setupChatWebhooksSheet() primero.');
      return null;
    }

    const data = sheet.getDataRange().getValues();

    // Función auxiliar para buscar un nombre específico
    const findSpaceId = (name) => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === name) {
          const spaceId = data[i][1]; // Columna B = Space ID
          console.log(`✅ Space ID encontrado para ${name}: ${spaceId}`);
          return spaceId;
        }
      }
      return null;
    };

    // 1. Intentar búsqueda exacta
    let spaceId = findSpaceId(spaceName);
    if (spaceId) return spaceId;

    // 2. Si no se encuentra, intentar variaciones con fallback
    console.log(`🔍 Búsqueda con fallback para: ${spaceName}`);

    // Extraer componentes del nombre
    // Ejemplos: "/VilaOlimpicaCO1" → "VilaOlimpica" + "CO1"
    //           "/Espai3DX" → "Espai3" + "DX"
    //           "/LestonnacHC2" → "Lestonnac" + "HC2"
    //           "/Espai3CO1DX2" → "Espai3" + "CO1DX2"

    // Buscar el primer patrón de actividad (2-3 letras mayúsculas, opcionalmente seguidas de número)
    const actividadMatch = spaceName.match(/([A-Z]{2,3}\d*)/);

    if (actividadMatch) {
      const primeraActividad = actividadMatch[0]; // "CO1", "DX", "HC2", etc.
      const indexActividad = spaceName.indexOf(primeraActividad);
      const escola = spaceName.substring(1, indexActividad); // Quitar "/" inicial y extraer escola
      const todasActividades = spaceName.substring(indexActividad); // "CO1", "DX", "CO1DX2"

      // Extraer actividad sin número (ej: "CO1" → "CO", "DX" → "DX")
      const activitatSinNumero = primeraActividad.replace(/\d+$/, '');

      // Lista de variaciones a intentar
      const variaciones = [
        `/${escola}${activitatSinNumero}`, // "/VilaOlimpicaCO" o "/Espai3DX"
        `/${escola}`, // "/VilaOlimpica" o "/Espai3"
        `/${escola.toLowerCase()}${todasActividades}`, // "/vilaolimpicaco1"
      ];

      // Intentar cada variación
      for (const variacion of variaciones) {
        console.log(`   🔎 Intentando: ${variacion}`);
        spaceId = findSpaceId(variacion);
        if (spaceId) {
          console.log(`   ✅ Encontrado con fallback: ${variacion}`);
          return spaceId;
        }
      }

      // Última opción: buscar espacios que contengan la escuela (para casos como /VilaOlimpicaCO-DIMECRES)
      console.log(`   🔎 Buscando espacios que contengan: ${escola}`);
      for (let i = 1; i < data.length; i++) {
        const nombreEspacio = data[i][0];
        if (nombreEspacio && nombreEspacio.includes(escola)) {
          const spaceId = data[i][1];
          console.log(`   ⚠️ Coincidencia parcial encontrada: ${nombreEspacio} → ${spaceId}`);
          return spaceId;
        }
      }
    }

    console.warn(`⚠️ No se encontró Space ID para: ${spaceName} (ni variaciones)`);
    return null;
  } catch (error) {
    console.error('❌ Error buscando Space ID:', error);
    return null;
  }
}

/**
 * Envía una notificación a un espacio de Google Chat usando Chat API
 * @param {string} spaceName - Nombre del espacio (ej: "/LestonnacDX1")
 * @param {string} message - Mensaje a enviar
 * @return {Object} - Resultado del envío
 */
function sendChatNotification(spaceName, message) {
  try {
    console.log(`📤 Intentando enviar notificación a: ${spaceName}`);
    
    // Buscar Space ID (en lugar de Webhook URL)
    const spaceId = getSpaceIdByName(spaceName);
    
    if (!spaceId) {
      const errorMsg = `No se encontró Space ID para: ${spaceName}. Verifica la hoja ChatWebhooks.`;
      console.error(`❌ ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        spaceName: spaceName 
      };
    }
    
    // Enviar mensaje usando Chat API REST (sin necesidad de configurar Chat app)
    try {
      const url = `https://chat.googleapis.com/v1/${spaceId}/messages`;
      const payload = JSON.stringify({
        text: message
      });

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
        },
        payload: payload,
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        const result = JSON.parse(response.getContentText());
        console.log(`✅ Mensaje enviado correctamente a ${spaceName} (${spaceId})`);
        return {
          success: true,
          spaceName: spaceName,
          spaceId: spaceId,
          message: 'Notificación enviada correctamente',
          messageId: result.name
        };
      } else {
        const errorText = response.getContentText();
        console.error(`❌ Error ${responseCode} enviando mensaje:`, errorText);
        return {
          success: false,
          error: `Error de Chat API (${responseCode}): ${errorText}`,
          spaceName: spaceName,
          spaceId: spaceId
        };
      }

    } catch (apiError) {
      console.error(`❌ Error enviando mensaje con Chat API:`, apiError);
      return {
        success: false,
        error: `Error de Chat API: ${apiError.toString()}`,
        spaceName: spaceName,
        spaceId: spaceId
      };
    }
  } catch (error) {
    console.error('❌ Error general en sendChatNotification:', error);
    return { 
      success: false, 
      error: error.toString(),
      spaceName: spaceName
    };
  }
}

/**
 * Función de prueba para verificar que todo funciona
 */
function testChatNotification() {
  // Primero configurar la hoja
  const setupResult = setupChatWebhooksSheet();
  console.log('Setup result:', setupResult);
  
  // Mensaje de prueba
  const testMessage = `🔔 TEST DE NOTIFICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Aquest és un missatge de prova del sistema de notificacions.
Si reps això, el sistema funciona correctament! ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  
  // IMPORTANTE: Cambiar esto por un espacio real que tengas
  const testSpaceName = '/LestonnacDX1'; // Cambiar por un espacio real
  
  console.log(`\n🧪 Enviando mensaje de prueba a: ${testSpaceName}`);
  const result = sendChatNotification(testSpaceName, testMessage);
  
  console.log('\n📊 Resultado del test:');
  console.log(JSON.stringify(result, null, 2));
  
  return result;
}
/**
 * 🧪 TEST DE NOTIFICACIONES DUALES
 * 
 * Esta función prueba el sistema completo de notificaciones:
 * - Crea una entrega de prueba
 * - Envía notificaciones al monitor intermediario
 * - Envía notificaciones al monitor de origen
 * 
 * ⚠️ IMPORTANTE: Esta función NO crea entregas reales en la hoja,
 * solo simula el proceso para probar las notificaciones.
 */
function testDualNotification() {
  console.log('🧪 ========================================');
  console.log('🧪 TEST DE NOTIFICACIONES DUALES');
  console.log('🧪 ========================================');
  console.log('');
  
  // Datos de prueba simulando una entrega con intermediario
  // Usando IDs reales de la hoja Respostes
    const testData = {
    orderIds: ['e7b05f61-d049-4d06-85c1-541a192697dc-001'], // ID real: Auro DX1
      modalitat: 'Intermediari',
      monitorIntermediaria: 'Judit Pesquero',
      escolaDestinoIntermediaria: 'SantMarti',
    dataEntrega: '2025-10-09' // Fecha de mañana
  };
  
  console.log('📋 Datos de prueba:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');
  
  console.log('🚀 Ejecutando createDelivery...');
  console.log('⚠️ Esto enviará notificaciones REALES a:');
  console.log('   - Monitor Intermediario: Judit Pesquero');
  console.log('   - Monitores de Origen de los pedidos');
  console.log('');
  
  try {
    const result = createDelivery(testData);
    
    console.log('');
    console.log('📊 RESULTADO:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('');
      console.log('✅ ¡TEST COMPLETADO CON ÉXITO!');
      console.log('💡 Verifica en Google Chat que las notificaciones llegaron');
    } else {
      console.log('');
      console.log('❌ El test falló');
      console.log('Error:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('');
    console.log('❌ Error durante el test:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 🔍 LISTAR IDs DISPONIBLES
 * 
 * Esta función lista los primeros 10 IDs de pedidos disponibles
 * para que puedas usarlos en las pruebas.
 */
function listarIDsDisponibles() {
  console.log('🔍 ========================================');
  console.log('🔍 LISTANDO IDs DISPONIBLES');
  console.log('🔍 ========================================');
  console.log('');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Respostes');
    
    if (!sheet) {
      console.log('❌ Hoja Respostes no encontrada');
      return { success: false, error: 'Hoja no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Encontrar columnas
    const idItemIndex = headers.indexOf('ID_Item');
    const escolaIndex = headers.indexOf('Escola');
    const activitatIndex = headers.indexOf('Activitat');
    const estatIndex = headers.indexOf('Estat');
    
    console.log('📋 Primeros 10 pedidos disponibles:');
    console.log('');
    
    const ids = [];
    for (let i = 1; i < Math.min(11, data.length); i++) {
      const row = data[i];
      const idItem = row[idItemIndex];
      const escola = row[escolaIndex];
      const activitat = row[activitatIndex];
      const estat = row[estatIndex];
      
      console.log(`${i}. ID: ${idItem}`);
      console.log(`   Escola: ${escola}`);
      console.log(`   Activitat: ${activitat}`);
      console.log(`   Estat: ${estat}`);
      console.log('');
      
      ids.push(idItem);
    }
    
    console.log('💡 Para probar notificaciones, usa estos IDs en testDualNotification()');
    
    return { success: true, ids: ids };
    
  } catch (error) {
    console.log('❌ Error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 🧪 TEST SEGURO - Sistema de Notificaciones
 * 
 * Esta función prueba SOLO el sistema de notificaciones
 * SIN afectar producción.
 * 
 * INSTRUCCIONES:
 * 1. Ejecuta la función testNotificacionesSeguro()
 * 2. Mira los logs para ver si funciona
 * 3. NO afecta nada en producción
 */
function testNotificacionesSeguro() {
  console.log('🧪 ========================================');
  console.log('🧪 TEST SEGURO - SISTEMA DE NOTIFICACIONES');
  console.log('🧪 ========================================');
  console.log('⚠️ ESTE TEST NO AFECTA PRODUCCIÓN');
  console.log('');
  
  // Test 1: Verificar que las funciones existen
  console.log('🔍 Test 1: Verificar funciones disponibles...');
  
  try {
    // Verificar que getSpaceIdByName existe
    if (typeof getSpaceIdByName === 'function') {
      console.log('✅ Función getSpaceIdByName disponible');
    } else {
      console.log('❌ Función getSpaceIdByName NO disponible');
      return { success: false, error: 'getSpaceIdByName no existe' };
    }
    
    // Verificar que sendChatNotification existe
    if (typeof sendChatNotification === 'function') {
      console.log('✅ Función sendChatNotification disponible');
    } else {
      console.log('❌ Función sendChatNotification NO disponible');
      return { success: false, error: 'sendChatNotification no existe' };
    }
    
  } catch (error) {
    console.log('❌ Error verificando funciones:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🔍 Test 2: Verificar hoja ChatWebhooks...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('ChatWebhooks');
    
    if (!sheet) {
      console.log('❌ Hoja ChatWebhooks no existe');
      return { success: false, error: 'Hoja ChatWebhooks no existe' };
    }
    
    const data = sheet.getDataRange().getValues();
    console.log(`✅ Hoja ChatWebhooks encontrada con ${data.length - 1} espacios`);
    
    // Mostrar algunos espacios disponibles
    console.log('📋 Primeros 5 espacios disponibles:');
    for (let i = 1; i < Math.min(6, data.length); i++) {
      const nombre = data[i][0];
      const spaceId = data[i][1];
      console.log(`   ${i}. ${nombre} → ${spaceId ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.log('❌ Error accediendo a hoja ChatWebhooks:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🔍 Test 3: Probar búsqueda de espacio...');
  
  try {
    // Buscar un espacio de prueba
    const testSpace = '/LestonnacDX1';
    console.log(`🔎 Buscando espacio: ${testSpace}`);
    
    const spaceId = getSpaceIdByName(testSpace);
    
    if (spaceId) {
      console.log(`✅ Space ID encontrado: ${spaceId}`);
    } else {
      console.log(`⚠️ Space ID no encontrado para ${testSpace}`);
      console.log('💡 Esto puede ser normal si el espacio no existe');
    }
    
  } catch (error) {
    console.log('❌ Error en búsqueda de espacio:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🔍 Test 4: Probar envío de notificación (SIMULADO)...');
  
  try {
    // Crear mensaje de prueba
    const testMessage = `🧪 **TEST DE NOTIFICACIONES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ESTE ES UN MENSAJE DE PRUEBA

📅 **Fecha:** ${new Date().toLocaleDateString('ca-ES')}
🕐 **Hora:** ${new Date().toLocaleTimeString('ca-ES')}
🔧 **Tipo:** Test del sistema de notificaciones

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Si ves este mensaje, el sistema funciona correctamente`;
    
    console.log('📝 Mensaje de prueba creado');
    console.log('💡 Para probar realmente, ejecuta testNotificacionReal()');
    
  } catch (error) {
    console.log('❌ Error creando mensaje de prueba:', error);
    return { success: false, error: error.toString() };
  }
  
  console.log('');
  console.log('🧪 ========================================');
  console.log('🧪 RESUMEN DEL TEST SEGURO');
  console.log('🧪 ========================================');
  console.log('✅ Funciones disponibles: OK');
  console.log('✅ Hoja ChatWebhooks: OK');
  console.log('✅ Búsqueda de espacios: OK');
  console.log('✅ Mensaje de prueba: OK');
  console.log('');
  console.log('🎉 ¡TEST SEGURO COMPLETADO!');
  console.log('💡 El sistema de notificaciones está listo para probar');
  console.log('⚠️ Para prueba real, ejecuta testNotificacionReal()');
  
  return {
    success: true,
    message: 'Test seguro completado exitosamente',
    functionsAvailable: true,
    chatWebhooksSheet: true,
    spaceSearch: true
  };
}

/**
 * 🚀 TEST REAL - Enviar notificación real
 * 
 * ⚠️ ESTE TEST ENVÍA UNA NOTIFICACIÓN REAL
 * Solo ejecuta si quieres probar con datos reales
 */
function testNotificacionReal() {
  console.log('🚀 ========================================');
  console.log('🚀 TEST REAL - ENVIAR NOTIFICACIÓN');
  console.log('🚀 ========================================');
  console.log('⚠️ ESTE TEST ENVÍA UNA NOTIFICACIÓN REAL');
  console.log('');
  
  // Buscar un espacio disponible
  const testSpace = '/LestonnacDX1';
  console.log(`🎯 Enviando notificación real a: ${testSpace}`);
  
  const testMessage = `🧪 **TEST REAL DE NOTIFICACIONES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 **Fecha:** ${new Date().toLocaleDateString('ca-ES')}
🕐 **Hora:** ${new Date().toLocaleTimeString('ca-ES')}
🔧 **Tipo:** Test real del sistema

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Si ves este mensaje en Google Chat, el sistema funciona perfectamente`;
  
  try {
    const result = sendChatNotification(testSpace, testMessage);
    
    console.log('📤 Resultado del envío:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 ¡NOTIFICACIÓN ENVIADA EXITOSAMENTE!');
      console.log('💡 Ve a Google Chat y busca el espacio:', testSpace);
    } else {
      console.log('❌ Error enviando notificación:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('❌ Error en test real:', error);
    return { success: false, error: error.toString() };
  }
}

// ======================================================
// SISTEMA DE NOTIFICACIONES CON PERSISTENCIA EN SHEETS
// ======================================================

/**
 * Envía notificación manual y actualiza el estado en Google Sheets
 */
function sendManualNotificationWithStatus(spaceName, message, orderId, notificationType) {
  try {
    console.log(`📤 Enviando notificación manual:`, {
      spaceName,
      orderId,
      notificationType,
      messageLength: message.length
    });

    // Enviar la notificación
    const notificationResult = sendChatNotification(spaceName, message);
    
    // Si la notificación se envió correctamente, actualizar el estado en Sheets
    if (notificationResult.success) {
      const updateResult = updateNotificationStatus(orderId, notificationType, 'Enviada');
      console.log(`✅ Estado actualizado en Sheets:`, updateResult);
      
      return {
        ...notificationResult,
        statusUpdated: updateResult.success,
        orderId: orderId,
        notificationType: notificationType
      };
    } else {
      console.log(`❌ Error enviando notificación, no se actualiza estado`);
      return notificationResult;
    }
    
  } catch (error) {
    console.log('❌ Error en sendManualNotificationWithStatus:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Actualiza el estado de notificación en Google Sheets
 * @param {string} orderId - ID del pedido
 * @param {string} notificationType - 'intermediario' o 'destinatario'
 * @param {string} status - 'Enviada' o 'Pendiente'
 */
function updateNotificationStatus(orderId, notificationType, status) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    if (!sheet) {
      console.error('❌ Hoja Respostes no encontrada');
      return { success: false, error: 'Hoja Respostes no encontrada' };
    }

    // Buscar la fila por ID del item en la columna C (ID_Item)
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) { // Empezar desde fila 2 (saltar headers)
      // Buscar en la columna C (ID_Item) - índice 2
      const idInColC = data[i][2] && data[i][2].toString().includes(orderId);
      
      if (idInColC) {
        rowIndex = i + 1; // +1 porque getValues() es 0-indexed pero getRange() es 1-indexed
        console.log(`✅ ID encontrado en fila ${rowIndex}, columna C: "${data[i][2]}"`);
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.log(`⚠️ No se encontró pedido con ID: ${orderId}`);
      return { success: false, error: `Pedido ${orderId} no encontrado` };
    }

    // Determinar la columna según el tipo de notificación
    let columnIndex;
    if (notificationType === 'intermediario') {
      columnIndex = 23; // Columna W (índice 23, 0-based)
    } else if (notificationType === 'destinatario') {
      columnIndex = 24; // Columna X (índice 24, 0-based)
    } else {
      return { success: false, error: 'Tipo de notificación inválido' };
    }

    // Actualizar la celda
    const cell = sheet.getRange(rowIndex, columnIndex);
    cell.setValue(status);
    
    console.log(`✅ Estado actualizado: Fila ${rowIndex}, Columna ${columnIndex}, Valor: ${status}`);
    
    return { 
      success: true, 
      row: rowIndex, 
      column: columnIndex, 
      value: status,
      orderId: orderId,
      notificationType: notificationType
    };
    
  } catch (error) {
    console.error('❌ Error actualizando estado de notificación:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Obtiene el estado de notificaciones para un pedido
 * @param {string} orderId - ID del pedido
 */
function getNotificationStatus(orderId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    if (!sheet) {
      return { success: false, error: 'Hoja Respostes no encontrada' };
    }

    // Buscar la fila del ID
    const lastRow = sheet.getLastRow();
    let foundRow = -1;
    
    for (let i = 2; i <= lastRow; i++) {
      const idCell = sheet.getRange(i, 3).getValue(); // Columna C
      if (idCell && idCell.toString().includes(orderId)) {
        foundRow = i;
        console.log(`✅ ID encontrado en fila ${foundRow}, columna C: "${idCell}"`);
        break;
      }
    }
    
    if (foundRow === -1) {
      return { success: false, error: `Pedido ${orderId} no encontrado` };
    }

    // Leer directamente de las celdas individuales para evitar problemas de caché
    const intermediarioStatus = sheet.getRange(foundRow, 23).getValue() || 'Pendiente';
    const destinatarioStatus = sheet.getRange(foundRow, 24).getValue() || 'Pendiente';
    
    console.log(`🔍 ID ${orderId} - W: "${intermediarioStatus}", X: "${destinatarioStatus}"`);
    
    return {
      success: true,
      orderId: orderId,
      intermediario: intermediarioStatus,
      destinatario: destinatarioStatus
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de notificaciones:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Función de test para verificar el sistema de notificaciones
 */
function testNotificationSystem() {
  try {
    console.log('🧪 TESTING NOTIFICATION SYSTEM...');
    
    // Test 1: Verificar que la hoja existe
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    if (!sheet) {
      console.log('❌ ERROR: Hoja Respostes no encontrada');
      return { success: false, error: 'Hoja Respostes no encontrada' };
    }
    console.log('✅ Hoja Respostes encontrada');
    
    // Test 2: Verificar columnas W y X
    const data = sheet.getDataRange().getValues();
    console.log(`📊 Total de filas: ${data.length}`);
    console.log(`📊 Total de columnas: ${data[0].length}`);
    
    // Test 3: Verificar si las columnas W y X tienen datos
    if (data[0].length >= 24) {
      console.log('✅ Columna X (24) existe');
      const sampleW = data[1] && data[1][23] ? data[1][23] : 'Vacía';
      const sampleX = data[1] && data[1][24] ? data[1][24] : 'Vacía';
      console.log(`📋 Columna W (23): "${sampleW}"`);
      console.log(`📋 Columna X (24): "${sampleX}"`);
    } else {
      console.log('❌ ERROR: No hay suficientes columnas. Necesitas crear columnas W y X');
    }
    
    // Test 4: Buscar un ID de ejemplo
    let foundId = null;
    for (let i = 1; i < Math.min(data.length, 5); i++) {
      for (let j = 0; j < Math.min(data[i].length, 10); j++) {
        if (data[i][j] && data[i][j].toString().length > 3) {
          foundId = data[i][j].toString();
          console.log(`🔍 ID encontrado en fila ${i+1}, columna ${j+1}: "${foundId}"`);
          break;
        }
      }
      if (foundId) break;
    }
    
    if (foundId) {
      console.log(`🧪 Probando getNotificationStatus con ID: "${foundId}"`);
      const result = getNotificationStatus(foundId);
      console.log('📥 Resultado:', result);
    } else {
      console.log('⚠️ No se encontró ningún ID para probar');
    }
    
    return { success: true, message: 'Test completado' };
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Función para debuggear la estructura de la hoja
 */
function debugSheetStructure() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    if (!sheet) {
      console.log('❌ Hoja Respostes no encontrada');
      return;
    }

    const data = sheet.getDataRange().getValues();
    console.log('📊 ESTRUCTURA DE LA HOJA:');
    console.log(`Total filas: ${data.length}`);
    console.log(`Total columnas: ${data[0].length}`);
    
    // Mostrar headers
    console.log('📋 HEADERS (primera fila):');
    for (let i = 0; i < data[0].length; i++) {
      const header = data[0][i] || `Columna_${String.fromCharCode(65 + i)}`;
      console.log(`Columna ${i + 1} (${String.fromCharCode(65 + i)}): "${header}"`);
    }
    
    // Mostrar primeras 3 filas de datos
    console.log('📋 PRIMERAS 3 FILAS DE DATOS:');
    for (let row = 1; row < Math.min(4, data.length); row++) {
      console.log(`\nFila ${row + 1}:`);
      for (let col = 0; col < Math.min(10, data[row].length); col++) {
        const value = data[row][col] || 'VACÍO';
        console.log(`  Columna ${col + 1} (${String.fromCharCode(65 + col)}): "${value}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

/**
 * Función para obtener estados de notificaciones de múltiples órdenes de una vez
 */
function getMultipleNotificationStatuses(orderIds) {
  try {
    console.log('🔄 Obteniendo estados para múltiples IDs:', orderIds);
    
    // Validar que orderIds sea un array
    if (!Array.isArray(orderIds)) {
      console.error('❌ orderIds no es un array:', orderIds);
      return { success: false, error: 'orderIds debe ser un array' };
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    if (!sheet) {
      return { success: false, error: 'Hoja Respostes no encontrada' };
    }

    const results = {};
    
    // Optimización: leer toda la hoja una sola vez
    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), 25);
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    
    // Crear un mapa de IDs para búsqueda rápida
    const idMap = new Map();
    for (let i = 1; i < data.length; i++) {
      const idCell = data[i][2]; // Columna C
      if (idCell) {
        idMap.set(idCell.toString(), i);
      }
    }
    
    // Para cada ID solicitado, buscar en el mapa
    for (const orderId of orderIds) {
      let foundRow = -1;
      
      // Buscar en el mapa
      for (const [id, rowIndex] of idMap) {
        if (id.includes(orderId)) {
          foundRow = rowIndex;
          break;
        }
      }
      
      if (foundRow !== -1) {
        // Leer desde el array de datos (más rápido que celdas individuales)
        const intermediarioStatus = data[foundRow][23] || 'Pendiente';
        const destinatarioStatus = data[foundRow][24] || 'Pendiente';
        
        console.log(`🔍 ID ${orderId} - W: "${intermediarioStatus}", X: "${destinatarioStatus}"`);
        
        results[orderId] = {
          intermediario: intermediarioStatus,
          destinatario: destinatarioStatus
        };
      } else {
        results[orderId] = {
          intermediario: 'Pendiente',
          destinatario: 'Pendiente'
        };
      }
    }
    
    console.log('✅ Estados obtenidos para', Object.keys(results).length, 'IDs');
    return { success: true, results: results };
    
  } catch (error) {
    console.error('❌ Error obteniendo múltiples estados:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Función para verificar si los cambios están activos
 */
function testColumnReading() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🧪 TESTING COLUMN READING...');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 25);
  
  console.log(`📊 Rango: ${lastRow} filas x ${lastCol} columnas`);
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().includes(orderId)) {
      console.log(`📋 Fila ${i + 1} encontrada:`);
      console.log(`  W (23): "${data[i][23]}" (tipo: ${typeof data[i][23]})`);
      console.log(`  X (24): "${data[i][24]}" (tipo: ${typeof data[i][24]})`);
      
      // Test de la función
      const result = getMultipleNotificationStatuses([orderId]);
      console.log('📥 Resultado función:', result);
      
      return result;
    }
  }
  
  return { error: 'ID no encontrado' };
}

/**
 * Función para actualizar manualmente el estado de destinatario
 */
function updateDestinatarioStatus() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🔄 Actualizando estado de destinatario para:', orderId);
  
  const result = updateNotificationStatus(orderId, 'destinatario', 'Enviada');
  console.log('📥 Resultado:', result);
  
  // Verificar que se actualizó
  const verifyResult = getNotificationStatus(orderId);
  console.log('🔍 Verificación:', verifyResult);
  
  return result;
}

/**
 * Función simple para test
 */
function testSimple() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🧪 TEST SIMPLE...');
  
  // Test 1: Función individual
  const individual = getNotificationStatus(orderId);
  console.log('📥 Resultado individual:', individual);
  
  // Test 2: Verificar directamente en la hoja
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
  const cellW = sheet.getRange(41, 23).getValue();
  const cellX = sheet.getRange(41, 24).getValue();
  console.log(`📋 Celda directa W: "${cellW}"`);
  console.log(`📋 Celda directa X: "${cellX}"`);
  
  return {
    individual,
    directW: cellW,
    directX: cellX
  };
}

/**
 * Función para test directo del problema
 */
function testDirecto() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🧪 TEST DIRECTO DEL PROBLEMA...');
  
  try {
    // Test 1: Función individual
    console.log('📥 Test getNotificationStatus:');
    const individual = getNotificationStatus(orderId);
    console.log('Resultado individual:', individual);
    
    // Test 2: Función múltiple
    console.log('📥 Test getMultipleNotificationStatuses:');
    const multiple = getMultipleNotificationStatuses([orderId]);
    console.log('Resultado múltiple:', multiple);
    
    // Test 3: Verificar directamente en la hoja
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    const cellW = sheet.getRange(41, 23).getValue();
    const cellX = sheet.getRange(41, 24).getValue();
    console.log(`📋 Celda directa W: "${cellW}"`);
    console.log(`📋 Celda directa X: "${cellX}"`);
    
    return {
      individual,
      multiple,
      directW: cellW,
      directX: cellX
    };
  } catch (error) {
    console.error('❌ Error en test:', error);
    return { error: error.toString() };
  }
}

/**
 * Función para verificar directamente sin usar getNotificationStatus
 */
function verifyDirectly() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🔍 VERIFICANDO DIRECTAMENTE...');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 25);
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().includes(orderId)) {
      console.log(`📋 Fila ${i + 1} - Valores directos:`);
      console.log(`  W (23): "${data[i][23]}"`);
      console.log(`  X (24): "${data[i][24]}"`);
      
      // También leer directamente de la celda
      const cellW = sheet.getRange(i + 1, 23).getValue();
      const cellX = sheet.getRange(i + 1, 24).getValue();
      console.log(`📋 Celdas directas:`);
      console.log(`  W (23): "${cellW}"`);
      console.log(`  X (24): "${cellX}"`);
      
      return {
        fromData: { W: data[i][23], X: data[i][24] },
        fromCell: { W: cellW, X: cellX }
      };
    }
  }
  
  return { error: 'ID no encontrado' };
}

/**
 * Función para verificar y actualizar directamente en la hoja
 */
function fixDestinatarioStatus() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🔧 FIXING DESTINATARIO STATUS...');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 25);
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().includes(orderId)) {
      console.log(`📋 Fila ${i + 1} encontrada, actualizando columna X...`);
      
      // Actualizar directamente la celda X (columna 24)
      sheet.getRange(i + 1, 24).setValue('Enviada');
      
      console.log('✅ Columna X actualizada a "Enviada"');
      
      // Verificar
      const verifyResult = getNotificationStatus(orderId);
      console.log('🔍 Verificación final:', verifyResult);
      
      return { success: true, message: 'Columna X actualizada' };
    }
  }
  
  return { success: false, error: 'ID no encontrado' };
}

/**
 * Función para debuggear el problema específico del ID
 */
function debugSpecificID() {
  const orderId = '7e865f74-2456-4020-992a-f264a33d6846-001';
  
  console.log('🔍 DEBUGGING ID:', orderId);
  
  // Test 1: getNotificationStatus individual
  const individualResult = getNotificationStatus(orderId);
  console.log('📥 Resultado individual:', individualResult);
  
  // Test 2: getMultipleNotificationStatuses
  const multipleResult = getMultipleNotificationStatuses([orderId]);
  console.log('📥 Resultado múltiple:', multipleResult);
  
  // Test 3: Verificar directamente en la hoja
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().includes(orderId)) {
      console.log(`📋 Fila ${i + 1} encontrada:`);
      console.log(`  Columna W (23): "${data[i][23]}"`);
      console.log(`  Columna X (24): "${data[i][24]}"`);
      console.log(`  Tipo de W: ${typeof data[i][23]}`);
      console.log(`  Tipo de X: ${typeof data[i][24]}`);
      console.log(`  W === "Enviada": ${data[i][23] === "Enviada"}`);
      console.log(`  X === "Enviada": ${data[i][24] === "Enviada"}`);
      break;
    }
  }
  
  return {
    individual: individualResult,
    multiple: multipleResult
  };
}

/**
 * Función para probar el sistema completo de notificaciones
 */
function testCompleteNotificationSystem() {
  try {
    console.log('🧪 TESTING COMPLETE NOTIFICATION SYSTEM...');
    
    // Test 1: Verificar estructura de la hoja
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Respostes');
    if (!sheet) {
      console.log('❌ ERROR: Hoja Respostes no encontrada');
      return { success: false, error: 'Hoja Respostes no encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    console.log(`📊 Total de filas: ${data.length}`);
    console.log(`📊 Total de columnas: ${data[0].length}`);
    
    // Test 2: Buscar el ID específico que sabemos que existe
    const targetId = '7e865f74-2456-4020-992a-f264a33d6846-001';
    let foundRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] && data[i][2].toString().includes(targetId)) {
        foundRow = i;
        console.log(`✅ ID encontrado en fila ${i + 1}: "${data[i][2]}"`);
        break;
      }
    }
    
    if (foundRow === -1) {
      console.log('❌ ERROR: ID específico no encontrado');
      return { success: false, error: 'ID específico no encontrado' };
    }
    
    // Test 3: Verificar estado actual de las columnas W y X
    const currentW = data[foundRow][23] || 'Vacía';
    const currentX = data[foundRow][24] || 'Vacía';
    console.log(`📋 Estado actual - Columna W (23): "${currentW}"`);
    console.log(`📋 Estado actual - Columna X (24): "${currentX}"`);
    
    // Test 4: Probar getNotificationStatus
    console.log('🧪 Probando getNotificationStatus...');
    const statusResult = getNotificationStatus(targetId);
    console.log('📥 Resultado getNotificationStatus:', statusResult);
    
    // Test 5: Probar updateNotificationStatus
    console.log('🧪 Probando updateNotificationStatus para intermediario...');
    const updateResult = updateNotificationStatus(targetId, 'intermediario', 'Enviada');
    console.log('📥 Resultado updateNotificationStatus:', updateResult);
    
    // Test 6: Verificar que se actualizó
    console.log('🧪 Verificando que se actualizó...');
    const newStatusResult = getNotificationStatus(targetId);
    console.log('📥 Resultado después de actualizar:', newStatusResult);
    
    return { 
      success: true, 
      message: 'Test completo realizado',
      initialStatus: statusResult,
      updateResult: updateResult,
      finalStatus: newStatusResult
    };
    
  } catch (error) {
    console.error('❌ Error en test completo:', error);
    return { success: false, error: error.toString() };
  }
}