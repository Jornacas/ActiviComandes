/**
 * Servei de lliuraments (delivery)
 * Lògica de negoci extreta de admin.js
 */

const sheets = require('./sheets');
const cache = require('./cache');
const maps = require('./maps');
const { getColumnIndices, invalidateOrdersCache } = require('../utils/helpers');

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
 * Obtiene opciones de entrega para pedidos seleccionados
 * @param {Array} orders - Array de pedidos
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
async function getDeliveryOptions(orders) {
  try {
    if (!orders || !Array.isArray(orders)) {
      return {
        success: false,
        error: "No s'han proporcionat comandes"
      };
    }

    // Obtener datos de escuelas y monitores
    const schoolData = await getSchoolMonitorData();
    if (!schoolData.success) {
      return schoolData;
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
        adreça: "Carrer Ramon Turró 73, 08005 Barcelona", // Dirección de Eixos Creativa
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
        descripció: `${group.nomCognoms} recull el material a Eixos Creativa (Ramon Turró 73)`,
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
        // Buscar la dirección de esta escuela y los días de actividad del destinatario
        let escolaAddress = null;
        let diesDisponibles = ["dilluns", "dimarts", "dimecres", "dijous", "divendres"]; // Default

        if (schoolData.data.monitors) {
          // Buscar al destinatario en los monitores
          const destinatarioMonitor = schoolData.data.monitors.find(m =>
            m.nom.toLowerCase().includes(group.nomCognoms.toLowerCase()) ||
            group.nomCognoms.toLowerCase().includes(m.nom.toLowerCase())
          );

          // Si encontramos al destinatario, usar sus días de actividad en esta escuela
          if (destinatarioMonitor) {
            const schoolInfo = destinatarioMonitor.escoles?.find(s => s.escola === escolaDestino);
            if (schoolInfo) {
              if (schoolInfo.adreça) escolaAddress = schoolInfo.adreça;
              if (schoolInfo.dies && schoolInfo.dies.length > 0) {
                diesDisponibles = schoolInfo.dies;
              }
            }
          }

          // Si no encontramos la dirección del destinatario, buscar en otros monitores
          if (!escolaAddress) {
            for (const monitor of schoolData.data.monitors) {
              const schoolInfo = monitor.escoles?.find(s => s.escola === escolaDestino);
              if (schoolInfo?.adreça) {
                escolaAddress = schoolInfo.adreça;
                break;
              }
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
            dies: diesDisponibles,
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

        // 🆕 OPCIÓN 4: ESCUELAS COMPARTIDAS (FASE 2)
        // Detectar cuando el DESTINATARIO coincide con un INTERMEDIARIO en alguna escuela
        console.log(`🔍 FASE 2: Buscando escuelas compartidas para ${group.nomCognoms}`);

        // Buscar en qué escuelas trabaja el destinatario
        const destinatarioMonitor = schoolData.data.monitors.find(m =>
          m.nom.toLowerCase().includes(group.nomCognoms.toLowerCase()) ||
          group.nomCognoms.toLowerCase().includes(m.nom.toLowerCase())
        );

        if (destinatarioMonitor && destinatarioMonitor.escoles?.length > 0) {
          console.log(`   ✓ Destinatario ${group.nomCognoms} trabaja en: [${destinatarioMonitor.escoles.map(e => e.escola).join(', ')}]`);

          // Buscar otros monitores que coincidan en alguna escuela con el destinatario
          schoolData.data.monitors.forEach(potentialIntermediary => {
            // No considerarse a sí mismo como intermediario
            if (potentialIntermediary.nom === destinatarioMonitor.nom) return;

            // Solo monitores multicentro
            if (potentialIntermediary.escoles?.length > 1) {

              // Buscar escuelas compartidas
              destinatarioMonitor.escoles.forEach(destSchool => {
                const sharedSchoolInIntermediary = potentialIntermediary.escoles.find(
                  intSchool => intSchool.escola === destSchool.escola
                );

                if (sharedSchoolInIntermediary) {
                  // ✓ COINCIDEN en esta escuela!
                  console.log(`   ⭐ ${potentialIntermediary.nom} coincide con ${group.nomCognoms} en: ${destSchool.escola}`);

                  // Proponer entregas en OTRAS escuelas del intermediario
                  potentialIntermediary.escoles.forEach(pickupSchool => {
                    if (pickupSchool.escola !== destSchool.escola) {
                      const sharedSchoolOption = {
                        tipus: "Lliurament amb Coincidència", // Tipo especial
                        escola: pickupSchool.escola, // Donde entregamos (a intermediario)
                        escolaCoincidencia: destSchool.escola, // Donde coinciden
                        escolaDestino: destSchool.escola, // ✅ Donde el intermediario ENTREGA (Auro, NO TuroBlau)
                        escoles: group.escoles,
                        adreça: pickupSchool.adreça,
                        eficiencia: "Calculant...",
                        prioritat: 99999, // Se calculará después con distancia
                        nomCognoms: group.nomCognoms,
                        dataNecessitat: group.dataNecessitat,
                        monitorsDisponibles: [{
                          nom: potentialIntermediary.nom,
                          dies: pickupSchool.dies,
                          tipus: "intermediari",
                          escola: pickupSchool.escola, // Escola donde recogemos
                          escolaOrigen: pickupSchool.escola,
                          adreça: pickupSchool.adreça,
                          activitat: pickupSchool.activitat || 'N/A',
                          destinoFinal: {
                            escola: destSchool.escola,
                            dies: sharedSchoolInIntermediary.dies,
                            activitat: sharedSchoolInIntermediary.activitat || 'N/A',
                            destinatari: group.nomCognoms
                          }
                        }],
                        descripció: `Entrega a ${potentialIntermediary.nom} a ${pickupSchool.escola} → ${potentialIntermediary.nom} porta a ${destSchool.escola} → ${group.nomCognoms} recull a ${destSchool.escola}`,
                        distanciaAcademia: "Calculant...",
                        tempsAcademia: "Calculant...",
                        notes: `Coincidència a ${destSchool.escola} - ${group.nomCognoms} recull allà`,
                        comandes: group.orders,
                        destinatari: {
                          nom: group.nomCognoms,
                          activitat: group.orders[0]?.activitat || 'N/A'
                        },
                        // 🆕 Metadatos adicionales para debugging
                        metadata: {
                          fase: 2,
                          sharedSchool: destSchool.escola,
                          intermediary: potentialIntermediary.nom,
                          recipient: group.nomCognoms
                        }
                      };

                      // Evitar duplicados
                      const isDuplicate = deliveryOptions.some(opt =>
                        opt.nomCognoms === sharedSchoolOption.nomCognoms &&
                        opt.escola === sharedSchoolOption.escola &&
                        opt.escolaCoincidencia === sharedSchoolOption.escolaCoincidencia &&
                        opt.monitorsDisponibles[0]?.nom === sharedSchoolOption.monitorsDisponibles[0]?.nom
                      );

                      if (!isDuplicate) {
                        deliveryOptions.push(sharedSchoolOption);
                        console.log(`      → Opción añadida: ${pickupSchool.escola} (${potentialIntermediary.nom}) → ${destSchool.escola} (${group.nomCognoms})`);
                      }
                    }
                  });
                }
              });
            }
          });
        } else {
          console.log(`   ℹ️ Destinatario ${group.nomCognoms} no encontrado en monitores (puede ser solo destinatario)`);
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

    // Crear array de objetos {escola, adreça} para el cálculo de distancias
    const schoolAddresses = Array.from(addressesMap.entries()).map(([adreça, escola]) => ({
      escola,
      adreça
    }));
    console.log('🗺️ Calculating distances for schools:', schoolAddresses.map(s => s.escola));

    // Calcular distancias usando Google Maps API
    const distanceResults = await maps.calculateDistances(schoolAddresses);

    if (distanceResults.success) {
      // 🆕 FASE 1: Aplicar distancias y calcular prioridad mejorada
      deliveryOptions.forEach(option => {
        const distanceData = distanceResults.data.find(d => d.address === option.adreça);
        if (distanceData) {
          option.distanciaAcademia = distanceData.distance;
          option.tempsAcademia = distanceData.duration;

          const km = distanceData.distanceValue / 1000;

          // 🎯 CÁLCULO DE PRIORIDAD MEJORADO
          let basePriority = distanceData.distanceValue; // Metros desde Eixos
          let eficienciaScore = 0;
          let tipusModifier = 0;

          // Modificador por tipo de entrega
          if (option.tipus === "Recollida a Eixos Creativa") {
            tipusModifier = -10000; // Máxima prioridad (siempre primera)
            option.eficiencia = "Màxima";
            eficienciaScore = 100;
          }
          else if (option.tipus === "Lliurament amb Coincidència") {
            // 🆕 FASE 2: Opciones con escuelas compartidas tienen ALTA prioridad
            // Mejor que entrega directa pero después de recollida
            tipusModifier = -5000; // Alta prioridad

            // Calcular eficiencia considerando que hay intermediario
            if (km < 3) {
              option.eficiencia = "Màxima";
              eficienciaScore = 95;
            } else if (km < 5) {
              option.eficiencia = "Alta";
              eficienciaScore = 85;
            } else {
              option.eficiencia = "Mitjana";
              eficienciaScore = 70;
            }
          }
          else if (option.tipus === "Lliurament amb Intermediari") {
            // Intermediario normal: mejor que directa lejana
            tipusModifier = -3000;

            if (km < 3) {
              option.eficiencia = "Alta";
              eficienciaScore = 80;
            } else if (km < 6) {
              option.eficiencia = "Mitjana";
              eficienciaScore = 65;
            } else {
              option.eficiencia = "Baixa";
              eficienciaScore = 50;
            }
          }
          else if (option.tipus === "Entrega Directa des d'Eixos") {
            // Directa: solo buena si es cercana
            tipusModifier = 0;

            if (km < 2) {
              option.eficiencia = "Alta";
              eficienciaScore = 75;
            } else if (km < 4) {
              option.eficiencia = "Mitjana";
              eficienciaScore = 60;
            } else if (km < 7) {
              option.eficiencia = "Baixa";
              eficienciaScore = 45;
            } else {
              option.eficiencia = "Molt Baixa";
              eficienciaScore = 30;
            }
          }

          // Prioridad final: menor es mejor
          option.prioritat = basePriority + tipusModifier;
          option.eficienciaScore = eficienciaScore; // Para debugging

          console.log(`   📊 ${option.tipus} - ${option.escola}: ${km.toFixed(1)}km → Prioridad: ${option.prioritat}, Eficiència: ${option.eficiencia}`);
        }
      });
    } else {
      // Si falla el cálculo de distancias, asignar valores por defecto
      console.warn('⚠️ Distance calculation failed, using default values');
      deliveryOptions.forEach((option, index) => {
        option.distanciaAcademia = "N/A";
        option.tempsAcademia = "N/A";

        // Prioridad por tipo sin distancias
        if (option.tipus === "Recollida a Eixos Creativa") option.prioritat = 1;
        else if (option.tipus === "Lliurament amb Coincidència") option.prioritat = 100 + index;
        else if (option.tipus === "Lliurament amb Intermediari") option.prioritat = 500 + index;
        else option.prioritat = 1000 + index;

        option.eficiencia = "Alta";
      });
    }

    // Ordenar por prioridad (menor = mejor)
    deliveryOptions.sort((a, b) => a.prioritat - b.prioritat);

    console.log(`\n✅ ${deliveryOptions.length} opciones generadas y ordenadas por eficiencia`);

    return {
      success: true,
      data: deliveryOptions
    };
  } catch (error) {
    console.error('Error getting delivery options:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Crea una entrega (asigna lliurament a comandes)
 * @param {Object} deliveryData - Datos de la entrega
 * @returns {Promise<{success: boolean, message?: string, updatedRows?: number, error?: string}>}
 */
async function createDelivery(deliveryData) {
  try {
    console.log('🚚 CREATE DELIVERY request received');
    console.log('🚚 deliveryData:', deliveryData);

    if (!deliveryData) {
      return {
        success: false,
        error: "No s'han proporcionat dades d'entrega"
      };
    }

    const { orderIds, modalitat, monitorIntermediaria, escolaDestino, escolaRecollida, dataEntrega } = deliveryData;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return {
        success: false,
        error: "No s'han proporcionat IDs de comandes"
      };
    }

    if (!modalitat) {
      return {
        success: false,
        error: "No s'ha proporcionat la modalitat de lliurament"
      };
    }

    // Obtener datos de la hoja Respostes
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return {
        success: false,
        error: "No hi ha dades per actualitzar"
      };
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
    const pickupSchoolIndex = headers.findIndex(h => h === "Escola_Recollida_Intermediari");
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
      return {
        success: false,
        error: "No s'han trobat les columnes d'identificador"
      };
    }

    let updatedRows = 0;
    const currentTimestamp = new Date();

    // Si hay intermediario, buscar su actividad en la hoja Dades
    let activitatIntermediariValue = null;
    if (modalitat === 'Intermediari' && monitorIntermediaria && escolaDestino) {
      // La escolaDestino es donde ENTREGA el intermediario
      // En casos normales: escola del destinatario final
      // En casos de coincidencia (Fase 2): escola donde coinciden intermediario y destinatario
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
          if (pickupSchoolIndex !== -1) {
            row[pickupSchoolIndex] = escolaRecollida || '';
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
          if (pickupSchoolIndex !== -1) {
            row[pickupSchoolIndex] = '';
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

      return {
        success: true,
        updatedRows: updatedRows,
        message: `Lliurament assignat correctament. ${updatedRows} comand${updatedRows > 1 ? 'es' : 'a'} actualitzad${updatedRows > 1 ? 'es' : 'a'}.`
      };
    } else {
      return {
        success: false,
        error: "No s'han trobat comandes per actualitzar amb els IDs proporcionats"
      };
    }
  } catch (error) {
    console.error('Error creating delivery:', error);
    return {
      success: false,
      error: 'Error creant el lliurament: ' + error.message
    };
  }
}

/**
 * Elimina asignación de intermediario
 * @param {Array} orderIds - Array de IDs de comandes
 * @returns {Promise<{success: boolean, message?: string, updatedRows?: number, error?: string}>}
 */
async function removeIntermediary(orderIds) {
  try {
    console.log('🔄 REMOVE INTERMEDIARY request received');
    console.log('🔄 orderIds:', orderIds);

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return {
        success: false,
        error: "No s'han proporcionat IDs de comandes"
      };
    }

    // Obtener datos de la hoja Respostes
    const data = await sheets.getSheetData('Respostes');

    if (!data || data.length <= 1) {
      return {
        success: false,
        error: "No hi ha dades per actualitzar"
      };
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
    const pickupSchoolIndex = headers.findIndex(h => h === "Escola_Recollida_Intermediari");
    const dataLliuramentIndex = headers.findIndex(h => h === "Data_Lliurament_Prevista");
    const notifIntermediariIndex = headers.findIndex(h => h === "Notificacion_Intermediari");
    const notifDestinatariIndex = headers.findIndex(h => h === "Notificacion_Destinatari");

    // Buscar columna ID_Lliurament (Columna V / Distancia_Academia reutilizada)
    let idLliuramentIndex = headers.findIndex(h => h === "ID_Lliurament");
    if (idLliuramentIndex === -1) {
      idLliuramentIndex = headers.findIndex(h => h === "Distancia_Academia");
    }

    if (idItemIndex === -1 && idPedidoIndex === -1) {
      return {
        success: false,
        error: "No s'han trobat les columnes d'identificador"
      };
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
        if (pickupSchoolIndex !== -1) {
          row[pickupSchoolIndex] = '';
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

      return {
        success: true,
        updatedRows: updatedRows,
        message: `Assignació d'intermediari eliminada. ${updatedRows} comand${updatedRows > 1 ? 'es' : 'a'} actualitzad${updatedRows > 1 ? 'es' : 'a'}.`
      };
    } else {
      return {
        success: false,
        error: "No s'han trobat comandes per actualitzar amb els IDs proporcionats"
      };
    }
  } catch (error) {
    console.error('Error removing intermediary:', error);
    return {
      success: false,
      error: 'Error eliminant intermediari: ' + error.message
    };
  }
}

module.exports = {
  getSchoolMonitorData,
  getMonitorActivityInSchool,
  getDeliveryOptions,
  createDelivery,
  removeIntermediary
};
