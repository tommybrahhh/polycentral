/**
 * Authentication Service Layer
 * Abstracts all authentication-related API calls from frontend components
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Handle API response and error parsing
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * Login user with email and password
 * @param {string} identifier - Email address
 * @param {string} password - Password
 * @returns {Promise<Object>} User data and token
 */
export const login = async (identifier, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier, password })
  });
  
  return handleResponse(response);
};

/**
 * Register new user
 * @param {string} username - Username
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<Object>} User data and token
 */
export const register = async (username, email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password })
  });
  
  return handleResponse(response);
};

/**
 * Request password reset email
 * @param {string} email - Email address
 * @returns {Promise<Object>} Success message
 */
export const forgotPassword = async (email) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  });
  
  return handleResponse(response);
};

/**
 * Reset password with token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword })
  });
  
  return handleResponse(response);
};

/**
 * Validate password reset token
 * @param {string} token - Password reset token to validate
 * @returns {Promise<boolean>} True if token is valid
 */
export const validateResetToken = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'HEAD',
      headers: {
        'Content-Type': 'application/json',
        'X-Token-Validation': token
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

/**
 * Change password for authenticated user
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
export const changePassword = async (currentPassword, newPassword) => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  
  return handleResponse(response);
};

/**
 * Validate authentication token
 * @returns {Promise<boolean>} True if token is valid
 */
export const validateAuthToken = async () => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Auth token validation error:', error);
    return false;
  }
};

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  validateResetToken,
  changePassword,
  validateAuthToken
};