# Sistema de Notificaciones con Google Chat

## Descripción General

Sistema de envío de notificaciones a espacios de Google Chat con lógica de fallback secuencial y caché optimizada.

---

## Características Principales

### 1. Fallback Secuencial Inteligente

El sistema busca espacios de chat de forma secuencial, quitando caracteres del final hasta encontrar un espacio válido:

```
Solicitado: /LestonnacDX1A
↓
No existe → Probando: /LestonnacDX1
↓
No existe → Probando: /LestonnacDX
↓
No existe → Probando: /Lestonnac
↓
✅ Encontrado → Enviar a /Lestonnac
```

**Ventajas**:
- ✅ Evita enviar notificaciones a espacios inexistentes
- ✅ Agrupa notificaciones automáticamente en espacios padre
- ✅ Permite crear espacios específicos sin romper la lógica existente

### 2. Caché de Espacios (5 min TTL)

Los espacios de chat se cargan desde la hoja `ChatWebhooks` y se cachean en memoria durante 5 minutos para mejorar el rendimiento.

**Beneficios**:
- ⚡ Reduce llamadas a Google Sheets API
- 🔄 Actualización automática cada 5 minutos
- 🔧 Refresco manual disponible vía endpoint

### 3. Información de Envío Real

El sistema retorna información sobre qué espacio se usó realmente:

```json
{
  "success": true,
  "requestedSpace": "/LestonnacDX1A",
  "actualSpace": "/Lestonnac",
  "usedFallback": true,
  "message": "Notificación enviada a /Lestonnac"
}
```

Esto permite a los administradores:
- Ver exactamente dónde se envió la notificación
- Identificar espacios que necesitan ser creados
- Auditar el uso del sistema de fallback

---

## Hoja ChatWebhooks

### Estructura

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| **Nombre** | Identificador del espacio | `/Lestonnac` |
| **SpaceID** | ID del espacio en Google Chat | `spaces/AAAAxxxx` |
| **Descripción** | Descripción opcional | `Lestonnac general` |

### Ejemplos de Espacios

```
/Lestonnac            → Espacio general de Lestonnac
/LestonnacDX1         → Espacio específico para DX1
/LestonnacDX1A        → Espacio ultra-específico para DX1A (subgrupo)
/Academia             → Espacio de Academia/Eixos Creativa
/AcademiaJP2          → Espacio de Jocs Populars 2
```

### Lógica de Fallback en Práctica

#### Escenario 1: Espacio Específico Existe
```
Solicitud: /LestonnacDX1A
Espacios disponibles: /Lestonnac, /LestonnacDX1, /LestonnacDX1A

Resultado:
✅ Coincidencia exacta → Enviar a /LestonnacDX1A
```

#### Escenario 2: Solo Existe Espacio Padre
```
Solicitud: /LestonnacDX1A
Espacios disponibles: /Lestonnac, /LestonnacDX1

Resultado:
❌ /LestonnacDX1A no existe
❌ /LestonnacDX1A → /LestonnacDX1 (quitar 1 carácter) → no existe
✅ /LestonnacDX1A → /LestonnacDX1 (quitar 2 caracteres) → EXISTE
📤 Enviar a /LestonnacDX1
```

#### Escenario 3: Solo Existe Espacio General
```
Solicitud: /LestonnacDX1A
Espacios disponibles: /Lestonnac

Resultado:
❌ /LestonnacDX1A no existe
❌ /LestonnacDX1 no existe (quitar caracteres...)
✅ /Lestonnac EXISTE
📤 Enviar a /Lestonnac
```

#### Escenario 4: Ningún Espacio Coincide
```
Solicitud: /EscolaNoExistent
Espacios disponibles: /Lestonnac, /Academia

Resultado:
❌ Ninguna coincidencia en cadena de fallback
🚫 NO SE ENVÍA notificación
⚠️ Error devuelto al cliente
```

---

## API de Notificaciones

### Enviar Notificación

