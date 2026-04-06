import React, { useState, useEffect } from 'react';
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
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
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

const SearchPage: React.FC<SearchPageProps> = ({ selectedModels }) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [topK, setTopK] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          通过语义搜索查找您的历史对话，AI 将为您智能匹配相关内容
        </Typography>

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
