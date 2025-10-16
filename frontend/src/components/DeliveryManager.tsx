'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbar,
} from '@mui/x-data-grid';
import {
  LocalShipping,
  Person,
  School,
  CheckCircle,
  AccessTime,
  DirectionsCar,
  TrendingUp,
  Speed,
  Route,
  Star,
  StarHalf,
  StarOutline,
  Place,
  Schedule,
} from '@mui/icons-material';
import { apiClient } from '../lib/api';

// Types
interface PreparatedOrder {
  id: string; // For DataGrid
  idPedido: string;
  idItem: string;
  nomCognoms: string; // Changed from solicitant to match backend
  escola: string;
  dataNecessitat: string;
  material: string;
  unitats: number; // Changed from quantitat to match backend
  dataLliuramentPrevista: string; // Changed from dataLliurament to match backend
  rowIndex: number;
}

interface DeliveryOption {
  tipus: string;
  prioritat: number;
  escola: string;
  escolaDestino?: string;
  comandes: PreparatedOrder[];
  monitorsDisponibles: Array<{
    nom: string;
    escola: string;
    dies: string[];
    adreça: string;
    tipus?: string;
    destinoFinal?: {
      escola: string;
      dies: string[];
    };
    distanciaAcademia?: string;
    activitat?: string;
  }>;
  descripció: string;
  eficiencia: string;
  distanciaAcademia?: string;
  notes?: string;
  adreça?: string;
  opcions?: {
    directa: boolean;
    intermediari: boolean;
  };
  destinatari?: {
    nom: string;
    activitat: string;
  };
  nomCognoms?: string;
  dataNecessitat?: string;
}

