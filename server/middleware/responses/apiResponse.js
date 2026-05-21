/**
 * Standardized API Response Middleware
 * Provides consistent response format across all API endpoints
 */

class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', success = true) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = success;
    this.timestamp = new Date().toISOString();
  }
}

class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }
}

// Middleware to format all responses
const responseHandler = (req, res, next) => {
  // Override res.json to format responses
  const originalJson = res.json;
  
  res.json = function(data) {
    if (res.statusCode >= 400) {
      return originalJson.call(this, {
        success: false,
        statusCode: res.statusCode,
        message: data.message || 'Error',
        errors: data.errors || null,
        timestamp: new Date().toISOString(),
      });
    }
    
    return originalJson.call(this, {
      success: true,
      statusCode: res.statusCode,
      data: data.data || data,
      message: data.message || 'Success',
      timestamp: new Date().toISOString(),
    });
  };
  
  next();
};

// Response helper functions
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message, true));
};

const sendError = (res, statusCode, message = 'Error', errors = null) => {
  return res.status(statusCode).json(new ApiError(statusCode, message, errors));
};

module.exports = {
  ApiResponse,
  ApiError,
  responseHandler,
  sendSuccess,
  sendError,
};
