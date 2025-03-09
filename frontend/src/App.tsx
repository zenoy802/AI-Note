import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { Typography, Button, Paper } from '@mui/material';

// 导入组件
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';

// 创建主题
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

// 错误边界组件
class ErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('组件渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 自定义错误回退UI
      return this.props.fallback || (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto', mt: 10 }}>
          <Typography variant="h5" color="error" gutterBottom>页面加载出错</Typography>
          <Typography variant="body1" paragraph>
            抱歉，页面加载过程中发生了错误。请尝试刷新页面或返回首页。
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
          >
            返回首页
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Header />
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8, // 为顶部导航栏留出空间
            height: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </ErrorBoundary>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;