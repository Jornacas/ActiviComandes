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
  'Pendiente': 'default',
  'En proceso': 'warning',
  'Preparado': 'info',
  'Entregado': 'success',
  '': 'default',
} as const;

const statusIcons = {
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
      field: 'nombre',
      headerName: 'Monitor',
      width: 200,
      editable: false,
    },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 150,
    },
    {
      field: 'escuela',
      headerName: 'Escuela',
      width: 200,
    },
    {
      field: 'material',
      headerName: 'Material',
      width: 200,
      valueFormatter: (params) => formatSentenceCase(params.value as string),
    },
    {
      field: 'unidades',
      headerName: 'Unidades',
      width: 100,
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 150,
      renderCell: (params) => {
        const normalized = formatSentenceCase(params.value as string);
        return (
          <Chip
            icon={statusIcons[normalized as keyof typeof statusIcons] || statusIcons['']}
            label={normalized || 'Pendiente'}
            color={statusColors[normalized as keyof typeof statusColors] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'centroEntrega',
      headerName: 'Centro Entrega',
      width: 150,
      valueFormatter: (params) => formatSentenceCase(params.value as string),
    },
    {
      field: 'diaEntrega',
      headerName: 'Día Entrega',
      width: 150,
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
            const key = header.toLowerCase().replace(/\s+/g, '');
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
      } else {
        setError(response.error || 'Error al sincronizar');
      }
    } catch (err) {
      setError('Error al sincronizar respuestas del formulario');
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async () => {
    if (!newStatus || selectedRows.length === 0) return;

    setUpdating(true);
    try {
      // Get UUIDs of selected orders
      const selectedUuids = selectedRows.map(rowId => {
        const order = orders.find(o => o.id === rowId);
        return order?.uuid || '';
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
      <Typography variant="h4" component="h1" gutterBottom>
        Comanda de Materiales
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Estadísticas
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip label={`Total: ${stats.total}`} />
              <Chip label={`Pendientes: ${stats.pendientes}`} color="default" />
              <Chip label={`En Proceso: ${stats.enProceso}`} color="warning" />
              <Chip label={`Preparados: ${stats.preparados}`} color="info" />
              <Chip label={`Entregados: ${stats.entregados}`} color="success" />
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
          Sincronizar Formulario
        </Button>

        <Button
          variant="outlined"
          startIcon={<Update />}
          onClick={updateDelivery}
          disabled={updating}
        >
          Actualizar Entregas
        </Button>

        {selectedRows.length > 0 && (
          <>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Nuevo Estado</InputLabel>
              <Select
                value={newStatus}
                label="Nuevo Estado"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="En proceso">En proceso</MenuItem>
                <MenuItem value="Preparado">Preparado</MenuItem>
                <MenuItem value="Entregado">Entregado</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={updateStatus}
              disabled={!newStatus || updating}
            >
              Actualizar ({selectedRows.length})
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