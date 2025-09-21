'use client';

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
} from '@mui/material';
import {
  TableChart,
  LocalShipping,
} from '@mui/icons-material';

import OrdersTable from './OrdersTable';
import DeliveryManager from './DeliveryManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export default function AdminTabs() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header amb logo i títol */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        mb: 4,
        gap: 4,
        borderBottom: '1px solid #e0e0e0',
        pb: 2,
        px: 3
      }}>
        <Box sx={{ flexShrink: 0 }}>
          <img
            src="https://www.eixoscreativa.com/wp-content/uploads/2024/01/Eixos-creativa.png.webp"
            alt="Eixos Creativa"
            style={{
              height: '60px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" color="primary" sx={{ fontWeight: 600 }}>
            Panell d'Administració - Comandes de Materials
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Gestió i seguiment de sol·licituds
          </Typography>
        </Box>
      </Box>

      {/* Navigation tabs */}
      <Paper elevation={1} sx={{ borderRadius: 0 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="admin tabs"
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              py: 1.5,
              minHeight: 48,
              color: '#6b7280',
              '&:hover': {
                color: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              },
              '&.Mui-selected': {
                color: '#1976d2'
              }
            },
            '& .MuiTabs-indicator': {
              height: 3
            }
          }}
        >
          <Tab
            label="Sol·licituds"
            icon={<TableChart />}
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            label="Entregas"
            icon={<LocalShipping />}
            iconPosition="start"
            {...a11yProps(1)}
          />
        </Tabs>
      </Paper>

      {/* Content panels */}
      <Box sx={{ p: 3 }}>
        <TabPanel value={value} index={0}>
          <OrdersTable />
        </TabPanel>

        <TabPanel value={value} index={1}>
          <DeliveryManager />
        </TabPanel>
      </Box>
    </Box>
  );
}