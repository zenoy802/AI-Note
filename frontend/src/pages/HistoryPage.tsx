import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import axios from 'axios';
import { MessageBubble } from '../components/MessageBubble';
import { colors } from '../theme';

interface HistoryItem {
  id: string;
  title: string;
  timestamp: string;
  model_name?: string;
}

interface ConversationDetail {
  id: string;
  user_input: string;
  model_name: string;
  timestamp: string;
  chat_history: Array<{
    role: string;
    content: string;
  }>;
}

const HistoryPage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(['qwen', 'kimi', 'deepseek']);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get('/api/chat/available_models');
        setAvailableModels(response.data.models);
      } catch (error) {
        console.error('Error fetching available models:', error);
      }
    };

    fetchModels();
  }, []);

  const loadRecentHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/chat/history/recent', {
        params: { days: 7, limit: 50 },
      });
      if (response.data && Array.isArray(response.data.results)) {
        const formattedResults = response.data.results.map((item: any) => ({
          ...item,
          title: item.user_input || formatDate(item.timestamp),
        }));
        setHistoryItems(formattedResults);
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error('Error loading recent history:', error);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryByModel = async (modelName: string) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/chat/history/by_model', {
        params: { model_name: modelName, limit: 50 },
      });
      if (response.data && Array.isArray(response.data.results)) {
        setHistoryItems(response.data.results);
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error(`Error loading history for model ${modelName}:`, error);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const searchHistory = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/chat/history/search', {
        params: { keyword: searchQuery.trim(), limit: 20 },
      });
      if (response.data && Array.isArray(response.data.results)) {
        setHistoryItems(response.data.results);
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error('Error searching history:', error);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetail = async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/chat/history/conversation', {
        params: { conversation_id: conversationId },
      });

      if (!response.data) {
        setSelectedConversation(null);
        return;
      }

      const { id, user_input, model_name, timestamp, chat_history } = response.data;

      if (!id || !user_input || !model_name || !timestamp || !Array.isArray(chat_history)) {
        setSelectedConversation(null);
        return;
      }

      setSelectedConversation(response.data);
    } catch (error) {
      console.error('Error loading conversation detail:', error);
      setSelectedConversation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedConversation(null);

    if (newValue === 0) {
      loadRecentHistory();
    } else if (newValue > 0 && newValue <= availableModels.length) {
      loadHistoryByModel(availableModels[newValue - 1]);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchHistory();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadRecentHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days} 天前`;
    }
    return date.toLocaleDateString('zh-CN');
  };

  const getModelColor = (modelName?: string) => {
    if (!modelName) return colors.primary.main;
    const lower = modelName.toLowerCase();
    if (lower.includes('qwen')) return colors.models.qwen;
    if (lower.includes('kimi')) return colors.models.kimi;
    if (lower.includes('deepseek')) return colors.models.deepseek;
    return colors.primary.main;
  };

  useEffect(() => {
    loadRecentHistory();
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          历史记录
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          查看和管理您的历史对话记录
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="搜索历史对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: searchQuery && (
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              ),
            }}
          />
        </Box>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-flexContainer': {
              gap: 1,
            },
          }}
        >
          <Tab
            label="全部"
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              minHeight: '36px',
            }}
          />
          {availableModels.map((model) => (
            <Tab
              key={model}
              label={model.charAt(0).toUpperCase() + model.slice(1)}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                minHeight: '36px',
              }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: 'flex', flexGrow: 1, gap: 2 }}>
        {/* History List */}
        <Paper
          elevation={0}
          sx={{
            width: '380px',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && !selectedConversation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : historyItems.length > 0 ? (
            <Box sx={{ overflow: 'auto', flexGrow: 1, p: 1 }}>
              {historyItems.map((item) => (
                <Box
                  key={item.id}
                  onClick={() => loadConversationDetail(item.id)}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    mb: 1,
                    transition: 'all 0.2s ease-in-out',
                    bgcolor:
                      selectedConversation?.id === item.id
                        ? alpha(theme.palette.primary.main, 0.1)
                        : 'transparent',
                    border:
                      selectedConversation?.id === item.id
                        ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                        : '1px solid transparent',
                    '&:hover': {
                      bgcolor:
                        selectedConversation?.id === item.id
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.action.hover, 0.5),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: alpha(getModelColor(item.model_name), 0.15),
                        color: getModelColor(item.model_name),
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {item.model_name?.charAt(0).toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ mb: 0.5 }}>
                        {item.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={item.model_name || '未知模型'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: alpha(getModelColor(item.model_name), 0.1),
                            color: getModelColor(item.model_name),
                            fontWeight: 500,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(item.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                color: 'text.secondary',
              }}
            >
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography variant="body2">
                {searchQuery ? '没有找到匹配的对话' : '暂无历史记录'}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Conversation Detail */}
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && selectedConversation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : selectedConversation ? (
            <Fade in={!!selectedConversation}>
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box
                  sx={{
                    p: 3,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={selectedConversation.model_name}
                      size="small"
                      sx={{
                        bgcolor: alpha(getModelColor(selectedConversation.model_name), 0.1),
                        color: getModelColor(selectedConversation.model_name),
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      <CalendarTodayIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {formatDate(selectedConversation.timestamp)}
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedConversation.user_input}
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
                  {selectedConversation.chat_history.map((msg, index) => (
                    <MessageBubble
                      key={index}
                      role={msg.role as 'user' | 'assistant'}
                      content={msg.content}
                      model={msg.role === 'assistant' ? selectedConversation.model_name : undefined}
                    />
                  ))}
                </Box>
              </Box>
            </Fade>
          ) : (
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
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <CalendarTodayIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.3) }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                选择对话
              </Typography>
              <Typography variant="body2" color="text.secondary">
                从左侧列表选择一个对话查看详情
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default HistoryPage;
