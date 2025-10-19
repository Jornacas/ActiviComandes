# Situación Actual - Sistema ID_Lliurament

**Fecha:** 18 de Octubre 2025
**Branch:** frontend-redesign
**Objetivo:** Implementar sistema de ID_Lliurament para agrupar correctamente las notificaciones de pedidos

---

## 📋 Problema Original

Las notificaciones se agrupaban incorrectamente mostrando nombres de otras personas:
- Judit Pesquero hacía un pedido para Auro con ella misma como intermediaria
- La notificación mostraba el nombre de Miriam Miranda (otra compañera)
- **Causa:** La agrupación se hacía por monitor + escuela + fecha, lo cual agrupaba pedidos que NO fueron asignados juntos

---

## ✅ Solución Implementada

### 1. Sistema ID_Lliurament en Backend

**Cambios en Google Sheets:**
- Columna V (antes "Distancia_Academia") renombrada a "ID_Lliurament"
- Almacena un identificador único para cada lote de entrega

**Cambios en `backend/src/routes/admin.js`:**

#### Generación de ID único al crear entrega:
```javascript
// Línea ~1248
const idLliurament = `LLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Líneas ~1322-1326
if (idLliuramentIndex !== -1) {
  row[idLliuramentIndex] = idLliurament;
  console.log(`🆔 Assigned ID_Lliurament: ${idLliurament} to row ${rowIdItem}`);
}
```

#### Limpieza de ID al cambiar estado:
```javascript
// Líneas ~358-384
if (newStatus !== 'Assignat' && newStatus !== 'Lliurat') {
  if (idLliuramentIndex !== -1) {
    row[idLliuramentIndex] = '';
    console.log(`🆔 Eliminado ID_Lliurament (cambio de estado a ${newStatus})`);
  }
}
```

#### Limpieza de ID al eliminar intermediario:
```javascript
// Líneas ~1460-1464
if (idLliuramentIndex !== -1) {
  row[idLliuramentIndex] = '';
  console.log(`🆔 Cleared ID_Lliurament from row ${rowIdItem}`);
}
```

#### Fix crítico: Rellenar filas cortas
```javascript
// Líneas ~79-88
let rows = data.slice(1)
  .map(row => {
    // Asegurar que todas las filas tengan la misma longitud que el header
    const filledRow = [...row];
    while (filledRow.length < headersRow.length) {
      filledRow.push('');
    }
    return filledRow.slice(0, headersRow.length);
  })
