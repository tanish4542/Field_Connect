export class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], success = false, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = success;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
} 