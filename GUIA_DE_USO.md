# 📱 Guía de Uso ActiviComandes

## ¿Qué es ActiviComandes?

Sistema integral para gestionar solicitudes de materiales educativos, optimizar entregas y coordinar intermediarios de forma eficiente.

---

## 👥 Dos Aplicaciones, Dos Roles

### 🎒 **App Móvil** - Para Solicitar Materiales
**¿Quién la usa?** Monitores, profesores, coordinadores de escuela

**¿Para qué?** Pedir materiales para actividades educativas

### 💼 **Panel Admin** - Para Gestionar Pedidos y Entregas
**¿Quién la usa?** Administradores, encargados de almacén, coordinadores de logística

**¿Para qué?** Ver, organizar, preparar pedidos y coordinar entregas

---

## 🎒 APP MÓVIL - Hacer una Solicitud

### Paso a Paso

**1. Selecciona tu escuela**
   - Busca y selecciona tu centro educativo
   - El sistema cargará las actividades disponibles para esa escuela

**2. Elige la actividad**
   - Selecciona para qué actividad necesitas los materiales
   - Se mostrarán solo los materiales disponibles para esa actividad

**3. Completa los datos**
   - 📅 **Fecha de entrega**: ¿Cuándo lo necesitas?
   - 📋 **Material**: ¿Qué necesitas? (con autocompletado)
   - 🔢 **Cantidad**: ¿Cuántas unidades?
   - 📝 **Otros materiales**: Materiales adicionales o comentarios (opcional)

**4. Añade al carrito**
   - Haz clic en **"Añadir al carrito"**
   - Puedes agregar más materiales diferentes si lo necesitas

**5. Envía la solicitud**
   - Revisa tu carrito
   - Haz clic en **"Enviar solicitud"**
   - ✅ Recibirás confirmación inmediata

### ⚡ Consejos Rápidos

- ✅ La fecha debe ser futura (mínimo mañana)
- ✅ Puedes hacer varias solicitudes a la vez con el carrito
- ✅ El campo "Otros materiales" es opcional
- ✅ La app funciona perfectamente en móviles, tablets y ordenadores

---

## 💼 PANEL ADMIN - Gestión Completa

El panel de administración tiene **DOS SECCIONES PRINCIPALES**:

### 📋 SECCIÓN 1: SOLICITUDES (Sol·licituds)

Esta es la pestaña principal para **gestionar el estado de las solicitudes**.

#### Estados de los Pedidos

Los pedidos pasan por diferentes estados durante su ciclo de vida:

| Estado | Icono | Descripción | Cuándo usarlo |
|--------|-------|-------------|---------------|
| **Pendent** | ⏳ | Recién recibido, sin procesar | Estado inicial automático |
| **En procés** | ⏰ | Se está preparando el material | Cuando empiezas a prepararlo |
| **Preparat** | ✅ | Material listo para entregar | Cuando está empaquetado y listo |
| **Assignat** | 🚚 | Asignado a un intermediario | Cuando se planifica entrega con intermediario |
| **Lliurat** | 📦 | Entregado al solicitante | Cuando el destinatario lo ha recibido |

#### Funciones de la Sección Solicitudes

**📊 Visualizar todas las solicitudes**
   - Tabla completa con: fecha, monitor, escuela, actividad, material, cantidad, estado
   - Columnas especiales: Monitor Intermediario, Escuela Destino, Fecha Lliurament

**🔍 Buscar y Filtrar**
   - Búsqueda rápida (barra superior)
   - Filtros por columnas
   - Ordenación por cualquier campo
   - Exportar a CSV/Excel

**✏️ Cambiar Estados Masivamente**
   1. Selecciona uno o varios pedidos (checkbox a la izquierda)
   2. Selecciona el nuevo estado en el desplegable
   3. Haz clic en **"Actualitzar"**
   4. Los estados cambian instantáneamente

