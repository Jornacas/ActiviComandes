'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Fab,
  Drawer,
  Typography,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  SmartToy,
  Send,
  Close,
  DeleteOutline,
} from '@mui/icons-material';
import { API_BASE_URL, API_TOKEN } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CopilotChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/copilot/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Error desconegut'}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error de connexió: ${error instanceof Error ? error.message : 'Error desconegut'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  const formatMessage = (content: string) => {
    // Escape HTML first to prevent XSS
    let escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // Markdown bàsic: negreta, cursiva, codi, taules
    let html = escaped
      // Blocs de codi
      .replace(/```([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow-x:auto;font-size:0.85em">$1</pre>')
      // Negreta
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Cursiva
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Codi inline
      .replace(/`(.*?)`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-size:0.9em">$1</code>')
      // Llistes
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*)/gm, '<li>$2</li>')
      // Taules simples (headers)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.some(c => /^[-:]+$/.test(c.trim()))) return '';
        const isHeader = cells.every(c => c === c.toUpperCase() || /\*\*/.test(c));
        const tag = isHeader ? 'th' : 'td';
        const style = isHeader
          ? 'style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;font-size:0.85em"'
          : 'style="padding:4px 8px;border:1px solid #ddd;font-size:0.85em"';
        return `<tr>${cells.map(c => `<${tag} ${style}>${c.trim()}</${tag}>`).join('')}</tr>`;
      })
      // Salts de línia
      .replace(/\n/g, '<br/>');

    // Embolicar li en ul
    html = html.replace(/(<li>.*?<\/li>(\s*<br\/>)*)+/g, (match) => {
      return `<ul style="margin:4px 0;padding-left:20px">${match.replace(/<br\/>/g, '')}</ul>`;
    });

    // Embolicar tr en table
    html = html.replace(/(<tr>.*?<\/tr>(\s*<br\/>)*)+/g, (match) => {
      return `<table style="border-collapse:collapse;margin:8px 0;width:100%">${match.replace(/<br\/>/g, '')}</table>`;
    });

    return html;
  };

  return (
    <>
      {/* Botó flotant */}
      <Tooltip title="Assistent IA" placement="left">
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            width: 60,
            height: 60,
            background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
            boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #651fff 100%)',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <SmartToy sx={{ fontSize: 28 }} />
        </Fab>
      </Tooltip>

      {/* Panel de chat */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
          color: 'white',
        }}>
          <SmartToy sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
            Assistent IA
          </Typography>
          <Tooltip title="Netejar conversa">
            <IconButton size="small" onClick={clearChat} sx={{ color: 'white', mr: 0.5 }}>
              <DeleteOutline />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>

        {/* Missatges */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: '#f8f9fa',
        }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
              <SmartToy sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Hola! Soc l'assistent d'ActiviComandes.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Puc ajudar-te amb consultes, canviar estats, optimitzar entregues i molt mes.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  'Quants pedidos pendents hi ha?',
                  'Quins monitors van a Lestonnac?',
                  'Optimitza les entregues preparades',
                ].map((suggestion, i) => (
                  <Paper
                    key={i}
                    onClick={() => { setInput(suggestion); }}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      bgcolor: 'white',
                      '&:hover': { bgcolor: '#e3f2fd' },
                      transition: 'all 0.15s',
                    }}
                  >
                    {suggestion}
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  maxWidth: '85%',
                  bgcolor: msg.role === 'user' ? '#1976d2' : 'white',
                  color: msg.role === 'user' ? 'white' : 'text.primary',
                  borderRadius: msg.role === 'user'
                    ? '12px 12px 2px 12px'
                    : '12px 12px 12px 2px',
                  border: msg.role === 'assistant' ? '1px solid #e0e0e0' : 'none',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  '& strong': { fontWeight: 600 },
                  '& table': { fontSize: '0.8rem' },
                  '& pre': { fontSize: '0.8rem' },
                }}
              >
                {msg.role === 'user' ? (
                  <Typography variant="body2">{msg.content}</Typography>
                ) : (
                  <Box
                    sx={{ '& br + br': { display: 'none' } }}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                )}
              </Paper>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Pensant...
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{
          p: 2,
          borderTop: '1px solid #e0e0e0',
          bgcolor: 'white',
          display: 'flex',
          gap: 1,
        }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            placeholder="Escriu un missatge..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            sx={{
              bgcolor: '#1976d2',
              color: 'white',
              '&:hover': { bgcolor: '#1565c0' },
              '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
              borderRadius: 2,
              width: 42,
              height: 42,
            }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
}
