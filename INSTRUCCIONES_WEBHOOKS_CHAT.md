# 📋 Instrucciones para Configurar Webhooks de Google Chat

## ¿Qué son los Webhooks?

Los webhooks de Google Chat son URLs únicas que permiten enviar mensajes a un espacio sin necesidad de configurar un bot completo ni autenticación OAuth compleja.

---

## 🔧 Paso 1: Obtener la Webhook URL de un Espacio

Para cada espacio de Google Chat donde quieres recibir notificaciones, necesitas obtener su Webhook URL:

### 1.1 Abre Google Chat
- Ve a [chat.google.com](https://chat.google.com)
- O usa la app de Google Chat

### 1.2 Selecciona el Espacio
- Haz clic en el espacio donde quieres recibir notificaciones
- Por ejemplo: "/LestonnacDX1"

### 1.3 Abre la Configuración del Espacio
- Haz clic en el **nombre del espacio** en la parte superior
- Selecciona **"Administrar webhooks"**

### 1.4 Crear un Webhook
Si no existe ningún webhook:
1. Haz clic en **"+ Agregar webhook"** o **"Crear webhook"**
2. Dale un nombre descriptivo, por ejemplo: **"ActiviComandes Notificaciones"**
3. Opcionalmente, puedes añadir un avatar/icono
4. Haz clic en **"Guardar"**

### 1.5 Copiar la URL del Webhook
1. Una vez creado, verás la **Webhook URL**
2. Haz clic en el icono de **copiar** 📋
3. La URL tiene este formato:
   ```
   https://chat.googleapis.com/v1/spaces/AAAA.../messages?key=...&token=...
   ```

---

## 📊 Paso 2: Añadir el Webhook a la Hoja de Cálculo

### 2.1 Abre tu Google Sheet
- Ve a tu hoja de cálculo "ActiviComandes"
- Selecciona la pestaña **"ChatWebhooks"**

### 2.2 Localiza el Espacio
- Busca la fila correspondiente al espacio (por ejemplo: "/LestonnacDX1")
- Ya debería tener el **Nombre del Espacio** y el **Space ID** (si ejecutaste el script Python)

### 2.3 Pega la Webhook URL
- En la columna **"Webhook URL"** (columna B)
- Pega la URL que copiaste en el paso anterior

### 2.4 Repite para Todos los Espacios
- Repite los pasos 1 y 2 para cada espacio donde quieras recibir notificaciones
- Los espacios prioritarios son los que corresponden a escuelas y actividades activas

---

## 🧪 Paso 3: Probar el Sistema

### 3.1 Ejecuta la Función de Test
1. Ve al **Editor de Apps Script** (script.google.com)
2. Abre tu proyecto "ActiviComandes"
3. Busca la función **`testChatNotification()`**
4. Cámbiala para usar un espacio que ya tenga webhook configurado
5. Ejecuta la función

### 3.2 Verificar el Resultado
- Deberías ver en el log: `✅ Mensaje enviado correctamente`
- **Y el mensaje debería aparecer en el espacio de Google Chat**

---

## 📝 Ejemplo de Estructura de la Hoja

| Nombre Espacio | Webhook URL | Space ID | Fecha Creación | Miembros | Última Actualización |
|---|---|---|---|---|---|
| /LestonnacDX1 | https://chat.googleapis.com/v1/spaces/AAAA.../messages?key=...&token=... | spaces/AAAA_s_JSlc | 2025-01-15 | 5 | 2025-01-20 |
| /SantaColomaDX2 | https://chat.googleapis.com/v1/spaces/BBBB.../messages?key=...&token=... | spaces/BBBB_x_KLm | 2025-01-16 | 8 | 2025-01-21 |

---

## ⚠️ Notas Importantes

### Seguridad
- Las Webhook URLs son **sensibles** - cualquiera con la URL puede enviar mensajes al espacio
- **NO compartas** estas URLs públicamente
- La hoja "ChatWebhooks" está **protegida** automáticamente

### Permisos
- Para crear webhooks, necesitas ser **miembro** del espacio
- No necesitas ser administrador del workspace

### Limitaciones
- Los webhooks tienen límites de tasa (rate limits):
  - Máximo 1 mensaje por segundo por webhook
  - Máximo 60 mensajes por minuto
- Los mensajes enviados por webhook:
  - Aparecen como enviados por "ActiviComandes Notificaciones" (o el nombre que le diste)
  - No pueden mencionar usuarios específicos (@mention)
  - No pueden responder a hilos existentes

---

## 🚀 Próximos Pasos

Una vez configurados los webhooks:

1. ✅ Las notificaciones se enviarán automáticamente cuando se cree una entrega
2. ✅ Los monitores recibirán alertas en tiempo real en sus espacios
3. ✅ El sistema funciona sin necesidad de autenticación adicional

---

## 🔍 Solución de Problemas

### Error: "No se encontró Webhook URL"
- **Causa**: La URL no está en la hoja o está vacía
- **Solución**: Verifica que la URL esté en la columna B (Webhook URL)

### Error: "404 Not Found"
- **Causa**: El webhook fue eliminado o la URL es incorrecta
- **Solución**: Crea un nuevo webhook y actualiza la URL

### Error: "403 Forbidden"
- **Causa**: El webhook no tiene permisos
- **Solución**: Verifica que el webhook fue creado correctamente desde la interfaz de Chat

### El mensaje no llega al espacio
- **Causa**: Puede haber un problema de red o la URL es incorrecta
- **Solución**: 
  1. Verifica la URL copiándola directamente del espacio
  2. Prueba enviando un mensaje manualmente con curl o Postman
  3. Revisa los logs del Apps Script para ver el error específico

---

## 📚 Recursos Adicionales

- [Documentación oficial de Webhooks de Google Chat](https://developers.google.com/chat/how-tos/webhooks)
- [Formato de mensajes en Google Chat](https://developers.google.com/chat/api/guides/message-formats/basic)
- [Card formatting para mensajes más ricos](https://developers.google.com/chat/api/guides/message-formats/cards)