**🗑️ Eliminar Solicitudes**
   - Selecciona las solicitudes a eliminar
   - Haz clic en **"Eliminar Sol·licitud"**
   - Confirma la acción (irreversible)

**🔄 Sincronizar con Formularios**
   - Botón **"Sincronitzar Respostes"**
   - Importa nuevas solicitudes del formulario de Google
   - Actualiza estadísticas en tiempo real

**📊 Estadísticas en Tiempo Real**
   - Total de pedidos
   - Desglose por estados: Pendientes, En Proceso, Preparados, Entregados
   - Alertas de pedidos estancados (>5 días sin cambio)

**🔔 Sistema de Notificaciones Manuales** (Opcional)
   - Activa con el botón **"Activar Sistema Manual"**
   - Aparecen columnas: "Notif. Intermediari" y "Notif. Destinatari"
   - Permite enviar notificaciones personalizadas (ver sección Notificaciones)

---

### 🚚 SECCIÓN 2: LLIURAMENTS (Entregas)

Esta pestaña es para **planificar y asignar entregas** de materiales preparados.

#### ¿Cómo Funciona?

**PASO 1: Visualizar Comandes Preparades**
   - Aparecen automáticamente todas las solicitudes con estado **"Preparat"**
   - Información visible: Solicitante, Escuela, Material, Cantidad, Fecha Necesidad

**PASO 2: Seleccionar Comandes**
   - Marca las comandes que quieres entregar juntas
   - Puedes seleccionar varias para optimizar rutas
   - Checkbox "Seleccionar todas" disponible

**PASO 3: Planificar Lliurament**
   - Haz clic en **"Planificar Lliurament"**
   - El sistema analiza y muestra **opciones optimizadas**

**PASO 4: Analizar Opciones de Entrega**

El sistema te mostrará diferentes opciones ordenadas por eficiencia:

| Tipo de Entrega | Icono | Eficiencia | Descripción |
|------------------|-------|------------|-------------|
| **Lliurament Optimitzat** | 📈 | ★★★ Máxima | Usa monitor intermediario que ya va a la zona |
| **Ruta Multicentre** | 🗺️ | ★★☆ Alta | Combina múltiples entregas en una ruta |
| **Lliurament Directe** | 🚗 | ★☆☆ Media | Entrega directa desde Eixos Creativa |

Cada opción muestra:
- 🏫 Escuelas origen y destino
- 👤 Monitores disponibles (con días que van a cada escuela)
- 📍 Distancia desde Eixos Creativa
- 📦 Número de comandes incluidas
- 💡 Notas y recomendaciones

**PASO 5: Configurar la Entrega**

Selecciona los parámetros:

1. **Modalitat de lliurament**:
   - **Directa**: Material se entrega directamente desde Eixos Creativa
   - **Intermediari**: Se asigna un monitor que hace de intermediario

2. **Monitor Intermediari** (solo si eliges modalidad Intermediario):
   - Selecciona de la lista de monitores disponibles
   - Se muestra: Nombre, Escuela donde va, Días que va

3. **Data de lliurament prevista**:
   - Fecha en que se planifica la entrega
   - ⚠️ El sistema valida:
     - No permite domingos (no hay actividades)
     - Avisa si es posterior a la fecha de necesidad

**PASO 6: Confirmar**
   - Haz clic en **"Confirmar Lliurament"**
   - El sistema:
     - Cambia estado a **"Assignat"**
     - Guarda monitor intermediario y escuela destino
     - Registra fecha de entrega prevista
     - **Envía notificaciones automáticamente** (si están configuradas)

---

### 📬 SISTEMA DE NOTIFICACIONES

#### ¿Qué son las notificaciones?

El sistema puede enviar avisos a través de **Google Chat** a los monitores cuando se les asigna material.

#### Tipos de Notificaciones

