'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Search, Refresh, Sync } from '@mui/icons-material';
import { type Order, type Stats } from '../lib/api';
import { formatSentenceCase, formatDateCatalan } from '../utils/orderUtils';

interface MobileOrdersListProps {
  orders: Order[];
  stats: Stats | null;
  onOrderClick: (order: any) => void;
  onRefresh: () => void;
  onSync: () => void;
  updating: boolean;
  refreshingSpaces: boolean;
}

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  'Pendent':   { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' },
  'En proces': { bg: '#fff8e1', color: '#e65100', border: '#ffe082' },
  'Preparat':  { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
  'Assignat':  { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
  'Lliurat':   { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
};

const statusOrder = ['Pendent', 'En proces', 'Preparat', 'Assignat', 'Lliurat'];

function parseDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  if (dateString.includes('T') && dateString.includes('Z')) {
    const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
}

export default function MobileOrdersList({
  orders,
  stats,
  onOrderClick,
  onRefresh,
  onSync,
  updating,
  refreshingSpaces,
}: MobileOrdersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const s = formatSentenceCase(o.estat as string) || 'Pendent';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeFilter) {
      result = result.filter(o =>
        formatSentenceCase(o.estat as string) === activeFilter
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o =>
        (o.nomCognoms as string || '').toLowerCase().includes(term) ||
        (o.escola as string || '').toLowerCase().includes(term) ||
        (o.material as string || '').toLowerCase().includes(term) ||
        (o.activitat as string || '').toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const dateA = parseDate(a.dataNecessitat as string);
      const dateB = parseDate(b.dataNecessitat as string);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    return result;
  }, [orders, activeFilter, searchTerm]);

  const getStatusStyle = (estat: string) => {
    const normalized = formatSentenceCase(estat) || 'Pendent';
    return statusStyles[normalized] || statusStyles['Pendent'];
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Header: search + actions */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Cercar monitor, escola, material..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 2, fontSize: '0.85rem' }
          }}
        />
        <Tooltip title="Refrescar">
          <IconButton size="small" onClick={onRefresh} disabled={updating}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Sincronitzar">
          <IconButton size="small" onClick={onSync} disabled={refreshingSpaces}>
            <Sync fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Status filter chips */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          overflowX: 'auto',
          pb: 0.5,
          '::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Chip
          label={`Tot ${orders.length}`}
          size="small"
          variant={!activeFilter ? 'filled' : 'outlined'}
          color={!activeFilter ? 'primary' : 'default'}
          onClick={() => setActiveFilter(null)}
          sx={{ fontSize: '0.7rem', fontWeight: 500, transition: 'all 0.2s' }}
        />
        {statusOrder.map(status => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const style = statusStyles[status];
          const isActive = activeFilter === status;
          return (
            <Chip
              key={status}
              label={`${status} ${count}`}
              size="small"
              variant={isActive ? 'filled' : 'outlined'}
              onClick={() => setActiveFilter(isActive ? null : status)}
              sx={{
                fontSize: '0.7rem',
                fontWeight: 500,
                flexShrink: 0,
                transition: 'all 0.2s',
                ...(isActive && {
                  bgcolor: style.bg,
                  color: style.color,
                  borderColor: style.border,
                }),
              }}
            />
          );
        })}
      </Stack>

      {/* Order cards */}
      {filteredOrders.map(order => {
        const normalized = formatSentenceCase(order.estat as string) || 'Pendent';
        const style = getStatusStyle(order.estat as string);
        const dateStr = formatDateCatalan(order.dataNecessitat as string);
        const materialStr = order.material
          ? `${formatSentenceCase(order.material as string)}${order.unitats ? ' x' + order.unitats : ''}`
          : '';

        return (
          <Card
            key={order.id || order.idItem}
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderLeft: `3px solid ${style.color}`,
              '&:active': { bgcolor: 'action.hover' },
            }}
          >
            <CardActionArea onClick={() => onOrderClick(order)}>
              <CardContent sx={{ py: 1.25, px: 2, '&:last-child': { pb: 1.25 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Chip
                    label={normalized}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      bgcolor: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      borderRadius: '6px',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    {dateStr}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {formatSentenceCase(order.nomCognoms as string)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {order.escola}{order.activitat ? ` · ${order.activitat}` : ''}
                </Typography>
                {materialStr && (
                  <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', mt: 0.25 }}>
                    {materialStr}
                  </Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}

      {/* Empty state */}
      {filteredOrders.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <Typography variant="body2">Cap comanda trobada</Typography>
        </Box>
      )}
    </Box>
  );
}
