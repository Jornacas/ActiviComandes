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
  const [loadingNotificationStatuses, setLoadingNotificationStatuses] = useState(true);

  // Estados para el modal de notas "En procés"
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedOrderForNotes, setSelectedOrderForNotes] = useState<any>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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

  // Función para generar el mensaje de notificación AGRUPADO por pedido
  const generateNotificationMessage = (order: any, type: 'intermediario' | 'destinatario'): string => {
    let orderMaterials: any[] = [];

    if (type === 'intermediario') {
      // Para intermediario: agrupar por Monitor + Escola Destino + Fecha Lliurament
      // Esto permite agrupar múltiples pedidos asignados al mismo intermediario
      orderMaterials = orders.filter(o =>
        o.monitorIntermediari === order.monitorIntermediari &&
        o.escolaDestinoIntermediari === order.escolaDestinoIntermediari &&
        o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
        o.monitorIntermediari && o.monitorIntermediari.trim() !== '' // Que tenga intermediario asignado
      ).sort((a, b) => {
        // Ordenar por idItem para asegurar consistencia con la tabla
        return (a.idItem || '').localeCompare(b.idItem || '');
      });
    } else {
      // Para destinatario: agrupar por Nom_Cognoms + Escola + Data_Lliurament_Prevista
      // Esto permite agrupar todos los materiales de la misma persona, misma escola y misma fecha
      orderMaterials = orders.filter(o =>
        o.nomCognoms === order.nomCognoms &&
        o.escola === order.escola &&
        o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
        o.monitorIntermediari && o.monitorIntermediari.trim() !== '' // Solo pedidos con intermediario
      ).sort((a, b) => {
        // Ordenar por idItem para asegurar consistencia
        return (a.idItem || '').localeCompare(b.idItem || '');
      });
    }

    if (type === 'intermediario') {
      // Obtener los destinatarios únicos (puede haber varios pedidos pero un solo destinatario común)
      const destinatarios = [...new Set(orderMaterials.map(o => o.nomCognoms))];
      const destinatarioText = destinatarios.join(', ');

      // IMPORTANTE: El intermediario SIEMPRE entrega en la PRIMERA escola del grupo
      // Buscar la primera escola en TODOS los materiales del grupo del intermediario (ya ordenados)
      const escolaEntregaIntermediari = orderMaterials.length > 0 ? orderMaterials[0].escola : (order.escola || 'N/A');

      return `🔔 NOVA ASSIGNACIÓ DE MATERIAL COM INTERMEDIARI PER ${order.monitorIntermediari || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Intermediari: ${order.monitorIntermediari || 'N/A'}

📥 REBRÀS MATERIAL:
🏫 Escola: ${order.escolaDestinoIntermediari || 'N/A'}
📅 Data: ${formatDate(order.dataLliuramentPrevista)}
📦 Total: ${orderMaterials.length} materials
📍 Ubicació: Consergeria o caixa de material

📤 LLIURARÀS MATERIAL:
🏫 Escola: ${escolaEntregaIntermediari}
📅 Data: ${formatDate(order.dataNecessitat)}
👤 Per: ${destinatarioText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✅ Confirmar recepció] [❌ Hi ha un problema]`;
    } else {
      let materialsText = '';
      if (orderMaterials.length > 1) {
        // Múltiples materiales - listarlos
        materialsText = orderMaterials.map((item, index) =>
          `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
        ).join('\n');
      } else {
        // Un solo material
        materialsText = `   ${order.material || 'N/A'} (${order.unitats || 1} unitats)`;
      }

      // LÓGICA DE DETECCIÓN DE ENTREGA DEL INTERMEDIARIO:
      // El intermediario SIEMPRE entrega en la PRIMERA escola donde coincide con algún material del grupo
      // Necesitamos buscar en TODOS los materiales del intermediario (no solo del pedido actual)

      // 1. Obtener TODOS los materiales del mismo grupo del intermediario (ordenados)
      const grupoIntermediari = orders.filter(o =>
        o.monitorIntermediari === order.monitorIntermediari &&
        o.escolaDestinoIntermediari === order.escolaDestinoIntermediari &&
        o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
        o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
      ).sort((a, b) => {
        // Ordenar por idItem para asegurar consistencia
        return (a.idItem || '').localeCompare(b.idItem || '');
      });

      // 2. Encontrar la PRIMERA escola donde el intermediario entrega (primera del grupo ordenado)
      const escolaEntregaIntermediari = grupoIntermediari.length > 0 ? grupoIntermediari[0].escola : null;

      // 3. Verificar si la escola del pedido actual coincide con la escola de entrega del intermediario
      const intermediarioCoincideEnEscola = order.escola === escolaEntregaIntermediari;

      let lliuramentInfo = '';
      if (intermediarioCoincideEnEscola) {
        // El intermediario entrega en la misma escola donde trabaja el destinatario
        lliuramentInfo = `🚚 LLIURAMENT:
👤 Intermediari: ${order.monitorIntermediari || 'N/A'}
🏫 Escola: ${order.escola || 'N/A'}
📅 Data que necessites: ${formatDate(order.dataNecessitat)}
⏰ Hora: Abans de l'activitat`;
      } else {
        // El intermediario NO entrega en esta escola (destinatario se lo lleva él/ella mismo/a)
        // La escola de entrega es la primera del grupo del intermediario
        const escolaEntrega = escolaEntregaIntermediari || 'N/A';

        lliuramentInfo = `🚚 LLIURAMENT:
👤 Intermediari: ${order.monitorIntermediari || 'N/A'} (t'ho entregarà a ${escolaEntrega})
🏫 Escola destí: ${order.escola || 'N/A'}
📅 Data que necessites: ${formatDate(order.dataNecessitat)}

ℹ️ NOTA: ${order.monitorIntermediari} t'entregarà aquest material a ${escolaEntrega}.
Tu mateixa te'l portaràs a ${order.escola} el ${formatDate(order.dataNecessitat)}.`;
      }

      return `📦 MATERIAL PREPARAT PER ${order.nomCognoms || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Destinatari: ${order.nomCognoms || 'N/A'}
🏫 Escola: ${order.escola || 'N/A'}
📅 Data necessitat: ${formatDate(order.dataNecessitat)}

📦 MATERIALS (${orderMaterials.length} ${orderMaterials.length === 1 ? 'unitat' : 'unitats'}):
${materialsText}

${lliuramentInfo}

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
    setLoadingNotificationStatuses(true);
    
    try {
      // Obtener todos los IDs de una vez
      const allIds = orders.map(order => order.idItem).filter(Boolean);
      console.log('📋 IDs a consultar:', allIds);
      
      if (allIds.length === 0) {
        console.log('⚠️ No hay IDs para consultar');
        setLoadingNotificationStatuses(false);
        return;
      }
      
      // Llamar al backend para obtener todos los estados de una vez
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';
      
      if (!API_BASE_URL) {
        throw new Error('API_BASE_URL no está configurada');
      }
      
      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'getMultipleNotificationStatuses');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('orderIds', JSON.stringify(allIds));
      
      console.log('🌐 Consultando backend para múltiples IDs:', allIds.length);
      
      // Agregar timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url.toString(), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (result.success && result.results) {
        // Procesar los resultados
        const statuses: {[key: string]: {intermediario: boolean, destinatario: boolean}} = {};
        
        for (const [orderId, status] of Object.entries(result.results)) {
          statuses[orderId] = {
            intermediario: (status as any).intermediario === 'Enviada',
            destinatario: (status as any).destinatario === 'Enviada'
          };
        }
        
        console.log('📊 Estados finales cargados:', statuses);
        setNotificationStatuses(statuses);
      } else {
        console.error('❌ Error obteniendo estados múltiples:', result.error);
        // Fallback: cargar como si todos fueran pendientes
        const statuses: {[key: string]: {intermediario: boolean, destinatario: boolean}} = {};
        for (const orderId of allIds) {
          statuses[orderId] = { intermediario: false, destinatario: false };
        }
        setNotificationStatuses(statuses);
      }
      
    } catch (error) {
      console.error('❌ Error cargando estados de notificaciones:', error);
      // Fallback: cargar como si todos fueran pendientes
      const allIds = orders.map(order => order.idItem).filter(Boolean);
      const statuses: {[key: string]: {intermediario: boolean, destinatario: boolean}} = {};
      for (const orderId of allIds) {
        statuses[orderId] = { intermediario: false, destinatario: false };
      }
      setNotificationStatuses(statuses);
    } finally {
      setLoadingNotificationStatuses(false);
      console.log('✅ Estado de carga de notificaciones completado');
    }
  };

  // Función para enviar la notificación AGRUPADA por pedido
  const sendNotification = async () => {
    if (!selectedOrderForNotification) return;

    setIsSendingNotification(true);
    try {
      // Buscar todos los materiales agrupados según el tipo de notificación
      let orderMaterials: any[] = [];

      if (notificationType === 'intermediario') {
        // Para intermediario: agrupar por Monitor + Escola Destino + Fecha
        orderMaterials = orders.filter(o =>
          o.monitorIntermediari === selectedOrderForNotification.monitorIntermediari &&
          o.escolaDestinoIntermediari === selectedOrderForNotification.escolaDestinoIntermediari &&
          o.dataLliuramentPrevista === selectedOrderForNotification.dataLliuramentPrevista &&
          o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
        ).sort((a, b) => {
          // Ordenar por idItem para asegurar consistencia
          return (a.idItem || '').localeCompare(b.idItem || '');
        });
      } else {
        // Para destinatario: agrupar por Nom_Cognoms + Escola + Data_Lliurament_Prevista
        orderMaterials = orders.filter(o =>
          o.nomCognoms === selectedOrderForNotification.nomCognoms &&
          o.escola === selectedOrderForNotification.escola &&
          o.dataLliuramentPrevista === selectedOrderForNotification.dataLliuramentPrevista &&
          o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
        ).sort((a, b) => {
          return (a.idItem || '').localeCompare(b.idItem || '');
        });
      }

      const orderIds = orderMaterials.map(o => o.idItem).filter(Boolean);

      console.log(`📱 Enviando notificación ${notificationType} AGRUPADA para ${orderIds.length} materiales:`, {
        idPedido: selectedOrderForNotification.idPedido,
        orderIds,
        destinatario: notificationType === 'intermediario'
          ? selectedOrderForNotification.monitorIntermediari
          : selectedOrderForNotification.solicitant,
        mensaje: customMessage
      });

      // Determinar el espacio de Google Chat según el tipo
      let spaceName = '';
      if (notificationType === 'intermediario') {
        // Para intermediario: espacio de la escuela destino + actividad del intermediario
        const escolaDestino = selectedOrderForNotification.escolaDestinoIntermediari || '';
        const activitat = selectedOrderForNotification.activitatIntermediari || '';
        spaceName = `/${escolaDestino}${activitat}`;
      } else {
        // Para destinatario: espacio de la escuela origen + actividad
        const escolaOrigen = selectedOrderForNotification.escola || '';
        const activitat = selectedOrderForNotification.activitat || '';
        spaceName = `/${escolaOrigen}${activitat}`;
      }

      // Llamar al backend para enviar la notificación AGRUPADA
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

      if (!API_BASE_URL) {
        throw new Error('API_BASE_URL no está configurada');
      }

      // Usar GET con el endpoint de notificaciones agrupadas
      const url = new URL(API_BASE_URL);
      url.searchParams.append('action', 'sendManualNotificationGrouped');
      url.searchParams.append('token', API_TOKEN);
      url.searchParams.append('spaceName', spaceName);
      url.searchParams.append('message', customMessage);
      url.searchParams.append('orderIds', JSON.stringify(orderIds)); // Array de IDs
      url.searchParams.append('notificationType', notificationType);

      console.log('🌐 Enviando notificación manual AGRUPADA al backend (GET):', {
        action: 'sendManualNotificationGrouped',
        spaceName,
        orderIdsCount: orderIds.length,
        messageLength: customMessage.length
      });

      const response = await fetch(url.toString());

      const result = await response.json();
      console.log('📥 Respuesta del backend:', result);

      if (result.success) {
        console.log(`✅ Notificación ${notificationType} enviada correctamente para ${orderIds.length} materiales`);

        // Marcar TODOS los materiales del pedido como enviados en el estado local
        setNotificationStatuses(prev => {
          const newStatuses = { ...prev };
          for (const orderId of orderIds) {
            newStatuses[orderId] = {
              ...newStatuses[orderId],
              [notificationType]: true
            };
          }
          return newStatuses;
        });

        // Mostrar mensaje de éxito con el espacio donde se envió
        setNotificationStatus({
          open: true,
          message: `✅ Notificación enviada correctamente a ${notificationType === 'intermediario' ? 'intermediario' : 'destinatario'} en el espacio: ${spaceName} (${orderIds.length} materiales marcados)`,
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

        let date: Date;
        const value = params.value as string;

        // Si es formato DD/MM/YYYY (formato europeo del Google Sheet)
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

        if (isNaN(date.getTime())) return value; // Si no es válida, devolver original
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

          // Si es formato DD/MM/YYYY (formato europeo del Google Sheet)
          if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // Meses en JS son 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);

              const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
              const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

              return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
            }
          }

          // Para fechas normales (ISO 8601 sin Z)
          const dateObj = new Date(dateString);
          if (isNaN(dateObj.getTime())) return dateString; // Si no es válida, devolver original

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
        const order = params.row;
        const hasNotes = order.notesInternes && order.notesInternes.trim() !== '';
        const isEnProces = normalized === 'En proces';

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              icon={statusIcons[normalized as keyof typeof statusIcons] || statusIcons['']}
              label={normalized || 'Pendent'}
              color={statusColors[normalized as keyof typeof statusColors] || 'default'}
              size="small"
              sx={{ fontSize: '0.75rem' }}
              onClick={isEnProces && hasNotes ? () => handleOpenNotesFromChip(order) : undefined}
              clickable={!!(isEnProces && hasNotes)}
            />
            {isEnProces && hasNotes && (
              <Tooltip title="Veure notes" placement="top">
                <span style={{ fontSize: '1rem', cursor: 'pointer' }} onClick={() => handleOpenNotesFromChip(order)}>
                  📝
                </span>
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
      field: 'dataLliuramentPrevista',
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
            // Mostrar indicador de carga si aún se están cargando los estados
            if (loadingNotificationStatuses) {
              return (
                <CircularProgress size={16} sx={{ color: '#999' }} />
              );
            }

            // IMPORTANTE: Detectar si este material es el PRIMERO del grupo
            // Solo mostramos el botón en la primera fila del grupo para evitar duplicados
            const groupMaterials = orders.filter(o =>
              o.monitorIntermediari === order.monitorIntermediari &&
              o.escolaDestinoIntermediari === order.escolaDestinoIntermediari &&
              o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
              o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
            ).sort((a, b) => {
              // Ordenar por idItem para asegurar consistencia
              return (a.idItem || '').localeCompare(b.idItem || '');
            });

            const isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
            const groupSize = groupMaterials.length;

            const isSent = notificationStatuses[order.idItem]?.intermediario || false;
            const message = generateNotificationMessage(order, 'intermediario');

            // Si es el primero del grupo, mostrar el botón/chip
            if (isFirstInGroup) {
              if (isSent) {
                return (
                  <Chip
                    label={`Enviat ✅ (${groupSize})`}
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
                    Enviar ({groupSize})
                  </Button>
                </Tooltip>
              );
            } else {
              // Si NO es el primero, mostrar indicador de agrupación
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

          // Si no tiene intermediario asignado, no mostrar nada
          if (!order.monitorIntermediari || order.monitorIntermediari.trim() === '') {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }

          // Lógica de estados de notificación
          if (estado === 'Assignat') {
            // Mostrar indicador de carga si aún se están cargando los estados
            if (loadingNotificationStatuses) {
              return (
                <CircularProgress size={16} sx={{ color: '#999' }} />
              );
            }

            // IMPORTANTE: Detectar si este material es el PRIMERO del grupo de destinatario
            // Agrupar por Nom_Cognoms + Escola + Data_Lliurament_Prevista
            const groupMaterials = orders.filter(o =>
              o.nomCognoms === order.nomCognoms &&
              o.escola === order.escola &&
              o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
              o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
            ).sort((a, b) => {
              // Ordenar por idItem para asegurar consistencia
              return (a.idItem || '').localeCompare(b.idItem || '');
            });

            const isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
            const groupSize = groupMaterials.length;

            const isSent = notificationStatuses[order.idItem]?.destinatario || false;
            const message = generateNotificationMessage(order, 'destinatario');

            // Si es el primero del grupo, mostrar el botón/chip
            if (isFirstInGroup) {
              if (isSent) {
                return (
                  <Chip
                    label={`Enviat ✅ (${groupSize})`}
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
                    Enviar ({groupSize})
                  </Button>
                </Tooltip>
              );
            } else {
              // Si NO es el primero, mostrar indicador de agrupación
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

  // Función para actualizar las notas internas
  const updateInternalNotes = async (orderId: string, notes: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

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

  // Guardar notas y actualizar estado
  const handleSaveNotes = async () => {
    if (!selectedOrderForNotes) return;

    setSavingNotes(true);
    try {
      // Actualizar el estado y las notas
      await performStatusUpdate([selectedOrderForNotes.id], newStatus, internalNotes);

      // Cerrar el modal
      setNotesDialogOpen(false);
      setSelectedOrderForNotes(null);
      setInternalNotes('');
    } catch (error) {
      console.error('Error guardando notas:', error);
      setError('Error guardant les notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Abrir el modal de notas desde el chip de estado
  const handleOpenNotesFromChip = (order: any) => {
    setSelectedOrderForNotes(order);
    setInternalNotes(order.notesInternes || '');
    setNotesDialogOpen(true);
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

    // Si el nuevo estado es "En proces" y hay una sola orden seleccionada, abrir modal de notas
    if (newStatus === 'En proces' && selectedRows.length === 1) {
      const order = orders.find(o => o.id === selectedRows[0]);
      if (order) {
        setSelectedOrderForNotes(order);
        setInternalNotes(order.notesInternes || '');
        setNotesDialogOpen(true);
        return; // No continuar con la actualización aún
      }
    }

    await performStatusUpdate(selectedRows, newStatus);
  };

  const performStatusUpdate = async (rowIds: GridRowSelectionModel, status: string, notes?: string) => {
    setUpdating(true);
    try {
      // Get UUIDs of selected orders (use idPedido or idItem)
      console.log('🔄 selectedRows:', rowIds);
      console.log('🔄 orders:', orders);

      const selectedOrders = rowIds.map(rowId => orders.find(o => o.id === rowId)).filter(Boolean);
      const selectedUuids = selectedOrders.map(order => order?.idItem || order?.idPedido || order?.uuid || '').filter(uuid => uuid);

      console.log('🔄 selectedUuids to update:', selectedUuids);
      console.log('🔄 newStatus:', status);

      const response = await apiClient.updateOrderStatus(selectedUuids, status);
      if (response.success) {
        // Si el nuevo estado es "En proces" y hay notas, actualizar las notas
        if (status === 'En proces' && notes !== undefined && selectedUuids.length === 1) {
          await updateInternalNotes(selectedUuids[0], notes);
        }
        // Si el nuevo estado NO es "En proces", eliminar las notas si existían
        else if (status !== 'En proces') {
          for (let i = 0; i < selectedUuids.length; i++) {
            const order = selectedOrders[i];
            // Si la orden tenía notas y ahora no está en "En proces", eliminarlas
            if (order?.notesInternes && order.notesInternes.trim() !== '') {
              console.log('🗑️ Eliminando notas de orden:', selectedUuids[i]);
              await updateInternalNotes(selectedUuids[i], '');
            }
          }
        }

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
      console.log('🔍 selectedRows:', selectedRows);
      console.log('🔍 orders:', orders);

      const selectedUuids = selectedRows.map(rowId => {
        const order = orders.find(o => o.id === rowId);
        console.log(`🔍 Looking for rowId ${rowId}, found:`, order);
        console.log(`🔍 idPedido: ${order?.idPedido}, idItem: ${order?.idItem}, uuid: ${order?.uuid}`);
        return order?.idPedido || order?.idItem || order?.uuid || '';
      }).filter(uuid => uuid);

      console.log('🔍 selectedUuids to delete:', selectedUuids);

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
          🔔 <strong>Sistema de notificacions manual activat</strong> - Pots enviar notificacions manualment des de la taula
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
          {notificationsEnabled ? 'Sistema Manual Actiu' : 'Activar Sistema Manual'}
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

      {/* Modal de notes per "En procés" */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => !savingNotes && setNotesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          📝 Notes Internes - Material En Procés
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {selectedOrderForNotes && (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Material:</strong> {selectedOrderForNotes.material}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  <strong>Sol·licitant:</strong> {selectedOrderForNotes.nomCognoms}
                </Typography>
              </>
            )}

            <Typography variant="body2" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Afegeix notes sobre què falta o cal completar:
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              variant="outlined"
              placeholder="Ex: Falta comprar 3 unitats més, arriba divendres..."
              disabled={savingNotes}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setNotesDialogOpen(false);
              setSelectedOrderForNotes(null);
              setInternalNotes('');
            }}
            disabled={savingNotes}
          >
            Cancel·lar
          </Button>
          <Button
            onClick={handleSaveNotes}
            variant="contained"
            color="primary"
            disabled={savingNotes}
            startIcon={savingNotes ? <CircularProgress size={20} /> : null}
          >
            {savingNotes ? 'Guardant...' : 'Guardar i Actualitzar Estat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}