# 🚨 INSTRUCCIONES CRÍTICAS: Resolver API Keys Expuestas

**FECHA:** 2025-10-20
**SEVERIDAD:** CRÍTICA
**ACCIÓN REQUERIDA:** Inmediata

---

## ⚠️ Problema Detectado

Se han encontrado **2 API Keys de Google Maps** expuestas en el historial del repositorio Git:

1. `AIzaSyByO41A21_Ze-M-0wjbsooHVf0mElEnatI` (Routes API)
2. `AIzaSyDR7fVL6kQvQfn5d_6Znd5ZpHIHOGj9cYc` (Distance Matrix API)

**Archivos afectados:**
- `ESTADO_MIGRACION.md` (commit 7731008d)
- `SITUACION_ACTUAL_OPTIMIZACION.md`

---

## ✅ Acciones Ya Realizadas

1. ✅ API keys eliminadas de archivos markdown actuales
2. ✅ `.gitignore` actualizado para prevenir futuros commits de archivos sensibles
3. ✅ Cambios listos para commit

---

## 🔧 Pasos a Seguir (ORDEN IMPORTANTE)

### Paso 1: Commit de los Cambios de Seguridad ✅

```bash
git add .gitignore ESTADO_MIGRACION.md SITUACION_ACTUAL_OPTIMIZACION.md
git commit -m "security: Remove exposed Google Maps API keys from documentation

- Redact API keys from markdown files
- Update .gitignore to exclude sensitive documentation
- Prevent future commits of state/deployment files"
```

### Paso 2: Limpiar el Historial de Git

**Opción A: Usando BFG Repo Cleaner (MÁS FÁCIL)**

```bash
# 1. Descargar BFG desde https://rtyley.github.io/bfg-repo-cleaner/
# 2. Crear archivo con las API keys a eliminar
echo "AIzaSyByO41A21_Ze-M-0wjbsooHVf0mElEnatI" > api-keys.txt
echo "AIzaSyDR7fVL6kQvQfn5d_6Znd5ZpHIHOGj9cYc" >> api-keys.txt

# 3. Ejecutar BFG
java -jar bfg.jar --replace-text api-keys.txt .

# 4. Limpiar y garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (¡CUIDADO!)
git push --force
```

**Opción B: Usando git filter-repo (MÁS CONTROL)**

```bash
# 1. Instalar git-filter-repo
pip install git-filter-repo

# 2. Eliminar archivos del historial
git filter-repo --path ESTADO_MIGRACION.md --invert-paths
git filter-repo --path SITUACION_ACTUAL_OPTIMIZACION.md --invert-paths

# 3. Force push
git push --force
```

**Opción C: MANUAL (si tienes pocos commits)**

```bash
# Hacer un rebase interactivo y editar los commits afectados
git rebase -i HEAD~10  # Ajusta el número según cuántos commits atrás están las keys
# Marca los commits con 'edit', cambia los archivos, y continúa
git push --force
```

### Paso 3: Rotar las API Keys en Google Cloud Console 🔑

**CRÍTICO:** Aunque limpies el historial de Git, las API keys expuestas deben ser **DESHABILITADAS** inmediatamente.

```bash
# 1. Ve a Google Cloud Console
https://console.cloud.google.com/apis/credentials?project=activiconta

# 2. Para cada API key expuesta:
   - Encuentra la key en la lista
   - Click en "..." > "Delete" o "Restrict"
   - Crea una NUEVA API key

# 3. Nuevas API keys que necesitas crear:
   ✅ Nueva API key para Routes API
   ✅ Nueva API key para Distance Matrix API

# 4. Restricciones recomendadas:
   - Application restrictions: HTTP referrers o IP addresses
   - API restrictions: Solo Routes API y Distance Matrix API
```

### Paso 4: Actualizar Variables de Entorno

**Backend (.env):**
```bash
# backend/.env
GOOGLE_MAPS_API_KEY=[NUEVA_API_KEY_AQUI]
```

**Google Apps Script (Code.gs):**
```javascript
// Configurar en Script Properties
// File > Project properties > Script properties
// Añadir:
// GOOGLE_MAPS_API_KEY = [NUEVA_API_KEY_AQUI]
```

**Vercel (si está desplegado):**
```bash
# Ir a: https://vercel.com/tu-proyecto/settings/environment-variables
# Actualizar:
GOOGLE_MAPS_API_KEY = [NUEVA_API_KEY_AQUI]

# Redeployar:
vercel --prod
```

### Paso 5: Verificar Que No Hay Más Secretos Expuestos

```bash
# Buscar posibles API keys en el repositorio
grep -r "AIza" .
grep -r "GOOGLE.*KEY" .

# Herramienta recomendada: TruffleHog
docker run --rm -v "$(pwd):/repo" trufflesecurity/trufflehog:latest filesystem /repo
```

---

## 🔒 Mejores Prácticas para el Futuro

### 1. Usar Variables de Entorno

**NUNCA hacer:**
```javascript
const apiKey = "AIzaSy..."; // ❌ NUNCA
```

**SIEMPRE hacer:**
```javascript
// Backend Node.js
const apiKey = process.env.GOOGLE_MAPS_API_KEY; // ✅

// Google Apps Script
const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_API_KEY'); // ✅
```

### 2. Configurar Pre-commit Hooks

```bash
# Instalar git-secrets
brew install git-secrets  # macOS
# o
apt-get install git-secrets  # Linux

# Configurar en el repo
git secrets --install
git secrets --register-aws
git secrets --add 'AIza[0-9A-Za-z-_]{35}'
```

### 3. Revisar Antes de Commit

```bash
# Siempre revisar qué se está commiteando
git diff --staged

# Si ves API keys, NO HAGAS COMMIT
```

---

## 📊 Checklist de Seguridad

- [ ] Commit de cambios actuales realizado
- [ ] Historial de git limpiado con BFG/filter-repo
- [ ] API keys antiguas eliminadas en Google Cloud Console
- [ ] Nuevas API keys creadas con restricciones
- [ ] Variables de entorno actualizadas (backend/.env)
- [ ] Script Properties actualizadas (Google Apps Script)
- [ ] Variables de entorno actualizadas en Vercel
- [ ] Proyecto redesplegado en Vercel
- [ ] Verificación de que no hay más secretos expuestos
- [ ] Pre-commit hooks configurados (opcional)

---

## 🆘 Enlaces de Ayuda

- **BFG Repo Cleaner:** https://rtyley.github.io/bfg-repo-cleaner/
- **git-filter-repo:** https://github.com/newren/git-filter-repo
- **Google Cloud Console:** https://console.cloud.google.com
- **GitHub Secret Scanning:** https://docs.github.com/en/code-security/secret-scanning
- **TruffleHog:** https://github.com/trufflesecurity/trufflehog

---

## ⏱️ Tiempo Estimado

- Paso 1: 2 minutos
- Paso 2: 5-10 minutos
- Paso 3: 5 minutos
- Paso 4: 10 minutos
- Paso 5: 5 minutos

**TOTAL:** ~30 minutos

---

**IMPORTANTE:** No ignores esta alerta. Las API keys expuestas pueden resultar en:
- Uso no autorizado de tus cuotas de Google Maps
- Cargos inesperados en tu cuenta de Google Cloud
- Posible abuso de servicios

**Completa todos los pasos lo antes posible.**
