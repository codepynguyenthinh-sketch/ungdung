/**
 * Input Validation Middleware
 * Validates and sanitizes API request inputs
 */

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

const validateISBN = (isbn) => {
  const isbnRegex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[X0-9]$/;
  return isbnRegex.test(isbn);
};

const validateBookData = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!data.author || data.author.trim().length === 0) {
    errors.push('Author is required');
  }
  
  if (data.isbn && !validateISBN(data.isbn)) {
    errors.push('Invalid ISBN format');
  }
  
  if (data.publishYear && (isNaN(data.publishYear) || data.publishYear < 1000 || data.publishYear > new Date().getFullYear())) {
    errors.push('Invalid publish year');
  }
  
  if (data.totalCopies && (isNaN(data.totalCopies) || data.totalCopies < 1)) {
    errors.push('Total copies must be a positive number');
  }
  
  return errors;
};

const validateUserData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.email) {
    if (!data.email || !validateEmail(data.email)) {
      errors.push('Valid email is required');
    }
  }
  
  if (!isUpdate || data.fullName) {
    if (!data.fullName || data.fullName.trim().length === 0) {
      errors.push('Full name is required');
    }
  }
  
  if (!isUpdate || data.phone) {
    if (data.phone && !validatePhone(data.phone)) {
      errors.push('Invalid phone number format');
    }
  }
  
  if (!isUpdate || data.password) {
    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
  }
  
  return errors;
};

module.exports = {
  validateEmail,
  validatePhone,
  validateISBN,
  validateBookData,
  validateUserData,
};
