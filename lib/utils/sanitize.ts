/**
 * Enhanced sanitization utilities to prevent XSS, SQL injection, and code injection attacks
 * This module provides comprehensive input sanitization for all user-generated content
 */

/**
 * Sanitize text input - removes all potentially dangerous content
 * Use this for general text fields like names, titles, descriptions
 */
export const sanitizeText = (text: string, maxLength: number = 2000): string => {
  if (!text) return '';

  let sanitized = text;

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script tags and their content (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/file:/gi, '');

  // Remove SQL injection attempts
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi, '');
  sanitized = sanitized.replace(/(--|;|\/\*|\*\/)/g, '');

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent abuse
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Sanitize email input
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';

  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim();

  // Remove any characters that aren't valid in emails
  sanitized = sanitized.replace(/[^a-z0-9@._+-]/g, '');

  // Limit length
  if (sanitized.length > 254) {
    sanitized = sanitized.substring(0, 254);
  }

  return sanitized;
};

/**
 * Sanitize phone number input
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';

  // Remove all characters except digits, +, -, (, ), and spaces
  let sanitized = phone.replace(/[^0-9+\-() ]/g, '');

  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > 20) {
    sanitized = sanitized.substring(0, 20);
  }

  return sanitized;
};

/**
 * Sanitize URL input
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';

  let sanitized = url.trim();

  // Remove dangerous protocols
  sanitized = sanitized.replace(/^(javascript|data|vbscript|file):/gi, '');

  // Only allow http and https
  if (!/^https?:\/\//i.test(sanitized)) {
    return '';
  }

  // Limit length
  if (sanitized.length > 2048) {
    sanitized = sanitized.substring(0, 2048);
  }

  return sanitized;
};

/**
 * Sanitize message content (allows more characters but still safe)
 */
export const sanitizeMessage = (message: string, maxLength: number = 5000): string => {
  if (!message) return '';

  let sanitized = message;

  // Remove HTML tags except for basic formatting that will be escaped by React
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:(?!image)/gi, ''); // Allow data:image for inline images
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Remove SQL injection attempts
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Sanitize JSON input (for API requests)
 */
export const sanitizeJsonValue = (value: any): any => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeText(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }

  if (typeof value === 'object') {
    const sanitized: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        // Sanitize the key as well
        const sanitizedKey = sanitizeText(key, 100);
        sanitized[sanitizedKey] = sanitizeJsonValue(value[key]);
      }
    }
    return sanitized;
  }

  return value;
};

/**
 * Sanitize for display (preserves line breaks)
 */
export const sanitizeForDisplay = (text: string): string => {
  const sanitized = sanitizeText(text);
  // Line breaks are preserved, React will handle them safely
  return sanitized;
};

/**
 * Deep sanitize an object (for API request bodies)
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = {} as T;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value) as any;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: any) =>
          typeof item === 'string' ? sanitizeText(item) :
            typeof item === 'object' ? sanitizeObject(item) : item
        ) as any;
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};
