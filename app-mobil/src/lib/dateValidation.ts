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
  
  const fechaLimite = new Date(fechaNecesidad);
  fechaLimite.setHours(0, 0, 0, 0); // Normalizar a inicio del día
  
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
  
  const cumplePlazo = hoy <= fechaLimite;
  
  let mensaje = '';
  if (!cumplePlazo) {
    const fechaLimiteStr = fechaLimite.toLocaleDateString('ca-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    mensaje = `⚠️ Plazo de pedido vencido

La solicitud se procesará normalmente, però:
• La fecha límite era: ${fechaLimiteStr}
• Eixos Creativa te contactarà per coordinar l'entrega manual
• Recollida abans de la sessió del ${fechaNecesidad.toLocaleDateString('ca-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })}

✅ El pedido continúa procesándose automáticamente`;
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