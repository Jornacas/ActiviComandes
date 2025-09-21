// Archivo Code.gs - Lógica del servidor para Comanda de Materiales
/**
 * Información de versión y control de cambios
 * 
 * Versión: 1.1.0
 * Fecha: 11/07/2024
 * 
 * Historial de cambios:
 * - V1.0.0 (29/03/2025): Versión inicial
 * - V1.1.0 (11/07/2024): Corrección de errores en script.html y mejoras en la interfaz de usuario
 */

// Función para servir la página HTML
const AUTH_TOKEN = "comanda_materials_2024"; // Token para la app móvil

function doGet(e) {
  return handleApiRequest(e, 'GET');
}

function doPost(e) {
  const response = handleApiRequest(e, 'POST');
  
  // Add CORS headers for POST requests
  const responseData = JSON.parse(response.getContent());
  return ContentService
    .createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
}

// Handle preflight OPTIONS requests for CORS
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
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
      case 'loadData':
        result = loadRespostesData();
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
      case 'updateDeliveryInfo':
        result = actualizarCentrosDeEntregaYDia();
        break;
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
      case 'createOrder':
        const orderData = e.postData ? JSON.parse(e.postData.contents).orderData : {};
        result = createOrder(orderData);
        break;
      case 'createSollicitud':
        // Handle sollicitud data from mobile app
        let sollicitudData;
        if (e.postData) {
          sollicitudData = JSON.parse(e.postData.contents).sollicitud;
        } else {
          // Extract from URL parameters (for JSONP)
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
        // Handle multiple items sollicitud from cart
        let multipleSollicitudData;
        try {
          if (e.parameter.data) {
            // New approach: JSON data in URL parameter
            multipleSollicitudData = JSON.parse(e.parameter.data);
            console.log('DEBUG: JSON data from URL parameter parsed successfully:', JSON.stringify(multipleSollicitudData));
          } else if (e.postData) {
            // Fallback: POST data
            multipleSollicitudData = JSON.parse(e.postData.contents);
            console.log('DEBUG: POST data parsed successfully:', JSON.stringify(multipleSollicitudData));
          } else {
            // Legacy fallback: individual URL parameters
            console.log('DEBUG: Using individual URL parameters:', JSON.stringify(e.parameter));
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
      case 'createRespostesSheet':
        // Create Respostes sheet with optimized headers
        result = createRespostesSheet();
        break;
      case 'getStats':
        const filters = e.parameter.filters ? JSON.parse(e.parameter.filters) :
                       (e.postData ? JSON.parse(e.postData.contents).filters : {});
        result = obtenerEstadisticasDashboard(filters);
        break;
      case 'getPreparatedOrders':
        // Get orders ready for delivery assignment
        result = getPreparatedOrders();
        break;
      case 'getDeliveryOptions':
        // Get delivery options for selected orders
        const selectedOrders = e.parameter.orders ? JSON.parse(e.parameter.orders) :
                             (e.postData ? JSON.parse(e.postData.contents).orders : []);
        result = getDeliveryOptions(selectedOrders);
        break;
      case 'createDelivery':
        // Create delivery assignment
        const deliveryData = e.parameter.deliveryData ? JSON.parse(e.parameter.deliveryData) :
                           (e.postData ? JSON.parse(e.postData.contents).deliveryData : {});
        result = createDelivery(deliveryData);
        break;
      case 'calculateDistances':
        // Calculate distances from Eixos Creativa
        const addresses = e.parameter.addresses ? JSON.parse(e.parameter.addresses) :
                         (e.postData ? JSON.parse(e.postData.contents).addresses : []);
        result = calculateDistances(addresses);
        break;
      default:
        // If no API action specified, serve the HTML interface (legacy mode)
        if (!action) {
          return HtmlService.createTemplateFromFile('Index')
            .evaluate()
            .setTitle('COMANDA DE MATERIALES')
            .setFaviconUrl('https://www.gstatic.com/script/apps_script_1x_24dp.png')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        }
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

    // JSONP support for errors too
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

// Función para incluir archivos HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Obtener hojas de cálculo y pestañas
function getSpreadsheetData() {
  var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
  var sheet = ss.getSheetByName('Comandes');
  
  if (!sheet) {
    return { error: 'No se encontró la hoja de cálculo' };
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  return {
    headers: headers,
    rows: rows
  };
}

// Cargar datos desde la hoja "dades"
function cargarDatosDades() {
  var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
  var sheet = ss.getSheetByName('dades');
  
  if (!sheet) {
    return { error: 'No se encontró la hoja dades' };
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  // Convertir a array de objetos
  var records = [];
  for (var i = 0; i < rows.length; i++) {
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      record[headers[j]] = rows[i][j];
    }
    records.push(record);
  }
  
  return records;
}

// Cargar datos desde la hoja "ordre_distancia_escoles"
function cargarDatosOrdreDistancia() {
  var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
  var sheet = ss.getSheetByName('ordre_distancia_escoles');
  
  if (!sheet) {
    return { error: 'No se encontró la hoja ordre_distancia_escoles' };
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  // Convertir a array de objetos
  var records = [];
  for (var i = 0; i < rows.length; i++) {
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      record[headers[j]] = rows[i][j];
    }
    records.push(record);
  }
  
  return records;
}

// Guardar datos en la hoja "Comandes"
function guardarDatos(datos) {
  try {
    var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
    var sheet = ss.getSheetByName('Comandes');
    
    if (!sheet) {
      return { error: 'No se encontró la hoja Comandes' };
    }
    
    // Limpiar la hoja
    sheet.clear();
    
    // Escribir datos
    sheet.getRange(1, 1, datos.length, datos[0].length).setValues(datos);
    
    return { success: true, message: 'Datos guardados correctamente' };
  } catch (e) {
    return { error: 'Error al guardar los datos: ' + e.toString() };
  }
}





function getCachedData(sheetName, cacheKey, expirationInSeconds = 3600) { // Default 1 hour
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

function updateRespostesOrderStatus(uuids, newStatus) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");
    
    if (!sheet) {
      return { success: false, error: "La hoja 'Respostes' no existe." };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) { // Only headers or empty
      return { success: false, error: "No hay datos en la hoja 'Respostes' para actualizar." };
    }

    const headers = data[0];
    // Find the correct column indices for Respostes sheet
    const idPedidoIndex = headers.findIndex(h => h === "ID_Pedido");
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const estatIndex = headers.findIndex(h => h === "Estat");
    const dataEstatIndex = headers.findIndex(h => h === "Data_Estat");

    if (idPedidoIndex === -1 && idItemIndex === -1) {
      return { success: false, error: "No se encontraron las columnas de ID en la hoja 'Respostes'." };
    }
    if (estatIndex === -1) {
      return { success: false, error: "La columna 'Estat' no se encontró en la hoja 'Respostes'." };
    }

    let changesMade = 0;
    const currentTimestamp = new Date();
    
    const updatedData = data.map((row, index) => {
      if (index === 0) return row; // Skip headers

      const rowIdPedido = row[idPedidoIndex];
      const rowIdItem = row[idItemIndex];
      
      // Check if any of the provided UUIDs match either ID_Pedido or ID_Item
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

// Legacy function - keep for backward compatibility
function updateOrderStatus(uuids, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Comandes");
  if (!sheet) {
    return { success: false, error: "La hoja 'Comandes' no existe." };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) { // Only headers or empty
    return { success: false, error: "No hay datos en la hoja 'Comandes' para actualizar." };
  }

  const headers = data[0];
  const uuidIndex = headers.findIndex(h => h === "UUID");
  const estadoIndex = headers.findIndex(h => h === "Estado");

  if (uuidIndex === -1) {
    return { success: false, error: "La columna 'UUID' no se encontró en la hoja 'Comandes'." };
  }
  if (estadoIndex === -1) {
    return { success: false, error: "La columna 'Estado' no se encontró en la hoja 'Comandes'." };
  }

  let changesMade = 0;
  const updatedData = data.map((row, index) => {
    if (index === 0) return row; // Skip headers

    const rowUUID = row[uuidIndex];
    if (uuids.includes(rowUUID)) {
      if (row[estadoIndex] !== newStatus) {
        row[estadoIndex] = newStatus;
        changesMade++;
      }
    }
    return row;
  });

  if (changesMade > 0) {
    sheet.getDataRange().setValues(updatedData);
    return { success: true, changesMade: changesMade };
  } else {
    return { success: true, changesMade: 0, message: "No se encontraron cambios para aplicar." };
  }
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
    
    // Count rows with data (excluding headers)
    const totalRows = values.length - 1;
    
    // Count by status for statistics
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

// Legacy function - keep for backward compatibility
function processFormResponses() { // Renamed from sincronizarEntradas
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetComandes = ss.getSheetByName("Comandes");
  let sheetFormResponses = ss.getSheetByName("Respuestas de formulario 1"); // Asume este nombre

  if (!sheetFormResponses) {
    return { success: false, error: "La hoja 'Respuestas de formulario 1' no existe. Asegúrate de que el formulario esté vinculado y tenga respuestas." };
  }

  // Crear la hoja 'Comandes' si no existe
  if (!sheetComandes) {
    sheetComandes = ss.insertSheet("Comandes");
    // Copiar encabezados del formulario a Comandes
    const formHeaders = sheetFormResponses.getRange(1, 1, 1, sheetFormResponses.getLastColumn()).getValues()[0];
    sheetComandes.getRange(1, 1, 1, formHeaders.length).setValues([formHeaders]);
    // Añadir columna de estado si no existe
    if (!formHeaders.includes("Estado")) {
      sheetComandes.getRange(1, formHeaders.length + 1).setValue("Estado");
    }
    // Añadir columna de ID si no existe
    if (!formHeaders.includes("ID")) {
      sheetComandes.getRange(1, formHeaders.length + 2).setValue("ID");
    }
    // Añadir columna de UUID si no existe
    if (!formHeaders.includes("UUID")) {
      sheetComandes.getRange(1, formHeaders.length + 3).setValue("UUID"); // New column for UUID
    }
  }

  const formResponses = sheetFormResponses.getDataRange().getValues();
  if (formResponses.length <= 1) { // Solo encabezados
    return { success: true, nuevosRegistros: 0 };
  }

  const formHeaders = formResponses[0];
  const formRows = formResponses.slice(1);

  const comandesData = sheetComandes.getDataRange().getValues();
  const comandesHeaders = comandesData[0];
  const comandesRows = comandesData.slice(1);

  const timestampIndexForm = formHeaders.findIndex(h => h === "Marca temporal");
  const idIndexComandes = comandesHeaders.findIndex(h => h === "ID");
  const estadoIndexComandes = comandesHeaders.findIndex(h => h === "Estado");
  const uuidIndexComandes = comandesHeaders.findIndex(h => h === "UUID"); // Find UUID column index

  let nuevosRegistros = 0;
  const newRowsToAdd = [];

  formRows.forEach(formRow => {
    const formTimestamp = formRow[timestampIndexForm];
    // Check if a record with this timestamp (or UUID if already present) exists
    const exists = comandesRows.some(comandesRow => 
      (comandesRow[idIndexComandes] === formTimestamp) || // Check by old ID
      (uuidIndexComandes !== -1 && comandesRow[uuidIndexComandes] && comandesRow[uuidIndexComandes] !== '') // Check if UUID already exists
    );

    if (!exists) {
      const newRow = [...formRow];
      // Asegurar que la nueva fila tenga espacio para Estado, ID y UUID
      while (newRow.length < comandesHeaders.length) {
        newRow.push('');
      }
      newRow[idIndexComandes] = formTimestamp; // Asignar timestamp como ID (old behavior)
      if (uuidIndexComandes !== -1) {
        newRow[uuidIndexComandes] = Utilities.getUuid(); // Assign new UUID
      }
      newRowsToAdd.push(newRow);
      nuevosRegistros++;
    }
  });

  if (newRowsToAdd.length > 0) {
    sheetComandes.getRange(comandesData.length + 1, 1, newRowsToAdd.length, comandesHeaders.length).setValues(newRowsToAdd);
  }

  return { success: true, nuevosRegistros: nuevosRegistros };
}

// Función para normalizar una fecha para comparación
function normalizarFechaParaComparacion(fechaStr) {
  if (!fechaStr) return null;
  
  try {
    var fecha;
    // Si es una cadena en formato "dd/mm/yyyy"
    if (typeof fechaStr === 'string' && fechaStr.includes('/')) {
      var partes = fechaStr.split('/');
      if (partes.length === 3) {
        // Convertir a formato YYYY-MM-DD para comparación
        fecha = new Date(partes[2], partes[1] - 1, partes[0]);
      } else {
        fecha = new Date(fechaStr);
      }
    }
    // Formato de texto en español "día, DD de Mes de YYYY"
    else if (typeof fechaStr === 'string' && fechaStr.includes('de')) {
      // Extraer componentes
      var meses = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      
      // Normalizar para procesamiento
      var textoNormalizado = fechaStr.toLowerCase()
        .replace(/,/g, '')  // Quitar comas
        .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u'); // Quitar acentos
      
      // Buscar patrones
      var patronDia = /\b(\d{1,2})\b/;
      var matchDia = textoNormalizado.match(patronDia);
      var dia = matchDia ? parseInt(matchDia[1]) : 1;
      
      var patronMes = null;
      var mes = 0;
      for (var nombreMes in meses) {
        if (textoNormalizado.includes(nombreMes)) {
          mes = meses[nombreMes];
          break;
        }
      }
      
      var patronAño = /\b(20\d{2})\b/;
      var matchAño = textoNormalizado.match(patronAño);
      var año = matchAño ? parseInt(matchAño[1]) : new Date().getFullYear();
      
      fecha = new Date(año, mes, dia);
    }
    // Si es un objeto Date
    else if (fechaStr instanceof Date) {
      fecha = fechaStr;
    }
    // Otros formatos, intentar parseo directo
    else {
      fecha = new Date(fechaStr);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      Logger.log("Fecha inválida para comparación: " + fechaStr);
      return null;
    }
    
    return fecha;
  } catch (e) {
    Logger.log("Error normalizando fecha para comparación: " + e.toString());
    return null;
  }
}

// Función para crear una clave natural de identificación
function crearClaveNatural(nombre, fecha, material, unidades, otrosMateriales) {
  // Normalizamos cada componente
  var nombreNorm = normalizarTexto(nombre);
  var fechaNorm = normalizarFecha(fecha);
  var materialNorm = normalizarTexto(material);
  var unidadesNorm = normalizarNumero(unidades);
  var otrosMatNorm = normalizarTexto(otrosMateriales);
  
  // Construir la clave según los componentes disponibles
  var clave = nombreNorm + "||" + fechaNorm;
  
  if (materialNorm && unidadesNorm) {
    clave += "||mat:" + materialNorm + "||un:" + unidadesNorm;
  } else if (otrosMatNorm) {
    clave += "||otros:" + otrosMatNorm;
  }
  
  return clave;
}

// Normalizar texto (elimina acentos, espacios extra, guiones, etc.)
function normalizarTexto(texto) {
  if (!texto) return '';
  
  return texto.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .toLowerCase()
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios
    .replace(/[-_]/g, ' ') // Reemplazar guiones y guiones bajos
    .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales
    .trim();
}

// Normalizar fecha eliminando variaciones de formato
function normalizarFecha(fecha) {
  if (!fecha) return '';
  
  // Normalización básica
  var fechaNorm = fecha.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .toLowerCase()
    .replace(/^[a-z]+,\s*/, '') // Eliminar día de semana y coma
    .trim();
  
  // Extraer año, mes y día si es posible
  var año = '';
  var mes = '';
  var día = '';
  
  // Intentar extraer el año
  var matchAño = fechaNorm.match(/\b(20\d{2})\b/); // Buscar años como 2024, 2025, etc.
  if (matchAño && matchAño[1]) {
    año = matchAño[1];
  }
  
  // Intentar extraer mes y día de diferentes formatos
  var formatoEspañol = fechaNorm.match(/(\d{1,2})\s+(?:de\s+)?(\w+)/i);
  var formatoISO = fechaNorm.match(/(\d{1,2})\/(\d{1,2})/);
  
  if (formatoEspañol) {
    día = formatoEspañol[1].padStart(2, '0');
    var mesTexto = formatoEspañol[2].toLowerCase();
    
    // Mapeo de nombres de meses a números
    var meses = {
      "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
      "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
      "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
    };
    
    // Buscar por prefijo (por si está acortado)
    for (var nombreMes in meses) {
      if (mesTexto.indexOf(nombreMes.substring(0, 3)) === 0) {
        mes = meses[nombreMes];
        break;
      }
    }
  } else if (formatoISO) {
    día = formatoISO[1].padStart(2, '0');
    mes = formatoISO[2].padStart(2, '0');
  }
  
  // Si tenemos día, mes y año, formato estándar
  if (día && mes && año) {
    return año + "-" + mes + "-" + día;
  } else if (día && mes) {
    // Si falta el año, al menos estandarizar día y mes
    return "xxxx-" + mes + "-" + día;
  } else {
    // Si no se pudo parsear, usar la fecha normalizada
    return fechaNorm.replace(/\s+de\s+/g, '-').replace(/\s+/g, '-');
  }
}

// Normalizar números (unidades)
function normalizarNumero(numero) {
  if (!numero) return '';
  
  // Eliminar caracteres no numéricos excepto dígitos y punto/coma decimal
  return numero.toString()
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '.') // Estandarizar decimal con punto
    .trim();
}

// Función para normalizar un identificador
function normalizarIdentificador(nombre, fecha, material, unidades, otrosMateriales) {
  // Normalizar nombre: eliminar acentos, convertir a minúsculas y quitar espacios extra
  var nombreNorm = nombre || '';
  nombreNorm = nombreNorm.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Reemplazar múltiples espacios con uno solo
    .replace(/[-_]/g, ' ')  // Reemplazar guiones y guiones bajos por espacios
    .trim();
  
  // Normalizar fecha: IMPORTANTE - preservar el año completo para evitar duplicados de años distintos
  var fechaNorm = fecha || '';
  fechaNorm = fechaNorm.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
    .toLowerCase()
    .replace(/^[a-z]+,\s*/, '')  // Eliminar día de semana y coma
    .trim();
    
  // Extraer el año de la fecha para asegurarnos de que forma parte del identificador
  var año = '';
  var matchAño = fechaNorm.match(/\b(20\d{2})\b/); // Buscar años como 2024, 2025, etc.
  if (matchAño && matchAño[1]) {
    año = matchAño[1];
  }
  
  // Crear identificador de fecha que incluya explícitamente el año
  var fechaId = fechaNorm;
  if (año) {
    fechaId = fechaNorm.replace(/\s+/g, ' '); // Normalizar espacios
  } else {
    // Si no se encontró el año, usar la fecha completa normalizada
    fechaId = fechaNorm.replace(/\s+de\s+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Si solo queremos el identificador de persona-fecha
  if (!material && !unidades && !otrosMateriales) {
    return nombreNorm + '-' + fechaId;
  }
  
  // Normalizar material
  var materialNorm = material || '';
  materialNorm = materialNorm.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Reemplazar múltiples espacios con uno solo
    .replace(/[^a-z0-9\s]/g, '')  // Eliminar caracteres especiales
    .trim();
  
  // Normalizar unidades
  var unidadesNorm = unidades || '';
  unidadesNorm = unidadesNorm.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
    .toLowerCase()
    .replace(/\s+/g, '')  // Eliminar espacios
    .trim();
  
  // Normalizar otros materiales
  var otrosMatNorm = otrosMateriales || '';
  otrosMatNorm = otrosMatNorm.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Reemplazar múltiples espacios con uno solo
    .replace(/[^a-z0-9\s]/g, '')  // Eliminar caracteres especiales
    .trim();
  
  // Construir identificador completo
  var identificador = nombreNorm + '-' + fechaId;
  
  if (materialNorm) {
    identificador += '-mat-' + materialNorm;
  }
  
  if (unidadesNorm) {
    identificador += '-un-' + unidadesNorm;
  }
  
  if (otrosMatNorm) {
    identificador += '-otros-' + otrosMatNorm;
  }
  
  return identificador;
}

// Función auxiliar para buscar columnas por coincidencia parcial
function buscarColumnaParcial(headers, texto) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toLowerCase().indexOf(texto.toLowerCase()) !== -1) {
      return i;
    }
  }
  return -1;
}

// Función para formatear la fecha en formato legible
function formatearFecha(fechaString) {
  // Si no hay fecha, retornar cadena vacía
  if (!fechaString) return '';
  
  // Intentar convertir a fecha si es string
  var fecha;
  if (typeof fechaString === 'string') {
    // Intentar varios formatos comunes
    if (fechaString.includes('/')) {
      // Formato dd/mm/yyyy o mm/dd/yyyy
      var partes = fechaString.split('/');
      if (partes.length === 3) {
        // Asumir formato europeo dd/mm/yyyy
        fecha = new Date(partes[2], partes[1] - 1, partes[0]);
      } else {
        // Intentar parsear directamente
        fecha = new Date(fechaString);
      }
    } else {
      // Otros formatos, intentar parseo directo
      fecha = new Date(fechaString);
    }
  } else if (fechaString instanceof Date) {
    fecha = fechaString;
  } else {
    return fechaString.toString();
  }
  
  // Verificar si la fecha es válida
  if (isNaN(fecha.getTime())) {
    return fechaString;
  }
  
  // Abreviaturas de días de la semana en español
  var diasSemanaAbrev = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  
  // Obtener el día de la semana (0=domingo, 1=lunes, etc.)
  var diaSemana = fecha.getDay();
  
  // Formatear fecha en formato español con día de la semana
  var dia = fecha.getDate().toString().padStart(2, '0');
  var mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  // Usar solo los últimos dos dígitos del año para formato compacto
  var año = fecha.getFullYear().toString().substring(2);
  
  return diasSemanaAbrev[diaSemana] + ' ' + dia + '/' + mes + '/' + año;
}

function actualizarCentrosDeEntregaYDia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetComandes = ss.getSheetByName("Comandes");
  // const sheetDades = ss.getSheetByName("dades"); // No longer directly used
  // const sheetOrdreEscoles = ss.getSheetByName("ordre_distancia_escoles"); // No longer directly used

  if (!sheetComandes) {
    return { success: false, error: "Falta la hoja 'Comandes'." };
  }

  // Use cached data for 'dades' and 'ordre_distancia_escoles'
  const dadesData = getCachedData("dades", "cache_dades");
  const ordreEscolesData = getCachedData("ordre_distancia_escoles", "cache_ordre_escoles");

  if (!dadesData || !ordreEscolesData) {
    return { success: false, error: "No se pudieron cargar los datos de configuración (dades, ordre_distancia_escoles)." };
  }

  const comandesData = sheetComandes.getDataRange().getValues();

  if (comandesData.length <= 1) { // Solo encabezados
    return { success: true, cambiosAplicados: 0 };
  }

  const comandesHeaders = comandesData[0];
  const comandesRows = comandesData.slice(1);

  // Encontrar índices de columnas relevantes en Comandes
  const escuelaIdx = comandesHeaders.findIndex(h => h === "Escuela");
  const centroEntregaIdx = comandesHeaders.findIndex(h => h === "Centro de Entrega");
  const diaEntregaIdx = comandesHeaders.findIndex(h => h === "Día de Entrega");

  if (escuelaIdx === -1 || centroEntregaIdx === -1 || diaEntregaIdx === -1) {
    return { success: false, error: "Faltan columnas 'Escuela', 'Centro de Entrega' o 'Día de Entrega' en la hoja 'Comandes'." };
  }

  // Mapear datos de configuración
  const centrosPorEscuela = {}; // { 'Escuela A': 'Centro X' }
  dadesData.slice(1).forEach(row => {
    if (row[0] && row[1]) { // Columna A: Escuela, Columna B: Centro de Entrega
      centrosPorEscuela[row[0].toString().trim()] = row[1].toString().trim();
    }
  });

  const diasPorCentro = {}; // { 'Centro X': 'Lunes' }
  ordreEscolesData.slice(1).forEach(row => {
    if (row[0] && row[1]) { // Columna A: Centro de Entrega, Columna B: Día de Entrega
      diasPorCentro[row[0].toString().trim()] = row[1].toString().trim();
    }
  });

  let cambiosAplicados = 0;
  const updatedRows = comandesRows.map(row => {
    const escuela = row[escuelaIdx] ? row[escuelaIdx].toString().trim() : '';
    let centroEntrega = row[centroEntregaIdx] ? row[centroEntregaIdx].toString().trim() : '';
    let diaEntrega = row[diaEntregaIdx] ? row[diaEntregaIdx].toString().trim() : '';
    let changed = false;

    // Asignar Centro de Entrega
    if (escuela && centrosPorEscuela[escuela] && centroEntrega !== centrosPorEscuela[escuela]) {
      row[centroEntregaIdx] = centrosPorEscuela[escuela];
      centroEntrega = centrosPorEscuela[escuela]; // Actualizar para el siguiente paso
      changed = true;
    }

    // Asignar Día de Entrega
    if (centroEntrega && diasPorCentro[centroEntrega] && diaEntrega !== diasPorCentro[centroEntrega]) {
      row[diaEntregaIdx] = diasPorCentro[centroEntrega];
      changed = true;
    }

    if (changed) {
      cambiosAplicados++;
    }
    return row;
  });

  // Escribir los datos actualizados de vuelta a la hoja
  sheetComandes.getRange(2, 1, updatedRows.length, comandesHeaders.length).setValues(updatedRows);

  return { success: true, cambiosAplicados: cambiosAplicados };
}

function getSchools() {
  const data = getCachedData("Dades", "cache_dades_schools");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades d'escoles de la hoja 'Dades'." };
  }

  // Extract schools from column A (index 0), skip headers
  const schools = data.slice(1) // Skip headers
                      .filter(row => row[0] && row[0].toString().trim() !== '') // Filter out empty rows
                      .map(row => row[0].toString().trim()); // Get first column and trim

  // Remove duplicates and sort alphabetically
  const uniqueSchools = [...new Set(schools)].sort((a, b) => a.localeCompare(b, 'ca'));

  return { success: true, data: uniqueSchools };
}

function getActivities() {
  const data = getCachedData("Dades", "cache_dades_activities");
  if (!data) {
    return { success: false, error: "No es van poder carregar les dades d'activitats de la hoja 'Dades'." };
  }

  // Extract activities from column F (index 5), skip headers
  const activities = data.slice(1) // Skip headers
                         .filter(row => row[5] && row[5].toString().trim() !== '') // Filter out empty rows
                         .map(row => row[5].toString().trim()); // Get column F and trim

  // Remove duplicates and sort alphabetically
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

  // Extract activities for the specific school
  // Column A (index 0) = Escola, Column F (index 5) = Activitat
  const schoolActivities = data.slice(1) // Skip headers
                              .filter(row => {
                                const escola = row[0] ? row[0].toString().trim() : '';
                                const activitat = row[5] ? row[5].toString().trim() : '';
                                return escola === schoolName && activitat !== '';
                              })
                              .map(row => row[5].toString().trim()); // Get column F (activitat) and trim

  // Remove duplicates and sort alphabetically
  const uniqueActivities = [...new Set(schoolActivities)].sort((a, b) => a.localeCompare(b, 'ca'));

  return {
    success: true,
    data: uniqueActivities,
    school: schoolName,
    count: uniqueActivities.length
  };
}

function getMonitors() {
  const data = getCachedData("dades", "cache_dades_monitors");
  if (!data) {
    return { success: false, error: "No se pudieron cargar los datos de monitores de la hoja 'dades'." };
  }
  
  // Assuming monitors are in the second column of 'dades' (adjust if needed)
  const monitors = data.slice(1) // Skip headers
                       .filter(row => row[1]) // Filter out empty rows
                       .map(row => row[1].toString().trim()); // Get second column and trim
  
  // Remove duplicates
  const uniqueMonitors = [...new Set(monitors)];
  
  return { success: true, data: uniqueMonitors };
}

function getMaterials() {
  const data = getCachedData("Materiales", "cache_materials");
  if (!data) {
    return { success: false, error: "No se pudieron cargar los datos de materiales de la hoja 'Materiales'. Asegúrate de que la hoja exista y contenga datos." };
  }

  // Assuming materials are in the first column of 'Materiales'
  const materials = data.slice(1) // Skip headers
                       .filter(row => row[0]) // Filter out empty rows
                       .map(row => row[0].toString().trim()); // Get first column and trim

  // Remove duplicates
  const uniqueMaterials = [...new Set(materials)];

  return { success: true, data: uniqueMaterials };
}

function getMaterialsByActivity(activityCode) {
  if (!activityCode) {
    return { success: false, error: "No s'ha proporcionat el codi d'activitat" };
  }

  // Parse activity code to get base activity (DX2A -> DX2, HC1B -> HC1, etc.)
  const baseActivity = parseActivityCode(activityCode);

  if (!baseActivity) {
    return { success: false, error: "Codi d'activitat no reconegut: " + activityCode };
  }

  // Map activity to sheet and column
  const sheetConfig = getSheetConfigForActivity(baseActivity);

  if (!sheetConfig) {
    return { success: false, error: "No s'ha trobat configuració per a l'activitat: " + baseActivity };
  }

  // Load data from the appropriate sheet
  const data = getCachedData(sheetConfig.sheetName, `cache_materials_${baseActivity}`);

  if (!data) {
    return { success: false, error: `No s'ha pogut carregar la hoja '${sheetConfig.sheetName}' per a l'activitat ${baseActivity}` };
  }

  // Extract materials from the specified column
  const columnIndex = sheetConfig.column === 'A' ? 0 : 1; // A=0, B=1
  const materials = data.slice(1) // Skip headers
                       .filter(row => row[columnIndex] && row[columnIndex].toString().trim() !== '') // Filter out empty rows
                       .map(row => row[columnIndex].toString().trim()); // Get specified column and trim

  // Remove duplicates and sort
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
  // Remove any trailing letters/numbers to get base activity
  // DX2A -> DX2, HC1B -> HC1, CO -> CO, etc.
  const matches = activityCode.match(/^([A-Z]+\d*)/);
  return matches ? matches[1] : null;
}

function getSheetConfigForActivity(baseActivity) {
  // Define mapping of base activities to their material sheets and columns
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

function createOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Comandes");
  if (!sheet) {
    return { success: false, error: "La hoja 'Comandes' no existe." };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = new Array(headers.length).fill(''); // Initialize with empty strings

  const uuid = Utilities.getUuid();
  const timestamp = new Date(); // Use current timestamp for "Marca temporal"

  // Map orderData to sheet columns
  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase().trim();
    if (headerLower === "uuid") {
      newRow[index] = uuid;
    } else if (headerLower === "marca temporal") {
      newRow[index] = timestamp;
    } else if (headerLower === "estado") {
      newRow[index] = orderData.estado || "Pendiente"; // Default status
    } else if (orderData[headerLower] !== undefined) {
      newRow[index] = orderData[headerLower];
    }
  });

  sheet.appendRow(newRow); // Append the new row

  return { success: true, uuid: uuid, message: "Pedido creado exitosamente." };
}

function createSollicitud(sollicitudData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Respostes");

  // If Respostes sheet doesn't exist, create it
  if (!sheet) {
    sheet = ss.insertSheet("Respostes");
    // Set headers for the mobile app solicitud
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

  // Create new row with sollicitud data
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
    'Pendent' // Default status
  ];

  sheet.appendRow(newRow);

  return {
    success: true,
    data: {
      message: 'Sol·licitud enviada correctament!',
      id: uuid
    }
  };
}

function createMultipleSollicitud(data) {
  console.log('DEBUG createMultipleSollicitud - Data received:', JSON.stringify(data));
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Respostes");

  // If Respostes sheet doesn't exist, create it with optimized headers
  if (!sheet) {
    sheet = ss.insertSheet("Respostes");
    setupRespostesHeaders(sheet);
  }

  // Validate input data
  if (!data || typeof data !== 'object') {
    console.error('ERROR: data is not valid object:', data);
    return {
      success: false,
      error: 'Dades no vàlides rebudes'
    };
  }

  if (!data.items || !Array.isArray(data.items)) {
    console.error('ERROR: data.items is not valid array:', data.items);
    return {
      success: false,
      error: 'Llista d\'ítems no vàlida'
    };
  }

  if (data.items.length === 0) {
    console.error('ERROR: No items in cart');
    return {
      success: false,
      error: 'No hi ha ítems al carret'
    };
  }

  const timestamp = new Date();
  const baseUuid = Utilities.getUuid();
  const addedItems = [];

  try {
    // Process each item in the cart
    data.items.forEach((item, index) => {
      const itemUuid = `${baseUuid}-${String(index + 1).padStart(3, '0')}`;
      
      // Determine material name and if it's custom
      const materialName = item.customMaterial || item.material;
      const isCustomMaterial = item.customMaterial ? "TRUE" : "FALSE";
      
      // Create row for each item with new structure
      const newRow = [
        timestamp,                    // A: Timestamp
        baseUuid,                     // B: ID_Pedido (common for all items)
        itemUuid,                     // C: ID_Item (unique per item)
        data.nomCognoms || '',        // D: Nom_Cognoms
        data.dataNecessitat || '',    // E: Data_Necessitat
        item.escola || '',            // F: Escola
        item.activitat || '',         // G: Activitat
        materialName,                 // H: Material
        isCustomMaterial,             // I: Es_Material_Personalitzat
        item.unitats || 0,            // J: Unitats
        data.altresMaterials || '',   // K: Comentaris_Generals
        'Pendent',                    // L: Estat
        timestamp,                    // M: Data_Estat
        '',                           // N: Responsable_Preparacio
        ''                            // O: Notes_Internes
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
        message: `Sol·licitud múltiple enviada correctament! ${data.items.length} materials sol·licitats.`,
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
      error: `Error processant la sol·licitud múltiple: ${error.toString()}`
    };
  }
}

function loadRespostesData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Respostes");
    
    // If Respostes sheet doesn't exist, create it
    if (!sheet) {
      sheet = ss.insertSheet("Respostes");
      setupRespostesHeaders(sheet);
      return {
        success: true,
        data: {
          headers: [
            "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
            "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
            "comentarisGenerals", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
          ],
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      // Only headers exist
      return {
        success: true,
        data: {
          headers: [
            "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
            "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
            "comentarisGenerals", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
          ],
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      };
    }
    
    // Remove headers row
    const rows = values.slice(1);
    
    // Calculate statistics
    const stats = {
      total: rows.length,
      pendents: rows.filter(row => row[11] === 'Pendent').length,
      enProces: rows.filter(row => row[11] === 'En proces').length,
      preparats: rows.filter(row => row[11] === 'Preparat').length,
      entregats: rows.filter(row => row[11] === 'Entregat').length
    };
    
    return {
      success: true,
      data: {
        headers: [
          "timestamp", "idPedido", "idItem", "nomCognoms", "dataNecessitat",
          "escola", "activitat", "material", "esMaterialPersonalitzat", "unitats",
          "comentarisGenerals", "estat", "dataEstat", "responsablePreparacio", "notesInternes"
        ],
        rows: rows,
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
  // Set optimized headers for cart system
  const headers = [
    "Timestamp",
    "ID_Pedido",
    "ID_Item", 
    "Nom_Cognoms",
    "Data_Necessitat",
    "Escola",
    "Activitat",
    "Material",
    "Es_Material_Personalitzat",
    "Unitats",
    "Comentaris_Generals",
    "Estat",
    "Data_Estat",
    "Responsable_Preparacio",
    "Notes_Internes"
  ];
  
  // Set headers in first row
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  
  // Set column widths for better readability
  sheet.setColumnWidth(1, 150);  // Timestamp
  sheet.setColumnWidth(2, 120);  // ID_Pedido
  sheet.setColumnWidth(3, 120);  // ID_Item
  sheet.setColumnWidth(4, 150);  // Nom_Cognoms
  sheet.setColumnWidth(5, 120);  // Data_Necessitat
  sheet.setColumnWidth(6, 120);  // Escola
  sheet.setColumnWidth(7, 100);  // Activitat
  sheet.setColumnWidth(8, 150);  // Material
  sheet.setColumnWidth(9, 80);   // Es_Material_Personalitzat
  sheet.setColumnWidth(10, 80);  // Unitats
  sheet.setColumnWidth(11, 200); // Comentaris_Generals
  sheet.setColumnWidth(12, 100); // Estat
  sheet.setColumnWidth(13, 150); // Data_Estat
  sheet.setColumnWidth(14, 150); // Responsable_Preparacio
  sheet.setColumnWidth(15, 200); // Notes_Internes
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  return sheet;
}

function createRespostesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check if Respostes sheet already exists
  let sheet = ss.getSheetByName("Respostes");
  if (sheet) {
    return { 
      success: false, 
      error: "La hoja 'Respostes' ya existe. Elimínala primero si quieres recrearla." 
    };
  }
  
  // Create new sheet
  sheet = ss.insertSheet("Respostes");
  setupRespostesHeaders(sheet);
  
  return { 
    success: true, 
    data: { 
      message: "Hoja 'Respostes' creada correctamente con encabezados optimizados.",
      sheetName: "Respostes",
      headers: 15
    } 
  };
}

// Función para normalizar nombres (como en Python)
function normalizarNombre(nombre) {
  if (!nombre) return '';
  
  // Eliminar acentos
  var nombreSinAcentos = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Convertir a minúsculas
  var nombreMin = nombreSinAcentos.toLowerCase();
  
  // Eliminar espacios extra
  nombreMin = nombreMin.replace(/\s+/g, ' ').trim();
  
  // Tomar solo las dos primeras palabras si hay más de dos
  var partesNombre = nombreMin.split(' ');
  if (partesNombre.length > 2) {
    nombreMin = partesNombre.slice(0, 2).join(' ');
  }
  
  return nombreMin;
}

// Función para encontrar la escuela más cercana (como en Python)
function encontrarEscuelaMasCercana(escuelas, datosOrden, academiaIndex) {
  if (!escuelas || escuelas.length === 0 || academiaIndex === -1) {
    return null;
  }
  
  var escuelaMasCercana = null;
  var distanciaMasCercana = Number.MAX_SAFE_INTEGER;
  
  for (var i = 0; i < escuelas.length; i++) {
    var escuela = escuelas[i];
    
    // Encontrar índice de esta escuela en los datos de orden
    var escuelaIndex = -1;
    for (var j = 0; j < datosOrden.length; j++) {
      if (datosOrden[j].Escola === escuela) {
        escuelaIndex = j;
        break;
      }
    }
    
    if (escuelaIndex !== -1) {
      var distancia = Math.abs(escuelaIndex - academiaIndex);
      if (distancia < distanciaMasCercana) {
        distanciaMasCercana = distancia;
        escuelaMasCercana = escuela;
      }
    }
  }
  
  return escuelaMasCercana;
}

/**
 * Busca una columna que contenga el texto parcial especificado
 */
function buscarColumnaParcial(headers, textoParcial) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().toLowerCase().includes(textoParcial.toLowerCase())) {
      return i;
    }
  }
  return -1; // No encontrado
}

/**
 * Función de diagnóstico para comprobar el acceso a las hojas de cálculo
 * Esta función verificará explícitamente cada paso del proceso de carga de datos
 */
function diagnosticarHojaCalculo() {
  var resultados = {
    acceso_spreadsheet: false,
    hoja_Comandes_existe: false,
    contenido_Comandes: [],
    error: null
  };
  
  try {
    // 1. Comprobar acceso a la hoja de cálculo
    var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
    
    if (ss) {
      resultados.acceso_spreadsheet = true;
      resultados.nombre_spreadsheet = ss.getName();
      
      // 2. Comprobar acceso a la hoja "Comandes"
      var sheetComandes = ss.getSheetByName('Comandes');
      
      if (sheetComandes) {
        resultados.hoja_Comandes_existe = true;
        
        // 3. Intentar leer datos
        try {
          var datos = sheetComandes.getDataRange().getValues();
          resultados.contenido_Comandes = datos.length > 0 ? 
            { filas: datos.length, columnas: datos[0].length, muestra: datos.slice(0, Math.min(3, datos.length)) } : 
            "Hoja vacía";
        } catch (dataError) {
          resultados.error_lectura = dataError.toString();
        }
      } else {
        // Si no existe, listar todas las hojas disponibles
        resultados.todas_hojas = ss.getSheets().map(function(sheet) {
          return sheet.getName();
        });
      }
    }
    
    return resultados;
  } catch (e) {
    resultados.error = e.toString();
    return resultados;
  }
}

/**
 * Función de compatibilidad para mantener el código cliente existente
 * Esta función simplemente llama a loadData()
 */
function obtenerDatos(mantenerPosicion) {
  console.log("Función obtenerDatos llamada con mantenerPosicion =", mantenerPosicion);
  var resultado = loadData(mantenerPosicion);
  
  // Verificar la estructura del resultado para asegurar compatibilidad
  console.log("Estructura devuelta por loadData:", 
               "success: " + (resultado.success !== undefined), 
               "headers: " + (resultado.headers !== undefined), 
               "rows: " + (resultado.rows !== undefined), 
               "estadisticas: " + (resultado.estadisticas !== undefined));
  
  return resultado;
}

/**
 * Función para cargar datos para la interfaz con mejor manejo de errores
 */
function loadData(mantenerPosicion) {
  try {
    Logger.log("Iniciando carga de datos");
    
    // Primero, ejecutar un diagnóstico completo
    var diagnostico = diagnosticarHojaCalculo();
    Logger.log("Diagnóstico: " + JSON.stringify(diagnostico));
    
    // Si hay un error general en el diagnóstico, devolver ese error
    if (diagnostico.error) {
      return { 
        error: 'Error al diagnosticar la hoja de cálculo: ' + diagnostico.error, 
        success: false,
        rows: [],
        headers: ["Error de diagnóstico", "Contacte al administrador"],
        diagnostico: diagnostico,
        estadisticas: {
          total: 0,
          pendientes: 0,
          preparados: 0,
          entregados: 0,
          enProceso: 0
        }
      };
    }
    
    // Si no hay acceso a la hoja de cálculo
    if (!diagnostico.acceso_spreadsheet) {
      return { 
        error: 'No se pudo acceder a la hoja de cálculo', 
        success: false,
        rows: [],
        headers: ["ID", "NOMBRE", "FECHA", "ESTADO"],
        diagnostico: diagnostico,
        estadisticas: {
          total: 0,
          pendientes: 0,
          preparados: 0,
          entregados: 0,
          enProceso: 0
        }
      };
    }
    
    // Si no existe la hoja "Comandes"
    if (!diagnostico.hoja_Comandes_existe) {
      // Obtener la hoja de cálculo
      var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
      
      // Crear la hoja "Comandes" si no existe
      if (ss) {
        try {
          var nuevaHoja = ss.insertSheet('Comandes');
          
          // Crear encabezados básicos
          var headersBasicos = ["ID", "NOMBRE Y APELLIDO", "FECHA NECESIDAD", "ESCUELA", "ACTIVIDAD", 
                            "MATERIAL", "UNIDADES", "OTROS MATERIALES", "CENTRO ENTREGA", "DIA ENTREGA", "ESTADO"];
          nuevaHoja.getRange(1, 1, 1, headersBasicos.length).setValues([headersBasicos]);
          
          return { 
            mensaje: 'Se creó la hoja "Comandes" con encabezados básicos. Use el botón Sincronizar para agregar datos.', 
            success: true,
            headers: headersBasicos,
            rows: [],
            estadisticas: {
              total: 0,
              pendientes: 0,
              preparados: 0,
              entregados: 0,
              enProceso: 0
            }
          };
        } catch (creationError) {
          return { 
            error: 'No se pudo crear la hoja "Comandes": ' + creationError.toString(), 
            success: false,
            rows: [],
            headers: ["ID", "NOMBRE", "FECHA", "ESTADO"],
            diagnostico: diagnostico,
            estadisticas: {
              total: 0,
              pendientes: 0,
              preparados: 0,
              entregados: 0,
              enProceso: 0
            }
          };
        }
      }
      
      return { 
        error: 'No existe la hoja "Comandes" y no se pudo crear', 
        success: false,
        rows: [],
        headers: ["ID", "NOMBRE", "FECHA", "ESTADO"],
        diagnostico: diagnostico,
        estadisticas: {
          total: 0,
          pendientes: 0,
          preparados: 0,
          entregados: 0,
          enProceso: 0
        }
      };
    }
    
    // Si llegamos aquí, intentar obtener los datos normalmente
    var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
    var sheetComandes = ss.getSheetByName('Comandes');
    
    // Obtener datos
    var datos = sheetComandes.getDataRange().getValues();
    
    // Si la hoja está vacía o solo tiene encabezados
    if (datos.length === 0) {
      // Crear encabezados básicos
      var headersBasicos = ["ID", "NOMBRE Y APELLIDO", "FECHA NECESIDAD", "ESCUELA", "ACTIVIDAD", 
                        "MATERIAL", "UNIDADES", "OTROS MATERIALES", "CENTRO ENTREGA", "DIA ENTREGA", "ESTADO"];
      sheetComandes.getRange(1, 1, 1, headersBasicos.length).setValues([headersBasicos]);
      
      return { 
        mensaje: 'La hoja "Comandes" estaba vacía. Se agregaron encabezados básicos. Use el botón Sincronizar para agregar datos.', 
        success: true,
        headers: headersBasicos,
        rows: [],
        estadisticas: {
          total: 0,
          pendientes: 0,
          preparados: 0,
          entregados: 0,
          enProceso: 0
        }
      };
    } else if (datos.length === 1) {
      // Solo tiene encabezados
      return { 
        mensaje: 'La hoja solo contiene encabezados. Use el botón Sincronizar para agregar datos del formulario.', 
        success: true,
        headers: datos[0],
        rows: [],
        estadisticas: {
          total: 0,
          pendientes: 0,
          preparados: 0,
          entregados: 0,
          enProceso: 0
        }
      };
    }
    
    // Si llegamos aquí, tenemos datos válidos
    Logger.log("Datos obtenidos: " + datos.length + " filas");
    
    // Calcular estadísticas
    var estadisticas = {
      total: datos.length - 1, // Restar fila de encabezados
      pendientes: 0,
      preparados: 0,
      entregados: 0,
      enProceso: 0
    };
    
    // Determinar índice de la columna de estado
    var headers = datos[0];
    var estadoIdx = -1;
    
    // Buscar la columna de ESTADO usando diferentes métodos
    for (var i = 0; i < headers.length; i++) {
      var headerName = headers[i] ? headers[i].toString().toUpperCase() : '';
      if (headerName === 'ESTADO') {
        estadoIdx = i;
        break;
      }
    }
    
    if (estadoIdx === -1) {
      Logger.log("Columna ESTADO no encontrada, buscando por texto parcial");
      for (var i = 0; i < headers.length; i++) {
        var headerName = headers[i] ? headers[i].toString().toUpperCase() : '';
        if (headerName.indexOf('ESTADO') !== -1) {
          estadoIdx = i;
          break;
        }
      }
    }
    
    if (estadoIdx === -1) {
      estadoIdx = headers.length - 1; // Última columna si no se encuentra
      Logger.log("Columna ESTADO no encontrada, usando última columna: " + estadoIdx);
    } else {
      Logger.log("Columna ESTADO encontrada en índice: " + estadoIdx);
    }
    
    // Calcular estadísticas, excluyendo fila de encabezados
    for (var i = 1; i < datos.length; i++) {
      var estado = datos[i][estadoIdx];
      if (!estado) {
        estadisticas.pendientes++;
      } else if (estado === 'Preparado') {
        estadisticas.preparados++;
      } else if (estado === 'Entregado') {
        estadisticas.entregados++;
      } else if (estado === 'En proceso') {
        estadisticas.enProceso++;
      } else {
        estadisticas.pendientes++;
      }
    }
    
    Logger.log("Estadísticas calculadas: " + JSON.stringify(estadisticas));
    
    // Formatear fechas para mejor visualización
    var fechaIdx = -1;
    for (var i = 0; i < headers.length; i++) {
      var headerName = headers[i] ? headers[i].toString().toUpperCase() : '';
      if (headerName === 'FECHA NECESIDAD' || headerName.indexOf('FECHA') !== -1) {
        fechaIdx = i;
        break;
      }
    }
    
    if (fechaIdx !== -1) {
      Logger.log("Formateando fechas en columna " + fechaIdx);
      for (var i = 1; i < datos.length; i++) {
        if (datos[i][fechaIdx]) {
          datos[i][fechaIdx] = formatearFecha(datos[i][fechaIdx]);
        }
      }
    }
    
    Logger.log("Finalizada carga de datos con éxito. Devolviendo " + datos.length + " filas");
    
    // Preparar estructura de datos compatible con lo que espera el cliente
    var headers = datos[0];
    var rows = datos.slice(1);
    
    // Asegurar que el objeto de retorno sea lo más simple posible para evitar problemas de serialización
    var response = {
      success: true,
      headers: headers,
      rows: rows,
      estadisticas: {
        total: estadisticas.total,
        pendientes: estadisticas.pendientes,
        preparados: estadisticas.preparados,
        enProceso: estadisticas.enProceso,
        entregados: estadisticas.entregados
      }
    };
    
    // Convertir a JSON y volver a objeto para asegurar que sea serializable
    // Esto es una técnica para evitar errores de serialización en Google Apps Script
    try {
      var jsonString = JSON.stringify(response);
      var purgedObject = JSON.parse(jsonString);
      
      // Verificar que los datos estén completos después de la serialización
      if (!purgedObject.rows || !purgedObject.headers || !purgedObject.estadisticas) {
        throw new Error("La serialización eliminó datos importantes");
      }
      
      return purgedObject;
    } catch (serializationError) {
      Logger.log("Error al serializar respuesta: " + serializationError);
      
      // Fallback: devolver solo datos esenciales si hay problemas de serialización
      return {
        success: true,
        headers: headers,
        rows: rows.slice(0, Math.min(rows.length, 1000)), // Limitar a 1000 filas para evitar problemas
        mensaje: "Datos cargados con limitaciones debido a problemas de serialización",
        estadisticas: {
          total: estadisticas.total,
          pendientes: estadisticas.pendientes,
          preparados: estadisticas.preparados,
          enProceso: estadisticas.enProceso,
          entregados: estadisticas.entregados
        }
      };
    }
    
  } catch (e) {
    var errorMsg = "Error en loadData: " + e.toString();
    Logger.log(errorMsg);
    
    // Registrar propiedades adicionales del error para diagnóstico
    if (e.stack) {
      Logger.log("Stack trace: " + e.stack);
    }
    
    // Siempre devolver un objeto estructurado, nunca null
    return { 
      error: errorMsg, 
      success: false,
      headers: ["Error al cargar datos"],
      rows: [[e.toString()]],
      estadisticas: {
        total: 0,
        pendientes: 0,
        preparados: 0,
        entregados: 0,
        enProceso: 0
      }
    };
  }
}

// Función para obtener datos estadísticos para el dashboard
function obtenerEstadisticasDashboard(filtros) {
  try {
    console.log("Obteniendo estadísticas del dashboard con filtros:", filtros);
    
    // Inicializar filtros si no se proporcionan
    filtros = filtros || {};
    var fechaInicio = filtros.fechaInicio ? new Date(filtros.fechaInicio) : null;
    var fechaFin = filtros.fechaFin ? new Date(filtros.fechaFin) : null;
    var escuela = filtros.escuela || null;
    var monitor = filtros.monitor || null;
    var material = filtros.material || null;
    var actividad = filtros.actividad || null;
    
    var ss = SpreadsheetApp.openById('1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw');
    var sheetComandes = ss.getSheetByName('Comandes');
    
    if (!sheetComandes) {
      return { 
        success: false,
        message: 'No se encontró la hoja Comandes' 
      };
    }
    
    var datosComandes = sheetComandes.getDataRange().getValues();
    
    if (datosComandes.length <= 1) {
      return {
        success: false,
        message: 'No hay suficientes datos para generar estadísticas'
      };
    }
    
    var headers = datosComandes[0];
    var filas = datosComandes.slice(1);
    
    // Obtener índices relevantes
    var nombreIdx = buscarColumnaParcial(headers, 'NOMBRE');
    var escuelaIdx = buscarColumnaParcial(headers, 'ESCUELA');
    var fechaIdx = buscarColumnaParcial(headers, 'FECHA');
    var materialIdx = buscarColumnaParcial(headers, 'MATERIAL');
    var unidadesIdx = buscarColumnaParcial(headers, 'UNIDADES');
    var otrosMatIdx = buscarColumnaParcial(headers, 'OTROS');
    var estadoIdx = buscarColumnaParcial(headers, 'ESTADO');
    var actividadIdx = buscarColumnaParcial(headers, 'ACTIVIDAD');
    
    console.log("Índices de columnas:", {
      nombre: nombreIdx,
      escuela: escuelaIdx, 
      fecha: fechaIdx, 
      material: materialIdx, 
      unidades: unidadesIdx, 
      otrosMateriales: otrosMatIdx,
      actividad: actividadIdx,
      estado: estadoIdx
    });
    
    // Contadores y estructuras de datos para estadísticas
    var monitorasPorFrecuencia = {};
    var materialesPorFrecuencia = {};
    var escuelasPorFrecuencia = {};
    var actividadesPorFrecuencia = {};
    var materialesPorEscuela = {};
    var unidadesTotales = 0;
    var materialesMasSolicitados = {};
    var materialesPorMes = {};
    var totalPedidosPorMes = {};
    
    // Estadísticas por estado
    var estadisticasEstado = {
      pendientes: 0,
      preparados: 0,
      enProceso: 0,
      entregados: 0
    };
    
    // Filas después de aplicar filtros
    var filasFiltradas = 0;
    
    // Procesar cada fila para extraer estadísticas
    filas.forEach(function(fila) {
      // Extraer datos
      var nombre = fila[nombreIdx] || 'Desconocido';
      var escuelaFila = fila[escuelaIdx] || 'Desconocida';
      var fechaFila = fila[fechaIdx] ? new Date(fila[fechaIdx]) : null;
      var material = fila[materialIdx] || '';
      var unidades = fila[unidadesIdx] ? parseInt(fila[unidadesIdx]) : 0;
      var otrosMateriales = fila[otrosMatIdx] || '';
      var actividad = actividadIdx !== -1 ? fila[actividadIdx] || '' : '';
      var estado = fila[estadoIdx] || '';
      
      // Aplicar filtros
      var pasaFiltros = true;
      
      // Filtro de fecha inicio
      if (fechaInicio && fechaFila && fechaFila < fechaInicio) {
        pasaFiltros = false;
      }
      
      // Filtro de fecha fin
      if (fechaFin && fechaFila && fechaFila > fechaFin) {
        pasaFiltros = false;
      }
      
      // Filtro de escuela
      if (escuela && escuelaFila && escuelaFila.toString().toLowerCase() !== escuela.toString().toLowerCase()) {
        pasaFiltros = false;
      }
      
      // Filtro de monitor
      if (monitor && nombre && nombre.toString().toLowerCase() !== monitor.toString().toLowerCase()) {
        pasaFiltros = false;
      }
      
      // Filtro de material
      if (material && fila[materialIdx] && fila[materialIdx].toString().toLowerCase() !== material.toString().toLowerCase()) {
        pasaFiltros = false;
      }
      
      // Filtro de actividad
      if (actividad && actividadIdx !== -1 && fila[actividadIdx] && 
          fila[actividadIdx].toString().toLowerCase() !== actividad.toString().toLowerCase()) {
        pasaFiltros = false;
      }
      
      // Si no pasa filtros, omitir esta fila
      if (!pasaFiltros) {
        return;
      }
      
      // Incrementar contador de filas filtradas
      filasFiltradas++;
      
      // Contar por monitora
      monitorasPorFrecuencia[nombre] = (monitorasPorFrecuencia[nombre] || 0) + 1;
      
      // Contar por escuela
      escuelasPorFrecuencia[escuelaFila] = (escuelasPorFrecuencia[escuelaFila] || 0) + 1;
      
      // Contar por actividad
      if (actividad) {
        actividadesPorFrecuencia[actividad] = (actividadesPorFrecuencia[actividad] || 0) + 1;
      }
      
      // Contar por material
      if (material) {
        materialesPorFrecuencia[material] = (materialesPorFrecuencia[material] || 0) + 1;
        
        // También contar unidades si es posible
        if (!isNaN(unidades)) {
          unidadesTotales += unidades;
          materialesMasSolicitados[material] = (materialesMasSolicitados[material] || 0) + unidades;
        }
      }
      
      // Contar otros materiales (separados por comas)
      if (otrosMateriales) {
        var otrosItems = otrosMateriales.split(',').map(function(item) { return item.trim(); });
        otrosItems.forEach(function(item) {
          if (item) {
            materialesPorFrecuencia[item] = (materialesPorFrecuencia[item] || 0) + 1;
          }
        });
      }
      
      // Estadísticas por mes
      if (fechaFila && !isNaN(fechaFila.getTime())) {
        var mes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][fechaFila.getMonth()];
        var año = fechaFila.getFullYear();
        var mesAño = mes + ' ' + año;
        
        totalPedidosPorMes[mesAño] = (totalPedidosPorMes[mesAño] || 0) + 1;
        
        if (material) {
          if (!materialesPorMes[mesAño]) {
            materialesPorMes[mesAño] = {};
          }
          materialesPorMes[mesAño][material] = (materialesPorMes[mesAño][material] || 0) + 1;
        }
      }
      
      // Materiales por escuela
      if (material && escuelaFila) {
        if (!materialesPorEscuela[escuelaFila]) {
          materialesPorEscuela[escuelaFila] = {};
        }
        materialesPorEscuela[escuelaFila][material] = (materialesPorEscuela[escuelaFila][material] || 0) + 1;
      }
      
      // Contar por estado
      if (!estado) {
        estadisticasEstado.pendientes++;
      } else if (estado === 'Preparado') {
        estadisticasEstado.preparados++;
      } else if (estado === 'Entregado') {
        estadisticasEstado.entregados++;
      } else if (estado === 'En proceso') {
        estadisticasEstado.enProceso++;
      } else {
        estadisticasEstado.pendientes++;
      }
    });
    
    // Convertir objetos a arrays ordenados
    var monitorasTop = Object.entries(monitorasPorFrecuencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => ({ 
        monitor: entry[0], 
        frecuencia: entry[1]
      }));
    
    var materialesTop = Object.entries(materialesPorFrecuencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => ({ 
        material: entry[0], 
        frecuencia: entry[1]
      }));
    
    var escuelasTop = Object.entries(escuelasPorFrecuencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => ({ escuela: entry[0], frecuencia: entry[1] }));
    
    var materialesMasSolicitadosTop = Object.entries(materialesMasSolicitados)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => ({ material: entry[0], unidades: entry[1] }));
    
    // Ordenar meses cronológicamente
    var mesesOrdenados = Object.keys(totalPedidosPorMes).sort(function(a, b) {
      var mesA = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].indexOf(a.split(' ')[0]);
      var mesB = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].indexOf(b.split(' ')[0]);
      var añoA = parseInt(a.split(' ')[1]);
      var añoB = parseInt(b.split(' ')[1]);
      
      if (añoA !== añoB) return añoA - añoB;
      return mesA - mesB;
    });
    
    var pedidosPorMes = mesesOrdenados.map(function(mesAño) {
      return {
        mes: mesAño,
        cantidad: totalPedidosPorMes[mesAño]
      };
    });
    
    // Estructura de datos para el cliente
    var datosParaCliente = {
      topMonitores: monitorasTop,
      topMateriales: materialesTop,
      topEscuelas: escuelasTop,
      topMaterialesPorUnidades: materialesMasSolicitadosTop,
      pedidosPorMes: pedidosPorMes,
      pedidosPorEstado: estadisticasEstado,
      totalUnidades: unidadesTotales,
      filasFiltradas: filasFiltradas,
      filasTotal: filas.length,
      
      // Datos completos para análisis avanzado
      monitorasPorFrecuencia: monitorasPorFrecuencia,
      escuelasPorFrecuencia: escuelasPorFrecuencia,
      materialesPorFrecuencia: materialesPorFrecuencia,
      actividadesPorFrecuencia: actividadesPorFrecuencia
    };
    
    return {
      success: true,
      data: datosParaCliente
    };
  } catch (e) {
    console.error("Error en obtenerEstadisticasDashboard:", e);
    return {
      success: false,
      message: 'Error al generar estadísticas: ' + e.toString()
    };
  }
}

// =====================================================
// FUNCIONS PER ENTREGAS OPTIMITZADES - FASE 3
// =====================================================

/**
 * Obtenir comandes en estat "Preparat" per assignar entrega
 */
function getPreparatedOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");

    if (!sheet) {
      return {
        success: false,
        error: "La hoja 'Respostes' no existe."
      };
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length < 2) {
      return {
        success: true,
        data: [],
        message: "No hi ha comandes preparades."
      };
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

    const preparatedOrders = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const estat = row[estatIndex];

      if (estat === "Preparat") {
        preparatedOrders.push({
          idPedido: row[idPedidoIndex],
          idItem: row[idItemIndex],
          solicitant: row[solicitantIndex],
          escola: row[escolaIndex],
          dataNecessitat: row[dataNecessitatIndex],
          material: row[materialIndex],
          quantitat: row[quantitatIndex],
          rowIndex: i + 1 // Per actualitzar després
        });
      }
    }

    return {
      success: true,
      data: preparatedOrders
    };

  } catch (error) {
    console.error("Error en getPreparatedOrders:", error);
    return {
      success: false,
      error: "Error obtenint comandes preparades: " + error.toString()
    };
  }
}

