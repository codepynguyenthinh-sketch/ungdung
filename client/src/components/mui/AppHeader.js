import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Language as LanguageIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../i18n/LanguageProvider';
import { FormattedMessage } from 'react-intl';

export const AppHeader = ({ 
  title, 
  user, 
  onLogout, 
  navItems = [], 
  onNavigate 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { locale, changeLanguage } = useLanguage();

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLangOpen = (e) => setLangAnchor(e.currentTarget);
  const handleLangClose = () => setLangAnchor(null);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    handleLangClose();
  };

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          {navItems.length > 0 && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ flexGrow: 1 }}>
            <Button color="inherit" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {title}
            </Button>
          </Box>

          {/* Language Switcher */}
          <IconButton
            color="inherit"
            onClick={handleLangOpen}
            title="Change Language"
          >
            <LanguageIcon />
          </IconButton>
          <Menu
            anchorEl={langAnchor}
            open={Boolean(langAnchor)}
            onClose={handleLangClose}
          >
            <MenuItem
              onClick={() => handleLanguageChange('en')}
              selected={locale === 'en'}
            >
              English
            </MenuItem>
            <MenuItem
              onClick={() => handleLanguageChange('vi')}
              selected={locale === 'vi'}
            >
              Tiếng Việt
            </MenuItem>
          </Menu>

          {/* User Menu */}
          {user && (
            <>
              <IconButton
                onClick={handleMenuOpen}
                sx={{ ml: 2 }}
              >
                <Avatar
                  sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}
                >
                  {user.fullName?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem disabled>
                  <strong>{user.fullName}</strong>
                </MenuItem>
                <MenuItem disabled sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {user.email}
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { onNavigate?.('profile'); handleMenuClose(); }}>
                  <SettingsIcon sx={{ mr: 1 }} />
                  <FormattedMessage id="navigation.profile" defaultMessage="Profile" />
                </MenuItem>
                <MenuItem onClick={() => { onLogout(); handleMenuClose(); }}>
                  <LogoutIcon sx={{ mr: 1 }} />
                  <FormattedMessage id="common.logout" defaultMessage="Logout" />
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      {navItems.length > 0 && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 250, pt: 2 }}>
            <List>
              {navItems.map((item) => (
                <ListItem
                  button
                  key={item.id}
                  onClick={() => {
                    onNavigate?.(item.path);
                    setDrawerOpen(false);
                  }}
                >
                  {item.icon && (
                    <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={item.label}
                    sx={{ color: 'white' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
      )}
    </>
  );
};

export default AppHeader;
