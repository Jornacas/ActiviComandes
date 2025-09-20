'use client';

import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbar,
} from '@mui/x-data-grid';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Stack,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Sync,
  Update,
  CheckCircle,
  Pending,
  LocalShipping,
  HourglassEmpty,
} from '@mui/icons-material';
import { apiClient, type Order, type Stats } from '../lib/api';

const formatSentenceCase = (text: string | null | undefined): string => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length === 0) return '';
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const statusColors = {
  'Pendent': 'default',
  'En proces': 'warning', 
  'Preparat': 'info',
  'Entregat': 'success',
  'Pendiente': 'default',
  'En proceso': 'warning',
  'Preparado': 'info',
  'Entregado': 'success',
  '': 'default',
} as const;

const statusIcons = {
  'Pendent': <Pending />,
  'En proces': <HourglassEmpty />,
  'Preparat': <CheckCircle />,
  'Entregat': <LocalShipping />,
  'Pendiente': <Pending />,
  'En proceso': <HourglassEmpty />,
  'Preparado': <CheckCircle />,
  'Entregado': <LocalShipping />,
  '': <Pending />,
};

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Data Comanda',
      width: 130,
      type: 'dateTime',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString('ca-ES') + ' ' + date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      },
    },
    {
      field: 'nomCognoms',
      headerName: 'Sol·licitant',
      width: 150,
    },
    {
      field: 'dataNecessitat',
      headerName: 'Necessari Per',
      width: 180,
      type: 'date',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString('ca-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        });
      },
    },
    {
      field: 'escola',
      headerName: 'Escola',
      width: 130,
    },
    {
      field: 'activitat',
      headerName: 'Activitat',
      width: 100,
    },
    {
      field: 'material',
      headerName: 'Material',
      width: 200,
      valueFormatter: (params) => formatSentenceCase(params.value as string),
    },
    {
      field: 'esMaterialPersonalitzat',
      headerName: 'Personalitzat',
      width: 100,
      renderCell: (params) => (
        params.value === 'TRUE' ? 
          <Chip label="SÍ" size="small" color="warning" /> : 
          null
      ),
    },
    {
      field: 'unitats',
      headerName: 'Quantitat',
      width: 80,
      type: 'number',
    },
    {
      field: 'estat',
      headerName: 'Estat',
      width: 130,
      renderCell: (params) => {
        const normalized = formatSentenceCase(params.value as string);
        return (
          <Chip
            icon={statusIcons[normalized as keyof typeof statusIcons] || statusIcons['']}
            label={normalized || 'Pendent'}
            color={statusColors[normalized as keyof typeof statusColors] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'responsablePreparacio',
      headerName: 'Responsable',
      width: 120,
      editable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.loadData();

      if (response.success && response.data) {
        const { headers, rows, estadisticas } = response.data;

        // Transform raw data to Order objects
        const transformedOrders = rows.map((row, index) => {
          const order: any = { id: index };
          headers.forEach((header, headerIndex) => {
            // Convert header to camelCase
            let key = header.toLowerCase().replace(/\s+/g, '');
            // Special handling for common field names
            if (key === 'idpedido') key = 'idPedido';
            if (key === 'iditem') key = 'idItem';
            if (key === 'nomcognoms') key = 'nomCognoms';
            if (key === 'datanecessitat') key = 'dataNecessitat';
            if (key === 'esmaterialpersonalitzat') key = 'esMaterialPersonalitzat';
            if (key === 'comentarisgenerals') key = 'comentarisGenerals';
            if (key === 'dataestat') key = 'dataEstat';
            if (key === 'responsablepreparacio') key = 'responsablePreparacio';
            if (key === 'notesinternes') key = 'notesInternes';
            
            order[key] = row[headerIndex] || '';
          });
          return order;
        });

        setOrders(transformedOrders);
        setStats(estadisticas);
      } else {
        setError(response.error || 'Error desconocido al cargar datos');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncFormResponses = async () => {
    setUpdating(true);
    try {
      const response = await apiClient.processFormResponses();
      if (response.success) {
        await loadData(); // Reload data after sync
        setError(null);
        
        // Show success message with details
        if (response.data?.message) {
          console.log('Sincronització:', response.data.message);
        }
        
        // Update stats if provided
        if (response.data?.estadisticas) {
          setStats(response.data.estadisticas);
        }
      } else {
        setError(response.error || 'Error sincronitzant amb la hoja Respostes');
      }
    } catch (err) {
      setError('Error de connexió durant la sincronització');
      console.error('Sync error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async () => {
    if (!newStatus || selectedRows.length === 0) return;

    setUpdating(true);
    try {
      // Get UUIDs of selected orders (use idPedido or idItem)
      const selectedUuids = selectedRows.map(rowId => {
        const order = orders.find(o => o.id === rowId);
        return order?.idPedido || order?.idItem || order?.uuid || '';
      }).filter(uuid => uuid);

      const response = await apiClient.updateOrderStatus(selectedUuids, newStatus);
      if (response.success) {
        await loadData(); // Reload data
        setSelectedRows([]);
        setNewStatus('');
        setError(null);
      } else {
        setError(response.error || 'Error al actualizar estado');
      }
    } catch (err) {
      setError('Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  };

  const updateDelivery = async () => {
    setUpdating(true);
    try {
      const response = await apiClient.updateDeliveryInfo();
      if (response.success) {
        await loadData(); // Reload data
        setError(null);
      } else {
        setError(response.error || 'Error al actualizar entregas');
      }
    } catch (err) {
      setError('Error al actualizar información de entrega');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header con logo y título */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 4, 
        gap: 4,
        borderBottom: '1px solid #e0e0e0',
        pb: 2
      }}>
        <Box sx={{ flexShrink: 0 }}>
          <img
            src="https://www.eixoscreativa.com/wp-content/uploads/2024/01/Eixos-creativa.png.webp"
            alt="Eixos Creativa"
            style={{ 
              height: '60px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" color="primary" sx={{ fontWeight: 600 }}>
            Panell d'Administració - Comandes de Materials
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Gestió i seguiment de sol·licituds
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Estadístiques
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip label={`Total: ${stats.total}`} />
              <Chip label={`Pendents: ${stats.pendientes || stats.pendents || 0}`} color="default" />
              <Chip label={`En Procés: ${stats.enProceso || stats.enProces || 0}`} color="warning" />
              <Chip label={`Preparats: ${stats.preparados || stats.preparats || 0}`} color="info" />
              <Chip label={`Entregats: ${stats.entregados || stats.entregats || 0}`} color="success" />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Sync />}
          onClick={syncFormResponses}
          disabled={updating}
        >
          Sincronitzar Respostes
        </Button>

        <Button
          variant="outlined"
          startIcon={<Update />}
          onClick={updateDelivery}
          disabled={updating}
        >
          Actualitzar Lliuraments
        </Button>

        {selectedRows.length > 0 && (
          <>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Nou Estat</InputLabel>
              <Select
                value={newStatus}
                label="Nou Estat"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="En proces">En procés</MenuItem>
                <MenuItem value="Preparat">Preparat</MenuItem>
                <MenuItem value="Entregat">Entregat</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={updateStatus}
              disabled={!newStatus || updating}
            >
              Actualitzar ({selectedRows.length})
            </Button>
          </>
        )}
      </Stack>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={orders}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={setSelectedRows}
          rowSelectionModel={selectedRows}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          sx={{
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        />
      </Box>
    </Box>
  );
}