**1. Notificación al Intermediario** 🔔
   - **Cuándo se envía**: Cuando se asigna un pedido con modalidad "Intermediario"
   - **A quién**: Al monitor intermediario
   - **Contenido**:
     - Material que recibirá
     - Dónde lo recogerá (escuela destino intermediario)
     - Cuándo lo recibirá (fecha lliurament prevista)
     - A quién debe entregarlo (solicitante y escuela final)
     - Cuándo lo debe entregar (fecha necesidad)

**2. Notificación al Destinatario** 📨
   - **Cuándo se envía**: Cuando se asigna un pedido (con o sin intermediario)
   - **A quién**: Al solicitante original
   - **Contenido**:
     - Material asignado
     - Quién lo entregará (intermediario o directo)
     - Dónde lo recibirá (su escuela)
     - Cuándo lo recibirá (fecha necesidad)

#### Cómo Usar las Notificaciones

**A) Notificaciones Automáticas**
   - Se envían automáticamente al **"Confirmar Lliurament"** en la sección Entregas
   - No requiere acción adicional

**B) Notificaciones Manuales** (desde Sección Solicitudes)
   1. Activa el **"Sistema Manual"** (botón verde)
   2. Aparecen columnas de notificaciones en la tabla
   3. Para cada pedido con intermediario asignado verás:
      - Botón **"Enviar"** si no se ha enviado
      - Chip **"Enviat ✅"** si ya se envió
      - Estado **"⏳ Pendent"** si no tiene intermediario aún
      - Estado **"✅ Confirmat"** si ya está entregado
   4. Haz clic en **"Enviar"** para abrir el modal
   5. Revisa/edita el mensaje
   6. Confirma el envío

#### Estados de Notificaciones

- **⏳ Pendent**: No se ha enviado aún
- **📤 Enviar**: Botón para enviar la notificación
- **Enviat ✅**: Ya se envió correctamente
- **✅ Confirmat**: El pedido ya se completó

---

### 🎯 GESTIÓN DE INTERMEDIARIOS

#### ¿Qué es un Intermediario?

Un **monitor intermediario** es alguien que:
- Ya va regularmente de una escuela a otra
- Puede recoger material en una escuela (o en Eixos)
- Llevarlo a la escuela donde trabaja el solicitante

#### ¿Por qué usar intermediarios?

✅ **Optimiza recursos**: Aprovecha desplazamientos que ya se hacen  
✅ **Ahorra tiempo**: Evita viajes directos innecesarios  
✅ **Reduce costes**: Menos desplazamientos desde Eixos  
✅ **Más ecológico**: Menos kilómetros en total

#### Cómo Asignar un Intermediario

1. Ve a la sección **"Lliuraments"**
2. Selecciona las comandes preparadas
3. Haz clic en **"Planificar Lliurament"**
4. El sistema te mostrará monitores que:
   - Van a la escuela del solicitante
   - Tienen disponibilidad en los días correctos
   - Optimizan la ruta
5. Selecciona **"Modalitat Intermediari"**
6. Elige el monitor de la lista
7. Confirma

#### Cómo Eliminar un Intermediario

Si necesitas quitar la asignación de intermediario:

1. Ve a **"Sol·licituds"** (Sección 1)
2. Selecciona los pedidos con intermediario asignado
3. Haz clic en **"Eliminar Intermediari"**
4. Confirma la acción
5. El estado vuelve automáticamente a **"Preparat"**

---

### ⚡ Consejos para Administradores

**Flujo de Trabajo Recomendado:**

1. **Sincroniza** al empezar el día (botón "Sincronitzar Respostes")
2. **Marca "En procés"** los pedidos que vas a preparar hoy
3. **Cambia a "Preparat"** cuando estén listos
4. **Ve a Lliuraments** para planificar entregas
5. **Usa intermediarios** siempre que sea posible (más eficiente)
6. **Confirma entregas** con fecha precisa
7. **Las notificaciones se envían** automáticamente

**Otros Consejos:**

