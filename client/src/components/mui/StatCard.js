import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Skeleton,
  Grid,
} from '@mui/material';

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  loading = false,
  unit = '',
  trend = null 
}) => {
  return (
    <Card sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
      border: `2px solid ${color}`,
    }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={100} height={40} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {value}{unit}
              </Typography>
            )}
            {trend && (
              <Typography 
                variant="caption" 
                sx={{
                  color: trend > 0 ? 'success.main' : 'error.main',
                  fontWeight: 500,
                  mt: 1,
                  display: 'block'
                }}
              >
                {trend > 0 ? '+' : ''}{trend}% from last month
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box sx={{ 
              fontSize: 48, 
              color: `${color}.main`,
              opacity: 0.7 
            }}>
              <Icon fontSize="inherit" />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
