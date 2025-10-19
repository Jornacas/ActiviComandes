'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Close,
  DragIndicator,
} from '@mui/icons-material';

interface MobileAppWindowProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export default function MobileAppWindow({ open, onClose, url }: MobileAppWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Centrar la finestra quan s'obre
  useEffect(() => {
    if (open) {
      const centerX = (window.innerWidth - 400) / 2;
      const centerY = (window.innerHeight - 750) / 2;
      setPosition({ x: centerX, y: Math.max(50, centerY) });
    }
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Només iniciar drag des de la capçalera
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Limitar per no sortir de la pantalla
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 100;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  if (!open) return null;

  return (
    <>
      {/* Overlay semi-transparent */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1300,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />

      {/* Finestra flotant amb format de mòbil */}
      <Paper
        ref={windowRef}
        elevation={24}
        sx={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '400px',
          height: '750px',
          zIndex: 1400,
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : 'box-shadow 0.3s ease',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          border: '8px solid #1a1a1a',
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Capçalera arrossegable */}
        <Box
          className="drag-handle"
          sx={{
            backgroundColor: '#1a1a1a',
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            userSelect: 'none',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIndicator sx={{ fontSize: 20, opacity: 0.7 }} />
            <Box sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
              App Móvil - ActiviComandes
            </Box>
          </Box>
          <Tooltip title="Tancar">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Simulació de notch d'iPhone */}
        <Box
          sx={{
            height: '30px',
            backgroundColor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: '150px',
              height: '25px',
              backgroundColor: '#1a1a1a',
              borderRadius: '0 0 15px 15px',
            }}
          />
        </Box>

        {/* Contingut - iframe amb l'app */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: 'white',
            overflow: 'hidden',
          }}
        >
          <iframe
            src={url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
            title="App Móvil"
          />
        </Box>

        {/* Barra inferior de l'iPhone (home indicator) */}
        <Box
          sx={{
            height: '30px',
            backgroundColor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: '120px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
            }}
          />
        </Box>
      </Paper>
    </>
  );
}
