# Quick Start Guide - Library Management System Modernization

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies (2 minutes)

```bash
# Navigate to each client directory and install

# Admin Client
cd client
npm install

# Student Client
cd ../student-client
npm install

# Server (optional, for API enhancements)
cd ../server
npm install
```

### 2. Run the Application (1 minute)

```bash
# Terminal 1 - Admin Client
cd client
npm start  # Runs on http://localhost:3000

# Terminal 2 - Student Client
cd ../student-client
npm start  # Runs on http://localhost:3001

# Terminal 3 - Backend Server
cd ../server
npm run dev  # Runs on http://localhost:5001
```

### 3. Test Language Switching (1 minute)

1. Open your browser to http://localhost:3000 (admin client)
2. Look for the language icon (🌐) in the top-right corner
3. Click to toggle between English and Tiếng Việt
4. Refresh - your language choice is saved!

### 4. Explore Material UI Components (1 minute)

- **AppHeader**: Top navigation bar with language switcher ✅
- **BookCard**: Book display cards (ready to use)
- **DataTable**: Data table with actions
- **StatCard**: Statistics display cards

## 📁 Important Files to Know

```
client/
├── src/
│   ├── i18n/
│   │   ├── LanguageProvider.js    ← Language context (already set up)
│   │   └── theme.js               ← Material UI theme
│   ├── locales/
│   │   ├── en.json                ← English translations
│   │   └── vi.json                ← Vietnamese translations
│   ├── components/mui/            ← Reusable components
│   │   ├── AppHeader.js
│   │   ├── BookCard.js
│   │   ├── DataTable.js
│   │   └── StatCard.js
│   └── App.js                     ← Already wrapped with providers
```

## 🎨 Using Material UI in Your Pages

### Before (Old)
```javascript
function BooksPage() {
  return (
    <div className="books-container">
      <h1>Books</h1>
      <div className="book-grid">
        {books.map(book => (
          <div key={book.id} className="book-card">
            <h3>{book.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### After (Modern)
```javascript
import { Container, Box, Grid, Typography } from '@mui/material';
import { BookCard } from '../components/mui/BookCard';
import { FormattedMessage } from 'react-intl';

function BooksPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        <FormattedMessage id="navigation.books" />
      </Typography>
      
      <Grid container spacing={3}>
        {books.map(book => (
          <Grid item xs={12} sm={6} md={4} key={book.id}>
            <BookCard book={book} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
```

## 🌐 Using Translations

### In Your Components
```javascript
import { FormattedMessage } from 'react-intl';

// Simple text
<FormattedMessage id="common.login" defaultMessage="Login" />

// With variables
<FormattedMessage
  id="books.showingResults"
  defaultMessage="Showing {count} books"
  values={{ count: 10 }}
/>

// Using intl hook
import { useIntl } from 'react-intl';

const intl = useIntl();
const message = intl.formatMessage({ id: 'common.success' });
```

## 📋 Next Steps - Page Migration Order

### Priority 1 (Do First)
1. ✅ LoginPage.js
2. ✅ RegisterPage.js
3. ✅ HomePage.js

### Priority 2 (Critical)
4. BooksPage.js
5. BookDetailPage.js
6. AdminDashboard.js

### Priority 3 (Important)
7. MyBorrowsPage.js
8. MyFinesPage.js
9. ProfilePage.js
10. AdminBooks.js
11. AdminUsers.js

### Priority 4 (Polish)
12. Other admin pages
13. Finer UI details

## 💡 Pro Tips

### Tip 1: Responsive Design
Use Material UI's responsive breakpoints:
```javascript
<Box sx={{
  width: { xs: '100%', sm: '80%', md: '60%' },
}}>
```

### Tip 2: Theming
All colors are in the theme, don't hardcode:
```javascript
<Box sx={{ bgcolor: 'primary.main' }}>  // ✅ Good
<Box sx={{ bgcolor: '#1976d2' }}>        // ❌ Bad
```

### Tip 3: Language Testing
Add to localStorage in DevTools Console:
```javascript
localStorage.setItem('library_locale', 'vi')
location.reload()
```

### Tip 4: Component Reusability
Keep components in `components/mui/` and import them:
```javascript
import { BookCard } from '../components/mui/BookCard';
```

## 🔍 Debugging

### Language not changing?
1. Check DevTools → Application → LocalStorage
2. Look for `library_locale` key
3. Check browser console for errors

### Material UI styles not applying?
1. Verify `ThemeProvider` wraps your app
2. Check `CssBaseline` is imported
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Translation missing?
1. Check JSON files (en.json, vi.json) have the key
2. Verify spelling exactly matches in code
3. Check console for warnings

## 📞 Common Tasks

### Add a new translation
```javascript
// 1. Add to en.json and vi.json
{
  "myFeature": {
    "title": "My Feature"  // English
  }
}

// 2. Use in component
<FormattedMessage id="myFeature.title" />
```

### Create a new page with Material UI
```javascript
import { Container, Box, Typography } from '@mui/material';
import { AppHeader } from '../components/mui/AppHeader';
import { FormattedMessage } from 'react-intl';

export default function MyPage() {
  return (
    <Box>
      <AppHeader title={<FormattedMessage id="myPage.title" />} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Your content here */}
      </Container>
    </Box>
  );
}
```

### Use a Material UI component
```javascript
import { Button, Card, TextField, Dialog } from '@mui/material';

// Button
<Button variant="contained" color="primary">Click me</Button>

// Card
<Card sx={{ p: 3 }}>
  <Typography>Content</Typography>
</Card>

// TextField
<TextField label="Enter text" fullWidth />

// Dialog
<Dialog open={open} onClose={handleClose}>
  <DialogContent>Are you sure?</DialogContent>
</Dialog>
```

## ✨ What You Get

✅ Modern Material Design UI  
✅ Bilingual support (VN/EN)  
✅ Responsive design (mobile, tablet, desktop)  
✅ Consistent theming  
✅ Built-in components  
✅ Better accessibility  
✅ Professional appearance  

## 🎯 Success Criteria

Your implementation is successful when:
- [ ] App starts without errors
- [ ] Language switcher works
- [ ] Language preference persists on refresh
- [ ] All pages display with Material UI
- [ ] Text switches between English and Vietnamese
- [ ] App looks good on mobile and desktop

## 🆘 Help

1. **Check the guides**:
   - MODERNIZATION_GUIDE.md - Full reference
   - COMPONENTS_GUIDE.md - Component library
   - I18N_GUIDE.md - Translation details

2. **Check examples**:
   - EXAMPLE_LOGIN_PAGE.js - Login page template
   - EXAMPLE_BOOKS_PAGE.js - Books listing template
   - EXAMPLE_ADMIN_DASHBOARD.js - Admin dashboard template

3. **Material UI Docs**: https://mui.com/

---

**Happy Coding! 🚀**

Start with the examples, follow the migration order, and gradually update your pages.
It usually takes 2-3 days per client to fully modernize all pages.
