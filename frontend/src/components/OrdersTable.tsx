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
  CheckCircle,
  Pending,
  LocalShipping,
  HourglassEmpty,
  Delete,
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
  'Assignat': 'secondary',
  'Entregat': 'success',
  'Pendiente': 'default',
  'En proceso': 'warning',
  'Preparado': 'info',
  'Asignado': 'secondary',
  'Entregado': 'success',
  '': 'default',
} as const;

const statusIcons = {
  'Pendent': <Pending />,
  'En proces': <HourglassEmpty />,
  'Preparat': <CheckCircle />,
  'Assignat': <LocalShipping />,
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
  const [deleting, setDeleting] = useState(false);

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
      headerName: 'Quan ho necessito?',
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
      field: 'comentarisGenerals',
      headerName: 'Comentaris',
      width: 200,
      renderCell: (params) => {
        const comentaris = params.value as string;
        if (!comentaris || comentaris.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>Sense comentaris</span>;
        }
        return (
          <div 
            style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}
            title={comentaris}
          >
            {comentaris}
          </div>
        );
      },
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
            // Convert header to camelCase (handle both styles: "Data_Necessitat" and "dataNecessitat")
            let key = header.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
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

  const loadDataFast = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.loadDataFast();

      if (response.success && response.data) {
        const { headers, rows, estadisticas } = response.data;

        // Transform raw data to Order objects (same as loadData)
        const transformedOrders = rows.map((row, index) => {
          const order: any = { id: index };
          headers.forEach((header, headerIndex) => {
            // Convert header to camelCase (handle both styles: "Data_Necessitat" and "dataNecessitat")
            let key = header.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
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
      console.error('Load data fast error:', err);
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

  const deleteSelectedOrders = async () => {
    if (selectedRows.length === 0) return;

    const confirmed = window.confirm(`Estàs segur que vols eliminar ${selectedRows.length} sol·licitud${selectedRows.length > 1 ? 's' : ''}? Aquesta acció no es pot desfer.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      // Get UUIDs of selected orders
      const selectedUuids = selectedRows.map(rowId => {
        const order = orders.find(o => o.id === rowId);
        return order?.idPedido || order?.idItem || order?.uuid || '';
      }).filter(uuid => uuid);

      const response = await apiClient.deleteOrders(selectedUuids);
      if (response.success) {
        // Use fast reload for better performance after deletion
        try {
          await loadDataFast();
        } catch (fastError) {
          // Fallback to full reload if fast reload fails
          console.warn('Fast reload failed, falling back to full reload:', fastError);
          await loadData();
        }
        setSelectedRows([]);
        setError(null);
      } else {
        setError(response.error || 'Error al eliminar sol·licituds');
      }
    } catch (err) {
      setError('Error al eliminar sol·licituds');
    } finally {
      setDeleting(false);
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


        {selectedRows.length > 0 && (
          <>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Nou Estat</InputLabel>
              <Select
                value={newStatus}
                label="Nou Estat"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="Pendent">Pendent</MenuItem>
                <MenuItem value="En proces">En procés</MenuItem>
                <MenuItem value="Preparat">Preparat</MenuItem>
                <MenuItem value="Assignat">Assignat</MenuItem>
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

            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={deleteSelectedOrders}
              disabled={deleting}
            >
              Eliminar ({selectedRows.length})
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