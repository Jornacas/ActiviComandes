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
    activitat?: string;
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
  destinatari?: {
    nom: string;
    activitat: string;
  };
  nomCognoms?: string;
  dataNecessitat?: string;
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
  const [selectedOption, setSelectedOption] = useState<DeliveryOption | null>(null);
  const [selectedMonitors, setSelectedMonitors] = useState<{[key: number]: string}>({});
  const [selectedDates, setSelectedDates] = useState<{[key: number]: string}>({});
  const [dateErrors, setDateErrors] = useState<{[key: number]: string}>({});
  const [dateWarnings, setDateWarnings] = useState<{[key: number]: string}>({});

  // Función para validar que no sea domingo y que esté dentro del plazo de necesidad
  const validateDate = (dateString: string, optionIndex: number, option: DeliveryOption) => {
    if (!dateString) {
      const newErrors = {...dateErrors};
      const newWarnings = {...dateWarnings};
      delete newErrors[optionIndex];
      delete newWarnings[optionIndex];
      setDateErrors(newErrors);
      setDateWarnings(newWarnings);
      return true;
    }

    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.

    // Validar que no sea domingo
    if (dayOfWeek === 0) {
      setDateErrors({...dateErrors, [optionIndex]: 'No es poden programar lliuraments els diumenges (no hi ha activitats)'});
      const newWarnings = {...dateWarnings};
      delete newWarnings[optionIndex];
      setDateWarnings(newWarnings);
      return false;
    }

    // Validar que esté dentro del plazo de necesidad
    let warningMessages: string[] = [];
    let hasOutOfRange = false;

    option.comandes.forEach(order => {
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
      setDateWarnings({...dateWarnings, [optionIndex]: `⚠️ Aviso: La data de lliurament és posterior a la data de necessitat per algunes comandes: ${warningMessages.join(', ')}`});
    } else {
      const newWarnings = {...dateWarnings};
      delete newWarnings[optionIndex];
      setDateWarnings(newWarnings);
    }

    const newErrors = {...dateErrors};
    delete newErrors[optionIndex];
    setDateErrors(newErrors);
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

      const result = await apiClient.getDeliveryOptions(selectedOrdersData);

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

  const createDeliveryForOption = async (option: DeliveryOption, optionIndex: number, deliveryType: boolean | 'direct') => {
    const selectedMonitor = selectedMonitors[optionIndex];
    const dataEntrega = selectedDates[optionIndex];

    // deliveryType puede ser: true (recollida), 'direct' (entrega directa), false (intermediari)
    const isPickup = deliveryType === true;
    const isDirectDelivery = deliveryType === 'direct';
    const isIntermediary = deliveryType === false;

    if (isIntermediary && !selectedMonitor) {
      setError('Selecciona un monitor intermediari');
      return;
    }

    // Validar que no sea domingo (los avisos no bloquean el proceso)
    if (dataEntrega && dateErrors[optionIndex]) {
      setError('No es poden programar lliuraments els diumenges');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get order IDs from this option
      const orderIds = option.comandes.map(c => c.id);

      // Buscar la escolaDestino y escolaRecollida
      let escolaDestino = '';
      let escolaRecollida = '';
      if (isIntermediary && selectedMonitor) {
        // Para opciones Fase 2: usar escolaDestino (donde ENTREGA el intermediario)
        // Para opciones normales: usar escola (escuela del destinatario final)
        escolaDestino = option.escolaDestino || option.escola || '';

        // Buscar la escola donde recoge el intermediario
        const monitorInfo = option.monitorsDisponibles?.find(m => m.nom === selectedMonitor);
        escolaRecollida = monitorInfo?.escola || '';
      } else if (isDirectDelivery) {
        escolaDestino = option.escola || '';
      }

      const deliveryData = {
        orderIds: orderIds,
        modalitat: isPickup ? 'Recollida' : isDirectDelivery ? 'Directa' : 'Intermediari',
        monitorIntermediaria: isIntermediary ? selectedMonitor : '',
        escolaDestino: escolaDestino,
        escolaRecollida: escolaRecollida,
        dataEntrega: dataEntrega || ''
      };

      const result = await apiClient.createDelivery(deliveryData);

      if (result.success) {
        // NO enviar notificaciones automáticamente - deben enviarse manualmente
        // await sendNotificationsForDelivery(option, isDirect, selectedMonitor, dataEntrega, orderIds);

        setSuccess(result.message || 'Lliurament assignat correctament');

        setDeliveryDialogOpen(false);
        setSelectedOrders([]);
        setSelectedMonitors({});
        setSelectedDates({});
        setDateErrors({});
        setDateWarnings({});
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

  // Función para enviar notificaciones después de crear un delivery
  const sendNotificationsForDelivery = async (
    option: DeliveryOption,
    deliveryType: boolean | 'direct',
    selectedMonitor: string | undefined,
    dataEntrega: string,
    orderIds: string[]
  ) => {
    const isPickup = deliveryType === true;
    const isDirectDelivery = deliveryType === 'direct';
    const isIntermediary = deliveryType === false;
    try {
      const destinatarioNom = option.nomCognoms || option.comandes[0]?.nomCognoms;
      const escolaReceptora = option.escola;
      const activitat = option.destinatari?.activitat || 'N/A';

      // Construir spaceName basado en la escuela y actividad del destinatario
      let spaceName = escolaReceptora.replace(/\s+/g, '');
      if (!spaceName.startsWith('/')) {
        spaceName = '/' + spaceName;
      }
      if (activitat && activitat !== 'N/A' && activitat.trim() !== '') {
        spaceName += activitat;
      }

      // Agrupar pedidos por destinatario único
      const pedidosPorDestinatario = new Map<string, Array<any>>();
      option.comandes.forEach(comanda => {
        const dest = comanda.nomCognoms || destinatarioNom;
        if (!pedidosPorDestinatario.has(dest)) {
          pedidosPorDestinatario.set(dest, []);
        }
        pedidosPorDestinatario.get(dest)!.push(comanda);
      });

      // LÓGICA MEJORADA DE NOTIFICACIONES

      if (isPickup) {
        // ══════════════════════════════════════════════
        // CASO 1: RECOLLIDA A EIXOS CREATIVA
        // ══════════════════════════════════════════════
        for (const [dest, pedidos] of pedidosPorDestinatario) {
          const materialsText = pedidos.map((p, idx) =>
            `   ${idx + 1}. ${p.material} (${p.unitats || 1} unitats)`
          ).join('\n');

          const recipientMessage = `📦 MATERIAL PREPARAT PER A ${dest}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Destinatària: ${dest}
🏫 Escoles: ${escolaReceptora}

📦 MATERIALS:
${materialsText}

📍 RECOLLIDA:
🏢 Recollida a Eixos Creativa
📍 Adreça: Carrer de la Llacuna, 162, 08018 Barcelona
📅 Data prevista: ${formatDate(dataEntrega)}
🕒 Horari: Dilluns a Divendres, 9h-18h

ℹ️ NOTA: Pots recollir el material a la nostra oficina en l'horari indicat.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          console.log('📤 Enviando notificación recollida oficina:', spaceName);
          await apiClient.sendGroupedNotification(
            spaceName,
            recipientMessage,
            pedidos.map(p => p.idItem),
            'destinatario'
          );
        }

      } else if (isDirectDelivery) {
        // ══════════════════════════════════════════════
        // CASO 2: ENTREGA DIRECTA DESDE EIXOS
        // ══════════════════════════════════════════════
        for (const [dest, pedidos] of pedidosPorDestinatario) {
          // Agrupar pedidos por escuela
          const pedidosPorEscola = new Map();
          for (const pedido of pedidos) {
            const escola = pedido.escola;
            if (!pedidosPorEscola.has(escola)) {
              pedidosPorEscola.set(escola, []);
            }
            pedidosPorEscola.get(escola).push(pedido);
          }

          // Construir el texto de materiales agrupado por escuela
          let materialsText = '';
          let counter = 1;

          // Primero mostrar materiales para la escuela receptora (donde se entrega)
          if (pedidosPorEscola.has(escolaReceptora)) {
            materialsText += `🏫 Material per ${escolaReceptora}:\n`;
            const pedidosEscolaReceptora = pedidosPorEscola.get(escolaReceptora);
            pedidosEscolaReceptora.forEach((p: any) => {
              materialsText += `   ${counter}. ${p.material} (${p.unitats || 1} unitats)\n`;
              counter++;
            });
            materialsText += '\n';
          }

          // Luego mostrar materiales para otras escuelas (que debe llevar)
          const otrasEscuelas: Array<{ escola: string; dataNecessitat: string }> = [];
          for (const [escola, pedidosEscola] of pedidosPorEscola) {
            if (escola !== escolaReceptora) {
              // Buscar la fecha de necesidad de estos pedidos
              const dataNecessitat = pedidosEscola[0]?.dataNecessitat || '';
              const dataFormatted = dataNecessitat ? ` (per portar el ${formatDate(dataNecessitat)})` : '';

              materialsText += `🏫 Material per ${escola}${dataFormatted}:\n`;
              pedidosEscola.forEach((p: any) => {
                materialsText += `   ${counter}. ${p.material} (${p.unitats || 1} unitats)\n`;
                counter++;
              });
              materialsText += '\n';

              // Guardar info de otras escuelas para la nota
              otrasEscuelas.push({
                escola: escola,
                dataNecessitat: dataNecessitat
              });
            }
          }

          // Construir nota dinámica según si hay múltiples escuelas
          let nota = '';
          if (otrasEscuelas.length === 0) {
            // Solo una escuela: nota simple
            nota = `ℹ️ NOTA: L'equip d'Eixos Creativa portarà tot el material directament a ${escolaReceptora}.`;
          } else {
            // Múltiples escuelas: nota con trazabilidad completa
            nota = `ℹ️ NOTA: Recolliràs tot el material a ${escolaReceptora} el ${formatDate(dataEntrega)}.`;
            otrasEscuelas.forEach(({ escola, dataNecessitat }) => {
              if (dataNecessitat) {
                nota += `\nRecorda portar el material de ${escola} el ${formatDate(dataNecessitat)}.`;
              } else {
                nota += `\nRecorda portar el material de ${escola}.`;
              }
            });
          }

          const recipientMessage = `📦 MATERIAL PREPARAT PER A ${dest}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Destinatària: ${dest}
🏫 Escola d'entrega: ${escolaReceptora}

📦 MATERIALS:
${materialsText}
📍 ENTREGA:
🚚 Entrega directa per l'equip d'Eixos Creativa
🏫 Escola: ${escolaReceptora}
📅 Data prevista: ${formatDate(dataEntrega)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

${nota}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          console.log('📤 Enviando notificación entrega directa Eixos:', spaceName);
          await apiClient.sendGroupedNotification(
            spaceName,
            recipientMessage,
            pedidos.map(p => p.idItem),
            'destinatario'
          );
        }

      } else if (selectedMonitor) {
        // ══════════════════════════════════════════════
        // CASO 3-6: ENTREGA CON INTERMEDIARIO
        // ══════════════════════════════════════════════

        // Separar pedidos: del intermediario vs de otros
        const pedidosIntermediari = option.comandes.filter(c => c.nomCognoms === selectedMonitor);
        const pedidosOtros = option.comandes.filter(c => c.nomCognoms !== selectedMonitor);

        // Obtener destinatarios únicos (excluyendo al intermediario)
        const destinatariosOtros = [...new Set(pedidosOtros.map(p => p.nomCognoms))];

        const monitorInfo = option.monitorsDisponibles.find(m => m.nom === selectedMonitor);
        const escolaRecollida = monitorInfo?.escola || 'N/A';

        // Construir spaceName del intermediario
        let intermediarySpaceName = escolaRecollida.replace(/\s+/g, '');
        if (!intermediarySpaceName.startsWith('/')) {
          intermediarySpaceName = '/' + intermediarySpaceName;
        }
        if (monitorInfo?.activitat && monitorInfo.activitat !== 'N/A') {
          intermediarySpaceName += monitorInfo.activitat;
        }

        // ═════ NOTIFICACIÓN AL INTERMEDIARIO ═════
        let intermediaryMessage = '';

        if (pedidosIntermediari.length > 0 && pedidosOtros.length === 0) {
          // CASO 3: Intermediario = Destinatario (solo su material)
          const materialsText = pedidosIntermediari.map((p, idx) =>
            `   ${idx + 1}. ${p.material} (${p.unitats || 1} unitats)`
          ).join('\n');

          intermediaryMessage = `📦 RECOLLIDA DEL TEU MATERIAL - ${selectedMonitor}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 RECOLLIDA:
🏫 Escola: ${escolaRecollida}
📅 Data: ${formatDate(dataEntrega)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

🟢 EL TEU MATERIAL:
${materialsText}

📤 DESTÍ FINAL:
🏫 Escola: ${escolaReceptora}
📅 Data que necessites: ${formatDate(dataEntrega)}

ℹ️ NOTA: Recolliràs el teu material a ${escolaRecollida}
i te'l portaràs a ${escolaReceptora} per a la teva activitat.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        } else if (pedidosIntermediari.length > 0 && pedidosOtros.length > 0) {
          // CASO 4: Intermediario = Destinatario + otros
          const materialsPropisText = pedidosIntermediari.map((p, idx) =>
            `   ${idx + 1}. ${p.material} (${p.unitats || 1} unitats)`
          ).join('\n');

          const paquetsText = destinatariosOtros.map(dest => {
            const pedidoDest = pedidosOtros.find(p => p.nomCognoms === dest);
            // Para opciones de coincidencia, calcular la fecha del día que el intermediario entrega
            const deliveryDate = monitorInfo?.destinoFinal?.dies?.[0]
              ? getNextDateForWeekday(dataEntrega, monitorInfo.destinoFinal.dies[0])
              : dataEntrega;
            // Para opciones Fase 2: usar escola de coincidencia (destinoFinal.escola)
            // Para opciones normales: usar escola del destinatario final
            const escolaEntrega = monitorInfo?.destinoFinal?.escola || pedidoDest?.escola || escolaReceptora;
            return `   • ${dest} (${escolaEntrega}, ${formatDate(deliveryDate)})`;
          }).join('\n');

          intermediaryMessage = `📦 RECOLLIDA DE MATERIALS - ${selectedMonitor}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 El teu rol: Intermediària i Destinatària

📥 RECOLLIDA:
🏫 Escola: ${escolaRecollida}
📅 Data: ${formatDate(dataEntrega)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

🟢 EL TEU MATERIAL:
${materialsPropisText}

🔵 PAQUETS PER ENTREGAR:
${paquetsText}

ℹ️ NOTA: Recolliràs el teu material i paquets per altres companys.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        } else if (pedidosIntermediari.length === 0 && pedidosOtros.length > 0) {
          // CASO 2: Solo intermediario (sin materiales propios)
          const paquetsText = destinatariosOtros.map(dest => {
            const pedidoDest = pedidosOtros.find(p => p.nomCognoms === dest);
            // Para opciones de coincidencia, calcular la fecha del día que el intermediario entrega
            const deliveryDate = monitorInfo?.destinoFinal?.dies?.[0]
              ? getNextDateForWeekday(dataEntrega, monitorInfo.destinoFinal.dies[0])
              : dataEntrega;
            // Para opciones Fase 2: usar escola de coincidencia (destinoFinal.escola)
            // Para opciones normales: usar escola del destinatario final
            const escolaEntrega = monitorInfo?.destinoFinal?.escola || pedidoDest?.escola || escolaReceptora;
            return `   • ${dest} (${escolaEntrega}, ${formatDate(deliveryDate)})`;
          }).join('\n');

          intermediaryMessage = `🔔 NOVA ASSIGNACIÓ COM A INTERMEDIÀRIA - ${selectedMonitor}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 RECOLLIDA:
🏫 Escola: ${escolaRecollida}
📅 Data: ${formatDate(dataEntrega)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

📤 PAQUETS PER ENTREGAR:
${paquetsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        }

        // Enviar notificación al intermediario
        if (intermediaryMessage) {
          console.log('📤 Enviando notificación al intermediario:', intermediarySpaceName);
          const intermediaryResult = await apiClient.sendGroupedNotification(
            intermediarySpaceName,
            intermediaryMessage,
            orderIds,
            'intermediario'
          );

          if (intermediaryResult.success) {
            console.log('✅ Notificación al intermediario enviada');
          } else {
            console.warn('⚠️ Error enviando notificación al intermediario:', intermediaryResult.error);
          }
        }

        // ═════ NOTIFICACIONES A DESTINATARIOS (solo si !== intermediario) ═════
        for (const [dest, pedidos] of pedidosPorDestinatario) {
          // Si el destinatario es el intermediario, ya recibió notificación combinada
          if (dest === selectedMonitor) {
            console.log(`⏩ Saltando notificación de destinatario para ${dest} (es el intermediario)`);
            continue;
          }

          const materialsText = pedidos.map((p, idx) =>
            `   ${idx + 1}. ${p.material} (${p.unitats || 1} unitats)`
          ).join('\n');

          // Para opciones Fase 2: usar escola de coincidencia (destinoFinal.escola)
          // Para opciones normales: usar escola del destinatario final
          const escolaEntrega = monitorInfo?.destinoFinal?.escola || escolaReceptora;

          // Calcular fecha de entrega del intermediario
          const deliveryDate = monitorInfo?.destinoFinal?.dies?.[0]
            ? getNextDateForWeekday(dataEntrega, monitorInfo.destinoFinal.dies[0])
            : dataEntrega;

          // Fecha del destino final (actividad del destinatario)
          const finalDestinationDate = pedidos[0]?.dataNecessitat || dataEntrega;

          const recipientMessage = `📦 MATERIAL PREPARAT PER A ${dest}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Destinatària: ${dest}

📦 MATERIALS:
${materialsText}

📥 RECOLLIDA:
👤 Intermediària: ${selectedMonitor}
🏫 Escola: ${escolaEntrega}
📅 Data: ${formatDate(deliveryDate)}
📍 Ubicació: Consergeria, AFA o Caixa de Material

📤 DESTÍ FINAL:
🏫 Escola: ${escolaReceptora}
📅 Data: ${formatDate(finalDestinationDate)}
🎯 Per a la teva activitat a aquesta escola
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          console.log('📤 Enviando notificación a destinatario:', dest);
          await apiClient.sendGroupedNotification(
            spaceName,
            recipientMessage,
            pedidos.map(p => p.idItem),
            'destinatario'
          );
        }
      }
    } catch (error) {
      console.error('❌ Error enviando notificaciones:', error);
      // No bloqueamos el proceso si fallan las notificaciones
    }
  };

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
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
                Opcions de lliurament disponibles - Selecciona l'opció desitjada:
              </Typography>

              {deliveryOptions.map((option, index) => {
                const getEfficiencyDisplay = (eficiencia: string) => {
                  switch (eficiencia) {
                    case 'Màxima':
                      return { icon: <Star sx={{ fontSize: 16 }} />, color: 'success' as const, label: '★★★ Màxima' };
                    case 'Alta':
                      return { icon: <Star sx={{ fontSize: 16 }} />, color: 'info' as const, label: '★★☆ Alta' };
                    case 'Mitjana':
                      return { icon: <StarHalf sx={{ fontSize: 16 }} />, color: 'warning' as const, label: '★☆☆ Mitjana' };
                    case 'Baixa':
                      return { icon: <StarOutline sx={{ fontSize: 16 }} />, color: 'error' as const, label: '☆☆☆ Baixa' };
                    default:
                      return { icon: <StarOutline sx={{ fontSize: 16 }} />, color: 'default' as const, label: '? Desconeguda' };
                  }
                };

                const canPickupAtOffice = option.monitorsDisponibles.some(m => m.tipus === 'recollida');
                const canDeliverDirect = option.monitorsDisponibles.some(m => m.tipus === 'entrega-directa');
                const canDeliverViaIntermediary = option.monitorsDisponibles.some(m => m.tipus === 'intermediari');

                return (
                  <Card
                    key={index}
                    sx={{
                      mb: 3,
                      border: option.prioritat === 1 ? '2px solid #4caf50' : '1px solid #e0e0e0',
                      backgroundColor: option.prioritat === 1 ? '#f8fff8' : 'white'
                    }}
                  >
                    <CardContent>
                      {/* Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person color="primary" />
                            <Typography variant="h6">
                              {option.nomCognoms || option.comandes[0]?.nomCognoms}
                            </Typography>
                            {option.prioritat === 1 && (
                              <Chip label="RECOMANAT" size="small" color="success" sx={{ ml: 1 }} />
                            )}
                          </Box>
                          {option.dataNecessitat && (
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                              📅 <strong>Necessari per:</strong> {formatDate(option.dataNecessitat)}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          icon={getEfficiencyDisplay(option.eficiencia).icon}
                          label={getEfficiencyDisplay(option.eficiencia).label}
                          size="small"
                          color={getEfficiencyDisplay(option.eficiencia).color}
                        />
                      </Box>

                      {/* Recipient Activity */}
                      {option.destinatari && (
                        <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#f3e5f5', borderRadius: 1, borderLeft: '4px solid #9c27b0' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7b1fa2' }}>
                            🎭 Activitat: {option.destinatari.activitat}
                          </Typography>
                        </Box>
                      )}

                      {/* Location and Summary */}
                      <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <School color="primary" fontSize="small" />
                            <Typography variant="subtitle2">
                              <strong>{option.escola}</strong>
                              {option.escolaDestino && (
                                <span style={{ color: '#666', fontWeight: 'normal' }}> (intermediària) → <strong>{option.escolaDestino}</strong> (destí final)</span>
                              )}
                            </Typography>
                          </Box>
                          {/* Mostrar días de actividad en la escuela */}
                          {option.monitorsDisponibles && option.monitorsDisponibles.length > 0 && (() => {
                            // For direct delivery, show recipient's activity days
                            // For intermediary delivery, show intermediary's availability days
                            const directDeliveryMonitor = option.monitorsDisponibles.find(m => m.tipus === 'entrega-directa');
                            const intermediaryMonitor = option.monitorsDisponibles.find(m => m.tipus === 'intermediari');
                            const monitor = directDeliveryMonitor || intermediaryMonitor;

                            return monitor?.dies && monitor.dies.length > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Schedule color="action" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  Dies disponibles: {monitor.dies.join(', ')}
                                </Typography>
                              </Box>
                            );
                          })()}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                            <Chip
                              icon={<LocalShipping />}
                              label={`${option.comandes.length} comanda${option.comandes.length > 1 ? 'es agrupades' : ''}`}
                              size="small"
                              color="primary"
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

                      {/* Orders List - Grouped by Escola */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          Materials:
                        </Typography>
                        <List dense sx={{ pt: 0.5 }}>
                          {(() => {
                            // Group materials by escola
                            const materialsBySchool = new Map<string, Array<{material: string, unitats: number, idItem: string}>>();
                            option.comandes.forEach(comanda => {
                              const escola = comanda.escola;
                              if (!materialsBySchool.has(escola)) {
                                materialsBySchool.set(escola, []);
                              }
                              materialsBySchool.get(escola)!.push({
                                material: comanda.material,
                                unitats: comanda.unitats,
                                idItem: comanda.idItem
                              });
                            });

                            // Render grouped materials
                            return Array.from(materialsBySchool.entries()).map(([escola, materials], schoolIndex) => (
                              <Box key={escola}>
                                {materialsBySchool.size > 1 && (
                                  <ListItem sx={{ py: 0.25, px: 0 }}>
                                    <ListItemText
                                      primary={`🏫 Per ${escola}:`}
                                      primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', color: 'primary.main' }}
                                    />
                                  </ListItem>
                                )}
                                {materials.map((item) => (
                                  <ListItem key={item.idItem} sx={{ py: 0.25, px: materialsBySchool.size > 1 ? 2 : 0 }}>
                                    <ListItemText
                                      primary={materialsBySchool.size > 1
                                        ? `• ${item.material} (${item.unitats})`
                                        : `• ${item.material} (${item.unitats}) - ${escola}`}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                ))}
                                {materialsBySchool.size > 1 && schoolIndex < materialsBySchool.size - 1 && (
                                  <Box sx={{ height: 8 }} />
                                )}
                              </Box>
                            ));
                          })()}
                        </List>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Delivery Actions */}
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                        Selecciona modalitat de lliurament:
                      </Typography>

                      <Stack spacing={2}>
                        {/* Pickup at Eixos Office Option */}
                        {canPickupAtOffice && (
                          <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                              <DirectionsCar sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              Recollida a Eixos Creativa
                            </Typography>

                            <TextField
                              fullWidth
                              type="date"
                              label="Data de lliurament"
                              size="small"
                              value={selectedDates[index] || ''}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setSelectedDates({...selectedDates, [index]: newDate});
                                validateDate(newDate, index, option);
                              }}
                              error={!!dateErrors[index]}
                              helperText={dateErrors[index]}
                              InputLabelProps={{ shrink: true }}
                              sx={{ mb: 1.5 }}
                            />

                            {dateWarnings[index] && (
                              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                                <Typography variant="caption">{dateWarnings[index]}</Typography>
                              </Alert>
                            )}

                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              disabled={loading || !selectedDates[index] || !!dateErrors[index]}
                              onClick={() => createDeliveryForOption(option, index, true)}
                              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
                            >
                              Recollida a Eixos
                            </Button>
                          </Box>
                        )}

                        {/* Direct Delivery from Eixos Option */}
                        {canDeliverDirect && (
                          <Box sx={{ p: 2, border: '1px solid #2196f3', borderRadius: 1, backgroundColor: '#e3f2fd' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                              <LocalShipping sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              Entrega Directa des d'Eixos
                            </Typography>

                            <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                              <Typography variant="caption">
                                🚚 L'equip d'Eixos Creativa portarà el material directament a l'escola
                              </Typography>
                            </Alert>

                            <TextField
                              fullWidth
                              type="date"
                              label="Data de lliurament"
                              size="small"
                              value={selectedDates[index] || ''}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setSelectedDates({...selectedDates, [index]: newDate});
                                validateDate(newDate, index, option);
                              }}
                              error={!!dateErrors[index]}
                              helperText={dateErrors[index]}
                              InputLabelProps={{ shrink: true }}
                              sx={{ mb: 1.5 }}
                            />

                            {dateWarnings[index] && (
                              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                                <Typography variant="caption">{dateWarnings[index]}</Typography>
                              </Alert>
                            )}

                            <Button
                              variant="contained"
                              color="info"
                              fullWidth
                              disabled={loading || !selectedDates[index] || !!dateErrors[index]}
                              onClick={() => createDeliveryForOption(option, index, 'direct')}
                              startIcon={loading ? <CircularProgress size={16} /> : <LocalShipping />}
                            >
                              Assignar Entrega Directa
                            </Button>
                          </Box>
                        )}

                        {/* Intermediary Delivery Option */}
                        {canDeliverViaIntermediary && (
                          <Box sx={{ p: 2, border: '1px solid #4caf50', borderRadius: 1, backgroundColor: '#f1f8f4' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                              <Person sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              Lliurament amb Intermediari
                            </Typography>

                            {/* Mostrar lista de monitores disponibles */}
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                                Monitors intermediaris disponibles:
                              </Typography>
                              <Stack spacing={1}>
                                {option.monitorsDisponibles
                                  .filter(m => m.tipus === 'intermediari')
                                  .map((monitor, idx) => (
                                    <Card
                                      key={idx}
                                      sx={{
                                        p: 1.5,
                                        border: selectedMonitors[index] === monitor.nom ? '2px solid #4caf50' : '1px solid #e0e0e0',
                                        backgroundColor: selectedMonitors[index] === monitor.nom ? '#e8f5e9' : 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                          borderColor: '#4caf50',
                                          backgroundColor: '#f1f8f4'
                                        }
                                      }}
                                      onClick={() => setSelectedMonitors({...selectedMonitors, [index]: monitor.nom})}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                            {monitor.nom}
                                            {monitor.activitat && monitor.activitat !== 'N/A' && (
                                              <span style={{ fontWeight: 'normal', color: '#666' }}> - {monitor.activitat}</span>
                                            )}
                                            {selectedMonitors[index] === monitor.nom && (
                                              <Chip label="SELECCIONAT" size="small" color="success" sx={{ ml: 1, height: 18 }} />
                                            )}
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {monitor.dies && monitor.dies.length > 0 && (
                                              <Typography variant="caption" component="div" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                📅 <strong>Dies:</strong> {monitor.dies.join(', ')}
                                              </Typography>
                                            )}
                                            {monitor.escola && (
                                              <Typography variant="caption" component="div" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                🏫 <strong>Escola intermediària:</strong> {monitor.escola}
                                              </Typography>
                                            )}
                                            {monitor.destinoFinal && (
                                              <Typography variant="caption" component="div" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                🎯 <strong>Destí final:</strong> {monitor.destinoFinal.escola} ({monitor.destinoFinal.dies?.join(', ')})
                                              </Typography>
                                            )}
                                          </Box>
                                        </Box>
                                        {selectedMonitors[index] === monitor.nom && (
                                          <CheckCircle color="success" sx={{ ml: 1 }} />
                                        )}
                                      </Box>
                                    </Card>
                                  ))}
                              </Stack>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <TextField
                              fullWidth
                              type="date"
                              label="Data de lliurament"
                              size="small"
                              value={selectedDates[index] || ''}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setSelectedDates({...selectedDates, [index]: newDate});
                                validateDate(newDate, index, option);
                              }}
                              error={!!dateErrors[index]}
                              helperText={dateErrors[index]}
                              InputLabelProps={{ shrink: true }}
                              sx={{ mb: 1.5 }}
                            />

                            {dateWarnings[index] && (
                              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                                <Typography variant="caption">{dateWarnings[index]}</Typography>
                              </Alert>
                            )}

                            <Button
                              variant="contained"
                              color="success"
                              fullWidth
                              disabled={loading || !selectedMonitors[index] || !selectedDates[index] || !!dateErrors[index]}
                              onClick={() => createDeliveryForOption(option, index, false)}
                              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
                            >
                              Assignar Intermediari
                            </Button>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeliveryDialogOpen(false);
            setSelectedMonitors({});
            setSelectedDates({});
            setDateErrors({});
            setDateWarnings({});
          }}>
            Cancel·lar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}