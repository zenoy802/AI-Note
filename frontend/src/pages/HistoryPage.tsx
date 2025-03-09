import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, ListItemButton, Divider, CircularProgress, Tabs, Tab, TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';

interface HistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

interface ConversationDetail {
  id: string;
  user_input: string;
  model_name: string; // 修改：从model改为model_name
  timestamp: string;
  chat_history: Array<{
    role: string;
    content: string;
  }>;
}

const HistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(['qwen', 'kimi', 'deepseek']);
  
  // 获取可用模型列表
  useEffect(() => {
    // 从后端获取可用模型列表
    const fetchModels = async () => {
      try {
        const response = await axios.get('/api/chat/available_models');
        setAvailableModels(response.data.models);
      } catch (error) {
        console.error('Error fetching available models:', error);
        // 如果获取失败，使用默认模型列表
        setAvailableModels(['qwen', 'kimi', 'deepseek']);
      }
    };
    
    fetchModels();
  }, []);

  // 加载最近历史记录
  const loadRecentHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/chat/history/recent', {
        params: { days: 7, limit: 50 }
      });
      if (response.data && Array.isArray(response.data.results)) {
        // 确保每个历史记录项都有title字段
        const formattedResults = response.data.results.map(item => ({
          ...item,
          title: item.user_input || formatDate(item.timestamp) // 如果没有user_input，则使用格式化的时间作为后备
        }));
        setHistoryItems(formattedResults);
      } else {
        setHistoryItems([]);
        console.error('Invalid response format for recent history');
      }
    } catch (error) {
      console.error('Error loading recent history:', error);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 按模型加载历史记录
  const loadHistoryByModel = async (modelName: string) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/chat/history/by_model', {
        params: { model_name: modelName, limit: 50 }
      });
      if (response.data && Array.isArray(response.data.results)) {
        setHistoryItems(response.data.results);
      } else {
        setHistoryItems([]);
        console.error('Invalid response format for model history');
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
        params: { keyword: searchQuery.trim(), limit: 20 }
      });
      if (response.data && Array.isArray(response.data.results)) {
        setHistoryItems(response.data.results);
      } else {
        setHistoryItems([]);
        console.error('Invalid response format for search results');
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
        params: { conversation_id: conversationId }
      });
      
      // 添加更详细的数据验证和错误处理
      if (!response.data) {
        console.error('Empty response data');
        setSelectedConversation(null);
        return;
      }

      const { id, user_input, model_name, timestamp, chat_history } = response.data;
      
      if (!id || !user_input || !model_name || !timestamp || !Array.isArray(chat_history)) {
        console.error('Invalid conversation data structure:', response.data);
        setSelectedConversation(null);
        return;
      }

      // 验证chat_history中的每条消息格式
      const isValidChatHistory = chat_history.every(msg => 
        msg && typeof msg.role === 'string' && 
        ['user', 'assistant'].includes(msg.role) && 
        typeof msg.content === 'string'
      );

      if (!isValidChatHistory) {
        console.error('Invalid chat history format:', chat_history);
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

  // 处理标签页变化
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedConversation(null);
    
    if (newValue === 0) {
      loadRecentHistory();
    } else if (newValue > 0 && newValue <= availableModels.length) {
      loadHistoryByModel(availableModels[newValue - 1]);
    }
  };

  // 处理搜索按钮点击
  const handleSearchClick = () => {
    searchHistory();
  };

  // 处理清除搜索
  const handleClearSearch = () => {
    setSearchQuery('');
    loadRecentHistory();
  };

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchHistory();
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 初始加载
  useEffect(() => {
    loadRecentHistory();
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>历史记录</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          查看和管理您的历史对话记录。
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="搜索历史对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {searchQuery && (
                    <IconButton onClick={handleClearSearch} edge="end">
                      <ClearIcon />
                    </IconButton>
                  )}
                  <IconButton onClick={handleSearchClick} edge="end">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="最近对话" />
          {availableModels.map((model, index) => (
            <Tab key={model} label={model} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: 'flex', flexGrow: 1, gap: 3 }}>
        {/* 历史记录列表 */}
        <Paper 
          elevation={0} 
          sx={{ 
            width: '40%', 
            p: 2, 
            borderRadius: 2,
            overflow: 'auto',
            height: 'calc(100vh - 280px)'
          }}
        >
          {loading && !selectedConversation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyItems.length > 0 ? (
            <List>
              {historyItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItemButton 
                    onClick={() => loadConversationDetail(item.id)}
                    selected={selectedConversation?.id === item.id}
                  >
                    <ListItemText 
                      primary={item.title} 
                      secondary={formatDate(item.timestamp)}
                    />
                  </ListItemButton>
                  {index < historyItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? '没有找到匹配的对话' : '没有历史对话记录'}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* 对话详情 */}
        <Paper 
          elevation={0} 
          sx={{ 
            flexGrow: 1, 
            p: 2, 
            borderRadius: 2,
            overflow: 'auto',
            height: 'calc(100vh - 280px)',
            bgcolor: 'background.default'
          }}
        >
          {loading && selectedConversation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedConversation ? (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedConversation.user_input}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  模型: {selectedConversation.model_name} | 时间: {formatDate(selectedConversation.timestamp)}
                </Typography>
              </Box>
              
              <List>
                {selectedConversation.chat_history.map((msg, index) => (
                  <ListItem 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      px: 0,
                      py: 1
                    }}
                  >
                    <Paper 
                      elevation={1}
                      sx={{ 
                        p: 2, 
                        maxWidth: '80%',
                        bgcolor: msg.role === 'user' ? 'primary.light' : 'background.paper',
                        color: msg.role === 'user' ? 'white' : 'text.primary',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                    </Paper>
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                选择一个对话查看详情
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default HistoryPage;