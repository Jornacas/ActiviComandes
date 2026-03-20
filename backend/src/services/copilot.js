/**
 * Servei Copilot - Integració amb Gemini i Claude per a l'assistent IA
 * Suporta ambdós proveïdors via AI_PROVIDER a .env ("gemini" o "claude")
 */

const sheets = require('./sheets');
const cache = require('./cache');
const maps = require('./maps');
const chat = require('./chat');
const delivery = require('./delivery');

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

// Historial de conversacions per sessió (en memòria)
const conversationSessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minuts

// ======================================================
// FUNCIONS INTERNES QUE EL COPILOT POT CRIDAR
// ======================================================

async function getOrders(filters = {}) {
  const data = await sheets.getSheetData('Respostes');
  if (!data || data.length < 2) return { orders: [], stats: { total: 0 } };

  const headers = data[0];
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[String(h).trim()] = i; });

  let rows = data.slice(1).filter(row => row[0] && String(row[0]).trim() !== '');

  let orders = rows.map(row => ({
    idPedido: row[headerMap['ID_Pedido']] || '',
    idItem: row[headerMap['ID_Item']] || '',
    nomCognoms: row[headerMap['Nom_Cognoms']] || '',
    dataNecessitat: row[headerMap['Data_Necessitat']] || '',
    escola: row[headerMap['Escola']] || '',
    activitat: row[headerMap['Activitat']] || '',
    material: row[headerMap['Material']] || '',
    unitats: row[headerMap['Unitats']] || '',
    estat: row[headerMap['Estat']] || '',
    monitorIntermediari: row[headerMap['Monitor_Intermediari']] || '',
    modalitatEntrega: row[headerMap['Modalitat_Entrega']] || row[headerMap['Modalitat_Lliurament']] || '',
    dataLliuramentPrevista: row[headerMap['Data_Lliurament_Prevista']] || '',
    notesInternes: row[headerMap['Notes_Internes']] || '',
    comentarisGenerals: row[headerMap['Comentaris_Generals']] || '',
    responsablePreparacio: row[headerMap['Responsable_Preparacio']] || '',
    notificacionIntermediari: row[headerMap['Notificacion_Intermediari']] || '',
    notificacionDestinatari: row[headerMap['Notificacion_Destinatari']] || '',
  }));

  if (filters.estat) orders = orders.filter(o => o.estat.toLowerCase() === filters.estat.toLowerCase());
  if (filters.escola) orders = orders.filter(o => o.escola.toLowerCase().includes(filters.escola.toLowerCase()));
  if (filters.monitor || filters.nomCognoms) {
    const name = (filters.monitor || filters.nomCognoms).toLowerCase();
    orders = orders.filter(o => o.nomCognoms.toLowerCase().includes(name));
  }
  if (filters.material) orders = orders.filter(o => o.material.toLowerCase().includes(filters.material.toLowerCase()));
  if (filters.activitat) orders = orders.filter(o => o.activitat.toLowerCase().includes(filters.activitat.toLowerCase()));

  const stats = {
    total: orders.length,
    pendents: orders.filter(o => o.estat === 'Pendent').length,
    enProces: orders.filter(o => o.estat === 'En proces').length,
    preparats: orders.filter(o => o.estat === 'Preparat').length,
    assignats: orders.filter(o => o.estat === 'Assignat').length,
    lliurats: orders.filter(o => o.estat === 'Lliurat').length,
  };

  return { orders, stats };
}

