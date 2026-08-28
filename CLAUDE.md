# ActiviComandes

Sistema de gestió de comandes de materials per a activitats extraescolars d'Eixos Creativa (Barcelona).

## Arquitectura

- **Backend**: Node.js + Express (port 3010) → `backend/src/`
- **Frontend admin**: Next.js 14.2 + Material-UI → `frontend/src/`
- **App del monitor**: Next.js 16 + Tailwind 4 + el design system d'Eixos → `app-mobil/src/`
- **Dades mestres**: ActiviHub (Supabase, schema `comandes`) — escoles, monitors, activitats
- **Dades pròpies**: Supabase, schema `comandes_app` — comandes, materials, distàncies, espais de Chat
- **Google Sheets**: ja no s'hi llegeix ni s'hi escriu. El full queda com a arxiu històric
- **API Maps**: Google Routes API v2
- **IA Copilot**: Claude Haiku (configurable a Gemini via `AI_PROVIDER` en `.env`)
- **Notificacions**: Google Chat API directa des del backend (delegació de domini)
- **Deploy**: Vercel — `activi-comandes-admin` (frontend), `backend-umber-six-64` (backend), `activicomandes-mobil` (app del monitor)

### Migració a ActiviHub (28-08-2026)

El full `Dades` va morir (`#REF!`, el seu origen es va esborrar) i amb ell l'app del
monitor sencera. Les dades mestres surten ara d'ActiviHub. Pla complet i decisions:
`PLAN_MIGRACION_ACTIVIHUB.md`.

- **Apps Script retirat del tot.** `app-mobil` parla amb el backend Node per REST i les
  notificacions van directes a la Chat API. Ja no queda cap `.gs` al projecte.
- **Google Sheets desconnectat (Fase 2).** Les 718 comandes, els 107 materials, les 46
  distàncies i els 172 espais de Chat viuen a `comandes_app`. `services/comandes-repo.js`
  exposa la mateixa forma `[capçaleres, ...files]` que donava el full, així que la lògica de
  negoci i el frontend no s'han hagut de tocar.
- **Estats visibles**: `ACTIVA` + `CONFIRMADA` (`ACTIVIHUB_ESTATS` al `.env`). Quan el curs
  arrenqui i tot passi a `ACTIVA`, es pot deixar només aquest.
- **Sembra de proves**: mentre ActiviHub no generi les sessions del 2627 no hi ha vincle
  monitor↔activitat. `comandes_app.monitors_prova` l'omple provisionalment; la vista prefereix
  sempre el real i marca quin fa servir a `monitor_origen`. **Esborrar la taula quan hi hagi
  sessions.**
- Comprovació: `node backend/scripts/check-activihub.js`

## Estructura backend

```
backend/src/
├── server.js              # Entry point Express
├── middleware/
│   ├── auth.js            # Token auth (Bearer)
│   └── legacy.js          # Tradueix ?action=xxx a REST. El frontend de l'admin
│                          # encara crida així (lib/api.ts i 4 components): NO retirar
│                          # fins que estigui migrat.
├── routes/
│   ├── admin.js           # Routing layer (~300 línies, delega a serveis)
│   ├── mobile.js          # API app mòbil (dades mestres + crear sol·licituds)
│   └── copilot.js         # Chat IA endpoint
├── services/
│   ├── activihub.js       # Dades mestres des de Supabase (substitueix el full "Dades")
│   ├── orders.js          # Lògica CRUD comandes
│   ├── delivery.js        # Optimització entregues i intermediaris
│   ├── notifications.js   # Gestió notificacions Google Chat
│   ├── sheets.js          # Google Sheets client
│   ├── cache.js           # In-memory cache (node-cache)
│   ├── copilot.js         # Servei IA dual (Claude/Gemini) amb 7 tools
│   ├── maps.js            # Google Routes API (distàncies)
│   ├── chat.js            # Google Chat notifications
│   └── notification-messages.js  # Plantilles missatges
├── utils/
│   └── helpers.js         # Utilitats compartides (UUID, dates, headers, mapHeaderToKey)
└── ../scripts/
    └── check-activihub.js # Comprovació de la connexió amb ActiviHub
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

## Google Sheets (arxiu històric)

El full `ActiviComandes` ja no el llegeix ningú. Es conserva com a còpia del que hi havia
fins al 28-08-2026. Els scripts `backend/scripts/migrate-*.js` el saben rellegir si mai cal.

- `Respostes` → `comandes_app.comandes` (718 ítems, 339 comandes)
- `MatCO`, `MatDX1/2`, `MatHC1/2`, `MatTC` → `comandes_app.materials` (107)
- `Distancies` → `comandes_app.distancies` (442 files → 46 adreces; la caché estava trencada)
- `ChatWebhooks` → `comandes_app.chat_espais` (172)
- `Dades` i `BaseApp` → morts (`#REF!`), substituïts per ActiviHub

