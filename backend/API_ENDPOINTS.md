# API Endpoints - ActiviComandes Backend

Backend Node.js + Express migrado desde Google Apps Script.

## Base URL (localhost)
```
http://localhost:3000
```

## Autenticación

Todos los endpoints requieren el token de autenticación. Se puede enviar de 3 formas:

1. **Query parameter**: `?token=comanda_materials_2024`
2. **Body**: `{ "token": "comanda_materials_2024", ... }`
3. **Header**: `Authorization: Bearer comanda_materials_2024`

---

## 📱 Mobile App Endpoints

### Consultas Generales

#### GET `/api/schools`
Obtiene lista de escuelas únicas.

**Ejemplo**:
```bash
curl "http://localhost:3000/api/schools?token=comanda_materials_2024"
```

**Respuesta**:
```json
{
  "success": true,
  "data": ["Acacies", "Academia", "ArcSantMarti", ...]
}
```

---

#### GET `/api/monitors`
Obtiene lista de monitores únicos.

**Ejemplo**:
```bash
curl "http://localhost:3000/api/monitors?token=comanda_materials_2024"
```

---

#### GET `/api/activities`
Obtiene lista de actividades únicas.

---

#### GET `/api/materials`
Obtiene lista de materiales.

---

### Consultas con Filtros

#### GET `/api/activities/by-school`
Obtiene actividades de una escuela específica.

**Parámetros**:
- `school` (string, requerido): Nombre de la escuela

**Ejemplo**:
```bash
curl "http://localhost:3000/api/activities/by-school?school=Academia&token=comanda_materials_2024"
```

---

#### GET `/api/schools/by-monitor`
Obtiene escuelas de un monitor específico.

**Parámetros**:
- `monitor` (string, requerido): Nombre del monitor

---

#### GET `/api/activities/by-monitor-and-school`
Obtiene actividades de un monitor y escuela específicos.

**Parámetros**:
- `monitor` (string, requerido)
- `school` (string, requerido)

---

#### GET `/api/materials/by-activity`
Obtiene materiales de una actividad específica.

**Parámetros**:
- `activity` (string, requerido): Código de actividad (ej: "CO1", "JP1")

---

### Creación de Solicitudes

#### POST `/api/sollicitud`
Crea una solicitud individual.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "sollicitud": {
    "nomCognoms": "Nombre Apellido",
    "dataNecessitat": "2025-10-20",
    "escola": "Academia",
    "activitat": "CO1",
    "material": "Pelotas",
    "unitats": "5",
    "altresMaterials": "Comentarios adicionales"
  }
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Sol·licitud creada correctament",
  "uuid": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
}
```

---

#### POST `/api/sollicitud/multiple`
Crea múltiples solicitudes (carrito de compras).

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "nomCognoms": "Nombre Apellido",
  "dataNecessitat": "2025-10-20",
  "items": [
    {
      "escola": "Academia",
      "activitat": "CO1",
      "material": "Pelotas",
      "quantitat": 5
    },
    {
      "escola": "Academia",
      "activitat": "CO1",
      "material": "Conos",
      "quantitat": 10
    }
  ],
  "altresMaterials": "Comentarios generales"
}
```

---

## 🔧 Admin App Endpoints

### Gestión de Pedidos

#### GET `/api/admin/orders`
Carga todos los pedidos.

**Parámetros opcionales**:
- `limit` (number): Limita el número de resultados

**Ejemplo**:
```bash
curl "http://localhost:3000/api/admin/orders?token=comanda_materials_2024&limit=10"
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "headers": ["timestamp", "idPedido", "idItem", ...],
    "rows": [[...], [...], ...],
    "estadisticas": {
      "total": 69,
      "pendents": 15,
      "enProces": 0,
      "preparats": 2,
      "entregats": 52
    }
  }
}
```

---

#### POST `/api/admin/orders/process`
Procesa respuestas y calcula estadísticas.

**Respuesta**:
```json
{
  "success": true,
  "nuevosRegistros": 69,
  "message": "Sincronització completada. 69 sol·licituds processades.",
  "estadisticas": { ... }
}
```

---

#### POST `/api/admin/orders/update-status`
Actualiza el estado de pedidos.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "uuids": ["uuid1", "uuid2", "uuid3"],
  "newStatus": "Preparat"
}
```

**Estados válidos**: `Pendent`, `En proces`, `Preparat`, `Entregat`

**Respuesta**:
```json
{
  "success": true,
  "changesMade": 3,
  "message": "S'han actualitzat 3 elements a l'estat: Preparat"
}
```

---

#### POST `/api/admin/orders/delete`
Elimina pedidos.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "uuids": ["uuid1", "uuid2"]
}
```

---

