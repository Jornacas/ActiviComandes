# ActiviComandes - Configuración de Producción

## 📋 Estado Actual del Sistema

**Fecha de última actualización:** 20 de octubre de 2025

### ✅ Sistema Funcionando Correctamente

El sistema está completamente operativo en producción con la siguiente arquitectura:

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA HÍBRIDA                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Next.js)                                          │
│  ├─ URL: https://activicomandes-admin.vercel.app            │
│  └─ Hosting: Vercel                                         │
│                                                               │
│  Backend (Node.js/Express)                                   │
│  ├─ URL: https://backend-umber-six-64.vercel.app           │
│  ├─ Hosting: Vercel Serverless Functions                    │
│  └─ Conecta con: Google Sheets API                          │
│                                                               │
│  Google Apps Script (Microservicio)                         │
│  ├─ Funcionalidad: Notificaciones Google Chat               │
│  └─ Llamado por: Backend Node.js vía webhook                │
│                                                               │
│  Datos                                                       │
│  ├─ Google Sheets (Base de datos)                           │
│  └─ ID: 1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuración de Variables de Entorno

### Backend (Vercel)

Variables configuradas en: `https://vercel.com/jornacas-gmailcoms-projects/backend/settings/environment-variables`

```env
# Google Sheets
SPREADSHEET_ID=1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw
GOOGLE_SERVICE_ACCOUNT_BASE64=[base64 encoded credentials]

# Autenticación
AUTH_TOKEN=<TOKEN>

# Node.js
NODE_ENV=production
```

**⚠️ IMPORTANTE:**
- El `SPREADSHEET_ID` NO debe tener espacios ni saltos de línea al final
- Las credenciales están codificadas en base64 para evitar problemas con caracteres especiales
- El service account debe tener permisos de Editor en el Google Sheet

### Frontend (Vercel)

Variables configuradas en: `https://vercel.com/jornacas-gmailcoms-projects/activi-comandes-admin/settings/environment-variables`

```env
NEXT_PUBLIC_API_URL=https://backend-umber-six-64.vercel.app
NEXT_PUBLIC_API_TOKEN=<TOKEN>
```

---

## 🔐 Service Account de Google

**Email:** `activiconta-service@activiconta.iam.gserviceaccount.com`

**Permisos necesarios:**
- ✅ Acceso de Editor al Google Sheet principal
- ✅ Google Sheets API habilitada
- ✅ Google Chat API habilitada (para notificaciones)

**Archivo de credenciales:**
- Local: `backend/credentials.json`
- Vercel: Codificado en `GOOGLE_SERVICE_ACCOUNT_BASE64`

**Para generar el base64:**
```bash
cat backend/credentials.json | base64 -w 0
```

---

## 📊 Google Sheets - Estructura

**Spreadsheet ID:** `1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw`

**Hojas disponibles:**
1. `Dades` - Datos maestros
2. `Respostes` - Órdenes de material
3. `ChatWebhooks` - Configuración de webhooks para notificaciones
4. `BaseApp` - Datos base de la aplicación
5. `MatCO` - Materiales CO
6. `MatDX1` - Materiales DX1
7. `MatDX2` - Materiales DX2
8. `MatHC1` - Materiales HC1
9. `MatHC2` - Materiales HC2
10. `MatTC` - Materiales TC

---

## 🚀 Deployments

### Backend

**URL de producción:** `https://backend-umber-six-64.vercel.app`

**Comando para deployment manual:**
```bash
cd backend
vercel --prod
```

**Verificar funcionamiento:**
```bash
# Health check
curl https://backend-umber-six-64.vercel.app/

# Debug environment variables
curl https://backend-umber-six-64.vercel.app/debug/env

# Test Google Sheets connection
curl https://backend-umber-six-64.vercel.app/debug/test-sheets

# Test API con autenticación
curl "https://backend-umber-six-64.vercel.app/api/admin/orders?token=<TOKEN>&limit=5"
```

### Frontend

**URL de producción:** `https://activicomandes-admin.vercel.app`

**Comando para deployment manual:**
```bash
cd frontend
vercel --prod
```

**Nota:** Vercel hace auto-deployment al hacer push a la rama `main` de GitHub.

---

## 🐛 Problema Resuelto

### Síntoma
- Frontend mostraba "Error desconocido al cargar datos"
- Backend retornaba: `"Requested entity was not found"` (HTTP 404)
- Local funcionaba perfectamente
- Vercel no podía acceder a Google Sheets

### Causa Raíz
El `SPREADSHEET_ID` configurado en las variables de entorno de Vercel contenía un **salto de línea `\n`** al final:
```
1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw\n
```

Este carácter invisible causaba que Google Sheets API no pudiera encontrar el spreadsheet.

### Solución
1. Identificado mediante endpoint de debug que mostraba el `SPREADSHEET_ID` completo
2. Corregida la variable de entorno en Vercel eliminando el salto de línea
3. Verificado que la longitud correcta es 44 caracteres (antes era 45 con el `\n`)

### Lecciones Aprendidas
- ✅ Siempre usar `.trim()` en variables de entorno críticas
- ✅ Crear endpoints de debug para verificar configuración en producción
- ✅ Mostrar longitud de strings para detectar caracteres invisibles
- ✅ Las credenciales de Google pueden funcionar en local pero fallar en Vercel por caracteres especiales

---

## 📁 Estructura de Archivos

