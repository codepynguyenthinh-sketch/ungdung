import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import createLibraryTheme from './i18n/theme';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/user/HomePage';
import BooksPage from './pages/user/BooksPage';
import BookDetailPage from './pages/user/BookDetailPage';
import MyBorrowsPage from './pages/user/MyBorrowsPage';
import MyFinesPage from './pages/user/MyFinesPage';
import MyReservationsPage from './pages/user/MyReservationsPage';
import ProfilePage from './pages/user/ProfilePage';
import ContactPage from './pages/user/ContactPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBooks from './pages/admin/AdminBooks';
import AdminReservations from './pages/admin/AdminReservations';
import AdminBorrowReturn from './pages/admin/AdminBorrowReturn';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFines from './pages/admin/AdminFines';
import AdminCategories from './pages/admin/AdminCategories';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminMessages from './pages/admin/AdminMessages';
import AdminReports from './pages/admin/AdminReports';
import AdminInventoryCheck from './pages/admin/AdminInventoryCheck';
import { Box, CircularProgress } from '@mui/material';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (!['admin', 'librarian'].includes(user.role)) return <Navigate to="/" />;
  return children;
};

// Public route - cho phép xem mà không cần login
const PublicRoute = ({ children }) => {
  return children;
};

const theme = createLibraryTheme();

function AppContent() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Public routes - không cần login */}
          <Route path="/"         element={<PublicRoute><HomePage /></PublicRoute>} />
          <Route path="/books"    element={<PublicRoute><BooksPage /></PublicRoute>} />
          <Route path="/books/:id" element={<PublicRoute><BookDetailPage /></PublicRoute>} />
          {/* Private routes - cần login */}
          <Route path="/my-borrows"      element={<PrivateRoute><MyBorrowsPage /></PrivateRoute>} />
          <Route path="/my-fines"        element={<PrivateRoute><MyFinesPage /></PrivateRoute>} />
          <Route path="/my-reservations" element={<PrivateRoute><MyReservationsPage /></PrivateRoute>} />
          <Route path="/profile"  element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/contact"  element={<PrivateRoute><ContactPage /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><ContactPage /></PrivateRoute>} />

          <Route path="/admin"              element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/books"        element={<AdminRoute><AdminBooks /></AdminRoute>} />
          <Route path="/admin/reservations" element={<AdminRoute><AdminReservations /></AdminRoute>} />
          {/* Route gộp mượn + trả — dùng ?tab=return để chuyển tab */}
          <Route path="/admin/borrow-return" element={<AdminRoute><AdminBorrowReturn /></AdminRoute>} />
          {/* Redirect route cũ sang route mới */}
          <Route path="/admin/borrow"       element={<Navigate to="/admin/borrow-return" replace />} />
          <Route path="/admin/return"       element={<Navigate to="/admin/borrow-return?tab=return" replace />} />
          <Route path="/admin/borrows"      element={<Navigate to="/admin/borrow-return" replace />} />
          <Route path="/admin/users"        element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/fines"        element={<AdminRoute><AdminFines /></AdminRoute>} />
          <Route path="/admin/categories"   element={<AdminRoute><AdminCategories /></AdminRoute>} />
          <Route path="/admin/departments"  element={<AdminRoute><AdminDepartments /></AdminRoute>} />
          <Route path="/admin/messages"     element={<AdminRoute><AdminMessages /></AdminRoute>} />
          <Route path="/admin/reports"      element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/inventory-check" element={<AdminRoute><AdminInventoryCheck /></AdminRoute>} />
        </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
