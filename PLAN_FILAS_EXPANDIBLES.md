# 📋 Plan de Implementación: Filas Expandibles

## 🎯 **Objetivo**
Optimizar la visualización de la tabla de solicitudes para pantallas pequeñas (portátiles) sin perder funcionalidad ni operatividad.

---

## 🔧 **Solución Propuesta: Filas Expandibles (Master-Detail Pattern)**

### **Vista Compacta por Defecto (5-6 columnas)**
```
┌────────────────────────────────────────────────────────────────┐
│ ☐ │ ▶ │ Escola    │ Material     │ DataNec  │ Estat      │ ⋮  │
├────────────────────────────────────────────────────────────────┤
│ ☐ │ ▶ │ Lestonnac │ Raqueta (15) │ 14/10    │ 🟢 Assignat│ ⋮  │
│ ☐ │ ▶ │ Llacuna   │ Pilota (20)  │ 15/10    │ ⏳ Pendent │ ⋮  │
│ ☐ │ ▶ │ Primària  │ Corda (10)   │ 12/10    │ 🔵 Preparat│ ⋮  │
└────────────────────────────────────────────────────────────────┘
```

### **Vista Expandida (click en ▶)**
```
┌────────────────────────────────────────────────────────────────┐
│ ☐ │ ▼ │ Lestonnac │ Raqueta (15) │ 14/10    │ 🟢 Assignat│ ⋮  │
│   ├──────────────────────────────────────────────────────────┤
│   │ 📋 INFORMACIÓ BÀSICA                                     │
│   │ • ID: 2d79977b-5670-4e13-b393-a46aebfcae5f-001           │
│   │ • Sol·licitant: Maria Garcia                             │
│   │ • Activitat: Esport                                      │
│   │ • Material: Raqueta                                      │
│   │ • Unitats: 15                                            │
│   │ • Material Personalitzat: No                             │
│   │                                                           │
│   │ 📅 DATES                                                 │
│   │ • Sol·licitud: 08/10/2025                                │
│   │ • Necessitat: 14/10/2025 (dimarts)                       │
│   │ • Lliurament Previst: 14/10/2025 (dimarts)               │
│   │                                                           │
│   │ 🚚 ENTREGA                                               │
│   │ • Modalitat: Intermediari                                │
│   │ • Monitor: Roser Bores                                   │
│   │ • Escola Destí: Llacuna                                  │
│   │ • Responsable Preparació: Joan                           │
│   │ • Distància: 2.5 km                                      │
│   │                                                           │
│   │ 📨 NOTIFICACIONS                                         │
│   │ • Intermediari: ✅ Enviat (09/10/2025 12:30)             │
│   │   [📤 Reenviar Notificació]                              │
│   │ • Destinatari: ⏳ Pendent                                │
│   │   [📤 Enviar Notificació]                                │
│   │                                                           │
│   │ 💬 COMENTARIS I NOTES                                    │
│   │ • Comentaris Generals: Material urgent per dimarts       │
│   │ • Notes Entrega: Deixar a consergeria                    │
│   │                                                           │
│   │ ⚙️ ACCIONS                                               │
│   │ [✏️ Editar] [🗑️ Eliminar] [🔄 Canviar Estat]            │
│   └──────────────────────────────────────────────────────────┘
│ ☐ │ ▶ │ Llacuna   │ Pilota (20)  │ 15/10    │ ⏳ Pendent │ ⋮  │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 **Comparación: Antes vs Después**

### **ANTES (Situación Actual)**
- **Columnas visibles:** 17-19 (según si notificaciones activadas)
- **Ancho necesario:** ~2400-2800px
- **Problema:** Scroll horizontal constante en portátiles
- **Solución actual:** Ocultar columnas manualmente (tedioso)

### **DESPUÉS (Con Filas Expandibles)**
- **Columnas visibles:** 6 (Checkbox, Expandir, Escola, Material, DataNec, Estat, Menú)
- **Ancho necesario:** ~900-1000px
- **Beneficio:** Todo visible en portátiles pequeños
- **Detalles:** 1 click en ▶ muestra TODO

---

## ✅ **Funcionalidades que se MANTIENEN**

### **1. Selección Múltiple**
- ✅ Checkboxes funcionan igual
- ✅ Seleccionar varias órdenes para acciones en lote

### **2. Ordenación y Filtros**
- ✅ Click en headers para ordenar
- ✅ Filtros por columna
- ✅ Búsqueda rápida (Quick Filter)

### **3. Sistema de Notificaciones**
- ✅ Envío de notificaciones intermediario
- ✅ Envío de notificaciones destinatario
- ✅ Estados de notificación (Enviado/Pendiente)
- ✅ Edición de mensajes antes de enviar
- ✅ Historial de notificaciones

### **4. Gestión de Estados**
- ✅ Cambio de estado en lote
- ✅ Chips visuales de estado
- ✅ Estadísticas en tiempo real

### **5. Edición y Eliminación**
- ✅ Editar órdenes
- ✅ Eliminar órdenes
- ✅ Eliminar asignación de intermediario

### **6. Sincronización**
- ✅ Sincronizar con Google Forms
- ✅ Detección de órdenes obsoletas
- ✅ Actualización automática

---

## 🔧 **Cambios Técnicos**

### **Archivo a Modificar**
- `frontend/src/components/OrdersTable.tsx`

### **Cambios Específicos**

#### **1. Columnas Visibles en Tabla Principal**
```typescript
// Reducir a 6 columnas esenciales
const mainColumns = [
  { field: 'escola', headerName: 'Escola' },
  { field: 'material', headerName: 'Material' },
  { field: 'dataNecessitat', headerName: 'Necessari' },
  { field: 'estat', headerName: 'Estat' },
  // Columna de acciones (⋮)
];
```

#### **2. Agregar Panel Expandible**
```typescript
<DataGrid
  {...existingProps}
  getDetailPanelContent={({ row }) => (
    <DetailPanel order={row} />
  )}
  getDetailPanelHeight={() => 'auto'}