export default function DeliveryManager() {
  const [preparatedOrders, setPreparatedOrders] = useState<PreparatedOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<GridRowSelectionModel>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DeliveryOption | null>(null);
  const [selectedMonitors, setSelectedMonitors] = useState<{[key: number]: string}>({});
  const [selectedDates, setSelectedDates] = useState<{[key: number]: string}>({});
  const [dateErrors, setDateErrors] = useState<{[key: number]: string}>({});
  const [dateWarnings, setDateWarnings] = useState<{[key: number]: string}>({});

  // Función para validar que no sea domingo y que esté dentro del plazo de necesidad
  const validateDate = (dateString: string, optionIndex: number, option: DeliveryOption) => {
    if (!dateString) {
      const newErrors = {...dateErrors};
      const newWarnings = {...dateWarnings};
      delete newErrors[optionIndex];
      delete newWarnings[optionIndex];
      setDateErrors(newErrors);
      setDateWarnings(newWarnings);
      return true;
    }

    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.

    // Validar que no sea domingo
    if (dayOfWeek === 0) {
      setDateErrors({...dateErrors, [optionIndex]: 'No es poden programar lliuraments els diumenges (no hi ha activitats)'});
      const newWarnings = {...dateWarnings};
      delete newWarnings[optionIndex];
      setDateWarnings(newWarnings);
      return false;
    }

    // Validar que esté dentro del plazo de necesidad
    let warningMessages: string[] = [];
    let hasOutOfRange = false;

    option.comandes.forEach(order => {
      if (order.dataNecessitat) {
        const needDate = new Date(order.dataNecessitat);

        // Comparar fechas (solo día, sin hora)
        const deliveryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const needDateOnly = new Date(needDate.getFullYear(), needDate.getMonth(), needDate.getDate());

        if (deliveryDate > needDateOnly) {
          hasOutOfRange = true;
          const formatDate = (d: Date) => d.toLocaleDateString('ca-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          });
          warningMessages.push(`${order.material} (necessari: ${formatDate(needDate)})`);
        }
      }
    });

    if (hasOutOfRange) {
      setDateWarnings({...dateWarnings, [optionIndex]: `⚠️ Aviso: La data de lliurament és posterior a la data de necessitat per algunes comandes: ${warningMessages.join(', ')}`});
    } else {
      const newWarnings = {...dateWarnings};
      delete newWarnings[optionIndex];
      setDateWarnings(newWarnings);
    }

    const newErrors = {...dateErrors};
    delete newErrors[optionIndex];
    setDateErrors(newErrors);
    return true;
  };

  // Fetch preparated orders on component mount
  useEffect(() => {
    fetchPreparatedOrders();
  }, []);

  const fetchPreparatedOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.getPreparatedOrders();

      if (result.success) {
        console.log('📋 DEBUG - Preparated orders from backend:', result.data);
        // Add id field for DataGrid
        const ordersWithId = (result.data || []).map((order: any) => ({
          ...order,
          id: order.idItem || order.idPedido, // Use idItem as primary ID
        }));
        setPreparatedOrders(ordersWithId);
      } else {
        setError(result.error || 'Error carregant comandes preparades');
      }
    } catch (err) {
      console.error('Error fetching preparated orders:', err);
      setError('Error de connexió amb el servidor');
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryOptionsForSelected = async () => {
    console.log('🚀 DEBUG - getDeliveryOptionsForSelected CALLED!');
    console.log('🚀 DEBUG - selectedOrders:', selectedOrders);
    console.log('🚀 DEBUG - selectedOrders.length:', selectedOrders.length);

    if (selectedOrders.length === 0) {
      setError('Selecciona almenys una comanda');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedOrdersData = preparatedOrders.filter(order =>
        selectedOrders.includes(order.id)
      );

      console.log('🚀 DEBUG - selectedOrdersData:', selectedOrdersData);

      const result = await apiClient.getDeliveryOptions(selectedOrdersData);
      console.log('🚀 DEBUG - Response data:', result);

      if (result.success) {
        setDeliveryOptions(result.data || []);
        setDeliveryDialogOpen(true);
      } else {
        setError(result.error || 'Error obtenint opcions de lliurament');
      }
    } catch (err) {
      console.error('Error getting delivery options:', err);
      setError('Error de connexió amb el servidor');
    } finally {
      setLoading(false);
    }
  };

  const createDeliveryForOption = async (option: DeliveryOption, optionIndex: number, isDirect: boolean) => {
    const selectedMonitor = selectedMonitors[optionIndex];
    const dataEntrega = selectedDates[optionIndex];

    if (!isDirect && !selectedMonitor) {
      setError('Selecciona un monitor intermediari');
      return;
    }

    // Validar que no sea domingo (los avisos no bloquean el proceso)
    if (dataEntrega && dateErrors[optionIndex]) {
      setError('No es poden programar lliuraments els diumenges');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get order IDs from this option
      const orderIds = option.comandes.map(c => c.id);

      // Buscar la escolaDestino
      let escolaDestino = '';
      if (!isDirect && selectedMonitor) {
        escolaDestino = option.escola || '';
      }

      const deliveryData = {
        orderIds: orderIds,
        modalitat: isDirect ? 'Directa' : 'Intermediari',
        monitorIntermediaria: isDirect ? '' : selectedMonitor,
        escolaDestino: escolaDestino,
        dataEntrega: dataEntrega || ''
      };

      console.log('🚀 FRONTEND DEBUG - Datos a enviar:', deliveryData);

      const result = await apiClient.createDelivery(deliveryData);
      console.log('📥 DEBUG - Backend response:', result);

      if (result.success) {
        setSuccess(result.message || 'Lliurament assignat correctament');

        setDeliveryDialogOpen(false);
        setSelectedOrders([]);
        setSelectedMonitors({});
        setSelectedDates({});
        setDateErrors({});
        setDateWarnings({});
        fetchPreparatedOrders(); // Refresh the list
      } else {
        setError(result.error || 'Error creant l\'assignació de lliurament');
      }
    } catch (err) {
      console.error('Error creating delivery:', err);
      setError('Error de connexió amb el servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // Si es una fecha ISO con Z (UTC), extraer solo la parte de fecha
    if (dateString.includes('T') && dateString.includes('Z')) {
      const dateOnly = dateString.split('T')[0]; // "2025-10-01"
      const [year, month, day] = dateOnly.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
      const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

      return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
    }
    
    // Para fechas normales
    const date = new Date(dateString);
    const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
    const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
  };


  // DataGrid columns definition
  const columns: GridColDef[] = [
    {
      field: 'nomCognoms',
      headerName: 'Sol·licitant',
      width: 150,
      flex: 1,
    },
    {
      field: 'escola',
      headerName: 'Escola',
      width: 120,
      flex: 0.8,
    },
    {
      field: 'material',
      headerName: 'Material',
      width: 200,
      flex: 1.5,
    },
    {
      field: 'unitats',
      headerName: 'Quantitat',
      width: 90,
      type: 'number',
    },
    {
      field: 'dataNecessitat',
      headerName: 'Data Necessitat',
      width: 150,
      flex: 1,
      renderCell: (params) => {
        const date = params.value as string;
        if (!date) return '';
        return <span style={{ fontSize: '0.85rem' }}>{formatDate(date)}</span>;
      },
    },
    {
      field: 'dataLliuramentPrevista',
      headerName: 'Data Lliurament',
      width: 150,
      flex: 1,
      renderCell: (params) => {
        const date = params.value as string;
        if (!date || date.trim() === '') {
          return (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              No assignada
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Schedule fontSize="small" color="primary" />
            <span style={{ fontSize: '0.85rem' }}>{formatDate(date)}</span>
          </Box>
        );
      },
    },
  ];

  if (loading && preparatedOrders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Carregant comandes preparades...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Comandes Preparades ({preparatedOrders.length})
          </Typography>

          {preparatedOrders.length === 0 ? (
            <Typography color="text.secondary">
              No hi ha comandes preparades per assignar lliurament.
            </Typography>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">
                    {selectedOrders.length} seleccionades
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={getDeliveryOptionsForSelected}
                    disabled={selectedOrders.length === 0 || loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DirectionsCar />}
                  >
                    Planificar Lliurament
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ height: 700, width: '100%' }}>
                <DataGrid
                  rows={preparatedOrders}
                  columns={columns}
                  checkboxSelection
                  disableRowSelectionOnClick
                  onRowSelectionModelChange={setSelectedOrders}
                  rowSelectionModel={selectedOrders}
                  density="compact"
                  slots={{
                    toolbar: GridToolbar,
                  }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                    },
                  }}
                  autoHeight={false}
                  disableColumnMenu={false}
                  disableColumnFilter={false}
                  disableColumnSelector={false}
                  disableDensitySelector={false}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  getRowClassName={(params) => {
                    // Si tiene fecha de lliurament asignada -> verde suave
                    if (params.row.dataLliuramentPrevista && params.row.dataLliuramentPrevista.trim() !== '') {
                      return 'row-assigned';
                    }
                    // Si NO tiene fecha -> amarillo suave (pendiente de asignar)
                    return 'row-pending';
                  }}
                  sx={{
                    '& .row-pending': {
                      backgroundColor: '#fff9e6', // Amarillo muy suave
                      '&:hover': {
                        backgroundColor: '#fff3cc',
                      },
                    },
                    '& .row-assigned': {
                      backgroundColor: '#f0f9f4', // Verde muy suave
                      '&:hover': {
                        backgroundColor: '#e6f5ed',
                      },
                    },
                    '& .MuiDataGrid-cell': {
                      fontSize: '0.8rem',
                      padding: '4px 8px',
                    },
                    '& .MuiDataGrid-columnHeader': {
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                    },
                  }}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog for delivery options */}
      <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping />
            Opcions de Lliurament
          </Typography>
        </DialogTitle>
        <DialogContent>
          {deliveryOptions.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
                Opcions de lliurament disponibles - Selecciona l'opció desitjada:
              </Typography>

              {deliveryOptions.map((option, index) => {
                const getEfficiencyDisplay = (eficiencia: string) => {
                  switch (eficiencia) {
                    case 'Màxima':
                      return { icon: <Star sx={{ fontSize: 16 }} />, color: 'success' as const, label: '★★★ Màxima' };
                    case 'Alta':
                      return { icon: <Star sx={{ fontSize: 16 }} />, color: 'info' as const, label: '★★☆ Alta' };
                    case 'Mitjana':
                      return { icon: <StarHalf sx={{ fontSize: 16 }} />, color: 'warning' as const, label: '★☆☆ Mitjana' };
                    case 'Baixa':
                      return { icon: <StarOutline sx={{ fontSize: 16 }} />, color: 'error' as const, label: '☆☆☆ Baixa' };
                    default:
                      return { icon: <StarOutline sx={{ fontSize: 16 }} />, color: 'default' as const, label: '? Desconeguda' };
                  }
                };

                const canDeliverDirect = option.monitorsDisponibles.some(m => m.tipus === 'directa');
                const canDeliverViaIntermediary = option.monitorsDisponibles.some(m => m.tipus !== 'directa');

                return (
                  <Card
                    key={index}
                    sx={{
                      mb: 3,
                      border: option.prioritat === 1 ? '2px solid #4caf50' : '1px solid #e0e0e0',
                      backgroundColor: option.prioritat === 1 ? '#f8fff8' : 'white'
                    }}
                  >
                    <CardContent>
                      {/* Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person color="primary" />
                            <Typography variant="h6">
                              {option.nomCognoms || option.comandes[0]?.nomCognoms}
                            </Typography>
                            {option.prioritat === 1 && (
                              <Chip label="RECOMANAT" size="small" color="success" sx={{ ml: 1 }} />
                            )}
                          </Box>
                          {option.dataNecessitat && (
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                              📅 <strong>Necessari per:</strong> {formatDate(option.dataNecessitat)}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          icon={getEfficiencyDisplay(option.eficiencia).icon}
                          label={getEfficiencyDisplay(option.eficiencia).label}
                          size="small"
                          color={getEfficiencyDisplay(option.eficiencia).color}
                        />
                      </Box>

                      {/* Recipient Activity */}
                      {option.destinatari && (
                        <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#f3e5f5', borderRadius: 1, borderLeft: '4px solid #9c27b0' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7b1fa2' }}>
                            🎭 Activitat: {option.destinatari.activitat}
                          </Typography>
                        </Box>
                      )}

                      {/* Location and Summary */}
                      <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <School color="primary" fontSize="small" />
                            <Typography variant="subtitle2">
                              <strong>{option.escola}</strong>
                              {option.escolaDestino && (
                                <span style={{ color: '#666', fontWeight: 'normal' }}> (intermediària) → <strong>{option.escolaDestino}</strong> (destí final)</span>
                              )}
                            </Typography>
                          </Box>
                          {/* Mostrar días de actividad en la escuela intermediaria */}
                          {option.monitorsDisponibles && option.monitorsDisponibles.length > 0 && option.monitorsDisponibles[0].dies && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Schedule color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                Dies disponibles: {option.monitorsDisponibles[0].dies.join(', ')}
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                            <Chip
                              icon={<LocalShipping />}
                              label={`${option.comandes.length} comanda${option.comandes.length > 1 ? 'es agrupades' : ''}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {option.distanciaAcademia && (
                              <Chip
                                icon={<Route />}
                                label={`${option.distanciaAcademia} des d'Eixos`}
                                size="small"
                                variant="outlined"
                                color="info"
                              />
                            )}
                          </Box>
                        </Stack>
                      </Box>

                      {/* Orders List */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          Materials:
                        </Typography>
                        <List dense sx={{ pt: 0.5 }}>
                          {option.comandes.map((comanda) => (
                            <ListItem key={comanda.idItem} sx={{ py: 0.25, px: 0 }}>
                              <ListItemText
                                primary={`• ${comanda.material} (${comanda.unitats})`}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Delivery Actions */}
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                        Selecciona modalitat de lliurament:
                      </Typography>

                      <Stack spacing={2}>
                        {/* Direct Delivery Option */}
                        {canDeliverDirect && (
                          <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                              <DirectionsCar sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              Lliurament Directe
                            </Typography>

                            <TextField
                              fullWidth
                              type="date"
                              label="Data de lliurament"
                              size="small"
                              value={selectedDates[index] || ''}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setSelectedDates({...selectedDates, [index]: newDate});
                                validateDate(newDate, index, option);
                              }}
                              error={!!dateErrors[index]}
                              helperText={dateErrors[index]}
                              InputLabelProps={{ shrink: true }}
                              sx={{ mb: 1.5 }}
                            />

                            {dateWarnings[index] && (
                              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                                <Typography variant="caption">{dateWarnings[index]}</Typography>
                              </Alert>
                            )}

                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              disabled={loading || !!dateErrors[index]}
                              onClick={() => createDeliveryForOption(option, index, true)}
                              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
                            >
                              Entregar Directament
                            </Button>
                          </Box>
                        )}

                        {/* Intermediary Delivery Option */}
                        {canDeliverViaIntermediary && (
                          <Box sx={{ p: 2, border: '1px solid #4caf50', borderRadius: 1, backgroundColor: '#f1f8f4' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                              <Person sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              Lliurament amb Intermediari
                            </Typography>

                            {/* Mostrar lista de monitores disponibles */}
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                                Monitors intermediaris disponibles:
                              </Typography>
                              <Stack spacing={1}>
                                {option.monitorsDisponibles
                                  .filter(m => m.tipus !== 'directa')
                                  .map((monitor, idx) => (
                                    <Card
                                      key={idx}
                                      sx={{
                                        p: 1.5,
                                        border: selectedMonitors[index] === monitor.nom ? '2px solid #4caf50' : '1px solid #e0e0e0',
                                        backgroundColor: selectedMonitors[index] === monitor.nom ? '#e8f5e9' : 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                          borderColor: '#4caf50',
                                          backgroundColor: '#f1f8f4'
                                        }
                                      }}
                                      onClick={() => setSelectedMonitors({...selectedMonitors, [index]: monitor.nom})}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                            {monitor.nom}
                                            {monitor.activitat && monitor.activitat !== 'N/A' && (
                                              <span style={{ fontWeight: 'normal', color: '#666' }}> - {monitor.activitat}</span>
                                            )}
                                            {selectedMonitors[index] === monitor.nom && (
                                              <Chip label="SELECCIONAT" size="small" color="success" sx={{ ml: 1, height: 18 }} />
                                            )}
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {monitor.dies && monitor.dies.length > 0 && (
                                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                📅 <strong>Dies:</strong> {monitor.dies.join(', ')}
                                              </Typography>
                                            )}
                                            {monitor.escola && (
                                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                🏫 <strong>Escola intermediària:</strong> {monitor.escola}
                                              </Typography>
                                            )}
                                            {monitor.destinoFinal && (
                                              <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                🎯 <strong>Destí final:</strong> {monitor.destinoFinal.escola} ({monitor.destinoFinal.dies?.join(', ')})
                                              </Typography>
                                            )}
                                          </Box>
                                        </Box>
                                        {selectedMonitors[index] === monitor.nom && (
                                          <CheckCircle color="success" sx={{ ml: 1 }} />
                                        )}
                                      </Box>
                                    </Card>
                                  ))}
                              </Stack>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <TextField
                              fullWidth
                              type="date"
                              label="Data de lliurament"
                              size="small"
                              value={selectedDates[index] || ''}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setSelectedDates({...selectedDates, [index]: newDate});
                                validateDate(newDate, index, option);
                              }}
                              error={!!dateErrors[index]}
                              helperText={dateErrors[index]}
                              InputLabelProps={{ shrink: true }}
                              sx={{ mb: 1.5 }}
                            />

                            {dateWarnings[index] && (
                              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                                <Typography variant="caption">{dateWarnings[index]}</Typography>
                              </Alert>
                            )}

                            <Button
                              variant="contained"
                              color="success"
                              fullWidth
                              disabled={loading || !selectedMonitors[index] || !!dateErrors[index]}
                              onClick={() => createDeliveryForOption(option, index, false)}
                              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
                            >
                              Assignar Intermediari
                            </Button>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeliveryDialogOpen(false);
            setSelectedMonitors({});
            setSelectedDates({});
            setDateErrors({});
            setDateWarnings({});
          }}>
            Cancel·lar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}