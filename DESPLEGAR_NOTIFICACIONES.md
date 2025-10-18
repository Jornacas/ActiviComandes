# 📤 Despliegue del Microservicio de Notificaciones

Este documento explica cómo desplegar `notificaciones.gs` como Web App en Apps Script para que el backend pueda enviar notificaciones a Google Chat.

---

## 📋 Pasos para Desplegar

### 1. **Abrir Apps Script**
   - Ve a https://script.google.com
   - Crea un **nuevo proyecto** llamado "ActiviComandes Notificaciones"

### 2. **Copiar el Código**
   - Abre el archivo `notificaciones.gs` de este proyecto
   - **Copia TODO el contenido**
   - En Apps Script, reemplaza el contenido de `Code.gs` con el código copiado

### 3. **Configurar el Spreadsheet ID** (Ya está configurado)
   - Verifica que la línea 11 tenga tu Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = '1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw';
   ```

### 4. **Probar el Script** (Opcional pero Recomendado)
   - En Apps Script, selecciona la función `testNotification` en el dropdown
   - Haz clic en **Run** (▶️)
   - Autoriza los permisos cuando te lo pida
   - Verifica en los logs que se envió correctamente

### 5. **Desplegar como Web App**
   - Haz clic en **Deploy** (esquina superior derecha)
   - Selecciona **New deployment**
   - En "Select type", elige **Web app**
   - Configura:
     - **Description**: "Microservicio de notificaciones de Google Chat"
     - **Execute as**: **Me (tu email)**
     - **Who has access**: **Anyone** (o "Anyone with Google account" si prefieres)
   - Haz clic en **Deploy**

### 6. **Copiar la URL**
   - Apps Script te mostrará una **Web app URL**
   - Se verá algo así:
     ```
     https://script.google.com/macros/s/AKfycbx...xxxxx/exec
     ```
   - **COPIA esta URL completa**

### 7. **Configurar en el Backend**
   - Abre `backend/.env`
   - Encuentra la línea `APPS_SCRIPT_NOTIFICATION_URL=`
   - Pega la URL que copiaste:
     ```env
     APPS_SCRIPT_NOTIFICATION_URL=https://script.google.com/macros/s/AKfycbx...xxxxx/exec
     ```
   - Guarda el archivo

### 8. **Reiniciar el Backend**
   - En la terminal donde corre el backend, presiona `Ctrl+C`
   - Vuelve a ejecutar: `cd backend && npm run dev`

---

## ✅ Verificación

Para verificar que todo funciona:

### Test 1: Verificar que el endpoint está activo
   - Abre tu navegador
   - Ve a la URL de tu Web App
   - Deberías ver una respuesta JSON como:
   ```json
   {
     "success": true,
     "service": "ActiviComandes Notificaciones",
     "status": "active",
     "version": "1.0.0"
   }
   ```

### Test 2: Enviar una notificación desde el frontend
   - Ve a la app de admin
   - Asigna un intermediario a un pedido
   - Activa el sistema de notificaciones manuales
   - Intenta enviar una notificación
   - Verifica en los logs del backend que dice:
     ```
     ✅ Notificación enviada correctamente vía Apps Script a /EspacioX
     ```

---

## 🔧 Troubleshooting

### Error: "APPS_SCRIPT_NOTIFICATION_URL no configurada"
   - ✅ Verifica que pegaste la URL en `backend/.env`
   - ✅ Verifica que NO hay espacios antes o después de la URL
   - ✅ Reinicia el backend después de cambiar `.env`

### Error: "Authorization required"
   - ✅ Verifica que desplegaste con "Execute as: Me"
   - ✅ Verifica que "Who has access" está en "Anyone"
   - ✅ Intenta ejecutar `testNotification()` manualmente en Apps Script primero

### Error: "No se encontró Space ID"
   - ✅ Verifica que la hoja `ChatWebhooks` tiene espacios configurados
   - ✅ Verifica que el nombre del espacio existe en la columna A
   - ✅ Verifica que el Space ID existe en la columna B

### Las notificaciones no llegan a Google Chat
   - ✅ Verifica que los Space IDs en la hoja son correctos
   - ✅ Verifica que el bot/tu cuenta tiene permisos en los espacios
   - ✅ Revisa los logs de Apps Script: View → Executions

---

## 📦 Actualizar el Deployment

Si haces cambios en `notificaciones.gs`:

1. Copia el nuevo código a Apps Script
2. **Deploy** → **Manage deployments**
3. Haz clic en el ícono de editar (lápiz)
4. Cambia **Version** a "New version"
5. Haz clic en **Deploy**
6. La URL se mantiene igual (no necesitas actualizar `.env`)

---

## 🎯 Ventajas de Esta Solución

✅ **Usa código que ya funciona** (tu `sendChatNotification` actual)
✅ **No requiere Domain-Wide Delegation**
✅ **No requiere configuración de administrador**
✅ **Funciona con cualquier tipo de cuenta Google**
✅ **Funciona en local Y en Vercel**
✅ **Separación clara de responsabilidades**

---

## 📚 Arquitectura

```
Frontend (Next.js)
     ↓
Backend Node.js (Vercel)
     ↓ HTTP POST
Apps Script (notificaciones.gs)
     ↓ Chat API
Google Chat Spaces
```

El backend maneja toda la lógica de negocio, y Apps Script se encarga SOLO de enviar las notificaciones usando su token OAuth automático.

---

¿Preguntas? Revisa los logs en:
- Backend: Terminal donde corre `npm run dev`
- Apps Script: View → Executions en script.google.com
