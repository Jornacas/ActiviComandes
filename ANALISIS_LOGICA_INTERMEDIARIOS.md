# Análisis de la Lógica Actual de Intermediarios

**Fecha:** 24 de Octubre 2025
**Archivo analizado:** `backend/src/routes/admin.js` (líneas 946-1227)
**Objetivo:** Mejorar el algoritmo de asignación de intermediarios para soportar cadenas de entrega

---

## 📊 Estado Actual del Sistema

### Datos Disponibles (Hoja "Dades")

El sistema lee de Google Sheets la siguiente información:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| **ESCOLA** | Nombre de la escuela | "VilaOlimpica", "Auro", "Montblanc" |
| **MONITORA** | Nombre del monitor | "Judit", "Miriam" |
| **DIA** | Día que va a esa escuela | "dimarts", "dimecres" |
| **ADREÇA** | Dirección de la escuela | "Carrer Aragó 179, Barcelona" |
| **ACTIVITAT** | Actividad que realiza | "Anglès", "Natació" |

### Estructura de Datos Generada

```javascript
monitors = [
  {
    nom: "Judit",
    escoles: [
      { escola: "VilaOlimpica", adreça: "...", dies: ["dimarts"], activitat: "Anglès" },
      { escola: "Auro", adreça: "...", dies: ["dimarts"], activitat: "Natació" }
    ]
  },
  {
    nom: "Miriam",
    escoles: [
      { escola: "Montblanc", adreça: "...", dies: ["dimecres"], activitat: "..." }
    ]
  }
]
```

---

## 🔍 Lógica Actual de Asignación

### Paso 1: Agrupación de Pedidos
```javascript
// Agrupa pedidos por persona + rango de fechas (3 días)
// Ejemplo: Si Miriam pide 3 materiales para el miércoles, se agrupan juntos
groupedOrders = {
  "Miriam|2025-10-30": {
    nomCognoms: "Miriam",
    escoles: ["Montblanc"],
    dataNecessitat: "2025-10-30",
    orders: [order1, order2, order3]
  }
}
```

### Paso 2: Opciones de Entrega Generadas

Para cada grupo de pedidos, el sistema genera **3 tipos de opciones**:

#### **Opción 1: Recollida a Eixos Creativa** ⭐
- El destinatario recoge directamente en la oficina de Eixos
- **Eficiencia:** Máxima
- **Prioridad:** 1 (siempre primera opción)

#### **Opción 2: Entrega Directa des d'Eixos** 🚗
- Alguien de Eixos lleva el material a la escuela del destinatario
- **Eficiencia:** Calculada según distancia
- **Prioridad:** 2 (basada en distancia desde Eixos)

#### **Opción 3: Lliurament amb Intermediari** 🔄
**Lógica actual (líneas 1101-1168):**

```javascript
// Para cada monitor que trabaje en MÁS DE UNA escuela
if (monitor.escoles.length > 1) {
  // Verificar si va a la escuela del destinatario
  const targetSchool = monitor.escoles.find(s => s.escola === "Montblanc");

  if (targetSchool) {
    // Proponer entregas desde OTRAS escuelas donde trabaja este monitor
    monitor.escoles.forEach(intermediarySchool => {
      if (intermediarySchool.escola !== "Montblanc") {
        // OPCIÓN: Entregar en intermediarySchool → Monitor lleva a Montblanc
        createOption({
          escola: intermediarySchool.escola,  // Donde entregamos
          escolaDestino: "Montblanc",         // Donde el monitor lleva
          monitor: monitor.nom
        });
      }
    });
  }
}
```

**Resultado:**
- Si Judit va a "Auro" y "VilaOlimpica"
- Y el pedido es para Miriam en "Montblanc"
- **NO SE GENERA NINGUNA OPCIÓN** porque Judit no va a Montblanc

---

## ❌ Limitaciones Detectadas

### 1. **Solo Soporta 1 Salto (Directo)**

**Flujo actual:**
```
Eixos → Intermediario (Escola A) → Intermediario lleva a (Escola B - Destinatario)
```

**Problema:** Si el intermediario NO va a la escuela del destinatario, no se considera.

### 2. **No Optimiza por Cercanía a Eixos**

El sistema propone **TODAS las escuelas** del intermediario como puntos de recogida, sin priorizar las más cercanas a Eixos Creativa.

