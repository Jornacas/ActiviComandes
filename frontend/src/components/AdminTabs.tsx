'use client';

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Badge,
  AppBar,
  Toolbar,
  Typography,
  Container,
} from '@mui/material';
import {
  TableChart,
  LocalShipping,
  Business,
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
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Header original simple */}
      <AppBar position="static" sx={{ mb: 0 }}>
        <Toolbar>
          <Business sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Panell d'Administració - Comandes de Materials
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Gestió i seguiment de sol·licituds
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Navigation tabs - directament sota el header */}
      <Container maxWidth="xl" sx={{ px: 0 }}>
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
      </Container>
    </Box>
  );
}