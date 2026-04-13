import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Slider,
  Fade,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import ChatIcon from '@mui/icons-material/Chat';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';

interface SearchResult {
  query: string;
  summary?: string;
  results: Array<{
    text: string;
    metadata: {
      parent_id: string;
      model_name: string;
      timestamp: string;
    };
    relevance_score: number;
  }>;
}

interface SearchPageProps {
  selectedModels: string[];
}

interface PersistedSearchState {
  query: string;
  topK: number;
  results: SearchResult | null;
  error: string | null;
}

const SEARCH_PAGE_STATE_KEY = 'searchPageState';

const SearchPage: React.FC<SearchPageProps> = ({ selectedModels }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [topK, setTopK] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{ indexed_chunks: number } | null>(null);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SEARCH_PAGE_STATE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as PersistedSearchState;
      if (typeof parsed.query === 'string') {
        setQuery(parsed.query);
      }
      if (typeof parsed.topK === 'number') {
        setTopK(parsed.topK);
      }
      if (parsed.results) {
        setResults(parsed.results);
      }
      if (typeof parsed.error === 'string') {
        setError(parsed.error);
      }
    } catch {
      sessionStorage.removeItem(SEARCH_PAGE_STATE_KEY);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const hasState = query.trim() || results || error || topK !== 5;
    if (!hasState) {
      sessionStorage.removeItem(SEARCH_PAGE_STATE_KEY);
      return;
    }
    const payload: PersistedSearchState = {
      query,
      topK,
      results,
      error,
    };
    sessionStorage.setItem(SEARCH_PAGE_STATE_KEY, JSON.stringify(payload));
  }, [query, topK, results, error, loading]);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post('/api/search/semantic', {
        query: query.trim(),
        top_k: topK,
      });

      if (response.data) {
        setResults(response.data);
      } else {
        setError('返回数据格式不正确');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.detail || '搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 获取索引状态
  const fetchIndexStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/search/index/status');
      setIndexStatus(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch index status:', err);
      return null;
    }
  }, []);

  // 保存索引状态到 localStorage
  const saveIndexingState = (isActive: boolean, message: string = '') => {
    if (isActive) {
      localStorage.setItem('indexingState', JSON.stringify({
        isIndexing: true,
        message,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('indexingState');
    }
  };

  // 恢复索引状态
  const restoreIndexingState = useCallback(async () => {
    const saved = localStorage.getItem('indexingState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        const age = Date.now() - state.timestamp;
        // 如果状态在30分钟内，恢复它
        if (age < 30 * 60 * 1000) {
          setIsIndexing(true);
          setIndexMessage(state.message || '索引任务进行中...');
          // 立即获取最新状态
          const status = await fetchIndexStatus();
          // 如果已经看到索引数量变化，可能已经完成
          if (status) {
            setIndexStatus(status);
          }
          return true;
        } else {
          localStorage.removeItem('indexingState');
        }
      } catch {
        localStorage.removeItem('indexingState');
      }
    }
    return false;
  }, [fetchIndexStatus]);

  // 触发重新索引
  const handleReindex = async () => {
    if (isIndexing) return;

    setIsIndexing(true);
    setIndexMessage('索引任务已开始');
    saveIndexingState(true, '索引任务已开始');

    try {
      const response = await axios.post('/api/search/index', {
        days_limit: null, // 索引所有对话
      });

      const msg = response.data.message || '索引任务进行中...';
      setIndexMessage(msg);
      saveIndexingState(true, msg);

      // 轮询检查索引状态
      let attempts = 0;
      const maxAttempts = 60; // 最多轮询60次（2分钟）
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get('/api/search/index/status');
          setIndexStatus(statusRes.data);

          // 如果索引完成或达到最大尝试次数，停止轮询
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsIndexing(false);
            setIndexMessage('索引状态已更新');
            saveIndexingState(false);
          }
        } catch (err) {
          console.error('Failed to poll index status:', err);
        }
      }, 2000); // 每2秒检查一次

      // 60秒后自动停止轮询状态
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsIndexing(false);
        saveIndexingState(false);
      }, 60000);

    } catch (err: any) {
      console.error('Indexing error:', err);
      setError(err.response?.data?.detail || '索引失败，请稍后重试');
      setIsIndexing(false);
      saveIndexingState(false);
    }
  };

  // 组件挂载时获取索引状态
  useEffect(() => {
    // 先尝试恢复之前的索引状态
    restoreIndexingState().then((wasRestored) => {
      // 无论如何都获取一次最新状态
      fetchIndexStatus();

      // 如果恢复了状态，继续轮询
      if (wasRestored) {
        const pollInterval = setInterval(async () => {
          try {
            const status = await fetchIndexStatus();
            if (status) {
              setIndexStatus(status);
            }
          } catch (err) {
            console.error('Failed to poll index status:', err);
          }
        }, 3000);

        // 30秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsIndexing(false);
          saveIndexingState(false);
        }, 30000);
      }
    });
  }, [fetchIndexStatus, restoreIndexingState]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getModelColor = (modelName: string) => {
    const lower = modelName.toLowerCase();
    if (lower.includes('gemini')) return colors.models.gemini;
    if (lower.includes('claude')) return colors.models.claude;
    if (lower.includes('gpt')) return colors.models.gpt;
    if (lower.includes('qwen')) return colors.models.qwen;
    if (lower.includes('kimi')) return colors.models.kimi;
    if (lower.includes('deepseek')) return colors.models.deepseek;
    return colors.primary.main;
  };

  const suggestedQueries = [
    '如何提高编程效率',
    '解释机器学习原理',
    'Python 异步编程',
    '数据库优化技巧',
  ];

  const handleContinueChat = (conversationId: string) => {
    navigate(`/chat?conversation_id=${encodeURIComponent(conversationId)}&from=search`);
  };

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
          知识搜索
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            通过语义搜索查找您的历史对话，AI 将为您智能匹配相关内容
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleReindex}
            disabled={isIndexing}
            startIcon={isIndexing ? <CircularProgress size={16} /> : <RefreshIcon />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            {isIndexing ? '索引中...' : '重新索引'}
          </Button>
        </Box>

        {/* 索引状态提示 */}
        {(indexMessage || indexStatus) && (
          <Alert
            severity={isIndexing ? 'info' : 'success'}
            sx={{ mb: 2 }}
            icon={<StorageIcon />}
          >
            {indexMessage && <div>{indexMessage}</div>}
            {indexStatus && (
              <div style={{ marginTop: 4, fontSize: '0.875rem', opacity: 0.8 }}>
                已索引对话片段: {indexStatus.indexed_chunks} 个
              </div>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="输入搜索关键词..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            sx={{
              px: 4,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5558e0 0%, #7c4fe0 100%)',
              },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : '搜索'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 70 }}>
              结果数量
            </Typography>
            <Slider
              value={topK}
              min={1}
              max={10}
              step={1}
              onChange={(_, value) => setTopK(value as number)}
              valueLabelDisplay="auto"
              sx={{ maxWidth: 200 }}
            />
          </Box>
        </Box>

        {!query && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              试试这些搜索建议：
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {suggestedQueries.map((q) => (
                <Chip
                  key={q}
                  label={q}
                  variant="outlined"
                  onClick={() => setQuery(q)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      borderColor: 'primary.main',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {results && !loading && (
        <Fade in={!!results}>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {/* AI Summary */}
            {results.summary && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 2,
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    AI 智能摘要
                  </Typography>
                </Box>
                <Box sx={{ color: 'text.primary', lineHeight: 1.8 }}>
                  <ReactMarkdown>{results.summary}</ReactMarkdown>
                </Box>
              </Paper>
            )}

            {/* Results */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              相关对话 ({results.results.length})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.results.map((result, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      boxShadow: theme.shadows[2],
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      icon={<LightbulbIcon sx={{ fontSize: 16 }} />}
                      label={`相关度 ${(result.relevance_score * 100).toFixed(1)}%`}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                        '& .MuiChip-icon': {
                          color: theme.palette.success.main,
                        },
                      }}
                    />
                    <Chip
                      label={result.metadata.model_name}
                      size="small"
                      sx={{
                        bgcolor: alpha(getModelColor(result.metadata.model_name), 0.1),
                        color: getModelColor(result.metadata.model_name),
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(result.metadata.timestamp)}
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ChatIcon />}
                        onClick={() => handleContinueChat(result.metadata.parent_id)}
                        sx={{ textTransform: 'none' }}
                      >
                        继续对话
                      </Button>
                    </Box>
                  </Box>

                  <Typography
                    variant="body1"
                    sx={{
                      color: 'text.primary',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {result.text}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        </Fade>
      )}

      {!results && !loading && !error && query && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            color: 'text.secondary',
          }}
        >
          <TrendingUpIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" fontWeight={600}>
            开始搜索
          </Typography>
          <Typography variant="body2" color="text.secondary">
            输入关键词并点击搜索按钮
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SearchPage;