```

**Problema resuelto:** Google Sheets API solo devuelve valores hasta la última celda no vacía. Las filas antiguas sin ID_Lliurament eran más cortas que el header, causando que `row[21]` fuera `undefined`.

#### Mapeo de columnas:
```javascript
// Líneas ~143-169
const map = {
  'Timestamp': 'timestamp',
  'ID_Pedido': 'idPedido',
  'ID_Item': 'idItem',
  // ...
  'ID_Lliurament': 'idLliurament',
  'Distancia_Academia': 'idLliurament', // Compatibilidad
  // ...
};
```

---

### 2. Agrupación en Frontend

**Cambios en `frontend/src/components/OrdersTable.tsx`:**

#### Agrupación en columnas de notificaciones:
```javascript
// Líneas ~1020-1043 (Intermediario)
if (order.idLliurament) {
  groupMaterials = orders.filter(o =>
    o.idLliurament &&
    o.idLliurament === order.idLliurament &&
    o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
  ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

  isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
}
```

#### Agrupación en panel lateral (NUEVO):
```javascript
// Líneas ~2189-2223 (Intermediario en drawer)
if (selectedOrderForDrawer.idLliurament && selectedOrderForDrawer.monitorIntermediari) {
  groupMaterials = orders.filter(o =>
    o.idLliurament &&
    o.idLliurament === selectedOrderForDrawer.idLliurament &&
    o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
  ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

  isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === selectedOrderForDrawer.idItem;
}

// Renderizado condicional
if (isSent) {
  return <Chip label="✅ Enviada" size="small" color="success" />;
} else if (!isFirstInGroup) {
  return <Chip label="Agrupat" size="small" color="default" />;
} else {
  return <Button>Enviar</Button>;
}
```

**Lógica de visualización:**
- **Primera fila del grupo:** Muestra botón "Enviar"
- **Resto de filas:** Muestra chip gris "Agrupat"
- **Notificación enviada:** Muestra chip verde "✅ Enviada"

---

## 🔍 Verificación de Funcionamiento

### Datos de prueba en Google Sheets:
```
Row 72: bc8def4c-0a5b-41c1-bc4c-f4f5a8b6e6e2-001, ID: LLI-1760810127615-v70xukdp3
Row 73: bc8def4c-0a5b-41c1-bc4c-f4f5a8b6e6e2-002, ID: LLI-1760810127615-v70xukdp3
Row 74: bc8def4c-0a5b-41c1-bc4c-f4f5a8b6e6e2-003, ID: LLI-1760810127615-v70xukdp3
```

**Monitor:** Judit Pesquero
**Escuela destino:** VilaOlimpica
**Fecha:** 15/10/2025
**Materiales:** Lápices HB (x2), Lápiz carboncillo (x1)

### Backend verificado ✅
```bash
curl -s -H "Authorization: Bearer comanda_materials_2024" "http://localhost:3001/api/admin/orders"
```

**Resultado:**
- Headers[21] = "idLliurament" ✅
- Rows[4][21] = "LLI-1760810127615-v70xukdp3" ✅
- Rows[5][21] = "LLI-1760810127615-v70xukdp3" ✅
- Rows[6][21] = "LLI-1760810127615-v70xukdp3" ✅

### Frontend verificado ✅
```
🔍 DEBUG headers: (25) ['timestamp', 'idPedido', 'idItem', ..., 'idLliurament', ...]
🔍 DEBUG índice de idLliurament: 21
🔍 DEBUG primera fila length: 25
```

---

## 📝 Pendiente de Verificación

### Pruebas por realizar:

1. **Verificar panel lateral en filas agrupadas:**
   - [ ] Abrir primera fila del grupo de Judit (bc8def4c...001) → Debe mostrar botones "Enviar"
   - [ ] Abrir segunda fila del grupo (bc8def4c...002) → Debe mostrar chips "Agrupat"
   - [ ] Abrir tercera fila del grupo (bc8def4c...003) → Debe mostrar chips "Agrupat"

2. **Crear nuevo lote de entrega:**
   - [ ] Seleccionar varios pedidos
   - [ ] Asignar intermediario
   - [ ] Verificar que se genera ID_Lliurament único
   - [ ] Confirmar que todas las filas del grupo tienen el mismo ID

3. **Eliminar asignación:**
   - [ ] Quitar intermediario de un lote
   - [ ] Verificar que se limpia el ID_Lliurament
   - [ ] Confirmar que las notificaciones se desagrupan

4. **Cambio de estado:**
   - [ ] Cambiar pedido de "Assignat" a "Preparat"
   - [ ] Verificar que se limpia el ID_Lliurament
   - [ ] Confirmar comportamiento correcto

---

## 🛠️ Archivos Modificados

### Backend:
- `backend/src/routes/admin.js`
  - Líneas 55-77: DEBUG logs
  - Líneas 79-88: Relleno de filas cortas
  - Líneas 131-171: Mapeo de headers con ID_Lliurament
  - Líneas 358-384: Limpieza de ID al cambiar estado
  - Líneas 1248: Generación de ID único
  - Líneas 1322-1326: Asignación de ID a lote
  - Líneas 1460-1464: Limpieza de ID al quitar intermediario
  - Líneas 2200-2246: Endpoint de debug temporal

### Frontend:
- `frontend/src/components/OrdersTable.tsx`
  - Líneas 1020-1059: Lógica de agrupación en columnas
  - Líneas 1065-1110: Renderizado condicional (columna intermediario)
  - Líneas 1172-1230: Renderizado condicional (columna destinatario)
  - Líneas 1345-1362: DEBUG logs de transformación
  - Líneas 2189-2223: Agrupación en panel lateral (intermediario)
  - Líneas 2235-2268: Agrupación en panel lateral (destinatario)

---

## 🎯 Próximos Pasos

1. **Verificar funcionamiento completo** con las pruebas listadas arriba
2. **Eliminar logs DEBUG** una vez confirmado el funcionamiento
3. **Probar casos edge:**
   - Pedidos antiguos sin ID_Lliurament (fallback a lógica antigua)
   - Mezcla de pedidos con y sin ID en la misma vista
   - Notificaciones ya enviadas
4. **Documentar para el equipo** cómo funciona el nuevo sistema
5. **Merge a main** cuando esté completamente verificado

---

## 📌 Notas Importantes

- **Compatibilidad hacia atrás:** Pedidos antiguos sin ID_Lliurament usan la lógica antigua de agrupación (monitor + escuela + fecha)
- **No rompe datos existentes:** Las filas sin ID simplemente no se agrupan por ID
- **Limpieza automática:** El ID se elimina al cambiar estado o quitar intermediario
- **Unicidad garantizada:** Combinación de timestamp + random genera IDs únicos

---

## 🐛 Problemas Resueltos Durante la Implementación

### 1. Columna con espacio trailing
**Problema:** Header "Distancia_Academia " tenía espacio al final
**Solución:** Añadido `.trim()` en mapeo de headers (línea 133)

### 2. Filas más cortas que headers
**Problema:** Google Sheets API no devuelve celdas vacías al final, `row[21]` era `undefined`
**Solución:** Relleno automático de filas hasta longitud del header (líneas 83-86)

### 3. Panel lateral no aplicaba agrupación
**Problema:** Lógica de agrupación solo existía en columnas de tabla
**Solución:** Replicada lógica en sección de notificaciones del drawer (líneas 2189-2268)

---

**Estado:** ✅ Implementado, pendiente de verificación final por usuario
