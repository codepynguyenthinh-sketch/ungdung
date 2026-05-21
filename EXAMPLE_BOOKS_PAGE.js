/**
 * Example Modernized Books Page
 * Shows how to use Material UI + react-intl + BookCard component
 * 
 * Replace your existing BooksPage.js with this structure
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Grid,
  TextField,
  Button,
  Chip,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { BookCard } from '../components/mui/BookCard';
import { AppHeader } from '../components/mui/AppHeader';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function BooksPage() {
  const navigate = useNavigate();
  const intl = useIntl();

  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('title');

  // Fetch books on mount
  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, []);

  // Filter and sort books
  useEffect(() => {
    let result = [...books];

    // Search filter
    if (searchQuery) {
      result = result.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn?.includes(searchQuery)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(book => book.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'available':
          return b.availableCopies - a.availableCopies;
        default:
          return 0;
      }
    });

    setFilteredBooks(result);
  }, [books, searchQuery, selectedCategory, sortBy]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/books');
      setBooks(response.data.data || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load books');
      toast.error(intl.formatMessage({ id: 'books.loadingError' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const handleBorrow = async (book) => {
    try {
      await axios.post(`/api/borrows`, {
        bookId: book.id,
        quantity: 1,
      });
      toast.success(intl.formatMessage({ id: 'books.borrowSuccess' }));
      fetchBooks(); // Refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to borrow book');
    }
  };

  const handleReserve = async (book) => {
    try {
      await axios.post(`/api/reservations`, {
        bookId: book.id,
      });
      toast.success(intl.formatMessage({ id: 'reservations.reserveSuccess' }));
      fetchBooks(); // Refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reserve book');
    }
  };

  const handleViewDetails = (book) => {
    navigate(`/books/${book.id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('title');
  };

  return (
    <Box>
      <AppHeader
        title={intl.formatMessage({ id: 'navigation.books' })}
        onNavigate={(path) => navigate(path)}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Title */}
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          <FormattedMessage id="books.browseLibrary" defaultMessage="Browse Library" />
        </Typography>

        {/* Filters Section */}
        <Card sx={{ mb: 4, p: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            {/* Search */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder={intl.formatMessage({ id: 'common.search' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>

            {/* Category Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>
                  <FormattedMessage id="books.category" defaultMessage="Category" />
                </InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label={intl.formatMessage({ id: 'books.category' })}
                >
                  <MenuItem value="">
                    <FormattedMessage id="common.all" defaultMessage="All" />
                  </MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Sort By */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>
                  <FormattedMessage id="common.sortBy" defaultMessage="Sort By" />
                </InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label={intl.formatMessage({ id: 'common.sortBy' })}
                >
                  <MenuItem value="title">
                    <FormattedMessage id="books.title" defaultMessage="Title" />
                  </MenuItem>
                  <MenuItem value="author">
                    <FormattedMessage id="books.author" defaultMessage="Author" />
                  </MenuItem>
                  <MenuItem value="newest">
                    <FormattedMessage id="common.newest" defaultMessage="Newest" />
                  </MenuItem>
                  <MenuItem value="available">
                    <FormattedMessage id="common.available" defaultMessage="Available" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Clear Filters Button */}
            <Grid item xs={12} md="auto">
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={clearFilters}
              >
                <FormattedMessage id="common.clearFilters" defaultMessage="Clear Filters" />
              </Button>
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory) && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {searchQuery && (
                <Chip
                  label={`Search: ${searchQuery}`}
                  onDelete={() => setSearchQuery('')}
                />
              )}
              {selectedCategory && (
                <Chip
                  label={`Category: ${selectedCategory}`}
                  onDelete={() => setSelectedCategory('')}
                />
              )}
            </Stack>
          )}
        </Card>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <CircularProgress />
          </Box>
        )}

        {/* Empty State */}
        {!loading && filteredBooks.length === 0 && (
          <Alert severity="info">
            <FormattedMessage id="books.noBooks" defaultMessage="No books found" />
          </Alert>
        )}

        {/* Books Grid */}
        {!loading && filteredBooks.length > 0 && (
          <Grid container spacing={3}>
            {filteredBooks.map(book => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                <BookCard
                  book={book}
                  onBorrow={() => handleBorrow(book)}
                  onReserve={() => handleReserve(book)}
                  onViewDetails={() => handleViewDetails(book)}
                  showActions={true}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Results Count */}
        {!loading && filteredBooks.length > 0 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              <FormattedMessage
                id="books.showingResults"
                defaultMessage="Showing {count} books"
                values={{ count: filteredBooks.length }}
              />
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