```
ActiviComandes/
├── backend/
│   ├── src/
│   │   ├── server.js              # Servidor Express principal
│   │   ├── routes/
│   │   │   ├── admin.js           # Rutas admin
│   │   │   └── mobile.js          # Rutas mobile
│   │   ├── services/
│   │   │   ├── sheets.js          # Cliente Google Sheets
│   │   │   ├── cache.js           # Sistema de caché
│   │   │   └── chat.js            # Cliente Google Chat
│   │   └── middleware/
│   │       └── legacy.js          # Compatibilidad Apps Script
│   ├── credentials.json           # Credenciales local (NO en git)
│   ├── .env                       # Variables locales (NO en git)
│   ├── vercel.json                # Configuración Vercel
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   ├── components/
│   │   │   ├── OrdersTable.tsx    # Tabla principal
│   │   │   ├── AdminTabs.tsx      # Tabs de navegación
│   │   │   └── ...
│   │   └── lib/
│   │       └── api.ts             # Cliente API
│   ├── .env.production            # Variables producción (NO en git)
│   ├── vercel.json                # Configuración Vercel
│   └── package.json
│
└── DEPLOYMENT.md                  # Este documento
```

---

## 🔄 Workflow de Desarrollo

### Desarrollo Local

1. **Backend:**
   ```bash
   cd backend
   npm run dev
   # Servidor en http://localhost:3001
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   # Aplicación en http://localhost:3000
   ```

### Deployment a Producción

1. **Commit cambios:**
   ```bash
   git add .
   git commit -m "descripción cambios"
   git push
   ```

2. **Vercel hace auto-deployment** de ambos proyectos al detectar push a `main`

3. **Verificar deployment:**
   - Backend: `https://backend-umber-six-64.vercel.app/`
   - Frontend: `https://activicomandes-admin.vercel.app/`

---

## 📱 APIs Disponibles

### Endpoints Públicos

```
GET  /                              # Health check
GET  /debug/env                     # Variables de entorno
GET  /debug/test-sheets             # Test conexión Google Sheets
```

### Mobile App (requiere token)

```
GET  /api/schools                   # Listar escuelas
GET  /api/monitors                  # Listar monitores
GET  /api/materials                 # Listar materiales
GET  /api/activities                # Listar actividades
POST /api/sollicitud                # Crear solicitud
```

### Admin App (requiere token)

```
GET  /api/admin/orders              # Obtener órdenes
POST /api/admin/orders/update-status # Actualizar estado
POST /api/admin/orders/delete       # Eliminar órdenes
POST /api/admin/delivery/create     # Crear entrega
POST /api/admin/notifications/send  # Enviar notificación
```

**Autenticación:**
Todas las APIs admin requieren el parámetro: `?token=<TOKEN>`

---

## 🔔 Sistema de Notificaciones

Las notificaciones se envían a través de **Google Chat** usando webhooks configurados en la hoja `ChatWebhooks`.

**Tipos de notificaciones:**
- Órdenes listas para recoger
- Entregas asignadas a intermediarios
- Materiales preparados
- Alertas de compras necesarias

**Implementación:**
- Backend Node.js llama al microservicio de Google Apps Script
- Apps Script gestiona el envío a Google Chat
- Webhooks configurados por escuela/monitor

---

## 🛠️ Troubleshooting

### Backend no puede acceder a Google Sheets

1. Verificar variables de entorno:
   ```bash
   curl https://backend-umber-six-64.vercel.app/debug/env
   ```

2. Verificar que `spreadsheetId` no tiene espacios ni saltos de línea

3. Verificar que service account tiene permisos en el Sheet

4. Test directo de conexión:
   ```bash
   curl https://backend-umber-six-64.vercel.app/debug/test-sheets
   ```

### Frontend muestra error de carga

1. Verificar que backend responde:
   ```bash
   curl "https://backend-umber-six-64.vercel.app/api/admin/orders?token=<TOKEN>&limit=1"
   ```

2. Verificar variables de entorno en frontend (Vercel dashboard)

3. Verificar logs del frontend en Vercel

### Credenciales inválidas

1. Regenerar el base64:
   ```bash
   cat backend/credentials.json | base64 -w 0
   ```

2. Actualizar `GOOGLE_SERVICE_ACCOUNT_BASE64` en Vercel

3. Redeploy el backend

---

## 📞 Contacto y Soporte

**Proyecto:** ActiviComandes - Sistema de Gestión de Material Educativo

**Repositorio:** GitHub (privado)

**Entorno de Producción:**
- Frontend: Vercel
- Backend: Vercel Serverless
- Base de datos: Google Sheets
- Notificaciones: Google Apps Script + Google Chat

---

## ✅ Checklist de Deployment

Antes de hacer deployment a producción, verificar:

- [ ] Variables de entorno configuradas en Vercel (backend y frontend)
- [ ] `SPREADSHEET_ID` sin espacios ni saltos de línea
- [ ] Service account con permisos de Editor en Google Sheet
- [ ] Credenciales en base64 correctamente codificadas
- [ ] Token de autenticación actualizado
- [ ] Tests locales pasando
- [ ] Backend responde correctamente: `/debug/test-sheets`
- [ ] Frontend conecta con backend correcto
- [ ] Notificaciones de Google Chat funcionando

---

**Última verificación exitosa:** 20 de octubre de 2025, 00:15 CEST

Sistema completamente operativo ✅
