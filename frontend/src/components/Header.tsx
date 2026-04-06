import React from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { PaletteMode } from '@mui/material';

interface HeaderProps {
  mode: PaletteMode;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ mode, onToggleTheme }) => {
  const theme = useTheme();

  const navItems = [
    { path: '/chat', label: '对话', icon: <ChatIcon />, active: true },
    { path: '/search', label: '搜索', icon: <SearchIcon /> },
    { path: '/history', label: '历史记录', icon: <HistoryIcon /> },
  ];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ px: 2 }}>
        {/* Logo */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none',
            mr: 4,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <ChatIcon sx={{ fontSize: 20 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI-Note
          </Typography>
        </Box>

        {/* Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, flexGrow: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              color="inherit"
              startIcon={item.icon}
              sx={{
                px: 2,
                py: 1,
                borderRadius: '10px',
                color: item.active ? 'primary.main' : 'text.secondary',
                bgcolor: item.active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                '&:hover': {
                  bgcolor: item.active
                    ? alpha(theme.palette.primary.main, 0.12)
                    : alpha(theme.palette.action.hover, 0.5),
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Theme Toggle */}
        <Tooltip title={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}>
          <IconButton
            onClick={onToggleTheme}
            sx={{
              ml: 1,
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
