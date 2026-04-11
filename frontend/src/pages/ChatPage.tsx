import React, { useState, useEffect, useRef } from 'react';
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
  Chip,
  Avatar,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import ClearIcon from '@mui/icons-material/Clear';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useLocation, useNavigate } from 'react-router-dom';
import { ModelCard } from '../components/ModelCard';
import { colors } from '../theme';
import { useTheme } from '@mui/material/styles';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  id?: string;
}

interface ChatHistory {
  [key: string]: Array<{ role: string; content: string }>;
}

interface StreamEvent {
  type: 'start' | 'delta' | 'done' | 'error' | 'complete';
  model?: string;
  content?: string;
  error?: string;
}

interface ConversationDetailResponse {
  id: string;
  model_name: string;
  model_key?: string | null;
  metadata?: {
    model_key?: string | null;
  };
  chat_history: Array<{
    role: string;
    content: string;
  }>;
}

interface ChatPageProps {
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
}

const getModelColor = (model?: string): string => {
  if (!model) return colors.primary.main;
  const lowerName = model.toLowerCase();
  if (lowerName.includes('qwen')) return colors.models.qwen;
  if (lowerName.includes('kimi')) return colors.models.kimi;
  if (lowerName.includes('deepseek')) return colors.models.deepseek;
  return colors.primary.main;
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const ChatPage: React.FC<ChatPageProps> = ({ selectedModels, onModelsChange }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversation_id');
    if (!conversationId) return;

    const inferModelKey = (data: ConversationDetailResponse): string | null => {
      const candidates = [data.model_key, data.metadata?.model_key, data.model_name];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const lower = candidate.toLowerCase();
        if (availableModels.includes(candidate)) return candidate;
        const matched = availableModels.find((model) => lower.includes(model.toLowerCase()));
        if (matched) return matched;
        if (lower.includes('qwen')) return 'qwen';
        if (lower.includes('kimi')) return 'kimi';
        if (lower.includes('deepseek')) return 'deepseek';
      }
      return availableModels.length > 0 ? availableModels[0] : null;
    };

    const loadConversation = async () => {
      setIsLoadingConversation(true);
      setRestoreMessage(null);
      try {
        const response = await axios.get('/api/chat/history/conversation', {
          params: { conversation_id: conversationId },
        });
        const data = response.data as ConversationDetailResponse;
        if (!data || !Array.isArray(data.chat_history)) {
          throw new Error('Invalid conversation payload');
        }

        const modelKey = inferModelKey(data);
        if (modelKey) {
          onModelsChange([modelKey]);
        }

        const mappedMessages: Message[] = data.chat_history
          .filter(
            (msg) =>
              (msg.role === 'user' || msg.role === 'assistant') &&
              typeof msg.content === 'string' &&
              msg.content.length > 0
          )
          .map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            model: msg.role === 'assistant' ? modelKey || data.model_name : undefined,
          }));

        setMessages(mappedMessages);
        setRestoreMessage('已加载历史对话，可直接继续提问');
      } catch (error) {
        console.error('Error loading conversation from search:', error);
        setMessages([]);
        setRestoreMessage('历史对话加载失败，已切换为新会话');
      } finally {
        setIsLoadingConversation(false);
        navigate('/chat', { replace: true });
      }
    };

    loadConversation();
  }, [location.search, availableModels, onModelsChange, navigate]);

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
    if (!input.trim() || loading || isLoadingConversation || selectedModels.length === 0) return;

    const userInput = input;
    const userMessage: Message = { role: 'user', content: userInput };
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

      const assistantMessageIds: Record<string, string> = {};
      selectedModels.forEach((model) => {
        assistantMessageIds[model] = createMessageId();
      });

      setMessages((prev) => [
        ...prev,
        ...selectedModels.map((model) => ({
          role: 'assistant' as const,
          content: '',
          model,
          id: assistantMessageIds[model],
        })),
      ]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/chat/stream_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          user_input: userInput,
          model_names: selectedModels,
          history_chat_dict: Object.keys(historyChat).length > 0 ? historyChat : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const appendDelta = (model: string, content: string) => {
        const targetId = assistantMessageIds[model];
        if (!targetId) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === targetId
              ? {
                  ...msg,
                  content: msg.content + content,
                }
              : msg
          )
        );
      };

      const setError = (model: string, error?: string) => {
        const targetId = assistantMessageIds[model];
        if (!targetId) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === targetId
              ? {
                  ...msg,
                  content: msg.content || `抱歉，${model} 响应失败：${error || '未知错误'}`,
                }
              : msg
          )
        );
      };

      const handleStreamEvent = (event: StreamEvent) => {
        if (event.type === 'delta' && event.model && event.content) {
          appendDelta(event.model, event.content);
          return;
        }
        if (event.type === 'error' && event.model) {
          setError(event.model, event.error);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach((line) => {
          const payload = line.trim();
          if (!payload) return;
          const event = JSON.parse(payload) as StreamEvent;
          handleStreamEvent(event);
        });
      }

      const finalPayload = buffer.trim();
      if (finalPayload) {
        const event = JSON.parse(finalPayload) as StreamEvent;
        handleStreamEvent(event);
      }
    } catch (error) {
      const isAbortError =
        (error instanceof DOMException && error.name === 'AbortError') ||
        (typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          (error as { name?: string }).name === 'AbortError');
      if (isAbortError) {
        return;
      }
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
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  };

  // 处理按键事件 - 支持 Enter 发送, Shift+Enter / Cmd+Enter / Ctrl+Enter 换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;

    // 如果有任何修饰键（Shift/Cmd/Ctrl），则换行
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      // 手动插入换行符
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + '\n' + value.substring(end);
      setInput(newValue);
      // 恢复光标位置
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1;
      }, 0);
      return;
    }

    // 单独的 Enter 发送消息
    e.preventDefault();
    handleSend();
  };

  // 获取某个模型的所有消息（包括用户消息）
  const getModelMessages = (model: string): Message[] => {
    return messages.filter((msg) => msg.role === 'user' || msg.model === model);
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
      {restoreMessage && (
        <Alert severity={restoreMessage.includes('失败') ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {restoreMessage}
        </Alert>
      )}

      {/* Chat Messages - Multi-column layout */}
      {messages.length === 0 || isLoadingConversation ? (
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
              {isLoadingConversation ? '正在加载历史对话' : '开始对话'}
            </Typography>
            {isLoadingConversation ? (
              <CircularProgress size={24} sx={{ mt: 1 }} />
            ) : (
              <>
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
              </>
            )}
          </Box>
        </Paper>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            mb: 2,
            display: 'flex',
            gap: 2,
            overflow: 'hidden',
          }}
        >
          {selectedModels.map((model) => (
            <Paper
              key={model}
              elevation={0}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                overflow: 'hidden',
                minWidth: 0, // 防止 flex item 溢出
              }}
            >
              {/* Model Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (theme) => alpha(getModelColor(model), 0.05),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: alpha(getModelColor(model), 0.15),
                    color: getModelColor(model),
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>
                  {model.charAt(0).toUpperCase() + model.slice(1)}
                </Typography>
              </Box>

              {/* Messages Area */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                }}
              >
                {getModelMessages(model).map((message, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', maxWidth: '90%' }}>
                      {message.role === 'assistant' && (
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '8px',
                            bgcolor: alpha(getModelColor(message.model), 0.15),
                            color: getModelColor(message.model),
                          }}
                        >
                          <SmartToyIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor:
                            message.role === 'user'
                              ? alpha(colors.primary.main, 0.1)
                              : (theme) => alpha(theme.palette.background.paper, 0.8),
                          color: 'text.primary',
                          borderRadius:
                            message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                          border: '1px solid',
                          borderColor:
                            message.role === 'user'
                              ? alpha(colors.primary.main, 0.2)
                              : (theme) => theme.palette.divider,
                          maxWidth: '100%',
                          overflow: 'auto',
                        }}
                      >
                        <Box sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                          <ReactMarkdown
                            components={{
                              code({ inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const code = String(children).replace(/\n$/, '');
                                if (!inline && match) {
                                  return (
                                    <SyntaxHighlighter
                                      style={theme.palette.mode === 'dark' ? oneDark : oneLight}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{
                                        margin: '8px 0',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                      }}
                                    >
                                      {code}
                                    </SyntaxHighlighter>
                                  );
                                }
                                return (
                                  <code
                                    style={{
                                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.8em',
                                      fontFamily: 'monospace',
                                    }}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              p: ({ children }) => (
                                <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.7 }}>
                                  {children}
                                </Typography>
                              ),
                              h1: ({ children }) => (
                                <Typography variant="h6" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                                  {children}
                                </Typography>
                              ),
                              h2: ({ children }) => (
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                                  {children}
                                </Typography>
                              ),
                              h3: ({ children }) => (
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1.5, mb: 0.5 }}>
                                  {children}
                                </Typography>
                              ),
                              ul: ({ children }) => (
                                <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                                  {children}
                                </Box>
                              ),
                              ol: ({ children }) => (
                                <Box component="ol" sx={{ pl: 2, mb: 1 }}>
                                  {children}
                                </Box>
                              ),
                              li: ({ children }) => (
                                <Box component="li" sx={{ mb: 0.5 }}>
                                  {children}
                                </Box>
                              ),
                              blockquote: ({ children }) => (
                                <Box
                                  component="blockquote"
                                  sx={{
                                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                                    pl: 1.5,
                                    py: 0.5,
                                    my: 1,
                                    color: 'text.secondary',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  {children}
                                </Box>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </Box>
                      </Paper>
                      {message.role === 'user' && (
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '8px',
                            bgcolor: colors.primary.main,
                            color: '#fff',
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      )}
                    </Box>
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={20} thickness={2} />
                  </Box>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

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
            placeholder="输入您的问题... (Enter 发送, Shift+Enter / Cmd+Enter 换行)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || isLoadingConversation}
            inputRef={inputRef}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
              },
            }}
          />
          <Button
            variant="contained"
            color={loading ? 'error' : 'primary'}
            endIcon={loading ? <StopIcon /> : <SendIcon />}
            onClick={loading ? handleStop : handleSend}
            disabled={isLoadingConversation || selectedModels.length === 0 || (!loading && !input.trim())}
            sx={{
              py: 1.5,
              px: 3,
              minWidth: 100,
              background: loading
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: loading
                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, #5558e0 0%, #7c4fe0 100%)',
              },
            }}
          >
            {loading ? '停止' : '发送'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatPage;
