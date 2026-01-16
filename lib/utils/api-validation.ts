/**
 * API Validation Middleware
 * Provides reusable validation functions for API routes to prevent injection attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeMessage, sanitizeObject } from './sanitize';

export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitizedValue?: any;
}

/**
 * Validate and sanitize request body
 * Use this at the start of every API route that accepts user input
 */
export async function validateRequestBody(
    request: NextRequest,
    requiredFields?: string[]
): Promise<{ valid: boolean; data?: any; error?: string }> {
    try {
        const body = await request.json();

        // Check for required fields
        if (requiredFields) {
            for (const field of requiredFields) {
                if (!body[field]) {
                    return {
                        valid: false,
                        error: `Missing required field: ${field}`
                    };
                }
            }
        }

        // Sanitize the entire body
        const sanitizedBody = sanitizeObject(body);

        return {
            valid: true,
            data: sanitizedBody
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid request body'
        };
    }
}

/**
 * Validate text field
 */
export function validateTextField(
    value: string,
    fieldName: string,
    options: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    } = {}
): ValidationResult {
    const { required = true, minLength = 1, maxLength = 500, pattern } = options;

    if (!value || !value.trim()) {
        if (required) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true, sanitizedValue: '' };
    }

    const sanitized = sanitizeText(value, maxLength);

    if (sanitized.length < minLength) {
        return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
    }

    if (sanitized.length > maxLength) {
        return { valid: false, error: `${fieldName} must be less than ${maxLength} characters` };
    }

    if (pattern && !pattern.test(sanitized)) {
        return { valid: false, error: `${fieldName} contains invalid characters` };
    }

    return { valid: true, sanitizedValue: sanitized };
}

/**
 * Validate email field
 */
export function validateEmailField(email: string, required: boolean = true): ValidationResult {
    if (!email || !email.trim()) {
        if (required) {
            return { valid: false, error: 'Email is required' };
        }
        return { valid: true, sanitizedValue: '' };
    }

    const sanitized = sanitizeEmail(email);

    // Email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
        return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true, sanitizedValue: sanitized };
}

/**
 * Validate phone field
 */
export function validatePhoneField(phone: string, required: boolean = false): ValidationResult {
    if (!phone || !phone.trim()) {
        if (required) {
            return { valid: false, error: 'Phone number is required' };
        }
        return { valid: true, sanitizedValue: '' };
    }

    const sanitized = sanitizePhone(phone);

    // Remove formatting for validation
    const cleaned = sanitized.replace(/[\s\-()]/g, '');

    // Check if it's all digits (with optional + prefix)
    if (!/^\+?\d+$/.test(cleaned)) {
        return { valid: false, error: 'Invalid phone number format' };
    }

    // Check length (10-15 digits)
    const digits = cleaned.replace(/\+/g, '');
    if (digits.length < 10 || digits.length > 15) {
        return { valid: false, error: 'Phone number must be between 10 and 15 digits' };
    }

    return { valid: true, sanitizedValue: sanitized };
}

/**
 * Validate message content
 */
export function validateMessageField(
    message: string,
    options: { required?: boolean; maxLength?: number } = {}
): ValidationResult {
    const { required = true, maxLength = 5000 } = options;

    if (!message || !message.trim()) {
        if (required) {
            return { valid: false, error: 'Message is required' };
        }
        return { valid: true, sanitizedValue: '' };
    }

    const sanitized = sanitizeMessage(message, maxLength);

    if (sanitized.length === 0 && required) {
        return { valid: false, error: 'Message cannot be empty after sanitization' };
    }

    return { valid: true, sanitizedValue: sanitized };
}

/**
 * Validate array field
 */
export function validateArrayField(
    value: any,
    fieldName: string,
    options: { required?: boolean; maxLength?: number } = {}
): ValidationResult {
    const { required = true, maxLength = 100 } = options;

    if (!value) {
        if (required) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true, sanitizedValue: [] };
    }

    if (!Array.isArray(value)) {
        return { valid: false, error: `${fieldName} must be an array` };
    }

    if (value.length > maxLength) {
        return { valid: false, error: `${fieldName} cannot have more than ${maxLength} items` };
    }

    return { valid: true, sanitizedValue: value };
}

/**
 * Validate number field
 */
export function validateNumberField(
    value: any,
    fieldName: string,
    options: { required?: boolean; min?: number; max?: number } = {}
): ValidationResult {
    const { required = true, min, max } = options;

    if (value === null || value === undefined || value === '') {
        if (required) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true, sanitizedValue: null };
    }

    const num = Number(value);

    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} must be a number` };
    }

    if (min !== undefined && num < min) {
        return { valid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (max !== undefined && num > max) {
        return { valid: false, error: `${fieldName} must be at most ${max}` };
    }

    return { valid: true, sanitizedValue: num };
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, status: number = 400): NextResponse {
    return NextResponse.json({ error: message }, { status });
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any, status: number = 200): NextResponse {
    return NextResponse.json({ success: true, ...data }, { status });
}

/**
 * Validate authentication token
 */
export function validateAuthHeader(request: NextRequest): { valid: boolean; token?: string; error?: string } {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return { valid: false, error: 'Missing authorization header' };
    }

    if (!authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'Invalid authorization format' };
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10) {
        return { valid: false, error: 'Invalid token' };
    }

    return { valid: true, token };
}
