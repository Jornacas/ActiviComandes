# 🔐 Problema de Autorización - Chat API

**Fecha:** 06/10/2025  
**Estado:** ⚠️ Pendiente de autorización OAuth

---

## 📊 **Situación Actual**

### ✅ **Lo que está BIEN:**
- ✅ Código actualizado y subido con `clasp push`
- ✅ Chat API habilitada en Apps Script (servicio "Chat")
- ✅ `appsscript.json` con los scopes correctos:
  ```json
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/chat.messages",
    "https://www.googleapis.com/auth/chat.spaces.readonly"
  ]
  ```
- ✅ Hoja ChatWebhooks limpiada (sin columna Webhook URL)
- ✅ Función `sendChatNotification()` usa Chat API
- ✅ Space ID encontrado correctamente: `spaces/AAAA_s_JSlc`

### ❌ **El Problema:**

Al ejecutar `testChatNotification()`, obtenemos este error:

```
Error: You do not have permission to call chat.spaces.messages.create
Required permissions: https://www.googleapis.com/auth/chat.messages
```

**Causa:** Tu cuenta Google **no ha autorizado** los nuevos permisos de Chat API.

---

## 🔍 **¿Por qué pasa esto?**

Cuando añadimos nuevos scopes (permisos) al archivo `appsscript.json`:

1. ✅ El **proyecto** sabe que necesita esos permisos
2. ❌ Pero **tu cuenta** no los ha autorizado todavía
3. ⚠️ Apps Script debería pedir autorización automáticamente, pero **a veces no lo hace**

---

## 🛠️ **Soluciones**

### **Opción 1: Cerrar y Abrir Apps Script** 🔄

**Riesgo:** Ninguno  
**Tiempo:** 1 minuto  
**Efectividad:** 50%

#### Pasos:
1. Cierra completamente la pestaña de Apps Script
2. Ve a https://script.google.com/home
3. Abre el proyecto "ActiviComandes" de nuevo
4. Ejecuta la función `testChatNotification()`
5. **Si aparece ventana pidiendo permisos:**
   - Haz clic en "Revisar permisos"
   - Selecciona tu cuenta
   - Haz clic en "Avanzado" 
   - "Ir a ActiviComandes (no seguro)"
   - "Permitir"
   - ✅ ¡Listo!
6. **Si NO aparece nada:** Pasa a la Opción 2

---

### **Opción 2: Revocar y Re-autorizar** 🔐

**Riesgo:** Downtime de ~2 minutos (mientras autorizas)  
**Tiempo:** 3 minutos  
**Efectividad:** 100% garantizada

#### ⚠️ **Importante - Downtime:**
Durante ~2 minutos mientras revocas y autorizas de nuevo:
- ❌ Triggers automáticos no funcionarán
- ❌ Web App puede dar errores
- ❌ Usuarios tendrán errores de permisos

**Recomendación:** Hazlo en un momento tranquilo (sin usuarios activos).

#### Pasos:

**1. Revocar acceso actual:**
1. Ve a: https://myaccount.google.com/connections
2. Busca en la lista **"ActiviComandes"** o **"Google Apps Script"**
3. Haz clic en él
4. Haz clic en **"Quitar acceso"** o **"Eliminar"**

**2. Re-autorizar (inmediatamente después):**
5. Vuelve a Apps Script: https://script.google.com/home
6. Abre el proyecto "ActiviComandes"
7. Ejecuta `testChatNotification()`
8. **Ahora SÍ aparecerá la ventana de permisos**
9. Haz clic en **"Revisar permisos"**
10. Selecciona tu cuenta
11. Verás: *"Esta aplicación no ha sido verificada"*
    - Esto es **NORMAL** para apps internas
    - Es seguro si es tu propia app
12. Haz clic en **"Avanzado"** (abajo, en gris)
13. Haz clic en **"Ir a ActiviComandes (no seguro)"**
14. Verás la lista de permisos:
    ```
    ✅ Ver, editar, crear y eliminar hojas de cálculo
    ✅ Enviar mensajes en Google Chat
    ✅ Ver espacios en Google Chat
    ```
15. Haz clic en **"Permitir"**
16. ✅ **¡Listo!** Todos los permisos autorizados

**3. Verificar:**
17. El script ejecutará automáticamente
18. Deberías ver en logs: `✅ Mensaje enviado correctamente`
19. Ve a Google Chat, espacio `/LestonnacDX1`
20. Deberías ver el mensaje de prueba

---

## 📋 **Permisos que se autorizarán**

Cuando autorices, Google te pedirá permiso para que ActiviComandes pueda:

| Permiso | Descripción | Uso |
|---------|-------------|-----|
| `spreadsheets` | Ver/editar hojas de cálculo | Leer datos, actualizar estados (YA LO TENÍAS) |
| `chat.messages` | Enviar mensajes en Google Chat | Enviar notificaciones a espacios (NUEVO) |
| `chat.spaces.readonly` | Ver espacios de Google Chat | Verificar que el espacio existe (NUEVO) |

**Nota:** Los permisos anteriores (Spreadsheets) se mantienen, solo se añaden los nuevos de Chat.

---

## 🎯 **Resultado Esperado**

Una vez autorizado correctamente, al ejecutar `testChatNotification()` deberías ver:

### **En los logs de Apps Script:**
```
ℹ️ La hoja ChatWebhooks ya existe
🧪 Enviando mensaje de prueba a: /LestonnacDX1
📤 Intentando enviar notificación a: /LestonnacDX1
✅ Space ID encontrado para /LestonnacDX1: spaces/AAAA_s_JSlc
✅ Mensaje enviado correctamente a /LestonnacDX1 (spaces/AAAA_s_JSlc)

📊 Resultado del test:
{
  "success": true,
  "spaceName": "/LestonnacDX1",
  "spaceId": "spaces/AAAA_s_JSlc",
  "message": "Notificación enviada correctamente",
  "messageId": "spaces/AAAA_s_JSlc/messages/xyz123..."
}
```

### **En Google Chat (espacio /LestonnacDX1):**
```
🔔 TEST DE NOTIFICACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Aquest és un missatge de prova del sistema de notificacions.
Si reps això, el sistema funciona correctament! ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 **Después de Resolver**

Una vez autorizado:

1. ✅ **Sistema completo y funcional**
2. ✅ **Notificaciones automáticas** al crear entregas
3. ✅ **Cero configuración manual** por espacio
4. ✅ **Escalable** a cualquier número de espacios

El sistema enviará notificaciones automáticamente cuando se cree una entrega desde el Admin App.

---

## 💡 **Recomendación Final**

**Si NO tienes usuarios activos ahora:** 
→ Ve directo a **Opción 2** (más rápida y garantizada)

**Si tienes usuarios activos:**
→ Prueba primero **Opción 1** (sin riesgo)  
→ Si no funciona, programa la **Opción 2** para un momento tranquilo

---

## 📞 **En caso de problemas**

Si después de autorizar sigue sin funcionar:

1. Verifica que los 3 scopes estén en `appsscript.json`
2. Verifica que el servicio "Chat" esté añadido en Apps Script
3. Comprueba los logs para ver el error específico
4. Verifica que el Space ID sea correcto en la hoja ChatWebhooks

---

**Última actualización:** 06/10/2025  
**Estado:** Esperando autorización OAuth del usuario

