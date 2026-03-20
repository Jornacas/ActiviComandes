'use client';

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  TableChart,
  LocalShipping,
  PhoneAndroid,
  OpenInNew,
  Help,
} from '@mui/icons-material';

import OrdersTable from './OrdersTable';
import DeliveryManager from './DeliveryManager';
import HelpSection from './HelpSection';
import MobileAppWindow from './MobileAppWindow';
import CopilotChat from './CopilotChat';

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
  const [mobileAppOpen, setMobileAppOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header amb logo, títol i botó app móvil */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        mb: { xs: 2, sm: 4 },
        gap: { xs: 1.5, sm: 4 },
        borderBottom: '1px solid #e0e0e0',
        pb: 2,
        px: { xs: 1.5, sm: 3 }
      }}>
        <Box sx={{ flexShrink: 0 }}>
          <img
            src="https://www.eixoscreativa.com/wp-content/uploads/2024/01/Eixos-creativa.png.webp"
            alt="Eixos Creativa"
            style={{
              height: isMobile ? '36px' : '60px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography
            variant={isMobile ? 'h6' : 'h4'}
            component="h1"
            color="primary"
            sx={{ fontWeight: 600 }}
          >
            {isMobile ? 'Comandes' : "Panell d'Administració - Comandes de Materials"}
          </Typography>
          {!isMobile && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
              Gestió i seguiment de sol·licituds
            </Typography>
          )}
        </Box>
        {!isMobile && (
          <Box sx={{ flexShrink: 0 }}>
            <Tooltip title="Obrir App Móvil per crear sol·licituds">
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PhoneAndroid />}
                onClick={() => setMobileAppOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(156, 39, 176, 0.2)',
                  background: 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(156, 39, 176, 0.3)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                App Móvil
              </Button>
            </Tooltip>
          </Box>
        )}
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
              fontSize: isMobile ? '0.8rem' : '0.95rem',
              fontWeight: 500,
              py: 1.5,
              minHeight: 48,
              minWidth: 0,
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
            label={isMobile ? undefined : "Sol·licituds"}
            icon={<TableChart />}
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            label={isMobile ? undefined : "Lliuraments"}
            icon={<LocalShipping />}
            iconPosition="start"
            {...a11yProps(1)}
          />
          <Tab
            label={isMobile ? undefined : "Ajuda"}
            icon={<Help />}
            iconPosition="start"
            {...a11yProps(2)}
          />
        </Tabs>
      </Paper>

      {/* Content panels */}
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <TabPanel value={value} index={0}>
          <OrdersTable />
        </TabPanel>

        <TabPanel value={value} index={1}>
          <DeliveryManager />
        </TabPanel>

        <TabPanel value={value} index={2}>
          <HelpSection />
        </TabPanel>
      </Box>

      {/* Finestra flotant de l'App Mòbil */}
      <MobileAppWindow
        open={mobileAppOpen}
        onClose={() => setMobileAppOpen(false)}
        url="https://activicomandes-mobil.vercel.app"
      />

      {/* Assistent IA Copilot */}
      <CopilotChat />
    </Box>
  );
}
