import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const drawerWidth = 260;

interface SidebarProps {
  selectedModels?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ selectedModels = [] }) => {
  const theme = useTheme();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const menuItems = [
    {
      path: '/chat',
      label: '智能对话',
      description: '与多个AI模型对话',
      icon: <ChatIcon />,
    },
    {
      path: '/search',
      label: '知识搜索',
      description: '搜索历史对话',
      icon: <SearchIcon />,
    },
    {
      path: '/history',
      label: '历史记录',
      description: '查看对话历史',
      icon: <HistoryIcon />,
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f8fafc',
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Toolbar />

      <Box sx={{ p: 2 }}>
        {/* Main Navigation */}
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            display: 'block',
            color: 'text.secondary',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          功能菜单
        </Typography>

        <List sx={{ mt: 0.5 }}>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive(item.path)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderRadius: '12px',
                  mx: 1,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                    '& .MuiListItemText-primary': {
                      color: 'primary.main',
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: isActive(item.path) ? 600 : 500,
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Active Models Section - Only show on chat page */}
        {selectedModels.length > 0 && isActive('/chat') && (
          <>
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                mt: 2,
                display: 'block',
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              当前模型
            </Typography>

            <Box sx={{ px: 2, mt: 1 }}>
              {selectedModels.map((model) => (
                <Box
                  key={model}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: 'primary.main',
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {model}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      就绪
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Tips Section */}
        <Box
          sx={{
            mt: 'auto',
            p: 2,
            mx: 1,
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
          }}
        >
          <Typography variant="caption" color="info.main" fontWeight={600}>
            💡 提示
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Enter 发送，Shift/Cmd/Ctrl+Enter 换行
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
