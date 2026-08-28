# PLAN · ActiviComandes: de Google Sheets a ActiviHub (Supabase)

_Redactado el 28-08-2026. Todos los datos de este documento están **verificados** contra el Sheet
`ActiviComandes`, contra el endpoint de Apps Script en producción y contra la BD `ActiviShift`
(`ccxeggzfvvatixuvarqs`) en esa fecha. Lo que no se ha podido verificar se marca como pregunta._

---

## 1. Diagnóstico: la app del monitor está muerta ahora mismo

No es una mejora, es una reparación — el mismo fallo que tumbó ActiviRutes en agosto.

| Comprobación | Resultado |
|---|---|
| Hoja `Dades` (maestro: escuelas, monitores, actividades, direcciones) | **147 filas, todas `#REF!`**. 0 escuelas útiles. Las fórmulas apuntan a un origen borrado. |
| Hoja `BaseApp` (origen de `Dades`) | Igual: **`#REF!`**. No hay de dónde recuperarlo. |
| Endpoint real de la app móvil, llamado hoy | `getEscoles` → `{"data":["#REF!"]}` · `getMonitors` → `{"data":["#REF!"]}` · `getActivitats` → `{"data":[]}` |
| Efecto para el monitor | Abre la app, el desplegable de escuela ofrece **una sola opción: `#REF!`**. No puede pedir material. |
| Efecto en el admin | El listado de pedidos funciona (`Respostes` está viva), pero **el módulo de entregas está ciego**: `getSchoolMonitorData()` construye escuelas y monitores desde `Dades` → 0 escuelas, 0 monitores, ningún intermediario posible. El copilot tiene la misma laguna. |
| Último pedido registrado | 11-06-2026 (fin de curso). El curso 26/27 aún no ha arrancado: **hay ventana para arreglarlo antes de septiembre**. |

**No hay rollback.** El origen de `Dades` ya no existe; recuperarlo sería reconstruirlo a mano.
La fuente viva de esos datos es ActiviHub.

---

## 2. Qué es qué hoy (el mapa que faltaba)

### 2.1 Hay **dos backends en producción**, no uno

Topología verificada el 28-08-2026 (las tres piezas salen de este mismo repo):

```
activicomandes-mobil.vercel.app  (app-mobil/)
   └─► script.google.com/…/exec   ── Code.gs (Apps Script) ──┐
                                                             ├─► Sheet "ActiviComandes"
activi-comandes-admin.vercel.app (frontend/)                 │
   └─► backend-umber-six-64.vercel.app (backend/) ───────────┘
```

El bundle del admin lleva incrustadas las dos URLs (también abre la app móvil en una ventana).
El proyecto Vercel del backend no está en el equipo `jornacas-gmailcoms-projects` — vive bajo otro
scope — pero el servicio responde.

**Los dos backends están igual de rotos**, porque comparten la hoja. Llamado a producción:

```
GET backend-umber-six-64.vercel.app/api/schools     → {"success":true,"data":["#REF!"]}
GET backend-umber-six-64.vercel.app/api/monitors    → {"success":true,"data":["#REF!"]}
GET backend-umber-six-64.vercel.app/api/admin/orders→ success · 718 filas · 26 columnas
```

No es un problema de Apps Script: es la fuente. Por eso la Fase 1 arregla el origen, no el transporte.

- La app del monitor **no usa el backend Node**: `app-mobil/.env.production` apunta a Apps Script.
  `Code.gs` (120 KB) es código vivo, no legado.
- `backend/src/routes/mobile.js` es un **puerto incompleto y desactualizado** de esas mismas
  funciones: mapea los materiales a hojas que **ya no existen** (`Materiales`, `Jocs Populars`,
  `Arts`, `Ciencia`, `Graffiti`, `Dj`…) y lee la columna A. Las hojas reales son `MatCO`, `MatDX1`,
  `MatDX2`, `MatHC1`, `MatHC2`, `MatTC` y para CO/DX el concepto está en la **columna B**.
  `Code.gs` sí lo tiene bien. Si algún día se conmuta la app móvil al backend Node sin tocar esto,
  los materiales se rompen en silencio.

### 2.2 Las 11 pestañas del Sheet, y quién es dueño de cada cosa

