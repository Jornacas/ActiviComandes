'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import { useMediaQuery, useTheme } from '@mui/material';
import { API_BASE_URL, API_TOKEN } from '../lib/api';
import { formatDateCatalan } from '../utils/orderUtils';

interface NotificationManagerProps {
  orders: any[];
  notificationStatuses: Record<string, any>;
  loadingNotificationStatuses: boolean;
  onNotificationStatusesChange: (statuses: Record<string, any>) => void;
  onLoadingStatusesChange: (loading: boolean) => void;
  onRefreshData: () => void;
}

export interface NotificationManagerRef {
  openModal: (order: any, type: 'intermediario' | 'destinatario') => void;
  loadStatuses: (orderIds: any[]) => void;
}

const NotificationManager = forwardRef<NotificationManagerRef, NotificationManagerProps>(
  ({ orders, notificationStatuses, loadingNotificationStatuses, onNotificationStatusesChange, onLoadingStatusesChange, onRefreshData }, ref) => {
    const nmTheme = useTheme();
    const nmIsMobile = useMediaQuery(nmTheme.breakpoints.down('sm'));

    // Internal state
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [selectedOrderForNotification, setSelectedOrderForNotification] = useState<any>(null);
    const [notificationType, setNotificationType] = useState<'intermediario' | 'destinatario'>('intermediario');
    const [customMessage, setCustomMessage] = useState('');
    const [isSendingNotification, setIsSendingNotification] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState<{
      open: boolean;
      message: string;
      severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'info' });

    // Helper: format date in Catalan style (uses the same logic as OrdersTable's formatDate)
    const formatDate = formatDateCatalan;

    // Función para generar el mensaje de notificación MEJORADO
    const generateNotificationMessage = (order: any, type: 'intermediario' | 'destinatario'): string => {
      // Agrupar materiales del mismo lote (ID_Lliurament)
      let orderMaterials = orders.filter(o =>
        o.idLliurament && o.idLliurament === order.idLliurament &&
        o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
      ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

      // Verificar si es entrega directa (sin intermediario o marcado como DIRECTA)
      const isDirectDelivery = !order.monitorIntermediari ||
                               order.monitorIntermediari.trim() === '' ||
                               order.monitorIntermediari.toUpperCase() === 'DIRECTA';

      // Si no hay materiales agrupados por lliurament, agrupar por destinatari + escola
      if (orderMaterials.length === 0 && isDirectDelivery) {
        orderMaterials = orders.filter(o =>
          o.nomCognoms === order.nomCognoms &&
          o.escola === order.escola &&
          o.dataNecessitat === order.dataNecessitat
        ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));
      }

      // CASO: Sin intermediario, sin lliurament — entrega directa simple
      if (isDirectDelivery && type === 'destinatario' && orderMaterials.length > 0 && !order.idLliurament) {
        const materialsText = orderMaterials.map((item: any, index: number) =>
          `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
        ).join('\n');

        const escola = order.escola || 'N/A';
        const dataStr = formatDate(order.dataNecessitat);

        return `MATERIAL PREPARAT - ${order.nomCognoms || 'N/A'}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Destinatari: ${order.nomCognoms || 'N/A'}
Escola: ${escola}
Data: ${dataStr}

MATERIALS:
${materialsText}

El material esta disponible a ${escola}.
Ubicacio: Consergeria, AFA o Caixa de Material.
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
      }

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
          const materialsText = materials.map((item: any, index: number) =>
            `      ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
          ).join('\n');

          return `\u{1F3EB} Per a ${school} (${deliveryDate}):\n${materialsText}`;
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
          noteText = `\n\u2139\uFE0F NOTA: Recorda portar el material a ${school} el dia ${date}.`;
        } else {
          // Múltiples escuelas adicionales
          noteText = '\n\u2139\uFE0F NOTA: Recorda distribuir el material a les diferents escoles segons les dates indicades.';
        }

        return `\u{1F4E6} RECOLLIDA DE MATERIAL - ${order.nomCognoms || 'N/A'}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} Destinat\u00E0ria: ${order.nomCognoms || 'N/A'}

\u{1F4E5} RECOLLIDA:
\u{1F3EB} Escola: ${pickupSchool}
\u{1F4C5} Data: ${pickupDate}
\u{1F4CD} Ubicaci\u00F3: Consergeria, AFA o Caixa de Material

\u{1F4E6} MATERIAL A REPARTIR:

${schoolsText}${noteText}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
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
          const materialsText = materialesPropios.map((item: any, index: number) =>
            `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
          ).join('\n');

          return `\u{1F4E6} RECOLLIDA DEL TEU MATERIAL - ${order.monitorIntermediari || 'N/A'}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4E5} RECOLLIDA:
\u{1F3EB} Escola: ${order.pickupSchool || 'N/A'}
\u{1F4C5} Data: ${formatDate(order.dataLliuramentPrevista)}
\u{1F4CD} Ubicaci\u00F3: Consergeria, AFA o Caixa de Material

\u{1F7E2} EL TEU MATERIAL:
${materialsText}

\u{1F4E4} DEST\u00CD FINAL:
\u{1F3EB} Escola: ${order.escola || 'N/A'}
\u{1F4C5} Data que necessites: ${formatDate(order.dataNecessitat)}

\u2139\uFE0F NOTA: Recollir\u00E0s el teu material a ${order.escolaDestinoIntermediari || 'N/A'}
i te'l portar\u00E0s a ${order.escola || 'N/A'} per a la teva activitat.
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
        }

        // CASO 5: Intermediario = Destinatario + otros
        if (materialesPropios.length > 0 && materialesOtros.length > 0) {
          const materialsPropisText = materialesPropios.map((item: any, index: number) =>
            `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
          ).join('\n');

          const paquetsText = destinatariosOtros.map(dest => {
            const orderDest = materialesOtros.find(o => o.nomCognoms === dest);
            // Para pedidos existentes: usar escolaDestinoIntermediari (escuela de coincidencia/entrega)
            // Si no existe, fallback a escola (escuela final del destinatario)
            const escolaDest = orderDest?.escolaDestinoIntermediari || orderDest?.escola || 'N/A';

            // Usar dataNecessitat del destinatario (fecha real en que necesita el material)
            const deliveryDate = orderDest?.dataNecessitat;

            return `   \u2022 ${dest} (${escolaDest}${deliveryDate ? ', ' + formatDate(deliveryDate) : ''})`;
          }).join('\n');

          return `\u{1F4E6} RECOLLIDA DE MATERIALS - ${order.monitorIntermediari || 'N/A'}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} El teu rol: Intermedi\u00E0ria i Destinat\u00E0ria

\u{1F4E5} RECOLLIDA:
\u{1F3EB} Escola: ${order.pickupSchool || 'N/A'}
\u{1F4C5} Data: ${formatDate(order.dataLliuramentPrevista)}
\u{1F4CD} Ubicaci\u00F3: Consergeria, AFA o Caixa de Material

\u{1F7E2} EL TEU MATERIAL:
${materialsPropisText}

\u{1F535} PAQUETS PER ENTREGAR:
${paquetsText}

\u2139\uFE0F NOTA: Recollir\u00E0s el teu material i paquets per altres companys.
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
        }

        // CASO 2: Solo intermediario (sin materiales propios)
        if (materialesPropios.length === 0 && materialesOtros.length > 0) {
          const paquetsText = destinatariosOtros.map(dest => {
            const orderDest = materialesOtros.find(o => o.nomCognoms === dest);
            // Para pedidos existentes: usar escolaDestinoIntermediari (escuela de coincidencia/entrega)
            // Si no existe, fallback a escola (escuela final del destinatario)
            const escolaDest = orderDest?.escolaDestinoIntermediari || orderDest?.escola || 'N/A';

            // Usar dataNecessitat del destinatario (fecha real en que necesita el material)
            const deliveryDate = orderDest?.dataNecessitat;

            return `   \u2022 ${dest} (${escolaDest}${deliveryDate ? ', ' + formatDate(deliveryDate) : ''})`;
          }).join('\n');

          return `\u{1F514} NOVA ASSIGNACI\u00D3 COM A INTERMEDI\u00C0RIA - ${order.monitorIntermediari || 'N/A'}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4E5} RECOLLIDA:
\u{1F3EB} Escola: ${order.pickupSchool || 'N/A'}
\u{1F4C5} Data: ${formatDate(order.dataLliuramentPrevista)}
\u{1F4CD} Ubicaci\u00F3: Consergeria, AFA o Caixa de Material

\u{1F4E4} PAQUETS PER ENTREGAR:
${paquetsText}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
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

        const materialsText = materialsDestinatario.map((item: any, index: number) =>
          `   ${index + 1}. ${item.material || 'N/A'} (${item.unitats || 1} unitats)`
        ).join('\n');

        // Usar dataLliuramentPrevista (fecha real de recogida del intermediario)
        const deliveryDate = order.dataLliuramentPrevista;

        return `\u{1F4E6} MATERIAL PREPARAT PER A ${order.nomCognoms || 'N/A'}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} Destinat\u00E0ria: ${order.nomCognoms || 'N/A'}

\u{1F4E6} MATERIALS:
${materialsText}

\u{1F4E5} RECOLLIDA:
\u{1F464} Intermedi\u00E0ria: ${order.monitorIntermediari || 'N/A'}
\u{1F3EB} Escola: ${order.escolaDestinoIntermediari || 'N/A'}
\u{1F4C5} Data: ${formatDate(deliveryDate)}
\u{1F4CD} Ubicaci\u00F3: Consergeria, AFA o Caixa de Material

\u{1F4E4} DEST\u00CD FINAL:
\u{1F3EB} Escola: ${order.escola || 'N/A'}
\u{1F4C5} Data: ${formatDate(order.dataNecessitat)}
\u{1F3AF} Per a la teva activitat a aquesta escola
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
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

    // Función para cargar todos los estados de notificaciones
    const loadNotificationStatuses = async (ordersToLoad: any[]) => {
      console.log('🔄 Cargando estados de notificaciones para', ordersToLoad.length, 'órdenes');
      onLoadingStatusesChange(true);

      try {
        // Obtener todos los IDs de una vez
        const allIds = ordersToLoad.map(order => order.idItem).filter(Boolean);
        console.log('📋 IDs a consultar:', allIds);

        if (allIds.length === 0) {
          console.log('⚠️ No hay IDs para consultar');
          onLoadingStatusesChange(false);
          return;
        }

        if (!API_BASE_URL) {
          throw new Error('API_BASE_URL no está configurada');
        }

        console.log('🌐 Consultando backend para múltiples IDs:', allIds.length);

        // Usar POST para evitar error 431 (URL demasiado larga)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${API_BASE_URL}/api/admin/notifications/statuses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
          },
          body: JSON.stringify({ orderIds: allIds }),
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
          onNotificationStatusesChange(statuses);
        } else {
          console.error('❌ Error obteniendo estados múltiples:', result.error);
          // Fallback: cargar como si todos fueran pendientes
          const statuses: {[key: string]: {intermediario: boolean, destinatario: boolean}} = {};
          for (const orderId of allIds) {
            statuses[orderId] = { intermediario: false, destinatario: false };
          }
          onNotificationStatusesChange(statuses);
        }

      } catch (error) {
        console.error('❌ Error cargando estados de notificaciones:', error);
        // Fallback: cargar como si todos fueran pendientes
        const allIds = ordersToLoad.map(order => order.idItem).filter(Boolean);
        const statuses: {[key: string]: {intermediario: boolean, destinatario: boolean}} = {};
        for (const orderId of allIds) {
          statuses[orderId] = { intermediario: false, destinatario: false };
        }
        onNotificationStatusesChange(statuses);
      } finally {
        onLoadingStatusesChange(false);
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
          const newStatuses = { ...notificationStatuses };
          for (const orderId of orderIds) {
            newStatuses[orderId] = {
              ...newStatuses[orderId],
              [notificationType]: true
            };
          }
          onNotificationStatusesChange(newStatuses);

          // Mostrar mensaje de éxito con el espacio donde se envió
          setNotificationStatus({
            open: true,
            message: `Notificaci\u00F3 enviada correctament a ${notificationType === 'intermediario' ? 'intermediari' : 'destinatari'} en l'espai: ${spaceName} (${orderIds.length} materials marcats)`,
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
          message: `Error enviant notificaci\u00F3: ${error}`,
          severity: 'error'
        });
      } finally {
        setIsSendingNotification(false);
      }
    };

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      openModal: openNotificationModal,
      loadStatuses: loadNotificationStatuses,
    }));

    return (
      <>
        {/* Modal de notificaciones */}
        <Dialog
          open={notificationModalOpen}
          onClose={() => setNotificationModalOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={nmIsMobile}
        >
          <DialogTitle>
            {'📤 Enviar Notificació '}{notificationType === 'intermediario' ? "a l'Intermediari" : 'al Destinatari'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Destinatari:</strong> {
                  notificationType === 'intermediario'
                    ? selectedOrderForNotification?.monitorIntermediari
                    : selectedOrderForNotification?.nomCognoms
                }
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                <strong>Material:</strong> {selectedOrderForNotification?.material}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                <strong>Missatge a enviar:</strong>
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={8}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                variant="outlined"
                sx={{ mt: 1 }}
                placeholder="Edita el missatge aquí..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setNotificationModalOpen(false)}
              disabled={isSendingNotification}
            >
              {'Cancel·lar'}
            </Button>
            <Button
              onClick={sendNotification}
              variant="contained"
              color="primary"
              disabled={isSendingNotification}
              startIcon={isSendingNotification ? <CircularProgress size={20} /> : <span>{'\u{1F4E4}'}</span>}
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
      </>
    );
  }
);

NotificationManager.displayName = 'NotificationManager';

export default NotificationManager;