async function getMasterData() {
  const data = await sheets.getSheetData('Dades');
  if (!data || data.length < 2) return { schools: [], monitors: [], activities: [] };

  const headers = data[0];
  const escolaIdx = headers.findIndex(h => h === 'ESCOLA');
  const monitoraIdx = headers.findIndex(h => h === 'MONITORA');
  const diaIdx = headers.findIndex(h => h === 'DIA');
  const adreçaIdx = headers.findIndex(h => h === 'ADREÇA');
  const activitatIdx = headers.findIndex(h => h === 'ACTIVITAT');
  const horaIniciIdx = headers.findIndex(h => h === 'HORA INICI');
  const tornIdx = headers.findIndex(h => h === 'TORN');

  const schools = new Map();
  const monitors = new Map();
  const activities = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const escola = row[escolaIdx]?.toString().trim();
    const monitora = row[monitoraIdx]?.toString().trim();
    const dia = row[diaIdx]?.toString().trim() || '';
    const adreça = row[adreçaIdx]?.toString().trim() || '';
    const activitat = activitatIdx !== -1 ? (row[activitatIdx]?.toString().trim() || '') : '';
    const horaInici = horaIniciIdx !== -1 ? (row[horaIniciIdx]?.toString().trim() || '') : '';
    const torn = tornIdx !== -1 ? (row[tornIdx]?.toString().trim() || '') : '';

    if (!escola || !monitora) continue;
    if (activitat) activities.add(activitat);

    if (!schools.has(escola)) schools.set(escola, { nom: escola, adreça, monitors: [], dies: [], torns: [] });
    const schoolData = schools.get(escola);
    if (!schoolData.monitors.includes(monitora)) schoolData.monitors.push(monitora);
    if (dia && !schoolData.dies.includes(dia)) schoolData.dies.push(dia);
    if (torn && !schoolData.torns.includes(torn)) schoolData.torns.push(torn);

    if (!monitors.has(monitora)) monitors.set(monitora, { nom: monitora, escoles: [] });
    const monitorData = monitors.get(monitora);
    const existingSchool = monitorData.escoles.find(s => s.escola === escola);
    if (!existingSchool) {
      monitorData.escoles.push({ escola, adreça, dies: dia ? [dia] : [], activitat, horaInici, torn });
    } else {
      if (dia && !existingSchool.dies.includes(dia)) existingSchool.dies.push(dia);
      if (horaInici && !existingSchool.horaInici) existingSchool.horaInici = horaInici;
      if (torn && !existingSchool.torn) existingSchool.torn = torn;
    }
  }

  return {
    schools: Array.from(schools.values()),
    monitors: Array.from(monitors.values()),
    activities: Array.from(activities),
  };
}

async function updateOrderStatus(uuids, newStatus) {
  const validStatuses = ['Pendent', 'En proces', 'Preparat', 'Assignat', 'Lliurat'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: `Estat no vàlid. Opcions: ${validStatuses.join(', ')}` };
  }
  const data = await sheets.getSheetData('Respostes');
  if (!data || data.length <= 1) return { success: false, error: 'No hi ha dades' };

  const headers = data[0];
  const idItemIdx = headers.findIndex(h => h === 'ID_Item');
  const idPedidoIdx = headers.findIndex(h => h === 'ID_Pedido');
  const estatIdx = headers.findIndex(h => h === 'Estat');
  const dataEstatIdx = headers.findIndex(h => h === 'Data_Estat');

  let changesMade = 0;
  const updatedData = data.map((row, index) => {
    if (index === 0) return row;
    const matches = uuids.some(uuid => uuid === row[idItemIdx] || uuid === row[idPedidoIdx]);
    if (matches && row[estatIdx] !== newStatus) {
      row[estatIdx] = newStatus;
      if (dataEstatIdx !== -1) row[dataEstatIdx] = new Date();
      changesMade++;
    }
    return row;
  });

  if (changesMade > 0) {
    await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData);
    cache.del('cache_respostes_data');
  }
  return { success: true, changesMade, message: `${changesMade} pedidos actualitzats a "${newStatus}"` };
}

async function updateNotes(orderId, notes) {
  const data = await sheets.getSheetData('Respostes');
  if (!data || data.length <= 1) return { success: false, error: 'No hi ha dades' };
  const headers = data[0];
  const idItemIdx = headers.findIndex(h => h === 'ID_Item');
  const idPedidoIdx = headers.findIndex(h => h === 'ID_Pedido');
  const notesIdx = headers.findIndex(h => h === 'Notes_Internes');

  let updated = false;
  const updatedData = data.map((row, index) => {
    if (index === 0) return row;
    if (orderId === row[idItemIdx] || orderId === row[idPedidoIdx]) { row[notesIdx] = notes; updated = true; }
    return row;
  });
  if (updated) { await sheets.updateRange('Respostes', `A1:Z${updatedData.length}`, updatedData); cache.del('cache_respostes_data'); }
  return { success: updated, message: updated ? 'Notes actualitzades' : 'Pedido no trobat' };
}

