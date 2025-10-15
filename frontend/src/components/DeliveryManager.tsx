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
  const [selectedModalitat, setSelectedModalitat] = useState<'Directa' | 'Intermediari'>('Directa');
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [dateError, setDateError] = useState('');
  const [dateWarning, setDateWarning] = useState('');

  // Función para validar que no sea domingo y que esté dentro del plazo de necesidad
  const validateDate = (dateString: string) => {
    if (!dateString) {
      setDateError('');
      setDateWarning('');
      return true;
    }

    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.

    // Validar que no sea domingo
    if (dayOfWeek === 0) {
      setDateError('No es poden programar lliuraments els diumenges (no hi ha activitats)');
      setDateWarning('');
      return false;
    }

    // Validar que esté dentro del plazo de necesidad
    const selectedOrdersData = preparatedOrders.filter(order =>
      selectedOrders.includes(order.idItem)
    );

    let warningMessages: string[] = [];
    let hasOutOfRange = false;

    selectedOrdersData.forEach(order => {
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
      setDateWarning(`⚠️ Aviso: La data de lliurament és posterior a la data de necessitat per algunes comandes: ${warningMessages.join(', ')}`);
    } else {
      setDateWarning('');
    }

    setDateError('');
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

  const createDelivery = async () => {
    if (!selectedModalitat) {
              setError('Selecciona la modalitat de lliurament');
      return;
    }

    if (selectedModalitat === 'Intermediari' && !selectedMonitor) {
      setError('Selecciona un monitor intermediari');
      return;
    }

    // Validar que no sea domingo (los avisos no bloquean el proceso)
    if (dataEntrega && !validateDate(dataEntrega)) {
      setError('No es poden programar lliuraments els diumenges');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Buscar la escolaDestino segons la modalitat i monitor seleccionats
      let escolaDestino = '';
      if (selectedModalitat === 'Intermediari' && selectedMonitor) {
        console.log('🔍 DEBUG - deliveryOptions:', deliveryOptions);
        console.log('🔍 DEBUG - selectedMonitor:', selectedMonitor);

        const intermediaryOption = deliveryOptions.find(option =>
          option.tipus.includes('Intermediari') &&
          option.monitorsDisponibles.some(monitor => monitor.nom === selectedMonitor)
        );

        console.log('🔍 DEBUG - intermediaryOption found:', intermediaryOption);
        escolaDestino = intermediaryOption?.escola || '';
        console.log('🔍 DEBUG - escolaDestino calculated:', escolaDestino);
      }

      const deliveryData = {
        orderIds: selectedOrders as string[], // Convert GridRowSelectionModel to string[]
        modalitat: selectedModalitat,
        monitorIntermediaria: selectedModalitat === 'Intermediari' ? selectedMonitor : '',
        escolaDestino: escolaDestino,
        dataEntrega: dataEntrega
      };

      // DEBUG: Log datos que se van a enviar
      console.log('📅 DEBUG - Estado dataEntrega antes de enviar:', dataEntrega);
      console.log('📦 DEBUG - deliveryData object:', deliveryData);
      console.log('🚀 FRONTEND DEBUG - Datos a enviar:', {
        deliveryData,
        selectedModalitat,
        selectedMonitor,
        dataEntrega,
        escolaDestino,
        deliveryOptions: deliveryOptions.length
      });

      const result = await apiClient.createDelivery(deliveryData);
      console.log('📥 DEBUG - Backend response:', result);

      if (result.success) {
        setSuccess(result.message || 'Lliurament assignat correctament');
        
        // Las notificaciones se envían automáticamente desde el backend
        
        setDeliveryDialogOpen(false);
        setSelectedOrders([]);
        setSelectedModalitat('Directa');
        setSelectedMonitor('');
        setDataEntrega('');
        setDateError('');
        setDateWarning('');
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

  const getAvailableMonitors = () => {
    const monitors: Array<{nom: string; escola: string; dies: string[]}> = [];
    deliveryOptions.forEach(option => {
      option.monitorsDisponibles.forEach(monitor => {
        if (!monitors.find(m => m.nom === monitor.nom)) {
          monitors.push(monitor);
        }
      });
    });
    return monitors;
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
              <Typography variant="subtitle1" gutterBottom>
                Resum de comandes seleccionades:
              </Typography>

              {deliveryOptions.map((option, index) => {
                // Definir icones per tipus d'opció
                const getOptionIcon = (tipus: string) => {
                  switch (tipus) {
                    case 'Lliurament Optimitzat': return <TrendingUp color="success" />;
                    case 'Ruta Multicentre': return <Route color="warning" />;
                    case 'Lliurament Directe': return <DirectionsCar color="action" />;
                    default: return <School />;
                  }
                };

                const getEfficiencyDisplay = (eficiencia: string) => {
                  switch (eficiencia) {
                    case 'Màxima':
                      return { 
                        icon: <Star sx={{ fontSize: 16 }} />, 
                        color: 'success' as const, 
                        label: '★★★ Màxima',
                        stars: '★★★'
                      };
                    case 'Alta':
                      return { 
                        icon: <Star sx={{ fontSize: 16 }} />, 
                        color: 'info' as const, 
                        label: '★★☆ Alta',
                        stars: '★★☆'
                      };
                    case 'Mitjana':
                      return { 
                        icon: <StarHalf sx={{ fontSize: 16 }} />, 
                        color: 'warning' as const, 
                        label: '★☆☆ Mitjana',
                        stars: '★☆☆'
                      };
                    case 'Baixa':
                      return { 
                        icon: <StarOutline sx={{ fontSize: 16 }} />, 
                        color: 'error' as const, 
                        label: '☆☆☆ Baixa',
                        stars: '☆☆☆'
                      };
                    default:
                      return { 
                        icon: <StarOutline sx={{ fontSize: 16 }} />, 
                        color: 'default' as const, 
                        label: '? Desconeguda',
                        stars: '?'
                      };
                  }
                };

                return (
                  <Card
                    key={index}
                    sx={{
                      mb: 2,
                      border: option.prioritat === 1 ? '2px solid #4caf50' : 'none',
                      backgroundColor: option.prioritat === 1 ? '#f8fff8' : 'inherit'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getOptionIcon(option.tipus)}
                          {option.tipus}
                          {option.prioritat === 1 && (
                            <Chip
                              label="RECOMANAT"
                              size="small"
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Chip
                          icon={getEfficiencyDisplay(option.eficiencia).icon}
                          label={getEfficiencyDisplay(option.eficiencia).label}
                          size="small"
                          color={getEfficiencyDisplay(option.eficiencia).color}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {option.descripció}
                      </Typography>

                      {option.notes && (
                        <Typography variant="caption" sx={{
                          color: option.prioritat === 1 ? 'success.main' : 'text.secondary',
                          fontWeight: option.prioritat === 1 ? 'bold' : 'normal'
                        }}>
                          💡 {option.notes}
                        </Typography>
                      )}

                      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Place color="primary" fontSize="small" />
                            <Typography variant="subtitle2">
                              <strong>{option.escola}</strong>
                              {option.escolaDestino && (
                                <span style={{ color: '#666' }}> → <strong>{option.escolaDestino}</strong></span>
                              )}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                              icon={<LocalShipping />}
                              label={`${option.comandes.length} comand${option.comandes.length > 1 ? 'es' : 'a'}`}
                              size="small"
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

                      <List dense sx={{ mt: 1 }}>
                        {option.comandes.map((comanda) => (
                          <ListItem key={comanda.idItem} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={`${comanda.material} (${comanda.unitats})`}
                              secondary={`${comanda.nomCognoms} • ${formatDate(comanda.dataNecessitat)}`}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {option.monitorsDisponibles && option.monitorsDisponibles.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Monitors disponibles:
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {option.monitorsDisponibles.map((monitor, idx) => (
                              <Chip
                                key={idx}
                                icon={<Person />}
                                label={`${monitor.nom} (${monitor.dies?.join(', ') || 'N/A'})`}
                                size="small"
                                variant={monitor.tipus === 'directa' ? 'filled' : 'outlined'}
                                color={monitor.tipus === 'intermèdia' ? 'success' : 'default'}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Configuració del lliurament:
              </Typography>

              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Modalitat de lliurament</InputLabel>
                  <Select
                    value={selectedModalitat}
                    label="Modalitat de lliurament"
                    onChange={(e) => setSelectedModalitat(e.target.value as 'Directa' | 'Intermediari')}
                  >
                    <MenuItem value="Directa">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DirectionsCar />
                        Lliurament Directe
                      </Box>
                    </MenuItem>
                    <MenuItem value="Intermediari" disabled={getAvailableMonitors().length === 0}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person />
                        Lliurament amb Intermediari
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {selectedModalitat === 'Intermediari' && (
                  <FormControl fullWidth>
                    <InputLabel>Monitor Intermediari</InputLabel>
                    <Select
                      value={selectedMonitor}
                      label="Monitor Intermediari"
                      onChange={(e) => setSelectedMonitor(e.target.value)}
                    >
                      {getAvailableMonitors().map((monitor, index) => (
                        <MenuItem key={index} value={monitor.nom}>
                          {monitor.nom} - {monitor.escola} ({monitor.dies.join(', ')})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {dateWarning && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    {dateWarning}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  type="date"
                  label="Data de lliurament prevista"
                  value={dataEntrega}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    console.log('📅 DEBUG - Nueva fecha seleccionada:', newDate);
                    setDataEntrega(newDate);
                    validateDate(newDate);
                  }}
                  error={!!dateError}
                  helperText={dateError}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialogOpen(false)}>
            Cancel·lar
          </Button>
          <Button
            onClick={createDelivery}
            variant="contained"
            disabled={loading || !!dateError}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {dateWarning ? 'Confirmar Lliurament (amb avís)' : 'Confirmar Lliurament'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}