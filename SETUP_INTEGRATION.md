# 🚀 Guía de Integración Completa - Backend API + Frontend

## Estado Actual del Proyecto

✅ **Backend (Code.gs)** - API REST completamente funcional
✅ **Frontend (Next.js)** - Prototipo mínimo funcional
🔄 **Integración** - Lista para validar

## Pasos para Activar la Integración

### 1. Configurar el Backend (Google Apps Script)

#### 1.1 Actualizar AUTH_TOKEN
En `Code.gs` línea 14:
```javascript
const AUTH_TOKEN = "mi_token_super_secreto_123"; // Cambia esto por un token seguro
```

#### 1.2 Desplegar como Web App
1. Abre Google Apps Script con tu `Code.gs`
2. Haz clic en **"Implementar"** > **"Nueva implementación"**
3. Tipo: **"Aplicación web"**
4. Configuración:
   - Ejecutar como: **"Yo"**
   - Acceso: **"Cualquier persona"**
5. Copia la **URL de la aplicación web**

### 2. Configurar el Frontend

#### 2.1 Instalar dependencias
```bash
cd frontend
npm install
```

#### 2.2 Configurar variables de entorno
```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
NEXT_PUBLIC_API_TOKEN=mi_token_super_secreto_123
```

#### 2.3 Ejecutar el frontend
```bash
npm run dev
```

### 3. Validar la Integración

#### 3.1 Test Manual - Navegador
1. Abre http://localhost:3000
2. Verifica que carga la tabla (puede estar vacía al principio)
3. Prueba el botón "Sincronizar Formulario"
4. Verifica las estadísticas

#### 3.2 Test API - Directo
Prueba la API directamente:
```
GET: https://script.google.com/macros/s/TU_SCRIPT_ID/exec?action=loadData&token=mi_token_super_secreto_123
```

## Arquitectura de la Integración

```
Frontend (Next.js)     ←→     Backend (Google Apps Script)
├── api.ts                    ├── handleApiRequest()
├── OrdersTable.tsx           ├── loadData()
└── Material-UI               ├── processFormResponses()
                              ├── updateOrderStatus()
                              └── Google Sheets
```

## Endpoints API Disponibles

| Endpoint | Método | Descripción |
|----------|---------|-------------|
| `loadData` | GET | Cargar todos los pedidos |
| `processFormResponses` | POST | Sincronizar con formulario |
| `updateOrderStatus` | POST | Actualizar estados en lote |
| `updateDeliveryInfo` | POST | Actualizar centros de entrega |
| `getSchools` | GET | Lista de escuelas |
| `getMonitors` | GET | Lista de monitores |
| `getMaterials` | GET | Lista de materiales |
| `createOrder` | POST | Crear nuevo pedido |
| `getStats` | GET | Estadísticas dashboard |

## Solución de Problemas

### Error: "Unauthorized access"
- Verifica que el `AUTH_TOKEN` sea igual en backend y frontend
- Asegúrate de que la URL de la API sea correcta

### Error: "CORS"
- Google Apps Script maneja CORS automáticamente
- Verifica que la implementación sea pública

### Error: "No data"
- Verifica que exista la hoja "Comandes" en Google Sheets
- Ejecuta primero "Sincronizar Formulario" para obtener datos

## Próximos Pasos (Fase 2)

1. **Dashboard avanzado** con Chart.js
2. **Formulario de creación** de pedidos
3. **Filtros avanzados** por fecha, escuela, etc.
4. **Notificaciones** en tiempo real
5. **Exportación** a PDF/Excel