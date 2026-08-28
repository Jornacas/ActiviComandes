/**
 * Migració del Sheet a Supabase: materials, distàncies i espais de Chat.
 * Idempotent: es pot tornar a executar sense duplicar res.
 *   node backend/scripts/migrate-catalegs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sheets = require('./_sheet');
const activihub = require('../src/services/activihub');

const db = () => activihub.getClient('comandes_app');

const FULLS_MATERIALS = [
  { full: 'MatCO',  area: 'CO', nivell: null, colConcepte: 1, ambCodi: true },
  { full: 'MatDX1', area: 'DX', nivell: 1,    colConcepte: 1, ambCodi: true },
  { full: 'MatDX2', area: 'DX', nivell: 2,    colConcepte: 1, ambCodi: true },
  { full: 'MatHC1', area: 'HC', nivell: 1,    colConcepte: 0, ambCodi: false },
  { full: 'MatHC2', area: 'HC', nivell: 2,    colConcepte: 0, ambCodi: false },
  { full: 'MatTC',  area: 'TC', nivell: null, colConcepte: 0, ambCodi: false },
];

async function migraMaterials() {
  const files = [];

  for (const cfg of FULLS_MATERIALS) {
    const data = await sheets.getSheetData(cfg.full);
    if (!data || data.length < 2) {
      console.log(`  ${cfg.full.padEnd(7)} buit`);
      continue;
    }

    const vistos = new Set();
    let n = 0;
    for (const row of data.slice(1)) {
      const concepte = (row[cfg.colConcepte] || '').toString().trim();
      if (!concepte || vistos.has(concepte)) continue;
      vistos.add(concepte);

      files.push({
        codi_area: cfg.area,
        nivell: cfg.nivell,
        codi: cfg.ambCodi ? (row[0] || '').toString().trim() || null : null,
        concepte,
        // "0,5" al full és decimal amb coma
        quantitat: cfg.ambCodi ? parseFloat((row[2] || '').toString().replace(',', '.')) || null : null,
        proveidor: cfg.ambCodi ? (row[3] || '').toString().trim() || null : null,
      });
      n++;
    }
    console.log(`  ${cfg.full.padEnd(7)} ${n} materials`);
  }

  const { error } = await db().from('materials')
    .upsert(files, { onConflict: 'codi_area,nivell,concepte', ignoreDuplicates: false });
  if (error) throw new Error('materials: ' + error.message);
  return files.length;
}

async function migraDistancies() {
  const data = await sheets.getSheetData('Distancies');
  if (!data || data.length < 2) return 0;

  // La fila més recent per adreça guanya: el Sheet acumulava duplicats.
  const perAdreca = new Map();
  for (const row of data.slice(1)) {
    const adreca = (row[1] || '').toString().trim();
    if (!adreca) continue;
    const actual = {
      adreca,
      escola: (row[0] || '').toString().trim() || null,
      distancia_metres: parseInt(row[2]) || 0,
      duracio_minuts: parseFloat((row[3] || '').toString().replace(',', '.')) || 0,
      actualitzat_el: row[4] ? new Date(row[4]).toISOString() : new Date().toISOString(),
    };
    const previ = perAdreca.get(adreca);
    if (!previ || actual.actualitzat_el >= previ.actualitzat_el) perAdreca.set(adreca, actual);
  }

  const files = [...perAdreca.values()].filter(d => d.distancia_metres > 0);
  const { error } = await db().from('distancies').upsert(files, { onConflict: 'adreca' });
  if (error) throw new Error('distancies: ' + error.message);

  console.log(`  ${data.length - 1} files al full → ${files.length} adreces úniques`);
  return files.length;
}

async function migraChatEspais() {
  const data = await sheets.getSheetData('ChatWebhooks');
  if (!data || data.length < 2) return 0;

  const perNom = new Map();
  for (const row of data.slice(1)) {
    const nom = (row[0] || '').toString().trim();
    const spaceId = (row[1] || '').toString().trim();
    if (!nom || !spaceId) continue;
    perNom.set(nom, {
      nom,
      space_id: spaceId,
      data_creacio: row[2] ? new Date(row[2]).toISOString() : null,
      membres: parseInt(row[3]) || null,
    });
  }

  const files = [...perNom.values()];
  const { error } = await db().from('chat_espais').upsert(files, { onConflict: 'nom' });
  if (error) throw new Error('chat_espais: ' + error.message);
  return files.length;
}

(async () => {
  console.log('Materials:');
  const m = await migraMaterials();
  console.log(`  total ${m}\n`);

  console.log('Distàncies:');
  const d = await migraDistancies();
  console.log(`  total ${d}\n`);

  console.log('Espais de Chat:');
  const c = await migraChatEspais();
  console.log(`  total ${c}`);
})().catch(e => { console.error('KO —', e.message); process.exit(1); });
