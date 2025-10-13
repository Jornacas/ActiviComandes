# ActiviComandes Backend

Backend API migrado de Google Apps Script a Node.js + Express.

## Estado: En desarrollo (rama backend-migration)

⚠️ **IMPORTANTE**: Esta rama está en desarrollo. Producción sigue usando Apps Script.

## Setup Local

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus valores
```

3. Añadir credenciales de Google:
   - Descargar credentials.json de Google Cloud Console
   - Colocarlo en la carpeta `backend/`

4. Correr en desarrollo:
```bash
npm run dev
```

El servidor correrá en http://localhost:3000

## Estructura

```
backend/
├── src/
│   ├── server.js           # Servidor Express principal
│   ├── routes/
│   │   ├── mobile.js       # Endpoints para app móvil
│   │   └── admin.js        # Endpoints para app admin
│   ├── services/
│   │   ├── sheets.js       # Conexión a Google Sheets
│   │   └── cache.js        # Sistema de caché
│   └── middleware/
│       └── auth.js         # Autenticación
└── package.json
```

## Endpoints disponibles

### Mobile App
- GET /api/schools
- GET /api/monitors
- GET /api/materials
- POST /api/sollicitud
- ...

### Admin App
- GET /api/admin/orders
- POST /api/admin/orders/update
- POST /api/admin/delivery/create
- ...

## Testing

Los mismos Google Sheets que usa producción. Ambos sistemas (Apps Script y este backend) pueden leer/escribir sin conflictos.
