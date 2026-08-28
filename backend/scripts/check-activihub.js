/**
 * Comprovació de la connexió amb ActiviHub.
 *   node backend/scripts/check-activihub.js
 *
 * Verifica que el schema `comandes` és accessible i que les dades mestres que
 * abans donava el full "Dades" hi són. És el test que s'ha de passar abans de
 * donar per bona la Fase 1.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const activihub = require('../src/services/activihub');

async function main() {
  const problemes = [];

  console.log('· Curs vigent…');
  const curs = await activihub.getCursVigent();
  console.log(`  curs ${curs} · estats visibles: ${activihub.ESTATS_VISIBLES.join(', ')}`);

  const activitats = await activihub.getActivitats(curs);
  console.log(`· Activitats: ${activitats.length}`);
  if (!activitats.length) problemes.push('Cap activitat: revisa ACTIVIHUB_ESTATS o el curs');

  const escoles = await activihub.getSchools();
  const monitors = await activihub.getMonitors();
  const codis = await activihub.getActivities();
  console.log(`· Escoles: ${escoles.length} · Monitors: ${monitors.length} · Codis d'activitat: ${codis.length}`);
  if (escoles.some(e => String(e).includes('#REF'))) problemes.push('Encara surt #REF! — no llegeix d\'ActiviHub');
  if (!escoles.length) problemes.push('Cap escola');
  if (!monitors.length) problemes.push('Cap monitor');

  const origens = activitats.reduce((acc, a) => {
    acc[a.monitor_origen] = (acc[a.monitor_origen] || 0) + 1;
    return acc;
  }, {});
  console.log('· Origen del monitor:', JSON.stringify(origens));
  if (origens.PROVA) {
    console.log(`  AVÍS: ${origens.PROVA} activitats fan servir la sembra de proves`);
    console.log('  (comandes_app.monitors_prova). Esborra-la quan ActiviHub generi les sessions.');
  }

  const sm = await activihub.getSchoolMonitorData();
  console.log(`· Motor de lliuraments: ${sm.data.schools.length} escoles · ${sm.data.monitors.length} monitors`);
  const senseAdreca = sm.data.schools.filter(s => !s.adreça);
  if (senseAdreca.length) {
    console.log(`  ${senseAdreca.length} escoles sense adreça: ${senseAdreca.map(s => s.nom).join(', ')}`);
  }

  const mostra = escoles[0];
  if (mostra) {
    const acts = await activihub.getActivitiesBySchool(mostra);
    console.log(`· Exemple — ${mostra}: ${acts.join(', ') || '(cap)'}`);
  }

  const incidencies = await activihub.getIncidencies(curs);
  const perTipus = incidencies.reduce((acc, i) => {
    acc[i.tipus] = (acc[i.tipus] || 0) + 1;
    return acc;
  }, {});
  console.log('· Incidències a corregir a ActiviHub:', JSON.stringify(perTipus));

  console.log('');
  if (problemes.length) {
    console.log('RESULTAT: KO');
    problemes.forEach(p => console.log('  - ' + p));
    process.exit(1);
  }
  console.log('RESULTAT: OK — ActiviComandes ja no depèn del full "Dades".');
}

main().catch(e => {
  console.error('\nRESULTAT: KO —', e.message);
  if (String(e.message).includes('Invalid schema')) {
    console.error('\n  Falta exposar el schema a Supabase:');
    console.error('  Dashboard → Project Settings → API → Exposed schemas');
    console.error('  Afegir "comandes" i "comandes_app" (sense treure els que ja hi són).');
  }
  process.exit(1);
});
