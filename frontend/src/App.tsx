import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Button, Typography, Paper, alpha } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';

// Theme
import { createAppTheme } from './theme';
import { useTheme as useAppTheme } from './hooks/useTheme';

// 错误边界组件
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('组件渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: '#f5f5f5',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                bgcolor: alpha('#f43f5e', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 40, color: '#f43f5e' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              页面加载出错
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              抱歉，页面加载过程中发生了错误。请尝试刷新页面或返回首页。
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              sx={{
                mt: 2,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              }}
            >
              刷新页面
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { mode, toggleTheme } = useAppTheme();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const theme = createAppTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <Header mode={mode} onToggleTheme={toggleTheme} />
        <Sidebar selectedModels={selectedModels} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            pt: 10,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <ErrorBoundary>
            <Routes>
              <Route
                path="/"
                element={
                  <ChatPage
                    selectedModels={selectedModels}
                    onModelsChange={setSelectedModels}
                  />
                }
              />
              <Route
                path="/chat"
                element={
                  <ChatPage
                    selectedModels={selectedModels}
                    onModelsChange={setSelectedModels}
                  />
                }
              />
              <Route path="/search" element={<SearchPage selectedModels={selectedModels} />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </ErrorBoundary>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
