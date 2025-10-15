# Situación Actual - Migración Backend Node.js

**Fecha**: 14 de Octubre de 2025
**Rama**: `backend-migration`
**Estado**: ⚠️ **PENDIENTE DE RESOLVER ERROR 500**

---

## 🎯 Objetivo Cumplido (Parcialmente)

Se completó la migración del frontend para que use el backend Node.js con rutas REST en lugar del formato Google Apps Script.

---

## ✅ Trabajo Completado

### 1. **Backend Node.js**
- ✅ Servidor corriendo correctamente en `http://localhost:3000`
- ✅ Endpoints REST implementados y funcionando:
  - `GET /api/admin/orders/preparated` - Funciona correctamente (probado con curl)
  - `POST /api/admin/delivery/options` - Implementado
  - `POST /api/admin/delivery/create` - Implementado
- ✅ Autenticación funcionando con token `comanda_materials_2024`
- ✅ Google Sheets API funcionando
- ✅ Google Maps Routes API v2 configurada

### 2. **Frontend Next.js - Archivos Modificados**

#### `frontend/src/lib/api.ts`
**Cambios realizados:**
- Métodos `getPreparatedOrders()`, `getDeliveryOptions()`, y `createDelivery()` actualizados
- Migrados del formato Google Apps Script (`?action=`) a rutas REST (`/api/admin/...`)
- Añadida autenticación con header `Authorization: Bearer`

```typescript
// ANTES (Google Apps Script):
const url = new URL(API_BASE_URL);
url.searchParams.append('action', 'getPreparatedOrders');

// DESPUÉS (Node.js REST):
const url = `${API_BASE_URL}/api/admin/orders/preparated`;
fetch(url, {
  headers: { 'Authorization': `Bearer ${API_TOKEN}` }
})
```

#### `frontend/src/components/DeliveryManager.tsx`
**Cambios realizados:**
- Añadido import: `import { apiClient } from '../lib/api';`
- Eliminadas constantes `API_BASE_URL` y `API_TOKEN` (ya no se usan directamente)
- Función `fetchPreparatedOrders()` ahora usa `apiClient.getPreparatedOrders()`
- Función `getDeliveryOptionsForSelected()` ahora usa `apiClient.getDeliveryOptions()`
- Función `createDelivery()` ahora usa `apiClient.createDelivery()`

---

## ⚠️ Problema Actual

### Error HTTP 500

**Síntoma:**
- Frontend carga en `http://localhost:3002` pero muestra "HTTP error! status: 500"
- El backend está corriendo correctamente
- Los endpoints funcionan cuando se prueban con curl

**Posibles Causas:**
1. **Error en el backend al procesar la petición del frontend**
2. **CORS o problema de autenticación**
3. **Formato de datos incorrecto entre frontend-backend**
4. **Problema con Next.js cache** (hay conflictos con Dropbox sincronizando `.next/cache`)

**Para Diagnosticar:**
1. Revisar logs del backend: `BashOutput` del proceso `f18417`
2. Revisar logs del frontend en consola del navegador
3. Verificar que el endpoint `/api/admin/orders` funcione correctamente
4. Probar la petición con las DevTools del navegador

---

## 📁 Archivos Modificados (Sin Commitear)

```
M backend/package-lock.json
M backend/package.json
M backend/src/middleware/legacy.js
M backend/src/routes/admin.js
M frontend/src/components/DeliveryManager.tsx
M frontend/src/components/OrdersTable.tsx
M frontend/src/lib/api.ts

?? backend/src/services/maps.js
?? ESTADO_MIGRACION.md
?? .claspignore
?? activiconta-9166254b6d22.json
?? SITUACION_ACTUAL.md (este archivo)
```

---

## 🔧 Configuración Actual

### Backend (`backend/.env`)
```env
PORT=3000
NODE_ENV=development
API_TOKEN=comanda_materials_2024
GOOGLE_MAPS_API_KEY=AIzaSyByO41A21_Ze-M-0wjbsooHVf0mElEnatI
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TOKEN=comanda_materials_2024
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

---

## 🚀 Próximos Pasos para Resolver

### 1. **Diagnosticar el Error 500**

```bash
# Ver logs del backend
cd backend
npm run dev
# (observar qué error aparece cuando el frontend hace la petición)

# En el navegador:
# - Abrir DevTools (F12)
# - Ir a Network tab
# - Recargar la página
# - Ver qué petición falla y qué error devuelve
```

### 2. **Verificar Endpoint Específico**

```bash
# Probar el endpoint que el frontend intenta llamar primero
curl -H "Authorization: Bearer comanda_materials_2024" http://localhost:3000/api/admin/orders
```

### 3. **Revisar Logs del Frontend**

Abrir `http://localhost:3002` en el navegador y revisar:
- Console tab: errores JavaScript
- Network tab: peticiones fallidas y sus respuestas

### 4. **Solución Temporal de Next.js Cache**

Si persisten problemas con cache de Next.js debido a Dropbox:

```bash
# Detener frontend
# Cerrar Dropbox temporalmente
# Borrar cache
cd frontend
rm -rf .next
# Reiniciar Dropbox
# Iniciar frontend
npm run dev
```

---

## 📋 Comandos Útiles

### Iniciar Servidores

```bash
# Backend
cd backend
npm run dev
# Corre en http://localhost:3000

# Frontend
cd frontend
npm run dev
# Corre en http://localhost:3001 o 3002
```

### Probar Endpoints

```bash
# Comandes preparades
curl -H "Authorization: Bearer comanda_materials_2024" \
  http://localhost:3000/api/admin/orders/preparated

# Opciones de entrega (POST)
curl -X POST \
  -H "Authorization: Bearer comanda_materials_2024" \
  -H "Content-Type: application/json" \
  -d '{"orders":[...]}' \
  http://localhost:3000/api/admin/delivery/options
```

---

## 🔍 Información de Debug

### Procesos en Background

- **Backend**: Shell ID `f18417` - `cd backend && npm run dev`
- **Frontend**: Shell ID `b92316` - `cd frontend && rm -rf .next && npm run dev` (último intento)

### Verificación Rápida del Backend

El backend está funcionando - prueba exitosa:
```bash
$ curl -H "Authorization: Bearer comanda_materials_2024" \
  http://localhost:3000/api/admin/orders/preparated

# Devuelve 22 comandas preparadas correctamente
```

---

## 📝 Notas Importantes

1. **No hacer commit todavía** - Esperar a resolver el error 500
2. **Dropbox puede causar problemas** con archivos `.next/cache` - considerar pausarlo temporalmente
3. **Los endpoints del backend funcionan** - el problema está en la integración frontend-backend
4. **La migración de Google Apps Script a Node.js está completa** en términos de código

---

## 🔗 Referencias

- **Documentación anterior**: `ESTADO_MIGRACION.md`
- **Backend routes**: `backend/src/routes/admin.js`
- **Frontend API client**: `frontend/src/lib/api.ts`
- **Componente afectado**: `frontend/src/components/DeliveryManager.tsx`

---

**Última actualización**: 14/10/2025 18:00
