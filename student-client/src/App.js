import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import createLibraryTheme from './i18n/theme';

import HomePage from './pages/HomePage';
import BooksPage from './pages/BooksPage';
import BookDetailPage from './pages/BookDetailPage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';
import { MyBorrowsPage, MyReservationsPage, MessagesPage, ProfilePage, MyFinesPage } from './pages/OtherPages';
import Footer from './components/Footer';

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
  return user ? children : <Navigate to="/login" />;
};

const theme = createLibraryTheme();

function AppContent() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/my-borrows" element={<RequireAuth><MyBorrowsPage /></RequireAuth>} />
        <Route path="/my-fines" element={<RequireAuth><MyFinesPage /></RequireAuth>} />
        <Route path="/my-reservations" element={<RequireAuth><MyReservationsPage /></RequireAuth>} />
        <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
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