| Hoja | Filas útiles | Qué es | Destino propuesto |
|---|---|---|---|
| `Dades` | **0** (147 `#REF!`) | Maestro: ESCOLA, MONITORA, DIA, HORA INICI, TORN, ACTIVITAT, TOTAL ALUMNES, PREU, COMISSIÓ, INICI/FINAL CURS, UBICACIÓ, ADREÇA | **ActiviHub** (lectura) |
| `BaseApp` | **0** (`#REF!`) | Origen de `Dades`, una columna más (HORA FI, TIPUS FACT.) | Desaparece |
| `Respostes` | **718 ítems** · 26 columnas · 22-09-2025 → 11-06-2026 | Los pedidos. El dato propio de la app | **Tabla nueva** (escritura) |
| `MatCO` / `MatDX1` / `MatDX2` | 15 / 30 / 20 | Catálogo por actividad: Código, Concepte, Quantitat, Proveïdor | **Tabla nueva** |
| `MatHC1` / `MatHC2` | 20 / 22 | Catálogo, una sola columna de texto | **Tabla nueva** |
| `MatTC` | **0 (vacía)** | TC va por entrada manual, por diseño | Tabla nueva (vacía) |
| `Distancies` | 442 filas / **46 direcciones** | Caché de Google Routes. Roto, ver §6 | **Tabla nueva** |
| `ChatWebhooks` | 172 espacios | Espacios de Google Chat para notificar | Decisión aparte, §7-Q4 |

### 2.3 Qué hay realmente en `Respostes` (dato propio, no derivable de ActiviHub)

718 ítems en 26 columnas. Relleno real:

- **Siempre**: Timestamp, ID_Pedido, ID_Item, Nom_Cognoms, Data_Necessitat, Escola, Activitat,
  Material, Es_Material_Personalitzat, Unitats, Estat, Data_Estat.
- **Parcial**: Responsable_Preparacio 579 · Modalitat_Lliurament 219 · Data_Lliurament_Prevista 148 ·
  Comentaris_Generals 137 · Monitor_Intermediari 112 · Escola_Destino_Intermediari 94 ·
  ID_Lliurament 83 · Activitat_Intermediari 73 · Escola_Recollida_Intermediari 40 ·
  Notificacion_Destinatari 17 · Notificacion_Intermediari 16 · Notes_Internes 5.
- **Vacía del todo**: `Notes_Entrega` (0/718) — columna muerta.
- **Suciedad a normalizar al migrar**: `Modalitat_Lliurament` tiene 7 valores para 4 conceptos
  (`INTERMEDIARI`/`Intermediari`, `NORMAL`/`DIRECTA`/`Directa`, `MANUAL`, vacío ×499);
  `Responsable_Preparacio` tiene `Lídia` y `Lidia`, `Jordi` y `jordi`; `Monitor_Intermediari` guarda
  18 veces el literal `DIRECTA` en un campo que debería llevar un nombre de persona.
- Estados usados: `Lliurat` 691 · `Preparat` 20 · `En proces` 4 · `Pendent` 3.
- La columna `Distancia_Academia` ya está renombrada a `ID_Lliurament` en el Sheet real; el doble
  nombre que arrastra `helpers.js` es compatibilidad histórica que se puede tirar.

---

## 3. Lo que ActiviHub ya ofrece (verificado, curso 2627)

Proyecto **ActiviShift** (`ccxeggzfvvatixuvarqs`, eu-north-1). Schema del ERP: `prod_005` (57 tablas).
Ya existen dos schemas creados por ActiviRutes que sirven de patrón:

- **`rutes`** — 5 vistas de solo lectura sobre `prod_005`. Es el *contrato*.
- **`rutes_app`** — 5 tablas con lo que ActiviRutes escribe (proyectos, paradas, entregas, enlaces).

`rutes.v_dades` ya expone, columna a columna, **casi todo lo que la hoja `Dades` daba**:
`escola, adreca, codi_postal, adreca_completa, directrius, localitzacio_materials, activitat, area,
dia_setmana, dia, hora_inici, hora_final, torn, data_inici, data_final, alumnes, monitora, estat,
centre_id, activitat_id`.

Volumen del curso **2627**: 240 actividades, **214 vivas** (fuera `NO_SURT`) en **67 centros**.

| Área | Actividades | Centros | Códigos |
|---|---|---|---|
| TC Tecnologia Creativa | 70 | 30 | TC1…TC4 con letras |
| CO Còmic | 54 | 42 | CO1, CO1A-D, CO2, CO2A-B |
| HC Honey Clay | 50 | 26 | HC1/HC2 con letras **y variantes `-EN`** |
| DX Dibuix | 32 | 21 | DX1, DX2, DX2A-C |
| JL Jocs Lab | 8 | 5 | JL1, JL1A, JL2, JL3 |

