// Feature Flags para activar/desactivar funcionalidades
export const FEATURE_FLAGS = {
  // Notificaciones automáticas - Solo activo en desarrollo o cuando se active manualmente
  NOTIFICACIONES_AUTOMATICAS: process.env.NODE_ENV === 'development' || 
                              process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true'
};

// Función para verificar si una funcionalidad está activa
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature];
};

// Función para obtener el estado de todas las features
export const getAllFeatureFlags = () => {
  return FEATURE_FLAGS;
};