/>
```

#### **3. Componente DetailPanel**
```typescript
function DetailPanel({ order }) {
  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5' }}>
      {/* Toda la información organizada por secciones */}
      {/* Botones de acción incluidos */}
    </Box>
  );
}
```

#### **4. Botones de Notificación**
- Se mueven del grid principal al panel expandible
- Misma funcionalidad, mejor organización visual

---

## 📦 **Plan de Implementación**

### **Fase 1: Preparación (5 min)**
```bash
git checkout -b feature/expandable-rows
```

### **Fase 2: Desarrollo (3-4 horas)**
1. ✅ Reducir columnas del grid principal a 6
2. ✅ Implementar `getDetailPanelContent`
3. ✅ Crear componente `DetailPanel` con diseño organizado
4. ✅ Mover botones de notificaciones al panel
5. ✅ Mover botones de acciones al panel
6. ✅ Styling y responsive
7. ✅ Testing de funcionalidad

### **Fase 3: Testing Local (Usuario)**
```bash
cd frontend
npm run dev
# Probar en http://localhost:3000
```

**Checklist de Pruebas:**
- [ ] Tabla se ve bien en portátil pequeño
- [ ] Click en ▶ expande correctamente
- [ ] Todos los datos visibles en panel expandido
- [ ] Notificaciones funcionan desde panel
- [ ] Editar/Eliminar funcionan
- [ ] Selección múltiple funciona
- [ ] Filtros y búsqueda funcionan
- [ ] Cambio de estado en lote funciona

### **Fase 4: Decisión**
- ✅ **SI GUSTA** → Merge a main → Deploy a producción
- ❌ **SI NO GUSTA** → Descartar rama, sin impacto

---

## 🎨 **Diseño del Panel Expandido**

### **Organización por Secciones**
```
┌─────────────────────────────────────────┐
│ 📋 INFORMACIÓ BÀSICA                    │ ← Datos básicos
│ 📅 DATES                                │ ← Todas las fechas
│ 🚚 ENTREGA                              │ ← Info de entrega
│ 📨 NOTIFICACIONS                        │ ← Sistema notificaciones
│ 💬 COMENTARIS I NOTES                   │ ← Comentarios
│ ⚙️ ACCIONS                              │ ← Botones de acción
└─────────────────────────────────────────┘
```

### **Ventajas del Diseño**
- ✅ Información agrupada lógicamente
- ✅ Fácil de escanear visualmente
- ✅ Iconos para identificación rápida
- ✅ Botones de acción al final
- ✅ Notificaciones con historial visible

---

## ⚠️ **Riesgos y Mitigación**

### **Riesgo 1: Usuario no encuentra info**
**Mitigación:** Las 6 columnas principales contienen lo más importante. Resto con 1 click.

### **Riesgo 2: Click adicional para ver detalles**
**Mitigación:** Para revisión general, no hace falta expandir. Solo cuando necesitas detalles específicos.

### **Riesgo 3: Notificaciones menos accesibles**
**Mitigación:** El panel se expande rápido y muestra TODO el contexto de notificaciones (historial, estado, mensajes).

### **Riesgo 4: Cambio de UX familiar**
**Mitigación:** 
- Patrón estándar (GitHub, Gmail, Jira)
- Intuitivo (icono ▶ universal)
- Fase de prueba antes de producción

---

## 📈 **Beneficios Esperados**

### **Operatividad**
- ⏱️ **Tiempo de escaneo:** Similar o mejor (menos columnas = más foco)
- 🖱️ **Clicks para ver detalles:** 1 click vs 5-6 clicks (cambiar columnas)
- 📊 **Órdenes visibles:** 15-20 vs 10-12 (menos scroll)

### **Usabilidad**
- 💻 **Portátiles pequeños:** Perfecto (no scroll horizontal)
- 🖥️ **Pantallas grandes:** Igual de funcional
- 🎯 **Foco:** Menos ruido visual, info organizada

### **Mantenibilidad**
- 🔧 **Agregar columnas futuras:** Van al panel, no afectan tabla
- 📱 **Responsive:** Base para versión móvil futura
- 🧹 **Código limpio:** Separación tabla principal / detalles

---

## 🚀 **Próximos Pasos**

1. **Aprobación del usuario** para proceder
2. **Crear rama feature/expandable-rows**
3. **Implementar cambios** (3-4 horas)
4. **Notificar para testing local**
5. **Esperar feedback**
6. **Merge a main** (solo si aprobado)
7. **Deploy a producción** (solo si aprobado)

---

## 📞 **Contacto y Soporte**

- Cualquier duda o ajuste durante desarrollo
- Testing guiado si necesario
- Reversión inmediata si no convence

---

**Fecha de Creación:** 09/10/2025  
**Estado:** Pendiente de Aprobación  
**Rama:** feature/expandable-rows (a crear)  
**Impacto en Producción:** NINGUNO (hasta aprobación explícita)

