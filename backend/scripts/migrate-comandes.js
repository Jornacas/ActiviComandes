/**
 * Migració del full "Respostes" a comandes_app.comandes.
 *   node backend/scripts/migrate-comandes.js
 *
 * Còpia FIDEL: els valors de text es migren tal com estan, sense normalitzar.
 * La brutícia coneguda (DIRECTA/Directa, Lídia/Lidia, el literal "DIRECTA" al
 * camp de monitor intermediari) es neteja a part, perquè el frontend compara
 * distingint majúscules i canviar-ho aquí alteraria el que es veu.
 *
 * Idempotent per id_item: es pot repetir.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sheets = require('./_sheet');
const activihub = require('../src/services/activihub');
const { parseTimestamp } = require('../src/utils/helpers');

const db = () => activihub.getClient('comandes_app');

const text = v => {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
};

const boolea = v => ['true', 'sí', 'si', 'yes', '1'].includes((v ?? '').toString().trim().toLowerCase());

/** "2025-09-23" o "23/09/2025" → "2025-09-23" */
const data = v => {
  const s = text(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

/** El full barreja "01/10/2025 18:30:42" i "2026-06-15T08:14:45.902Z" */
const instant = v => {
  const s = text(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).toISOString();
  const d = parseTimestamp(s);
  return isNaN(d) || d.getTime() === 0 ? null : d.toISOString();
};

async function main() {
  const raw = await sheets.getSheetData('Respostes');
  const headers = raw[0].map(h => String(h || '').trim());
  const idx = nom => headers.indexOf(nom);
  const col = (row, nom) => row[idx(nom)];

  const files = raw.slice(1).filter(r => text(r[idx('ID_Item')]));
  console.log(`Full "Respostes": ${files.length} ítems`);

  // Enllaços amb ActiviHub, per si es poden resoldre. Són additius: cap lògica
  // actual els mira, però deixen el camí obert per deixar de casar per text.
  const activitats = await activihub.getActivitats();
  const perEscolaActivitat = new Map();
  const centrePerEscola = new Map();
  for (const a of activitats) {
    perEscolaActivitat.set(`${a.escola}|${a.activitat}`, a);
    if (!centrePerEscola.has(a.escola)) centrePerEscola.set(a.escola, a.centre_id);
  }

  const monitors = await activihub.getMonitorsActius();
  const sensAccents = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const monitorPerNom = new Map(monitors.map(m => [sensAccents(m.nom_complet), m.monitor_id]));

  let ambCentre = 0, ambActivitat = 0, ambMonitor = 0;

  const registres = files.map(row => {
    const escola = text(col(row, 'Escola'));
    const activitat = text(col(row, 'Activitat'));
    const nom = text(col(row, 'Nom_Cognoms'));

    const act = escola && activitat ? perEscolaActivitat.get(`${escola}|${activitat}`) : null;
    const centreId = act ? act.centre_id : (escola ? centrePerEscola.get(escola) : null) || null;
    const monitorId = nom ? monitorPerNom.get(sensAccents(nom)) || null : null;

    if (centreId) ambCentre++;
    if (act) ambActivitat++;
    if (monitorId) ambMonitor++;

    return {
      id_item: text(col(row, 'ID_Item')),
      id_pedido: text(col(row, 'ID_Pedido')) || text(col(row, 'ID_Item')),
      data_creacio: instant(col(row, 'Timestamp')) || new Date().toISOString(),

      nom_cognoms: nom,
      data_necessitat: data(col(row, 'Data_Necessitat')),
      escola,
      activitat,
      material: text(col(row, 'Material')),
      es_material_personalitzat: boolea(col(row, 'Es_Material_Personalitzat')),
      unitats: parseFloat((col(row, 'Unitats') ?? '').toString().replace(',', '.')) || null,
      comentaris_generals: text(col(row, 'Comentaris_Generals')),

      estat: text(col(row, 'Estat')) || 'Pendent',
      data_estat: instant(col(row, 'Data_Estat')),
      responsable_preparacio: text(col(row, 'Responsable_Preparacio')),
      notes_internes: text(col(row, 'Notes_Internes')),

      lliurament_manual: boolea(col(row, 'Lliurament_Manual')),
      modalitat_lliurament: text(col(row, 'Modalitat_Lliurament')),
      monitor_intermediari: text(col(row, 'Monitor_Intermediari')),
      escola_destino_intermediari: text(col(row, 'Escola_Destino_Intermediari')),
      escola_recollida_intermediari: text(col(row, 'Escola_Recollida_Intermediari')),
      activitat_intermediari: text(col(row, 'Activitat_Intermediari')),
      data_lliurament_prevista: data(col(row, 'Data_Lliurament_Prevista')),
      id_lliurament: text(col(row, 'ID_Lliurament')),

      notificacio_intermediari: text(col(row, 'Notificacion_Intermediari')),
      notificacio_destinatari: text(col(row, 'Notificacion_Destinatari')),

      centre_id: centreId,
      activitat_id: act ? act.activitat_id : null,
      monitor_id: monitorId,
    };
  });

  // Els id_item duplicats farien petar l'upsert amb "ON CONFLICT ... cannot affect row a second time"
  const vistos = new Set();
  const unics = [];
  const duplicats = [];
  for (const r of registres) {
    if (vistos.has(r.id_item)) { duplicats.push(r.id_item); continue; }
    vistos.add(r.id_item);
    unics.push(r);
  }
  if (duplicats.length) console.log(`AVÍS: ${duplicats.length} id_item duplicats al full, es queda el primer: ${duplicats.slice(0, 5).join(', ')}`);

  for (let i = 0; i < unics.length; i += 200) {
    const lot = unics.slice(i, i + 200);
    const { error } = await db().from('comandes').upsert(lot, { onConflict: 'id_item' });
    if (error) throw new Error(`lot ${i}: ${error.message}`);
    process.stdout.write(`\r  migrats ${Math.min(i + 200, unics.length)}/${unics.length}`);
  }
  console.log('');

  const pct = n => `${n} (${Math.round(n * 100 / unics.length)}%)`;
  console.log(`\nEnllaços amb ActiviHub resolts:`);
  console.log(`  centre_id     ${pct(ambCentre)}`);
  console.log(`  activitat_id  ${pct(ambActivitat)}`);
  console.log(`  monitor_id    ${pct(ambMonitor)}`);
  console.log(`\n(són additius: cap lògica actual els fa servir encara)`);
}

main().catch(e => { console.error('\nKO —', e.message); process.exit(1); });