**Endpoint**: `POST /api/admin/notifications/send`

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "spaceName": "/LestonnacDX1A",
  "message": "Tens un lliurament assignat per dimarts 22/10",
  "orderId": "abc123",
  "notificationType": "intermediari"
}
```

**Respuesta Exitosa (con fallback)**:
```json
{
  "success": true,
  "message": "Notificació enviada a /Lestonnac",
  "data": {
    "spaceName": "/Lestonnac",
    "spaceId": "spaces/AAAAxxxx",
    "messageId": "spaces/AAAAxxxx/messages/yyyy",
    "simulated": false
  },
  "requestedSpace": "/LestonnacDX1A",
  "actualSpace": "/Lestonnac",
  "usedFallback": true
}
```

**Respuesta Error (espacio no encontrado)**:
```json
{
  "success": false,
  "error": "No se encontró Space ID para: /EscolaNoExistent. Verifica la hoja ChatWebhooks.",
  "requestedSpace": "/EscolaNoExistent",
  "actualSpace": null
}
```

---

### Refrescar Caché de Espacios

**Endpoint**: `POST /api/admin/chat/refresh-spaces`

**Body**:
```json
{
  "token": "comanda_materials_2024"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Caché d'espais de xat refrescada correctament"
}
```

**Cuándo usar**:
- Después de añadir nuevos espacios a la hoja `ChatWebhooks`
- Después de modificar Space IDs existentes
- Cuando se detecten errores de envío por espacios desactualizados

---

## Implementación Técnica

### Archivo Principal
`backend/src/services/chat.js`

### Funciones Clave

#### `getSpaceIdByName(spaceName)`
Busca el Space ID con lógica de fallback secuencial.

```javascript
async function getSpaceIdByName(spaceName) {
  // 1. Intentar desde caché
  let data = cache.get('chat_webhooks_data');

  // 2. Si no hay caché, cargar de Sheets
  if (!data) {
    data = await sheets.getSheetData('ChatWebhooks');
    cache.set('chat_webhooks_data', data, 300); // 5 min TTL
  }

  // 3. Crear mapa de espacios
  const spacesMap = new Map();
  for (let i = 1; i < data.length; i++) {
    spacesMap.set(data[i][0], data[i][1]);
  }

  // 4. Búsqueda exacta
  if (spacesMap.has(spaceName)) {
    return { spaceId: spacesMap.get(spaceName), realSpaceName: spaceName };
  }

  // 5. Fallback secuencial
  let currentName = spaceName;
  while (currentName.length > 1) {
    currentName = currentName.slice(0, -1);
    if (spacesMap.has(currentName)) {
      return { spaceId: spacesMap.get(currentName), realSpaceName: currentName };
    }
  }

  // 6. No encontrado
  return { spaceId: null, realSpaceName: null };
}
```

#### `sendChatNotification(spaceName, message)`
Envía la notificación usando la Google Chat API.

```javascript
async function sendChatNotification(spaceName, message) {
  // 1. Buscar Space ID con fallback
  const { spaceId, realSpaceName } = await getSpaceIdByName(spaceName);

  if (!spaceId || !realSpaceName) {
    return {
      success: false,
      error: `No se encontró Space ID para: ${spaceName}`,
      requestedSpace: spaceName,
      actualSpace: null
    };
  }

  // 2. Enviar mensaje via Google Chat API
  const response = await chat.spaces.messages.create({
    parent: spaceId,
    requestBody: { text: message }
  });

  // 3. Retornar info completa
  return {
    success: true,
    requestedSpace: spaceName,
    actualSpace: realSpaceName,
    spaceId: spaceId,
    message: `Notificación enviada a ${realSpaceName}`,
    messageId: response.data.name,
    usedFallback: realSpaceName !== spaceName
  };
}
```

#### `refreshChatSpaces()`
Limpia la caché de espacios.

```javascript
async function refreshChatSpaces() {
  cache.del('chat_webhooks_data');
  console.log('🔄 Caché de espacios de chat refrescada');
}
```

---

## Modo Simulado

Si la Google Chat API falla (permisos, configuración, etc.), el sistema no bloquea la operación y devuelve un éxito simulado:

```json
{
  "success": true,
  "requestedSpace": "/Lestonnac",
  "actualSpace": "/Lestonnac",
  "spaceId": "spaces/AAAAxxxx",
  "message": "Notificación registrada (modo simulado) para /Lestonnac",
  "simulated": true,
  "usedFallback": false
}
```

Esto permite que el flujo de asignación de entregas continúe aunque las notificaciones no se envíen realmente.

---

## Logs del Sistema

El sistema genera logs detallados para debugging:

```
📥 Cargando espacios de chat desde Sheets...
📋 Espacios disponibles: /Lestonnac, /Academia, /LestonnacDX1
🔍 Búsqueda con fallback secuencial para: /LestonnacDX1A
   🔍 Probando: /LestonnacDX1A - No encontrado
   🔍 Probando: /LestonnacDX1 - No encontrado
