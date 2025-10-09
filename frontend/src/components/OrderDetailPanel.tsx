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

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {icon} {title}
      </Typography>
      <Box sx={{ pl: 3 }}>
        {children}
      </Box>
    </Box>
  );

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <Typography variant="body2" sx={{ mb: 0.5 }}>
      <strong>{label}:</strong> {value || '--'}
    </Typography>
  );

  const hasIntermediary = order.monitorIntermediari && order.monitorIntermediari.trim() !== '';
  const notifStatus = notificationStatuses[order.idItem];

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        bgcolor: '#f8f9fa',
        borderTop: '2px solid #e0e0e0'
      }}
    >
      <Grid container spacing={3}>
        {/* Columna Izquierda */}
        <Grid item xs={12} md={6}>
          
          {/* Información Básica */}
          <Section title="INFORMACIÓ BÀSICA" icon="📋">
            <InfoRow label="ID" value={order.idItem} />
            <InfoRow label="Sol·licitant" value={order.nomCognoms} />
            <InfoRow label="Activitat" value={order.activitat} />
            <InfoRow label="Material" value={order.material} />
            <InfoRow label="Unitats" value={order.unitats} />
            {order.esMaterialPersonalitzat === 'TRUE' && (
              <Chip label="Material Personalitzat" size="small" color="warning" sx={{ mt: 1 }} />
            )}
          </Section>

          {/* Dates */}
          <Section title="DATES" icon="📅">
            <InfoRow label="Sol·licitud" value={order.timestamp ? new Date(order.timestamp).toLocaleDateString('ca-ES') : '--'} />
            <InfoRow label="Necessitat" value={formatDate(order.dataNecessitat)} />
            {order.Data_Lliurament_Prevista && (
              <InfoRow label="Lliurament Previst" value={formatDate(order.Data_Lliurament_Prevista)} />
            )}
          </Section>

          {/* Comentaris */}
          {(order.comentarisGenerals || order.notesEntrega) && (
            <Section title="COMENTARIS I NOTES" icon="💬">
              {order.comentarisGenerals && (
                <InfoRow label="Comentaris Generals" value={order.comentarisGenerals} />
              )}
              {order.notesEntrega && (
                <InfoRow label="Notes Entrega" value={order.notesEntrega} />
              )}
            </Section>
          )}
        </Grid>

        {/* Columna Derecha */}
        <Grid item xs={12} md={6}>
          
          {/* Entrega */}
          {hasIntermediary && (
            <Section title="ENTREGA" icon="🚚">
              <InfoRow 
                label="Modalitat" 
                value={order.modalitatEntrega === 'MANUAL' ? 
                  <Chip label="MANUAL" size="small" color="error" sx={{ fontWeight: 'bold' }} /> : 
                  'Intermediari'
                } 
              />
              <InfoRow label="Monitor" value={order.monitorIntermediari} />
              <InfoRow label="Escola Destí" value={order.escolaDestinoIntermediari} />
              {order.responsablePreparacio && (
                <InfoRow label="Responsable Preparació" value={order.responsablePreparacio} />
              )}
              {order.distanciaAcademia && (
                <InfoRow label="Distància" value={order.distanciaAcademia} />
              )}
            </Section>
          )}

          {/* Notificacions */}
          {hasIntermediary && order.estat === 'Assignat' && (
            <Section title="NOTIFICACIONS" icon="📨">
              <Stack spacing={2}>
                {/* Notificació Intermediari */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Intermediari:</strong>
                  </Typography>
                  {notifStatus?.intermediario ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip 
                        label="✅ Enviat" 
                        size="small" 
                        color="success"
                        sx={{ fontSize: '0.75rem' }}
                      />
                      {onSendNotification && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SendIcon />}
                          onClick={() => onSendNotification(order, 'intermediario')}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          Reenviar
                        </Button>
                      )}
                    </Stack>
                  ) : (
                    onSendNotification && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={() => onSendNotification(order, 'intermediario')}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Enviar Notificació
                      </Button>
                    )
                  )}
                </Box>

                {/* Notificació Destinatari */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Destinatari:</strong>
                  </Typography>
                  {notifStatus?.destinatario ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip 
                        label="✅ Enviat" 
                        size="small" 
                        color="success"
                        sx={{ fontSize: '0.75rem' }}
                      />
                      {onSendNotification && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SendIcon />}
                          onClick={() => onSendNotification(order, 'destinatario')}
                          sx={{ fontSize: '0.7rem' }}
                        >
                          Reenviar
                        </Button>
                      )}
                    </Stack>
                  ) : (
                    onSendNotification && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={() => onSendNotification(order, 'destinatario')}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Enviar Notificació
                      </Button>
                    )
                  )}
                </Box>
              </Stack>
            </Section>
          )}

          {/* Acciones */}
          <Section title="ACCIONS" icon="⚙️">
            <Stack direction="row" spacing={1}>
              {onEdit && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => onEdit(order)}
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
                >
                  Eliminar
                </Button>
              )}
            </Stack>
          </Section>
        </Grid>
      </Grid>
    </Paper>
  );
}

