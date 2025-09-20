'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  CalendarToday,
  Person,
} from '@mui/icons-material';
import { apiClient, type SollicitudMultiple, type CartItem } from '../lib/api';
import ItemForm from './ItemForm';
import CartView from './CartView';

const FormulariSollicitud: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [escoles, setEscoles] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [formData, setFormData] = useState({
    nomCognoms: '',
    dataNecessitat: '',
    altresMaterials: '',
  });

  // Carregar dades inicials
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const escolesResponse = await apiClient.getEscoles();
      if (escolesResponse.success && escolesResponse.data) {
        setEscoles(escolesResponse.data);
      }
    } catch (err) {
      setError('Error carregant les dades inicials');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddItem = (item: CartItem) => {
    setCartItems(prev => [...prev, item]);
    setError(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmitCart = async () => {
    setError(null);

    // Validació bàsica
    if (!formData.nomCognoms.trim()) {
      setError('Si us plau, introdueix el teu nom i cognoms');
      return;
    }

    if (!formData.dataNecessitat) {
      setError('Si us plau, selecciona la data de necessitat');
      return;
    }

    if (cartItems.length === 0) {
      setError('Si us plau, afegeix almenys un material al carrito');
      return;
    }

    setSubmitting(true);

    try {
      const solicitudData: SollicitudMultiple = {
        nomCognoms: formData.nomCognoms.trim(),
        dataNecessitat: formData.dataNecessitat,
        items: cartItems,
        altresMaterials: formData.altresMaterials.trim() || undefined,
      };

      const response = await apiClient.createMultipleSollicitud(solicitudData);

      if (response.success) {
        setSuccess(true);
        // Reset form
        setFormData({
          nomCognoms: '',
          dataNecessitat: '',
          altresMaterials: '',
        });
        setCartItems([]);

        // Amagar missatge d'èxit després de 5 segons
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(response.error || 'Error enviant la sol·licitud');
      }
    } catch (err) {
      setError('Error de connexió. Comprova la teva connexió a internet.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregant...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
            🛒 Sol·licitud de Materials - Sistema de Carrito
          </Typography>

          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Omple les teves dades, afegeix els materials que necessites i envia la sol·licitud completa
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Sol·licitud enviada correctament! Rebràs confirmació aviat.
              <br />
              <strong>Materials sol·licitats:</strong> {cartItems.length} items
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Datos comunes del usuario */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                👤 Dades del Sol·licitant
              </Typography>
              
              <Grid container spacing={2}>
                {/* Nom i cognoms */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nom i cognoms *"
                    value={formData.nomCognoms}
                    onChange={handleInputChange('nomCognoms')}
                    InputProps={{
                      startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                    }}
                    placeholder="Introdueix el teu nom complet"
                  />
                </Grid>

                {/* Data necessitat */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data de necessitat *"
                    value={formData.dataNecessitat}
                    onChange={handleInputChange('dataNecessitat')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <CalendarToday color="action" sx={{ mr: 1 }} />,
                    }}
                  />
                </Grid>

                {/* Comentaris adicionals */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Comentaris adicionals"
                    value={formData.altresMaterials}
                    onChange={handleInputChange('altresMaterials')}
                    placeholder="Informació adicional sobre la sol·licitud (opcional)"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Formulario para añadir items */}
          <ItemForm 
            escoles={escoles}
            onAddItem={handleAddItem}
            loading={submitting}
          />

          {/* Vista del carrito */}
          <CartView 
            items={cartItems}
            onRemoveItem={handleRemoveItem}
            onSubmitCart={handleSubmitCart}
            submitting={submitting}
          />

          {/* Informació adicional */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              💡 <strong>Consell:</strong> Pots afegir múltiples materials de diferents escoles i activitats al mateix carrito abans d'enviar la sol·licitud
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FormulariSollicitud;