# Script automatizado para deploy del frontend admin
# Elimina configuración local si existe
if (Test-Path ".vercel") {
    Remove-Item .vercel -Recurse -Force
}

# Crea configuración directa para el proyecto existente
New-Item -ItemType Directory -Force .vercel
@{
    "projectId" = "prj_n9LnrPv8PFhToiNxQZHtBnM3kcit"
    "orgId" = "team_WtnaTUNLYQnCHa4gryCP2zmf"
    "projectName" = "activi-comandes-admin"
} | ConvertTo-Json | Out-File .vercel/project.json -Encoding UTF8

Write-Host "✅ Configuración restaurada para activi-comandes-admin"

# Deploy directo a producción
Write-Host "🚀 Iniciando deploy..."
vercel --prod --yes 