/**
 * Obtenir opcions d'entrega per comandes seleccionades
 */
function getDeliveryOptions(selectedOrders) {
  try {
    if (!selectedOrders || selectedOrders.length === 0) {
      return {
        success: false,
        error: "No s'han proporcionat comandes seleccionades"
      };
    }

    // Obtenir dades de la hoja "Dades" per trobar monitors
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dadesSheet = ss.getSheetByName("Dades");

    if (!dadesSheet) {
      return {
        success: false,
        error: "La hoja 'Dades' no existe."
      };
    }

    const dadesValues = dadesSheet.getDataRange().getValues();
    const dadesHeaders = dadesValues[0];

    const escolaIdx = dadesHeaders.findIndex(h => h === "ESCOLA");
    const monitoraIdx = dadesHeaders.findIndex(h => h === "MONITORA");
    const diaIdx = dadesHeaders.findIndex(h => h === "DIA");
    const adreçaIdx = dadesHeaders.findIndex(h => h === "ADREÇA");

    // Agrupar comandes per escola
    const ordersBySchool = {};
    selectedOrders.forEach(order => {
      if (!ordersBySchool[order.escola]) {
        ordersBySchool[order.escola] = [];
      }
      ordersBySchool[order.escola].push(order);
    });

    const deliveryOptions = [];

    // Per cada escola, buscar monitors disponibles
    Object.keys(ordersBySchool).forEach(escola => {
      const schoolOrders = ordersBySchool[escola];
      const availableMonitors = [];

      // Buscar monitors en aquesta escola a la hoja Dades
      for (let i = 1; i < dadesValues.length; i++) {
        const row = dadesValues[i];
        const rowEscola = row[escolaIdx];
        const monitora = row[monitoraIdx];
        const dia = row[diaIdx];
        const adreça = row[adreçaIdx];

        if (rowEscola === escola && monitora) {
          // Verificar si el monitor ja està a la llista
          const existingMonitor = availableMonitors.find(m => m.nom === monitora);
          if (!existingMonitor) {
            availableMonitors.push({
              nom: monitora,
              escola: escola,
              dies: [dia],
              adreça: adreça
            });
          } else {
            // Afegir dia si no existeix
            if (!existingMonitor.dies.includes(dia)) {
              existingMonitor.dies.push(dia);
            }
          }
        }
      }

      deliveryOptions.push({
        escola: escola,
        comandes: schoolOrders,
        monitorsDisponibles: availableMonitors,
        adreça: availableMonitors.length > 0 ? availableMonitors[0].adreça : '',
        opcions: {
          directa: true, // Sempre es pot entregar directament
          intermediari: availableMonitors.length > 0
        }
      });
    });

    return {
      success: true,
      data: deliveryOptions
    };

  } catch (error) {
    console.error("Error en getDeliveryOptions:", error);
    return {
      success: false,
      error: "Error obtenint opcions d'entrega: " + error.toString()
    };
  }
}