### 3.1 Reconciliación con el histórico: sale bien

- **Escuelas: 50 de 51 coinciden exactamente.** Los nombres cortos que usa `Respostes` (`Acacies`,
  `PauRomeva`, `TrentaPassos`…) son los mismos que deriva `rutes.v_dades`. Única excepción:
  **`Baloo`** (1 pedido). Y hay **17 centros nuevos** en el 2627 que el histórico no conoce
  (Alzina, Anglesola, ArcSantMarti, Brasil, CanCarabassa, ElsPinsCornellà, Grèvol, Heura,
  IgnasiIglesiasCornella, Londres, Montseny, Pegaso, ReinaViolant, SaintNicholas, SantMedir, Taber,
  Voramar).
- **Monitores: 46 de 49 coinciden** por `nom + cognom1`; 17 siguen de alta. Sin correspondencia:
  `David Mora`, `Paola Belmonte`, y `Ikram BenAbdelkrim` (en el ERP es `Ikram Ben Abdelkrim`, con
  espacio, y de baja el 05-03-2026). → el emparejamiento por nombre funciona, pero **hay que
  normalizar acentos y espacios**, y no puede ser la clave definitiva: la clave es `empleats.id`.
- **Códigos de actividad: formato idéntico.** Lo que guarda `Respostes` (`CO1A`, `DX2B`, `HC2B`,
  `TC3`) es exactamente lo que produce `v_dades`. Novedad del 2627: las variantes `-EN` (inglés).

### 3.2 Los dos huecos reales

1. **No hay MONITORA hoy.** El único vínculo monitor↔actividad en el ERP es
   `sessions → monitors_sessio`, y ahora mismo hay **0 sesiones y 0 monitors_sessio**: el curso 25/26
   se vació el 26-08-2026 y las sesiones del 2627 aún no se han generado. Hay 22 monitores de alta.
   → **Todo el motor de intermediarios de ActiviComandes depende de este dato.** Sin sesiones
   generadas y monitores asignados, no hay optimización de entregas posible. Es una dependencia dura
   del calendario de preparación de curso, no del código.
2. **ActiviHub no tiene catálogo de materiales.** En `prod_005` solo existen
   `centres.localitzacio_materials` (texto libre, 38 de 95 centros) y `extraescolars.preu_materials`.
   Las 6 hojas `Mat*` son patrimonio exclusivo de ActiviComandes → tablas nuevas.
   Y **`JL` (Jocs Lab) no tiene hoja de materiales**: 8 actividades del 2627 en 5 centros se quedarían
   sin catálogo.

---

## 4. Arquitectura propuesta

Mismo patrón que ActiviRutes, que ya está rodado en producción:

```
app-mobil (monitor)  ─┐
                      ├─► backend  ──service_role──►  comandes      (vistas, solo lectura)
frontend admin       ─┘   (server)                        └─► prod_005 (ERP ActiviHub)
                                                      comandes_app  (tablas propias, lectura+escritura)
```

**Dos schemas nuevos, y no se mezclan:**

- **`comandes`** — vistas de solo lectura sobre `prod_005`. Contrato: si ActiviHub renombra una
  columna, se arregla aquí y las apps no se tocan. Se calca de `rutes.v_dades` (las derivaciones de
  `escola`, `dia`, `torn` y `activitat` ya están probadas contra datos reales), añadiendo lo que
  ActiviComandes necesita y ActiviRutes no: el **monitor por sesión y por fecha**.
  - `comandes.v_activitats` — el sustituto de la hoja `Dades`.
  - `comandes.v_monitors` — monitores de alta con su `empleats.id`, nombre normalizado y correo.
  - `comandes.v_sessions` — sesión a sesión: fecha, actividad, centro, monitor asignado.
    Esto es **mejor que la hoja**: la hoja tenía una fila estática por actividad; las sesiones saben
    la fecha concreta, las cancelaciones y las sustituciones de monitor.
  - `comandes.v_centres` — dirección, `directrius`, `localitzacio_materials`.
- **`comandes_app`** — lo que ActiviComandes escribe y de lo que es dueño:
  - `comandes` + `comanda_items` (hoy `Respostes`, aplanada en una sola fila por ítem)
  - `lliuraments` (modalidad, intermediario, fecha prevista, notas) — hoy columnas Q–X de `Respostes`
  - `notificacions` (hoy columnas Y–Z, más `ChatWebhooks`)
  - `materials_catalogo` (hoy las 6 hojas `Mat*`)
  - `distancies` (hoy la hoja `Distancies`, ya sin duplicados)

