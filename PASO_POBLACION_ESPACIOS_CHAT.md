# 📋 PASO MANUAL: Poblar Hoja ChatWebhooks

## ✅ **LO QUE YA ESTÁ HECHO:**

He añadido en `Code.gs` las siguientes funciones:
- ✅ `setupChatWebhooksSheet()` - Crea la hoja ChatWebhooks
- ✅ `getSpaceIdByName(spaceName)` - Busca Space IDs
- ✅ `sendChatNotification(spaceName, message)` - Envía notificaciones
- ✅ `testChatNotification()` - Función de prueba

---

## 🔧 **LO QUE TIENES QUE HACER AHORA:**

### **Paso 1: Ejecutar el script en Google Apps Script**

1. **Abrir tu proyecto de Google Apps Script**
   - Ve a: https://script.google.com/home
   - Busca tu proyecto `ActiviComandes`

2. **Ejecutar setupChatWebhooksSheet()**
   - En el editor de Apps Script, selecciona la función `setupChatWebhooksSheet` en el menú desplegable
   - Click en el botón ▶️ Ejecutar
   - Autoriza los permisos si te los pide
   - Esto creará la hoja `ChatWebhooks` en tu spreadsheet

---

### **Paso 2: Instalar dependencias Python**

```bash
pip install flask requests-oauthlib google-api-python-client gspread google-auth
```

### **Paso 3: Configurar y ejecutar el script de exportación**

He creado un script completo llamado `export_chat_spaces.py`. 

**IMPORTANTE**: Antes de ejecutarlo, edita estas líneas del archivo:

```python
CLIENT_SECRET = 'TU_CLIENT_SECRET_REAL'  # Línea 22 - Poner tu client secret
SPREADSHEET_ID = '1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw'  # Línea 23 - Verificar que sea correcto
```

### **Paso 4: Ejecutar el script**

```bash
python export_chat_spaces.py
```

El script abrirá un navegador en `http://localhost:5000` donde podrás:
1. Autenticarte con Google
2. Ver todos los espacios encontrados
3. Exportarlos automáticamente a la hoja `ChatWebhooks`

**Resultado esperado:**
- ✅ Todos los espacios exportados a Google Sheets
- ✅ Resumen visual en el navegador
- ✅ Logs detallados en la terminal

---

## 🧪 **Paso 5: Probar que funciona**

Una vez que la hoja `ChatWebhooks` esté poblada:

1. **En Google Apps Script**, ejecuta la función `testChatNotification()`
2. **IMPORTANTE**: Antes de ejecutar, edita la línea 2150 de Code.gs:
   ```javascript
   const testSpaceName = '/LestonnacDX1'; // Cambiar por un espacio REAL que tengas
   ```
   Cambia `/LestonnacDX1` por el nombre de un espacio real que hayas visto en tus logs

3. Ejecuta la función
4. Deberías ver el mensaje de prueba en ese espacio de Google Chat

---

## ⚠️ **IMPORTANTE: Habilitar Google Chat API Advanced Service**

Para que `Chat.Spaces.Messages.create()` funcione en Apps Script:

1. En el editor de Google Apps Script, ve a **Servicios** (+)
2. Busca **"Google Chat API"**
3. Añádelo con el identificador: `Chat`
4. Click en **Agregar**

---

## 📊 **Formato esperado en la hoja ChatWebhooks**

| Nombre Espacio       | Space ID              | Fecha Creación | Miembros | Última Actualización |
|---------------------|-----------------------|----------------|----------|---------------------|
| /LestonnacDX1       | spaces/AAAA_s_JSlc    | 2024-09-22...  | 5        | 2025-10-05 18:30:00 |
| /DiputacioTC        | spaces/AAAAGG922Ko    | 2024-10-03...  | 6        | 2025-10-05 18:30:00 |
| /PoblenouTC         | spaces/AAAA3DCHttE    | 2024-10-08...  | 5        | 2025-10-05 18:30:00 |

---

## ✅ **Cuando termines estos pasos:**

Avísame y continuamos con la integración en el flujo de `createDelivery` para que las notificaciones se envíen automáticamente cuando se asigne un intermediario.

---

**Última actualización**: 05/10/2025