async function deleteOrders(uuids) {
  const data = await sheets.getSheetData('Respostes');
  if (!data || data.length <= 1) return { success: false, error: 'No hi ha dades' };
  const headers = data[0];
  const idItemIdx = headers.findIndex(h => h === 'ID_Item');
  const idPedidoIdx = headers.findIndex(h => h === 'ID_Pedido');

  const rowsToDelete = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const rowIdItem = String(data[i][idItemIdx] || '');
    const rowIdPedido = String(data[i][idPedidoIdx] || '');
    if (uuids.some(uuid => uuid === rowIdItem || uuid === rowIdPedido)) rowsToDelete.push(i);
  }
  for (const rowIndex of rowsToDelete) await sheets.deleteRows('Respostes', rowIndex, rowIndex + 1);
  cache.del('cache_respostes_data');
  return { success: true, deletedCount: rowsToDelete.length };
}

async function getDeliveryOptions(orderIds) {
  const { orders } = await getOrders({ estat: 'Preparat' });
  let targetOrders = orders;
  if (orderIds && orderIds.length > 0) {
    targetOrders = orders.filter(o => orderIds.includes(o.idItem) || orderIds.includes(o.idPedido));
  }
  if (targetOrders.length === 0) return { success: false, message: 'No hi ha pedidos preparats per entregar' };

  const masterData = await getMasterData();
  const horariMap = {};
  if (masterData.monitors) {
    masterData.monitors.forEach(m => {
      m.escoles.forEach(e => {
        horariMap[`${m.nom}|${e.escola}`] = { horaInici: e.horaInici || '', torn: e.torn || '' };
      });
    });
  }

  try {
    // Llamada directa al servicio (no HTTP, compatible con Vercel serverless)
    const result = await delivery.getDeliveryOptions(targetOrders);

    if (result.success) {
      const now = new Date();
      const dies = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
      const avuiIdx = now.getDay();
      const minutsActuals = now.getHours() * 60 + now.getMinutes();

      // Filtrar: solo las 12 mejores opciones por prioridad (ya vienen ordenadas por prioritat)
      const allOptions = result.data;
      allOptions.sort((a, b) => a.prioritat - b.prioritat);
      const topOptions = allOptions.slice(0, 12);
      console.log(`[COPILOT] Filtrat ${allOptions.length} opcions → top ${topOptions.length}`);

      const byDestinatari = {};
      topOptions.forEach(opt => {
        const dest = opt.destinatari?.nom || opt.nomCognoms || 'Desconegut';
        if (!byDestinatari[dest]) byDestinatari[dest] = { orders: opt.comandes || [], options: [] };
        byDestinatari[dest].options.push(opt);
      });

      // Simplificar: pasar las opciones en formato estructurado para que el modelo las presente
      const summaries = [];

      // Helper per formatar dates ISO a català
      const formatDataCat = (isoDate) => {
        if (!isoDate) return '?';
        const [y, m, d] = isoDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const diesNom = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
        const mesosNom = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
        return `${diesNom[date.getDay()]} ${d} de ${mesosNom[date.getMonth()]}`;
      };

      for (const [destinatari, data] of Object.entries(byDestinatari)) {
        const escolaFinal = data.orders[0]?.escola || '?';
        const dataNecessitatISO = data.orders[0]?.dataNecessitat || '?';
        const dataNecessitat = formatDataCat(dataNecessitatISO);
        const materials = data.orders.map(o => `${o.material} (${o.unitats} ud.)`).join(', ');

        const opcions = [];
        data.options.forEach(opt => {
          const monitor = opt.monitorsDisponibles?.[0];
          const distancia = opt.distanciaAcademia || 'N/A';

          if (opt.tipus === 'Recollida a Eixos Creativa') {
            opcions.push({
              tipus: 'Recollida',
              descripcio: `${destinatari} passa per Eixos (Ramon Turró 73) a recollir. Horari: dilluns-divendres 9h-18h.`,
              prioritat: opt.prioritat,
            });
          }
          else if (opt.tipus === 'Autorecollida') {
            const dataRecollida = formatDataCat(opt.dataRecollidaPrevista || opt.dataEntregaPrevista);
            opcions.push({
              tipus: 'Autorecollida',
              descripcio: `Eixos deixa a ${opt.escola} (${distancia}). ${destinatari} recull allà${dataRecollida ? ' el ' + dataRecollida : ''} i porta a ${escolaFinal}.`,
              escola: opt.escola,
              prioritat: opt.prioritat,
              arribaATemps: opt.arribaATemps !== undefined ? opt.arribaATemps : null,
            });
          }
          else if (opt.tipus === 'Entrega Directa des d\'Eixos') {
            opcions.push({
              tipus: 'Entrega Directa',
              descripcio: `Eixos porta el material directament a ${opt.escola || escolaFinal}. Distància: ${distancia}.`,
              prioritat: opt.prioritat,
            });
          }
          else if (monitor) {
            // Detectar si el intermediari és el propi destinatari (autorecollida)
            const esAutoIntermediari = monitor.nom.toLowerCase().includes(destinatari.toLowerCase()) ||
              destinatari.toLowerCase().includes(monitor.nom.toLowerCase());

            if (esAutoIntermediari) {
              const dataRecollida = formatDataCat(opt.dataRecollidaPrevista);
              opcions.push({
                tipus: 'Autorecollida',
                descripcio: `Eixos deixa a ${opt.escola} (${distancia}). ${destinatari} recull allà${dataRecollida ? ' el ' + dataRecollida : ''} i porta a ${escolaFinal}.`,
                escola: opt.escola,
                prioritat: opt.prioritat,
                arribaATemps: opt.arribaATemps !== undefined ? opt.arribaATemps : null,
              });
            } else {
              const escolaRecollida = opt.escola;
              const escolaPuntTrobada = opt.escolaDestino || opt.escolaCoincidencia || '?';

              const dataRecollida = formatDataCat(opt.dataRecollidaPrevista);
              const dataEntrega = formatDataCat(opt.dataEntregaPrevista);
              const diesRecollida = (monitor.dies || []).join(', ');
              const diesPuntTrobada = (monitor.destinoFinal?.dies || []).join(', ');

              const recollidaStr = dataRecollida
                ? `${monitor.nom} recull a ${escolaRecollida} el ${dataRecollida}`
                : `${monitor.nom} va a ${escolaRecollida} els: ${diesRecollida}`;
              const entregaStr = dataEntrega
                ? `${monitor.nom} porta a ${escolaPuntTrobada} el ${dataEntrega}`
                : `${monitor.nom} va a ${escolaPuntTrobada} els: ${diesPuntTrobada}`;

              opcions.push({
                tipus: opt.tipus === 'Lliurament amb Coincidència' ? 'Coincidència' : 'Intermediari',
                intermediari: monitor.nom,
                pas1_eixos_deixa: `Eixos deixa a ${escolaRecollida} (${distancia})`,
                pas2_intermediari_recull: recollidaStr,
                pas3_intermediari_porta: entregaStr,
                pas4_destinatari_recull: escolaPuntTrobada === escolaFinal
                  ? `${destinatari} rep el material a ${escolaFinal} (escola destí)`
                  : `${destinatari} recull a ${escolaPuntTrobada} (punt de trobada) i porta a ${escolaFinal} (escola destí)`,
                prioritat: opt.prioritat,
                arribaATemps: opt.arribaATemps !== undefined ? opt.arribaATemps : null,
                diesCadena: opt.diesCadena || null,
              });
            }
          }
        });

        // Separar per tipus
        const intermediaris = opcions.filter(o => o.tipus === 'Coincidència' || o.tipus === 'Intermediari');
        const autorecollides = opcions.filter(o => o.tipus === 'Autorecollida');
        const recollida = opcions.find(o => o.tipus === 'Recollida');
        const directa = opcions.find(o => o.tipus === 'Entrega Directa');

        // Ordenar cada grupo
        intermediaris.sort((a, b) => a.prioritat - b.prioritat);
        autorecollides.sort((a, b) => a.prioritat - b.prioritat);

        // Autorecollida primer, després intermediaris, després fallbacks
        const opcionsOrdenades = [
          ...autorecollides.slice(0, 2),
          ...intermediaris.slice(0, 3),
          ...(directa ? [directa] : []),
          ...(recollida ? [recollida] : []),
        ];

        // Marcar la primera opció com a RECOMANADA amb motiu explícit
        if (opcionsOrdenades.length > 0) {
          const millor = opcionsOrdenades[0];
          millor.recomanada = true;
          if (millor.tipus === 'Autorecollida') {
            millor.motiu = `ÉS LA MILLOR OPCIÓ perquè ${destinatari} JA VA a ${millor.escola} per la seva activitat. No depèn de cap altra persona. Eixos només ha de deixar el material allà i ${destinatari} el recull quan hi va normalment.`;
          } else if (millor.tipus === 'Coincidència' || millor.tipus === 'Intermediari') {
            millor.motiu = `Opció eficient amb intermediari ${millor.intermediari}. Depèn de la disponibilitat de ${millor.intermediari}.`;
          }
        }

        summaries.push({
          destinatari,
          escolaFinal,
          dataNecessitat,
          materials,
          opcions: opcionsOrdenades,
        });
      }

      return {
        success: true,
        totalPreparats: targetOrders.length,
        resum: summaries,
        instruccions: `REGLA ABSOLUTA: L'opció amb recomanada=true és la MILLOR. Presenta-la PRIMERA amb ⭐ i el motiu. NO canviïs l'ordre de les opcions. NO reordenis segons el teu criteri. L'ordre que reps és l'ordre correcte. Autorecollida > Intermediari > Directa > Recollida. Si una opció té arribaATemps=false, indica que arriba TARD. NO inventis res.`,
      };
    }
    return { success: false, error: result.error || 'Error desconegut' };
  } catch (error) {
    console.error('Error cridant delivery options:', error.message);
    return { success: false, error: 'Error calculant opcions: ' + error.message };
  }
}

