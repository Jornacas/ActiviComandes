'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete,
  Grid,
  Collapse,
} from '@mui/material';
import {
  School,
  Category,
  Inventory,
  Numbers,
  Add,
} from '@mui/icons-material';
import { apiClient, type CartItem } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';

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
  
  materials.forEach(material => {
    if (material.toUpperCase().startsWith('SOBRE')) {
      sobreMaterials.push(material);
    } else {
      otherMaterials.push(material);
    }
  });
  
  otherMaterials.sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }));
  
  // Añadir "Altres materials" al final
  return [...sobreMaterials, ...otherMaterials, 'Altres materials'];
};

interface ItemFormProps {
  escoles: string[];
  onAddItem: (item: CartItem) => void;
  loading?: boolean;
}

const ItemForm: React.FC<ItemFormProps> = ({ escoles, onAddItem, loading = false }) => {
  const [formData, setFormData] = useState({
    escola: '',
    activitat: '',
    material: '',
    customMaterial: '',
    unitats: 1,
  });
  
  const [activitats, setActivitats] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivitiesForSchool = async (school: string) => {
    if (!school) {
      setActivitats([]);
      return;
    }

    setLoadingActivities(true);
    try {
      const response = await apiClient.getActivitiesBySchool(school);
      if (response.success && response.data) {
        setActivitats(response.data);
      } else {
        setActivitats([]);
      }
    } catch (err) {
      console.error(`Error loading activities for ${school}:`, err);
      setActivitats([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadMaterialsForActivity = async (activity: string) => {
    if (!activity) {
      setMaterials(['Altres materials']);
      return;
    }

    setLoadingMaterials(true);
    try {
      const response = await apiClient.getMaterialsByActivity(activity);
      if (response.success && response.data) {
        setMaterials(sortMaterials(response.data));
      } else {
        // Fallback materials
        const mockMaterialsByActivity = {
          'CO': ['Microscopi', 'Placa Petri', 'Pipeta', 'Vials'],
          'DX': ['Ordinador', 'Tablet', 'Sensors', 'Cables'],
          'HC': ['Pinzells', 'Aquarel·les', 'Paper', 'Llapis'],
          'TC': ['Eines', 'Cargols', 'Cables', 'Resistències']
        };
        const baseActivity = activity.match(/^([A-Z]+)/)?.[1] || '';
        const mockMaterials = mockMaterialsByActivity[baseActivity as keyof typeof mockMaterialsByActivity] || [];
        setMaterials(sortMaterials(mockMaterials));
      }
    } catch (err) {
      console.error(`Error loading materials for ${activity}:`, err);
      setMaterials(['Altres materials']);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleInputChange = (field: string) => (value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'escola') {
      loadActivitiesForSchool(value);
      setFormData(prev => ({
        ...prev,
        activitat: '',
        material: '',
        customMaterial: ''
      }));
      setMaterials(['Altres materials']);
    }

    if (field === 'activitat') {
      loadMaterialsForActivity(value);
      setFormData(prev => ({
        ...prev,
        material: '',
        customMaterial: ''
      }));
    }

    if (field === 'material' && value !== 'Altres materials') {
      setFormData(prev => ({
        ...prev,
        customMaterial: ''
      }));
    }
  };

  const handleAddItem = () => {
    setError(null);

    // Validación
    if (!formData.escola || !formData.activitat || (!formData.material && !formData.customMaterial)) {
      setError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    if (formData.material === 'Altres materials' && !formData.customMaterial.trim()) {
      setError('Si us plau, especifica el material personalitzat');
      return;
    }

    if (formData.unitats <= 0) {
      setError('Les unitats han de ser un nombre positiu');
      return;
    }

    const newItem: CartItem = {
      id: uuidv4(),
      escola: formData.escola,
      activitat: formData.activitat,
      material: formData.material === 'Altres materials' ? formData.customMaterial : formData.material,
      customMaterial: formData.material === 'Altres materials' ? formData.customMaterial : undefined,
      unitats: formData.unitats,
    };

    onAddItem(newItem);

    // Reset form pero mantener escuela y actividad si es posible
    setFormData(prev => ({
      ...prev,
      material: '',
      customMaterial: '',
      unitats: 1,
    }));
  };

  const isCustomMaterial = formData.material === 'Altres materials';

  return (
    <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        ➕ Afegir Material al Carrito
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Escola */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            fullWidth
            options={escoles}
            value={formData.escola || null}
            onChange={(_, newValue) => handleInputChange('escola')(newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Escola *"
                placeholder="Selecciona una escola..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <School color="action" sx={{ mr: 1 }} />,
                }}
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
            noOptionsText="No s'han trobat escoles"
          />
        </Grid>

        {/* Activitat */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            fullWidth
            options={activitats}
            value={formData.activitat || null}
            onChange={(_, newValue) => handleInputChange('activitat')(newValue || '')}
            loading={loadingActivities}
            disabled={!formData.escola}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Activitat *"
                placeholder={formData.escola ? "Selecciona una activitat..." : "Selecciona primer una escola"}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <Category color="action" sx={{ mr: 1 }} />,
                  endAdornment: (
                    <>
                      {loadingActivities ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
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
            noOptionsText="No s'han trobat activitats"
          />
        </Grid>

        {/* Material */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            fullWidth
            options={materials}
            value={formData.material || null}
            onChange={(_, newValue) => handleInputChange('material')(newValue || '')}
            loading={loadingMaterials}
            disabled={!formData.activitat}
            getOptionLabel={(option) => option === 'Altres materials' ? option : formatSentenceCase(option)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Material *"
                placeholder={formData.activitat ? "Selecciona un material..." : "Selecciona primer una activitat"}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <Inventory color="action" sx={{ mr: 1 }} />,
                  endAdornment: (
                    <>
                      {loadingMaterials ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" key={key} {...otherProps}>
                  <Inventory sx={{ mr: 1, color: 'text.secondary' }} />
                  {option === 'Altres materials' ? option : formatSentenceCase(option)}
                </Box>
              );
            }}
            noOptionsText="No s'han trobat materials"
          />
        </Grid>

        {/* Unitats */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Unitats *"
            value={formData.unitats}
            onChange={(e) => handleInputChange('unitats')(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            InputProps={{
              startAdornment: <Numbers color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Grid>

        {/* Campo custom material (aparece cuando se selecciona "Altres materials") */}
        <Grid item xs={12}>
          <Collapse in={isCustomMaterial}>
            <TextField
              fullWidth
              label="Especifica el material *"
              value={formData.customMaterial}
              onChange={(e) => handleInputChange('customMaterial')(e.target.value)}
              placeholder="Escriu el nom del material que necessites..."
              multiline
              rows={2}
            />
          </Collapse>
        </Grid>

        {/* Botón añadir */}
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleAddItem}
            disabled={loading}
            startIcon={<Add />}
            sx={{ py: 1.5 }}
          >
            Afegir al Carrito
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ItemForm; 