# DIAGNÓSTICO: ALGORITMO OPTIMIZACIÓN NO FUNCIONA

## 🚨 **PROBLEMA ACTUAL - 23/09/2025**

### **Resultado Esperado vs Realidad**

**❌ LO QUE MUESTRA AHORA:**
```
🚚 Opcions d'Entrega
📍 Entrega Directa - Eficiència: Baixa
- Escola: Lestonnac
- Distància des d'Eixos: N/A
- Monitors: Claudia Caracuel, Gemma Prunes
```

**✅ LO QUE DEBERÍA MOSTRAR:**
```
🚚 Opcions d'Entrega

🥇 ENTREGA OPTIMIZADA                      Eficiència: Alta
Entrega a Escola Brusi (2.1km) → Monitor transporta a Lestonnac
💡 Estalvia 3.7km respecte entrega directa
📍 Distància des d'Eixos: 2.1km - Temps: 8min

🥈 ENTREGA DIRECTA                         Eficiència: Baixa
Entrega directa a Lestonnac (5.8km)
📍 Distància des d'Eixos: 5.8km - Temps: 18min
```

---

## 🔍 **ANÁLISIS DE LA SITUACIÓN**

### **1. Google Maps API - ESTADO CRÍTICO**
- ✅ **API habilitada** en Google Cloud Console
- ✅ **Función `calculateDistances()` funciona** individualmente
- ❌ **PROBLEMA**: `schoolDistances.set(result.school, ...)` usa campo incorrecto
- ❌ **RESULTADO**: `distanceInfo: schoolDistances.get(targetSchool)` devuelve `undefined`
- ❌ **CONSECUENCIA**: Todas las distancias aparecen como "N/A"

### **2. Algoritmo de Intermediarios - NO FUNCIONA**
```javascript
// LÍNEA PROBLEMÁTICA EN CODE.GS:2837
schoolDistances.set(result.school, {  // ❌ result.school NO EXISTE
  distance: result.distance,
  distanceValue: result.distanceValue
});

// DEBERÍA SER:
schoolDistances.set(result.address, {  // ✅ result.address SÍ EXISTE
  distance: result.distance,
  distanceValue: result.distanceValue
});
```

### **3. Búsqueda de Monitores Intermediarios**
- ❌ **Sin distancias reales**, no puede ordenar por proximidad
- ❌ **Sin `altDistance`**, no encuentra intermediarios válidos
- ❌ **Resultado**: Solo muestra entrega directa

---

## 🛠️ **SOLUCIÓN INMEDIATA**

### **PASO 1: Corregir Mapeo de Distancias**
En Code.gs línea 2837, cambiar:
```javascript
// CAMBIAR ESTO:
schoolDistances.set(result.school, {

// POR ESTO:
schoolDistances.set(result.address, {
```

### **PASO 2: Verificar Estructura de `calculateDistances()`**
La función debe devolver:
```javascript
{
  success: true,
  data: [
    {
      address: "Escola Brusi",        // ← ESTE CAMPO
      distance: "2.1 km",
      distanceValue: 2100,            // metros
      duration: "8 mins",
      durationValue: 480              // segundos
    }
  ]
}
```

---

## 📊 **ESTADO SISTEMA COMPLETO**

### **✅ BACKEND - FUNCIONANDO**
- Google Apps Script desplegado correctamente
- API endpoints accesibles
- Estructura de datos correcta
- Función calculateDistances() operativa

### **✅ FRONTEND - FUNCIONANDO**
- Interfaz admin carga correctamente
- Columnas ocultas/visibles OK
- Botones de optimización aparecen

### **❌ OPTIMIZACIÓN - ROTO**
- **Distancias**: No se mapean correctamente
- **Intermediarios**: No se detectan sin distancias
- **Eficiencia**: Siempre "Baixa" (porque no hay distancias)
- **Ordenación**: No funciona sin criterio de distancia

---

## 🎯 **PLAN DE REPARACIÓN**

### **ACCIÓN INMEDIATA (15 minutos)**
```bash
1. Abrir Code.gs
2. Localizar línea 2837: schoolDistances.set(result.school, {
3. Cambiar por: schoolDistances.set(result.address, {
4. Guardar
5. Probar URL: ?action=getDeliveryOptionsOptimized&token=comanda_materials_2024
```

### **VERIFICACIÓN POST-REPARACIÓN**
Después del cambio, deberías ver:
```
📍 Distància des d'Eixos: 2.1km (no "N/A")
🎯 Múltiples opciones ordenadas por distancia
💡 Eficiencias reales: Màxima/Alta/Mitjana/Baixa
🚀 Opciones de intermediarios aparecen
```

---

## 🔧 **DEBUGGING - COMANDOS ÚTILES**

### **Test Google Maps API:**
```
https://script.google.com/macros/s/AKfycbxN3lYfRq-tw6bgL9JrkIff0Xm71lmyuJS8rwlUEM0m_GW1h5n0Hc7HNp7UFlAGL6EPYg/exec?action=testGoogleMaps&token=comanda_materials_2024
```

### **Ver estructura calculateDistances:**
```
https://script.google.com/macros/s/AKfycbxN3lYfRq-tw6bgL9JrkIff0Xm71lmyuJS8rwlUEM0m_GW1h5n0Hc7HNp7UFlAGL6EPYg/exec?action=getSchoolAddresses&token=comanda_materials_2024
```

### **Test optimización:**
```
https://script.google.com/macros/s/AKfycbxN3lYfRq-tw6bgL9JrkIff0Xm71lmyuJS8rwlUEM0m_GW1h5n0Hc7HNp7UFlAGL6EPYg/exec?action=getDeliveryOptionsOptimized&token=comanda_materials_2024
```

---

## ⚠️ **CONCLUSIÓN**

**El 95% del trabajo está correcto.** Solo hay un error de mapeo de 1 línea que impide que funcione toda la optimización.

Una vez corregido `result.school` → `result.address`, el sistema debería funcionar perfectamente con:
- ✅ Distancias reales desde Eixos Creativa
- ✅ Múltiples opciones ordenadas por eficiencia
- ✅ Detección automática de monitores intermediarios
- ✅ Eficiencias basadas en kilómetros reales

**TIEMPO DE REPARACIÓN: 5 minutos máximo**