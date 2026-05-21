# Library Management System - Modernization Guide

## 🎯 Overview
This guide provides step-by-step instructions for modernizing the Library Management System with Material UI and bilingual support (Vietnamese/English).

## 📦 What Has Been Added

### 1. Material UI Dependencies
- `@mui/material` - Core Material UI components
- `@mui/icons-material` - Material Design icons
- `@emotion/react` & `@emotion/styled` - CSS-in-JS styling
- `react-intl` - Internationalization (i18n) support

### 2. i18n Infrastructure
- **Location**: `client/src/i18n/` and `student-client/src/i18n/`
- **Components**:
  - `LanguageProvider.js` - Provides language context to the app
  - `theme.js` - Material UI theme configuration
- **Translation Files**: 
  - `locales/en.json` - English translations
  - `locales/vi.json` - Vietnamese translations

### 3. Material UI Components
Created reusable components in `client/src/components/mui/`:
- `AppHeader.js` - Header with language switcher
- `BookCard.js` - Book display card
- `DataTable.js` - Responsive data table
- `StatCard.js` - Statistics display card

### 4. API Response Middleware
Created standardized API response handlers in `server/middleware/responses/`:
- `apiResponse.js` - Response formatter
- `validation.js` - Input validation functions

## 🚀 Installation & Setup

### Step 1: Install Dependencies

Navigate to each client folder and install dependencies:

```bash
# Admin Client
cd client
npm install

# Student Client
cd ../student-client
npm install

# Server (if using new API middleware)
cd ../server
npm install
```

### Step 2: Configure Language Provider

The `LanguageProvider` is already integrated into `App.js`. The system will:
- Auto-detect user's language preference from localStorage
- Default to English if not set
- Allow switching between English and Vietnamese

### Step 3: Update Existing Pages

For each page component, you need to:

1. **Import Material UI components**:
```javascript
import { Container, Box, Grid, Typography, Button } from '@mui/material';
import { AppHeader } from '../components/mui/AppHeader';
```

2. **Use FormattedMessage for translations**:
```javascript
import { FormattedMessage } from 'react-intl';

// Instead of hardcoded text:
<Typography>{intl.formatMessage({ id: 'common.logout' })}</Typography>

// Or use FormattedMessage component:
<FormattedMessage id="common.logout" defaultMessage="Logout" />
```

3. **Replace custom styling with Material UI**:
```javascript
// Old:
<div className="book-card">...</div>

// New:
<Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
  ...
</Card>
```

## 📝 Usage Examples

### Using the Language Switcher
The language switcher is built into the AppHeader component. Users can:
- Click the language icon in the top-right
- Select English or Tiếng Việt
- The selection is saved to localStorage

### Using Translations in Components
```javascript
import { FormattedMessage, useIntl } from 'react-intl';

function MyComponent() {
  const intl = useIntl();
  
  // Method 1: Using FormattedMessage component
  return <h1><FormattedMessage id="admin.dashboard" /></h1>;
  
  // Method 2: Using useIntl hook
  const message = intl.formatMessage({ id: 'admin.dashboard' });
  return <h1>{message}</h1>;
}
```

### Creating New Reusable Components
Example: Creating a modern login form

```javascript
import { Box, TextField, Button, Card, CardContent, Container } from '@mui/material';
import { FormattedMessage } from 'react-intl';

export function LoginForm() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <TextField
            fullWidth
            label={<FormattedMessage id="auth.email" />}
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label={<FormattedMessage id="auth.password" />}
            margin="normal"
          />
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
          >
            <FormattedMessage id="auth.loginButton" />
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
```

## 🎨 Customizing Theme

To customize the theme colors, edit `client/src/i18n/theme.js`:

```javascript
export const createLibraryTheme = (mode = 'light') => {
  return createTheme({
    palette: {
      primary: {
        main: '#1976d2',  // Change primary color
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',  // Change secondary color
      },
      // ... more customizations
    },
  });
};
```

## 📋 Migration Checklist

### Phase 1: Core Pages (Week 1)
- [ ] Update LoginPage.js with Material UI
- [ ] Update RegisterPage.js with Material UI
- [ ] Update HomePage.js with Material UI
- [ ] Add translations for auth pages

### Phase 2: Admin Pages (Week 2-3)
- [ ] Update AdminDashboard.js
- [ ] Update AdminBooks.js
- [ ] Update AdminUsers.js
- [ ] Update AdminBorrows.js
- [ ] Update AdminFines.js
- [ ] Update AdminReservations.js

### Phase 3: Student Pages (Week 3)
- [ ] Update BooksPage.js
- [ ] Update BookDetailPage.js
- [ ] Update MyBorrowsPage.js
- [ ] Update MyReservationsPage.js
- [ ] Update ProfilePage.js

### Phase 4: Backend API (Week 4)
- [ ] Integrate apiResponse middleware
- [ ] Update all API endpoints to use standardized responses
- [ ] Add input validation middleware
- [ ] Update API documentation

## 🔧 API Enhancement

To use the new API response middleware in your server:

```javascript
// In your main server file (index.js)
const { responseHandler } = require('./middleware/responses/apiResponse');

app.use(responseHandler);

// In your controllers
const { sendSuccess, sendError } = require('./middleware/responses/apiResponse');
const { validateBookData } = require('./middleware/responses/validation');

// Example endpoint
router.post('/books', (req, res) => {
  const errors = validateBookData(req.body);
  if (errors.length > 0) {
    return sendError(res, 400, 'Validation failed', errors);
  }
  
  // Create book logic here
  sendSuccess(res, book, 'Book created successfully', 201);
});
```

## 📱 Responsive Design

Material UI provides responsive design out-of-the-box. Use the `sx` prop:

```javascript
<Box sx={{
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',        // Mobile: 1 column
    sm: 'repeat(2, 1fr)',  // Tablet: 2 columns
    md: 'repeat(3, 1fr)',  // Desktop: 3 columns
  },
  gap: 2,
}}>
  {/* Cards go here */}
</Box>
```

## 🌍 Adding New Translations

1. Add new key-value pairs to:
   - `client/src/locales/en.json`
   - `client/src/locales/vi.json`

2. Use in components:
```javascript
<FormattedMessage id="myNewKey" defaultMessage="Default text" />
```

## 🐛 Troubleshooting

### Language not persisting
- Check browser localStorage (DevTools → Application → Storage)
- Verify `localStorage.setItem('library_locale', locale)` is called

### Material UI styles not applying
- Ensure `ThemeProvider` wraps your app
- Check that `CssBaseline` is included
- Clear browser cache and rebuild

### Translations not showing
- Verify JSON keys match exactly
- Check console for missing message warnings
- Ensure `LanguageProvider` wraps the component

## 📚 Resources

- [Material UI Documentation](https://mui.com/)
- [react-intl Documentation](https://formatjs.io/docs/react-intl)
- [Material Design Guidelines](https://material.io/design)

## ✅ Next Steps

1. Install dependencies: `npm install` in all directories
2. Test the app: `npm start` in client and student-client
3. Start migrating pages following the checklist
4. Add language selector to pages
5. Replace CSS with Material UI components
6. Integrate API response middleware in server

---

**Last Updated**: April 2026
**Status**: Core infrastructure complete, ready for page migration
