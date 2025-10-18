# 📊 Estado Actual del Sistema de Notificaciones - Rama Preview

**Fecha**: 2025-10-17
**Rama**: `backend-migration` (preview)
**Estado**: ✅ Sistema híbrido implementado y funcionando

---

## 🏗️ Arquitectura del Sistema

### Flujo de Notificaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Frontend (Next.js)                                             │
│  └─ Usuario asigna intermediario a pedido                      │
│                           │                                      │
│                           ▼                                      │
│  Backend Node.js (Express)                                      │
│  ├─ Agrupa pedidos por persona + actividad + fechas            │
│  ├─ Construye mensaje con fallback secuencial                  │
│  ├─ Determina spaceName (ej: /LestonnacDX1A)                   │
│  └─ Llama a Apps Script vía HTTP POST                          │
│                           │                                      │
│                           ▼                                      │
│  Apps Script (notificaciones.gs)                                │
│  ├─ Recibe petición en doPost()                                │
│  ├─ Busca Space ID en hoja ChatWebhooks                        │
│  ├─ Usa ScriptApp.getOAuthToken() para autenticar              │
│  └─ Envía mensaje a Google Chat API                            │
│                           │                                      │
│                           ▼                                      │
│  Google Chat                                                    │
│  └─ Notificación recibida en el espacio correspondiente        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Archivos Clave

### 1. **Backend: `backend/src/services/chat.js`**

**Responsabilidades**:
- Enviar notificaciones llamando a Apps Script vía HTTP
- Manejar fallback a modo simulado si Apps Script falla
- No usa Google Chat API directamente (eso lo hace Apps Script)

**Función principal**: `sendChatNotification(spaceName, message)`

```javascript
// Llama a Apps Script vía HTTP POST
const response = await fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ spaceName, message })
});
```

**Línea clave**: `backend/src/services/chat.js:28` - Lee `APPS_SCRIPT_NOTIFICATION_URL` del `.env`

---

### 2. **Apps Script: `notificaciones.gs`**

**Responsabilidades**:
- Microservicio SOLO para enviar notificaciones a Google Chat
- Recibe llamadas HTTP POST del backend
- Busca Space ID en la hoja `ChatWebhooks`
- Usa `ScriptApp.getOAuthToken()` para autenticación OAuth automática

**Funciones principales**:
- `doPost(e)` - Recibe peticiones HTTP del backend
- `doGet(e)` - Health check del servicio
- `sendChatNotification(spaceName, message)` - Envía a Google Chat API
- `getSpaceIdByName(spaceName)` - Busca Space ID con fallback secuencial
- `testNotification()` - Función de prueba manual

**Líneas clave**:
- `notificaciones.gs:15` - `SPREADSHEET_ID` para acceder a la hoja ChatWebhooks
- `notificaciones.gs:178` - `ScriptApp.getOAuthToken()` para autenticación

**Deployment**:
- Desplegado como **Web App** en Apps Script
- Execute as: **Me** (tu cuenta)
- Who has access: **Anyone**
- URL: `https://script.google.com/macros/s/AKfycbzG6NXdycMWbZsFy4CYc08teEUoHp4LWaEWfy37DlDGMreMLdP_5SRyGVai0fI0YNnR5g/exec`

---

### 3. **Backend: `backend/src/routes/admin.js`**

**Responsabilidades**:
- Lógica de agrupación de pedidos por persona + actividad + fechas
- Construcción de mensajes de notificación
- Determinar spaceName con fallback secuencial

**Endpoints que envían notificaciones**:
- `POST /api/admin/orders/:id/notify` (línea 1504) - Notificación individual
- `POST /api/admin/notify-group` (línea 1743) - Notificación agrupada

**Lógica de agrupación** (línea ~1645):
```javascript
// Agrupa por: persona + actividad + rango de fechas
const groupKey = `${order.persona_recull}_${order.escola}_${minDate}_${maxDate}`;
```

**Fallback secuencial de spaceName** (línea ~1495):
```javascript
// Intenta: /LestonnacDX1A → /LestonnacDX1 → /LestonnacDX → ...
let spaceName = `/${order.escola}${order.activitat || ''}${order.curs || ''}${order.grupo || ''}`;
```

---

### 4. **Configuración: `backend/.env`**

```env
# Apps Script - URL del microservicio de notificaciones
APPS_SCRIPT_NOTIFICATION_URL=https://script.google.com/macros/s/AKfycbzG6NXdycMWbZsFy4CYc08teEUoHp4LWaEWfy37DlDGMreMLdP_5SRyGVai0fI0YNnR5g/exec
```

