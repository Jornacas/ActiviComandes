# ActiviComandes

Sistema de gestió de comandes de materials per a activitats extraescolars d'Eixos Creativa (Barcelona).

## Arquitectura

- **Backend**: Node.js + Express (port 3010) → `backend/src/`
- **Frontend**: Next.js 14.2 + Material-UI → `frontend/src/`
- **Base de dades**: Google Sheets (no SQL)
- **API Maps**: Google Routes API v2
- **IA Copilot**: Claude Haiku (configurable a Gemini via `AI_PROVIDER` en `.env`)
- **Notificacions**: Google Chat via Apps Script webhook
- **Deploy**: Vercel (frontend: activi-comandes-admin) + Vercel (backend: backend-umber-six-64)

## Estructura backend

```
backend/src/
├── server.js              # Entry point Express
├── middleware/
│   ├── auth.js            # Token auth (Bearer)
│   └── legacy.js          # Compat Apps Script → REST
├── routes/
│   ├── admin.js           # Routing layer (~300 línies, delega a serveis)
│   ├── mobile.js          # API app mòbil (crear sol·licituds)
│   └── copilot.js         # Chat IA endpoint
├── services/
│   ├── orders.js          # Lògica CRUD comandes
│   ├── delivery.js        # Optimització entregues i intermediaris
│   ├── notifications.js   # Gestió notificacions Google Chat
│   ├── sheets.js          # Google Sheets client
│   ├── cache.js           # In-memory cache (node-cache)
│   ├── copilot.js         # Servei IA dual (Claude/Gemini) amb 7 tools
│   ├── maps.js            # Google Routes API (distàncies)
│   ├── chat.js            # Google Chat notifications
│   └── notification-messages.js  # Plantilles missatges
└── utils/
    └── helpers.js         # Utilitats compartides (UUID, dates, headers, mapHeaderToKey)
```

## Estructura frontend

```
frontend/src/
├── app/
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Entry point
├── components/
│   ├── AdminTabs.tsx      # Navegació principal (3 tabs)
│   ├── OrdersTable.tsx    # Taula comandes (~1600 línies)
│   ├── OrderDetailsDrawer.tsx  # Drawer lateral detalls pedido
│   ├── NotificationManager.tsx # Lògica notificacions + modal edició missatge
│   ├── StatusUpdateBar.tsx     # Barra accions canvi d'estat
│   ├── OrderNotesDialog.tsx    # Diàleg edició notes
│   ├── DeliveryManager.tsx     # Gestió lliuraments (1300+ línies - pendent refactor)
│   ├── CopilotChat.tsx    # Xat assistent IA
│   ├── HelpSection.tsx    # Documentació
│   └── MobileAppWindow.tsx # Finestra app mòbil
├── utils/
│   └── orderUtils.ts     # Utilitats compartides (format dates, status colors/icons)
└── lib/
    └── api.ts             # Client API
```

## Google Sheets

### Fulls principals
- **"Respostes"**: Registres de sol·licituds de materials (taula principal)
- **"Dades"**: ESCOLA, MONITORA, DIA, HORA INICI, TORN, ACTIVITAT, ADREÇA
- **"Distancies"**: Cache de distàncies Google Maps
- **"Materiales"**: Catàleg de materials genèrics

### Fulls de materials per activitat (app mòbil)
- Jocs Populars, Taller de Reciclatge, Arts, Manualitats, Ciencia, Graffiti, Dj

### Columna reutilitzada
- `Distancia_Academia` (columna V de Respostes) → reutilitzada com `ID_Lliurament`
- El codi gestiona ambdós noms amb fallback a `helpers.js`

### SpreadsheetID
- Configurat a `.env` (`SPREADSHEET_ID`)

## Lògica de negoci clau

### Tipus d'entrega (optimització)
1. **Recollida**: El monitor passa per l'oficina (Ramon Turró 73) → distància 0
2. **Entrega Directa**: Portar material directament a l'escola
3. **Intermediari**: Un monitor que passa per l'oficina porta material a un altre que va a la mateixa escola
4. **Coincidència**: Intermediari i destinatari coincideixen a la mateixa escola

### Regles temporals
- Si falten < 30 min per l'activitat → opció descartada
- Després de les 18:00 → totes les opcions d'avui descartades
- El copilot té consciència de data/hora actual

### Notificacions
- Sempre visibles al drawer lateral i a les columnes de la taula
- Agrupades per `idLliurament` (intermediari) o `nomCognoms+escola+data` (destinatari)
- Missatge editable abans d'enviar

## Variables d'entorn backend (.env)

```
PORT=3010
AUTH_TOKEN=<token>
SPREADSHEET_ID=<google-sheets-id>
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_MAPS_API_KEY=<key>
APPS_SCRIPT_NOTIFICATION_URL=<webhook-url>
AI_PROVIDER=claude          # "claude" o "gemini"
ANTHROPIC_API_KEY=<key>
CLAUDE_MODEL=claude-haiku-4-5-20251001
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-pro
```

## Variables d'entorn frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3010
NEXT_PUBLIC_API_TOKEN=<token>
```

## Deploy

```bash
# Frontend (autodeploy amb push a main)
# Vercel project: activi-comandes-admin

# Backend (deploy manual)
cd backend && npx vercel --prod --yes
# Vercel project: backend-umber-six-64
```

## Comandes útils

```bash
# Backend
cd backend && npm start          # Producció
cd backend && npm run dev        # Dev amb nodemon

# Frontend
cd frontend && npm run dev       # Dev (port 3000)
cd frontend && npm run build     # Build producció

# Execució local completa
start.bat
```

## Idioma

L'aplicació està en **català**. El copilot respon en català. Els comentaris de codi poden estar en català o castellà.

## Pendents

- Refactoritzar `DeliveryManager.tsx` (1300+ línies, dividir en components)
- Afegir tests