✅ Space ID encontrado (fallback) para /LestonnacDX1A → /Lestonnac: spaces/AAAAxxxx
ℹ️ Usando fallback: /LestonnacDX1A → /Lestonnac
✅ Mensaje enviado correctamente a /Lestonnac (spaces/AAAAxxxx)
```

---

## Mejores Prácticas

### Nomenclatura de Espacios

Usa un formato jerárquico para aprovechar el fallback:

```
✅ CORRECTO:
/Lestonnac
/LestonnacDX1
/LestonnacDX1A
/LestonnacDX2

❌ INCORRECTO:
/LestonnacDX1
/Lestonnac_DX1A    ← Underscore rompe el fallback
/DX1Lestonnac      ← Orden invertido rompe el fallback
```

### Creación de Espacios

1. Crear espacio en Google Chat
2. Obtener el Space ID (formato: `spaces/AAAAxxxxxxxx`)
3. Añadir fila en hoja `ChatWebhooks`:
   - Columna A: Nombre del espacio (ej: `/LestonnacDX1`)
   - Columna B: Space ID
   - Columna C: Descripción (opcional)
4. Llamar a `POST /api/admin/chat/refresh-spaces` para actualizar caché

### Monitoreo

Revisar regularmente:
- Notificaciones con `usedFallback: true` → Indica espacios que podrían crearse
- Errores de espacios no encontrados → Revisar nomenclatura
- Logs de fallback → Identificar patrones de uso

---

## Comparación con Sistema Anterior

| Característica | Antes | Ahora |
|----------------|-------|-------|
| **Búsqueda** | Bidireccional `includes()` | Secuencial exacto |
| **Fallback** | Demasiado amplio | Controlado y predecible |
| **Caché** | ❌ No | ✅ Sí (5 min TTL) |
| **Refresco** | ❌ No | ✅ Endpoint dedicado |
| **Info envío real** | ❌ No se reportaba | ✅ Se reporta siempre |
| **Modo simulado** | Bloqueaba operación | Permite continuar |

---

## Ejemplo de Uso Completo

### 1. Configurar Espacios

Hoja `ChatWebhooks`:
```
| Nombre           | SpaceID          | Descripción         |
|------------------|------------------|---------------------|
| /Lestonnac       | spaces/AAA111    | General Lestonnac   |
| /LestonnacDX1    | spaces/AAA222    | DX1 específico      |
| /Academia        | spaces/AAA333    | Academia principal  |
```

### 2. Enviar Notificación con Fallback

```javascript
// Request
POST /api/admin/notifications/send
{
  "spaceName": "/LestonnacDX1A",  // No existe
  "message": "Material preparat per dijous"
}

// Sistema busca:
// 1. /LestonnacDX1A → ❌ No existe
// 2. /LestonnacDX1 → ✅ EXISTE
// 3. Envía a /LestonnacDX1

// Response
{
  "success": true,
  "requestedSpace": "/LestonnacDX1A",
  "actualSpace": "/LestonnacDX1",
  "usedFallback": true,
  "message": "Notificación enviada a /LestonnacDX1"
}
```

### 3. Añadir Nuevo Espacio

```bash
# 1. Añadir fila en ChatWebhooks:
# /LestonnacDX1A | spaces/AAA444 | DX1A específico

# 2. Refrescar caché
POST /api/admin/chat/refresh-spaces

# 3. Enviar notificación (ahora va al espacio correcto)
POST /api/admin/notifications/send
{
  "spaceName": "/LestonnacDX1A"
}

# Response (sin fallback)
{
  "success": true,
  "requestedSpace": "/LestonnacDX1A",
  "actualSpace": "/LestonnacDX1A",
  "usedFallback": false
}
```

---

## Fecha de Implementación
16 de octubre de 2025

## Archivos Modificados
- `backend/src/services/chat.js` - Sistema completo reescrito
- `backend/src/routes/admin.js` - Endpoint de refresco añadido
- `backend/API_ENDPOINTS.md` - Documentación actualizada