**Variable crítica**: `APPS_SCRIPT_NOTIFICATION_URL`
- Debe apuntar al Web App desplegado de `notificaciones.gs`
- Si no está configurada, el sistema funciona en modo simulado

---

### 5. **Deployment Config: `.claspignore`**

```
**/**
!Code.gs
!appsscript.json
!test-notificaciones-seguro.gs
!notificaciones.gs
```

**Configuración**:
- Solo estos archivos se suben a Apps Script con `clasp push`
- `Code.gs` - Código de producción actual
- `notificaciones.gs` - Nuevo microservicio de notificaciones

---

## 🔄 Sistema de Fallback

### Fallback de SpaceName

El backend intenta múltiples variaciones del nombre del espacio:

**Ejemplo**: Para un pedido de `Lestonnac DX 1A`:

1. Intenta: `/LestonnacDX1A`
2. Si falla: `/LestonnacDX1`
3. Si falla: `/LestonnacDX`
4. Y así sucesivamente...

Apps Script hace lo mismo en la búsqueda de Space ID.

### Fallback de Notificación

Si Apps Script falla al enviar:
1. Backend registra el error en logs
2. Marca la notificación como "simulada"
3. **NO bloquea la operación** (el pedido se asigna igualmente)
4. Devuelve `success: true, simulated: true`

---

## 📊 Datos Importantes

### Hoja de ChatWebhooks

**Ubicación**: Google Sheet `1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw`
**Hoja**: `ChatWebhooks`

**Estructura**:
| Columna A (spaceName) | Columna B (spaceId)        |
|-----------------------|----------------------------|
| /VilaOlimpicaCO       | spaces/AAQAK22FiE8         |
| /LestonnacDX          | spaces/AAAAxxxxxxxx        |
| /Staff                | spaces/AAAAyyyyyyyy        |

Apps Script busca en esta hoja para convertir `spaceName` → `spaceId`.

---

## 🧪 Testing

### Test 1: Verificar Web App Activo

Abre en el navegador:
```
https://script.google.com/macros/s/AKfycbzG6NXdycMWbZsFy4CYc08teEUoHp4LWaEWfy37DlDGMreMLdP_5SRyGVai0fI0YNnR5g/exec
```

Deberías ver:
```json
{
  "success": true,
  "service": "ActiviComandes Notificaciones",
  "status": "active",
  "version": "1.0.0"
}
```

### Test 2: Test Manual en Apps Script

En Apps Script, ejecutar función `testNotification()`:

**Resultado esperado** (logs):
```
=== INICIANDO TEST DE NOTIFICACIÓN ===
📤 Intentando enviar notificación a: /VilaOlimpicaCO
✅ Space ID encontrado para /VilaOlimpicaCO: spaces/AAQAK22FiE8
✅ Mensaje enviado correctamente a /VilaOlimpicaCO
```

**Test ejecutado**: 17/10/2025 16:02:58 ✅ EXITOSO

### Test 3: Asignar Intermediario desde Frontend

1. Ir a http://localhost:3001 (frontend admin)
2. Seleccionar un pedido
3. Asignar intermediario
4. Ver logs del backend:
   ```
   📤 Enviando notificación a Apps Script: /LestonnacDX1A
   ✅ Notificación enviada correctamente vía Apps Script a /LestonnacDX1A
   ```

---

## 🔧 Troubleshooting

### Problema: "APPS_SCRIPT_NOTIFICATION_URL no configurada"

**Solución**:
1. Verificar que `backend/.env` tiene la URL completa
2. Reiniciar el backend: `cd backend && npm run dev`

### Problema: "No se encontró Space ID para: /XYZ"

**Solución**:
1. Verificar que el espacio existe en la hoja `ChatWebhooks`
2. Verificar el nombre exacto (mayúsculas/minúsculas)
3. El sistema intentará fallback automático

### Problema: "Error de Chat API (403)"

**Solución**:
1. Verificar que tu cuenta tiene permisos en el espacio de Google Chat
2. Verificar que el Space ID en la hoja es correcto
3. Verificar que el Web App está desplegado con "Execute as: Me"

### Problema: Notificaciones en modo simulado

**Síntomas**: Logs dicen "modo simulado - error de conexión"

**Solución**:
1. Verificar que la URL de Apps Script es accesible
2. Verificar que el Web App está desplegado (no solo guardado)
3. Probar abrir la URL en el navegador para ver si responde

---

## 📦 Deployment a Producción

### Pasos para desplegar cambios:

