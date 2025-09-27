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
      modalitat: headers.findIndex(h => h === "Modalitat_Lliurament"),
      monitor: headers.findIndex(h => h === "Monitor_Intermediari"),
      escolaDestino: headers.findIndex(h => h === "Escola_Destino_Intermediari"),
      dataEntrega: headers.findIndex(h => h === "Data_Lliurament_Prevista"),
      estat: headers.findIndex(h => h === "Estat")
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