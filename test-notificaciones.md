# 🧪 Guía de Prueba - Sistema de Notificaciones Duales

## 📋 **Preparación**

### **1. Verificar espacios disponibles**

Ejecuta esta función en Google Apps Script para ver qué espacios tienes:

```javascript
function listarEspaciosDisponibles() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ChatWebhooks');
  const data = sheet.getDataRange().getValues();
  
  console.log('📋 ESPACIOS DISPONIBLES EN GOOGLE CHAT:');
  console.log('==========================================');
  
  for (let i = 1; i < data.length && i < 20; i++) { // Mostrar primeros 20
    const nombre = data[i][0];
    const spaceId = data[i][1];
    console.log(`${i}. ${nombre} → ${spaceId ? '✅' : '❌'}`);
  }
}
```

Copia esta función, pégala al final de `Code.gs`, ejecútala y mira los logs.

---

## 🎯 **Escenarios de Prueba**

### **Escenario 1: Notificación Dual (Intermediari)** ⭐ RECOMENDADO

**Objetivo:** Ver 2 notificaciones (intermediario + origen)

**Requisitos:**
- Selecciona un pedido/comanda pendiente
- Modalidad: **Intermediari**
- Necesitas conocer:
  - La **escuela** del pedido (ej: "VilaOlimpica")
  - La **actividad** (ej: "CO1")
  - Un **monitor intermediario** (ej: "Leo Argento")
  - Una **escuela destino** para el intermediario (ej: "Espai3")

**Pasos desde el Admin App:**

1. Ve a: https://activi-comandes-admin.vercel.app/ (o tu URL de admin)
2. Selecciona una o más comandes con la misma escuela/actividad
3. Haz clic en **"Crear Asignación"**
4. En el diálogo:
   - **Modalitat:** Intermediari
   - **Monitor Intermediària:** Escoge uno (ej: Leo Argento)
   - **Escola Destí:** Escoge una (ej: Espai3)
   - **Data Entrega:** Cualquier fecha
5. Haz clic en **"Crear Assignació"**

**Resultado esperado:**

En los logs de Apps Script verás:
```
📍 Enviando a espacio DESTINO (intermediario): /Espai3CO
🔍 Búsqueda con fallback para: /Espai3CO
✅ Mensaje enviado correctamente a /Espai3CO (spaces/...)

📍 Enviando a espacio ORIGEN: /VilaOlimpicaCO
🔍 Búsqueda con fallback para: /VilaOlimpicaCO
✅ Mensaje enviado correctamente a /VilaOlimpicaCO (spaces/...)

✅ 2 notificación(es) enviada(s) correctamente
```

**En Google Chat:**
- Espacio `/Espai3CO` (o similar) → Mensaje para el intermediario
- Espacio `/VilaOlimpicaCO` (o similar) → Mensaje para el monitor origen

---

### **Escenario 2: Notificación Simple (Directa)**

**Objetivo:** Ver 1 notificación al origen

**Pasos desde el Admin App:**

1. Selecciona comandes
2. Haz clic en **"Crear Asignación"**
3. En el diálogo:
   - **Modalitat:** Directa
   - **Data Entrega:** Cualquier fecha
4. Haz clic en **"Crear Assignació"**

**Resultado esperado:**

En los logs:
```
📍 Enviando a espacio ORIGEN (entrega directa): /EscolaActivitat
✅ Mensaje enviado correctamente a /EscolaActivitat (spaces/...)

✅ 1 notificación(es) enviada(s) correctamente
```

**En Google Chat:**
- Espacio `/EscolaActivitat` → Mensaje de lliurament directe

---

## 🔍 **Cómo Verificar los Resultados**

### **1. En Google Apps Script:**

Ve a **Execucions** (Ejecuciones) y mira los logs de la última ejecución de `createDelivery`

Busca líneas como:
- ✅ `Mensaje enviado correctamente`
- ⚠️ `No se encontró Space ID` (si el espacio no existe)
- ❌ `Error enviando mensaje` (si hay un problema)

### **2. En Google Chat:**

1. Abre Google Chat: https://chat.google.com
2. Busca el espacio correspondiente (ej: `/VilaOlimpicaCO`)
3. Deberías ver un mensaje como:

**Para intermediario:**
```
🔔 NOVA ASSIGNACIÓ DE MATERIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Intermediari: Leo Argento

📥 REBRÀS MATERIAL:
🏫 Escola: Espai3 (la teva escola)
📅 Data: 2025-10-08
📦 Material:
  • Cons (3)

📤 LLIURARÀS MATERIAL:
🏫 Escola: VilaOlimpica
📅 Data: 2025-10-08
👤 Per: Monitor de VilaOlimpica
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Para origen:**
```
📦 MATERIAL ASSIGNAT PER LLIURAMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫 Escola: VilaOlimpica

📦 MATERIAL:
  • Cons (3)

🚚 LLIURAMENT:
👤 Intermediari: Leo Argento
🏫 Recollirà de: Espai3
📅 Data: 2025-10-08
⏰ Hora: Durant l'activitat
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ❓ **Posibles Problemas**

### **"No se encontró Space ID"**

**Causa:** El espacio `/EscolaActivitat` no está en la hoja ChatWebhooks o no coincide exactamente.

**Solución:** 
- El sistema tiene **fallback inteligente** que probará:
  - `/VilaOlimpicaCO1` → `/VilaOlimpicaCO` → `/VilaOlimpica`
- Si aún así no encuentra, añade el espacio manualmente a la hoja ChatWebhooks

### **"Error 403: The caller is not a member"**

**Causa:** El script no tiene permisos para enviar mensajes al espacio.

**Solución:** 
- El script debe ser miembro del espacio de Google Chat
- O el espacio debe permitir apps

### **"Error 404: Space not found"**

**Causa:** El Space ID en la hoja es incorrecto o el espacio fue eliminado.

**Solución:** 
- Vuelve a ejecutar `export_chat_spaces.py` para actualizar los Space IDs

---

## 🎯 **Checklist de Verificación**

Después de la prueba, verifica:

- [ ] El código se subió correctamente a Apps Script (`clasp push` exitoso)
- [ ] Los logs muestran "Mensaje enviado correctamente"
- [ ] Aparecen los mensajes en Google Chat
- [ ] Los mensajes contienen la información correcta (materiales, fechas, etc.)
- [ ] En modalidad Intermediari, se envían 2 mensajes
- [ ] En modalidad Directa, se envía 1 mensaje
- [ ] El sistema de fallback funciona si los nombres no coinciden exactamente

---

## 📊 **Siguientes Pasos**

Una vez verificado que funciona:

1. ✅ Marcar la feature como completa
2. 🔄 Merge a `main`
3. 🎉 Sistema de notificaciones automáticas listo para producción!