- ✅ Selección múltiple para cambios masivos de estado
- ✅ Los pedidos de la misma escuela se pueden agrupar
- ✅ Revisa avisos de pedidos estancados (>5 días)
- ✅ Exporta datos con el botón de exportación (esquina superior)
- ✅ Usa filtros para ver solo lo que necesitas

---

## 🚀 Acceso Rápido

### URLs de Producción

**App Móvil** (Solicitudes):
```
https://[tu-dominio-app-mobil].vercel.app
```

**Panel Admin** (Gestión):
```
https://[tu-dominio-admin].vercel.app
```

---

## 💡 Ejemplos Prácticos de Uso

### Ejemplo 1: Entrega Optimizada con Intermediario

**Situación**: María de la escuela "EI Montblanc" necesita sobres para el viernes.

**Flujo:**
1. María solicita los sobres desde la App Móvil (miércoles)
2. Admin marca como "Preparat" (jueves mañana)
3. Admin va a "Lliuraments" y selecciona la comanda
4. Sistema muestra: "Joan va a EI Montblanc los viernes desde CEIP Vilafranca"
5. Admin asigna a Joan como intermediario
6. Sistema envía notificaciones:
   - A Joan: "Recoge sobres el jueves en CEIP Vilafranca, entrégalos a María en EI Montblanc el viernes"
   - A María: "Joan te llevará los sobres el viernes a EI Montblanc"
7. Joan confirma recepción
8. María confirma recepción el viernes

**Resultado**: ✅ Ahorro de un viaje directo, material entregado a tiempo

---

### Ejemplo 2: Entrega Directa Urgente

**Situación**: Pere necesita urgente material para mañana, no hay intermediarios disponibles.

**Flujo:**
1. Pere solicita desde la App Móvil
2. Admin marca como "Preparat"
3. Admin va a "Lliuraments"
4. Sistema muestra solo opción "Lliurament Directe" (sin intermediarios)
5. Admin selecciona "Modalitat Directa"
6. Asigna fecha de entrega: mañana
7. Admin organiza el envío directo desde Eixos

**Resultado**: ✅ Material entregado urgentemente de forma directa

---

### Ejemplo 3: Múltiples Comandes, Una Ruta

**Situación**: 3 escuelas de la misma zona piden material la misma semana.

**Flujo:**
1. Admin marca las 3 comandes como "Preparat"
2. Va a "Lliuraments" y selecciona las 3 comandes
3. Sistema analiza y muestra "Ruta Multicentre - Eficiencia Alta"
4. Muestra monitores que van a las 3 escuelas
5. Admin asigna intermediario que cubre las 3 escuelas
6. Se envían 3 notificaciones a cada destinatario

**Resultado**: ✅ 3 entregas en un solo viaje, máxima eficiencia

---

## ❓ Preguntas Frecuentes

### Para Monitores (App Móvil)

**P: ¿Puedo pedir varios materiales diferentes a la vez?**  
R: Sí, usa el carrito. Añade cada material con su cantidad y luego envía todo junto.

**P: ¿Puedo modificar una solicitud ya enviada?**  
R: No directamente desde la app. Contacta con el administrador para modificaciones.

**P: ¿Cómo sé si mi pedido está listo?**  
R: Si el sistema de notificaciones está activo, recibirás un aviso en Google Chat. También puedes preguntar al admin.

**P: ¿Qué hago si necesito algo urgente?**  
R: Marca la fecha de necesidad lo antes posible y contacta al admin para coordinar entrega urgente.

**P: ¿Qué pongo en "Otros materiales"?**  
R: Materiales específicos que no están en la lista, o instrucciones especiales (ej: "preferiblemente de color azul").

---

### Para Administradores

**P: ¿Cuándo debo usar intermediarios vs. entrega directa?**  
R: Usa intermediarios cuando:
   - Hay un monitor que va regularmente a la escuela destino
   - La fecha de necesidad permite planificación (no es urgente)
   - El sistema lo recomienda (eficiencia alta/máxima)

