/**
 * Servei ActiviHub — la font de dades mestres (escoles, monitors, activitats).
 *
 * Substitueix el full "Dades" del Google Sheet, que va quedar mort (#REF!) quan
 * es va esborrar el seu origen. Llegeix del schema `comandes` de Supabase, que és
 * un contracte de NOMÉS VISTES sobre `prod_005` (l'ERP d'ActiviHub).
 *
 * Fa servir la `service_role`, així que aquest mòdul NOMÉS pot viure al servidor:
 * la clau no pot viatjar mai al navegador. Mateix patró que
 * `ActiviRutes/lib/supabase/admin.ts`.
 */

const { createClient } = require('@supabase/supabase-js');
const cache = require('./cache');

// Estats d'activitat que ActiviComandes considera "classe" i per tant demanen
// material. Decisió de Jordi (28-08-2026): només activitats activades. Es manté
// CONFIRMADA perquè fins que el curs no arrenca no hi ha cap ACTIVA i l'app es
// quedaria buida. Es pot ajustar sense tocar codi amb ACTIVIHUB_ESTATS.
const ESTATS_VISIBLES = (process.env.ACTIVIHUB_ESTATS || 'ACTIVA,CONFIRMADA')
  .split(',')
  .map(e => e.trim().toUpperCase())
  .filter(Boolean);

const PAGE_SIZE = 1000; // PostgREST no en retorna més, i ho fa en silenci

const clients = new Map();

function getClient(schema = 'comandes') {
  if (clients.has(schema)) return clients.get(schema);

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Falten variables d\'entorn: SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY (mira backend/.env i Vercel)'
    );
  }

  const client = createClient(url, serviceRoleKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  clients.set(schema, client);
  return client;
}

/**
 * Llegeix una vista sencera paginant. PostgREST talla a 1.000 files sense avisar.
 */
async function selectAll(view, build) {
  const rows = [];
  let from = 0;

  for (;;) {
    let query = getClient().from(view).select('*');
    if (build) query = build(query);

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`ActiviHub · error llegint ${view}: ${error.message}`);
    }

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/**
 * Codi del curs vigent segons ActiviHub (el mateix criteri que fa servir l'ERP).
 */
async function getCursVigent() {
  const cached = cache.get('activihub_curs_vigent');
  if (cached) return cached;

  const { data, error } = await getClient()
    .from('v_cursos')
    .select('codi')
    .eq('vigent', true)
    .limit(1);

  if (error) throw new Error(`ActiviHub · error llegint v_cursos: ${error.message}`);
  if (!data.length) throw new Error('ActiviHub · cap curs marcat com a vigent');

  cache.set('activihub_curs_vigent', data[0].codi, 3600);
  return data[0].codi;
}

/**
 * Les activitats del curs que compten per a ActiviComandes.
 * És el substitut directe del full "Dades".
 */