**Reglas que se heredan de ActiviRutes y no se discuten:**
- `service_role` **solo** en código de servidor, nunca con prefijo `NEXT_PUBLIC_`.
- Exponer el schema en Settings → API → Exposed schemas (añadir, no quitar).
- La regla horaria de ActiviHub (`date` / `time` / `timestamp` de pared / `timestamptz`) aplica igual
  aquí. Ver `ActiviHub/CLAUDE.md`. Es el fallo que ya ha aparecido tres veces en los otros repos.
- PostgREST devuelve **como máximo 1.000 filas** por petición, en silencio. Paginar con `.range()`.

---

## 5. Fases

> **Estado 28-08-2026:** Fase 0 ✅ · Fase 1 ✅ (pendiente solo de desplegar) · Fase 2 pendiente ·
> Fase 3 a decidir con David. **Apps Script retirado del todo**: no queda ningún `.gs` en el repo.
>
> Decisiones cerradas por Jordi ese día: Apps Script fuera (Q1); las sesiones del 2627 se
> generan la semana del 31-08 y mientras tanto se usa una siembra (Q2); solo actividades
> activadas, es decir `ACTIVA` + `CONFIRMADA` mientras el curso no arranque (Q3);
> `ChatWebhooks` se migra tal cual (Q4).

### Fase 0 — Verificación y decisiones ✅
Este documento es el informe. Preguntas del §7 resueltas.

### Fase 1 — Resucitar la app: leer el maestro desde ActiviHub ✅ _(pendiente de desplegar)_

Hecho el 28-08-2026. Verificado con `node backend/scripts/check-activihub.js`:
curso 2627, **119 actividades · 38 escuelas · 21 monitores · 35 códigos de actividad**, y el
motor de entregas volviendo a generar cadenas reales con distancias de Google Routes.

Lo construido:
- Esquemas `comandes` (5 vistas de solo lectura) y `comandes_app` en Supabase.
- `backend/src/services/activihub.js` — cliente `service_role` solo-servidor, con paginación
  y caché.
- `routes/mobile.js`, `services/delivery.js` y `services/copilot.js` leyendo de ActiviHub.
  El motor de intermediarios no se tocó: recibe la misma forma de datos que daba la hoja.
- `app-mobil/src/lib/api.ts` reescrito como cliente REST contra el backend Node. Fuera JSONP,
  datos mock y el token en la URL.
- Apps Script retirado por completo: fuera `Code.gs` y sus dos copias, `notificaciones.gs`,
  `createDelivery_*.gs`, `getDeliveryOptions_CORREGIDA.js`, `test-notificaciones-seguro.gs`,
  `appsscript.json`, los cuatro HTML del web app antiguo, `.clasp.json`, `temp-clasp/`,
  `temp-deploy-*/` y el middleware `legacy.js` (nadie llamaba ya en formato `?action=`).
- `services/chat.js` publica directamente en la Chat API (§7-Q1b), verificado con un envío real.

Tres fallos que salieron al portar y quedan corregidos:
1. `parseActivityCode` devolvía `TC2` y el mapa de catálogos solo tenía `TC`, así que el
   endpoint respondía error para **TC y JL** (70 y 8 actividades del 2627). La app degradaba a
   entrada manual por su cuenta, así que no se veía. Ahora se deriva área + nivel.
2. El puerto Node de `createSollicitud` escribía **11 columnas de 21**: el estado caía en
   `Comentaris_Generals`.
3. Leía `item.quantitat` cuando la app envía `item.unitats` → todo entraba con 1 unidad.

_Plan original de la fase, para referencia:_
Objetivo: que un monitor pueda volver a pedir material. **No toca `Respostes`**: los pedidos siguen
escribiéndose en el Sheet. Riesgo contenido.

1. Crear el schema `comandes` con sus vistas + grants + exponerlo.
2. `backend/src/services/activihub.js` — cliente `service_role` (patrón `ActiviRutes/lib/supabase/admin.ts`).
3. Sustituir el origen, **no el contrato**: `getSchoolMonitorData()`, `getMonitorActivityInSchool()`
   y el tool `Dades` del copilot devuelven la misma forma que hoy, leyendo de `comandes.v_activitats`.