**P: ¿Cómo sé qué intermediario elegir si hay varios?**  
R: El sistema los ordena por eficiencia. Elige el primero (marcado como "RECOMANAT") o verifica:
   - Días que va (debe coincidir con tus fechas)
   - Distancia desde Eixos
   - Número de comandes que puede llevar

**P: ¿Puedo cambiar el intermediario después de asignar?**  
R: Sí, usa "Eliminar Intermediari" en la sección Solicitudes, y luego vuelve a planificar en Entregas.

**P: ¿Se pueden enviar notificaciones si no asigno intermediario?**  
R: Las notificaciones automáticas solo se envían cuando hay intermediario. Para entregas directas, coordina manualmente.

**P: ¿Qué hago con pedidos estancados?**  
R: El sistema te avisará si un pedido lleva >5 días sin cambio de estado. Revisa y actualiza su estado o contacta al solicitante.

**P: ¿Puedo eliminar una solicitud por error?**  
R: Sí, pero es irreversible. Asegúrate antes de confirmar la eliminación.

**P: ¿Cómo exporto los datos?**  
R: Usa el botón de exportación en la toolbar de la tabla (esquina superior derecha). Puedes exportar a CSV o Excel.

---

## 🔧 Solución de Problemas

### Problema: No aparecen comandes en "Lliuraments"
**Solución**: Verifica que las comandes estén en estado "Preparat". Solo las preparadas aparecen aquí.

### Problema: No hay monitores disponibles para intermediario
**Solución**: Puede que:
- Ningún monitor vaya a esa escuela
- Las fechas no coinciden con los días que van los monitores
- Usa "Lliurament Directe" en su lugar

### Problema: Las notificaciones no se envían
**Solución**: 
- Verifica que el sistema de notificaciones esté configurado (Google Chat)
- Comprueba que los monitores estén en los espacios de Chat correctos
- Prueba con notificaciones manuales desde "Sol·licituds"

### Problema: La fecha de entrega da error
**Solución**: 
- No puedes seleccionar domingos (sin actividades)
- Verifica que la fecha sea futura
- Si es posterior a la fecha de necesidad, aparecerá un aviso (pero puedes continuar)

### Problema: No puedo seleccionar múltiples pedidos
**Solución**: Usa los checkboxes a la izquierda de cada fila. Si no aparecen, recarga la página.

---

## 🎓 Glosario de Términos

- **Comanda / Sol·licitud**: Pedido de material realizado por un monitor
- **Intermediari**: Monitor que transporta material entre escuelas
- **Modalitat**: Tipo de entrega (Directa o Intermediario)
- **Data Necessitat**: Fecha en que el solicitante necesita el material
- **Data Lliurament Prevista**: Fecha planificada para entregar el material
- **Escola Destí**: Escuela donde el intermediario recoge el material
- **Escola Origen**: Escuela del solicitante final
- **Estat**: Estado del pedido (Pendent, En procés, Preparat, Assignat, Lliurat)
- **Eficiència**: Medida de optimización de la ruta (Màxima, Alta, Mitjana, Baixa)

---

## 📞 Soporte y Contacto

¿Problemas técnicos? ¿Sugerencias de mejora?

**Contacta con:**
- 📧 Administrador del sistema
- 💬 Grupo de Google Chat de soporte
- 📱 Coordinador de logística de Eixos Creativa

---

## 📈 Mejoras Futuras (Próximamente)

- [ ] Vista de pedidos para monitores (cada monitor ve solo sus pedidos)
- [ ] Historial de entregas realizadas
- [ ] Reportes mensuales automáticos
- [ ] Integración con calendario para planificación avanzada
- [ ] App móvil nativa (iOS/Android)
- [ ] Confirmación de recepción desde notificaciones de Chat
- [ ] Seguimiento en tiempo real de entregas

---

**Última actualización**: Octubre 2025  
**Versión**: 2.0  
**Sistema**: ActiviComandes - Eixos Creativa

