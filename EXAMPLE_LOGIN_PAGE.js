/**
 * Example Modernized Login Page
 * Shows how to use Material UI + react-intl
 * 
 * Replace your existing LoginPage.js with this structure
 */

import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success(intl.formatMessage({ id: 'auth.loginSuccess' }));
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        py: 4,
      }}>
        <Card sx={{ width: '100%', maxWidth: 450, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                <FormattedMessage id="auth.loginTitle" defaultMessage="Library System Login" />
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <FormattedMessage id="auth.loginSubtitle" defaultMessage="Sign in to your account" />
              </Typography>
            </Box>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email Field */}
              <TextField
                fullWidth
                label={intl.formatMessage({ id: 'auth.email' })}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                margin="normal"
                placeholder="user@example.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Password Field */}
              <TextField
                fullWidth
                label={intl.formatMessage({ id: 'auth.password' })}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Submit Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : (
                  <FormattedMessage id="auth.loginButton" defaultMessage="Sign In" />
                )}
              </Button>
            </form>

            {/* Divider */}
            <Box sx={{ position: 'relative', mb: 2 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
            </Box>

            {/* Register Link */}
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              <FormattedMessage id="auth.dontHaveAccount" defaultMessage="Don't have an account?" />
              {' '}
              <Link
                component={RouterLink}
                to="/register"
                sx={{ fontWeight: 600, textDecoration: 'none' }}
              >
                <FormattedMessage id="auth.registerButton" defaultMessage="Create Account" />
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
