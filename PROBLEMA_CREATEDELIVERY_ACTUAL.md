# PROBLEMA ACTUAL: createDelivery no funciona

**Fecha**: 25 de septiembre de 2025  
**Estado**: CRÍTICO - Los datos de assignació d'intermediari no se guardan  

## 🚨 SÍNTOMAS DEL PROBLEMA

### ✅ LO QUE FUNCIONA
- ✅ **Frontend envía datos correctamente**: Se confirma en logs F12
- ✅ **Botón "Eliminar Intermediari"**: Funciona perfectamente (usa GET)
- ✅ **Carga de datos**: OrdersTable se carga sin problemas
- ✅ **Conexión con Google Apps Script**: Confirmada (otros endpoints funcionan)
- ✅ **Variables de entorno**: `.env.local` correctamente configurado

### ❌ LO QUE NO FUNCIONA
- ❌ **createDelivery endpoint**: La petición no llega al backend
- ❌ **Logs de Google Apps Script**: Solo aparece `doGet` vacío, sin logs
- ❌ **Datos no se guardan**: Solo el nombre del monitor se guarda ocasionalmente
- ❌ **Logs de `handleApiRequest`**: No aparecen, la función no se ejecuta

## 📊 DATOS TÉCNICOS

### Frontend (Confirmado funcionando)
**URL actual**: `https://activi-comandes-admin-mdf9wvfqi-jornacas-gmailcoms-projects.vercel.app`

**Datos que envía** (verificado en F12):
```json
{
  "orderIds": ["bf6b192f-b076-416d-a5a3-758ec09d00ae-001"],
  "modalitat": "Intermediari", 
  "monitorIntermediaria": "Maria Torner",
  "escolaDestino": "",
  "dataEntrega": "2025-09-29"
}
```

**Método**: GET con parámetros URL
**Token**: `comanda_materials_2024` (correcto)

### Backend (NO recibe peticiones)
**Google Apps Script**: Actualizado con logs de debug
**Logs esperados pero NO aparecen**:
- `🚨 doGet called!`
- `🔥 handleApiRequest called`
- `🎯 createDelivery case reached`

**Otros endpoints que SÍ funcionan**:
- `loadData` ✅
- `removeIntermediaryAssignment` ✅
- `loadDataFast` ✅

## 🔍 DIAGNÓSTICO DETALLADO

### Historial del Problema
1. **Antes funcionaba**: La fecha de entrega se guardaba correctamente
2. **Cambio crítico**: Agregamos `escolaDestino` y traducciones
3. **Síntoma**: Solo el nombre del monitor llega al sheet
4. **Evolución**: Ahora ni siquiera ese dato llega

### Intentos de Solución Realizados

#### 1. **Corrección de Idiomas** ✅
- Cambiado `Modalitat_Entrega` → `Modalitat_Lliurament`
- Cambiado `Data_Entrega_Prevista` → `Data_Lliurament_Prevista`
- Mapeo dual mantenido para compatibilidad

#### 2. **Corrección de Estructura de Datos** ✅
- Agregada columna faltante `Escola_Destino_Intermediari` en `createMultipleSollicitud`
- Corregida desalineación de columnas (22 columnas total)

#### 3. **Corrección de Frontend** ✅
- Cambiado mapeo de IDs: `id: index` → `id: order.idItem`
- Funcionalidad "Eliminar Intermediari" implementada correctamente

#### 4. **Debugging Intentado** ❌
- Agregados logs extensivos en backend
- Agregados logs en frontend
- Probado cambio POST → GET → POST → GET
- **Resultado**: Los logs del backend nunca aparecen

### Comparación de Funcionamiento

| Endpoint | Método | Estado | Logs Backend |
|----------|--------|---------|--------------|
| `loadData` | GET | ✅ Funciona | ✅ Aparecen |
| `removeIntermediaryAssignment` | GET | ✅ Funciona | ✅ Aparecen |
| `createDelivery` | GET | ❌ No funciona | ❌ No aparecen |

## 🤔 HIPÓTESIS ACTUALES

### Hipótesis Principal: **Longitud de URL**
- **Evidencia**: URL muy larga (~400+ caracteres)
- **Síntoma**: `doGet` se ejecuta pero vacío
- **Causa posible**: Google Apps Script rechaza URLs demasiado largas silenciosamente

### Hipótesis Secundaria: **Problema de Parsing**
- **Evidencia**: Error silencioso en JSON.parse
- **Síntoma**: No llega a `handleApiRequest`
- **Causa posible**: Caracteres especiales en deliveryData

### Hipótesis Terciaria: **Caché/Deployment**
- **Evidencia**: Inconsistencia entre endpoints
- **Síntoma**: Solo `createDelivery` afectado
- **Causa posible**: Problema en deployment específico

## 📋 PRÓXIMOS PASOS SUGERIDOS

### Inmediatos (Alta prioridad)
1. **Verificar manualmente** si otros endpoints POST funcionan
2. **Probar createDelivery con datos mínimos** (sin escolaDestino)
3. **Revisar Google Apps Script Editor** para errores de deployment
4. **Limpiar caché del navegador** completamente

### Soluciones Alternativas
1. **Recrear endpoint** desde cero con nombre diferente
2. **Implementar POST robusto** con CORS corregido
3. **Dividir en múltiples peticiones** más pequeñas
4. **Usar método directo** sin pasar por URL parameters

### Debug Adicional
1. **Acceso directo** a Google Apps Script desde navegador
2. **Pruebas con Postman** o curl
3. **Revisión de permisos** de Google Apps Script
4. **Comparación con backup** de código funcionando

## 🎯 OBJETIVO FINAL

**Conseguir que se guarden TODOS los datos de assignació d'intermediari**:
- ✅ Nom del monitor
- ❌ Data de lliurament 
- ❌ Escola destí
- ❌ Canvi d'estat a "Assignat"

## 📝 NOTAS IMPORTANTES

- **El sistema general funciona** - No es un problema fundamental
- **Es específico de createDelivery** - Otros endpoints operativos
- **Frontend correcto** - Datos se envían bien
- **Backend configurado** - Logs preparados pero no se ejecutan
- **Urgencia**: Funcionalidad crítica para el flujo de trabajo

---

**Última actualización**: 25/09/2025 - Problema no resuelto
**Estado**: Investigación en pausa, requiere enfoque fresco 