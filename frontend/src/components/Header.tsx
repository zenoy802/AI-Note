import React from 'react';
import { Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';

const Header: React.FC = () => {
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI-Note
        </Typography>
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Button
            component={Link}
            to="/chat"
            color="inherit"
            startIcon={<ChatIcon />}
          >
            对话
          </Button>
          <Button
            component={Link}
            to="/search"
            color="inherit"
            startIcon={<SearchIcon />}
          >
            搜索
          </Button>
          <Button
            component={Link}
            to="/history"
            color="inherit"
            startIcon={<HistoryIcon />}
          >
            历史记录
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;