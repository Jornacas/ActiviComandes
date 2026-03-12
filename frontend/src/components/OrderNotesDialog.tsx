'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { API_BASE_URL, API_TOKEN } from '../lib/api';

interface OrderNotesDialogProps {
  open: boolean;
  order: any | null;
  newStatus: string;
  onClose: () => void;
  onSave: (orderId: string, notes: string) => Promise<void>;
  onSaveAndSend: (orderId: string, notes: string, dataNecessitat: string) => Promise<void>;
  onNotification: (message: string, severity: 'success' | 'error' | 'info') => void;
}

export default function OrderNotesDialog({
  open,
  order,
  newStatus,
  onClose,
  onSave,
  onSaveAndSend,
  onNotification,
}: OrderNotesDialogProps) {
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Sync notes when order changes
  useEffect(() => {
    if (order) {
      setInternalNotes(order.notesInternes || '');
    } else {
      setInternalNotes('');
    }
  }, [order]);

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

  // Guardar notas y actualizar estado
  const handleSaveNotes = async () => {
    if (!order) return;

    setSavingNotes(true);
    try {
      await onSave(order.id, internalNotes);

      // Cerrar el modal
      onClose();
      setInternalNotes('');
    } catch (error) {
      console.error('Error guardando notas:', error);
      onNotification('Error guardant les notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  // Guardar, actualizar estado Y enviar al espacio /Staff/COMPRES
  const handleSaveAndSendNotes = async () => {
    if (!order) return;

    setSavingNotes(true);
    try {
      await onSaveAndSend(order.id, internalNotes, order.dataNecessitat);

      // Cerrar el modal
      onClose();
      setInternalNotes('');
    } catch (error) {
      console.error('Error guardando notas:', error);
      onNotification('Error guardant les notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setInternalNotes('');
  };

  return (
    <Dialog
      open={open}
      onClose={() => !savingNotes && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        📝 Notes Internes - Material En Procés
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {order && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Material:</strong> {order.material}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                <strong>Sol·licitant:</strong> {order.nomCognoms}
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
          onClick={handleCancel}
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
  );
}