**Ejemplo actual:**
- Judit trabaja en: "VilaOlimpica" (2 km de Eixos) y "Auro" (15 km de Eixos)
- Si el destino final es compatible, propone ambas escuelas
- **Problema:** Auro está mucho más lejos, pero tiene la misma prioridad

### 3. **No Considera Cadenas de Intermediarios**

**Escenario del usuario:**
```
Miriam necesita material en "Montblanc" (lejos) para miércoles
Judit coincide con Miriam en "Auro" el martes
Nosotros entregamos a Judit en "VilaOlimpica" (cerca de Eixos)
```

**Flujo deseado:**
```
Eixos → Judit (VilaOlimpica, martes)
       → Judit lleva a Auro (martes)
              → Miriam recoge en Auro (martes/miércoles)
```

**Sistema actual:**
- ❌ No detecta que Miriam está en Auro (solo busca en "Montblanc")
- ❌ No considera que Judit puede actuar como intermediario para Miriam
- ❌ No propone entrega en VilaOlimpica para Judit

---

## ✅ Mejoras Propuestas

### Mejora 1: **Sistema de Coincidencias Multi-Escuela** 🎯

**Concepto:** Detectar cuando 2+ monitores coinciden en una escuela intermedia.

**Algoritmo:**
```javascript
1. Monitor A (Judit) trabaja en: [VilaOlimpica, Auro]
2. Monitor B (Miriam) trabaja en: [Auro, Montblanc]
3. COINCIDEN en: Auro
4. Propuesta:
   - Entregar a Judit en VilaOlimpica (cerca de Eixos)
   - Judit lleva a Auro
   - Miriam recoge de Judit en Auro
   - Miriam lleva a Montblanc
```

### Mejora 2: **Priorización por Distancia desde Eixos** 📍

**Concepto:** Cuando un monitor trabaja en múltiples escuelas, priorizar las más cercanas a Eixos.

**Cálculo de Eficiencia:**
```javascript
eficiencia = {
  distanciaEixos: km desde Eixos a escola recogida,
  numSaltos: cantidad de intermediarios en la cadena,
  score: (distanciaEixos * 0.6) + (numSaltos * 0.4)
}
```

**Prioridad:**
1. Recollida a Eixos (0 km, 0 saltos)
2. Entrega a escola cercana con intermediario (2 km, 1 salto)
3. Entrega directa a escola lejana (15 km, 0 saltos)
4. Cadena de intermediarios (5 km, 2 saltos)

### Mejora 3: **Detectar Escuelas Compartidas** 🔗

**Concepto:** Buscar escuelas donde coincidan el destinatario y algún intermediario.

**Lógica:**
```javascript
function findSharedSchools(destinatario, potentialIntermediaries) {
  const destinatarioSchools = getMonitorSchools(destinatario);
  const sharedOptions = [];

  potentialIntermediaries.forEach(intermediary => {
    const intermediarySchools = getMonitorSchools(intermediary);

    // Buscar escuelas compartidas
    destinatarioSchools.forEach(destSchool => {
      if (intermediarySchools.includes(destSchool)) {
        // COINCIDEN en destSchool
        // Proponer entrega en otras escuelas del intermediario
        intermediarySchools.forEach(pickupSchool => {
          if (pickupSchool !== destSchool) {
            sharedOptions.push({
              intermediario: intermediary,
              escolaRecogida: pickupSchool,
              escolaCoincidencia: destSchool,
              destinatario: destinatario
            });
          }
        });
      }
    });
  });

  return sharedOptions;
}
```

### Mejora 4: **Sistema de Cadenas (Multi-Salto)** 🔄🔄

**Concepto:** Soportar N intermediarios en cadena.

**Ejemplo:**
```
Eixos → Monitor1 (Escola A)
      → Monitor1 lleva a Escola B
         → Monitor2 recoge en Escola B
            → Monitor2 lleva a Escola C (Destinatario)
```

**Limitaciones razonables:**
- Máximo 2-3 saltos (evitar cadenas muy largas)
- Validar que las fechas sean compatibles
- Priorizar cadenas cortas

---

## 📋 Estructura de Datos Necesaria

### Datos Adicionales Requeridos

**Opción A: Sin cambios en Google Sheets** ✅ (Recomendado)
- Usar los datos actuales
- Calcular coincidencias en runtime
- Más flexible pero más procesamiento

**Opción B: Nueva columna en "Dades"** ⚠️
- Añadir columna "MONITORS_COINCIDENTS"
- Pre-calcular coincidencias manualmente
- Menos procesamiento pero más mantenimiento

### Ejemplo de Opción Mejorada

