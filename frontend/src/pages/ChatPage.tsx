import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  alpha,
  Tooltip,
  Fade,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';
import { MessageBubble } from '../components/MessageBubble';
import { ModelCard } from '../components/ModelCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

interface ChatHistory {
  [key: string]: Array<{ role: string; content: string }>;
}

interface ChatPageProps {
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ selectedModels, onModelsChange }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 获取可用模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get('/api/chat/available_models');
        setAvailableModels(response.data.models);
        if (response.data.models.length > 0 && selectedModels.length === 0) {
          onModelsChange([response.data.models[0]]);
        }
      } catch (error) {
        console.error('Error fetching available models:', error);
        setAvailableModels(['qwen', 'kimi', 'deepseek']);
        if (selectedModels.length === 0) {
          onModelsChange(['qwen']);
        }
      }
    };

    fetchModels();
  }, []);

  // 滚动到最新消息
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 处理模型切换
  const toggleModel = (model: string) => {
    if (selectedModels.includes(model)) {
      if (selectedModels.length > 1) {
        onModelsChange(selectedModels.filter((m) => m !== model));
      }
    } else {
      onModelsChange([...selectedModels, model]);
    }
  };

  // 清空对话
  const clearChat = () => {
    if (window.confirm('确定要清空当前对话吗？')) {
      setMessages([]);
    }
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyChat: ChatHistory = {};
      if (messages.length > 0) {
        selectedModels.forEach((model) => {
          historyChat[model] = messages
            .filter((msg) => !msg.model || msg.model === model || msg.role === 'user')
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            }));
        });
      }

      const endpoint = messages.length > 0 ? '/api/chat/continue_chat' : '/api/chat/start_chat';
      const response = await axios.post(endpoint, {
        user_input: input,
        model_names: selectedModels,
        history_chat_dict: Object.keys(historyChat).length > 0 ? historyChat : undefined,
      });

      const chatDict = response.data.chat_dict;

      Object.entries(chatDict).forEach(([model, responses]: [string, any[]]) => {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse && lastResponse.role === 'assistant') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: lastResponse.content,
              model,
            },
          ]);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，发生了错误，请稍后再试。',
          model: 'system',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Model Selection */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            选择模型
          </Typography>
          {messages.length > 0 && (
            <Tooltip title="清空对话">
              <IconButton onClick={clearChat} size="small" color="error">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
          {availableModels.map((model) => (
            <ModelCard
              key={model}
              name={model}
              displayName={model.charAt(0).toUpperCase() + model.slice(1)}
              selected={selectedModels.includes(model)}
              onClick={() => toggleModel(model)}
            />
          ))}
        </Box>
      </Paper>

      {/* Chat Messages */}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          mb: 2,
          p: 3,
          overflow: 'auto',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                opacity: 0.1,
              }}
            >
              <Typography sx={{ fontSize: 40 }}>💬</Typography>
            </Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              开始对话
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
              选择上方的 AI 模型，输入您的问题开始对话。
              <br />
              可以同时选择多个模型进行对比。
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              {['写一篇关于春天的诗歌', '解释量子计算原理', '帮我优化这段代码'].map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  variant="outlined"
                  onClick={() => setInput(prompt)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      borderColor: 'primary.main',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Fade in={messages.length > 0}>
            <Box>
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  role={message.role}
                  content={message.content}
                  model={message.model}
                />
              ))}
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} thickness={2} />
                    <Typography variant="body2" color="text.secondary">
                      AI 正在思考...
                    </Typography>
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>
          </Fade>
        )}
      </Paper>

      {/* Input Area */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            variant="outlined"
            placeholder="输入您的问题... (Enter 发送, Shift+Enter 换行)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            inputRef={inputRef}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{
              py: 1.5,
              px: 3,
              minWidth: 100,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5558e0 0%, #7c4fe0 100%)',
              },
            }}
          >
            发送
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatPage;