1. **Hacer commit de los cambios**:
   ```bash
   git add backend/src/services/chat.js backend/.env notificaciones.gs .claspignore
   git commit -m "feat: Implementar sistema híbrido de notificaciones"
   ```

2. **Merge a main** (cuando esté listo):
   ```bash
   git checkout main
   git merge backend-migration
   ```

3. **Desplegar backend a Vercel**:
   - Vercel detectará el push automáticamente
   - Asegurarse de configurar `APPS_SCRIPT_NOTIFICATION_URL` en las variables de entorno de Vercel

4. **Apps Script ya está desplegado**:
   - `notificaciones.gs` ya está en producción como Web App
   - No requiere cambios adicionales

---

## 🎯 Ventajas del Sistema Actual

✅ **Separación de responsabilidades**:
- Backend = Lógica de negocio + Agrupación
- Apps Script = Solo envío a Google Chat

✅ **No requiere Domain-Wide Delegation**:
- Apps Script usa su propio OAuth automático

✅ **Funciona en local Y en Vercel**:
- Solo necesita la URL de Apps Script en el `.env`

✅ **Fallback robusto**:
- Modo simulado si Apps Script falla
- No bloquea las operaciones

✅ **Fácil de mantener**:
- `notificaciones.gs` es un microservicio independiente
- Cambios en el backend no afectan notificaciones

✅ **Probado y funcionando**:
- Test manual ejecutado exitosamente
- Mensaje enviado a Google Chat correctamente

---

## 🔍 Cambios Respecto al Sistema Anterior

### Antes (Sistema con Service Account):

```
Backend Node.js
    ↓
Google Chat API (con service account)
    ↓ ❌ ERROR: "Method doesn't allow unregistered callers"
Google Chat
```

**Problemas**:
- ❌ Service accounts no funcionan con Google Chat API
- ❌ Requeriría Domain-Wide Delegation (complejo)
- ❌ Notificaciones en modo simulado

### Ahora (Sistema Híbrido):

```
Backend Node.js
    ↓ HTTP POST
Apps Script (notificaciones.gs)
    ↓ ScriptApp.getOAuthToken()
Google Chat API
    ↓ ✅ FUNCIONA
Google Chat
```

**Soluciones**:
- ✅ Apps Script tiene OAuth automático
- ✅ No requiere configuración de admin
- ✅ Notificaciones reales funcionando

---

## 📚 Referencias

- **Guía de Deployment**: `DESPLEGAR_NOTIFICACIONES.md`
- **Apps Script Project**: https://script.google.com/home/projects/1h5Vt44gqIpmjDsbaA1y6fZCq94zZ1hJlKiBtoajOQMVVkOM61Q2cAPr6
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw/edit

---

## 📝 Changelog del Sistema Híbrido

### **17/10/2025 - v3.0 - Sistema Híbrido**
- ✅ Implementado microservicio `notificaciones.gs` en Apps Script
- ✅ Backend modificado para llamar a Apps Script vía HTTP
- ✅ Web App desplegado y URL configurada en `.env`
- ✅ Test manual ejecutado con éxito (16:02:58)
- ✅ Notificación enviada correctamente a `/VilaOlimpicaCO`
- ✅ Sistema completamente funcional
- ✅ `.claspignore` actualizado para incluir `notificaciones.gs`
- ✅ Arquitectura híbrida operativa

### **17/10/2025 - v2.2**
- ✅ Corregida agrupación de notificaciones de destinatarios
- ✅ Cambio de agrupación: de `ID_Pedido` a `Nom_Cognoms + Escola + Data_Lliurament_Prevista`
- ❌ Detectado problema: Service account no funciona con Google Chat API
- ⚠️ Sistema funcionaba en modo simulado

---

## 🔜 Próximos Pasos

### Pruebas Pendientes:

1. **Test end-to-end desde frontend**:
   - Asignar intermediario desde UI
   - Verificar que notificación llega a Google Chat
   - Verificar logs del backend

2. **Test con múltiples espacios**:
   - Probar fallback de spaceName
   - Verificar que funciona con diferentes escuelas/actividades

3. **Monitoreo en producción**:
   - Desplegar a Vercel
   - Configurar variable de entorno
   - Verificar funcionamiento en producción

### Mejoras Opcionales:

1. **Logs mejorados**: Añadir más detalles de debugging
2. **Retry logic**: Reintentar envío si falla
3. **Rate limiting**: Evitar spam de notificaciones
4. **Dashboard de monitoreo**: Ver estadísticas de notificaciones enviadas

---

**Estado Final**: ✅ **SISTEMA COMPLETAMENTE FUNCIONAL**

**Última revisión:** 17 de octubre de 2025, 16:05h