async function getActivitats(curs = null) {
  const codiCurs = curs || (await getCursVigent());
  const cacheKey = `activihub_activitats_${codiCurs}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const rows = await selectAll('v_activitats', q =>
    q.eq('curs', codiCurs).in('estat', ESTATS_VISIBLES).order('escola')
  );

  cache.set(cacheKey, rows, 1800);
  console.log(`[ACTIVIHUB] ${rows.length} activitats del curs ${codiCurs} (estats: ${ESTATS_VISIBLES.join(', ')})`);
  return rows;
}

/** Monitors donats d'alta a l'ERP. */
async function getMonitorsActius() {
  const cached = cache.get('activihub_monitors');
  if (cached) return cached;

  const rows = await selectAll('v_monitors', q =>
    q.eq('actiu', true).eq('codi_tipus', 'MONITOR').order('nom_complet')
  );

  cache.set('activihub_monitors', rows, 1800);
  return rows;
}

// ======================================================
// LES CONSULTES QUE ABANS ANAVEN AL FULL "Dades"
// ======================================================

const ordenaCatala = (a, b) => a.localeCompare(b, 'ca');
const unics = arr => [...new Set(arr.filter(v => v && String(v).trim() !== ''))];

/** Escoles amb activitat aquest curs. */
async function getSchools() {
  const activitats = await getActivitats();
  return unics(activitats.map(a => a.escola)).sort(ordenaCatala);
}

/**
 * Monitors que apareixen a la graella del curs.
 * Mentre ActiviHub no hagi generat les sessions, `monitora` ve de la sembra de
 * proves (`comandes_app.monitors_prova`) i la vista ho marca a `monitor_origen`.
 */
async function getMonitors() {
  const activitats = await getActivitats();
  const ambActivitat = unics(activitats.map(a => a.monitora));

  // Si encara no hi ha cap assignació, ensenya tots els monitors d'alta abans
  // que un desplegable buit.
  if (!ambActivitat.length) {
    const monitors = await getMonitorsActius();
    return monitors.map(m => m.nom_complet).sort(ordenaCatala);
  }

  return ambActivitat.sort(ordenaCatala);
}

/** Codis d'activitat (CO1A, DX2B, HC2B-EN…). */
async function getActivities() {
  const activitats = await getActivitats();
  return unics(activitats.map(a => a.activitat)).sort(ordenaCatala);
}

async function getActivitiesBySchool(escola) {
  const activitats = await getActivitats();
  return unics(activitats.filter(a => a.escola === escola).map(a => a.activitat)).sort(ordenaCatala);
}

async function getSchoolsByMonitor(monitor) {
  const activitats = await getActivitats();
  return unics(activitats.filter(a => a.monitora === monitor).map(a => a.escola)).sort(ordenaCatala);
}

async function getActivitiesByMonitorAndSchool(monitor, escola) {
  const activitats = await getActivitats();
  return unics(
    activitats.filter(a => a.monitora === monitor && a.escola === escola).map(a => a.activitat)
  ).sort(ordenaCatala);
}

/**
 * Activitat d'un monitor en una escola concreta.
 * Reemplaça getMonitorActivityInSchool() que llegia de "Dades".
 */
async function getMonitorActivityInSchool(monitor, escola) {
  const activitats = await getActivitats();
  const match = activitats.find(a => a.monitora === monitor && a.escola === escola && a.activitat);
  return match ? match.activitat : null;
}

/**
 * Estructura escoles+monitors que consumeix el motor de lliuraments.
 * Manté exactament la forma que retornava la versió del full: el motor
 * d'intermediaris no s'ha de tocar.
 */
async function getSchoolMonitorData() {
  const activitats = await getActivitats();

  const schools = new Map();
  const monitors = new Map();

  for (const row of activitats) {
    const escola = row.escola;
    const monitora = row.monitora;
    const dia = row.dia || '';
    const adreça = row.adreca_completa || row.adreca || '';
    const activitat = row.activitat || '';

    if (!escola) continue;

    if (!schools.has(escola)) {
      schools.set(escola, { nom: escola, adreça, monitors: [], dies: [] });
    }
    const schoolData = schools.get(escola);
    if (!schoolData.adreça && adreça) schoolData.adreça = adreça;
    if (dia && !schoolData.dies.includes(dia)) schoolData.dies.push(dia);

    // Sense monitor assignat l'escola existeix igual (es pot fer entrega directa),
    // però no pot entrar al càlcul d'intermediaris.
    if (!monitora) continue;

    if (!schoolData.monitors.includes(monitora)) schoolData.monitors.push(monitora);

    if (!monitors.has(monitora)) {
      monitors.set(monitora, { nom: monitora, escoles: [] });
    }
    const monitorData = monitors.get(monitora);
    const existing = monitorData.escoles.find(s => s.escola === escola);

    if (!existing) {
      monitorData.escoles.push({ escola, adreça, dies: dia ? [dia] : [], activitat });
    } else {
      if (dia && !existing.dies.includes(dia)) existing.dies.push(dia);
      if (activitat && !existing.activitat) existing.activitat = activitat;
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
}

/**
 * Les mateixes files, però amb la forma capçalera+files que esperava el copilot
 * quan llegia el full "Dades". Evita reescriure'n el prompt i les tools.
 */
async function getDadesComaFull() {
  const activitats = await getActivitats();
  const headers = ['ESCOLA', 'MONITORA', 'DIA', 'HORA INICI', 'TORN', 'ACTIVITAT', 'ADREÇA'];

  const rows = activitats.map(a => [
    a.escola || '',
    a.monitora || '',
    a.dia || '',
    a.hora_inici || '',
    a.torn || '',
    a.activitat || '',
    a.adreca_completa || a.adreca || ''
  ]);

  return [headers, ...rows];
}

/** Incidències de dades que deixen cega l'app. Es corregeixen a l'ERP. */
async function getIncidencies(curs = null) {
  const codiCurs = curs || (await getCursVigent());
  return selectAll('v_incidencies', q => q.eq('curs', codiCurs));
}

/** Buida la caché de dades mestres. */
function invalidateCache() {
  cache.del('activihub_curs_vigent');
  cache.del('activihub_monitors');
  // Les claus per curs es purguen amb el TTL; n'hi ha molt poques.
  cache.del('activihub_activitats_2627');
}

module.exports = {
  ESTATS_VISIBLES,
  getClient,
  getCursVigent,
  getActivitats,
  getMonitorsActius,
  getSchools,
  getMonitors,
  getActivities,
  getActivitiesBySchool,
  getSchoolsByMonitor,
  getActivitiesByMonitorAndSchool,
  getMonitorActivityInSchool,
  getSchoolMonitorData,
  getDadesComaFull,
  getIncidencies,
  invalidateCache
};
