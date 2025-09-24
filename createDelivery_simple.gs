/**
 * Versión simplificada de createDelivery sin logs que pueden causar cuelgues
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