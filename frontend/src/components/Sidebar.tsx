import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';

const drawerWidth = 240;

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar /> {/* 为顶部导航栏留出空间 */}
      <List sx={{ mt: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/chat"
            selected={isActive('/chat') || isActive('/')}
          >
            <ListItemIcon>
              <ChatIcon color={isActive('/chat') || isActive('/') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="智能对话" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/search"
            selected={isActive('/search')}
          >
            <ListItemIcon>
              <SearchIcon color={isActive('/search') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="知识搜索" />
          </ListItemButton>
        </ListItem>
        
        <Divider sx={{ my: 2 }} />
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/history"
            selected={isActive('/history')}
          >
            <ListItemIcon>
              <HistoryIcon color={isActive('/history') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="历史记录" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;