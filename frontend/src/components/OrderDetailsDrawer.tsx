'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Stack,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Drawer,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close,
  Info,
  Edit,
  Save,
  CheckCircle,
  LocalShipping,
} from '@mui/icons-material';
import { apiClient } from '../lib/api';
import { statusColors, statusIcons, formatSentenceCase, formatDateCatalan } from '../utils/orderUtils';

interface OrderDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  order: any | null;
  orders: any[];
  notificationsEnabled: boolean;
  notificationStatuses: Record<string, any>;
  loadingNotificationStatuses: boolean;
  onOpenNotificationModal: (order: any, type: string) => void;
  onRefreshData: () => void;
  onNotification: (message: string, severity: 'success' | 'error' | 'info') => void;
  onStatusChange?: (orderIds: string[], newStatus: string) => Promise<void>;
}

export default function OrderDetailsDrawer({
  open,
  onClose,
  order,
  orders,
  notificationsEnabled,
  notificationStatuses,
  loadingNotificationStatuses,
  onOpenNotificationModal,
  onRefreshData,
  onNotification,
  onStatusChange,
}: OrderDetailsDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Quick status change state
  const [quickStatus, setQuickStatus] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Internal state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editedOrderData, setEditedOrderData] = useState({
    material: '',
    unitats: 0,
    comentarisGenerals: ''
  });
  const [confirmEditDialogOpen, setConfirmEditDialogOpen] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  // Local reference that can be updated after save
  const [localOrder, setLocalOrder] = useState<any | null>(null);

  // Use localOrder if it matches the current order, otherwise use prop
  const selectedOrderForDrawer = (localOrder && order && localOrder.idItem === order.idItem)
    ? localOrder
    : order;

  // Reset local order when prop changes
  React.useEffect(() => {
    setLocalOrder(null);
    setIsEditingOrder(false);
  }, [order?.idItem]);

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
        onNotification('Comanda actualitzada correctament', 'success');

        // Actualitzar el drawer amb les noves dades
        setLocalOrder({
          ...selectedOrderForDrawer,
          ...editedOrderData
        });

        // Sortir del mode edició
        setIsEditingOrder(false);
        setConfirmEditDialogOpen(false);

        // Refresh parent data
        onRefreshData();
      } else {
        onNotification(result.error || 'Error actualitzant la comanda', 'error');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      onNotification('Error actualitzant la comanda', 'error');
    } finally {
      setIsSavingEdits(false);
    }
  };

  return (
    <>
      {/* Drawer lateral - Panel de detalles del pedido */}
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
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
              <IconButton onClick={onClose} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
              <Stack spacing={3}>
                {/* Estado */}
                <Box>
                  <Chip
                    icon={statusIcons[formatSentenceCase(selectedOrderForDrawer.estat as string) as keyof typeof statusIcons] || statusIcons['']}
                    label={formatSentenceCase(selectedOrderForDrawer.estat as string) || 'Pendent'}
                    color={statusColors[formatSentenceCase(selectedOrderForDrawer.estat as string) as keyof typeof statusColors] as any || 'default'}
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
                {/* Accions ràpides */}
                {onStatusChange && (
                  <>
                    <Typography variant="overline" fontWeight="bold" color="text.secondary">
                      Accions
                    </Typography>

                    {/* Botons ràpids segons estat actual */}
                    {(() => {
                      const estat = formatSentenceCase(selectedOrderForDrawer.estat as string);
                      const orderId = selectedOrderForDrawer.idItem;

                      const handleQuickStatus = async (newStatus: string) => {
                        setIsChangingStatus(true);
                        try {
                          await onStatusChange([orderId], newStatus);
                          onNotification(`Estat canviat a ${newStatus}`, 'success');
                          onRefreshData();
                        } catch {
                          onNotification('Error canviant estat', 'error');
                        } finally {
                          setIsChangingStatus(false);
                        }
                      };

                      return (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {estat === 'Pendent' && (
                            <Button size="small" variant="outlined" disabled={isChangingStatus}
                              onClick={() => handleQuickStatus('En proces')}>
                              En proces
                            </Button>
                          )}
                          {estat === 'En proces' && (
                            <Button size="small" variant="outlined" color="info" disabled={isChangingStatus}
                              onClick={() => handleQuickStatus('Preparat')}>
                              Preparat
                            </Button>
                          )}
                          {estat === 'Preparat' && (
                            <Button size="small" variant="outlined" color="secondary" disabled={isChangingStatus}
                              onClick={() => handleQuickStatus('Assignat')}>
                              Assignar
                            </Button>
                          )}
                          {(estat === 'Assignat' || estat === 'Preparat') && (
                            <Button size="small" variant="contained" color="success" disabled={isChangingStatus}
                              startIcon={<CheckCircle />}
                              onClick={() => handleQuickStatus('Lliurat')}>
                              Lliurat
                            </Button>
                          )}
                          {/* Selector lliure per qualsevol estat */}
                          <FormControl size="small" sx={{ minWidth: 110 }}>
                            <InputLabel>Canviar a</InputLabel>
                            <Select
                              value={quickStatus}
                              label="Canviar a"
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuickStatus('');
                                if (val) handleQuickStatus(val);
                              }}
                              disabled={isChangingStatus}
                            >
                              <MenuItem value="Pendent">Pendent</MenuItem>
                              <MenuItem value="En proces">En proces</MenuItem>
                              <MenuItem value="Preparat">Preparat</MenuItem>
                              <MenuItem value="Assignat">Assignat</MenuItem>
                              <MenuItem value="Lliurat">Lliurat</MenuItem>
                            </Select>
                          </FormControl>
                        </Stack>
                      );
                    })()}

                    <Divider />
                  </>
                )}

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
                          // En el drawer siempre mostramos el botón de enviar,
                          // pero usamos el primer orden del grupo para la notificación agrupada
                          let firstInGroup = selectedOrderForDrawer;

                          if (selectedOrderForDrawer.idLliurament && selectedOrderForDrawer.monitorIntermediari) {
                            const groupMaterials = orders.filter(o =>
                              o.idLliurament &&
                              o.idLliurament === selectedOrderForDrawer.idLliurament &&
                              o.monitorIntermediari && o.monitorIntermediari.trim() !== ''
                            ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

                            if (groupMaterials.length > 0) {
                              firstInGroup = groupMaterials[0];
                            }
                          }

                          const isSent = notificationStatuses[firstInGroup.idItem]?.intermediario;

                          if (isSent) {
                            return <Chip label="✅ Enviada" size="small" color="success" />;
                          } else {
                            return (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<span>📤</span>}
                                onClick={() => onOpenNotificationModal(firstInGroup, 'intermediario')}
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
                            // En el drawer siempre mostramos el botón de enviar,
                            // pero usamos el primer orden del grupo para la notificación agrupada
                            let firstInGroup = selectedOrderForDrawer;

                            // Para destinatario: agrupar por nomCognoms + escola + fecha
                            const groupMaterials = orders.filter(o =>
                              o.nomCognoms === selectedOrderForDrawer.nomCognoms &&
                              o.escola === selectedOrderForDrawer.escola &&
                              o.dataNecessitat === selectedOrderForDrawer.dataNecessitat
                            ).sort((a, b) => (a.idItem || '').localeCompare(b.idItem || ''));

                            if (groupMaterials.length > 0) {
                              firstInGroup = groupMaterials[0];
                            }

                            const isSent = notificationStatuses[firstInGroup.idItem]?.destinatario;

                            if (isSent) {
                              return <Chip label="✅ Enviada" size="small" color="success" />;
                            } else {
                              return (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<span>📤</span>}
                                  onClick={() => onOpenNotificationModal(firstInGroup, 'destinatario')}
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
    </>
  );
}
