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
      {/* Modern Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Toolbar sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <Business sx={{
              mr: 1.5,
              fontSize: '2rem',
              color: '#fff',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }} />
            <Box>
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                Eixos Creativa
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.85rem'
                }}
              >
                Panell d'Administració
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        py: 6,
        textAlign: 'center'
      }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 800,
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Gestió de Materials Educatius
          </Typography>
          <Typography
            variant="h6"
            sx={{
              opacity: 0.9,
              fontWeight: 300,
              maxWidth: '600px',
              mx: 'auto'
            }}
          >
            Sistema integral per la gestió i seguiment de sol·licituds de materials
          </Typography>
        </Container>
      </Box>

      {/* Navigation tabs */}
      <Container maxWidth="xl" sx={{ mt: -3, position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}
        >
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="admin tabs"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                py: 3,
                minHeight: 80,
                color: '#6b7280',
                transition: 'all 0.3s ease',
                '&:hover': {
                  color: '#667eea',
                  backgroundColor: 'rgba(102, 126, 234, 0.05)'
                },
                '&.Mui-selected': {
                  color: '#667eea',
                  backgroundColor: 'rgba(102, 126, 234, 0.08)'
                }
              },
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: '2px 2px 0 0',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
              }
            }}
          >
            <Tab
              label="Sol·licituds"
              icon={<TableChart sx={{ fontSize: '1.5rem !important' }} />}
              iconPosition="start"
              {...a11yProps(0)}
            />
            <Tab
              label="Entregas"
              icon={<LocalShipping sx={{ fontSize: '1.5rem !important' }} />}
              iconPosition="start"
              {...a11yProps(1)}
            />
          </Tabs>
        </Paper>

        {/* Content panels */}
        <Box sx={{ mt: 4, pb: 6 }}>
          <TabPanel value={value} index={0}>
            <Box sx={{
              '& .MuiCard-root': {
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)'
              }
            }}>
              <OrdersTable />
            </Box>
          </TabPanel>

          <TabPanel value={value} index={1}>
            <Box sx={{
              '& .MuiCard-root': {
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)'
              }
            }}>
              <DeliveryManager />
            </Box>
          </TabPanel>
        </Box>
      </Container>
    </Box>
  );
}