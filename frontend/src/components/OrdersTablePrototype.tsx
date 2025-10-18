'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Collapse,
  Divider,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ChevronDown,
  ChevronRight,
  CheckCircle,
  LocalShipping,
  Close,
} from '@mui/icons-material';
import {
  Package,
  Calendar,
  User,
  School,
  FileText,
} from 'lucide-react';

// Datos de ejemplo (simplificados de tu maqueta)
const mockOrders = [
  {
    id: '0710-1',
    date: 'dimarts 14 octubre',
    monitor: 'Leo Argento',
    school: 'Marbella',
    activity: 'CO1A',
    material: 'Folders',
    units: 2,
    comments: 'Folders',
    status: 'lliurat',
    responsible: '-',
    monitorDelivery: '-',
    deliveryDate: '-',
    notes: '-',
  },
  {
    id: '0710-2',
    date: 'dijous 13 octubre',
    monitor: 'Juha Márquez',
    school: 'Lestonnac',
    activity: 'TC2',
    material: 'Ratolí nou per substituir el que no funciona',
    units: 1,
    comments: 'Retirar el ratolí que no funciona',
    status: 'assignat',
    responsible: 'Floorer Bloque',
    monitorDelivery: 'Llistorne',
    deliveryDate: 'dijous 9 de octubre',
    notes: '',
    notifIntermediate: 'Enviar',
    notifDestination: 'Enviar'
  },
  {
    id: '0710-3',
    date: 'dimecres 08 octubre',
    monitor: 'eixos',
    school: 'Ximacs',
    activity: 'TC3',
    material: 'Maseta pel dia de prova amb els portàtils medi-04',
    units: 1,
    comments: 'Dia de prova. 8 medis',
    status: 'preparat',
    responsible: 'Jordi',
    monitorDelivery: '-',
    deliveryDate: 'dimecres 8 de octubre',
    notes: 'Material preparat, pendent assignar lliurament',
  },
];

const statusColors: { [key: string]: string } = {
  'lliurat': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'assignat': 'bg-pink-100 text-pink-700 border-pink-200',
  'preparat': 'bg-blue-100 text-blue-700 border-blue-200',
  'en-proces': 'bg-amber-100 text-amber-700 border-amber-200',
  'pendent': 'bg-slate-100 text-slate-700 border-slate-200'
};

const statusLabels: { [key: string]: string } = {
  'lliurat': '✓ Lliurat',
  'assignat': '◉ Assignat',
  'preparat': '◉ Preparat',
  'en-proces': '◷ En Procés',
  'pendent': '○ Pendent'
};

const statusColorsMUI: { [key: string]: 'success' | 'secondary' | 'info' | 'warning' | 'default' } = {
  'lliurat': 'success',
  'assignat': 'secondary',
  'preparat': 'info',
  'en-proces': 'warning',
  'pendent': 'default'
};

