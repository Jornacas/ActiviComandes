'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Divider,
  Stack,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Delete,
  School,
  Category,
  Inventory,
  Numbers,
  ShoppingCart,
  Send,
} from '@mui/icons-material';
import { type CartItem } from '../lib/api';

interface CartViewProps {
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onSubmitCart: () => void;
  submitting?: boolean;
}

const formatSentenceCase = (text: string | null | undefined): string => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length === 0) return '';
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const CartView: React.FC<CartViewProps> = ({ 
  items, 
  onRemoveItem, 
  onSubmitCart, 
  submitting = false 
}) => {
  if (items.length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            El carret està buit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Afegeix materials utilitzant el formulari de dalt
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Agrupar items por escuela para mejor visualización
  const itemsBySchool = items.reduce((acc, item) => {
    if (!acc[item.escola]) {
      acc[item.escola] = [];
    }
    acc[item.escola].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + item.unitats, 0);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCart />
            Carret ({totalItems} materials)
          </Typography>
          <Chip 
            label={`${totalUnits} unitats total`} 
            color="primary" 
            variant="outlined" 
          />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {Object.entries(itemsBySchool).map(([escola, schoolItems]) => (
          <Box key={escola} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <School color="primary" />
              {escola}
            </Typography>

            <List dense>
              {schoolItems.map((item) => (
                <ListItem 
                  key={item.id}
                  sx={{ 
                    bgcolor: 'grey.50', 
                    borderRadius: 1, 
                    mb: 1,
                    border: 1,
                    borderColor: 'grey.200'
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Chip 
                          icon={<Category />} 
                          label={item.activitat} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          icon={<Inventory />} 
                          label={item.customMaterial ? `${formatSentenceCase(item.material)} (personalitzat)` : formatSentenceCase(item.material)} 
                          size="small" 
                          color="primary" 
                        />
                        <Chip 
                          icon={<Numbers />} 
                          label={`${item.unitats} unitats`} 
                          size="small" 
                          color="success" 
                        />
                      </Stack>
                    }
                    secondary={item.customMaterial ? `Material personalitzat: ${item.customMaterial}` : null}
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => onRemoveItem(item.id)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Resum:</strong> {totalItems} materials diferents per un total de {totalUnits} unitats
        </Alert>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onSubmitCart}
          disabled={submitting || items.length === 0}
          startIcon={<Send />}
          sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
        >
          {submitting ? 'Enviant Sol·licitud...' : 'Enviar Sol·licitud Completa'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CartView; 