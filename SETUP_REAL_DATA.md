# 🔗 Configuración para Datos Reales

## Estado Actual
✅ **Backend actualizado** - Conectado a tu Google Sheets real
✅ **App móvil lista** - Solo falta configurar la URL

## Configuración del Backend (Google Apps Script)

### 1. Desplegar Code.gs
1. Abre [Google Apps Script](https://script.google.com)
2. Crea un nuevo proyecto o abre uno existente
3. Pega el contenido del archivo `Code.gs` (ya actualizado)
4. **Importante:** El código ya está configurado para:
   - Tu Google Sheets: `1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw`
   - Token de autenticación: `comanda_materials_2024`
   - Hoja "Dades" columna A para escuelas

### 2. Publicar como Web App
1. Haz clic en **"Implementar"** > **"Nueva implementación"**
2. **Tipo:** Aplicación web
3. **Ejecutar como:** Yo
4. **Acceso:** Cualquier persona
5. **Implementar** y copiar la URL

## Configuración de la App Móvil

### Actualizar .env.local
```bash
cd app-mobil
```

Edita `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
NEXT_PUBLIC_API_TOKEN=comanda_materials_2024
```

### Reiniciar la app
```bash
npm run dev
```

## Verificación

### ✅ Backend funciona
Prueba la API directamente:
```
GET: https://script.google.com/macros/s/TU_SCRIPT_ID/exec?action=getEscoles&token=comanda_materials_2024
```

Deberías ver:
```json
{
  "success": true,
  "data": ["Escola A", "Escola B", ...]
}
```

### ✅ App móvil conectada
1. Ve a http://localhost:3002
2. El campo "Escola" debe cargar las escuelas reales de la hoja "Dades"
3. Deben aparecer sin duplicados y ordenadas alfabéticamente

## Estructura esperada en Google Sheets

### Hoja "Dades"
```
| A (Escola)     | B (Activitat) | C (...)
|----------------|---------------|--------
| CEIP Escola 1  | Matemàtiques  | ...
| CEIP Escola 1  | Ciències      | ...
| CEIP Escola 2  | Art           | ...
| IES Institut 1 | Història      | ...
```

### Resultado en la app
- Solo aparecen escuelas únicas
- Ordenadas alfabéticamente
- Filtro de búsqueda funciona
- En catalán