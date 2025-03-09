import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Divider, List, ListItem, Card, CardContent, Slider } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

interface SearchResult {
  query: string;
  summary: string;
  sources: Array<{
    text: string; // 修改：从content改为text
    metadata: {
      parent_id: string; // 添加parent_id字段
      model_name: string; // 修改：从model改为model_name
      timestamp: string;
    };
    relevance_score: number; // 修改：从similarity改为relevance_score
  }>;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [topK, setTopK] = useState<number>(3);
  const [indexStatus, setIndexStatus] = useState<{status: string; indexed_chunks: number} | null>(null);

  // 获取索引状态
  const fetchIndexStatus = async () => {
    try {
      const response = await axios.get('/api/search/index/status');
      setIndexStatus(response.data);
    } catch (error) {
      console.error('Error fetching index status:', error);
    }
  };

  // 组件加载时获取索引状态
  React.useEffect(() => {
    fetchIndexStatus();
  }, []);

  // 处理搜索
  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/search/search', {
        query: query.trim(),
        top_k: topK
      });
      
      // 详细记录响应数据，帮助调试
      console.log('Search API response:', response.data);
      console.log('Response data type:', typeof response.data);
      if (response.data) {
        console.log('Has query property:', 'query' in response.data);
        console.log('Has sources property:', 'sources' in response.data);
        console.log('Sources is array:', Array.isArray(response.data.sources));
      }
      
      // 验证响应数据格式
      if (response.data && response.data.query && Array.isArray(response.data.results)) {
        // 将后端返回的results字段映射到前端的sources字段
        const mappedData = {
          ...response.data,
          sources: response.data.results
        };
        console.log('Setting results with mapped data:', mappedData);
        setResults(mappedData);
      } else {
        console.error('Invalid search response format:', response.data);
        setResults(null);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // 处理重建索引
  const handleRebuildIndex = async () => {
    setLoading(true);
    try {
      await axios.post('/api/search/index', {});
      await fetchIndexStatus();
      alert('索引重建任务已开始，这可能需要一些时间完成');
    } catch (error) {
      console.error('Error rebuilding index:', error);
      alert('索引重建失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>知识搜索</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          搜索您的历史对话记录，AI将为您生成相关内容的摘要。
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="输入搜索关键词..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={!query.trim() || loading}
          >
            搜索
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">结果数量: {topK}</Typography>
          <Slider
            value={topK}
            min={1}
            max={10}
            step={1}
            onChange={(_, value) => setTopK(value as number)}
            valueLabelDisplay="auto"
            sx={{ maxWidth: 200 }}
          />
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleRebuildIndex}
            disabled={loading}
          >
            重建索引
          </Button>
          {indexStatus && (
            <Typography variant="caption" color="text.secondary">
              已索引: {indexStatus.indexed_chunks} 条记录
            </Typography>
          )}
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {results && !loading && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>AI 摘要</Typography>
              <ReactMarkdown>{results.summary}</ReactMarkdown>
            </CardContent>
          </Card>

          <Typography variant="h6" gutterBottom>相关对话 ({results.sources.length})</Typography>
          <List>
            {results.sources.map((source, index) => (
              <React.Fragment key={index}>
                <ListItem sx={{ display: 'block', px: 0 }}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        模型: {source.metadata.model_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(source.metadata.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {source.text}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        相关度: {(source.relevance_score * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Paper>
                </ListItem>
                {index < results.sources.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {!results && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="body1" color="text.secondary">
            输入关键词开始搜索您的历史对话
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SearchPage;