export default function OrdersTablePrototype() {
  const [activeView, setActiveView] = useState('all');
  const [viewMode, setViewMode] = useState<'expanded-row' | 'side-panel'>('expanded-row');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleRow = (id: string) => {
    if (viewMode === 'expanded-row') {
      setExpandedRow(expandedRow === id ? null : id);
    } else {
      const order = mockOrders.find(o => o.id === id);
      setSelectedOrder(order);
      setDrawerOpen(true);
    }
  };

  const stats = {
    total: 52,
    pending: 1,
    inProcess: 9,
    prepared: 11,
    assigned: 15,
    delivered: 16
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'grey.50', minHeight: '100vh', p: 3 }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Selector de Modo de Vista */}
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              🎨 PROTOTIP - Tria el mode de visualització:
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant={viewMode === 'expanded-row' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('expanded-row')}
                size="large"
              >
                📋 Opció Maqueta (Fila Expandible)
              </Button>
              <Button
                variant={viewMode === 'side-panel' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('side-panel')}
                color="secondary"
                size="large"
              >
                📱 Opció Panel Lateral (Sugerència)
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Mode actual: <strong>{viewMode === 'expanded-row' ? 'Fila Expandible' : 'Panel Lateral'}</strong>
            </Typography>
          </CardContent>
        </Card>

        {/* Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Panell d'Administració
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comandas de Materials
                </Typography>
              </Box>
              <Button variant="contained" color="primary">
                + Nova Sol·licitud
              </Button>
            </Box>

            {/* Stats */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Chip label={`Total: ${stats.total}`} />
              <Chip label={`Pendents: ${stats.pending}`} color="error" variant="outlined" />
              <Chip label={`En Procés: ${stats.inProcess}`} color="warning" variant="outlined" />
              <Chip label={`Preparats: ${stats.prepared}`} color="info" variant="outlined" />
              <Chip label={`Assignats: ${stats.assigned}`} color="secondary" variant="outlined" />
              <Chip label={`Lliurats: ${stats.delivered}`} color="success" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Alert severity="info">
            <strong>Sistema de notificacions manual activat</strong> - Pots enviar notificacions manualment des de la taula
          </Alert>
          <Alert severity="warning">
            <strong>⚠️ Avisos de Sol·licituds Estancades</strong> - Hi ha 2 sol·licituds sense canvi d'estat durant més de 5 dies
          </Alert>
        </Stack>

        {/* Tabs */}
        <Card>
          <Tabs value={activeView} onChange={(e, v) => setActiveView(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={`📋 Pendents de Processar (${stats.pending + stats.inProcess})`} value="pending" />
            <Tab label={`🚚 Lliuraments (${stats.prepared + stats.assigned + stats.delivered})`} value="delivery" />
            <Tab label={`📊 Vista Completa (${stats.total})`} value="all" />
          </Tabs>

          {/* Table */}
          <Box>
            {/* Table Header */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr 1.5fr 80px 120px 150px',
              gap: 2,
              p: 2,
              bgcolor: 'grey.100',
              borderBottom: 1,
              borderColor: 'divider',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              color: 'text.secondary'
            }}>
              <Box></Box>
              <Box>Data</Box>
              <Box>Monitor</Box>
              <Box>Material</Box>
              <Box>Unitats</Box>
              <Box>Estat</Box>
              <Box>Accions</Box>
            </Box>

            {/* Table Rows */}
            {mockOrders.map((order) => (
              <React.Fragment key={order.id}>
                {/* Main Row */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 1fr 1.5fr 80px 120px 150px',
                    gap: 2,
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: expandedRow === order.id ? 'blue.50' : 'white',
                    '&:hover': { bgcolor: 'grey.50' },
                    transition: 'background-color 0.2s',
                    cursor: 'pointer',
                    alignItems: 'center'
                  }}
                  onClick={() => toggleRow(order.id)}
                >
                  <IconButton size="small">
                    {(viewMode === 'expanded-row' && expandedRow === order.id) ? <ChevronDown /> : <ChevronRight />}
                  </IconButton>
                  <Typography variant="body2">{order.date}</Typography>
                  <Typography variant="body2" fontWeight="medium">{order.monitor}</Typography>
                  <Typography variant="body2" noWrap>{order.material}</Typography>
                  <Chip label={order.units} size="small" sx={{ width: 40, height: 32 }} />
                  <Chip
                    label={statusLabels[order.status]}
                    size="small"
                    color={statusColorsMUI[order.status]}
                  />
                  <Box>
                    {order.status === 'assignat' ? (
                      <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}>
                        Confirmar
                      </Button>
                    ) : (
                      <Button size="small" variant="outlined">
                        Editar
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Expanded Details - Solo para modo "expanded-row" */}
                {viewMode === 'expanded-row' && (
                  <Collapse in={expandedRow === order.id} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FileText size={20} />
                            Detalls de la Sol·licitud #{order.id}
                          </Typography>

                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, mt: 2 }}>
                            {/* Columna 1: Informació General */}
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                                INFORMACIÓ GENERAL
                              </Typography>
                              <Stack spacing={1.5}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Calendar size={16} style={{ color: '#666', marginTop: 2 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Data Sol·licitud</Typography>
                                    <Typography variant="body2">{order.date}</Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <User size={16} style={{ color: '#666', marginTop: 2 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Monitor</Typography>
                                    <Typography variant="body2">{order.monitor}</Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <School size={16} style={{ color: '#666', marginTop: 2 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Escola</Typography>
                                    <Typography variant="body2">{order.school}</Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Package size={16} style={{ color: '#666', marginTop: 2 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">Activitat</Typography>
                                    <Typography variant="body2">{order.activity}</Typography>
                                  </Box>
                                </Box>
                              </Stack>
                            </Box>

                            {/* Columna 2: Material */}
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                                MATERIAL SOL·LICITAT
                              </Typography>
                              <Stack spacing={1.5}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Descripció</Typography>
                                  <Typography variant="body2">{order.material}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Unitats</Typography>
                                  <Typography variant="body2">{order.units}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Comentaris</Typography>
                                  <Typography variant="body2">{order.comments || '-'}</Typography>
                                </Box>
                              </Stack>
                            </Box>

                            {/* Columna 3: Lliurament */}
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                                LLIURAMENT
                              </Typography>
                              <Stack spacing={1.5}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Responsable</Typography>
                                  <Typography variant="body2">{order.responsible || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Data Lliurament</Typography>
                                  <Typography variant="body2">{order.deliveryDate || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Monitor Lliurament</Typography>
                                  <Typography variant="body2">{order.monitorDelivery || '-'}</Typography>
                                </Box>
                                {order.notifIntermediate && (
                                  <Box sx={{ mt: 1 }}>
                                    <Button size="small" variant="contained" color="primary">
                                      📧 {order.notifIntermediate}
                                    </Button>
                                  </Box>
                                )}
                              </Stack>
                            </Box>
                          </Box>

                          {order.notes && order.notes !== '-' && (
                            <>
                              <Divider sx={{ my: 2 }} />
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                                  📝 NOTES INTERNES
                                </Typography>
                                <Typography variant="body2">{order.notes}</Typography>
                              </Box>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  </Collapse>
                )}
              </React.Fragment>
            ))}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Mostrant 1-3 de {stats.total} sol·licituds
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined">Anterior</Button>
              <Button size="small" variant="outlined">Següent</Button>
            </Stack>
          </Box>
        </Card>

        {/* Side Panel Drawer - Solo para modo "side-panel" */}
        <Drawer
          anchor="right"
          open={drawerOpen && viewMode === 'side-panel'}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: { width: { xs: '100%', sm: 500 } }
          }}
        >
          {selectedOrder && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileText size={24} />
                  Sol·licitud #{selectedOrder.id}
                </Typography>
                <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: 'white' }}>
                  <Close />
                </IconButton>
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                <Stack spacing={3}>
                  {/* Estado */}
                  <Box>
                    <Chip
                      label={statusLabels[selectedOrder.status]}
                      color={statusColorsMUI[selectedOrder.status]}
                      sx={{ fontSize: '1rem', py: 2.5, px: 1 }}
                    />
                  </Box>

                  <Divider />

                  {/* Informació General */}
                  <Box>
                    <Typography variant="overline" fontWeight="bold" color="primary" gutterBottom>
                      📋 Informació General
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Data Sol·licitud"
                          secondary={selectedOrder.date}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Monitor"
                          secondary={selectedOrder.monitor}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Escola"
                          secondary={selectedOrder.school}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Activitat"
                          secondary={selectedOrder.activity}
                        />
                      </ListItem>
                    </List>
                  </Box>

                  <Divider />

                  {/* Material */}
                  <Box>
                    <Typography variant="overline" fontWeight="bold" color="primary" gutterBottom>
                      📦 Material Sol·licitat
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Material"
                          secondary={selectedOrder.material}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Unitats"
                          secondary={selectedOrder.units}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Comentaris"
                          secondary={selectedOrder.comments || '-'}
                        />
                      </ListItem>
                    </List>
                  </Box>

                  <Divider />

                  {/* Lliurament */}
                  <Box>
                    <Typography variant="overline" fontWeight="bold" color="primary" gutterBottom>
                      🚚 Lliurament
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Responsable"
                          secondary={selectedOrder.responsible || '-'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Data Lliurament"
                          secondary={selectedOrder.deliveryDate || '-'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Monitor Lliurament"
                          secondary={selectedOrder.monitorDelivery || '-'}
                        />
                      </ListItem>
                    </List>
                  </Box>

                  {selectedOrder.notes && selectedOrder.notes !== '-' && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="overline" fontWeight="bold" color="primary" gutterBottom>
                          📝 Notes Internes
                        </Typography>
                        <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                          {selectedOrder.notes}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </Box>

              {/* Actions Footer */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Stack spacing={1}>
                  {selectedOrder.status === 'assignat' ? (
                    <Button variant="contained" color="success" fullWidth startIcon={<CheckCircle />}>
                      Confirmar Lliurat
                    </Button>
                  ) : (
                    <Button variant="contained" color="primary" fullWidth>
                      Editar Sol·licitud
                    </Button>
                  )}
                  {selectedOrder.notifIntermediate && (
                    <Button variant="outlined" color="primary" fullWidth>
                      📧 {selectedOrder.notifIntermediate} Notificació
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </Drawer>
      </Box>
    </Box>
  );
}
