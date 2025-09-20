# ActiviComandes

## Sistema de Gestión de Solicitudes de Materiales Educativos

Esta es una aplicación completa que gestiona pedidos de materiales para centros educativos, desarrollada con React/Next.js y Google Apps Script.

## 🏗️ Arquitectura

- **Frontend Admin**: Panel de administración para gestión de pedidos
- **App Móvil**: Aplicación responsive para realizar solicitudes  
- **Backend**: Google Apps Script integrado con Google Sheets
- **Base de Datos**: Google Sheets con múltiples hojas especializadas

## ✅ Características Implementadas

### Frontend de Solicitudes (`app-mobil/`)
- ✅ Selección cascada: Escuela → Actividades → Materiales
- ✅ Filtrado dinámico de materiales por actividad
- ✅ Formateo inteligente de texto (materiales en sentence case)
- ✅ Ordenación personalizada (elementos "SOBRE" primero)
- ✅ Autocompletado con búsqueda

### Panel de Administración (`frontend/`)
- ✅ Tabla de pedidos con DataGrid avanzada
- ✅ Gestión de estados de preparación
- ✅ Sincronización con formularios de Google
- ✅ Estadísticas en tiempo real
- ✅ Actualización masiva de estados

### Backend (Google Apps Script)
- ✅ API RESTful para operaciones CRUD
- ✅ Integración con Google Sheets
- ✅ Filtrado dinámico por escuela y actividad
- ✅ Procesamiento automático de formularios

## 🛠️ Stack Tecnológico

- **Frontend**: React + Next.js + Material-UI + TypeScript
- **Backend**: Google Apps Script + Google Sheets
- **Despliegue**: Vercel (frontend) + Google Apps Script (backend)

## 📁 Estructura del Proyecto

```
ActiviComandes/
├── app-mobil/          # App para realizar solicitudes
│   ├── src/
│   │   ├── components/ # Formulario de solicitudes
│   │   ├── lib/        # Cliente API
│   │   └── app/        # Páginas Next.js
├── frontend/           # Panel de administración  
│   ├── src/
│   │   ├── components/ # Tabla de pedidos
│   │   ├── lib/        # Cliente API
│   │   └── app/        # Páginas Next.js
├── Code.gs            # Backend Google Apps Script
└── appsscript.json    # Configuración del proyecto
```

## 🚀 Configuración e Instalación

### 1. Google Sheets Setup
Crea las siguientes hojas en tu documento:
- `Dades`: Datos maestros (Escuelas, Actividades)  
- `MatCO`, `MatDX1`, `MatDX2`, `MatHC`, `MatTC`: Materiales por actividad
- `Responses`: Respuestas del formulario (opcional)

### 2. Backend (Google Apps Script)
```bash
# Configurar clasp
npm install -g @google/clasp
clasp login

# Desplegar backend
clasp push
clasp deploy
```

### 3. Frontend de Solicitudes
```bash
cd app-mobil
npm install
npm run dev # http://localhost:3003
```

### 4. Panel de Administración  
```bash
cd frontend
npm install
npm run dev # http://localhost:3000
```

## 🌐 URLs en Producción

- **Backend API**: https://script.google.com/macros/s/[SCRIPT_ID]/exec
- **App Móvil**: Desplegar en Vercel
- **Panel Admin**: Desplegar en Vercel

## 📊 Flujo de Datos

```
1. Usuario selecciona ESCUELA
   ↓
2. Frontend carga ACTIVIDADES para esa escuela
   ↓  
3. Usuario selecciona ACTIVIDAD
   ↓
4. Frontend carga MATERIALES para esa actividad
   ↓
5. Usuario completa solicitud → Backend → Google Sheets
```

## 🔧 Próximas Funcionalidades

- [ ] Sistema de carrito multi-item
- [ ] Campo "Altres materials" personalizable
- [ ] Notificaciones automáticas
- [ ] Exportación de reportes
- [ ] Gestión de inventario

## 📝 Estado Actual

✅ **FUNCIONAL**: Cascada Escuela→Actividades→Materiales operativa  
🔄 **EN DESARROLLO**: Sistema de carrito para múltiples solicitudes

---

*Desarrollado para la gestión eficiente de materiales educativos*
