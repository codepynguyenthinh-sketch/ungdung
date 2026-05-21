import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { FormattedMessage } from 'react-intl';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  onRowClick,
  onEdit,
  onDelete,
  dense = false,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No data available
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size={dense ? 'small' : 'medium'}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align || 'left'}
                sx={{ fontWeight: 600 }}
              >
                {col.label}
              </TableCell>
            ))}
            {(onEdit || onDelete) && <TableCell align="center">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': onRowClick ? { bgcolor: '#f9f9f9' } : {},
              }}
            >
              {columns.map((col) => (
                <TableCell key={`${col.id}-${idx}`} align={col.align || 'left'}>
                  {col.render ? col.render(row) : row[col.id]}
                </TableCell>
              ))}
              {(onEdit || onDelete) && (
                <TableCell align="center">
                  {onEdit && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(row);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(row);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;
