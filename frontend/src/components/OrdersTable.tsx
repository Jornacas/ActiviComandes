'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Sync,
  HourglassEmpty,
  Info,
  ExpandMore,
  Inventory2,
  Refresh,
} from '@mui/icons-material';
import { apiClient, API_BASE_URL, API_TOKEN, type Order, type Stats } from '../lib/api';
import { formatSentenceCase, statusColors, statusIcons, formatDateCatalan } from '../utils/orderUtils';
import StatusUpdateBar from './StatusUpdateBar';
import OrderNotesDialog from './OrderNotesDialog';
import NotificationManager, { type NotificationManagerRef } from './NotificationManager';
import OrderDetailsDrawer from './OrderDetailsDrawer';
import MobileOrdersList from './MobileOrdersList';

export default function OrdersTable() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Core data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshingSpaces, setRefreshingSpaces] = useState(false);
  const [staleOrders, setStaleOrders] = useState<Order[]>([]);
  const [staleOrdersExpanded, setStaleOrdersExpanded] = useState(false);
  // Notificaciones siempre activas
  const notificationsEnabled = true;

  // Estado global del responsable de preparació
  const [globalResponsable, setGlobalResponsable] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastResponsablePreparacio');
      return saved || '';
    }
    return '';
  });

  // Shared notification statuses (passed to NotificationManager and other components)
  const [notificationStatuses, setNotificationStatuses] = useState<{[key: string]: {intermediario: boolean, destinatario: boolean}}>({});
  const [loadingNotificationStatuses, setLoadingNotificationStatuses] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any>(null);

  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedOrderForNotes, setSelectedOrderForNotes] = useState<any>(null);

  // Snackbar state for notifications from sub-components
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Ref for NotificationManager
  const notificationManagerRef = useRef<NotificationManagerRef>(null);

  // Guardar el responsable global en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined' && globalResponsable.trim()) {
      localStorage.setItem('lastResponsablePreparacio', globalResponsable);
    }
  }, [globalResponsable]);

  // Escoltar events del copilot per refrescar dades i obrir notificació
  const loadDataRef = useRef<(() => Promise<void>) | null>(null);
  const pendingNotificationOrderIds = useRef<string[] | null>(null);
  useEffect(() => {
    const handleCopilotAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const actions = detail?.actions || [];
      console.log('🤖 Copilot ha modificat dades, refrescant...', actions);

      // Si hi ha assignDelivery, guardar orderIds per obrir notificació després del refresh
      const deliveryAction = actions.find((a: any) => a.tool === 'assignDelivery' && a.success);
      if (deliveryAction?.input?.orderIds) {
        pendingNotificationOrderIds.current = deliveryAction.input.orderIds;
      }

      setTimeout(() => { loadDataRef.current?.(); }, 1000);
    };
    window.addEventListener('copilot-data-changed', handleCopilotAction);
    return () => window.removeEventListener('copilot-data-changed', handleCopilotAction);
  }, []);

  // Función para actualizar las notas internas
  const updateInternalNotes = async (orderId: string, notes: string) => {
    try {
      if (!API_BASE_URL) {
        throw new Error('API_BASE_URL no está configurada');
      }

      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'updateInternalNotes');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('orderId', orderId);
      url.searchParams.append('notes', notes);

      const response = await fetch(url.toString());
      const result = await response.json();

      if (!result.success) {
        console.error('Error actualizando notas:', result.error);
      }
    } catch (error) {
      console.error('Error actualizando notas:', error);
    }
  };

  // Function to detect stale orders (no state change in 5 days)
  const detectStaleOrders = (ordersList: Order[]) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const stale = ordersList.filter(order => {
      if (!order.dataEstat) return true;

      const lastStateChange = new Date(order.dataEstat);
      return lastStateChange < fiveDaysAgo &&
             order.estat !== 'Lliurat' &&
             order.estat !== 'Entregat' &&
             order.estat !== 'Entregado';
    });

    setStaleOrders(stale);
  };

  // Abrir el modal de notas desde el chip de estado
  const handleOpenNotesFromChip = (order: any) => {
    setSelectedOrderForNotes(order);
    setNotesDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrderForDrawer(params.row);
            setDrawerOpen(true);
          }}
          sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
        >
          <Info />
        </IconButton>
      ),
    },
    {
      field: 'timestamp',
      headerName: 'Data',
      width: 70,
      type: 'dateTime',
      valueFormatter: (params) => {
        if (!params.value) return '';

        let date: Date;
        const value = params.value as string;

        if (typeof value === 'string' && value.includes('/')) {
          const parts = value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
          } else {
            date = new Date(value);
          }
        } else {
          date = new Date(value);
        }

        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
      },
    },
    {
      field: 'nomCognoms',
      headerName: 'Monitor',
      width: 100,
      flex: 0.8,
    },
    {
      field: 'dataNecessitat',
      headerName: 'Necessari',
      width: 120,
      flex: 0.9,
      renderCell: (params) => {
        const date = params.value as string;
        if (!date || date.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }

        const formatDataNecessitat = (dateString: string) => {
          if (!dateString) return '';

          if (dateString.includes('T') && dateString.includes('Z')) {
            const dateOnly = dateString.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
            const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

            return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
          }

          if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);

              const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
              const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

              return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
            }
          }

          const dateObj = new Date(dateString);
          if (isNaN(dateObj.getTime())) return dateString;

          const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
          const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

          return `${days[dateObj.getDay()]} ${String(dateObj.getDate()).padStart(2, '0')} ${months[dateObj.getMonth()]}`;
        };

        try {
          const formattedDate = formatDataNecessitat(date);
          return (
            <span style={{ fontSize: '0.85rem' }}>
              {formattedDate}
            </span>
          );
        } catch {
          return <span style={{ fontSize: '0.85rem' }}>{date}</span>;
        }
      },
    },
    {
      field: 'escola',
      headerName: 'Escola',
      width: 100,
      flex: 0.8,
    },
    {
      field: 'activitat',
      headerName: 'Activitat',
      width: 60,
    },
    {
      field: 'material',
      headerName: 'Material',
      width: 200,
      flex: 1.5,
      valueFormatter: (params) => formatSentenceCase(params.value as string),
    },
    {
      field: 'esMaterialPersonalitzat',
      headerName: 'Altres',
      width: 60,
      renderCell: (params) => (
        params.value === 'TRUE' ?
          <Chip label="SÍ" size="small" color="warning" sx={{ fontSize: '0.7rem' }} /> :
          null
      ),
    },
    {
      field: 'unitats',
      headerName: 'Units',
      width: 50,
      type: 'number',
    },
    {
      field: 'comentarisGenerals',
      headerName: 'Comentaris',
      width: 100,
      flex: 0.7,
      renderCell: (params) => {
        const comentaris = params.value as string;
        if (!comentaris || comentaris.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }
        return (
          <div
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              fontSize: '0.85rem'
            }}
            title={comentaris}
          >
            {comentaris}
          </div>
        );
      },
    },
    {
      field: 'modalitatEntrega',
      headerName: 'Lliurament',
      width: 95,
      renderCell: (params) => (
        params.value === 'MANUAL' ?
          <Chip
            label="MANUAL"
            size="small"
            color="error"
            sx={{ fontWeight: 'bold', fontSize: '0.7rem', minWidth: '70px' }}
          /> :
          null
      ),
    },
    {
      field: 'estat',
      headerName: 'Estat',
      width: 160,
      renderCell: (params) => {
        const normalized = formatSentenceCase(params.value as string);
        const order = params.row;
        const hasNotes = order.notesInternes && order.notesInternes.trim() !== '';
        const hasComments = order.comentarisGenerals && order.comentarisGenerals.trim() !== '';
        const isEnProces = normalized === 'En proces';
        const isAssignatOrLliurat = normalized === 'Assignat' || normalized === 'Lliurat';

        // Notification status
        const notifIntermediari = order.notificacionIntermediari;
        const notifDestinatari = order.notificacionDestinatari;
        const modalitat = order.modalitatEntrega;
        const isDirecta = modalitat === 'DIRECTA';

        if ((normalized === 'Assignat' || normalized === 'Lliurat') && (notifIntermediari || notifDestinatari)) {
          console.log(`🔍 DEBUG Notificacions (${order.idItem}):`, {
            estat: normalized,
            notifIntermediari: `[${notifIntermediari}]`,
            notifDestinatari: `[${notifDestinatari}]`,
            modalitat,
            intermediariLen: notifIntermediari?.length,
            destinatariLen: notifDestinatari?.length
          });
        }

        const isNotificationSent = (status: string | undefined): boolean => {
          const normalizedStatus = status?.toString().trim().toLowerCase() || '';
          return normalizedStatus === 'enviada' || normalizedStatus === 'enviat';
        };

        const getNotifColor = (status: string | undefined) => {
          if (isNotificationSent(status)) {
            return '#4caf50';
          }
          return '#ffc107';
        };

        const buildTooltip = () => {
          if (!isAssignatOrLliurat) return null;
          return (
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                📤 Notificacions
              </Typography>
              {!isDirecta && (
                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                  • Intermediari: {isNotificationSent(notifIntermediari) ? '✅ Enviada' : '⏳ Pendent'}
                </Typography>
              )}
              <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                • Destinatari: {isNotificationSent(notifDestinatari) ? '✅ Enviada' : '⏳ Pendent'}
              </Typography>
            </Box>
          );
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              icon={statusIcons[normalized as keyof typeof statusIcons] || statusIcons['']}
              label={normalized || 'Pendent'}
              color={(statusColors[normalized as keyof typeof statusColors] || 'default') as any}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '24px',
                minWidth: '85px',
                '& .MuiChip-label': {
                  padding: '0 8px'
                }
              }}
              onClick={isEnProces && hasNotes ? () => handleOpenNotesFromChip(order) : undefined}
              clickable={!!(isEnProces && hasNotes)}
            />
            {isEnProces && hasNotes && (
              <Tooltip title="Veure notes internes" placement="top">
                <span style={{ fontSize: '1rem', cursor: 'pointer' }} onClick={() => handleOpenNotesFromChip(order)}>
                  📝
                </span>
              </Tooltip>
            )}
            {hasComments && (
              <Tooltip
                title={
                  <Box sx={{ maxWidth: 300 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      💬 Comentaris:
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                      {order.comentarisGenerals}
                    </Typography>
                  </Box>
                }
                placement="top"
              >
                <span style={{ fontSize: '1rem', cursor: 'help' }}>
                  💬
                </span>
              </Tooltip>
            )}
            {isAssignatOrLliurat && (
              <Tooltip title={buildTooltip()} placement="top">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: 0.5 }}>
                  {!isDirecta && (
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: getNotifColor(notifIntermediari),
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: getNotifColor(notifDestinatari),
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                </Box>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: 'responsablePreparacio',
      headerName: 'Responsable',
      width: 100,
      editable: true,
    },
    {
      field: 'monitorIntermediari',
      headerName: 'Monitor Lliurament',
      width: 120,
      flex: 0.8,
      renderCell: (params) => {
        const monitor = params.value as string;
        const estat = formatSentenceCase(params.row.estat as string);

        if (estat === 'Preparat' || estat === 'Pendent' || estat === 'En proces') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }

        if (estat === 'Assignat' || estat === 'Lliurat') {
          if (monitor && monitor.trim() !== '' && monitor.toUpperCase() !== 'DIRECTA') {
            return (
              <span style={{
                color: '#1976d2',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}>
                {monitor}
              </span>
            );
          }

          return (
            <span style={{
              color: '#2e7d32',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              fontWeight: '500'
            }}>
              Lliurament Directe
            </span>
          );
        }

        return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
      },
    },
    {
      field: 'escolaDestinoIntermediari',
      headerName: 'Escola Destí',
      width: 120,
      flex: 0.8,
      renderCell: (params) => {
        const order = params.row;
        const escola = params.value as string;

        if (order.modalitatEntrega === 'DIRECTA') {
          const materials = order.materials || [];
          const schools = [...new Set(materials.map((m: any) => m.escola).filter(Boolean))];
          if (schools.length > 0) {
            return (
              <span style={{
                color: '#2e7d32',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}>
                {schools.join(', ')}
              </span>
            );
          }
        }

        if (!escola || escola.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }
        return (
          <span style={{
            color: '#1976d2',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}>
            {escola}
          </span>
        );
      },
    },
    {
      field: 'dataLliuramentPrevista',
      headerName: 'Data Lliurament',
      width: 120,
      flex: 0.9,
      renderCell: (params) => {
        const date = params.value as string;
        if (!date || date.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }

        const formatDate = (dateString: string) => {
          if (!dateString) return '';

          if (dateString.includes('T') && dateString.includes('Z')) {
            const dateOnly = dateString.split('T')[0];
            const [year, month, day] = dateOnly.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
            const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

            return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
          }

          const dateObj = new Date(dateString);
          const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
          const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

          return `${days[dateObj.getDay()]} ${dateObj.getDate()} de ${months[dateObj.getMonth()]}`;
        };

        try {
          const formattedDate = formatDate(date);
          return (
            <span style={{
              fontSize: '0.85rem',
              color: '#1976d2',
              fontWeight: '500'
            }}>
              {formattedDate}
            </span>
          );
        } catch {
          return <span style={{
            fontSize: '0.85rem',
            color: '#1976d2',
            fontWeight: '500'
          }}>
            {date}
          </span>;
        }
      },
    },
    {
      field: 'escolaRecollida',
      headerName: 'Escola Recollida',
      width: 120,
      valueGetter: (params) => {
        const order = params.row;
        if (order.modalitatEntrega === 'DIRECTA') {
          const orderMaterials = orders.filter(o =>
            o.idLliurament && o.idLliurament === order.idLliurament
          );

          const materialsBySchool: { [key: string]: any[] } = {};
          orderMaterials.forEach(item => {
            const school = item.escola || 'N/A';
            if (!materialsBySchool[school]) {
              materialsBySchool[school] = [];
            }
            materialsBySchool[school].push(item);
          });

          const sortedSchools = Object.entries(materialsBySchool).sort((a, b) => {
            const dateA = new Date(a[1][0].dataNecessitat).getTime();
            const dateB = new Date(b[1][0].dataNecessitat).getTime();
            return dateA - dateB;
          });

          return sortedSchools[0]?.[0] || '';
        }
        return order.escolaDestinoIntermediari || '';
      },
    },
    {
      field: 'escolesDestiFinal',
      headerName: 'Escoles Destí',
      width: 150,
      valueGetter: (params) => {
        const order = params.row;
        if (order.modalitatEntrega === 'DIRECTA') {
          const orderMaterials = orders.filter(o =>
            o.idLliurament && o.idLliurament === order.idLliurament
          );

          const materialsBySchool: { [key: string]: any[] } = {};
          orderMaterials.forEach(item => {
            const school = item.escola || 'N/A';
            if (!materialsBySchool[school]) {
              materialsBySchool[school] = [];
            }
            materialsBySchool[school].push(item);
          });

          const sortedSchools = Object.entries(materialsBySchool).sort((a, b) => {
            const dateA = new Date(a[1][0].dataNecessitat).getTime();
            const dateB = new Date(b[1][0].dataNecessitat).getTime();
            return dateA - dateB;
          });

          return sortedSchools.map(([school]) => school).join(', ');
        }
        return order.escola || '';
      },
    },
    {
      field: 'distanciaAcademia',
      headerName: 'Distància',
      width: 100,
      renderCell: (params) => {
        const distancia = params.value as string;
        if (!distancia || distancia.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }
        return <span style={{ fontSize: '0.85rem' }}>{distancia}</span>;
      },
    },
    {
      field: 'notesEntrega',
      headerName: 'Notes Lliurament',
      width: 150,
      renderCell: (params) => {
        const notes = params.value as string;
        if (!notes || notes.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }
        return <span style={{ fontSize: '0.85rem' }}>{notes}</span>;
      },
    },
    // Columnas de notificación (solo visibles cuando las notificaciones están activadas)
    ...(notificationsEnabled ? [
      {
        field: 'notifIntermediario',
        headerName: 'Notif. Intermediari',
        width: 120,
        renderCell: (params: any) => {
          const order = params.row;
          const estado = order.estat;

          if (!order.monitorIntermediari ||
              order.monitorIntermediari.trim() === '' ||
              order.monitorIntermediari.toUpperCase() === 'DIRECTA') {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }

          if (estado === 'Assignat') {
            if (loadingNotificationStatuses) {
              return (
                <CircularProgress size={16} sx={{ color: '#999' }} />
              );
            }

            let groupMaterials = [];
            let isFirstInGroup = true;
            let groupSize = 1;

            if (order.idLliurament) {
              groupMaterials = orders.filter(o =>
                o.idLliurament &&
                o.idLliurament === order.idLliurament &&
                o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
              ).sort((a, b) => {
                return (a.idItem || '').localeCompare(b.idItem || '');
              });

              isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
              groupSize = groupMaterials.length;
            } else {
              groupMaterials = orders.filter(o =>
                o.monitorIntermediari === order.monitorIntermediari &&
                o.escolaDestinoIntermediari === order.escolaDestinoIntermediari &&
                o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
                o.monitorIntermediari && o.monitorIntermediari.trim() !== '' &&
                !o.idLliurament
              ).sort((a, b) => {
                return (a.idItem || '').localeCompare(b.idItem || '');
              });

              isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
              groupSize = groupMaterials.length;
            }

            const isSent = notificationStatuses[order.idItem]?.intermediario || false;

            if (isFirstInGroup) {
              if (isSent) {
                return (
                  <Chip
                    label={`Enviat ✅ (${groupSize})`}
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.7rem' }}
                    onClick={() => notificationManagerRef.current?.openModal(order, 'intermediario')}
                  />
                );
              }

              return (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<span>📤</span>}
                  onClick={() => notificationManagerRef.current?.openModal(order, 'intermediario')}
                  sx={{
                    fontSize: '0.7rem',
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5
                  }}
                >
                  Enviar ({groupSize})
                </Button>
              );
            } else {
              return (
                <Chip
                  label="Agrupat"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', color: '#999' }}
                />
              );
            }
          } else if (estado === 'Entregant') {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label="✅ Confirmat"
                  size="small"
                  color="success"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            );
          } else if (estado === 'Lliurat') {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label="✅ Confirmat"
                  size="small"
                  color="success"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            );
          } else {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label="⏳ Pendent"
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            );
          }
        },
      },
      {
        field: 'notifDestinatario',
        headerName: 'Notif. Destinatari',
        width: 120,
        renderCell: (params: any) => {
          const order = params.row;
          const estado = order.estat;

          const isDirectDelivery = order.monitorIntermediari &&
                                   order.monitorIntermediari.toUpperCase() === 'DIRECTA';

          if (!order.monitorIntermediari || order.monitorIntermediari.trim() === '') {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }

          if (!isDirectDelivery && order.nomCognoms === order.monitorIntermediari) {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }

          if (estado === 'Assignat') {
            if (loadingNotificationStatuses) {
              return (
                <CircularProgress size={16} sx={{ color: '#999' }} />
              );
            }

            const groupMaterials = orders.filter(o =>
              o.nomCognoms === order.nomCognoms &&
              o.escola === order.escola &&
              o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
              o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
            ).sort((a, b) => {
              return (a.idItem || '').localeCompare(b.idItem || '');
            });

            const isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
            const groupSize = groupMaterials.length;

            const isSent = notificationStatuses[order.idItem]?.destinatario || false;

            if (isFirstInGroup) {
              if (isSent) {
                return (
                  <Chip
                    label={`Enviat ✅ (${groupSize})`}
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.7rem' }}
                    onClick={() => notificationManagerRef.current?.openModal(order, 'destinatario')}
                  />
                );
              }

              return (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<span>📤</span>}
                  onClick={() => notificationManagerRef.current?.openModal(order, 'destinatario')}
                  sx={{
                    fontSize: '0.7rem',
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5
                  }}
                >
                  Enviar ({groupSize})
                </Button>
              );
            } else {
              return (
                <Chip
                  label="Agrupat"
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', color: '#999' }}
                />
              );
            }
          } else if (estado === 'Lliurat') {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label="✅ Confirmat"
                  size="small"
                  color="success"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            );
          } else {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label="⏳ Pendent"
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            );
          }
        },
      },
    ] : []),
  ];

  const handleRemoveIntermediary = async (orderIds: string[]) => {
    if (!confirm('Estàs segur que vols eliminar la assignació d\'intermediari? L\'estat tornarà a "Preparat".')) {
      return;
    }

    try {
      setLoading(true);
      const result = await apiClient.removeIntermediaryAssignment(orderIds);

      if (result.success) {
        await loadData();
      } else {
        setError(result.error || 'Error eliminant assignació d\'intermediari');
      }
    } catch (err) {
      setError('Error de connexió al eliminar intermediari');
      console.error('Remove intermediary error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    loadDataRef.current = loadData; // Mantenir ref actualitzada
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.loadData();

      if (response.success && response.data) {
        const { headers, rows, estadisticas } = response.data;

        const idLliuramentIdx = headers.indexOf('idLliurament');
        console.log('🔍 DEBUG headers:', headers);
        console.log('🔍 DEBUG índice de idLliurament:', idLliuramentIdx);
        console.log('🔍 DEBUG primera fila length:', rows[0]?.length);
        console.log('🔍 DEBUG primera fila[21]:', rows[0]?.[21]);

        const transformedOrders = rows.map((row, index) => {
          const order: any = {};
          headers.forEach((header, headerIndex) => {
            order[header] = row[headerIndex] || '';
          });
          order.id = order.idItem || order.idPedido || `row-${index}`;
          return order;
        });

        setOrders(transformedOrders);
        setStats(estadisticas);

        detectStaleOrders(transformedOrders);

        // Si hi ha notificació pendent del copilot, obrir el modal
        if (pendingNotificationOrderIds.current) {
          const targetIds = pendingNotificationOrderIds.current;
          pendingNotificationOrderIds.current = null;
          const targetOrder = transformedOrders.find((o: any) => targetIds.includes(o.idItem));
          if (targetOrder) {
            console.log('🔔 Obrint notificació per comanda assignada pel copilot:', targetOrder.idItem);
            // Determinar tipus de notificació segons si té intermediari
            const hasIntermediari = targetOrder.monitorIntermediari &&
              targetOrder.monitorIntermediari.trim() !== '' &&
              targetOrder.monitorIntermediari.toUpperCase() !== 'DIRECTA';
            const notifType = hasIntermediari ? 'intermediario' : 'destinatario';
            setTimeout(() => {
              notificationManagerRef.current?.openModal(targetOrder, notifType);
            }, 500);
          }
        }
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

        const transformedOrders = rows.map((row, index) => {
          const order: any = {};
          headers.forEach((header, headerIndex) => {
            order[header] = row[headerIndex] || '';
          });
          order.id = order.idItem || order.idPedido || `row-${index}`;
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
        await loadData();
        setError(null);

        if (response.data?.message) {
          console.log('Sincronització:', response.data.message);
        }

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

  const refreshChatSpaces = async () => {
    setRefreshingSpaces(true);
    try {
      if (!API_BASE_URL) {
        setError('URL de API no configurada');
        return;
      }

      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'refreshChatSpaces');
      url.searchParams.append('token', API_TOKEN);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setError(null);
        console.log('Espais de xat actualitzats correctament');
      } else {
        setError(result.error || 'Error actualitzant espais de xat');
      }
    } catch (err) {
      setError('Error de connexió durant l\'actualització d\'espais');
      console.error('Refresh spaces error:', err);
    } finally {
      setRefreshingSpaces(false);
    }
  };

  const updateStatus = async () => {
    if (!newStatus || selectedRows.length === 0) return;

    // Validar responsable SOLO si se cambia a "En proces" o "Preparat"
    if (newStatus === 'En proces' || newStatus === 'Preparat') {
      if (!globalResponsable || globalResponsable.trim() === '') {
        setError(`⚠️ Cal introduir el nom del responsable de preparació abans de canviar l'estat a "${newStatus}".`);
        return;
      }

      const selectedOrders = selectedRows.map(rowId => orders.find(o => o.id === rowId)).filter(Boolean);
      const ordersNeedingResponsible = selectedOrders.filter(order =>
        !order?.responsablePreparacio || order.responsablePreparacio.trim() === ''
      );

      if (ordersNeedingResponsible.length > 0) {
        try {
          for (const order of ordersNeedingResponsible) {
            if (order?.idItem) {
              await apiClient.updateOrderFields(order.idItem, {
                responsable_preparacio: globalResponsable
              });
            }
          }

          setOrders(prevOrders =>
            prevOrders.map(o =>
              ordersNeedingResponsible.some(needOrder => needOrder?.id === o.id)
                ? { ...o, responsablePreparacio: globalResponsable }
                : o
            )
          );

          console.log(`✓ Responsable "${globalResponsable}" aplicat a ${ordersNeedingResponsible.length} comandes`);
        } catch (error) {
          console.error('Error aplicant responsable:', error);
          setError('Error assignant el responsable de preparació');
          return;
        }
      }
    }

    // Si el nuevo estado es "En proces" y hay una sola orden seleccionada, abrir modal de notas
    if (newStatus === 'En proces' && selectedRows.length === 1) {
      const order = orders.find(o => o.id === selectedRows[0]);
      if (order) {
        setSelectedOrderForNotes(order);
        setNotesDialogOpen(true);
        return; // No continuar con la actualización aún
      }
    }

    await performStatusUpdate(selectedRows, newStatus);
  };

  const performStatusUpdate = async (rowIds: GridRowSelectionModel, status: string, notes?: string) => {
    setUpdating(true);
    try {
      console.log('🔄 selectedRows:', rowIds);
      console.log('🔄 orders:', orders);

      const selectedOrders = rowIds.map(rowId => orders.find(o => o.id === rowId)).filter(Boolean);
      const selectedUuids = selectedOrders.map(order => order?.idItem || order?.idPedido || order?.uuid || '').filter(uuid => uuid);

      console.log('🔄 selectedUuids to update:', selectedUuids);
      console.log('🔄 newStatus:', status);

      const response = await apiClient.updateOrderStatus(selectedUuids, status);
      if (response.success) {
        if (status === 'En proces' && notes !== undefined && selectedUuids.length === 1) {
          await updateInternalNotes(selectedUuids[0], notes);
        }
        else if (status !== 'En proces') {
          for (let i = 0; i < selectedUuids.length; i++) {
            const order = selectedOrders[i];
            if (order?.notesInternes && order.notesInternes.trim() !== '') {
              console.log('🗑️ Eliminando notas de orden:', selectedUuids[i]);
              await updateInternalNotes(selectedUuids[i], '');
            }
          }
        }

        try {
          await loadDataFast();
        } catch (fastError) {
          console.warn('Fast reload failed, falling back to full reload:', fastError);
          await loadData();
        }
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
      console.log('🔍 DEBUG deleteSelectedOrders:');
      console.log('  - selectedRows:', selectedRows);
      console.log('  - selectedRows types:', selectedRows.map(r => typeof r));
      console.log('  - First order sample:', orders[0]);
      console.log('  - All order IDs:', orders.slice(0, 5).map(o => ({ id: o.id, idItem: o.idItem, idPedido: o.idPedido })));

      const selectedUuids = selectedRows.map(rowId => {
        const order = orders.find(o => String(o.id) === String(rowId));
        console.log(`  - Looking for rowId "${rowId}" (type: ${typeof rowId}), found:`, order ? { id: order.id, idItem: order.idItem, idPedido: order.idPedido } : 'NOT FOUND');
        return order?.idItem || order?.idPedido || order?.id || '';
      }).filter(uuid => uuid && !uuid.startsWith('row-'));

      console.log('  - Final selectedUuids:', selectedUuids);

      if (selectedUuids.length === 0) {
        setError('No s\'han pogut obtenir els identificadors de les sol·licituds seleccionades. Si us plau, recarrega la pàgina i torna-ho a intentar.');
        setDeleting(false);
        return;
      }

      console.log('🗑️ Deleting orders with UUIDs:', selectedUuids);
      const response = await apiClient.deleteOrders(selectedUuids);
      console.log('🗑️ Delete response:', response);
      if (response.success) {
        try {
          await loadDataFast();
        } catch (fastError) {
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

  // Cargar estados de notificaciones cuando cambien los datos
  useEffect(() => {
    if (orders.length > 0) {
      console.log('🔄 useEffect: Cargando estados para', orders.length, 'órdenes');
      notificationManagerRef.current?.loadStatuses(orders);
    }
  }, [orders]);

  // Forzar re-render cuando cambien los estados de notificaciones
  useEffect(() => {
    console.log('📊 useEffect: Estados de notificaciones actualizados:', notificationStatuses);
  }, [notificationStatuses]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      overflow: 'hidden',
      bgcolor: 'grey.50',
      minHeight: '100vh',
      p: { xs: 1.5, sm: 3 },
      '& .MuiDataGrid-root': {
        border: 'none',
      }
    }}>

      {/* Vista mòbil */}
      {isMobile && (
        <MobileOrdersList
          orders={orders}
          stats={stats}
          onOrderClick={(order) => {
            setSelectedOrderForDrawer(order);
            setDrawerOpen(true);
          }}
          onRefresh={loadData}
          onSync={syncFormResponses}
          updating={updating}
          refreshingSpaces={refreshingSpaces}
        />
      )}

      {/* Header Optimitzat - Desktop */}
      {!isMobile && stats && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              {/* Título + Stats en línea */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory2 sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="500">
                    Comandes
                  </Typography>
                </Box>

                {/* Stats compactes */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={stats.total}
                    size="small"
                    sx={{ fontWeight: 600, minWidth: 40 }}
                  />
                  <Typography variant="caption" color="text.secondary">total</Typography>

                  <Typography variant="caption" color="text.disabled" sx={{ mx: 0.5 }}>•</Typography>

                  <Chip
                    label={stats.pendents || 0}
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 35 }}
                  />
                  <Typography variant="caption" color="text.secondary">pendent</Typography>

                  <Typography variant="caption" color="text.disabled" sx={{ mx: 0.5 }}>•</Typography>

                  <Chip
                    label={stats.enProces || 0}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 35 }}
                  />
                  <Typography variant="caption" color="text.secondary">procés</Typography>

                  <Typography variant="caption" color="text.disabled" sx={{ mx: 0.5 }}>•</Typography>

                  <Chip
                    label={stats.preparats || 0}
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 35 }}
                  />
                  <Typography variant="caption" color="text.secondary">preparats</Typography>

                  <Typography variant="caption" color="text.disabled" sx={{ mx: 0.5 }}>•</Typography>

                  <Chip
                    label={stats.assignats || 0}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 35 }}
                  />
                  <Typography variant="caption" color="text.secondary">assignats</Typography>

                  <Typography variant="caption" color="text.disabled" sx={{ mx: 0.5 }}>•</Typography>

                  <Chip
                    label={stats.lliurats || 0}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 35 }}
                  />
                  <Typography variant="caption" color="text.secondary">lliurats</Typography>
                </Stack>
              </Box>

              {/* Botones de acción agrupados */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Sincronitzar Sol·licituds">
                  <IconButton
                    onClick={syncFormResponses}
                    disabled={updating}
                    color="primary"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                  >
                    <Sync />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Actualitzar espais de xat">
                  <IconButton
                    onClick={refreshChatSpaces}
                    disabled={refreshingSpaces}
                    color="secondary"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'secondary.main' }
                    }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>

              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {staleOrders.length > 0 && (
          <Box>
            <Alert
              severity="warning"
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'warning.lighter' }
              }}
              onClick={() => setStaleOrdersExpanded(!staleOrdersExpanded)}
              icon={<Info />}
              action={
                <IconButton
                  size="small"
                  sx={{
                    transform: staleOrdersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }}
                >
                  <ExpandMore />
                </IconButton>
              }
            >
              <strong>⚠️ {staleOrders.length} Sol·licitud{staleOrders.length > 1 ? 's' : ''} Estancad{staleOrders.length > 1 ? 'es' : 'a'}</strong>
            </Alert>
            <Collapse in={staleOrdersExpanded}>
              <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Sense canvi d'estat durant més de 5 dies:
                </Typography>
                {staleOrders.map(order => (
                  <Typography key={order.id} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                    • {order.nomCognoms} - {order.escola} - {order.material}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Stack>

      {/* Toolbar de Acciones */}
      {!isMobile && <StatusUpdateBar
        selectedCount={selectedRows.length}
        selectedRows={selectedRows as any[]}
        newStatus={newStatus}
        globalResponsable={globalResponsable}
        updating={updating}
        deleting={deleting}
        orders={orders}
        onStatusChange={setNewStatus}
        onResponsableChange={setGlobalResponsable}
        onUpdateStatus={updateStatus}
        onDeleteOrders={deleteSelectedOrders}
        onRemoveIntermediary={handleRemoveIntermediary}
      />}

      {/* DataGrid - Desktop */}
      {!isMobile && <Card>
        <Box sx={{ height: { xs: 'calc(100vh - 280px)', sm: 600 }, width: '100%', px: { xs: 0.5, sm: 2 }, pb: 2 }}>
          <DataGrid
            rows={orders}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          density={isMobile ? 'compact' : 'standard'}
          onRowSelectionModelChange={setSelectedRows}
          rowSelectionModel={selectedRows}
          processRowUpdate={async (newRow, oldRow) => {
            if (newRow.responsablePreparacio !== oldRow.responsablePreparacio) {
              try {
                const result = await apiClient.updateOrderFields(newRow.idItem, {
                  responsable_preparacio: newRow.responsablePreparacio || ''
                });

                if (result.success) {
                  setSnackbar({
                    open: true,
                    message: 'Responsable actualitzat correctament',
                    severity: 'success'
                  });
                  setOrders(orders.map(o =>
                    o.idItem === newRow.idItem ? newRow : o
                  ));
                } else {
                  setError(result.error || 'Error actualitzant el responsable');
                  return oldRow;
                }
              } catch (error) {
                console.error('Error updating responsable:', error);
                setError('Error actualitzant el responsable');
                return oldRow;
              }
            }
            return newRow;
          }}
          onProcessRowUpdateError={(error) => {
            console.error('Error processing row update:', error);
            setError('Error processant l\'actualització');
          }}
          columnVisibilityModel={isMobile ? {
            actions: true,
            nomCognoms: true,
            escola: true,
            estat: true,
            timestamp: false,
            dataNecessitat: false,
            activitat: false,
            material: false,
            esMaterialPersonalitzat: false,
            unitats: false,
            comentarisGenerals: false,
            modalitatEntrega: false,
            responsablePreparacio: false,
            monitorIntermediari: false,
            escolaDestinoIntermediari: false,
            dataLliuramentPrevista: false,
            escolaRecollida: false,
            escolesDestiFinal: false,
            distanciaAcademia: false,
            notesEntrega: false,
            notifIntermediario: false,
            notifDestinatario: false,
          } : {
            esMaterialPersonalitzat: false,
            distanciaAcademia: false,
            comentarisGenerals: false,
            modalitatEntrega: false,
            responsablePreparacio: true,
            escolaDestinoIntermediari: false,
            escolaRecollida: false,
            escolesDestiFinal: false,
            notesEntrega: false,
            notifIntermediario: false,
            notifDestinatario: false,
          }}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              csvOptions: {
                allColumns: true,
              },
              printOptions: {
                allColumns: true,
              },
            },
          }}
          autoHeight={false}
          disableColumnMenu={false}
          disableColumnFilter={false}
          disableColumnSelector={false}
          disableDensitySelector={false}
          sx={{
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            '& .MuiDataGrid-cell': {
              fontSize: '0.8rem',
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: '0.8rem',
              fontWeight: 'bold',
            },
            '& .MuiDataGrid-main': {
              overflowX: 'auto',
            },
          }}
          />
        </Box>
      </Card>}

      {/* NotificationManager - handles modal, snackbar, and notification logic */}
      <NotificationManager
        ref={notificationManagerRef}
        orders={orders}
        notificationStatuses={notificationStatuses}
        loadingNotificationStatuses={loadingNotificationStatuses}
        onNotificationStatusesChange={setNotificationStatuses}
        onLoadingStatusesChange={setLoadingNotificationStatuses}
        onRefreshData={loadData}
      />

      {/* OrderNotesDialog */}
      <OrderNotesDialog
        open={notesDialogOpen}
        order={selectedOrderForNotes}
        newStatus={newStatus}
        onClose={() => {
          setNotesDialogOpen(false);
          setSelectedOrderForNotes(null);
        }}
        onSave={async (orderId: string, notes: string) => {
          await performStatusUpdate([selectedOrderForNotes?.id], newStatus, notes);
        }}
        onSaveAndSend={async (orderId: string, notes: string, dataNecessitat: string) => {
          // First perform the status update with notes
          await performStatusUpdate([selectedOrderForNotes?.id], newStatus, notes);

          // Then send to /Staff/COMPRES
          if (API_BASE_URL) {
            try {
              const url = new URL(API_BASE_URL);
              url.searchParams.append('action', 'sendToCompres');
              url.searchParams.append('token', API_TOKEN);

              const response = await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dataNecessitat: dataNecessitat,
                  notes: notes
                })
              });

              const result = await response.json();

              if (result.success) {
                setSnackbar({
                  open: true,
                  message: 'Estat actualitzat i notificació enviada a /Staff/COMPRES',
                  severity: 'success'
                });
              } else {
                setSnackbar({
                  open: true,
                  message: 'Estat actualitzat però no s\'ha pogut enviar la notificació',
                  severity: 'warning'
                });
              }
            } catch (notifError) {
              console.error('Error enviant notificació:', notifError);
              setSnackbar({
                open: true,
                message: 'Estat actualitzat però error enviant notificació',
                severity: 'warning'
              });
            }
          }
        }}
        onNotification={(message, severity) => {
          setSnackbar({ open: true, message, severity });
        }}
      />

      {/* OrderDetailsDrawer */}
      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        order={selectedOrderForDrawer}
        orders={orders}
        notificationsEnabled={notificationsEnabled}
        notificationStatuses={notificationStatuses}
        loadingNotificationStatuses={loadingNotificationStatuses}
        onOpenNotificationModal={(order, type) => notificationManagerRef.current?.openModal(order, type as 'intermediario' | 'destinatario')}
        onRefreshData={loadData}
        onNotification={(message, severity) => {
          setSnackbar({ open: true, message, severity });
        }}
        onStatusChange={async (orderIds: string[], newSt: string) => {
          const response = await apiClient.updateOrderStatus(orderIds, newSt);
          if (!response.success) throw new Error(response.error);
          await loadData();
        }}
      />
    </Box>
  );
}