async function sendNotification(spaceName, message) {
  try {
    const result = await chat.sendChatNotification(spaceName, message);
    return { success: true, message: 'Notificació enviada', result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ======================================================
// DEFINICIÓ DE TOOLS (format compartit)
// ======================================================

const toolDefinitions = [
  {
    name: 'getOrders',
    description: 'Obté la llista de comandes/pedidos amb filtres opcionals. Pot filtrar per estat, escola, monitor, material o activitat.',
    parameters: {
      type: 'object',
      properties: {
        estat: { type: 'string', description: 'Filtrar per estat: Pendent, En proces, Preparat, Assignat, Lliurat' },
        escola: { type: 'string', description: "Filtrar per nom d'escola (cerca parcial)" },
        monitor: { type: 'string', description: 'Filtrar per nom del monitor/persona' },
        material: { type: 'string', description: 'Filtrar per material (cerca parcial)' },
        activitat: { type: 'string', description: 'Filtrar per activitat (cerca parcial)' },
      },
    },
  },
  {
    name: 'getMasterData',
    description: "Obté les dades mestres: escoles (amb adreces), monitors (amb horaris, dies i escoles), i activitats.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'updateOrderStatus',
    description: "Canvia l'estat de pedidos. CONFIRMA amb l'usuari abans.",
    parameters: {
      type: 'object',
      properties: {
        uuids: { type: 'array', items: { type: 'string' }, description: "Llista d'IDs dels pedidos" },
        newStatus: { type: 'string', description: 'Nou estat: Pendent, En proces, Preparat, Assignat, Lliurat' },
      },
      required: ['uuids', 'newStatus'],
    },
  },
  {
    name: 'updateNotes',
    description: "Afegeix o modifica les notes internes d'un pedido.",
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'ID del pedido' },
        notes: { type: 'string', description: 'Text de les notes' },
      },
      required: ['orderId', 'notes'],
    },
  },
  {
    name: 'deleteOrders',
    description: "Elimina pedidos. CONFIRMA amb l'usuari abans.",
    parameters: {
      type: 'object',
      properties: {
        uuids: { type: 'array', items: { type: 'string' }, description: "Llista d'IDs dels pedidos" },
      },
      required: ['uuids'],
    },
  },
  {
    name: 'getDeliveryOptions',
    description: "Obté opcions d'entrega optimitzades amb distàncies reals (Google Maps). Inclou recollida, directa i intermediaris. Les opcions ja tenen en compte l'hora actual i descarten les no viables.",
    parameters: {
      type: 'object',
      properties: {
        orderIds: { type: 'array', items: { type: 'string' }, description: "IDs específics. Si buit, analitza tots els preparats." },
      },
    },
  },
  {
    name: 'assignDelivery',
    description: "Assigna una entrega. IMPORTANT: Si hi ha un monitor intermediari (coincidència o intermediari), la modalitat SEMPRE ha de ser 'Intermediari'. Només usa 'Directa' si Eixos porta directament el material sense cap intermediari.",
    parameters: {
      type: 'object',
      properties: {
        orderIds: { type: 'array', items: { type: 'string' }, description: "IDs de les comandes (camp idItem)" },
        modalitat: { type: 'string', enum: ['Intermediari', 'Directa'], description: "'Intermediari' si un monitor fa d'intermediari o coincidència. 'Directa' NOMÉS si Eixos porta directament." },
        monitorIntermediaria: { type: 'string', description: "Nom EXACTE del monitor intermediari. OBLIGATORI si modalitat és 'Intermediari'." },
        escolaRecollida: { type: 'string', description: "Escola on Eixos deixa el material i l'intermediari el recull." },
        escolaDestino: { type: 'string', description: "Escola on l'intermediari entrega al destinatari (punt de trobada o escola final)." },
        dataEntrega: { type: 'string', description: "Data prevista d'entrega al destinatari (YYYY-MM-DD)." },
      },
      required: ['orderIds', 'modalitat'],
    },
  },
  {
    name: 'sendNotification',
    description: "Envia notificació per Google Chat.",
    parameters: {
      type: 'object',
      properties: {
        spaceName: { type: 'string', description: "Nom de l'espai de Google Chat" },
        message: { type: 'string', description: 'Missatge a enviar' },
      },
      required: ['spaceName', 'message'],
    },
  },
];

