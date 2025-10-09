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
  const altresMaterials: string[] = [];
  
  materials.forEach(material => {
    if (material === 'Altres materials') {
      altresMaterials.push(material);
    } else if (material.toUpperCase().startsWith('SOBRE')) {
      sobreMaterials.push(material);
    } else {
      otherMaterials.push(material);
    }
  });
  
  otherMaterials.sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }));
  
  // Return materials with "Altres materials" at the end if present
  return [...sobreMaterials, ...otherMaterials, ...altresMaterials];
};

interface ItemFormProps {
  escoles: string[];
  selectedMonitor: string;
  onAddItem: (item: CartItem) => void;
  loading?: boolean;
}

const ItemForm: React.FC<ItemFormProps> = ({ escoles, selectedMonitor, onAddItem, loading = false }) => {
  const [formData, setFormData] = useState({
    escola: '',
    activitat: '',
    material: '',
    customMaterial: '',
    unitats: 1,
  });
  
  const [filteredEscoles, setFilteredEscoles] = useState<string[]>([]);
  const [activitats, setActivitats] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [loadingEscoles, setLoadingEscoles] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schools for the selected monitor
  useEffect(() => {
    if (selectedMonitor) {
      loadSchoolsForMonitor(selectedMonitor);
    } else {
      setFilteredEscoles([]);
    }
  }, [selectedMonitor]);

  const loadSchoolsForMonitor = async (monitor: string) => {
    if (!monitor) {
      setFilteredEscoles([]);
      return;
    }

    setLoadingEscoles(true);
    try {
      // Special case: "eixos" admin mode - load all schools
      if (monitor.toLowerCase() === 'eixos') {
        console.log('🔑 Admin mode activated: eixos');
        const response = await apiClient.getEscoles();
        if (response.success && response.data) {
          setFilteredEscoles(response.data);
        } else {
          setFilteredEscoles([]);
        }
      } else {
        // Normal mode: filter schools by monitor
        const response = await apiClient.getSchoolsByMonitor(monitor);
        if (response.success && response.data) {
          setFilteredEscoles(response.data);
        } else {
          setFilteredEscoles([]);
        }
      }
    } catch (err) {
      console.error(`Error loading schools for monitor ${monitor}:`, err);
      setFilteredEscoles([]);
    } finally {
      setLoadingEscoles(false);
    }
  };

  const loadActivitiesForSchool = async (school: string) => {
    if (!school || !selectedMonitor) {
      setActivitats([]);
      return;
    }

    setLoadingActivities(true);
    try {
      // Special case: "eixos" admin mode - load all activities for school
      if (selectedMonitor.toLowerCase() === 'eixos') {
        console.log('🔑 Admin mode: Loading all activities for school', school);
        const response = await apiClient.getActivitiesBySchool(school);
        if (response.success && response.data) {
          setActivitats(response.data);
        } else {
          setActivitats([]);
        }
      } else {
        // Normal mode: filter activities by monitor and school
        const response = await apiClient.getActivitiesByMonitorAndSchool(selectedMonitor, school);
        if (response.success && response.data) {
          setActivitats(response.data);
        } else {
          setActivitats([]);
        }
      }
    } catch (err) {
      console.error(`Error loading activities for monitor ${selectedMonitor} and school ${school}:`, err);
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

    // Check if it's a TC activity - force manual entry
    const baseActivity = activity.match(/^([A-Z]+)/)?.[1] || '';
    if (baseActivity === 'TC') {
      setMaterials(['Altres materials']); // Only manual entry for TC
      return;
    }

    setLoadingMaterials(true);
    try {
      const response = await apiClient.getMaterialsByActivity(activity);
      if (response.success && response.data && response.data.length > 0) {
        // Add "Altres materials" option to allow custom materials
        const materialsWithCustom = [...response.data, 'Altres materials'];
        setMaterials(sortMaterials(materialsWithCustom));
      } else {
        // If no materials found, allow manual entry
        console.warn(`No materials found for activity ${activity}, allowing manual entry`);
        setMaterials(['Altres materials']);
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
    <Box sx={{ 
      p: { xs: 2, sm: 3 }, 
      border: 1, 
      borderColor: 'divider', 
      borderRadius: { xs: 1, sm: 2 }, 
      mb: { xs: 2, sm: 3 },
      backgroundColor: 'background.paper'
    }}>
      <Typography 
        variant="h6" 
        gutterBottom 
        color="primary"
        sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
      >
        ➕ Afegir Material al Carret
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
            options={filteredEscoles}
            value={formData.escola || null}
            onChange={(_, newValue) => handleInputChange('escola')(newValue || '')}
            loading={loadingEscoles}
            disabled={!selectedMonitor}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Escola *"
                placeholder={selectedMonitor ? "Selecciona una escola..." : "Primer selecciona un monitor"}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <School color="action" sx={{ mr: 1 }} />,
                  endAdornment: (
                    <>
                      {loadingEscoles ? <CircularProgress color="inherit" size={20} /> : null}
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
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              handleInputChange('unitats')(value);
            }}
            inputProps={{ min: 1 }}
            placeholder="1"
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
            sx={{ py: 1.5, textTransform: 'none' }}
          >
            Afegir al Carret
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ItemForm; 