#### POST `/api/admin/orders/create`
Crea un nuevo pedido desde el admin.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "orderData": {
    "nomCognoms": "Nombre Apellido",
    "escola": "Academia",
    "activitat": "CO1",
    "material": "Material",
    "unitats": 1,
    "dataNecessitat": "2025-10-20",
    "notesInternes": "Notas internas"
  }
}
```

---

### Estadísticas y Dashboard

#### POST `/api/admin/stats`
Obtiene estadísticas del dashboard con filtros opcionales.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "filters": {
    "escola": "Academia",
    "dateFrom": "2025-10-01",
    "dateTo": "2025-10-31"
  }
}
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "total": 25,
    "pendents": 10,
    "enProces": 5,
    "preparats": 5,
    "entregats": 5
  }
}
```

---

#### GET `/api/admin/orders/preparated`
Obtiene pedidos preparados para entrega.

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "idPedido": "xxx",
      "nomCognoms": "...",
      "escola": "...",
      ...
    }
  ]
}
```

---

### Sistema de Entregas

#### POST `/api/admin/delivery/options`
Obtiene opciones de entrega para pedidos seleccionados.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "orders": [...]
}
```

**Estado**: ⚠️ En desarrollo

---

#### POST `/api/admin/delivery/create`
Crea una entrega.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "deliveryData": {
    "modalitat": "Directa",
    "orderIds": ["xxx", "yyy"],
    ...
  }
}
```

**Estado**: ⚠️ En desarrollo

---

#### POST `/api/admin/delivery/remove-intermediary`
Elimina asignación de intermediario.

**Estado**: ⚠️ En desarrollo

---

### Notificaciones

#### POST `/api/admin/notifications/send`
Envía notificación manual.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "spaceName": "NombreDelSpace",
  "message": "Mensaje de notificación",
  "orderId": "xxx",
  "notificationType": "intermediari"
}
```

**Estado**: ⚠️ Simulado - Integración Google Chat pendiente

---

#### GET `/api/admin/notifications/status/:orderId`
Obtiene estado de notificaciones de un pedido.

**Estado**: ⚠️ En desarrollo

---

#### POST `/api/admin/notifications/statuses`
Obtiene estados de múltiples notificaciones.

**Estado**: ⚠️ En desarrollo

---

#### POST `/api/admin/chat/refresh-spaces`
Refresca la caché de espacios de chat (5 min TTL).

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

**Uso**: Llamar después de añadir o modificar espacios en la hoja ChatWebhooks.

---

### Utilidades

#### POST `/api/admin/calculate-distances`
Calcula distancias entre direcciones.

**Body**:
```json
{
  "token": "comanda_materials_2024",
  "addresses": ["Dirección 1", "Dirección 2"]
}
```

**Estado**: ⚠️ Google Maps API pendiente

---

## 🔍 Testing Rápido

### Health Check
```bash
curl http://localhost:3000/
```

### Mobile App - Escuelas
```bash
curl "http://localhost:3000/api/schools?token=comanda_materials_2024"
```

### Admin - Órdenes (primeras 5)
```bash
curl "http://localhost:3000/api/admin/orders?token=comanda_materials_2024&limit=5"
```

### Mobile - Crear solicitud
```bash
curl -X POST http://localhost:3000/api/sollicitud \
  -H "Content-Type: application/json" \
  -d '{
    "token": "comanda_materials_2024",
    "sollicitud": {
      "nomCognoms": "Test User",
      "escola": "Academia",
      "activitat": "CO1",
      "material": "Test Material",
      "unitats": "1"
    }
  }'
```

---

## 📊 Resumen de Migración

| Categoría | Endpoints | Estado |
|-----------|-----------|--------|
| **Mobile App - Consultas** | 4 | ✅ Completo |
| **Mobile App - Filtros** | 4 | ✅ Completo |
| **Mobile App - Creación** | 2 | ✅ Completo |
| **Admin - Pedidos** | 5 | ✅ Completo |
| **Admin - Stats** | 2 | ✅ Completo |
| **Admin - Entregas** | 3 | ⚠️ Estructura básica |
| **Admin - Notificaciones** | 3 | ⚠️ Simulado |
| **Admin - Utilidades** | 1 | ⚠️ Pendiente API |
| **TOTAL** | **24** | **16 completos, 8 pendientes** |

---

## 🚀 Estado Actual

- ✅ **16 endpoints completamente funcionales**
- ✅ **Conectado a Google Sheets real**
- ✅ **Sistema de caché funcionando**
- ✅ **Autenticación implementada**
- ⚠️ **8 endpoints con estructura básica** (requieren integración Google Chat/Maps)

**Producción (Apps Script) sigue funcionando normal. Esta es solo la rama de desarrollo.**
