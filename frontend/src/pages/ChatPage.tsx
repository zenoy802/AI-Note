import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Chip, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';

// 定义消息类型
interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

// 定义聊天历史类型
interface ChatHistory {
  [key: string]: Array<{ role: string; content: string }>;
}

const ChatPage: React.FC = () => {
  // 状态管理
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(['qwen']);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取可用模型列表
  useEffect(() => {
    // 从后端获取可用模型列表
    const fetchModels = async () => {
      try {
        const response = await axios.get('/api/chat/available_models');
        setAvailableModels(response.data.models);
        // 如果当前选择的模型不在可用列表中，则选择第一个可用模型
        if (response.data.models.length > 0 && !response.data.models.includes(selectedModels[0])) {
          setSelectedModels([response.data.models[0]]);
        }
      } catch (error) {
        console.error('Error fetching available models:', error);
        // 如果获取失败，使用默认模型列表
        setAvailableModels(['qwen', 'kimi', 'deepseek']);
      }
    };
    
    fetchModels();
  }, []);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理模型选择变化
  const handleModelChange = (event: SelectChangeEvent<typeof selectedModels>) => {
    const value = event.target.value;
    setSelectedModels(typeof value === 'string' ? value.split(',') : value);
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 构建历史对话格式
      const historyChat: ChatHistory = {};
      if (messages.length > 0) {
        selectedModels.forEach(model => {
          historyChat[model] = messages
            .filter(msg => !msg.model || msg.model === model)
            .map(msg => ({
              role: msg.role,
              content: msg.content
            }));
        });
      }

      // 发送API请求
      const endpoint = messages.length > 0 ? '/api/chat/continue_chat' : '/api/chat/start_chat';
      const response = await axios.post(endpoint, {
        user_input: input,
        model_names: selectedModels,
        history_chat_dict: Object.keys(historyChat).length > 0 ? historyChat : undefined
      });

      // 处理响应
      const chatDict = response.data.chat_dict;
      
      // 添加每个模型的回复
      Object.entries(chatDict).forEach(([model, responses]: [string, any[]]) => {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse && lastResponse.role === 'assistant') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: lastResponse.content,
            model
          }]);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后再试。',
        model: 'system'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="model-select-label">选择模型</InputLabel>
          <Select
            labelId="model-select-label"
            multiple
            value={selectedModels}
            onChange={handleModelChange}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {availableModels.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1, 
          mb: 2, 
          p: 2, 
          overflow: 'auto',
          bgcolor: 'background.default',
          borderRadius: 2
        }}
      >
        {messages.map((message, index) => (
          <Box 
            key={index} 
            sx={{ 
              mb: 2, 
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {message.model && message.role === 'assistant' && (
              <Typography variant="caption" sx={{ ml: 1, mb: 0.5 }}>
                {message.model}
              </Typography>
            )}
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                maxWidth: '80%',
                bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                color: message.role === 'user' ? 'white' : 'text.primary',
                borderRadius: 2
              }}
            >
              <ReactMarkdown
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={atomDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </Paper>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="输入您的问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          发送
        </Button>
      </Box>
    </Box>
  );
};

export default ChatPage;