```javascript
{
  tipus: "Lliurament amb Cadena d'Intermediaris",
  cadena: [
    {
      pas: 1,
      desde: "Eixos Creativa",
      hacia: "VilaOlimpica",
      monitor: null,
      distancia: "2 km",
      dia: "dimarts"
    },
    {
      pas: 2,
      desde: "VilaOlimpica",
      hacia: "Auro",
      monitor: "Judit",
      distancia: "13 km",
      dia: "dimarts"
    },
    {
      pas: 3,
      desde: "Auro",
      hacia: "Montblanc",
      monitor: "Miriam",
      distancia: "8 km",
      dia: "dimecres"
    }
  ],
  eficiencia: "Alta",
  prioritat: 150, // 2 km (Eixos-Vila) + penalización por 2 saltos
  distanciaTotal: "23 km",
  distanciaEixos: "2 km", // Solo la primera entrega
  numSaltos: 2,
  descripció: "Cadena: Eixos → Judit (VilaOlimpica) → Miriam (Auro) → Destinatari final (Montblanc)"
}
```

---

## 🎯 Propuesta de Implementación

### Fase 1: Priorización por Distancia ⭐ (Rápido)
**Objetivo:** Mejorar las opciones actuales sin cambiar la estructura.

**Cambios:**
1. Calcular distancia desde Eixos para cada escola de recogida
2. Ordenar opciones de intermediario por cercanía a Eixos
3. Añadir score de eficiencia basado en distancia

**Impacto:** Bajo
**Tiempo estimado:** 1-2 horas
**Beneficio:** Mejora inmediata en recomendaciones

### Fase 2: Detección de Escuelas Compartidas ⭐⭐ (Medio)
**Objetivo:** Detectar cuando destinatario coincide con intermediario en alguna escuela.

**Cambios:**
1. Buscar escuelas donde trabajan destinatario Y potencial intermediario
2. Proponer entregas en escuelas cercanas del intermediario
3. El destinatario recoge en la escuela compartida

**Impacto:** Medio
**Tiempo estimado:** 3-4 horas
**Beneficio:** Cubre el caso de Miriam-Judit-Auro

### Fase 3: Sistema de Cadenas (Multi-Salto) ⭐⭐⭐ (Complejo)
**Objetivo:** Soportar N intermediarios en cadena.

**Cambios:**
1. Algoritmo recursivo de búsqueda de rutas
2. Validación de fechas entre saltos
3. Cálculo de eficiencia total de la cadena
4. Limitación a 2-3 saltos máximo

**Impacto:** Alto
**Tiempo estimado:** 8-12 horas
**Beneficio:** Sistema completo de optimización

---

## 🔧 Tecnologías y Consideraciones

### Performance
- **Actual:** ~50-100 opciones generadas para 10 pedidos
- **Con Fase 2:** ~150-200 opciones (sigue siendo manejable)
- **Con Fase 3:** Potencialmente explosivo (necesita limitaciones)

**Optimizaciones:**
- Caché de cálculos de distancia
- Limitar profundidad de búsqueda
- Filtrar opciones inviables antes de calcular distancias

### Validaciones Necesarias
- ✅ Fechas compatibles entre saltos
- ✅ Monitor disponible en día correcto
- ✅ Máximo de saltos permitidos
- ✅ Distancia total razonable (<30 km)

---

## 📌 Recomendación Final

**Para el caso descrito (Miriam-Judit-Auro):**

Implementar **Fase 1 + Fase 2** es suficiente y cubre el 90% de los casos reales:

1. **Fase 1:** Prioriza VilaOlimpica sobre Auro (más cerca de Eixos)
2. **Fase 2:** Detecta que Miriam y Judit coinciden en Auro
   - Propone: Eixos → Judit (VilaOlimpica) → Miriam recoge en Auro

**La Fase 3 (cadenas)** solo es necesaria si:
- Hay muchos monitores con rutas complejas
- Se necesita optimización extrema
- Hay casos frecuentes de 3+ intermediarios

---

## 🚀 Próximos Pasos

1. **Crear rama:** `feature/mejora-intermediarios`
2. **Implementar Fase 1:** Priorización por distancia
3. **Testing:** Verificar con casos reales
4. **Implementar Fase 2:** Si Fase 1 no es suficiente
5. **Evaluar Fase 3:** Solo si casos complejos son frecuentes

---

**¿Qué te parece este análisis? ¿Empezamos con Fase 1 + Fase 2?**