### Model de dades

`comandes_app.comandes` és plana: una fila per ítem demanat, igual que el full. No està
normalitzada a propòsit — tota la lògica (agrupacions, intermediaris, notificacions) itera
ítems i el frontend llegeix per nom de columna. Normalitzar és un pas a part.

Porta a més `centre_id`, `activitat_id` i `monitor_id` d'ActiviHub, resolts on s'ha pogut
(82 % / 42 % / 53 % de l'històric). Encara no els fa servir cap lògica: hi són per poder
deixar de casar per text més endavant.

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

# ActiviHub (Supabase, projecte ActiviShift). NOMÉS servidor: mai amb NEXT_PUBLIC_
SUPABASE_URL=<https://xxx.supabase.co>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ACTIVIHUB_ESTATS=ACTIVA,CONFIRMADA   # estats d'activitat visibles

GOOGLE_MAPS_API_KEY=<key>
# Google Chat: compte del Workspace que suplanta el compte de servei per publicar
GOOGLE_CHAT_IMPERSONATE_USER=admin@eixos-creativa.com
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

**Migració (veure `PLAN_MIGRACION_ACTIVIHUB.md`)**
- Esborrar `comandes_app.monitors_prova` quan ActiviHub generi les sessions del 2627
- Fase 3: login real del monitor (`empleats.id_supabase_auth_user`) i accés directe des
  d'ActiviHub Monitor — a decidir amb en David

**Errors coneguts, anteriors a la migració**
- `getStats()` compta l'estat `'Entregat'`, però l'estat real és `'Lliurat'`: el comptador
  d'entregats sempre surt 0
- El frontend compara `modalitatEntrega === 'DIRECTA'` distingint majúscules, i a les dades
  hi conviuen `DIRECTA` i `Directa`. Cal arreglar la comparació i després normalitzar
- El fallback d'espais de Chat desvia un 33 % de les notificacions a l'espai de tota l'escola
  (veure §7-Q1b del pla). Es resol quan `google_xats` pengi de l'activitat

**App del monitor**
- La pell ja és la d'ActiviHub Monitor (mateixos tokens, components `ui/`, Fredoka + Nunito,
  tema clar/fosc). El flux de quatre desplegables es queda fins que hi hagi login.
- L'objectiu és integrar-la dins d'ActiviHub Monitor: allà el monitor ja està identificat i
  el formulari es reduiria a triar material i quantitat. Pendent de parlar-ho amb en David.
- `@source` a `globals.css` és obligatori: Tailwind v4 no detecta els fonts sol perquè
  `app-mobil` és una subcarpeta d'un repositori més gran. I necessita Next 15+; amb Next 14
  generava els tokens però cap utilitat, i la pàgina sortia sense estils.

**Deute tècnic**
- Migrar el frontend de l'admin del format `?action=` a REST i retirar `middleware/legacy.js`
  (afecta `lib/api.ts` i `NotificationManager`, `OrderNotesDialog`, `OrdersTable`)
- Refactoritzar `DeliveryManager.tsx` (1300+ línies, dividir en components)
- Sanejar l'HTML del copilot (`CopilotChat.tsx` fa servir `dangerouslySetInnerHTML` sense DOMPurify)
- Afegir tests