const functionMap = {
  getOrders: (args) => getOrders(args),
  getMasterData: () => getMasterData(),
  updateOrderStatus: (args) => updateOrderStatus(args.uuids, args.newStatus),
  updateNotes: (args) => updateNotes(args.orderId, args.notes),
  deleteOrders: (args) => deleteOrders(args.uuids),
  getDeliveryOptions: (args) => getDeliveryOptions(args.orderIds),
  assignDelivery: (args) => delivery.createDelivery({
    orderIds: args.orderIds,
    modalitat: args.modalitat,
    monitorIntermediaria: args.monitorIntermediaria || null,
    escolaDestino: args.escolaDestino || null,
    escolaRecollida: args.escolaRecollida || null,
    dataEntrega: args.dataEntrega || null,
  }),
  sendNotification: (args) => sendNotification(args.spaceName, args.message),
};

// ======================================================
// SYSTEM PROMPT
// ======================================================

function getSystemPrompt() {
  const now = new Date();
  const dies = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
  const mesos = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
  const diaSetmana = dies[now.getDay()];
  const dataAvui = `${diaSetmana}, ${now.getDate()} de ${mesos[now.getMonth()]} de ${now.getFullYear()}`;
  const horaActual = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  return `Ets l'assistent IA d'ActiviComandes, l'aplicació de gestió de comandes de materials d'Eixos Creativa per a escoles de Barcelona.

AVUI: ${dataAvui} — HORA: ${horaActual}
Eixos Creativa: Carrer Ramon Turró 73, 08005 Barcelona.

CONTEXT:
- Monitors/mestres sol·liciten materials per activitats educatives a escoles
- Eixos Creativa prepara i coordina les entregues
- Estats: Pendent → En procés → Preparat → Assignat → Lliurat

HORARIS:
- Cada monitor té hora d'inici i torn (Matí: 9-14h, Tarda: 15-18h) a cada escola
- El material s'ha d'entregar ABANS que comenci l'activitat
- Si l'hora actual és posterior a les 18:00, CAP entrega és viable avui. Respon directament: "Ja són les ${horaActual}, les activitats d'avui han acabat. La primera opció és demà."
- Si és entre 14:00-18:00, només activitats de Tarda són viables

LÒGICA D'ENTREGUES:
Cada monitor va a escoles concretes en dies concrets. NINGÚ es desplaça a escoles que no té assignades.

3 tipus d'entrega (de millor a pitjor):
1. **Recollida a Eixos**: El destinatari ve a l'oficina. Sempre disponible en horari laboral.
2. **Intermediari/Coincidència**: Eixos deixa el material a una escola on va l'intermediari. L'intermediari, en el seu recorregut habitual, el porta a una altra escola on coincideix amb el destinatari. La distància mostrada és Eixos→escola de recollida. L'intermediari NO fa desplaçaments extra.
3. **Entrega Directa**: Algú d'Eixos porta el material a l'escola. Última opció.

IMPORTANT: Les opcions que et retorna getDeliveryOptions JA filtren per viabilitat horària. Limita't a presentar-les sense inventar res.

REGLA CRÍTICA - ÚS DE TOOLS:
- Quan l'usuari demani opcions d'entrega, intermediaris, o com fer arribar material: CRIDA SEMPRE getDeliveryOptions. NO raonis per tu mateix sobre rutes o intermediaris.
- Quan l'usuari demani informació de comandes: CRIDA SEMPRE getOrders amb els filtres adequats. NO diguis "no trobo" sense haver cridat la funció.
- Si getDeliveryOptions no troba la comanda com a "Preparat", prova sense filtre d'estat i informa l'usuari de l'estat actual.
- MAI demanis l'ID de la comanda a l'usuari. Busca-la tu amb getOrders filtrant per nom del monitor.
- Quan l'usuari confirmi una opció d'entrega, CRIDA assignDelivery amb els orderIds, modalitat, monitorIntermediaria, escolaRecollida, escolaDestino i dataEntrega. Això registra l'intermediari al sistema i canvia l'estat a Assignat automàticament. NO facis servir updateOrderStatus per a assignacions — usa assignDelivery.
- Per a PLANS D'ENTREGA MÚLTIPLES (vàries comandes): 1) Crida getOrders per obtenir les comandes pendents. 2) Crida getDeliveryOptions per CADA comanda o grup. 3) Combina els resultats reals en un pla. MAI inventes plans basant-te en getMasterData o en el teu raonament.
- MAI inventes a quina escola va un monitor, ni quin dia, ni quina hora. Aquesta informació NOMÉS la pots obtenir cridant getDeliveryOptions (que consulta les dades reals).
- getMasterData serveix per respondre preguntes informatives (horaris, escoles d'un monitor). NO serveix per planificar entregues — per això existeix getDeliveryOptions.

INSTRUCCIONS DE RESPOSTA:
1. Respon SEMPRE en català, conversacional i natural
2. NO facis taules. Parla com un company de feina
3. Recomana la millor opció primer (marcada amb ⭐)
4. Si l'hora > 18:00 i pregunten per avui, respon directament sense cridar funcions
5. Confirma abans d'accions destructives
6. Refereix-te al context ("aquells", "els d'abans")
7. IDs només si cal per executar accions
8. BREU. 2-3 opcions màxim
9. **Negreta** per monitors, escoles i dies
10. RESPON DIRECTAMENT amb la informació. No facis preguntes innecessàries si ja tens les dades.
11. Quan l'usuari confirmi una opció o digui "fes-ho", "assigna", "porta-ho a X", EXECUTA assignDelivery immediatament. Ja tens els orderIds, la modalitat, el monitor i les escoles de la conversa anterior. NO demanis confirmació extra ni preguntes sobre dates o horaris — usa la dataNecessitat com a referència.
12. Si l'usuari diu "portarem directament a [escola]" o "entrega directa a [escola]", assigna com a Directa a aquesta escola. Si diu "amb [nom monitor]", assigna com a Intermediari amb aquest monitor.`;
}

