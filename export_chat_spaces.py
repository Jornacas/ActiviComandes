"""
Script para exportar todos los espacios de Google Chat a Google Sheets
Compatible con el sistema de notificaciones de ActiviComandes
"""

import os
import json
from datetime import datetime
from flask import Flask, redirect, request, session, url_for
from requests_oauthlib import OAuth2Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import gspread

# ======================================================
# CONFIGURACIÓN
# ======================================================

# IMPORTANTE: Configurar estas variables con tus valores
CLIENT_ID = '31975727778-hhij06u9u8enu2b8etnttjjgair0lrpq.apps.googleusercontent.com'
CLIENT_SECRET = 'GOCSPX-VhnkE8tNaGpMX6APDK XuyS2IksjH'  # Cambiar por tu client secret real
SPREADSHEET_ID = '1ZbhYEXJ4jnRjGhV__KgpLSreGIbbGKaWKNQ6hkHCEFw'  # ID de tu spreadsheet de ActiviComandes

# OAuth 2.0 endpoints
AUTHORIZATION_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
REDIRECT_URI = 'http://localhost:5000/api/auth/callback'

# Scopes necesarios
SCOPES = [
    'https://www.googleapis.com/auth/chat.messages',
    'https://www.googleapis.com/auth/chat.spaces',
    'https://www.googleapis.com/auth/chat.memberships',
    'https://www.googleapis.com/auth/spreadsheets',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

# ======================================================
# FLASK APP
# ======================================================

app = Flask(__name__)
app.secret_key = 'activicomandes-notificaciones-2024'

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'  # Solo para desarrollo local

@app.route('/')
def index():
    return '''
    <html>
    <head>
        <title>Exportador de Espacios Google Chat</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .button { background: #4285F4; color: white; padding: 15px 30px; text-decoration: none; 
                     border-radius: 5px; display: inline-block; margin: 10px 0; }
            .button:hover { background: #357ae8; }
            h1 { color: #4285F4; }
            .info { background: #e8f0fe; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>🚀 Exportador de Espacios Google Chat</h1>
        <div class="info">
            <p><strong>Este script va a:</strong></p>
            <ol>
                <li>Autenticarte con Google</li>
                <li>Listar todos tus espacios de Google Chat</li>
                <li>Exportarlos a la hoja "ChatWebhooks" de tu spreadsheet</li>
            </ol>
        </div>
        <a href="/api/auth/login" class="button">🔐 Iniciar autenticación con Google</a>
    </body>
    </html>
    '''

@app.route('/api/auth/status')
def auth_status():
    if 'credentials' in session:
        return json.dumps({'authenticated': True, 'email': session.get('email')})
    return json.dumps({'authenticated': False})

@app.route('/api/auth/login')
def login():
    google = OAuth2Session(CLIENT_ID, scope=SCOPES, redirect_uri=REDIRECT_URI)
    authorization_url, state = google.authorization_url(
        AUTHORIZATION_BASE_URL,
        access_type='offline',
        prompt='consent'
    )
    session['oauth_state'] = state
    return redirect(authorization_url)

@app.route('/api/auth/callback')
def callback():
    try:
        google = OAuth2Session(CLIENT_ID, state=session['oauth_state'], redirect_uri=REDIRECT_URI)
        token = google.fetch_token(
            TOKEN_URL,
            client_secret=CLIENT_SECRET,
            authorization_response=request.url
        )
        
        session['credentials'] = token
        
        # Obtener info del usuario
        creds = Credentials(token=token['access_token'])
        service = build('oauth2', 'v2', credentials=creds)
        user_info = service.userinfo().get().execute()
        session['email'] = user_info.get('email')
        
        print(f"\n✅ Usuario autenticado: {session['email']}\n")
        
        # Redirigir a la página de exportación
        return redirect('/export')
        
    except Exception as e:
        print(f"❌ Error en callback: {e}")
        return f'<h1>Error en autenticación</h1><p>{str(e)}</p><a href="/">Volver</a>'

@app.route('/export')
def export_spaces():
    if 'credentials' not in session:
        return redirect('/')
    
    try:
        print("\n" + "="*60)
        print("🚀 INICIANDO EXPORTACIÓN DE ESPACIOS")
        print("="*60 + "\n")
        
        # 1. Obtener espacios de Google Chat
        print("📡 Obteniendo espacios de Google Chat...")
        creds = Credentials(
            token=session['credentials']['access_token'],
            refresh_token=session['credentials'].get('refresh_token'),
            token_uri=TOKEN_URL,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET
        )
        
        chat_service = build('chat', 'v1', credentials=creds)
        
        all_spaces = []
        page_token = None
        
        while True:
            response = chat_service.spaces().list(
                pageSize=100,
                pageToken=page_token
            ).execute()
            
            spaces = response.get('spaces', [])
            all_spaces.extend(spaces)
            
            page_token = response.get('nextPageToken')
            if not page_token:
                break
        
        print(f"✅ Encontrados {len(all_spaces)} espacios totales")
        
        # Filtrar solo espacios ROOM (no DMs)
        room_spaces = [s for s in all_spaces if s.get('type') == 'ROOM' and s.get('displayName')]
        print(f"✅ Filtrados {len(room_spaces)} espacios tipo ROOM\n")
        
        # 2. Preparar datos para Google Sheets
        print("📊 Preparando datos para Google Sheets...")
        spaces_data = []
        for space in room_spaces:
            spaces_data.append([
                space['displayName'],  # Nombre Espacio
                space['name'],  # Space ID
                space.get('createTime', ''),  # Fecha Creación
                space.get('membershipCount', {}).get('joinedDirectHumanUserCount', 0),  # Miembros
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')  # Última Actualización
            ])
        
        # Ordenar por nombre
        spaces_data.sort(key=lambda x: x[0])
        
        # 3. Conectar a Google Sheets
        print("📝 Conectando a Google Sheets...")
        gc = gspread.authorize(creds)
        spreadsheet = gc.open_by_key(SPREADSHEET_ID)
        
        try:
            sheet = spreadsheet.worksheet('ChatWebhooks')
            print("✅ Hoja 'ChatWebhooks' encontrada")
        except gspread.exceptions.WorksheetNotFound:
            print("⚠️  Hoja 'ChatWebhooks' no existe. Creándola...")
            sheet = spreadsheet.add_worksheet(title='ChatWebhooks', rows=1000, cols=5)
            # Agregar headers
            sheet.update('A1:E1', [[
                'Nombre Espacio',
                'Space ID',
                'Fecha Creación',
                'Miembros',
                'Última Actualización'
            ]])
            print("✅ Hoja 'ChatWebhooks' creada")
        
        # 4. Escribir datos
        print(f"💾 Escribiendo {len(spaces_data)} espacios en Google Sheets...")
        if spaces_data:
            end_row = len(spaces_data) + 1
            sheet.update(f'A2:E{end_row}', spaces_data)
            print(f"✅ {len(spaces_data)} espacios exportados correctamente\n")
        else:
            print("⚠️  No se encontraron espacios para exportar\n")
        
        # 5. Mostrar resumen
        print("="*60)
        print("📋 RESUMEN DE ESPACIOS EXPORTADOS")
        print("="*60)
        print(f"\nTotal espacios exportados: {len(spaces_data)}\n")
        print("Primeros 10 espacios:")
        for i, space in enumerate(spaces_data[:10], 1):
            print(f"  {i:2d}. {space[0]:<30} → {space[1]}")
        
        if len(spaces_data) > 10:
            print(f"\n  ... y {len(spaces_data) - 10} espacios más")
        
        print("\n" + "="*60)
        print("✅ EXPORTACIÓN COMPLETADA")
        print("="*60 + "\n")
        
        # Generar HTML de resultado
        html_spaces = ''.join([
            f'<tr><td>{s[0]}</td><td style="font-family: monospace; font-size: 0.8em;">{s[1]}</td><td>{s[3]}</td></tr>'
            for s in spaces_data[:20]
        ])
        
        return f'''
        <html>
        <head>
            <title>✅ Exportación Completada</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1000px; margin: 50px auto; padding: 20px; }}
                .success {{ background: #d4edda; padding: 20px; border-radius: 5px; border-left: 5px solid #28a745; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background: #4285F4; color: white; }}
                .button {{ background: #4285F4; color: white; padding: 10px 20px; text-decoration: none; 
                         border-radius: 5px; display: inline-block; margin: 10px 5px; }}
            </style>
        </head>
        <body>
            <div class="success">
                <h1>✅ Exportación Completada</h1>
                <p><strong>{len(spaces_data)} espacios</strong> exportados correctamente a la hoja "ChatWebhooks"</p>
            </div>
            
            <h2>📋 Espacios Exportados (primeros 20):</h2>
            <table>
                <tr>
                    <th>Nombre Espacio</th>
                    <th>Space ID</th>
                    <th>Miembros</th>
                </tr>
                {html_spaces}
            </table>
            
            <p><strong>Siguiente paso:</strong></p>
            <ol>
                <li>Ve a Google Apps Script</li>
                <li>Ejecuta la función <code>testChatNotification()</code></li>
                <li>Comprueba que recibes el mensaje de prueba</li>
            </ol>
            
            <a href="https://script.google.com/home" class="button" target="_blank">
                🚀 Abrir Google Apps Script
            </a>
            <a href="https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}" class="button" target="_blank">
                📊 Ver Spreadsheet
            </a>
        </body>
        </html>
        '''
        
    except Exception as e:
        print(f"\n❌ ERROR durante la exportación: {e}\n")
        import traceback
        traceback.print_exc()
        return f'''
        <html>
        <head><title>❌ Error</title></head>
        <body>
            <h1>❌ Error durante la exportación</h1>
            <p>{str(e)}</p>
            <pre>{traceback.format_exc()}</pre>
            <a href="/">Volver</a>
        </body>
        </html>
        '''

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 EXPORTADOR DE ESPACIOS GOOGLE CHAT")
    print("="*60)
    print(f"\n📋 Configuración:")
    print(f"  - Spreadsheet ID: {SPREADSHEET_ID}")
    print(f"  - Client ID: {CLIENT_ID[:30]}...")
    print(f"\n🌐 Abriendo servidor en: http://localhost:5000")
    print("   👆 Abre esta URL en tu navegador\n")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000)
