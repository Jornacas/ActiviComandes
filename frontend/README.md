# Frontend - Comanda de Materiales

Frontend moderno en Next.js + Material-UI para el sistema de gestión de pedidos de materiales.

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.local.example .env.local
```

Edita `.env.local` con:
- `NEXT_PUBLIC_API_URL`: URL de tu Google Apps Script Web App
- `NEXT_PUBLIC_API_TOKEN`: Token que configuraste en `Code.gs`

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Compilar para producción
```bash
npm run build
npm start
```

## 📁 Estructura

```
src/
├── app/                 # App Router (Next.js 13+)
│   ├── layout.tsx      # Layout principal con MUI Theme
│   └── page.tsx        # Página principal
├── components/         # Componentes React
│   └── OrdersTable.tsx # Tabla principal de pedidos
└── lib/               # Utilidades
    └── api.ts         # Cliente API para Google Apps Script
```

## 🎯 Funcionalidades Implementadas

- ✅ **Tabla de datos** con Material-UI DataGrid
- ✅ **Filtros y búsqueda** integrados
- ✅ **Selección múltiple** de filas
- ✅ **Actualización de estados** en lote
- ✅ **Sincronización** con formulario de Google
- ✅ **Estadísticas** en tiempo real
- ✅ **Responsive design**

## 🔗 API Endpoints

El frontend consume estos endpoints del backend:
- `loadData` - Cargar pedidos
- `processFormResponses` - Sincronizar formulario
- `updateOrderStatus` - Actualizar estados
- `updateDeliveryInfo` - Actualizar entregas

## 🛠️ Tecnologías

- **Next.js 14** - Framework React
- **Material-UI (MUI)** - Componentes UI
- **TypeScript** - Tipado estático
- **MUI X DataGrid** - Tabla avanzada de datos