# 🚀 Setup del Backend - ActiviComandes

## ✅ Lo que hemos hecho

### 1. Estructura del proyecto creada
```
backend/
├── src/
│   ├── server.js              ✅ Servidor Express configurado
│   ├── middleware/
│   │   └── auth.js            ✅ Sistema de autenticación
│   ├── services/
│   │   ├── cache.js           ✅ Sistema de caché en memoria
│   │   └── sheets.js          ✅ Conexión a Google Sheets API
│   └── routes/
│       ├── mobile.js          ✅ 11 endpoints Mobile App migrados
│       └── admin.js           ⏳ Pendiente (estructura básica creada)
├── .env                       ⚠️  Necesita configuración
├── .env.example
├── package.json               ✅ Dependencias instaladas
└── README.md
```

### 2. Endpoints Mobile App migrados (11/11) ✅

- ✅ GET `/api/schools` - Lista de escuelas
- ✅ GET `/api/monitors` - Lista de monitores
- ✅ GET `/api/activities` - Lista de actividades
- ✅ GET `/api/materials` - Lista de materiales
- ✅ GET `/api/activities/by-school?school=...`
- ✅ GET `/api/schools/by-monitor?monitor=...`
- ✅ GET `/api/activities/by-monitor-and-school?monitor=...&school=...`
- ✅ GET `/api/materials/by-activity?activity=...`
- ✅ POST `/api/sollicitud` - Crear solicitud individual
- ✅ POST `/api/sollicitud/multiple` - Crear múltiples solicitudes

### 3. Sistema de caché implementado ✅
Equivalente a `CacheService.getScriptCache()` de Apps Script

### 4. Autenticación configurada ✅
Mismo token que Apps Script: `<TOKEN>`

---

## ⚙️ Próximos pasos para ti

### Paso 1: Obtener ID de tu Google Sheet

1. Abre tu Google Sheet de ActiviComandes
2. Copia el ID de la URL:
   ```
   https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
   ```
3. Edita el archivo `backend/.env` y reemplaza:
   ```
   SPREADSHEET_ID=TU_ID_AQUI
   ```

### Paso 2: Configurar credenciales de Google Cloud

#### Opción A: Si ya tienes un proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (el que usas para Apps Script)
3. Ve a **APIs & Services > Credentials**
4. Crea una **Service Account**:
   - Click en "Create Credentials" → "Service Account"
   - Dale un nombre (ej: "activicomandes-backend")
   - Click "Create and Continue"
   - Rol: "Editor" (o "Google Sheets API > Spreadsheets Editor")
   - Click "Done"
5. Click en la service account que acabas de crear
6. Ve a la pestaña "Keys"
7. Click "Add Key" → "Create new key" → JSON
8. Se descargará un archivo JSON
9. Renombra el archivo a `credentials.json`
10. Muévelo a la carpeta `backend/`

#### Opción B: Si no tienes proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Google Sheets API**:
   - Ve a "APIs & Services > Library"
   - Busca "Google Sheets API"
   - Click "Enable"
4. Sigue los pasos de la Opción A desde el punto 3

### Paso 3: Dar permisos al Service Account

1. Copia el email de tu service account (está en el archivo `credentials.json`, campo `client_email`)
2. Abre tu Google Sheet de ActiviComandes
3. Click en "Compartir" (arriba a la derecha)
4. Pega el email del service account
5. Dale permisos de **Editor**
6. Click "Enviar"

### Paso 4: Probar el servidor

```bash
cd backend
npm run dev
```

Deberías ver:
```
╔═══════════════════════════════════════════════╗
║   ActiviComandes Backend API                  ║
║   Servidor corriendo en http://localhost:3000 ║
║   Entorno: development                        ║
╚═══════════════════════════════════════════════╝
```

### Paso 5: Probar un endpoint

Abre tu navegador o Postman y prueba:

```
http://localhost:3000/api/schools?token=<TOKEN>
```

Deberías ver la lista de escuelas desde tu Google Sheet.

---

## 🧪 Testing

### Endpoints que puedes probar ahora:

1. **Health check** (sin token):
   ```
   GET http://localhost:3000/
   ```

2. **Lista de escuelas**:
   ```
   GET http://localhost:3000/api/schools?token=<TOKEN>
   ```

3. **Lista de monitores**:
   ```
   GET http://localhost:3000/api/monitors?token=<TOKEN>
   ```

4. **Crear solicitud** (POST):
   ```bash
   curl -X POST http://localhost:3000/api/sollicitud?token=<TOKEN> \
     -H "Content-Type: application/json" \
     -d '{
       "nomCognoms": "Test Usuario",
       "escola": "Escola Test",
       "activitat": "CO1",
       "material": "Pelotas",
       "unitats": "5"
     }'
   ```

---

## 🔥 Troubleshooting

### Error: "No se pudo conectar a Google Sheets"
- ✅ Verifica que el archivo `credentials.json` esté en `backend/`
- ✅ Verifica que el SPREADSHEET_ID en `.env` sea correcto
- ✅ Verifica que el service account tenga permisos en el Sheet

### Error: "Unauthorized access"
- ✅ Añade `?token=<TOKEN>` a la URL
- ✅ O envía el token en el body del POST

### El servidor no arranca
- ✅ Verifica que Node.js esté instalado: `node --version`
- ✅ Verifica que las dependencias estén instaladas: `npm install`
- ✅ Verifica que el puerto 3000 no esté ocupado

---

## 📋 Pendientes

### Endpoints Admin App (18 pendientes)
- ⏳ GET `/api/admin/orders` - Cargar pedidos
- ⏳ POST `/api/admin/orders/update` - Actualizar estado
- ⏳ POST `/api/admin/orders/delete` - Eliminar pedidos
- ⏳ GET `/api/admin/stats` - Estadísticas dashboard
- ⏳ GET `/api/admin/preparated-orders` - Pedidos preparados
- ⏳ POST `/api/admin/delivery/create` - Crear entrega
- ⏳ POST `/api/admin/notifications/send` - Enviar notificación
- ... y más (ver Code.gs líneas 135-232)

### Mejoras futuras
- [ ] Sistema de logging mejorado
- [ ] Tests unitarios
- [ ] Validación de inputs con Joi o Zod
- [ ] Rate limiting
- [ ] Documentación API con Swagger
- [ ] CI/CD con GitHub Actions

---

## 🎯 Estado actual

✅ **Rama**: `backend-migration` (separada de producción)
✅ **Mobile App**: 11 endpoints migrados y listos
⏳ **Admin App**: Estructura creada, pendiente migración
⏳ **Google Sheets**: Pendiente configuración de credenciales

**Producción no se ha tocado. Sigue funcionando normal con Apps Script.**

---

¿Necesitas ayuda con alguno de estos pasos? Avísame cuando tengas las credenciales configuradas y probamos juntos.
