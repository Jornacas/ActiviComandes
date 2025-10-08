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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Sync,
  CheckCircle,
  Pending,
  LocalShipping,
  HourglassEmpty,
  Delete,
  Clear,
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
  'Lliurat': 'success',
  // Legacy estados (por compatibilidad)
  'Entregat': 'success',
  'Assignat': 'secondary',
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
  'Lliurat': <LocalShipping />,
  // Legacy estados (por compatibilidad)
  'Entregat': <LocalShipping />,
  'Assignat': <LocalShipping />,
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
  const [staleOrders, setStaleOrders] = useState<Order[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    // Cargar el estado desde localStorage si existe
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationsEnabled');
      return saved === 'true';
    }
    return false;
  });

  // Estados para el modal de notificaciones
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [selectedOrderForNotification, setSelectedOrderForNotification] = useState<any>(null);
  const [notificationType, setNotificationType] = useState<'intermediario' | 'destinatario'>('intermediario');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [notificationStatuses, setNotificationStatuses] = useState<{[key: string]: {intermediario: boolean, destinatario: boolean}}>({});

  // Guardar el estado en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
    }
  }, [notificationsEnabled]);

  // Función para formatear fecha a DD/MM/YYYY
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Si no es una fecha válida, devolver original
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Si hay error, devolver original
    }
  };

  // Función para generar el mensaje de notificación
  const generateNotificationMessage = (order: any, type: 'intermediario' | 'destinatario'): string => {
    if (type === 'intermediario') {
      return `🔔 NOVA ASSIGNACIÓ DE MATERIAL COM INTERMEDIARI PER ${order.monitorIntermediari || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Intermediari: ${order.monitorIntermediari || 'N/A'}

📥 REBRÀS MATERIAL:
🏫 Escola: ${order.escolaDestinoIntermediari || 'N/A'}
📅 Data: ${formatDate(order.Data_Lliurament_Prevista)}
📦 Material: ${order.material || 'N/A'}
📍 Ubicació: Consergeria o caixa de material

📤 LLIURARÀS MATERIAL:
🏫 Escola: ${order.escola || 'N/A'}
📅 Data que necessita: ${formatDate(order.dataNecessitat || order.Data_Necessitat)}
👤 Per: ${order.nomCognoms || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✅ Confirmar recepció] [❌ Hi ha un problema]`;
    } else {
      return `📦 MATERIAL ASSIGNAT PER LLIURAMENT PER ${order.nomCognoms || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Sol·licitant: ${order.nomCognoms || 'N/A'}

📦 MATERIAL:
${order.material || 'N/A'}

🚚 LLIURAMENT:
👤 Intermediari: ${order.monitorIntermediari || 'N/A'}
🏫 Escola: ${order.escola || 'N/A'}
📅 Data que necessites: ${formatDate(order.dataNecessitat || order.Data_Necessitat)}
⏰ Hora: Abans de l'activitat

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✅ Confirmar recepció] [❌ Hi ha un problema]`;
    }
  };

  // Función para abrir el modal de notificación
  const openNotificationModal = (order: any, type: 'intermediario' | 'destinatario') => {
    setSelectedOrderForNotification(order);
    setNotificationType(type);
    setCustomMessage(generateNotificationMessage(order, type));
    setNotificationModalOpen(true);
  };

  // Función para obtener el estado de notificaciones desde Google Sheets
  const getNotificationStatusFromSheets = async (orderId: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

      if (!API_BASE_URL) {
        throw new Error('API_BASE_URL no está configurada');
      }

      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'getNotificationStatus');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('orderId', orderId);

      console.log('🌐 Consultando backend para orderId:', orderId, 'URL:', url.toString());

      const response = await fetch(url.toString());
      const result = await response.json();

      console.log('📥 Respuesta del backend:', result);

      if (result.success) {
        const status = {
          intermediario: result.intermediario === 'Enviada',
          destinatario: result.destinatario === 'Enviada'
        };
        console.log('✅ Estado procesado:', status);
        return status;
      } else {
        console.log('⚠️ Error obteniendo estado de notificaciones:', result.error);
        return { intermediario: false, destinatario: false };
      }
    } catch (error) {
      console.error('❌ Error obteniendo estado de notificaciones:', error);
      return { intermediario: false, destinatario: false };
    }
  };

  // Función para cargar todos los estados de notificaciones
  const loadNotificationStatuses = async (orders: any[]) => {
    console.log('🔄 Cargando estados de notificaciones para', orders.length, 'órdenes');
    const statuses: {[key: string]: {intermediario: boolean, destinatario: boolean}} = {};
    
    for (const order of orders) {
      if (order.idItem) {
        try {
          console.log(`🔍 Consultando estado para ID: ${order.idItem}`);
          const status = await getNotificationStatusFromSheets(order.idItem);
          console.log(`📥 Estado recibido para ${order.idItem}:`, status);
          statuses[order.idItem] = status;
        } catch (error) {
          console.error(`❌ Error cargando estado para ${order.idItem}:`, error);
          statuses[order.idItem] = { intermediario: false, destinatario: false };
        }
      }
    }
    
    console.log('📊 Estados finales cargados:', statuses);
    setNotificationStatuses(statuses);
  };

  // Función para enviar la notificación
  const sendNotification = async () => {
    if (!selectedOrderForNotification) return;

    setIsSendingNotification(true);
    try {
      console.log(`📱 Enviando notificación ${notificationType}:`, {
        destinatario: notificationType === 'intermediario' 
          ? selectedOrderForNotification.monitorIntermediari 
          : selectedOrderForNotification.solicitant,
        mensaje: customMessage
      });

      // Determinar el espacio de Google Chat según el tipo
      let spaceName = '';
      if (notificationType === 'intermediario') {
        // Para intermediario: espacio de la escuela destino + actividad
        const escolaDestino = selectedOrderForNotification.escolaDestinoIntermediari || '';
        const activitat = selectedOrderForNotification.activitat || '';
        spaceName = `/${escolaDestino}${activitat}`;
      } else {
        // Para destinatario: espacio de la escuela origen + actividad
        const escolaOrigen = selectedOrderForNotification.escola || '';
        const activitat = selectedOrderForNotification.activitat || '';
        spaceName = `/${escolaOrigen}${activitat}`;
      }

      // Llamar al backend para enviar la notificación
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

      if (!API_BASE_URL) {
        throw new Error('API_BASE_URL no está configurada');
      }

      // Usar GET para evitar problemas de CORS con POST
      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'sendManualNotification');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('spaceName', spaceName);
      url.searchParams.append('message', customMessage);
      url.searchParams.append('orderId', selectedOrderForNotification.idItem);
      url.searchParams.append('notificationType', notificationType);

      console.log('🌐 Enviando notificación manual al backend (GET):', {
        action: 'sendManualNotification',
        spaceName,
        messageLength: customMessage.length
      });

      const response = await fetch(url.toString());

      const result = await response.json();
      console.log('📥 Respuesta del backend:', result);

      if (result.success) {
        console.log(`✅ Notificación ${notificationType} enviada correctamente`);
        
        // Marcar como enviado en el estado local
        setNotificationStatuses(prev => ({
          ...prev,
          [selectedOrderForNotification.idItem]: {
            ...prev[selectedOrderForNotification.idItem],
            [notificationType]: true
          }
        }));
        
        // Mostrar mensaje de éxito con el espacio donde se envió
        setNotificationStatus({
          open: true,
          message: `✅ Notificación enviada correctamente a ${notificationType === 'intermediario' ? 'intermediario' : 'destinatario'} en el espacio: ${spaceName}`,
          severity: 'success'
        });
        
        // Cerrar modal
        setNotificationModalOpen(false);
        setSelectedOrderForNotification(null);
        setCustomMessage('');
      } else {
        throw new Error(result.error || 'Error enviando notificación');
      }
    } catch (error) {
      console.error(`⚠️ Error enviando notificación ${notificationType}:`, error);
      
      // Mostrar mensaje de error
      setNotificationStatus({
        open: true,
        message: `❌ Error enviando notificación: ${error}`,
        severity: 'error'
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Function to detect stale orders (no state change in 5 days)
  const detectStaleOrders = (ordersList: Order[]) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const stale = ordersList.filter(order => {
      // Check if order has no dataEstat or if dataEstat is older than 5 days
      if (!order.dataEstat) return true;
      
      const lastStateChange = new Date(order.dataEstat);
      return lastStateChange < fiveDaysAgo && 
             order.estat !== 'Lliurat' && 
             order.estat !== 'Entregat' && 
             order.estat !== 'Entregado'; // Include legacy status
    });
    
    setStaleOrders(stale);
  };

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'Data',
      width: 70,
      type: 'dateTime',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
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
        
        // Función para formatear la fecha en formato "martes 03 noviembre"
        const formatDataNecessitat = (dateString: string) => {
          if (!dateString) return '';
          
          // Si es una fecha ISO con Z (UTC), extraer solo la parte de fecha
          if (dateString.includes('T') && dateString.includes('Z')) {
            const dateOnly = dateString.split('T')[0]; // "2025-10-01"
            const [year, month, day] = dateOnly.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
            const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

            return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
          }
          
          // Para fechas normales
          const dateObj = new Date(dateString);
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
      width: 120,
      renderCell: (params) => {
        const normalized = formatSentenceCase(params.value as string);
        return (
          <Chip
            icon={statusIcons[normalized as keyof typeof statusIcons] || statusIcons['']}
            label={normalized || 'Pendent'}
            color={statusColors[normalized as keyof typeof statusColors] || 'default'}
            size="small"
            sx={{ fontSize: '0.75rem' }}
          />
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
        if (!monitor || monitor.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }
        return (
          <span style={{ 
            color: '#1976d2', 
            fontSize: '0.85rem', 
            fontWeight: '500' 
          }}>
            {monitor}
          </span>
        );
      },
    },
    {
      field: 'escolaDestinoIntermediari',
      headerName: 'Escola Destí',
      width: 120,
      flex: 0.8,
      renderCell: (params) => {
        const escola = params.value as string;
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
      field: 'Data_Lliurament_Prevista',
      headerName: 'Data Lliurament',
      width: 120,
      flex: 0.9,
      renderCell: (params) => {
        const date = params.value as string;
        if (!date || date.trim() === '') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }
        
        // Usar la misma función formatDate que funciona en DeliveryManager
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
          
          // Si no tiene intermediario asignado, no mostrar nada
          if (!order.monitorIntermediari || order.monitorIntermediari.trim() === '') {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }
          
          // Lógica de estados de notificación
          if (estado === 'Assignat') {
            const isSent = notificationStatuses[order.idItem]?.intermediario || false;
            console.log(`🔍 Renderizando orden ${order.idItem}:`, {
              estado,
              isSent,
              notificationStatuses: notificationStatuses[order.idItem],
              monitorIntermediari: order.monitorIntermediari
            });
            const message = generateNotificationMessage(order, 'intermediario');
            
            if (isSent) {
              return (
                <Chip
                  label="Enviat ✅"
                  size="small"
                  color="primary"
                  sx={{ fontSize: '0.7rem' }}
                  onClick={() => openNotificationModal(order, 'intermediario')}
                />
              );
            }
            
            return (
              <Tooltip title={message} placement="top" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<span>📤</span>}
                  onClick={() => openNotificationModal(order, 'intermediario')}
                  sx={{ 
                    fontSize: '0.7rem',
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5
                  }}
                >
                  Enviar
                </Button>
              </Tooltip>
            );
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
          
          // Si no tiene intermediario asignado, no mostrar nada
          if (!order.monitorIntermediari || order.monitorIntermediari.trim() === '') {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }
          
          // Lógica de estados de notificación
          if (estado === 'Assignat') {
            const isSent = notificationStatuses[order.idItem]?.destinatario || false;
            const message = generateNotificationMessage(order, 'destinatario');
            
            if (isSent) {
              return (
                <Chip
                  label="Enviat ✅"
                  size="small"
                  color="primary"
                  sx={{ fontSize: '0.7rem' }}
                  onClick={() => openNotificationModal(order, 'destinatario')}
                />
              );
            }
            
            return (
              <Tooltip title={message} placement="top" arrow>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<span>📤</span>}
                  onClick={() => openNotificationModal(order, 'destinatario')}
                  sx={{ 
                    fontSize: '0.7rem',
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5
                  }}
                >
                  Enviar
                </Button>
              </Tooltip>
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
        // Refresh data after successful removal
        await loadData();
        // You could also show a success message here
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
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.loadData();

      if (response.success && response.data) {
        const { headers, rows, estadisticas } = response.data;

        // Transform raw data to Order objects
        const transformedOrders = rows.map((row, index) => {
          const order: any = {};
          headers.forEach((header, headerIndex) => {
            // Use headers as they come from backend (already normalized)
            order[header] = row[headerIndex] || '';
          });
          // Use idItem as the primary ID, fallback to index if not available
          order.id = order.idItem || order.idPedido || `row-${index}`;
          return order;
        });

        setOrders(transformedOrders);
        setStats(estadisticas);
        
        // Detect stale orders
        detectStaleOrders(transformedOrders);
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
            // Use headers as they come from backend (already normalized)
            order[header] = row[headerIndex] || '';
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
        // Try fast reload first, fallback to full reload
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

  // Cargar estados de notificaciones cuando cambien los datos
  useEffect(() => {
    if (orders.length > 0) {
      console.log('🔄 useEffect: Cargando estados para', orders.length, 'órdenes');
      loadNotificationStatuses(orders);
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
      '& .MuiDataGrid-root': {
        border: 'none',
      }
    }}>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {notificationsEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔔 <strong>Notificacions automàtiques activades</strong> - Les assignacions d'intermediaris enviaran notificacions automàtiques
        </Alert>
      )}

      {staleOrders.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>⚠️ Avisos de Sol·licituds Estancades</strong>
          <br />
          Hi ha {staleOrders.length} sol·licitud{staleOrders.length > 1 ? 's' : ''} sense canvi d'estat durant més de 5 dies.
          {staleOrders.length <= 3 && (
            <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
              {staleOrders.map(order => (
                <div key={order.id}>
                  • {order.nomCognoms} - {order.escola} - {order.material}
                </div>
              ))}
            </div>
          )}
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
              <Chip label={`Lliurats: ${stats.entregados || stats.entregats || 0}`} color="success" />
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
          variant={notificationsEnabled ? "contained" : "outlined"}
          color={notificationsEnabled ? "success" : "primary"}
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          startIcon={notificationsEnabled ? <CheckCircle /> : <Pending />}
        >
          {notificationsEnabled ? 'Notificacions Actives' : 'Activar Notificacions'}
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
                                    <MenuItem value="Lliurat">Lliurat</MenuItem>
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
              Eliminar Sol·licitud ({selectedRows.length})
            </Button>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<Clear />}
              onClick={() => handleRemoveIntermediary(selectedRows as string[])}
              disabled={updating || selectedRows.length === 0}
            >
              Eliminar Intermediari ({selectedRows.length})
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
          columnVisibilityModel={{
            esMaterialPersonalitzat: false,
            distanciaAcademia: false,
          }}
          initialState={{
            sorting: {
              sortModel: [{ field: 'timestamp', sort: 'desc' }],
            },
          }}
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

      {/* Modal de notificaciones */}
      <Dialog
        open={notificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          📤 Enviar Notificación {notificationType === 'intermediario' ? 'al Intermediario' : 'al Destinatario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Destinatario:</strong> {
                notificationType === 'intermediario' 
                  ? selectedOrderForNotification?.monitorIntermediari
                  : selectedOrderForNotification?.nomCognoms
              }
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              <strong>Material:</strong> {selectedOrderForNotification?.material}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              <strong>Mensaje a enviar:</strong>
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              variant="outlined"
              sx={{ mt: 1 }}
              placeholder="Edita el mensaje aquí..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setNotificationModalOpen(false)}
            disabled={isSendingNotification}
          >
            Cancelar
          </Button>
          <Button
            onClick={sendNotification}
            variant="contained"
            color="primary"
            disabled={isSendingNotification}
            startIcon={isSendingNotification ? <CircularProgress size={20} /> : <span>📤</span>}
          >
            {isSendingNotification ? 'Enviant...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones de estado */}
      <Snackbar
        open={notificationStatus.open}
        autoHideDuration={6000}
        onClose={() => setNotificationStatus(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotificationStatus(prev => ({ ...prev, open: false }))}
          severity={notificationStatus.severity}
          sx={{ width: '100%' }}
        >
          {notificationStatus.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}