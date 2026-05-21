/**
 * Example Modernized Admin Dashboard
 * Shows how to use Material UI + react-intl + StatCard component
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Book as BookIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl, FormattedNumber, FormattedDate } from 'react-intl';
import { AppHeader } from '../components/mui/AppHeader';
import { StatCard } from '../components/mui/StatCard';
import { DataTable } from '../components/mui/DataTable';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const intl = useIntl();

  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrows: 0,
    overdueBorrows: 0,
    totalFines: 0,
    pendingReservations: 0,
  });

  const [recentBorrows, setRecentBorrows] = useState([]);
  const [overdueItems, setOverdueItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, borrowsRes, overdueRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/borrows/recent'),
        axios.get('/api/admin/borrows/overdue'),
      ]);

      setStats(statsRes.data.data);
      setRecentBorrows(borrowsRes.data.data || []);
      setOverdueItems(overdueRes.data.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 1, path: '/admin/books', label: 'Books', icon: <BookIcon /> },
    { id: 2, path: '/admin/users', label: 'Users', icon: <PeopleIcon /> },
    { id: 3, path: '/admin/borrow-return', label: 'Borrows', icon: <ShoppingCartIcon /> },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <AppHeader
        title={intl.formatMessage({ id: 'admin.dashboard' })}
        onNavigate={(path) => navigate(path)}
        navItems={navItems}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Dashboard Title */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            <FormattedMessage id="admin.dashboard" defaultMessage="Dashboard" />
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <FormattedMessage id="admin.welcomeBack" defaultMessage="Welcome back! Here's your library status." />
          </Typography>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title={intl.formatMessage({ id: 'admin.totalBooks' })}
              value={stats.totalBooks}
              icon={BookIcon}
              color="primary"
              unit=" books"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title={intl.formatMessage({ id: 'admin.totalUsers' })}
              value={stats.totalUsers}
              icon={PeopleIcon}
              color="info"
              unit=" users"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title={intl.formatMessage({ id: 'admin.activeBorrows' })}
              value={stats.activeBorrows}
              icon={ShoppingCartIcon}
              color="success"
              unit=" active"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title={intl.formatMessage({ id: 'admin.overdueReturns' })}
              value={stats.overdueBorrows}
              icon={WarningIcon}
              color="error"
              unit=" overdue"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title={intl.formatMessage({ id: 'admin.totalFines' })}
              value={stats.totalFines}
              icon={AttachMoneyIcon}
              color="warning"
              unit=" VND"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title={intl.formatMessage({ id: 'admin.pendingReservations' })}
              value={stats.pendingReservations}
              icon={BookIcon}
              color="secondary"
              unit=" pending"
            />
          </Grid>
        </Grid>

        {/* Alerts Section */}
        {stats.overdueBorrows > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <FormattedMessage
              id="admin.overdueAlert"
              defaultMessage="You have {count} overdue items that need attention"
              values={{ count: stats.overdueBorrows }}
            />
          </Alert>
        )}

        {/* Recent Borrows Section */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                <FormattedMessage id="admin.recentBorrows" defaultMessage="Recent Borrows" />
              </Typography>
              <Button
                variant="text"
                onClick={() => navigate('/admin/borrow-return')}
              >
                <FormattedMessage id="common.viewAll" defaultMessage="View All" />
              </Button>
            </Box>

            {recentBorrows.length === 0 ? (
              <Typography color="textSecondary">
                <FormattedMessage id="common.noData" defaultMessage="No data available" />
              </Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><FormattedMessage id="books.title" /></TableCell>
                    <TableCell><FormattedMessage id="auth.fullName" /></TableCell>
                    <TableCell><FormattedMessage id="borrows.borrowDate" /></TableCell>
                    <TableCell><FormattedMessage id="borrows.dueDate" /></TableCell>
                    <TableCell><FormattedMessage id="borrows.status" /></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentBorrows.map(borrow => (
                    <TableRow key={borrow.id}>
                      <TableCell>{borrow.bookTitle}</TableCell>
                      <TableCell>{borrow.userName}</TableCell>
                      <TableCell>
                        <FormattedDate value={new Date(borrow.borrowDate)} />
                      </TableCell>
                      <TableCell>
                        <FormattedDate value={new Date(borrow.dueDate)} />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1.5,
                            py: 0.5,
                            bgcolor: borrow.status === 'overdue' ? 'error.light' : 'success.light',
                            color: borrow.status === 'overdue' ? 'error.main' : 'success.main',
                            borderRadius: 1,
                            fontWeight: 500,
                            fontSize: '0.875rem',
                          }}
                        >
                          {borrow.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              <FormattedMessage id="admin.quickActions" defaultMessage="Quick Actions" />
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                onClick={() => navigate('/admin/books')}
              >
                <FormattedMessage id="admin.manageBooks" defaultMessage="Manage Books" />
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/users')}
              >
                <FormattedMessage id="admin.manageUsers" defaultMessage="Manage Users" />
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/reports')}
              >
                <FormattedMessage id="admin.reports" defaultMessage="Generate Reports" />
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
