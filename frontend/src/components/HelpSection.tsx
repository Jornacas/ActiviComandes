'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Button,
} from '@mui/material';
import {
  Search,
  ExpandMore,
  PhoneAndroid,
  AdminPanelSettings,
  CheckCircle,
  LocalShipping,
  Notifications,
  Help,
  Lightbulb,
  Warning,
  Schedule,
  Groups,
  School,
  Star,
  TrendingUp,
  Route,
  DirectionsCar,
  ArrowForward,
  Download,
} from '@mui/icons-material';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  keywords: string[];
  category: 'mobile' | 'admin' | 'delivery' | 'notifications' | 'troubleshooting' | 'faq';
}

export default function HelpSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['intro']);

  const helpSections: HelpSection[] = [
    {
      id: 'intro',
      title: '¿Qué es ActiviComandes?',
      icon: <Help color="primary" />,
      category: 'admin',
      keywords: ['introducción', 'que es', 'inicio', 'presentación'],
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Sistema integral para gestionar solicitudes de materiales educativos, optimizar entregas y coordinar intermediarios de forma eficiente.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            El sistema tiene <strong>dos aplicaciones</strong>: App Móvil (para solicitar) y Panel Admin (para gestionar).
          </Alert>
        </Box>
      ),
    },
    {
      id: 'app-mobile',
      title: 'App Móvil - Hacer Solicitudes',
      icon: <PhoneAndroid color="secondary" />,
      category: 'mobile',
      keywords: ['móvil', 'app', 'solicitar', 'pedir', 'material', 'carrito', 'monitor'],
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            ¿Quién la usa?
          </Typography>
          <Typography variant="body1" paragraph>
            Monitores, profesores y coordinadores de escuela que necesitan materiales para actividades educativas.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Paso a Paso
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><School color="primary" /></ListItemIcon>
              <ListItemText 
                primary="1. Selecciona tu escuela"
                secondary="El sistema cargará las actividades disponibles para esa escuela"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
              <ListItemText 
                primary="2. Elige la actividad"
                secondary="Se mostrarán solo los materiales disponibles para esa actividad"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Schedule color="primary" /></ListItemIcon>
              <ListItemText 
                primary="3. Completa los datos"
                secondary="Fecha de entrega, material, cantidad y comentarios opcionales"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><LocalShipping color="primary" /></ListItemIcon>
              <ListItemText 
                primary="4. Añade al carrito y envía"
                secondary="Puedes agregar varios materiales antes de enviar"
              />
            </ListItem>
          </List>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Consejos:</strong> La fecha debe ser futura (mínimo mañana) • Puedes hacer varias solicitudes a la vez • 
            Funciona en móviles, tablets y ordenadores
          </Alert>
        </Box>
      ),
    },
    {
      id: 'estados',
      title: 'Estados de los Pedidos',
      icon: <CheckCircle color="success" />,
      category: 'admin',
      keywords: ['estado', 'estados', 'pendent', 'preparat', 'lliurat', 'assignat', 'proceso'],
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Los pedidos pasan por diferentes estados durante su ciclo de vida:
          </Typography>
          
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Estado</strong></TableCell>
                  <TableCell><strong>Icono</strong></TableCell>
                  <TableCell><strong>Descripción</strong></TableCell>
                  <TableCell><strong>Cuándo usarlo</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><Chip label="Pendent" size="small" /></TableCell>
                  <TableCell>⏳</TableCell>
                  <TableCell>Recién recibido, sin procesar</TableCell>
                  <TableCell>Estado inicial automático</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="En procés" size="small" color="warning" /></TableCell>
                  <TableCell>⏰</TableCell>
                  <TableCell>Se está preparando el material</TableCell>
                  <TableCell>Cuando empiezas a prepararlo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Preparat" size="small" color="info" /></TableCell>
                  <TableCell>✅</TableCell>
                  <TableCell>Material listo para entregar</TableCell>
                  <TableCell>Cuando está empaquetado y listo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Assignat" size="small" color="secondary" /></TableCell>
                  <TableCell>🚚</TableCell>
                  <TableCell>Asignado a un intermediario</TableCell>
                  <TableCell>Cuando se planifica entrega con intermediario</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="Lliurat" size="small" color="success" /></TableCell>
                  <TableCell>📦</TableCell>
                  <TableCell>Entregado al solicitante</TableCell>
                  <TableCell>Cuando el destinatario lo ha recibido</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ),
    },
    {
      id: 'solicitudes',
      title: 'Sección Solicitudes - Gestión de Pedidos',
      icon: <AdminPanelSettings color="primary" />,
      category: 'admin',
      keywords: ['solicitudes', 'pedidos', 'tabla', 'filtrar', 'buscar', 'actualizar', 'eliminar', 'sincronizar'],
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            La pestaña <strong>"Sol·licituds"</strong> es para gestionar el estado de todas las solicitudes.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Funciones Principales
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    📊 Visualizar solicitudes
                  </Typography>
                  <Typography variant="body2">
                    Tabla completa con fecha, monitor, escuela, actividad, material, cantidad, estado
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    🔍 Buscar y Filtrar
                  </Typography>
                  <Typography variant="body2">
                    Búsqueda rápida, filtros por columnas, ordenación, exportar a CSV/Excel
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    ✏️ Cambiar Estados
                  </Typography>
                  <Typography variant="body2">
                    Selecciona pedidos → Elige nuevo estado → Actualizar (cambios masivos)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    🔄 Sincronizar
                  </Typography>
                  <Typography variant="body2">
                    Importa nuevas solicitudes del formulario de Google en tiempo real
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <strong>Alertas automáticas:</strong> El sistema te avisará de pedidos estancados (más de 5 días sin cambio de estado)
          </Alert>
        </Box>
      ),
    },
    {
      id: 'entregas',
      title: 'Sección Entregas - Planificar Lliuraments',
      icon: <LocalShipping color="success" />,
      category: 'delivery',
      keywords: ['entregas', 'lliuraments', 'planificar', 'intermediario', 'directa', 'ruta', 'optimizar'],
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            La pestaña <strong>"Lliuraments"</strong> es para planificar y asignar entregas de materiales preparados.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Flujo de Trabajo (6 pasos)
          </Typography>

          <List>
            {[
              { num: 1, text: 'Visualizar comandes preparadas', desc: 'Aparecen automáticamente las de estado "Preparat"' },
              { num: 2, text: 'Seleccionar comandes', desc: 'Marca las que quieres entregar juntas' },
              { num: 3, text: 'Planificar lliurament', desc: 'Click en "Planificar Lliurament"' },
              { num: 4, text: 'Analizar opciones', desc: 'El sistema muestra opciones optimizadas' },
              { num: 5, text: 'Configurar entrega', desc: 'Elige modalidad, monitor y fecha' },
              { num: 6, text: 'Confirmar', desc: 'Se actualiza estado y envía notificaciones' },
            ].map((step) => (
              <ListItem key={step.num}>
                <ListItemIcon>
                  <Chip label={step.num} size="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={step.text}
                  secondary={step.desc}
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Tipos de Entrega
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, bgcolor: '#f8fff8', border: '1px solid #4caf50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="success" />
                <Typography variant="subtitle1"><strong>Lliurament Optimitzat</strong></Typography>
                <Chip label="★★★ Máxima" size="small" color="success" />
              </Box>
              <Typography variant="body2">
                Usa monitor intermediario que ya va a la zona. <strong>Más eficiente.</strong>
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, bgcolor: '#fff8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Route color="warning" />
                <Typography variant="subtitle1"><strong>Ruta Multicentre</strong></Typography>
                <Chip label="★★☆ Alta" size="small" color="warning" />
              </Box>
              <Typography variant="body2">
                Combina múltiples entregas en una ruta.
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DirectionsCar />
                <Typography variant="subtitle1"><strong>Lliurament Directe</strong></Typography>
                <Chip label="★☆☆ Media" size="small" />
              </Box>
              <Typography variant="body2">
                Entrega directa desde Eixos Creativa. Para urgencias.
              </Typography>
            </Paper>
          </Stack>
        </Box>
      ),
    },
    {
      id: 'intermediarios',
      title: 'Gestión de Intermediarios',
      icon: <Groups color="primary" />,
      category: 'delivery',
      keywords: ['intermediario', 'monitor', 'asignar', 'eliminar', 'optimizar', 'ruta'],
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            ¿Qué es un Intermediario?
          </Typography>
          <Typography variant="body1" paragraph>
            Un <strong>monitor intermediario</strong> es alguien que ya va regularmente de una escuela a otra 
            y puede recoger material para llevarlo al solicitante.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            ¿Por qué usar intermediarios?
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Alert severity="success" icon={<CheckCircle />}>
                <strong>Optimiza recursos</strong><br />
                Aprovecha desplazamientos que ya se hacen
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Alert severity="success" icon={<CheckCircle />}>
                <strong>Ahorra tiempo</strong><br />
                Evita viajes directos innecesarios
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Alert severity="success" icon={<CheckCircle />}>
                <strong>Reduce costes</strong><br />
                Menos desplazamientos desde Eixos
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Alert severity="success" icon={<CheckCircle />}>
                <strong>Más ecológico</strong><br />
                Menos kilómetros en total
              </Alert>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Cómo Asignar un Intermediario
          </Typography>
          <List dense>
            <ListItem><ListItemText primary="1. Ve a la sección 'Lliuraments'" /></ListItem>
            <ListItem><ListItemText primary="2. Selecciona las comandes preparadas" /></ListItem>
            <ListItem><ListItemText primary="3. Haz clic en 'Planificar Lliurament'" /></ListItem>
            <ListItem><ListItemText primary="4. El sistema mostrará monitores disponibles" /></ListItem>
            <ListItem><ListItemText primary="5. Selecciona 'Modalitat Intermediari'" /></ListItem>
            <ListItem><ListItemText primary="6. Elige el monitor y confirma" /></ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Cómo Eliminar un Intermediario
          </Typography>
          <List dense>
            <ListItem><ListItemText primary="1. Ve a 'Sol·licituds' (Sección 1)" /></ListItem>
            <ListItem><ListItemText primary="2. Selecciona los pedidos con intermediario asignado" /></ListItem>
            <ListItem><ListItemText primary="3. Haz clic en 'Eliminar Intermediari'" /></ListItem>
            <ListItem><ListItemText primary="4. El estado vuelve a 'Preparat'" /></ListItem>
          </List>
        </Box>
      ),
    },
    {
      id: 'notificaciones',
      title: 'Sistema de Notificaciones',
      icon: <Notifications color="warning" />,
      category: 'notifications',
      keywords: ['notificaciones', 'avisos', 'google chat', 'enviar', 'intermediario', 'destinatario'],
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            El sistema puede enviar avisos a través de <strong>Google Chat</strong> a los monitores cuando se les asigna material.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Tipos de Notificaciones
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🔔 <strong>Notificación al Intermediario</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Cuándo:</strong> Cuando se asigna un pedido con modalidad "Intermediario"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Contenido:</strong> Material a recoger, dónde y cuándo, a quién entregarlo
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  📨 <strong>Notificación al Destinatario</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  <strong>Cuándo:</strong> Cuando se asigna un pedido (con o sin intermediario)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Contenido:</strong> Material asignado, quién lo entregará, dónde y cuándo
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Cómo Usar las Notificaciones
          </Typography>

          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <strong>Notificaciones Automáticas:</strong> Se envían automáticamente al "Confirmar Lliurament" 
            en la sección Entregas. No requiere acción adicional.
          </Alert>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Notificaciones Manuales:</strong> Activa el "Sistema Manual" en la sección Solicitudes 
            para enviar notificaciones personalizadas. Aparecerán columnas "Notif. Intermediari" y "Notif. Destinatari".
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Estados de Notificaciones
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="⏳ Pendent"
                secondary="No se ha enviado aún"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="📤 Enviar"
                secondary="Botón para enviar la notificación"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Enviat ✅"
                secondary="Ya se envió correctamente"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="✅ Confirmat"
                secondary="El pedido ya se completó"
              />
            </ListItem>
          </List>
        </Box>
      ),
    },
    {
      id: 'ejemplos',
      title: 'Ejemplos Prácticos',
      icon: <Lightbulb color="warning" />,
      category: 'admin',
      keywords: ['ejemplo', 'caso', 'uso', 'práctico', 'real', 'flujo'],
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Ejemplo 1: Entrega Optimizada con Intermediario
          </Typography>
          <Card sx={{ mb: 3, bgcolor: '#f8fff8' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <strong>Situación:</strong> María de "EI Montblanc" necesita sobres para el viernes
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="María solicita sobres desde App Móvil (miércoles)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin marca como 'Preparat' (jueves mañana)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin planifica: Joan va a EI Montblanc los viernes" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin asigna a Joan como intermediario" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Sistema envía notificaciones a Joan y María" />
                </ListItem>
              </List>
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Resultado:</strong> ✅ Ahorro de un viaje directo, material entregado a tiempo
              </Alert>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>
            Ejemplo 2: Entrega Directa Urgente
          </Typography>
          <Card sx={{ mb: 3, bgcolor: '#fff8f0' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <strong>Situación:</strong> Pere necesita material urgente para mañana
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Pere solicita desde App Móvil (urgente)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin marca como 'Preparat'" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Sistema muestra solo 'Lliurament Directe' (no hay intermediarios)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin selecciona 'Modalitat Directa' y fecha: mañana" />
                </ListItem>
              </List>
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Resultado:</strong> ✅ Material entregado urgentemente de forma directa
              </Alert>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>
            Ejemplo 3: Múltiples Comandes, Una Ruta
          </Typography>
          <Card sx={{ bgcolor: '#f0f8ff' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                <strong>Situación:</strong> 3 escuelas de la misma zona piden material
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Admin marca 3 comandes como 'Preparat'" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Selecciona las 3 comandes en 'Lliuraments'" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Sistema muestra 'Ruta Multicentre - Eficiencia Alta'" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ArrowForward fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Asigna intermediario que cubre las 3 escuelas" />
                </ListItem>
              </List>
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Resultado:</strong> ✅ 3 entregas en un solo viaje, máxima eficiencia
              </Alert>
            </CardContent>
          </Card>
        </Box>
      ),
    },
    {
      id: 'faq',
      title: 'Preguntas Frecuentes',
      icon: <Help color="info" />,
      category: 'faq',
      keywords: ['pregunta', 'faq', 'duda', 'ayuda', 'cómo', 'qué', 'cuándo', 'problema'],
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Para Monitores (App Móvil)
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Puedo pedir varios materiales a la vez?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Sí, usa el carrito. Añade cada material con su cantidad y luego envía todo junto.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Puedo modificar una solicitud enviada?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                No directamente desde la app. Contacta con el administrador para modificaciones.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Cómo sé si mi pedido está listo?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Si el sistema de notificaciones está activo, recibirás un aviso en Google Chat. 
                También puedes consultar con el administrador.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Para Administradores
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Cuándo usar intermediarios vs. entrega directa?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Usa intermediarios cuando:
              </Typography>
              <List dense>
                <ListItem>• Hay un monitor que va regularmente a la escuela destino</ListItem>
                <ListItem>• La fecha de necesidad permite planificación (no es urgente)</ListItem>
                <ListItem>• El sistema lo recomienda (eficiencia alta/máxima)</ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Cómo sé qué intermediario elegir si hay varios?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                El sistema los ordena por eficiencia. Elige el primero (marcado como "RECOMANAT") o verifica:
              </Typography>
              <List dense>
                <ListItem>• Días que va (debe coincidir con tus fechas)</ListItem>
                <ListItem>• Distancia desde Eixos</ListItem>
                <ListItem>• Número de comandes que puede llevar</ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Puedo cambiar el intermediario después de asignar?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Sí, usa "Eliminar Intermediari" en la sección Solicitudes, y luego vuelve a planificar en Entregas.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>¿Cómo exporto los datos?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Usa el botón de exportación en la toolbar de la tabla (esquina superior derecha). 
                Puedes exportar a CSV o Excel.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Solución de Problemas',
      icon: <Warning color="error" />,
      category: 'troubleshooting',
      keywords: ['problema', 'error', 'no funciona', 'ayuda', 'solución', 'arreglar'],
      content: (
        <Box>
          <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
            <strong>Problemas comunes y sus soluciones</strong>
          </Alert>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography><strong>No aparecen comandes en "Lliuraments"</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info">
                <strong>Solución:</strong> Verifica que las comandes estén en estado "Preparat". 
                Solo las preparadas aparecen en esta sección.
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography><strong>No hay monitores disponibles para intermediario</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info">
                <strong>Posibles causas:</strong>
                <List dense>
                  <ListItem>• Ningún monitor va a esa escuela</ListItem>
                  <ListItem>• Las fechas no coinciden con los días que van los monitores</ListItem>
                </List>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  <strong>Solución:</strong> Usa "Lliurament Directe" en su lugar.
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography><strong>Las notificaciones no se envían</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info">
                <strong>Verifica:</strong>
                <List dense>
                  <ListItem>• Sistema de notificaciones configurado (Google Chat)</ListItem>
                  <ListItem>• Monitores en los espacios de Chat correctos</ListItem>
                  <ListItem>• Prueba con notificaciones manuales desde "Sol·licituds"</ListItem>
                </List>
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography><strong>La fecha de entrega da error</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info">
                <strong>Causas comunes:</strong>
                <List dense>
                  <ListItem>• No puedes seleccionar domingos (sin actividades)</ListItem>
                  <ListItem>• La fecha debe ser futura</ListItem>
                  <ListItem>• Si es posterior a fecha de necesidad, aparecerá aviso (pero puedes continuar)</ListItem>
                </List>
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography><strong>No puedo seleccionar múltiples pedidos</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info">
                <strong>Solución:</strong> Usa los checkboxes a la izquierda de cada fila. 
                Si no aparecen, recarga la página (F5).
              </Alert>
            </AccordionDetails>
          </Accordion>
        </Box>
      ),
    },
    {
      id: 'workflow',
      title: 'Flujo de Trabajo Recomendado',
      icon: <TrendingUp color="success" />,
      category: 'admin',
      keywords: ['flujo', 'workflow', 'proceso', 'paso a paso', 'recomendado', 'mejor práctica'],
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Sigue este flujo para maximizar la eficiencia del sistema:
          </Typography>

          <Stack spacing={2}>
            <Card variant="outlined" sx={{ bgcolor: '#f0f8ff' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="1" size="small" color="primary" />
                  <Typography variant="subtitle1"><strong>Sincroniza al empezar el día</strong></Typography>
                </Box>
                <Typography variant="body2">
                  Haz clic en "Sincronitzar Respostes" para importar nuevas solicitudes del formulario de Google.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#fff8f0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="2" size="small" color="warning" />
                  <Typography variant="subtitle1"><strong>Marca "En procés"</strong></Typography>
                </Box>
                <Typography variant="body2">
                  Selecciona los pedidos que vas a preparar hoy y cambia su estado a "En procés".
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f0f8ff' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="3" size="small" color="info" />
                  <Typography variant="subtitle1"><strong>Cambia a "Preparat"</strong></Typography>
                </Box>
                <Typography variant="body2">
                  Cuando el material esté empaquetado y listo, actualiza el estado a "Preparat".
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f8fff8' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="4" size="small" color="success" />
                  <Typography variant="subtitle1"><strong>Ve a Lliuraments</strong></Typography>
                </Box>
                <Typography variant="body2">
                  Cambia a la pestaña "Lliuraments" para planificar las entregas.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f0f8ff' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="5" size="small" color="primary" />
                  <Typography variant="subtitle1"><strong>Usa intermediarios</strong></Typography>
                </Box>
                <Typography variant="body2">
                  Siempre que sea posible, usa intermediarios para optimizar recursos.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#fff8f0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="6" size="small" color="warning" />
                  <Typography variant="subtitle1"><strong>Confirma con fecha</strong></Typography>
                </Box>
                <Typography variant="body2">
                  Asigna una fecha de entrega prevista precisa para mejor coordinación.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f8fff8' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label="7" size="small" color="success" />
                  <Typography variant="subtitle1"><strong>Notificaciones automáticas</strong></Typography>
                </Box>
                <Typography variant="body2">
                  El sistema enviará notificaciones automáticamente al confirmar. No requiere acción adicional.
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          <Alert severity="success" icon={<Star />} sx={{ mt: 3 }}>
            <strong>Consejo Pro:</strong> Agrupa pedidos de la misma escuela o zona para optimizar rutas y ahorrar tiempo.
          </Alert>
        </Box>
      ),
    },
  ];

  // Filter sections based on search term
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return helpSections;

    const term = searchTerm.toLowerCase();
    return helpSections.filter(section => 
      section.title.toLowerCase().includes(term) ||
      section.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  }, [searchTerm]);

  // Auto-expand filtered sections
  React.useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedPanels(filteredSections.map(s => s.id));
    } else {
      setExpandedPanels(['intro']);
    }
  }, [searchTerm, filteredSections]);

  const handlePanelChange = (panelId: string) => {
    setExpandedPanels(prev => 
      prev.includes(panelId) 
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };

  const categoryLabels = {
    mobile: 'App Móvil',
    admin: 'Administración',
    delivery: 'Entregas',
    notifications: 'Notificaciones',
    troubleshooting: 'Problemas',
    faq: 'Preguntas',
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          📚 Guía de Uso - ActiviComandes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Todo lo que necesitas saber para usar el sistema de forma eficiente
        </Typography>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Busca tus dudas aquí... (ej: 'intermediario', 'notificaciones', 'cómo cambiar estado')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'primary.main',
                },
                '&:hover fieldset': {
                  borderColor: 'primary.dark',
                },
              },
            }}
          />
          {searchTerm && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {filteredSections.length} resultado{filteredSections.length !== 1 ? 's' : ''} encontrado{filteredSections.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Buttons */}
      {!searchTerm && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Acceso Rápido
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {Object.entries(categoryLabels).map(([cat, label]) => {
              const count = helpSections.filter(s => s.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const firstSection = helpSections.find(s => s.category === cat);
                    if (firstSection) {
                      const element = document.getElementById(`section-${firstSection.id}`);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  sx={{ mb: 1 }}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Help Sections */}
      {filteredSections.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No se encontraron resultados para "{searchTerm}". Intenta con otros términos como "intermediario", "notificaciones", o "estado".
        </Alert>
      ) : (
        <Box>
          {filteredSections.map((section) => (
            <Accordion
              key={section.id}
              id={`section-${section.id}`}
              expanded={expandedPanels.includes(section.id)}
              onChange={() => handlePanelChange(section.id)}
              sx={{
                mb: 2,
                '&:before': { display: 'none' },
                boxShadow: 2,
                '&.Mui-expanded': {
                  boxShadow: 4,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  bgcolor: expandedPanels.includes(section.id) ? 'primary.light' : 'grey.50',
                  '&:hover': { bgcolor: 'primary.light' },
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 2,
                  },
                }}
              >
                {section.icon}
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {section.title}
                </Typography>
                <Chip 
                  label={categoryLabels[section.category]} 
                  size="small" 
                  sx={{ ml: 'auto' }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                {section.content}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>ActiviComandes</strong> - Sistema de Gestión de Materiales Educativos
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Versión 2.0 • Última actualización: Octubre 2025
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          📧 ¿Necesitas ayuda adicional? Contacta con el administrador del sistema
        </Typography>
      </Box>
    </Box>
  );
}

