import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { FormattedMessage } from 'react-intl';

export const BookCard = ({ 
  book, 
  onBorrow, 
  onReserve, 
  onViewDetails,
  showActions = true 
}) => {
  const availabilityColor = book.availableCopies > 0 ? 'success' : 'error';
  const availabilityStatus = book.availableCopies > 0 ? 'Available' : 'Unavailable';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {book.coverImage && (
        <CardMedia
          component="img"
          height="250"
          image={book.coverImage}
          alt={book.title}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div" noWrap>
          {book.title}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          by {book.author}
        </Typography>
        
        {book.isbn && (
          <Typography variant="caption" display="block" sx={{ my: 1 }}>
            ISBN: {book.isbn}
          </Typography>
        )}

        <Box sx={{ my: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={availabilityStatus}
            color={availabilityColor}
            size="small"
            variant="outlined"
          />
          {book.category && (
            <Chip
              label={book.category}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {book.description && (
          <Typography variant="body2" color="textSecondary" sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {book.description}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">
            Copies: {book.availableCopies}/{book.totalCopies}
          </Typography>
        </Box>
      </CardContent>

      {showActions && (
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          {onViewDetails && (
            <Button 
              size="small" 
              onClick={onViewDetails}
            >
              <FormattedMessage id="books.viewDetails" defaultMessage="View Details" />
            </Button>
          )}
          {onBorrow && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={onBorrow}
              disabled={book.availableCopies === 0}
            >
              <FormattedMessage id="books.borrow" defaultMessage="Borrow" />
            </Button>
          )}
          {onReserve && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={onReserve}
            >
              <FormattedMessage id="books.reserve" defaultMessage="Reserve" />
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default BookCard;
