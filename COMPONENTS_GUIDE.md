# Material UI Components Library

## Available Components

### 1. AppHeader
Location: `client/src/components/mui/AppHeader.js`

Header component with built-in language switcher and user menu.

**Features**:
- Language selector (English/Vietnamese)
- User profile dropdown
- Responsive navigation drawer
- Bilingual support

**Usage**:
```javascript
import { AppHeader } from '../components/mui/AppHeader';

<AppHeader
  title="Library System"
  user={currentUser}
  onLogout={handleLogout}
  navItems={[
    { id: 1, path: '/', label: 'Home', icon: <HomeIcon /> },
    { id: 2, path: '/books', label: 'Books', icon: <BookIcon /> },
  ]}
  onNavigate={(path) => navigate(path)}
/>
```

### 2. BookCard
Location: `client/src/components/mui/BookCard.js`

Card component for displaying book information.

**Features**:
- Book cover image
- Title, author, ISBN
- Availability status with chip
- Action buttons for borrow/reserve
- Responsive design

**Usage**:
```javascript
import { BookCard } from '../components/mui/BookCard';

<BookCard
  book={bookData}
  onBorrow={handleBorrow}
  onReserve={handleReserve}
  onViewDetails={handleViewDetails}
  showActions={true}
/>
```

### 3. DataTable
Location: `client/src/components/mui/DataTable.js`

Advanced data table with sorting, filtering, and actions.

**Features**:
- Responsive table design
- Loading state
- Row actions (Edit/Delete)
- Custom column rendering
- Empty state handling

**Usage**:
```javascript
import { DataTable } from '../components/mui/DataTable';

<DataTable
  columns={[
    { id: 'title', label: 'Title' },
    { id: 'author', label: 'Author' },
    { id: 'status', label: 'Status', render: (row) => <Chip label={row.status} /> },
  ]}
  data={books}
  loading={isLoading}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onRowClick={handleRowClick}
  dense={false}
/>
```

### 4. StatCard
Location: `client/src/components/mui/StatCard.js`

Statistics display card with icon and trend indicator.

**Features**:
- Icon display
- Large number display
- Trend percentage
- Color customization
- Loading state with skeleton

**Usage**:
```javascript
import { StatCard } from '../components/mui/StatCard';
import { BookIcon } from '@mui/icons-material';

<StatCard
  title="Total Books"
  value={1250}
  icon={BookIcon}
  color="primary"
  loading={false}
  unit=" books"
  trend={5}
/>
```

## Material UI Components Used

### Layout Components
- `Box` - Flexible layout container
- `Container` - Centered content container
- `Grid` - CSS Grid layout
- `Stack` - Flex stack layout
- `Paper` - Elevated surface
- `Card` - Container for grouped content
- `CardContent` - Card content section
- `CardActions` - Card action buttons
- `CardMedia` - Card image/media

### Navigation Components
- `AppBar` - Top navigation bar
- `Toolbar` - AppBar content container
- `Drawer` - Side navigation drawer
- `List` - List container
- `ListItem` - List item
- `ListItemIcon` - List item icon
- `ListItemText` - List item text
- `Menu` - Dropdown menu
- `MenuItem` - Menu item

### Form Components
- `TextField` - Text input field
- `Button` - Action button
- `Checkbox` - Checkbox input
- `RadioGroup` - Radio button group
- `Select` - Dropdown select
- `Switch` - Toggle switch

### Data Components
- `Table` - Data table
- `TableHead` - Table header
- `TableBody` - Table body
- `TableRow` - Table row
- `TableCell` - Table cell
- `Chip` - Inline tag/chip

### Feedback Components
- `Alert` - Alert message
- `Dialog` - Modal dialog
- `Snackbar` - Toast notification
- `LinearProgress` - Progress bar
- `CircularProgress` - Loading spinner
- `Skeleton` - Content placeholder

### Data Display Components
- `Avatar` - User avatar
- `Badge` - Badge overlay
- `Chip` - Tag/category chip
- `Icon` - Icon component
- `Typography` - Text component

## Styling System (sx prop)

All Material UI components support the `sx` prop for inline styling:

```javascript
<Box sx={{
  backgroundColor: 'primary.main',
  p: 2,  // padding
  m: 1,  // margin
  borderRadius: 2,
  boxShadow: 2,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  '&:hover': {
    backgroundColor: 'primary.dark',
  },
  // Responsive design
  width: { xs: '100%', sm: '80%', md: '60%' },
}}>
  Content
</Box>
```

## Responsive Breakpoints

- `xs`: 0px (mobile)
- `sm`: 600px (tablet)
- `md`: 960px (small desktop)
- `lg`: 1280px (desktop)
- `xl`: 1920px (large desktop)

## Color System

The theme defines standard colors:
- `primary.main` - Primary color (#1976d2)
- `secondary.main` - Secondary color (#dc004e)
- `success.main` - Success color (#4caf50)
- `error.main` - Error color (#f44336)
- `warning.main` - Warning color (#ff9800)
- `info.main` - Info color (#2196f3)

## Typography Variants

- `h1` to `h6` - Heading styles
- `body1`, `body2` - Body text
- `button` - Button text
- `caption` - Small text
- `overline` - Overline text

---

**For more information, visit**: https://mui.com/material-ui/api/
