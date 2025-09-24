// FUNCIÓN GETDELIVERYOPTIONS CORREGIDA - UNIVERSAL PARA TODOS LOS CASOS
// Reemplazar en Code.gs desde línea 2759 hasta línea 3077

function getDeliveryOptions(selectedOrders) {
  try {
    if (!selectedOrders || selectedOrders.length === 0) {
      return {
        success: false,
        error: "No s'han proporcionat comandes seleccionades"
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dadesSheet = ss.getSheetByName("Dades");

    if (!dadesSheet) {
      return { success: false, error: "La hoja 'Dades' no existe." };
    }

    // Carregar dades dels monitors i escoles
    const dadesValues = dadesSheet.getDataRange().getValues();
    const dadesHeaders = dadesValues[0];
    const escolaIdx = dadesHeaders.findIndex(h => h === "ESCOLA");
    const monitoraIdx = dadesHeaders.findIndex(h => h === "MONITORA");
    const diaIdx = dadesHeaders.findIndex(h => h === "DIA");
    const adreçaIdx = dadesHeaders.findIndex(h => h === "ADREÇA");

    if (escolaIdx === -1 || monitoraIdx === -1 || diaIdx === -1) {
      return {
        success: false,
        error: "No s'han trobat les columnes necessàries a la hoja 'Dades'"
      };
    }

    // Crear mapa de monitors i escoles
    const allMonitors = new Map();
    for (let i = 1; i < dadesValues.length; i++) {
      const row = dadesValues[i];
      const escola = row[escolaIdx];
      const monitora = row[monitoraIdx];
      const dia = row[diaIdx] || '';
      const adreça = row[adreçaIdx] || '';

      if (monitora && escola && dia) {
        if (!allMonitors.has(monitora)) {
          allMonitors.set(monitora, {
            nom: monitora,
            escoles: new Map()
          });
        }

        const monitor = allMonitors.get(monitora);
        if (!monitor.escoles.has(escola)) {
          monitor.escoles.set(escola, {
            escola: escola,
            dies: [],
            adreça: adreça
          });
        }

        const escolaData = monitor.escoles.get(escola);
        if (!escolaData.dies.includes(dia)) {
          escolaData.dies.push(dia);
        }
      }
    }

    // Obtenir totes les escoles úniques per calcular distàncies
    const allSchools = Array.from(new Set([
      ...selectedOrders.map(order => order.escola),
      ...Array.from(allMonitors.values()).flatMap(monitor => Array.from(monitor.escoles.keys()))
    ]));

    // Calcular distàncies reals amb Google Maps API
    let schoolDistances = new Map();
    try {
      const distanceResponse = calculateDistances(allSchools);
      if (distanceResponse.success && distanceResponse.data) {
        distanceResponse.data.forEach(result => {
          if (!result.error && result.distanceValue) {
            schoolDistances.set(result.school, {
              distance: result.distance,
              distanceValue: result.distanceValue,
              duration: result.duration,
              durationValue: result.durationValue
            });
          }
        });
      }
    } catch (error) {
      console.error("Error calculant distàncies:", error);
    }

    // Processar cada comanda
    const deliveryOptions = [];

    selectedOrders.forEach(order => {
      const targetSchool = order.escola;
      const dataNecessitat = new Date(order.dataNecessitat);
      const solicitant = order.solicitant || order.nomCognoms;

      // Buscar totes les opcions d'entrega
      const opcions = [];

      // 1. BUSCAR MONITORS QUE VAN A L'ESCOLA DESTÍ
      const monitorsDestino = [];
      allMonitors.forEach(monitor => {
        if (monitor.escoles.has(targetSchool)) {
          const escolaInfo = monitor.escoles.get(targetSchool);

          // Verificar si poden entregar abans de la data necessària
          const potEntregar = escolaInfo.dies.some(dia => {
            const diaEntrega = getDiaAsDate(dia, dataNecessitat);
            return diaEntrega <= dataNecessitat;
          });

          if (potEntregar) {
            monitorsDestino.push({
              monitor: monitor.nom,
              escola: targetSchool,
              dies: escolaInfo.dies,
              adreça: escolaInfo.adreça,
              distanceInfo: schoolDistances.get(targetSchool)
            });
          }
        }
      });

      // 2. BUSCAR MONITORS INTERMEDIARIS
      const intermediaris = [];
      allMonitors.forEach(monitor => {
        // Si el monitor va a múltiples escoles
        if (monitor.escoles.size > 1) {
          const escolesMonitor = Array.from(monitor.escoles.keys());

          // Comprovar si aquest monitor pot ser intermediari
          const vaTargetSchool = monitor.escoles.has(targetSchool);

          if (vaTargetSchool) {
            const targetEscolaInfo = monitor.escoles.get(targetSchool);

            // Buscar altres escoles on va aquest monitor
            escolesMonitor.forEach(altSchool => {
              if (altSchool !== targetSchool) {
                const altEscolaInfo = monitor.escoles.get(altSchool);
                const altDistance = schoolDistances.get(altSchool);

                // Verificar viabilitat temporal
                const potEntregarAlternativa = altEscolaInfo.dies.some(dia => {
                  const diaEntrega = getDiaAsDate(dia, dataNecessitat);
                  return diaEntrega < dataNecessitat; // Ha de ser ABANS
                });

                const potEntregarFinal = targetEscolaInfo.dies.some(dia => {
                  const diaEntrega = getDiaAsDate(dia, dataNecessitat);
                  return diaEntrega <= dataNecessitat; // ABANS o el mateix dia
                });

                if (potEntregarAlternativa && potEntregarFinal && altDistance) {
                  intermediaris.push({
                    monitor: monitor.nom,
                    escolaIntermediaria: altSchool,
                    escolaFinal: targetSchool,
                    diesIntermediaria: altEscolaInfo.dies,
                    diesFinal: targetEscolaInfo.dies,
                    adreçaIntermediaria: altEscolaInfo.adreça,
                    distanceInfo: altDistance
                  });
                }
              }
            });
          }
        }
      });

      // 3. ORDENAR OPCIONS PER EFICIÈNCIA (distància des d'Eixos)

      // Opcions directes
      if (monitorsDestino.length > 0) {
        const targetDistance = schoolDistances.get(targetSchool);
        opcions.push({
          tipus: "Entrega Directa",
          escola: targetSchool,
          monitors: monitorsDestino,
          distanceInfo: targetDistance,
          eficiencia: getEficiencia(targetDistance),
          prioritat: targetDistance ? targetDistance.distanceValue : 99999
        });
      }

      // Opcions intermediàries
      intermediaris.forEach(intermediari => {
        opcions.push({
          tipus: "Entrega amb Intermediari",
          escola: intermediari.escolaIntermediaria,
          escolaFinal: intermediari.escolaFinal,
          monitors: [intermediari],
          distanceInfo: intermediari.distanceInfo,
          eficiencia: getEficiencia(intermediari.distanceInfo),
          prioritat: intermediari.distanceInfo ? intermediari.distanceInfo.distanceValue : 99999
        });
      });

      // Ordenar per distància (més propera primer)
      opcions.sort((a, b) => a.prioritat - b.prioritat);

      // Afegir a deliveryOptions
      opcions.forEach((opcio, index) => {
        deliveryOptions.push({
          ...opcio,
          comandes: [order],
          descripció: opcio.tipus === "Entrega Directa" ?
            `Entrega directa a ${opcio.escola}` :
            `Entrega a ${opcio.escola} → Monitor transporta a ${opcio.escolaFinal}`,
          distanciaAcademia: opcio.distanceInfo ? opcio.distanceInfo.distance : "N/A",
          tempsAcademia: opcio.distanceInfo ? opcio.distanceInfo.duration : "N/A",
          notes: opcio.tipus === "Entrega amb Intermediari" && index > 0 && opcions[0] ?
            `Estalvia ${((opcions[0].prioritat - opcio.prioritat) / 1000).toFixed(1)}km respecte entrega directa` :
            opcio.tipus === "Entrega amb Intermediari" ? "Monitor multicentre" : "",
          monitorsDisponibles: opcio.monitors.map(m => ({
            nom: m.monitor || m.nom,
            escola: m.escola || m.escolaIntermediaria,
            dies: m.dies || m.diesIntermediaria,
            adreça: m.adreça || m.adreçaIntermediaria,
            tipus: opcio.tipus === "Entrega Directa" ? "directa" : "intermediari"
          }))
        });
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
      error: "Error generant opcions d'entrega: " + error.toString()
    };
  }
}

// Función auxiliar para convertir día de la semana a fecha
function getDiaAsDate(dia, referenceDate) {
  const dies = {
    'Dilluns': 1, 'Dimarts': 2, 'Dimecres': 3, 'Dijous': 4,
    'Divendres': 5, 'Dissabte': 6, 'Diumenge': 0
  };

  const targetDay = dies[dia];
  if (targetDay === undefined) return new Date(9999, 0, 1); // Fecha muy lejana si no coincide

  const date = new Date(referenceDate);
  const currentDay = date.getDay();
  const daysDifference = targetDay - currentDay;

  // Si es el mismo día o en el futuro de esta semana
  if (daysDifference >= 0) {
    date.setDate(date.getDate() + daysDifference);
  } else {
    // Es la próxima semana
    date.setDate(date.getDate() + daysDifference + 7);
  }

  return date;
}

// Función auxiliar para determinar eficiencia
function getEficiencia(distanceInfo) {
  if (!distanceInfo) return "Baixa";

  const km = distanceInfo.distanceValue / 1000;
  if (km < 2) return "Màxima";
  if (km < 4) return "Alta";
  if (km < 6) return "Mitjana";
  return "Baixa";
}