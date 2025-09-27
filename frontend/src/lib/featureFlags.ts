// Feature Flags para activar/desactivar funcionalidades
export const isFeatureEnabled = (featureName: string): boolean => {
  // En desarrollo, todas las features están activadas por defecto
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // En producción, se controlan por variables de entorno
  switch (featureName) {
    case 'NOTIFICACIONES_AUTOMATICAS':
      return process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true';
    default:
      return false;
  }
};