4. **Decidir el camino de la app móvil** (§7-Q1). Recomendación: repuntar `app-mobil` al backend
   Node y arreglar `routes/mobile.js` (materiales `Mat*` con la columna correcta). Con eso Apps
   Script deja de servir a la app móvil de una vez, en lugar de tener que arreglar `Code.gs` también.
5. Pasar `area` explícita en lugar de adivinarla por regex: el código `HC2-EN` no acaba en dígito y
   rompe cualquier derivación del tipo `replace(/\d+[A-Z]?$/,'')`. Es el mismo fallo que ActiviRutes
   tuvo que corregir.
6. Variables de entorno en `.env` **y en Vercel** (los tres proyectos): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`.

**Hecho:** `npm run build` verde · un monitor puede elegir escuela → actividad → material y enviar
un pedido · el admin ve escuelas y monitores otra vez · commit + deploy.

### Fase 2 — Mover los pedidos a Supabase _(1–2 sesiones)_
1. Crear `comandes_app` con sus tablas y RLS.
2. Migrar los **718 ítems** históricos normalizando de paso: modalidad a 4 valores,
   `Responsable_Preparacio` sin duplicados por acento, `Monitor_Intermediari` sin el literal
   `DIRECTA`, y `Notes_Entrega` (0/718) fuera. Enlazar por `centre_id` y `empleats.id` donde se pueda,
   conservando el texto original como respaldo.
3. Reescribir `services/orders.js`, `delivery.js` y `notifications.js` contra la BD. Aquí desaparece
   el patrón `updateRange('A1:Z…')` que hoy **reescribe la hoja entera** en cada cambio de estado.
4. Migrar el catálogo `Mat*` y la caché de distancias (§6).
5. **Retirar Apps Script**: `Code.gs`, `clasp`, `temp-deploy-*`, `temp-clasp` y el `.env` que apunta a
   `script.google.com`.

**Hecho:** el Sheet queda como archivo histórico de solo lectura · build verde · prueba real de
pedido → preparación → entrega → notificación.

### Fase 3 — Identidad del monitor e integración con ActiviHub Monitor _(con David)_
Hoy la app móvil **no tiene login**: el monitor elige su nombre de un desplegable y el token viaja en
`NEXT_PUBLIC_API_TOKEN`. ActiviHub Monitor ya tiene auth de Supabase real
(`empleats.id_supabase_auth_user`, login, recuperación y `set-password`).

Con el monitor autenticado, la app deja de preguntar lo que ya sabe: quién eres, en qué centros
estás, qué actividad das y qué día. El formulario pasa de cuatro desplegables a **elegir material y
cantidad**. Esto es lo que abre el acceso directo desde ActiviHub Monitor, y es la decisión que Jordi
consulta con David.

### Fase 4 — Mejoras que la nueva fuente hace posibles _(sin decidir)_
- Fecha de necesidad validada contra la **sesión real** (hoy se valida contra reglas de calendario).
- `directrius` y `localitzacio_materials` del centro en la ficha del pedido (44 y 38 centros los
  tienen; el Sheet nunca los tuvo).
- Intermediarios calculados sobre sesiones concretas, con sustituciones incluidas.
- Catálogo de materiales para `JL`, que hoy no existe.
- Aviso cuando un centro no tiene dirección (20 de 95 en el ERP): hoy la geocodificación falla en
  silencio.

---

## 6. Un fallo que arreglar por el camino: la caché de distancias no funciona

`sheets.getDistanciesCached()` hace `data.values` sobre lo que `getSheetData()` ya devuelve como
array → **siempre devuelve `[]`**. Y `saveDistancia()` llama a `updateRange()` con dos argumentos
cuando espera tres (`sheetName, range, values`), así que la rama de actualización nunca ha podido
funcionar y siempre cae en `appendRow`.

Consecuencias medidas: la hoja `Distancies` tiene **442 filas para 46 direcciones** (hasta 16 copias
de la misma), y **cada consulta de distancia llama a Google Routes API y se factura**, porque el
acierto de caché es imposible. Al migrar la tabla, `adreca` va con índice único.

---

## 7. Preguntas abiertas

**Q1 · ¿Qué hacemos con Apps Script en la Fase 1?**
_Recomendación:_ repuntar `app-mobil` al backend Node y arreglar `routes/mobile.js`. Alternativa:
arreglar `Code.gs` para que lea de Supabase y tocar la app móvil más tarde — más rápido de escribir,
pero deja dos backends vivos otro trimestre y `Code.gs` no puede guardar la `service_role`.

**Q1b · Notificaciones fuera de Apps Script. ✅ Resuelto el 28-08-2026.**
`chat.js` publica ahora directamente en la Chat API. La cuenta de servicio
`activiconta-service@activiconta.iam.gserviceaccount.com` suplanta a
`admin@eixos-creativa.com` por delegación de dominio, así que los mensajes salen en nombre de esa
cuenta igual que hacía el Apps Script con "Execute as: Me". Verificado con un envío real a
`**/Staff/GESTIÓ`.

Fueron **dos** pasos, y el segundo no es evidente:

1. **admin.google.com** → Controles de API → Delegación de todo el dominio: client ID
   `111947028823604471815` con el scope `https://www.googleapis.com/auth/chat.messages.create`
   (mínimo privilegio: solo publicar).
