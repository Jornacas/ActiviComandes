# Aplicación de Comanda de Materiales

Esta es una aplicación de Google Apps Script que gestiona pedidos de materiales para centros educativos.

## Características

- Sincronización automática con respuestas de formulario
- Gestión de estados de preparación de materiales
- Asignación automática de centros de entrega y días de entrega
- Interfaz de usuario intuitiva y responsiva

## Estructura de archivos

- `Code.gs`: Contiene toda la lógica del servidor
- `Index.html`: Página principal de la interfaz de usuario
- `style.html`: Estilos CSS para la aplicación
- `script.html`: Scripts JavaScript para la funcionalidad del cliente

## Configuración inicial

1. Crea una hoja de cálculo de Google Sheets
2. Crea las siguientes hojas dentro del documento:
   - "prova": Para almacenar los pedidos principales
   - "dades": Para configuración de la aplicación
   - "ordre_distancia_escoles": Para la asignación de centros de entrega
   - Una hoja para las respuestas del formulario

3. Configura un formulario de Google Forms conectado a la hoja de cálculo

4. Despliega este proyecto con Google Apps Script:

   ```bash
   # Instala clasp si no lo tienes
   npm install -g @google/clasp
   
   # Inicia sesión en Google
   clasp login
   
   # Crea un nuevo proyecto (o usa uno existente)
   clasp create --title "Comanda de Materiales" --rootDir ./ComandaApp
   
   # O vincula a un proyecto existente editando el archivo .clasp.json
   # con tu ID de script de Google Apps Script
   
   # Sube los archivos
   clasp push
   
   # Abre el editor de scripts
   clasp open
   ```

5. Publica la aplicación como aplicación web:
   - En el editor de scripts, ve a Publicar > Implementar como aplicación web
   - Establece "¿Quién puede acceder a la aplicación?" como "Cualquier persona"
   - Haz clic en "Implementar"

## Uso

1. Abre la URL de la aplicación web desplegada
2. Usa el botón "Sincronizar entradas" para obtener las nuevas solicitudes del formulario
3. Selecciona una fila y usa los botones de estado para actualizar su progreso
4. El botón "Actualizar centros de entrega" asigna automáticamente los centros y días de entrega

## Personalización

- Modifica `Code.gs` para ajustar la lógica de negocio
- Personaliza los estilos en `style.html` para cambiar la apariencia
- Ajusta las columnas y la lógica de visualización en `script.html`

## Mantenimiento

Para mantener la aplicación:

1. Edita los archivos localmente
2. Sube los cambios con `clasp push`
3. Si es necesario, crea una nueva versión con `clasp version 'descripción'`
4. Vuelve a implementar la aplicación web con la nueva versión 