'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Grid,
  Chip,
} from '@mui/material';
import {
  Send,
  School,
  CalendarToday,
  Category,
  Inventory,
  Numbers,
  Person,
  Add,
} from '@mui/icons-material';
import { apiClient, type SollicitudMaterial } from '../lib/api';

const formatSentenceCase = (text: string | null | undefined): string => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length === 0) return '';
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const sortMaterials = (materials: string[]): string[] => {
  if (!materials || materials.length === 0) return [];
  
  const sobreMaterials: string[] = [];
  const otherMaterials: string[] = [];
  
  // Separar materiales que empiezan por "SOBRE" de los otros
  materials.forEach(material => {
    if (material.toUpperCase().startsWith('SOBRE')) {
      sobreMaterials.push(material);
    } else {
      otherMaterials.push(material);
    }
  });
  
  // Ordenar solo los "otros" alfabéticamente
  otherMaterials.sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }));
  
  // Retornar: SOBRE items en orden original + otros ordenados alfabéticamente
  return [...sobreMaterials, ...otherMaterials];
};

const FormulariSollicitud: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [escoles, setEscoles] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [activitats, setActivitats] = useState<string[]>([]);

  const [formData, setFormData] = useState<SollicitudMaterial>({
    nomCognoms: '',
    dataNecessitat: '',
    escola: '',
    activitat: '',
    material: '',
    unitats: '',
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

      // Load default materials (fallback)
      try {
        const materialsResponse = await apiClient.getMaterials();
        if (materialsResponse.success && materialsResponse.data) {
          setMaterials(sortMaterials(materialsResponse.data));
        }
      } catch (err) {
        console.warn('No se pudieron cargar materiales por defecto:', err);
        // Set temporary mock materials so user can see the dropdown working
        setMaterials([
          'Material temporal 1',
          'Material temporal 2',
          'Material temporal 3',
          'Microscopi',
          'Calculadora',
          'Pinzells'
        ]);
      }
    } catch (err) {
      setError('Error carregant les dades inicials');
    } finally {
      setLoading(false);
    }
  };

  const loadActivitiesForSchool = async (school: string) => {
    if (!school) {
      setActivitats([]);
      return;
    }

    try {
      console.log(`🔍 Loading activities for school: ${school}`);
      const response = await apiClient.getActivitiesBySchool(school);

      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} activities for ${school}:`, response.data);
        setActivitats(response.data);
      } else {
        console.warn(`⚠️ Failed to load activities for ${school}:`, response.error);
        setActivitats([]);
      }
    } catch (err) {
      console.error(`❌ Error loading activities for ${school}:`, err);
      setActivitats([]);
    }
  };

  const loadMaterialsForActivity = async (activity: string) => {
    if (!activity) {
      // If no activity selected, try to load default materials
      try {
        const materialsResponse = await apiClient.getMaterials();
        if (materialsResponse.success && materialsResponse.data) {
          setMaterials(sortMaterials(materialsResponse.data));
        }
      } catch (err) {
        setMaterials([]);
      }
      return;
    }

    try {
      console.log(`🔍 Loading materials for activity: ${activity}`);
      const response = await apiClient.getMaterialsByActivity(activity);

      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} materials for ${activity}:`, response.data);
        setMaterials(sortMaterials(response.data));
      } else {
        console.warn(`⚠️ Failed to load materials for ${activity}:`, response.error);
        // Fallback to activity-specific mock materials
        const mockMaterialsByActivity = {
          'CO': ['Microscopi', 'Placa Petri', 'Pipeta', 'Vials'],
          'DX': ['Ordinador', 'Tablet', 'Sensors', 'Cables'],
          'HC': ['Pinzells', 'Aquarel·les', 'Paper', 'Llapis'],
          'TC': ['Eines', 'Cargols', 'Cables', 'Resistències']
        };

        // Parse activity to get base (CO1A -> CO)
        const baseActivity = activity.match(/^([A-Z]+)/)?.[1] || '';
        const mockMaterials = mockMaterialsByActivity[baseActivity as keyof typeof mockMaterialsByActivity] || [
          'Material per ' + activity,
          'Material genèric 1',
          'Material genèric 2'
        ];

        console.log(`📦 Using mock materials for ${activity}:`, mockMaterials);
        setMaterials(sortMaterials(mockMaterials));
      }
    } catch (err) {
      console.error(`❌ Error loading materials for ${activity}:`, err);
      setMaterials([]);
    }
  };

  const handleInputChange = (field: keyof SollicitudMaterial) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // If school changed, load activities for that school
    if (field === 'escola') {
      loadActivitiesForSchool(value);
      // Clear current selections since options will change
      setFormData(prev => ({
        ...prev,
        activitat: '',
        material: ''
      }));
      setMaterials([]);
    }

    // If activity changed, load materials for that activity
    if (field === 'activitat') {
      loadMaterialsForActivity(value);
      // Clear current material selection since options will change
      setFormData(prev => ({
        ...prev,
        material: ''
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validació bàsica
    const requiredFields = ['nomCognoms', 'dataNecessitat', 'escola', 'material'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof SollicitudMaterial]);

    if (missingFields.length > 0) {
      setError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.createSollicitud(formData);

      if (response.success) {
        setSuccess(true);
        setFormData({
          nomCognoms: '',
          dataNecessitat: '',
          escola: '',
          activitat: '',
          material: '',
          unitats: '',
          altresMaterials: '',
        });

        // Amagar missatge d'èxit després de 3 segons
        setTimeout(() => setSuccess(false), 3000);
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
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
            📚 Sol·licitud de Materials
          </Typography>

          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Omple el formulari per sol·licitar materials per a la teva activitat
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Sol·licitud enviada correctament! Rebràs confirmació aviat.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Nom i cognoms */}
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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

              {/* Escola */}
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={escoles}
                  value={formData.escola || null}
                  onChange={(_, newValue) => handleInputChange('escola')(newValue || '')}
                  isOptionEqualToValue={(option, value) => option === value}
                  filterOptions={(options, { inputValue }) => {
                    // Filter that matches any part of the school name (case insensitive)
                    return options.filter(option =>
                      option.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Escola *"
                      placeholder="Escriu per filtrar escoles..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <School color="action" sx={{ mr: 1 }} />,
                      }}
                      helperText={`${escoles.length} escoles disponibles`}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps}>
                        <School sx={{ mr: 1, color: 'text.secondary' }} />
                        {option}
                      </Box>
                    );
                  }}
                  ListboxProps={{
                    style: { maxHeight: '200px' }
                  }}
                  noOptionsText="No s'han trobat escoles"
                />
              </Grid>

              {/* Activitat */}
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={activitats}
                  value={formData.activitat || null}
                  onChange={(_, newValue) => handleInputChange('activitat')(newValue || '')}
                  isOptionEqualToValue={(option, value) => option === value}
                  filterOptions={(options, { inputValue }) => {
                    // Filter that matches any part of the activity name (case insensitive)
                    return options.filter(option =>
                      option.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Activitat"
                      placeholder="Escriu per filtrar activitats..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <Category color="action" sx={{ mr: 1 }} />,
                      }}
                      helperText={`${activitats.length} activitats disponibles`}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps}>
                        <Category sx={{ mr: 1, color: 'text.secondary' }} />
                        {option}
                      </Box>
                    );
                  }}
                  ListboxProps={{
                    style: { maxHeight: '200px' }
                  }}
                  noOptionsText="No s'han trobat activitats"
                />
              </Grid>

              {/* Material principal */}
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  fullWidth
                  options={materials}
                  value={formData.material || null}
                  onChange={(_, newValue) => handleInputChange('material')(newValue || '')}
                  isOptionEqualToValue={(option, value) => option === value}
                  getOptionLabel={(option) => formatSentenceCase(option)}
                  filterOptions={(options, { inputValue }) => {
                    // Filter that matches any part of the material name (case insensitive)
                    return options.filter(option =>
                      option.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Material principal *"
                      placeholder={materials.length > 0 ? "Escriu per filtrar materials..." : "Selecciona primer una activitat"}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <Inventory color="action" sx={{ mr: 1 }} />,
                      }}
                      helperText={materials.length > 0 ? `${materials.length} materials disponibles` : "Selecciona una activitat per veure els materials"}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps}>
                        <Inventory sx={{ mr: 1, color: 'text.secondary' }} />
                        {formatSentenceCase(option)}
                      </Box>
                    );
                  }}
                  ListboxProps={{
                    style: { maxHeight: '200px' }
                  }}
                  noOptionsText={materials.length === 0 ? "Selecciona una activitat primer" : "No s'han trobat materials"}
                />
              </Grid>

              {/* Unitats */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Unitats"
                  value={formData.unitats}
                  onChange={handleInputChange('unitats')}
                  InputProps={{
                    startAdornment: <Numbers color="action" sx={{ mr: 1 }} />,
                  }}
                  placeholder="Quantitat"
                />
              </Grid>

              {/* Altres materials */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Altres materials"
                  value={formData.altresMaterials}
                  onChange={handleInputChange('altresMaterials')}
                  placeholder="Materials addicionals que necessitis (opcional)"
                  InputProps={{
                    startAdornment: <Add color="action" sx={{ mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                  }}
                />
              </Grid>

              {/* Botó d'enviament */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {submitting ? 'Enviant...' : 'Enviar Sol·licitud'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Informació adicional */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              💡 <strong>Consell:</strong> Omple la sol·licitud amb antelació per assegurar-te la disponibilitat dels materials
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FormulariSollicitud;