// ======================================================
// PROCESSAMENT AMB CLAUDE
// ======================================================

async function processWithClaude(sessionId, userMessage) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Convertir tools al format Claude
  const claudeTools = toolDefinitions.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  // Obtenir o crear sessió
  let session = conversationSessions.get(sessionId);
  if (!session) {
    session = { messages: [], lastActivity: Date.now() };
    conversationSessions.set(sessionId, session);
  }
  session.lastActivity = Date.now();

  // Afegir missatge de l'usuari
  session.messages.push({ role: 'user', content: userMessage });

  let maxIterations = 10;
  while (maxIterations > 0) {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: getSystemPrompt(),
      tools: claudeTools,
      messages: session.messages,
    });

    // Afegir resposta al historial
    session.messages.push({ role: 'assistant', content: response.content });

    // Comprovar si hi ha tool_use
    const toolUses = response.content.filter(c => c.type === 'tool_use');
    if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
      // Extreure text de la resposta
      const textParts = response.content.filter(c => c.type === 'text');
      const text = textParts.map(t => t.text).join('\n');
      return { success: true, message: text, sessionId };
    }

    // Executar tools
    const toolResults = [];
    for (const toolUse of toolUses) {
      console.log(`🤖 Claude tool call: ${toolUse.name}`);
      const fn = functionMap[toolUse.name];
      let result;
      try {
        result = fn ? await fn(toolUse.input || {}) : { error: `Funció "${toolUse.name}" no trobada` };
      } catch (error) {
        result = { error: error.message };
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Afegir resultats al historial
    session.messages.push({ role: 'user', content: toolResults });
    maxIterations--;
  }

  return { success: false, error: 'Massa iteracions de tools', sessionId };
}

