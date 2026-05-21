# Bilingual (i18n) Implementation Guide

## Overview

The application uses `react-intl` for internationalization support with English and Vietnamese languages.

## File Structure

```
client/src/
├── i18n/
│   ├── LanguageProvider.js    # Language context provider
│   └── theme.js               # Material UI theme configuration
├── locales/
│   ├── en.json                # English translations
│   └── vi.json                # Vietnamese translations
└── App.js                      # Wrapped with LanguageProvider
```

## How It Works

### 1. LanguageProvider Component

The `LanguageProvider` wraps your entire app and provides language context:

```javascript
// In App.js
import { LanguageProvider } from './i18n/LanguageProvider';

export default function App() {
  return (
    <LanguageProvider>
      {/* Rest of app */}
    </LanguageProvider>
  );
}
```

**Features**:
- Persists language selection to localStorage
- Provides `useLanguage()` hook
- Includes `IntlProvider` from react-intl
- Sets document language automatically

### 2. Using Translations

#### Method 1: Using `FormattedMessage` Component (Recommended)

```javascript
import { FormattedMessage } from 'react-intl';

export function MyComponent() {
  return (
    <div>
      <h1>
        <FormattedMessage 
          id="common.login" 
          defaultMessage="Login"
        />
      </h1>
      <p>
        <FormattedMessage 
          id="auth.loginTitle"
          defaultMessage="Sign in to your account"
        />
      </p>
    </div>
  );
}
```

**Advantages**:
- Clean, declarative syntax
- Default text shown during loading
- SSR friendly

#### Method 2: Using `useIntl()` Hook

```javascript
import { useIntl } from 'react-intl';

export function MyComponent() {
  const intl = useIntl();

  const handleClick = () => {
    const message = intl.formatMessage({ id: 'common.success' });
    alert(message);
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

**Advantages**:
- Useful for dynamic messages
- Can pass to functions (e.g., toast notifications)
- More control over formatting

#### Method 3: Language Switcher

```javascript
import { useLanguage } from '../i18n/LanguageProvider';

export function LanguageSwitcher() {
  const { locale, toggleLanguage, changeLanguage } = useLanguage();

  return (
    <div>
      <button onClick={toggleLanguage}>
        Switch to {locale === 'en' ? 'Tiếng Việt' : 'English'}
      </button>
      
      <select onChange={(e) => changeLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="vi">Tiếng Việt</option>
      </select>
    </div>
  );
}
```

## Translation Files

### Structure of Translation Files

Each JSON file contains nested keys for organization:

```json
{
  "common": {
    "login": "Login",
    "logout": "Logout"
  },
  "auth": {
    "email": "Email",
    "password": "Password",
    "loginButton": "Sign In"
  },
  "books": {
    "title": "Book Title",
    "author": "Author Name"
  }
}
```

### Adding New Translations

1. **Add to English file** (`locales/en.json`):
```json
{
  "myNewSection": {
    "myNewKey": "My English text"
  }
}
```

2. **Add to Vietnamese file** (`locales/vi.json`):
```json
{
  "myNewSection": {
    "myNewKey": "Văn bản Tiếng Việt của tôi"
  }
}
```

3. **Use in component**:
```javascript
<FormattedMessage 
  id="myNewSection.myNewKey"
  defaultMessage="My English text"
/>
```

## Advanced Features

### Formatted Numbers

```javascript
import { FormattedNumber } from 'react-intl';

// Displays: 1,234.56 (English) or 1.234,56 (Vietnamese)
<FormattedNumber value={1234.56} />
```

### Formatted Dates

```javascript
import { FormattedDate, FormattedTime } from 'react-intl';

<FormattedDate value={new Date()} />
<FormattedTime value={new Date()} />
```

### Formatted Relative Time

```javascript
import { FormattedRelativeTime } from 'react-intl';

// "3 hours ago" or "3 giờ trước"
<FormattedRelativeTime 
  value={-3}
  numeric="auto"
  unit="hour"
/>
```

### Plural Messages

```javascript
import { FormattedMessage } from 'react-intl';

<FormattedMessage
  id="books.count"
  values={{ count: 5 }}
  defaultMessage={`You have {count, plural,
    one {# book}
    other {# books}
  }`}
/>
```

### Messages with Variables

```javascript
<FormattedMessage
  id="greetings.hello"
  values={{ name: 'John' }}
  defaultMessage="Hello, {name}!"
/>
```

In JSON file:
```json
{
  "greetings": {
    "hello": "Hello, {name}!"
  }
}
```

## Best Practices

### 1. Organize Keys Hierarchically

```json
{
  "common": { ... },
  "auth": { ... },
  "admin": { ... },
  "books": { ... }
}
```

### 2. Use Consistent Naming

- Use camelCase: `mySection.myKey`
- Use descriptive names: `auth.loginButton` not `button.login`
- Use present tense: `save` not `saving` or `saved`

### 3. Always Provide Default Messages

```javascript
<FormattedMessage
  id="auth.login"
  defaultMessage="Login"  // Always include this
/>
```

### 4. Handle Missing Translations

Missing keys will show the ID in brackets: `[auth.unknownKey]`

### 5. Keep Translations Close to Usage

```javascript
// Good
<FormattedMessage id="books.title" />

// Less clear
<FormattedMessage id="b.t" />
```

## Dynamic Locale Switching

```javascript
import { useLanguage } from '../i18n/LanguageProvider';

export function DashboardWithLanguageSwitch() {
  const { locale, changeLanguage } = useLanguage();

  return (
    <div>
      <div>Current Language: {locale}</div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('vi')}>Tiếng Việt</button>
      
      {/* Content will re-render with new language */}
    </div>
  );
}
```

## Common Issues & Solutions

### Issue: Translations not updating
**Solution**: Ensure the component is inside `LanguageProvider`

### Issue: Date/Number format incorrect
**Solution**: Use `FormattedDate`, `FormattedNumber` components instead of raw values

### Issue: Missing translation key
**Solution**: Check JSON files have matching keys; use default message

### Issue: Component not re-rendering on language change
**Solution**: Use `FormattedMessage` or `useIntl()` hook to make component reactive

## Testing Translations

### Manual Testing
1. Open browser DevTools
2. Go to Application → Storage → LocalStorage
3. Find `library_locale` or `student_library_locale`
4. Change the value and refresh
5. Verify translations update

### Console Warnings
React-intl shows console warnings for missing translations:
```
Missing message: "auth.unknownKey"
```

## Migration Checklist

- [ ] Replace all hardcoded English strings with `FormattedMessage`
- [ ] Add translations to both en.json and vi.json
- [ ] Test language switching functionality
- [ ] Verify localStorage persistence
- [ ] Check for missing translation warnings in console
- [ ] Test with long translations (some languages need more space)
- [ ] Test number/date formatting by locale

---

**Resources**:
- [react-intl Documentation](https://formatjs.io/docs/react-intl)
- [Plural Rules](https://formatjs.io/docs/react-intl/api#intl-formatmessage)
- [Date/Time Format](https://formatjs.io/docs/react-intl/api#intl-formatdate)
