### Incidente: Columna `Estat` mostrando fechas y actualización no reflejada en frontend

#### Contexto
- Sistema actual usa la hoja `Respostes` para altas, lecturas, borrados y cambios de estado.
- La hoja `Comandes` ya no participa en el flujo moderno.

#### Síntomas observados
- La columna `Estat` en la app admin muestra una fecha (ISO) en lugar de un estado como "Pendent/En procés/Preparat/Entregat".
- Al pulsar "Actualitzar" se escriben los cambios en el sheet, pero el frontend no refleja el nuevo estado tras la acción (o lo muestra como fecha).

#### Estado actual (después de últimas correcciones)
- Backend (Apps Script):
  - `createMultipleSollicitud` inserta `Estat = 'Pendent'` y `Data_Estat = timestamp` en `Respostes`.
  - `updateOrderStatus(uuids, newStatus)` ahora opera sobre `Respostes`, escribe `Estat` y actualiza `Data_Estat`.
  - `loadRespostesData(limit)` deriva los headers dinámicamente de la primera fila de `Respostes` y devuelve `rows` sin reordenar columnas.
  - Estadísticas calculadas usando el índice real de `Estat` (búsqueda dinámica del header).
- Frontend (admin):
  - `OrdersTable.tsx` normaliza de nuevo headers/keys al cargar datos (redundante con el backend) y puede introducir desajustes en los campos `estat`/`dataEstat`.

#### Hallazgos clave
- El valor que llega para `estat` en el frontend contiene una fecha ISO → indica que en algún punto se está leyendo la columna `Data_Estat` como si fuese `Estat`.
- En `Respostes`, el orden correcto es: `... Entrega_Manual (L, 11), Estat (M, 12), Data_Estat (N, 13)`.
- Si existen filas históricas corruptas (columnas corridas), también pueden provocar que `rows` venga desalineado respecto a `headers`.

#### Causas probables
1) Doble "normalización" de headers en frontend (convierte de nuevo claves ya normalizadas por backend y puede desmapear `estat`/`dataEstat`).
2) Alguna fila de `Respostes` con columnas M y N intercambiadas por inserciones antiguas.
3) Tras actualizar estado, el refresco no usa el endpoint rápido o no resetea por completo el estado local antes de renderizar.

#### Acciones ya aplicadas
- Backend migrado a uso único de `Respostes` (crear, leer, actualizar, borrar).
- `updateOrderStatus` actualizado para `Respostes` (usa `ID_Pedido`/`ID_Item`; actualiza `Estat` y `Data_Estat`).
- `loadRespostesData` devuelve headers a camelCase en el mismo orden de la hoja, y estadísticas por índice dinámico de `Estat`.

#### Acciones pendientes críticas (propuestas)
1) Backend: asegurar alineación estricta `rows` ↔ `headers`.
   - Al construir `rows`, recortar cada fila a la longitud de `headersRow` para evitar desajustes por trailing vacíos o columnas residuales.
   - Ejemplo (en pseudocódigo):
     ```js
     const headersRow = values[0];
     let rows = values.slice(1).map(r => r.slice(0, headersRow.length));
     ```
2) Frontend: eliminar la re-normalización agresiva de headers en `OrdersTable.tsx` cuando se procesan `headers`/`rows` que llegan del backend.
   - Conservar solo los alias estrictamente necesarios (p. ej. `entregamanual` → `entregaManual` si llega legacy), pero NO tocar `estat`/`dataEstat`.
   - Asegurar que en el render del chip se usa `row.estat` directamente.
3) Tras `updateStatus`, forzar recarga consistente:
   - Intentar `await loadDataFast()`; si falla, fallback a `loadData()`.
   - Limpiar `selectedRows` y `newStatus` (ya se hace) y mostrar feedback de éxito.
4) Verificación de datos en hoja:
   - Auditar manualmente 3–5 filas reales en `Respostes` para confirmar que `M = Estat` (texto) y `N = Data_Estat` (fecha). Corregir a mano si se detectan filas corruptas.

#### Checklist de validación tras aplicar las acciones
- La tabla muestra chips de estado legibles (Pendent/En procés/Preparat/Entregat) en la columna `Estat`.
- Cambiar el estado de una fila con "Actualitzar" actualiza el chip y el contador de estadísticas sin recarga completa.
- `Data_Estat` solo aparece en su columna (no en `Estat`).
- Eliminaciones refrescan rápido sin spinner prolongado.

#### Riesgos y mitigaciones
- Si existen más filas con columnas desplazadas, pueden reaparecer efectos visuales. Mitigación: recorte de filas a longitud de headers y auditoría puntual de filas con problemas.
- Si el frontend mantiene mapeos legacy, pueden reaparecer claves antiguas. Mitigación: usar claves tal cual llegan del backend.

#### Conclusión
El backend ya está coherente con `Respostes` y calcula estadísticas por índice dinámico. El problema que persiste parece concentrado en la transformación de datos del frontend o en desalineaciones puntuales de filas. Aplicar los ajustes propuestos debería restaurar la visualización correcta del estado y el refresco inmediato tras actualizar. 