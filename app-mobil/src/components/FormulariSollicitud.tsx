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
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  CalendarToday,
  Person,
  Warning,
} from '@mui/icons-material';
import { apiClient, type SollicitudMultiple, type CartItem } from '../lib/api';
import { validarPlazoPedido, testValidacion, type ValidacionFecha } from '../lib/dateValidation';
import ItemForm from './ItemForm';
import CartView from './CartView';

const FormulariSollicitud: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [escoles, setEscoles] = useState<string[]>([]);
  const [monitors, setMonitors] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [formData, setFormData] = useState({
    nomCognoms: '',
    dataNecessitat: '',
    altresMaterials: '',
  });

  // Date validation
  const [validacionFecha, setValidacionFecha] = useState<ValidacionFecha | null>(null);
  const [showPlazoDialog, setShowPlazoDialog] = useState(false);

  // Carregar dades inicials
  useEffect(() => {
    loadInitialData();
    // Test de validación (solo para desarrollo) - FORZADO PARA DEBUG
    console.log('🚀 INICIANDO TESTS DE VALIDACIÓN...');
    testValidacion();
    console.log('🏁 TESTS DE VALIDACIÓN COMPLETADOS');
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load schools and monitors in parallel
      const [escolesResponse, monitorsResponse] = await Promise.all([
        apiClient.getEscoles(),
        apiClient.getMonitors()
      ]);
      
      if (escolesResponse.success && escolesResponse.data) {
        setEscoles(escolesResponse.data);
      }
      
      if (monitorsResponse.success && monitorsResponse.data) {
        setMonitors(monitorsResponse.data);
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

    // Validar fecha si es el campo de fecha de necesidad
    if (field === 'dataNecessitat' && value) {
      console.log('🔄 Validando fecha:', value);
      const fechaNecesidad = new Date(value);
      console.log('📅 Fecha parseada:', fechaNecesidad);
      const validacion = validarPlazoPedido(fechaNecesidad);
      setValidacionFecha(validacion);

      console.log('✅ Resultado validación completo:', validacion);
      console.log('❓ ¿Cumple plazo?:', validacion.cumplePlazo);
      console.log('💬 Mensaje:', validacion.mensaje);

      // Mostrar dialog si no cumple plazo
      if (!validacion.cumplePlazo) {
        console.log('⚠️ MOSTRANDO DIALOG - Plazo vencido');
        console.log('🔴 FORZANDO setShowPlazoDialog(true)');
        setShowPlazoDialog(true);
      } else {
        console.log('✅ Plazo correcto - No se muestra dialog');
        setShowPlazoDialog(false);
      }
    }
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
      setError('Si us plau, selecciona el teu nom de la llista');
      return;
    }

    // Verificar que el nom sigui vàlid (està a la llista de monitors o és "eixos")
    const isEixosAdmin = formData.nomCognoms.trim().toLowerCase() === 'eixos';
    if (!isEixosAdmin && !monitors.includes(formData.nomCognoms.trim())) {
      setError('Si us plau, selecciona un nom vàlid de la llista de monitors o escriu "eixos" per mode admin');
      return;
    }

    if (!formData.dataNecessitat) {
      setError('Si us plau, selecciona la data de necessitat');
      return;
    }

    if (cartItems.length === 0) {
      setError('Si us plau, afegeix almenys un material al carret');
      return;
    }

    setSubmitting(true);

    try {
      const solicitudData: SollicitudMultiple = {
        nomCognoms: formData.nomCognoms.trim(),
        dataNecessitat: formData.dataNecessitat,
        items: cartItems,
        altresMaterials: formData.altresMaterials.trim() || undefined,
        entregaManual: validacionFecha?.requiereEntregaManual || false,
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
        setValidacionFecha(null);

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
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      <Card sx={{ mb: { xs: 2, sm: 3 }, borderRadius: { xs: 0, sm: 2 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
            <Box sx={{ mb: { xs: 1, sm: 2 } }}>
              <img 
                src="https://www.eixoscreativa.com/wp-content/uploads/2024/01/Eixos-creativa.png.webp" 
                alt="Eixos Creativa" 
                style={{ 
                  height: '40px', 
                  objectFit: 'contain',
                  maxWidth: '100%'
                }}
              />
            </Box>
            <Typography 
              variant="h5" 
              component="h1" 
              color="primary" 
              gutterBottom
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Sol·licitud de Materials
            </Typography>
          </Box>

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
          <Card variant="outlined" sx={{ mb: { xs: 2, sm: 3 }, borderRadius: { xs: 1, sm: 2 } }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" gutterBottom color="primary">
                👤 Dades del Sol·licitant
              </Typography>
              
              <Grid container spacing={2}>
                {/* Nom i cognoms */}
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    fullWidth
                    options={monitors}
                    value={formData.nomCognoms || null}
                    onChange={(_, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        nomCognoms: newValue || ''
                      }));
                    }}
                    freeSolo={true} // Allow free text for "eixos" admin mode
                    autoComplete
                    autoHighlight
                    autoSelect
                    blurOnSelect
                    clearOnBlur
                    handleHomeEndKeys
                    openOnFocus={false} // Don't open on focus
                    disablePortal
                    slotProps={{
                      popper: {
                        sx: {
                          '& .MuiAutocomplete-listbox': {
                            maxHeight: '120px', // Smaller dropdown
                            fontSize: '0.875rem'
                          }
                        }
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nom i cognoms *"
                        placeholder="Comença a escriure el teu nom o 'eixos' per mode admin..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <Person color="action" sx={{ mr: 1 }} />,
                          endAdornment: null, // Remove the arrow icon
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={key} {...otherProps} sx={{ py: 0.5, fontSize: '0.875rem' }}>
                          {option}
                        </Box>
                      );
                    }}
                    noOptionsText="No s'ha trobat cap monitor (prova 'eixos' per mode admin)"
                    getOptionLabel={(option) => option}
                    isOptionEqualToValue={(option, value) => option === value}
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
            selectedMonitor={formData.nomCognoms}
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
              💡 <strong>Consell:</strong> Pots afegir múltiples materials de diferents escoles i activitats al mateix carret abans d'enviar la sol·licitud
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog de aviso de plazo vencido */}
      <Dialog 
        open={showPlazoDialog} 
        onClose={() => setShowPlazoDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Termini de comanda vençut
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {validacionFecha?.mensaje}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowPlazoDialog(false)} 
            variant="contained" 
            color="primary"
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormulariSollicitud;