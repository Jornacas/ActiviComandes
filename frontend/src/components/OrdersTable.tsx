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
  Drawer,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Sync,
  CheckCircle,
  Pending,
  LocalShipping,
  HourglassEmpty,
  Delete,
  Clear,
  Close,
  Info,
  ExpandMore,
  Inventory2,
  Edit,
  Save,
  Refresh,
  Person,
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
  'Assignat': <Person />,
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
  const [refreshingSpaces, setRefreshingSpaces] = useState(false);
  const [staleOrders, setStaleOrders] = useState<Order[]>([]);
  const [staleOrdersExpanded, setStaleOrdersExpanded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    // Cargar el estado desde localStorage si existe
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationsEnabled');
      return saved === 'true';
    }
    return false;
  });

  // Estado global del responsable de preparació
  const [globalResponsable, setGlobalResponsable] = useState(() => {
    // Cargar último responsable usado desde localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastResponsablePreparacio');
      return saved || '';
    }
    return '';
  });

  // Estados para el modal de notificaciones
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [selectedOrderForNotification, setSelectedOrderForNotification] = useState<any>(null);
  const [notificationType, setNotificationType] = useState<'intermediario' | 'destinatario'>('intermediario');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'warning'}>({
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

  // Estados para el Drawer lateral (panel de detalles)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any>(null);

  // États per edició de camps al drawer
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editedOrderData, setEditedOrderData] = useState({
    material: '',
    unitats: 0,
    comentarisGenerals: ''
  });
  const [confirmEditDialogOpen, setConfirmEditDialogOpen] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  // Guardar el estado en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
    }
  }, [notificationsEnabled]);

  // Guardar el responsable global en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined' && globalResponsable.trim()) {
      localStorage.setItem('lastResponsablePreparacio', globalResponsable);
    }
  }, [globalResponsable]);

  // Helper: Calculate next occurrence of a weekday from a base date
  const getNextDateForWeekday = (baseDate: string, weekdayName: string): string => {
    if (!baseDate || !weekdayName) return baseDate;

    const weekdayMap: { [key: string]: number } = {
      'dilluns': 1, 'dimarts': 2, 'dimecres': 3, 'dijous': 4,
      'divendres': 5, 'dissabte': 6, 'diumenge': 0
    };

    const targetDay = weekdayMap[weekdayName.toLowerCase()];
    if (targetDay === undefined) return baseDate;

    const base = new Date(baseDate);
    const currentDay = base.getDay();

    // Calculate days to add (0 if same day, positive otherwise)
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd < 0) daysToAdd += 7; // Next week if target day already passed
    if (daysToAdd === 0) daysToAdd = 0; // Same day

    const resultDate = new Date(base);
    resultDate.setDate(base.getDate() + daysToAdd);

    return resultDate.toISOString().split('T')[0];
  };

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

  // Función para formatear fecha en formato catalán "dijous 23 octubre"
  const formatDateCatalan = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';

    try {
      let date: Date;

      // Si es una fecha ISO con Z (UTC), extraer solo la parte de fecha
      if (dateString.includes('T') && dateString.includes('Z')) {
        const dateOnly = dateString.split('T')[0]; // "2025-10-01"
        const [year, month, day] = dateOnly.split('-');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // Si es formato DD/MM/YYYY (formato europeo del Google Sheet)
      else if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Meses en JS son 0-indexed
          const year = parseInt(parts[2]);
          date = new Date(year, month, day);
        } else {
          date = new Date(dateString);
        }
      }
      // Para fechas normales (ISO 8601 sin Z)
      else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) return dateString; // Si no es válida, devolver original

      const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
      const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

      return `${days[date.getDay()]} ${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
    } catch (error) {
      return dateString; // Si hay error, devolver original
    }
  };

  // Función para generar el mensaje de notificación MEJORADO
  const generateNotificationMessage = (order: any, type: 'intermediario' | 'destinatario'): string => {
    // Agrupar materiales del mismo lote (ID_Lliurament)
    const orderMaterials = orders.filter(o =>
      o.idLliurament && o.idLliurament === order.idLliurament &&
      o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
    ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

    // Verificar si es entrega directa (sin intermediario o marcado como DIRECTA)
    const isDirectDelivery = !order.monitorIntermediari ||
                             order.monitorIntermediari.trim() === '' ||
                             order.monitorIntermediari.toUpperCase() === 'DIRECTA';

    // CASO: ENTREGA DIRECTA
    if (isDirectDelivery && type === 'destinatario') {
      // Agrupar materiales por escuela de destino
      const materialsBySchool: { [key: string]: any[] } = {};
      orderMaterials.forEach(item => {
        const school = item.escola || 'N/A';
        if (!materialsBySchool[school]) {
          materialsBySchool[school] = [];
        }
        materialsBySchool[school].push(item);
      });

      // Ordenar escuelas por fecha de necesidad (más cercana primero)
      const sortedSchools = Object.entries(materialsBySchool).sort((a, b) => {
        const dateA = new Date(a[1][0].dataNecessitat).getTime();
        const dateB = new Date(b[1][0].dataNecessitat).getTime();
        return dateA - dateB;
      });

      // La escuela de recogida es la primera por fecha (si no está especificada)
      const pickupSchool = orderMaterials[0]?.escolaRecollida || orderMaterials[0]?.pickupSchool || sortedSchools[0][0];
      const pickupDate = formatDate(order.dataLliuramentPrevista);

      // Generar texto de materiales agrupados por escuela (ordenados por fecha)
      let schoolsText = sortedSchools.map(([school, materials]) => {
        const deliveryDate = formatDate(materials[0].dataNecessitat);
        const materialsText = materials.map((item, index) =>
          `      ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
        ).join('\n');

        return `🏫 Per a ${school} (${deliveryDate}):\n${materialsText}`;
      }).join('\n\n');

      // Generar nota dinámica: solo mencionar escuelas DESPUÉS de la primera
      const otherSchools = sortedSchools.slice(1); // Todas excepto la primera
      let noteText;
      if (otherSchools.length === 0) {
        // Solo una escuela (la de recogida)
        noteText = '';
      } else if (otherSchools.length === 1) {
        // Una escuela adicional
        const [school, materials] = otherSchools[0];
        const date = formatDate(materials[0].dataNecessitat);
        noteText = `\nℹ️ NOTA: Recorda portar el material a ${school} el dia ${date}.`;
      } else {
        // Múltiples escuelas adicionales
        noteText = '\nℹ️ NOTA: Recorda distribuir el material a les diferents escoles segons les dates indicades.';
      }

      return `📦 RECOLLIDA DE MATERIAL - ${order.nomCognoms || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Destinatària: ${order.nomCognoms || 'N/A'}

📥 RECOLLIDA:
🏫 Escola: ${pickupSchool}
📅 Data: ${pickupDate}
📍 Ubicació: Consergeria, AFA o Caixa de Material

📦 MATERIAL A REPARTIR:

${schoolsText}${noteText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    // CASO: INTERMEDIARIO
    if (type === 'intermediario') {
      // Separar materiales: propios vs de otros
      const materialesPropios = orderMaterials.filter(o => o.nomCognoms === order.monitorIntermediari);
      const materialesOtros = orderMaterials.filter(o => o.nomCognoms !== order.monitorIntermediari);

      // Obtener destinatarios únicos (excluyendo al intermediario)
      const destinatariosOtros = [...new Set(materialesOtros.map(o => o.nomCognoms))];

      // CASO 4: Intermediario = Destinatario (solo su material)
      if (materialesPropios.length > 0 && materialesOtros.length === 0) {
        const materialsText = materialesPropios.map((item, index) =>
          `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
        ).join('\n');

        return `📦 RECOLLIDA DEL TEU MATERIAL - ${order.monitorIntermediari || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 RECOLLIDA:
🏫 Escola: ${order.pickupSchool || 'N/A'}
📅 Data: ${formatDate(order.dataLliuramentPrevista)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

🟢 EL TEU MATERIAL:
${materialsText}

📤 DESTÍ FINAL:
🏫 Escola: ${order.escola || 'N/A'}
📅 Data que necessites: ${formatDate(order.dataNecessitat)}

ℹ️ NOTA: Recolliràs el teu material a ${order.escolaDestinoIntermediari || 'N/A'}
i te'l portaràs a ${order.escola || 'N/A'} per a la teva activitat.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }

      // CASO 5: Intermediario = Destinatario + otros
      if (materialesPropios.length > 0 && materialesOtros.length > 0) {
        const materialsPropisText = materialesPropios.map((item, index) =>
          `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
        ).join('\n');

        const paquetsText = destinatariosOtros.map(dest => {
          const orderDest = materialesOtros.find(o => o.nomCognoms === dest);
          // Para pedidos existentes: usar escolaDestinoIntermediari (escuela de coincidencia/entrega)
          // Si no existe, fallback a escola (escuela final del destinatario)
          const escolaDest = orderDest?.escolaDestinoIntermediari || orderDest?.escola || 'N/A';

          // Calcular fecha de entrega: si hay diaEntregaIntermediari, usarlo; sino, estimar +1 día
          let deliveryDate;
          if (orderDest?.diaEntregaIntermediari) {
            deliveryDate = getNextDateForWeekday(order.dataLliuramentPrevista, orderDest.diaEntregaIntermediari);
          } else {
            // Fallback: asumir entrega al día siguiente del pickup
            const pickupDate = new Date(order.dataLliuramentPrevista);
            pickupDate.setDate(pickupDate.getDate() + 1);
            deliveryDate = pickupDate.toISOString().split('T')[0];
          }

          return `   • ${dest} (${escolaDest}, ${formatDate(deliveryDate)})`;
        }).join('\n');

        return `📦 RECOLLIDA DE MATERIALS - ${order.monitorIntermediari || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 El teu rol: Intermediària i Destinatària

📥 RECOLLIDA:
🏫 Escola: ${order.pickupSchool || 'N/A'}
📅 Data: ${formatDate(order.dataLliuramentPrevista)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

🟢 EL TEU MATERIAL:
${materialsPropisText}

🔵 PAQUETS PER ENTREGAR:
${paquetsText}

ℹ️ NOTA: Recolliràs el teu material i paquets per altres companys.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }

      // CASO 2: Solo intermediario (sin materiales propios)
      if (materialesPropios.length === 0 && materialesOtros.length > 0) {
        const paquetsText = destinatariosOtros.map(dest => {
          const orderDest = materialesOtros.find(o => o.nomCognoms === dest);
          // Para pedidos existentes: usar escolaDestinoIntermediari (escuela de coincidencia/entrega)
          // Si no existe, fallback a escola (escuela final del destinatario)
          const escolaDest = orderDest?.escolaDestinoIntermediari || orderDest?.escola || 'N/A';

          // Calcular fecha de entrega: si hay diaEntregaIntermediari, usarlo; sino, estimar +1 día
          let deliveryDate;
          if (orderDest?.diaEntregaIntermediari) {
            deliveryDate = getNextDateForWeekday(order.dataLliuramentPrevista, orderDest.diaEntregaIntermediari);
          } else {
            // Fallback: asumir entrega al día siguiente del pickup
            const pickupDate = new Date(order.dataLliuramentPrevista);
            pickupDate.setDate(pickupDate.getDate() + 1);
            deliveryDate = pickupDate.toISOString().split('T')[0];
          }

          return `   • ${dest} (${escolaDest}, ${formatDate(deliveryDate)})`;
        }).join('\n');

        return `🔔 NOVA ASSIGNACIÓ COM A INTERMEDIÀRIA - ${order.monitorIntermediari || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 RECOLLIDA:
🏫 Escola: ${order.pickupSchool || 'N/A'}
📅 Data: ${formatDate(order.dataLliuramentPrevista)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

📤 PAQUETS PER ENTREGAR:
${paquetsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }
    }

    // CASO: DESTINATARIO (con intermediario)
    if (type === 'destinatario') {
      // Verificar si el destinatario es el mismo que el intermediario
      const isIntermediarioSameAsDestinatario = order.nomCognoms === order.monitorIntermediari;

      // Si es el mismo, NO enviar mensaje de destinatario (ya recibió el combinado)
      if (isIntermediarioSameAsDestinatario) {
        return ''; // No generar mensaje
      }

      // Filtrar solo materiales de este destinatario
      const materialsDestinatario = orders.filter(o =>
        o.nomCognoms === order.nomCognoms &&
        o.escola === order.escola &&
        o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
        o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
      ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

      const materialsText = materialsDestinatario.map((item, index) =>
        `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
      ).join('\n');

      // Calcular fecha de entrega del intermediario
      let deliveryDate;
      if (order.diaEntregaIntermediari) {
        deliveryDate = getNextDateForWeekday(order.dataLliuramentPrevista, order.diaEntregaIntermediari);
      } else {
        // Fallback: asumir entrega al día siguiente del pickup
        const pickupDate = new Date(order.dataLliuramentPrevista);
        pickupDate.setDate(pickupDate.getDate() + 1);
        deliveryDate = pickupDate.toISOString().split('T')[0];
      }

      return `📦 MATERIAL PREPARAT PER A ${order.nomCognoms || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Destinatària: ${order.nomCognoms || 'N/A'}

📦 MATERIALS:
${materialsText}

📥 RECOLLIDA:
👤 Intermediària: ${order.monitorIntermediari || 'N/A'}
🏫 Escola: ${order.escolaDestinoIntermediari || 'N/A'}
📅 Data: ${formatDate(deliveryDate)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

📤 DESTÍ FINAL:
🏫 Escola: ${order.escola || 'N/A'}
📅 Data: ${formatDate(order.dataNecessitat)}
🎯 Per a la teva activitat a aquesta escola
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    return ''; // Fallback
  };

  // Función para abrir el modal de notificación
  const openNotificationModal = (order: any, type: 'intermediario' | 'destinatario') => {
    const message = generateNotificationMessage(order, type);

    // Si el mensaje está vacío (caso destinatario === intermediario), no abrir modal
    if (!message || message.trim() === '') {
      console.log('⚠️ No se genera notificación: destinatario es el mismo que intermediario');
      return;
    }

    setSelectedOrderForNotification(order);
    setNotificationType(type);
    setCustomMessage(message);
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
        // Para intermediario: agrupar por ID_Lliurament
        // IMPORTANTE: Solo agrupa materiales que fueron asignados JUNTOS (mismo ID_Lliurament)
        orderMaterials = orders.filter(o =>
          o.idLliurament && o.idLliurament === selectedOrderForNotification.idLliurament && // CLAVE: mismo lote de lliurament
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

        // DEBUG: Log notification values for orders with Assignat/Lliurat status
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

        // Helper function to check if notification was sent
        const isNotificationSent = (status: string | undefined): boolean => {
          const normalizedStatus = status?.toString().trim().toLowerCase() || '';
          return normalizedStatus === 'enviada' || normalizedStatus === 'enviat';
        };

        // Helper function to get notification color
        const getNotifColor = (status: string | undefined) => {
          // Check if sent (Enviada/Enviat)
          if (isNotificationSent(status)) {
            return '#4caf50'; // Green
          }

          // Default: Yellow (Pendiente or empty)
          return '#ffc107';
        };

        // Build tooltip component
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
              color={statusColors[normalized as keyof typeof statusColors] || 'default'}
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
        const modalitat = params.row.modalitatEntrega;

        // Si el estado es Preparat, mostrar -- (aún no asignado)
        if (estat === 'Preparat' || estat === 'Pendent' || estat === 'En proces') {
          return <span style={{ color: '#999', fontStyle: 'italic', fontSize: '0.8rem' }}>--</span>;
        }

        // Si el estado es Assignat o Lliurat
        if (estat === 'Assignat' || estat === 'Lliurat') {
          // Si hay nombre de monitor, mostrarlo
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

          // Si no hay monitor O es DIRECTA, es Lliurament Directe
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

        // Para cualquier otro estado, mostrar --
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

        // Si es entrega DIRECTA, mostrar escuelas de los materiales
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

        // Para entregas con intermediario
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
      field: 'escolaRecollida',
      headerName: 'Escola Recollida',
      width: 120,
      valueGetter: (params) => {
        const order = params.row;
        if (order.modalitatEntrega === 'DIRECTA') {
          // Obtener todos los materiales del mismo lliurament
          const orderMaterials = orders.filter(o =>
            o.idLliurament && o.idLliurament === order.idLliurament
          );

          // Agrupar y ordenar por fecha
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
        // Para entregas con intermediario, la escuela de recogida es la escolaDestinoIntermediari
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
          // Obtener todos los materiales del mismo lliurament
          const orderMaterials = orders.filter(o =>
            o.idLliurament && o.idLliurament === order.idLliurament
          );

          // Agrupar y ordenar por fecha
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
        // Para entregas con intermediario, el destí final es la escola del destinatario
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

          // Si no tiene intermediario asignado O es entrega directa, no mostrar nada
          if (!order.monitorIntermediari ||
              order.monitorIntermediari.trim() === '' ||
              order.monitorIntermediari.toUpperCase() === 'DIRECTA') {
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
            let groupMaterials = [];
            let isFirstInGroup = true;
            let groupSize = 1;

            // Si tiene ID_Lliurament, agrupar por ese ID (pedidos asignados JUNTOS en el mismo lote)
            if (order.idLliurament) {
              groupMaterials = orders.filter(o =>
                o.idLliurament &&
                o.idLliurament === order.idLliurament &&
                o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
              ).sort((a, b) => {
                // Ordenar por idItem para asegurar consistencia
                return (a.idItem || '').localeCompare(b.idItem || '');
              });

              isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
              groupSize = groupMaterials.length;
            } else {
              // FALLBACK para pedidos antiguos sin ID_Lliurament:
              // Agrupar por monitor + escola destino + fecha (lógica antigua)
              groupMaterials = orders.filter(o =>
                o.monitorIntermediari === order.monitorIntermediari &&
                o.escolaDestinoIntermediari === order.escolaDestinoIntermediari &&
                o.dataLliuramentPrevista === order.dataLliuramentPrevista &&
                o.monitorIntermediari && o.monitorIntermediari.trim() !== '' &&
                !o.idLliurament // Solo agrupar pedidos que tampoco tienen ID
              ).sort((a, b) => {
                return (a.idItem || '').localeCompare(b.idItem || '');
              });

              isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === order.idItem;
              groupSize = groupMaterials.length;
            }

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

          // Determinar si es entrega directa
          const isDirectDelivery = order.monitorIntermediari &&
                                   order.monitorIntermediari.toUpperCase() === 'DIRECTA';

          // Si no tiene intermediario Y no es entrega directa, no mostrar nada
          if (!order.monitorIntermediari || order.monitorIntermediari.trim() === '') {
            return <span style={{ color: '#999', fontSize: '0.8rem' }}>--</span>;
          }

          // Si el intermediario ES el destinatario (y NO es entrega directa), no mostrar botón (ya recibe notificación combinada)
          if (!isDirectDelivery && order.nomCognoms === order.monitorIntermediari) {
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

  // Guardar, actualizar estado Y enviar al espacio /Staff/COMPRES
  const handleSaveAndSendNotes = async () => {
    if (!selectedOrderForNotes) return;

    setSavingNotes(true);
    try {
      // Actualizar el estado y las notas
      await performStatusUpdate([selectedOrderForNotes.id], newStatus, internalNotes);

      // Enviar mensaje a /Staff/COMPRES
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

      if (API_BASE_URL) {
        try {
          const url = new URL(API_BASE_URL);
          url.searchParams.append('action', 'sendToCompres');
          url.searchParams.append('token', API_TOKEN);

          const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataNecessitat: selectedOrderForNotes.dataNecessitat,
              notes: internalNotes
            })
          });

          const result = await response.json();

          if (result.success) {
            setNotificationStatus({
              open: true,
              message: 'Estat actualitzat i notificació enviada a /Staff/COMPRES',
              severity: 'success'
            });
          } else {
            setNotificationStatus({
              open: true,
              message: 'Estat actualitzat però no s\'ha pogut enviar la notificació',
              severity: 'warning'
            });
          }
        } catch (notifError) {
          console.error('Error enviant notificació:', notifError);
          setNotificationStatus({
            open: true,
            message: 'Estat actualitzat però error enviant notificació',
            severity: 'warning'
          });
        }
      }

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

  // Funcions per editar camps de la comanda al drawer
  const handleStartEditing = () => {
    if (selectedOrderForDrawer) {
      setEditedOrderData({
        material: selectedOrderForDrawer.material || '',
        unitats: selectedOrderForDrawer.unitats || 0,
        comentarisGenerals: selectedOrderForDrawer.comentarisGenerals || ''
      });
      setIsEditingOrder(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditingOrder(false);
    setEditedOrderData({
      material: '',
      unitats: 0,
      comentarisGenerals: ''
    });
  };

  const handleSaveEdits = () => {
    // Obrir diàleg de confirmació
    setConfirmEditDialogOpen(true);
  };

  const handleConfirmSaveEdits = async () => {
    if (!selectedOrderForDrawer) return;

    setIsSavingEdits(true);
    try {
      const result = await apiClient.updateOrderFields(selectedOrderForDrawer.idItem, {
        material: editedOrderData.material,
        unitats: editedOrderData.unitats,
        comentaris_generals: editedOrderData.comentarisGenerals
      });

      if (result.success) {
        setNotificationStatus({
          open: true,
          message: 'Comanda actualitzada correctament',
          severity: 'success'
        });

        // Actualitzar el state local
        setOrders(orders.map(o =>
          o.idItem === selectedOrderForDrawer.idItem
            ? { ...o, ...editedOrderData }
            : o
        ));

        // Actualitzar el drawer amb les noves dades
        setSelectedOrderForDrawer({
          ...selectedOrderForDrawer,
          ...editedOrderData
        });

        // Sortir del mode edició
        setIsEditingOrder(false);
        setConfirmEditDialogOpen(false);
      } else {
        setError(result.error || 'Error actualitzant la comanda');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      setError('Error actualitzant la comanda');
    } finally {
      setIsSavingEdits(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.loadData();

      if (response.success && response.data) {
        const { headers, rows, estadisticas } = response.data;

        // DEBUG: Verificar headers e índice de idLliurament
        const idLliuramentIdx = headers.indexOf('idLliurament');
        console.log('🔍 DEBUG headers:', headers);
        console.log('🔍 DEBUG índice de idLliurament:', idLliuramentIdx);
        console.log('🔍 DEBUG primera fila length:', rows[0]?.length);
        console.log('🔍 DEBUG primera fila[21]:', rows[0]?.[21]);

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

  const refreshChatSpaces = async () => {
    setRefreshingSpaces(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

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
      // Validar que haya un responsable global definido
      if (!globalResponsable || globalResponsable.trim() === '') {
        setError(`⚠️ Cal introduir el nom del responsable de preparació abans de canviar l'estat a "${newStatus}".`);
        return;
      }

      // Aplicar el responsable global a todas las filas seleccionadas que no tengan responsable
      const selectedOrders = selectedRows.map(rowId => orders.find(o => o.id === rowId)).filter(Boolean);
      const ordersNeedingResponsible = selectedOrders.filter(order =>
        !order?.responsablePreparacio || order.responsablePreparacio.trim() === ''
      );

      // Actualizar responsable en todas las órdenes que lo necesiten
      if (ordersNeedingResponsible.length > 0) {
        try {
          for (const order of ordersNeedingResponsible) {
            if (order?.idItem) {
              await apiClient.updateOrderFields(order.idItem, {
                responsable_preparacio: globalResponsable
              });
            }
          }

          // Actualizar el estado local
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
      // DEBUG: Log selected rows and orders structure
      console.log('🔍 DEBUG deleteSelectedOrders:');
      console.log('  - selectedRows:', selectedRows);
      console.log('  - selectedRows types:', selectedRows.map(r => typeof r));
      console.log('  - First order sample:', orders[0]);
      console.log('  - All order IDs:', orders.slice(0, 5).map(o => ({ id: o.id, idItem: o.idItem, idPedido: o.idPedido })));

      // Get UUIDs of selected orders - use String() to ensure type consistency
      const selectedUuids = selectedRows.map(rowId => {
        const order = orders.find(o => String(o.id) === String(rowId));
        console.log(`  - Looking for rowId "${rowId}" (type: ${typeof rowId}), found:`, order ? { id: order.id, idItem: order.idItem, idPedido: order.idPedido } : 'NOT FOUND');
        // Use idItem first (most reliable), then idPedido, then the id field itself
        return order?.idItem || order?.idPedido || order?.id || '';
      }).filter(uuid => uuid && !uuid.startsWith('row-'));

      console.log('  - Final selectedUuids:', selectedUuids);

      // Validate that we have valid UUIDs to delete
      if (selectedUuids.length === 0) {
        setError('No s\'han pogut obtenir els identificadors de les sol·licituds seleccionades. Si us plau, recarrega la pàgina i torna-ho a intentar.');
        setDeleting(false);
        return;
      }

      console.log('🗑️ Deleting orders with UUIDs:', selectedUuids);
      const response = await apiClient.deleteOrders(selectedUuids);
      console.log('🗑️ Delete response:', response);
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
      bgcolor: 'grey.50',
      minHeight: '100vh',
      p: 3,
      '& .MuiDataGrid-root': {
        border: 'none',
      }
    }}>

      {/* Header Optimitzat */}
      {stats && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                {/* Botón Sync iconizado */}
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

                {/* Botón Refresh Chat Spaces */}
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
      {selectedRows.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Responsable Preparació"
              value={globalResponsable}
              onChange={(e) => setGlobalResponsable(e.target.value)}
              placeholder="Nom del responsable"
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              helperText={globalResponsable ? "S'aplicarà a totes les files" : "Obligatori per 'En procés' i 'Preparat'"}
            />

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
          </Stack>
        </Card>
      )}

      {/* DataGrid */}
      <Card>
        <Box sx={{ height: 600, width: '100%', px: 2, pb: 2 }}>
          <DataGrid
            rows={orders}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={setSelectedRows}
          rowSelectionModel={selectedRows}
          processRowUpdate={async (newRow, oldRow) => {
            // Detectar si s'ha canviat el responsable
            if (newRow.responsablePreparacio !== oldRow.responsablePreparacio) {
              try {
                const result = await apiClient.updateOrderFields(newRow.idItem, {
                  responsable_preparacio: newRow.responsablePreparacio || ''
                });

                if (result.success) {
                  setNotificationStatus({
                    open: true,
                    message: 'Responsable actualitzat correctament',
                    severity: 'success'
                  });
                  // Actualitzar el state local
                  setOrders(orders.map(o =>
                    o.idItem === newRow.idItem ? newRow : o
                  ));
                } else {
                  setError(result.error || 'Error actualitzant el responsable');
                  return oldRow; // Revertir el canvi
                }
              } catch (error) {
                console.error('Error updating responsable:', error);
                setError('Error actualitzant el responsable');
                return oldRow; // Revertir el canvi
              }
            }
            return newRow;
          }}
          onProcessRowUpdateError={(error) => {
            console.error('Error processing row update:', error);
            setError('Error processant l\'actualització');
          }}
          columnVisibilityModel={{
            // Ocultar columnas - los detalles están en el drawer lateral
            esMaterialPersonalitzat: false,
            distanciaAcademia: false,
            comentarisGenerals: false,
            modalitatEntrega: false,
            responsablePreparacio: true, // ✅ Visible per edició inline
            escolaDestinoIntermediari: false,
            escolaRecollida: false, // ✅ Oculta però apareix en CSV/impressió
            escolesDestiFinal: false, // ✅ Oculta però apareix en CSV/impressió
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
                allColumns: true, // Incluir todas las columnas incluso las ocultas
              },
              printOptions: {
                allColumns: true, // Incluir todas las columnas incluso las ocultas
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
      </Card>

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
            variant="outlined"
            color="primary"
            disabled={savingNotes || !internalNotes.trim()}
            startIcon={savingNotes ? <CircularProgress size={20} /> : null}
          >
            Guardar
          </Button>
          <Button
            onClick={handleSaveAndSendNotes}
            variant="contained"
            color="primary"
            disabled={savingNotes || !internalNotes.trim()}
            startIcon={savingNotes ? <CircularProgress size={20} /> : null}
          >
            {savingNotes ? 'Enviant...' : 'Enviar a Compres'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawer lateral - Panel de detalles del pedido */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 500, md: 600 } }
        }}
      >
        {selectedOrderForDrawer && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info />
                Detalls del Pedido
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
                    icon={statusIcons[formatSentenceCase(selectedOrderForDrawer.estat as string) as keyof typeof statusIcons] || statusIcons['']}
                    label={formatSentenceCase(selectedOrderForDrawer.estat as string) || 'Pendent'}
                    color={statusColors[formatSentenceCase(selectedOrderForDrawer.estat as string) as keyof typeof statusColors] || 'default'}
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
                        secondary={formatDateCatalan(selectedOrderForDrawer.timestamp)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Monitor"
                        secondary={selectedOrderForDrawer.nomCognoms || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Escola"
                        secondary={selectedOrderForDrawer.escola || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Activitat"
                        secondary={selectedOrderForDrawer.activitat || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Data Necessitat"
                        secondary={formatDateCatalan(selectedOrderForDrawer.dataNecessitat)}
                      />
                    </ListItem>
                  </List>
                </Box>

                <Divider />

                {/* Material */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="overline" fontWeight="bold" color="primary">
                      📦 Material Sol·licitat
                    </Typography>
                    {!isEditingOrder && (
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={handleStartEditing}
                        variant="outlined"
                      >
                        Editar
                      </Button>
                    )}
                  </Box>

                  {!isEditingOrder ? (
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Material"
                          secondary={formatSentenceCase(selectedOrderForDrawer.material as string) || 'N/A'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Unitats"
                          secondary={selectedOrderForDrawer.unitats || 'N/A'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Comentaris"
                          secondary={selectedOrderForDrawer.comentarisGenerals || '-'}
                        />
                      </ListItem>
                      {selectedOrderForDrawer.esMaterialPersonalitzat === 'TRUE' && (
                        <ListItem>
                          <ListItemText
                            primary="Material Personalitzat"
                            secondary="Sí"
                          />
                        </ListItem>
                      )}
                    </List>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        ⚠️ Estàs editant dades crítiques de la comanda. Els canvis s'aplicaran directament al Google Sheet.
                      </Alert>

                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="Material"
                          value={editedOrderData.material}
                          onChange={(e) => setEditedOrderData({ ...editedOrderData, material: e.target.value })}
                          variant="outlined"
                          size="small"
                        />

                        <TextField
                          fullWidth
                          label="Unitats"
                          type="number"
                          value={editedOrderData.unitats}
                          onChange={(e) => setEditedOrderData({ ...editedOrderData, unitats: parseInt(e.target.value) || 0 })}
                          variant="outlined"
                          size="small"
                          inputProps={{ min: 0 }}
                        />

                        <TextField
                          fullWidth
                          label="Comentaris Generals"
                          multiline
                          rows={4}
                          value={editedOrderData.comentarisGenerals}
                          onChange={(e) => setEditedOrderData({ ...editedOrderData, comentarisGenerals: e.target.value })}
                          variant="outlined"
                          size="small"
                          placeholder="Comentaris sobre el material..."
                        />

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                          <Button
                            variant="outlined"
                            onClick={handleCancelEditing}
                            disabled={isSavingEdits}
                          >
                            Cancel·lar
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveEdits}
                            disabled={isSavingEdits}
                            startIcon={isSavingEdits ? <CircularProgress size={16} /> : <Save />}
                          >
                            {isSavingEdits ? 'Guardant...' : 'Guardar Canvis'}
                          </Button>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Lliurament */}
                {(selectedOrderForDrawer.monitorIntermediari || selectedOrderForDrawer.dataLliuramentPrevista) && (
                  <>
                    <Box>
                      <Typography variant="overline" fontWeight="bold" color="primary" gutterBottom>
                        🚚 Lliurament
                      </Typography>
                      <List dense>
                        {selectedOrderForDrawer.responsablePreparacio && (
                          <ListItem>
                            <ListItemText
                              primary="Responsable Preparació"
                              secondary={selectedOrderForDrawer.responsablePreparacio}
                            />
                          </ListItem>
                        )}
                        {(() => {
                          const estat = formatSentenceCase(selectedOrderForDrawer.estat as string);
                          const monitor = selectedOrderForDrawer.monitorIntermediari;

                          // Solo mostrar si el estado es Assignat o Lliurat
                          if (estat === 'Assignat' || estat === 'Lliurat') {
                            let label = 'Tipus de Lliurament';
                            let value = 'Lliurament Directe';
                            let color = '#2e7d32';
                            let fontStyle = 'italic';

                            // Si hay nombre de monitor (y no es "DIRECTA")
                            if (monitor && monitor.trim() !== '' && monitor.toUpperCase() !== 'DIRECTA') {
                              value = `Intermediari: ${monitor}`;
                              color = '#1976d2';
                              fontStyle = 'normal';
                            }

                            return (
                              <ListItem>
                                <ListItemText
                                  primary={label}
                                  secondary={value}
                                  secondaryTypographyProps={{
                                    style: {
                                      color: color,
                                      fontWeight: '500',
                                      fontStyle: fontStyle
                                    }
                                  }}
                                />
                              </ListItem>
                            );
                          }
                          return null;
                        })()}
                        {selectedOrderForDrawer.pickupSchool && (
                          <ListItem>
                            <ListItemText
                              primary="Escola Recollida"
                              secondary={selectedOrderForDrawer.pickupSchool}
                            />
                          </ListItem>
                        )}
                        {selectedOrderForDrawer.escolaDestinoIntermediari && (
                          <ListItem>
                            <ListItemText
                              primary="Escola Entrega"
                              secondary={selectedOrderForDrawer.escolaDestinoIntermediari}
                            />
                          </ListItem>
                        )}
                        {/* Para entregas DIRECTA, mostrar escola de recollida y escuelas de destino */}
                        {selectedOrderForDrawer.modalitatEntrega === 'DIRECTA' && (() => {
                          // Obtener todos los materiales del mismo lliurament
                          const orderMaterials = orders.filter(o =>
                            o.idLliurament && o.idLliurament === selectedOrderForDrawer.idLliurament
                          );

                          // Agrupar y ordenar por fecha
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

                          const pickupSchool = sortedSchools[0]?.[0];
                          const allSchools = sortedSchools.map(([school]) => school);

                          return (
                            <>
                              {pickupSchool && (
                                <ListItem>
                                  <ListItemText
                                    primary="Escola Recollida"
                                    secondary={pickupSchool}
                                    secondaryTypographyProps={{
                                      style: {
                                        color: '#1976d2',
                                        fontWeight: '500'
                                      }
                                    }}
                                  />
                                </ListItem>
                              )}
                              {allSchools.length > 0 && (
                                <ListItem>
                                  <ListItemText
                                    primary={allSchools.length === 1 ? "Escola Destí" : "Escoles Destí"}
                                    secondary={allSchools.join(', ')}
                                    secondaryTypographyProps={{
                                      style: {
                                        color: '#2e7d32',
                                        fontWeight: '500'
                                      }
                                    }}
                                  />
                                </ListItem>
                              )}
                            </>
                          );
                        })()}
                        {selectedOrderForDrawer.dataLliuramentPrevista && (
                          <ListItem>
                            <ListItemText
                              primary="Data Lliurament Prevista"
                              secondary={formatDateCatalan(selectedOrderForDrawer.dataLliuramentPrevista)}
                            />
                          </ListItem>
                        )}
                        {selectedOrderForDrawer.distanciaAcademia && (
                          <ListItem>
                            <ListItemText
                              primary="Distància"
                              secondary={selectedOrderForDrawer.distanciaAcademia}
                            />
                          </ListItem>
                        )}
                        {selectedOrderForDrawer.notesEntrega && (
                          <ListItem>
                            <ListItemText
                              primary="Notes Entrega"
                              secondary={selectedOrderForDrawer.notesEntrega}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                    <Divider />
                  </>
                )}

                {/* Notes Internes */}
                {selectedOrderForDrawer.notesInternes && selectedOrderForDrawer.notesInternes.trim() !== '' && (
                  <>
                    <Box>
                      <Typography variant="overline" fontWeight="bold" color="primary" gutterBottom>
                        📝 Notes Internes
                      </Typography>
                      <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        {selectedOrderForDrawer.notesInternes}
                      </Typography>
                    </Box>
                    <Divider />
                  </>
                )}
              </Stack>
            </Box>

            {/* Actions Footer */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Stack spacing={2}>
                {/* Notificaciones - Mostrar siempre si están habilitadas */}
                {notificationsEnabled && (
                  <>
                    <Typography variant="overline" fontWeight="bold" color="text.secondary">
                      📧 Notificacions
                    </Typography>

                    {/* Notificación Intermediario - Solo si NO es entrega DIRECTA */}
                    {selectedOrderForDrawer.modalitatEntrega !== 'DIRECTA' && selectedOrderForDrawer.monitorIntermediari && selectedOrderForDrawer.monitorIntermediari.trim() !== '' && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            Intermediari:
                          </Typography>
                          {loadingNotificationStatuses ? (
                            <CircularProgress size={20} />
                          ) : (() => {
                          // Calcular si es el primero del grupo (misma lógica que en las columnas)
                          let groupMaterials = [];
                          let isFirstInGroup = true;

                          if (selectedOrderForDrawer.idLliurament && selectedOrderForDrawer.monitorIntermediari) {
                            groupMaterials = orders.filter(o =>
                              o.idLliurament &&
                              o.idLliurament === selectedOrderForDrawer.idLliurament &&
                              o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
                            ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

                            isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === selectedOrderForDrawer.idItem;
                          }

                          const isSent = notificationStatuses[selectedOrderForDrawer.idItem]?.intermediario;

                          if (isSent) {
                            return <Chip label="✅ Enviada" size="small" color="success" />;
                          } else if (!isFirstInGroup) {
                            return <Chip label="Agrupat" size="small" color="default" />;
                          } else {
                            return (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<span>📤</span>}
                                onClick={() => openNotificationModal(selectedOrderForDrawer, 'intermediario')}
                              >
                                Enviar
                              </Button>
                            );
                          }
                          })()}
                        </Stack>
                      </Box>
                    )}

                    {/* Notificación Destinatario */}
                    {/* Mostrar siempre si es DIRECTA O si intermediario ≠ destinatario */}
                    {(selectedOrderForDrawer.modalitatEntrega === 'DIRECTA' || selectedOrderForDrawer.nomCognoms !== selectedOrderForDrawer.monitorIntermediari) && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            Destinatari:
                          </Typography>
                          {loadingNotificationStatuses ? (
                            <CircularProgress size={20} />
                          ) : (() => {
                            // Calcular si es el primero del grupo (para destinatario agrupa diferente)
                            let groupMaterials = [];
                            let isFirstInGroup = true;

                            // Para destinatario: agrupar por nomCognoms + escola + fecha
                            groupMaterials = orders.filter(o =>
                              o.nomCognoms === selectedOrderForDrawer.nomCognoms &&
                              o.escola === selectedOrderForDrawer.escola &&
                              o.dataNecessitat === selectedOrderForDrawer.dataNecessitat
                            ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

                            isFirstInGroup = groupMaterials.length > 0 && groupMaterials[0].idItem === selectedOrderForDrawer.idItem;

                            const isSent = notificationStatuses[selectedOrderForDrawer.idItem]?.destinatario;

                            if (isSent) {
                              return <Chip label="✅ Enviada" size="small" color="success" />;
                            } else if (!isFirstInGroup) {
                              return <Chip label="Agrupat" size="small" color="default" />;
                            } else {
                              return (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<span>📤</span>}
                                  onClick={() => openNotificationModal(selectedOrderForDrawer, 'destinatario')}
                                >
                                  Enviar
                                </Button>
                              );
                            }
                          })()}
                        </Stack>
                      </Box>
                    )}

                    <Divider />
                  </>
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Diàleg de Confirmació per Editar Comanda */}
      <Dialog
        open={confirmEditDialogOpen}
        onClose={() => !isSavingEdits && setConfirmEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ⚠️ Confirmar Canvis
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Estàs a punt de modificar dades crítiques de la comanda. Aquests canvis s'aplicaran directament al Google Sheet i no es poden desfer.
          </Alert>

          <Typography variant="body2" gutterBottom>
            <strong>Canvis a aplicar:</strong>
          </Typography>
          <List dense>
            {selectedOrderForDrawer && (
              <>
                {editedOrderData.material !== selectedOrderForDrawer.material && (
                  <ListItem>
                    <ListItemText
                      primary="Material"
                      secondary={`"${selectedOrderForDrawer.material}" → "${editedOrderData.material}"`}
                    />
                  </ListItem>
                )}
                {editedOrderData.unitats !== selectedOrderForDrawer.unitats && (
                  <ListItem>
                    <ListItemText
                      primary="Unitats"
                      secondary={`${selectedOrderForDrawer.unitats} → ${editedOrderData.unitats}`}
                    />
                  </ListItem>
                )}
                {editedOrderData.comentarisGenerals !== selectedOrderForDrawer.comentarisGenerals && (
                  <ListItem>
                    <ListItemText
                      primary="Comentaris"
                      secondary={`"${selectedOrderForDrawer.comentarisGenerals || '-'}" → "${editedOrderData.comentarisGenerals || '-'}"`}
                    />
                  </ListItem>
                )}
              </>
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmEditDialogOpen(false)}
            disabled={isSavingEdits}
          >
            Cancel·lar
          </Button>
          <Button
            onClick={handleConfirmSaveEdits}
            variant="contained"
            color="primary"
            disabled={isSavingEdits}
            startIcon={isSavingEdits ? <CircularProgress size={16} /> : <Save />}
          >
            {isSavingEdits ? 'Guardant...' : 'Confirmar i Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}