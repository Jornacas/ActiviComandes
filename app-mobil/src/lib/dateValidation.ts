/**
 * Validación de fechas para pedidos de materiales
 * Regla: Para necesidad el martes, pedido máximo el miércoles de la semana anterior
 */

export interface ValidacionFecha {
  cumplePlazo: boolean;
  fechaLimite: Date;
  requiereEntregaManual: boolean;
  mensaje?: string;
}

/**
 * Valida si el pedido cumple con el plazo establecido
 * @param fechaNecesidad - Fecha cuando se necesita el material
 * @returns Objeto con el resultado de la validación
 */
export function validarPlazoPedido(fechaNecesidad: Date): ValidacionFecha {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día

  const fechaNecesidadNorm = new Date(fechaNecesidad);
  fechaNecesidadNorm.setHours(0, 0, 0, 0); // Normalizar a inicio del día

  console.log('🔍 INPUT validarPlazoPedido:');
  console.log('fechaNecesidad original:', fechaNecesidad);
  console.log('fechaNecesidad toString:', fechaNecesidad.toString());
  console.log('fechaNecesidad ISO:', fechaNecesidad.toISOString());
  
  // Calcular la fecha límite: miércoles de la semana anterior a la fecha de necesidad
  const fechaLimite = new Date(fechaNecesidadNorm);
  
  // Retroceder a la semana anterior (7 días)
  fechaLimite.setDate(fechaLimite.getDate() - 7);
  
  // Encontrar el miércoles de esa semana
  const diaSemana = fechaLimite.getDay(); // 0=domingo, 3=miércoles
  let diasHastaMiercoles;
  
  if (diaSemana <= 3) {
    // Si estamos en lunes, martes o miércoles, ir al miércoles de esta semana
    diasHastaMiercoles = 3 - diaSemana;
  } else {
    // Si estamos en jueves, viernes, sábado o domingo, ir al miércoles de la semana siguiente
    diasHastaMiercoles = 7 - diaSemana + 3;
  }
  
  fechaLimite.setDate(fechaLimite.getDate() + diasHastaMiercoles);
  
  // CORREGIDO: Cumple plazo si HOY es antes o igual que la fecha límite
  const cumplePlazo = hoy <= fechaLimite;
  
  // DEBUG: Log para depuración
  console.log('🔍 DEBUG validarPlazoPedido:');
  console.log('Hoy:', hoy.toLocaleDateString('ca-ES'));
  console.log('Fecha necesidad:', fechaNecesidadNorm.toLocaleDateString('ca-ES'));
  console.log('Fecha límite para pedido:', fechaLimite.toLocaleDateString('ca-ES'));
  console.log('¿Cumple plazo?:', cumplePlazo);
  
  let mensaje = '';
  if (!cumplePlazo) {
    const fechaLimiteStr = fechaLimite.toLocaleDateString('ca-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    mensaje = `⚠️ Termini de comanda vençut

La sol·licitud es processarà normalment, però:
• La data límit era: ${fechaLimiteStr}
• Eixos Creativa et contactarà per coordinar l'entrega manual
• Recollida abans de la sessió del ${fechaNecesidadNorm.toLocaleDateString('ca-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })}

✅ La comanda continua processant-se automàticament`;
  }
  
  return {
    cumplePlazo,
    fechaLimite,
    requiereEntregaManual: !cumplePlazo,
    mensaje: cumplePlazo ? undefined : mensaje
  };
}

/**
 * Formatea una fecha para mostrar en la UI
 */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('ca-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
}

/**
 * Función de test para validar la lógica (solo para desarrollo)
 */
export function testValidacion() {
  const hoy = new Date();

  console.log('🧪 TESTS DE VALIDACIÓN:');
  console.log('Hoy es:', formatearFecha(hoy));

  // Test 1: Pedido para mañana (debería fallar)
  const mañana = new Date();
  mañana.setDate(mañana.getDate() + 1);
  const test1 = validarPlazoPedido(mañana);
  console.log(`📅 Test 1 - Necesidad: ${formatearFecha(mañana)} → Cumple plazo: ${test1.cumplePlazo}`);
  console.log('🔍 Test 1 - Mensaje:', test1.mensaje);

  // Test 2: Pedido para dentro de 2 días (debería fallar)
  const enDosDias = new Date();
  enDosDias.setDate(enDosDias.getDate() + 2);
  const test2 = validarPlazoPedido(enDosDias);
  console.log(`📅 Test 2 - Necesidad: ${formatearFecha(enDosDias)} → Cumple plazo: ${test2.cumplePlazo}`);
  console.log('🔍 Test 2 - Mensaje:', test2.mensaje);

  // Test 3: Pedido para la próxima semana (debería pasar)
  const proximaSemana = new Date();
  proximaSemana.setDate(proximaSemana.getDate() + 10);
  const test3 = validarPlazoPedido(proximaSemana);
  console.log(`📅 Test 3 - Necesidad: ${formatearFecha(proximaSemana)} → Cumple plazo: ${test3.cumplePlazo}`);
  console.log('🔍 Test 3 - Mensaje:', test3.mensaje);

  // NUEVO: Test específico con fecha manual para depurar
  console.log('\n🔧 TEST MANUAL - Fecha específica:');
  const fechaManual = new Date('2025-09-23'); // Mañana si hoy es 22
  const testManual = validarPlazoPedido(fechaManual);
  console.log(`📅 Fecha manual: ${fechaManual.toLocaleDateString('ca-ES')} → Cumple plazo: ${testManual.cumplePlazo}`);
  console.log('🔍 Mensaje:', testManual.mensaje);

  // Test con la fecha que ha probado el usuario: 25/09/2025
  console.log('\n🎯 TEST USUARIO - 25/09/2025:');
  const fechaUsuario = new Date('2025-09-25');
  const testUsuario = validarPlazoPedido(fechaUsuario);
  console.log(`📅 Fecha usuario: ${fechaUsuario.toLocaleDateString('ca-ES')} → Cumple plazo: ${testUsuario.cumplePlazo}`);
  console.log('🔍 Mensaje:', testUsuario.mensaje);
  console.log('🔍 Fecha límite era:', testUsuario.fechaLimite.toLocaleDateString('ca-ES'));
} 