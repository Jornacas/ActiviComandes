'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';

interface OrderDetailPanelProps {
  order: any;
  notificationStatuses: {[key: string]: {intermediario: boolean, destinatario: boolean}};
  onEdit?: (order: any) => void;
  onDelete?: (orderId: string) => void;
  onSendNotification?: (order: any, type: 'intermediario' | 'destinatario') => void;
}

export default function OrderDetailPanel({ 
  order, 
  notificationStatuses,
  onEdit,
  onDelete,
  onSendNotification 
}: OrderDetailPanelProps) {
  
  const formatDate = (dateString: string) => {
    if (!dateString || dateString.trim() === '') return '--';
    
    try {
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
    } catch {
      return dateString;
    }
  };

  const hasIntermediary = order.monitorIntermediari && order.monitorIntermediari.trim() !== '';
  const notifStatus = notificationStatuses[order.idItem];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        bgcolor: '#f8f9fa',
        borderTop: '2px solid #e0e0e0'
      }}
    >
      <Stack spacing={1.5}>
        {/* Fila 1: Información básica del pedido */}
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Typography variant="body2">
            <strong>Activitat:</strong> {order.activitat}
          </Typography>
          <Typography variant="body2">
            <strong>Unitats:</strong> {order.unitats}
          </Typography>
          {order.esMaterialPersonalitzat === 'TRUE' && (
            <Chip label="Personalitzat" size="small" color="warning" sx={{ height: 18, fontSize: '0.7rem' }} />
          )}
        </Stack>

        {/* Fila 2: Fechas importantes */}
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Typography variant="body2">
            <strong>📅 Sol·licitud:</strong> {order.timestamp ? new Date(order.timestamp).toLocaleDateString('ca-ES') : '--'}
          </Typography>
          <Typography variant="body2">
            <strong>Necessitat:</strong> {formatDate(order.dataNecessitat)}
          </Typography>
          {order.Data_Lliurament_Prevista && (
            <Typography variant="body2">
              <strong>Lliurament:</strong> {formatDate(order.Data_Lliurament_Prevista)}
            </Typography>
          )}
        </Stack>

        {/* Fila 3: Entrega (si tiene intermediario) */}
        {hasIntermediary && (
          <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="body2">
                <strong>🚚 Lliurament:</strong> {order.monitorIntermediari} → {order.escolaDestinoIntermediari}
              </Typography>
              {order.modalitatEntrega === 'MANUAL' && (
                <Chip label="MANUAL" size="small" color="error" sx={{ fontWeight: 'bold', height: 18 }} />
              )}
            </Stack>
          </Box>
        )}

        {/* Fila 4: Notificaciones + Acciones */}
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" flexWrap="wrap">
          {/* Notificaciones */}
          {hasIntermediary && order.estat === 'Assignat' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>📨</Typography>
              {notifStatus?.intermediario === true ? (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => onSendNotification && onSendNotification(order, 'intermediario')}
                  sx={{ fontSize: '0.7rem', py: 0.2, px: 0.8, minWidth: 'auto' }}
                >
                  ✅ Inter. Enviat
                </Button>
              ) : (
                onSendNotification && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => onSendNotification(order, 'intermediario')}
                    sx={{ fontSize: '0.7rem', py: 0.2, px: 0.8, minWidth: 'auto' }}
                  >
                    Enviar Inter.
                  </Button>
                )
              )}
              {notifStatus?.destinatario === true ? (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => onSendNotification && onSendNotification(order, 'destinatario')}
                  sx={{ fontSize: '0.7rem', py: 0.2, px: 0.8, minWidth: 'auto' }}
                >
                  ✅ Dest. Enviat
                </Button>
              ) : (
                onSendNotification && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => onSendNotification(order, 'destinatario')}
                    sx={{ fontSize: '0.7rem', py: 0.2, px: 0.8, minWidth: 'auto' }}
                  >
                    Enviar Dest.
                  </Button>
                )
              )}
            </Stack>
          )}

          {/* Acciones */}
          <Stack direction="row" spacing={1}>
            {onEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => onEdit(order)}
                sx={{ fontSize: '0.75rem', py: 0.4 }}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => onDelete(order.idItem)}
                sx={{ fontSize: '0.75rem', py: 0.4 }}
              >
                Eliminar
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Fila 5: Comentarios (si existen) */}
        {(order.comentarisGenerals || order.notesEntrega) && (
          <Box sx={{ bgcolor: '#fff3cd', p: 1, borderRadius: 1, borderLeft: '3px solid #ffc107' }}>
            {order.comentarisGenerals && (
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                💬 {order.comentarisGenerals}
              </Typography>
            )}
            {order.notesEntrega && (
              <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
                📝 {order.notesEntrega}
              </Typography>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