// ======================================================
// PROCESSAMENT AMB GEMINI
// ======================================================

async function processWithGemini(sessionId, userMessage) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const geminiTools = [{
    functionDeclarations: toolDefinitions.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  }];

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: getSystemPrompt(),
    tools: geminiTools,
  });

  let session = conversationSessions.get(sessionId);
  if (!session) {
    session = { chat: model.startChat({ history: [] }), lastActivity: Date.now() };
    conversationSessions.set(sessionId, session);
  }
  session.lastActivity = Date.now();

  let response = await session.chat.sendMessage(userMessage);
  let result = response.response;

  let maxIterations = 10;
  while (maxIterations > 0) {
    const functionCalls = result.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    console.log(`🤖 Gemini function calls:`, functionCalls.map(fc => fc.name));
    const functionResults = [];
    for (const fc of functionCalls) {
      const fn = functionMap[fc.name];
      let fnResult;
      try {
        fnResult = fn ? await fn(fc.args || {}) : { error: `Funció "${fc.name}" no trobada` };
      } catch (error) {
        fnResult = { error: error.message };
      }
      functionResults.push({ functionResponse: { name: fc.name, response: fnResult } });
    }

    response = await session.chat.sendMessage(functionResults);
    result = response.response;
    maxIterations--;
  }

  return { success: true, message: result.text(), sessionId };
}

// ======================================================
// FUNCIÓ PRINCIPAL
// ======================================================

async function processMessage(sessionId, userMessage) {
  try {
    if (AI_PROVIDER === 'claude') {
      return await processWithClaude(sessionId, userMessage);
    } else {
      return await processWithGemini(sessionId, userMessage);
    }
  } catch (error) {
    console.error(`Error al copilot (${AI_PROVIDER}):`, error);
    return { success: false, error: error.message, sessionId };
  }
}

// Netejar sessions inactives
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of conversationSessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      conversationSessions.delete(id);
      console.log(`🧹 Sessió copilot ${id} eliminada`);
    }
  }
}, 10 * 60 * 1000);

module.exports = { processMessage };