/**
 * Crear assignació d'entrega
 */
function createDelivery(deliveryData) {
  try {
    if (!deliveryData || !deliveryData.orderIds || !deliveryData.modalitat) {
      return {
        success: false,
        error: "Dades d'entrega incompletes"
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Respostes");

    if (!sheet) {
      return {
        success: false,
        error: "La hoja 'Respostes' no existe."
      };
    }

    // Ampliar headers si no existeixen les noves columnes
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newColumns = [
      "Modalitat_Entrega",
      "Monitor_Intermediari",
      "Data_Entrega_Prevista",
      "Distancia_Academia",
      "Notes_Entrega"
    ];

    let headersUpdated = false;
    newColumns.forEach(col => {
      if (!headers.includes(col)) {
        headers.push(col);
        headersUpdated = true;
      }
    });

    if (headersUpdated) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Obtenir índexs de columnes
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const modalitатIndex = headers.findIndex(h => h === "Modalitat_Entrega");
    const monitorIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const dataEntregaIndex = headers.findIndex(h => h === "Data_Entrega_Prevista");
    const estatIndex = headers.findIndex(h => h === "Estat");

    // Actualitzar files corresponents
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let updatedRows = 0;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const idItem = row[idItemIndex];

      if (deliveryData.orderIds.includes(idItem)) {
        // Actualitzar dades d'entrega
        row[modalittatIndex] = deliveryData.modalitat;
        row[monitorIndex] = deliveryData.monitorIntermediaria || '';
        row[dataEntregaIndex] = deliveryData.dataEntrega || '';
        row[estatIndex] = "Assignat"; // Nou estat
        updatedRows++;
      }
    }

    if (updatedRows > 0) {
      sheet.getDataRange().setValues(values);
    }

    return {
      success: true,
      updatedRows: updatedRows,
      message: `S'han assignat ${updatedRows} comandes per entrega ${deliveryData.modalitat.toLowerCase()}`
    };

  } catch (error) {
    console.error("Error en createDelivery:", error);
    return {
      success: false,
      error: "Error creant assignació d'entrega: " + error.toString()
    };
  }
}

/**
 * Calcular distàncies des d'Eixos Creativa
 */
function calculateDistances(addresses) {
  try {
    if (!addresses || addresses.length === 0) {
      return {
        success: false,
        error: "No s'han proporcionat adreces"
      };
    }

    const origin = "Eixos Creativa";
    const results = [];

    addresses.forEach(address => {
      try {
        const response = Maps.newDistanceMatrixService()
          .getDistanceMatrix(origin, address, Maps.Mode.DRIVING);

        if (response.rows && response.rows[0] && response.rows[0].elements && response.rows[0].elements[0]) {
          const element = response.rows[0].elements[0];
          if (element.status === "OK") {
            results.push({
              address: address,
              distance: element.distance.text,
              distanceValue: element.distance.value, // metres
              duration: element.duration.text,
              durationValue: element.duration.value // segons
            });
          } else {
            results.push({
              address: address,
              error: "No s'ha pogut calcular la distància"
            });
          }
        }
      } catch (addressError) {
        console.error("Error calculant distància per " + address + ":", addressError);
        results.push({
          address: address,
          error: "Error en el càlcul: " + addressError.toString()
        });
      }
    });

    return {
      success: true,
      data: results
    };

  } catch (error) {
    console.error("Error en calculateDistances:", error);
    return {
      success: false,
      error: "Error calculant distàncies: " + error.toString()
    };
  }
}