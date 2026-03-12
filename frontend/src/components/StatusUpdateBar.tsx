'use client';

import React from 'react';
import {
  Button,
  Card,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import {
  Delete,
  Clear,
  Person,
} from '@mui/icons-material';

interface StatusUpdateBarProps {
  selectedCount: number;
  selectedRows: any[];
  newStatus: string;
  globalResponsable: string;
  updating: boolean;
  deleting: boolean;
  orders: any[];
  onStatusChange: (status: string) => void;
  onResponsableChange: (name: string) => void;
  onUpdateStatus: () => void;
  onDeleteOrders: () => void;
  onRemoveIntermediary: (ids: string[]) => void;
}

export default function StatusUpdateBar({
  selectedCount,
  selectedRows,
  newStatus,
  globalResponsable,
  updating,
  deleting,
  onStatusChange,
  onResponsableChange,
  onUpdateStatus,
  onDeleteOrders,
  onRemoveIntermediary,
}: StatusUpdateBarProps) {
  if (selectedRows.length === 0) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          label="Responsable Preparació"
          value={globalResponsable}
          onChange={(e) => onResponsableChange(e.target.value)}
          placeholder="Nom del responsable"
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          helperText={globalResponsable ? "S'aplicarà a totes les files" : "Obligatori per 'En procés' i 'Preparat'"}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Nou Estat</InputLabel>
          <Select
            value={newStatus}
            label="Nou Estat"
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <MenuItem value="Pendent">Pendent</MenuItem>
            <MenuItem value="En proces">En procés</MenuItem>
            <MenuItem value="Preparat">Preparat</MenuItem>
            <MenuItem value="Assignat">Assignat</MenuItem>
            <MenuItem value="Lliurat">Lliurat</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={onUpdateStatus}
          disabled={!newStatus || updating}
        >
          Actualitzar ({selectedCount})
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={onDeleteOrders}
          disabled={deleting}
        >
          Eliminar Sol·licitud ({selectedCount})
        </Button>

        <Button
          variant="outlined"
          color="warning"
          startIcon={<Clear />}
          onClick={() => onRemoveIntermediary(selectedRows as string[])}
          disabled={updating || selectedRows.length === 0}
        >
          Eliminar Intermediari ({selectedCount})
        </Button>
      </Stack>
    </Card>
  );
}