2. **console.cloud.google.com** → proyecto `activiconta` → Google Chat API → Configuración:
   nombre, avatar y descripción, con las **funciones interactivas desactivadas** (si se dejan
   activadas, exige una URL de endpoint HTTP para cuatro activadores y no deja guardar).
   Sin este paso la API responde `404 Google Chat app not found` **aunque la delegación sea
   correcta y el token se emita bien**. Es el error que despista: parece un problema de permisos
   y es de configuración del proyecto.

La búsqueda del Space ID se portó a Node conservando el fallback secuencial del Apps Script
(`/LestonnacDX1A` → `/LestonnacDX1` → … → `/Lestonnac`), con caché de una hora sobre el sheet
`ChatWebhooks`.

**Cambio de comportamiento a tener presente:** el servicio nuevo devuelve `success: false` cuando
un envío falla. El webhook devolvía `success: true` siempre («modo simulado»), y `notifications.js`
usa ese valor para marcar la comanda como notificada en `Respostes` — o sea que hasta ahora un
fallo de Chat dejaba pedidos marcados como avisados sin que nadie hubiera recibido nada. A partir
de ahora esos fallos se ven.

**Q2 · ¿Cuándo se generan las sesiones y se asignan monitores del 2627?**
Sin `monitors_sessio` no hay MONITORA, y sin MONITORA no hay intermediarios ni optimización de
entregas. La Fase 1 se puede hacer igual (escuela + actividad + dirección ya están), pero el módulo
de entregas no se puede probar de verdad hasta entonces. **Es la dependencia que marca el calendario.**

**Q3 · ¿Qué filtro de actividades usa ActiviComandes?**
ActiviRutes usa «todo menos `NO_SURT`». Para pedir material tiene más sentido «solo lo que ya es
clase» (`ACTIVA`, y `CONFIRMADA` al arrancar). A decidir; la vista expone `estat` para poder cambiarlo
sin tocar SQL.

**Q4 · Notificaciones: ¿`ChatWebhooks` o `prod_005.google_xats`?**
El Sheet tiene 172 espacios de Google Chat mapeados; la tabla del ERP tiene **1 fila**. Hoy el Sheet
es la fuente buena. Propuesta: en la Fase 2 se migra tal cual a `comandes_app`, y se deja para más
adelante consolidarlo con ActiviHub — es una conversación con David, no un problema técnico.

**Q5 · `Baloo` y los tres monitores sin correspondencia.**
¿Se dan por históricos y se migran solo con el texto original, o hay que darlos de alta en el ERP?

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| No hay rollback: `Dades` ya no tiene datos | La Fase 1 es corta y verificable; se hace en rama y se prueba antes de fusionar. |
| Empezar el curso con la app del monitor caída | La Fase 1 es lo único urgente. Todo lo demás puede esperar a octubre. |
| Sin `monitors_sessio` el módulo de entregas sigue ciego | Es una dependencia externa (§7-Q2), no de código. Hay que ponerle fecha. |
| Códigos `-EN` rompen las regex de área | Se pasa `area` explícita desde la vista. Fase 1, paso 5. |
| `service_role` filtrada al cliente | Solo en el backend Node y en rutas de servidor; nunca `NEXT_PUBLIC_`. Revisar en el commit. |
| El histórico de 718 pedidos se pierde o se duplica al migrar | Migración idempotente por `ID_Item`, con el Sheet intacto como respaldo. |
| Dos backends divergen durante la transición | Motivo principal para cerrar Apps Script en la Fase 1 (§7-Q1). |
| Desfase horario al escribir fechas | Aplicar la regla horaria de ActiviHub desde el primer commit, no después. |
