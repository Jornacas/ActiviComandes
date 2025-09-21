'use client';

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Badge,
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
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="admin tabs"
          variant="fullWidth"
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

      <TabPanel value={value} index={0}>
        <OrdersTable />
      </TabPanel>

      <TabPanel value={value} index={1}>
        <DeliveryManager />
      </TabPanel>
    </Box>
  );
}