// Versión simplificada del backend sin logs
const AUTH_TOKEN = "comanda_materials_2024";

function doGet(e) {
  try {
    const result = handleApiRequest(e, 'GET');
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'doGet error: ' + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const response = handleApiRequest(e, 'POST');
  const responseData = JSON.parse(response.getContent());
  return ContentService
    .createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleApiRequest(e, method) {
  // Security check
  const token = e.parameter.token || (e.postData && JSON.parse(e.postData.contents || '{}').token);
  if (token !== AUTH_TOKEN) {
    return { success: false, error: 'Token de autenticación inválido' };
  }

  const action = e.parameter.action || (e.postData && JSON.parse(e.postData.contents || '{}').action);

  let result = { success: false, error: 'Acción no reconocida' };

  try {
    switch (action) {
      case 'loadData':
        result = loadRespostesData();
        break;
      case 'loadDataFast':
        result = loadRespostesData(100);
        break;
      case 'createDelivery':
        const deliveryData = method === 'GET' ? parseGetDeliveryData(e.parameter) : JSON.parse(e.postData.contents || '{}');
        result = createDelivery(deliveryData);
        break;
      default:
        result = { success: false, error: `Acción '${action}' no reconocida` };
    }
  } catch (error) {
    result = { success: false, error: 'Error procesando solicitud: ' + error.toString() };
  }

  return result;
}

function parseGetDeliveryData(params) {
  return {
    orderIds: params.orderIds ? JSON.parse(params.orderIds) : [],
    modalitat: params.modalitat || '',
    monitorIntermediaria: params.monitorIntermediaria || '',
    escolaDestino: params.escolaDestino || '',
    dataEntrega: params.dataEntrega || ''
  };
}

function loadRespostesData(limit = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Respostes");

    if (!sheet) {
      return {
        success: true,
        data: {
          headers: [],
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      };
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length < 1) {
      return {
        success: true,
        data: {
          headers: [],
          rows: [],
          estadisticas: { total: 0, pendents: 0, enProces: 0, preparats: 0, entregats: 0 }
        }
      };
    }

    const headers = values[0];
    let rows = values.slice(1);

    if (limit && rows.length > limit) {
      rows = rows.slice(-limit);
    }

    // Calculate basic statistics
    const total = rows.length;
    const estatIndex = headers.findIndex(h => h === "Estat");
    let pendents = 0, enProces = 0, preparats = 0, entregats = 0;

    if (estatIndex !== -1) {
      rows.forEach(row => {
        const estat = row[estatIndex];
        if (!estat || estat === 'Pendent') pendents++;
        else if (estat === 'En procés') enProces++;
        else if (estat === 'Preparat') preparats++;
        else if (estat === 'Entregat') entregats++;
      });
    }

    return {
      success: true,
      data: {
        headers: headers,
        rows: rows,
        estadisticas: {
          total: total,
          pendents: pendents,
          enProces: enProces,
          preparats: preparats,
          entregats: entregats
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: "Error cargando datos: " + error.toString()
    };
  }
}

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

    // Obtenir headers existents
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Obtenir índexs de columnes
    const idItemIndex = headers.findIndex(h => h === "ID_Item");
    const modalittatIndex = headers.findIndex(h => h === "Modalitat_Lliurament" || h === "Modalitat_Entrega");
    const monitorIndex = headers.findIndex(h => h === "Monitor_Intermediari");
    const escolaDestinoIndex = headers.findIndex(h => h === "Escola_Destino_Intermediari");
    const dataEntregaIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista" || h === "Data_Entrega_Prevista");
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
        if (modalittatIndex !== -1) {
          row[modalittatIndex] = deliveryData.modalitat;
        }
        if (monitorIndex !== -1) {
          row[monitorIndex] = deliveryData.monitorIntermediaria || '';
        }
        if (escolaDestinoIndex !== -1) {
          row[escolaDestinoIndex] = deliveryData.escolaDestino || '';
        }
        if (dataEntregaIndex !== -1) {
          row[dataEntregaIndex] = deliveryData.dataEntrega || '';
        }
        if (estatIndex !== -1) {
          row[estatIndex] = "Assignat";
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
      message: `S'han assignat ${updatedRows} comandes per entrega ${deliveryData.modalitat.toLowerCase()}`
    };
  } catch (error) {
    return {
      success: false,
      error: "Error creant assignació d'entrega: " + error.toString()
    };
  }
}