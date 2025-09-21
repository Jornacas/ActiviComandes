'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  LocalShipping,
  Person,
  School,
  CheckCircle,
  AccessTime,
  DirectionsCar,
} from '@mui/icons-material';

// Types
interface PreparatedOrder {
  idPedido: string;
  idItem: string;
  solicitant: string;
  escola: string;
  dataNecessitat: string;
  material: string;
  quantitat: number;
  rowIndex: number;
}

interface DeliveryOption {
  escola: string;
  comandes: PreparatedOrder[];
  monitorsDisponibles: Array<{
    nom: string;
    escola: string;
    dies: string[];
    adreça: string;
  }>;
  adreça: string;
  opcions: {
    directa: boolean;
    intermediari: boolean;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

export default function DeliveryManager() {
  const [preparatedOrders, setPreparatedOrders] = useState<PreparatedOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedModalitat, setSelectedModalitat] = useState<'Directa' | 'Intermediari'>('Directa');
  const [selectedMonitor, setSelectedMonitor] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');

  // Fetch preparated orders on component mount
  useEffect(() => {
    fetchPreparatedOrders();
  }, []);

  const fetchPreparatedOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}?action=getPreparatedOrders&token=${API_TOKEN}`);
      const result = await response.json();

      if (result.success) {
        setPreparatedOrders(result.data || []);
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

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(preparatedOrders.map(order => order.idItem));
    } else {
      setSelectedOrders([]);
    }
  };

  const getDeliveryOptionsForSelected = async () => {
    if (selectedOrders.length === 0) {
      setError('Selecciona almenys una comanda');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedOrdersData = preparatedOrders.filter(order =>
        selectedOrders.includes(order.idItem)
      );

      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'getDeliveryOptions');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('orders', JSON.stringify(selectedOrdersData));

      const response = await fetch(url.toString());
      const result = await response.json();

      if (result.success) {
        setDeliveryOptions(result.data || []);
        setDeliveryDialogOpen(true);
      } else {
        setError(result.error || 'Error obtenint opcions d\'entrega');
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
      setError('Selecciona la modalitat d\'entrega');
      return;
    }

    if (selectedModalitat === 'Intermediari' && !selectedMonitor) {
      setError('Selecciona un monitor intermediari');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deliveryData = {
        orderIds: selectedOrders,
        modalitat: selectedModalitat,
        monitorIntermediaria: selectedModalitat === 'Intermediari' ? selectedMonitor : '',
        dataEntrega: dataEntrega
      };

      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'createDelivery');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('deliveryData', JSON.stringify(deliveryData));

      const response = await fetch(url.toString());
      const result = await response.json();

      if (result.success) {
        setSuccess(result.message || 'Entrega assignada correctament');
        setDeliveryDialogOpen(false);
        setSelectedOrders([]);
        setSelectedModalitat('Directa');
        setSelectedMonitor('');
        setDataEntrega('');
        fetchPreparatedOrders(); // Refresh the list
      } else {
        setError(result.error || 'Error creant l\'assignació d\'entrega');
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
              No hi ha comandes preparades per assignar entrega.
            </Typography>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Checkbox
                    checked={selectedOrders.length === preparatedOrders.length}
                    indeterminate={selectedOrders.length > 0 && selectedOrders.length < preparatedOrders.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <Typography variant="body2">
                    Seleccionar totes ({selectedOrders.length} seleccionades)
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={getDeliveryOptionsForSelected}
                    disabled={selectedOrders.length === 0 || loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DirectionsCar />}
                  >
                    Planificar Entrega
                  </Button>
                </Stack>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">Sel.</TableCell>
                      <TableCell>Sol·licitant</TableCell>
                      <TableCell>Escola</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell>Quantitat</TableCell>
                      <TableCell>Data Necessitat</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preparatedOrders.map((order) => (
                      <TableRow key={order.idItem}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedOrders.includes(order.idItem)}
                            onChange={(e) => handleOrderSelection(order.idItem, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>{order.solicitant}</TableCell>
                        <TableCell>{order.escola}</TableCell>
                        <TableCell>{order.material}</TableCell>
                        <TableCell>{order.quantitat}</TableCell>
                        <TableCell>{formatDate(order.dataNecessitat)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog for delivery options */}
      <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping />
            Opcions d'Entrega
          </Typography>
        </DialogTitle>
        <DialogContent>
          {deliveryOptions.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Resum de comandes seleccionades:
              </Typography>

              {deliveryOptions.map((option, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School />
                      {option.escola}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {option.comandes.length} comandes • {option.adreça}
                    </Typography>

                    <List dense>
                      {option.comandes.map((comanda) => (
                        <ListItem key={comanda.idItem}>
                          <ListItemText
                            primary={`${comanda.material} (${comanda.quantitat})`}
                            secondary={`${comanda.solicitant} • ${formatDate(comanda.dataNecessitat)}`}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {option.monitorsDisponibles.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Monitors disponibles:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {option.monitorsDisponibles.map((monitor, idx) => (
                            <Chip
                              key={idx}
                              icon={<Person />}
                              label={`${monitor.nom} (${monitor.dies.join(', ')})`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Configuració de l'entrega:
              </Typography>

              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Modalitat d'entrega</InputLabel>
                  <Select
                    value={selectedModalitat}
                    label="Modalitat d'entrega"
                    onChange={(e) => setSelectedModalitat(e.target.value as 'Directa' | 'Intermediari')}
                  >
                    <MenuItem value="Directa">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DirectionsCar />
                        Entrega Directa
                      </Box>
                    </MenuItem>
                    <MenuItem value="Intermediari" disabled={getAvailableMonitors().length === 0}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person />
                        Entrega amb Intermediari
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

                <TextField
                  fullWidth
                  type="date"
                  label="Data d'entrega prevista"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
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
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            Confirmar Entrega
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}