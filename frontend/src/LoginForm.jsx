import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../services/authService';

// SVG Icon Components
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const LoginForm = ({ onClose, onAuthentication }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    showPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      const data = await login(formData.email, formData.password);
      console.log('Login successful', data);
      
      // Store the auth token in localStorage
      localStorage.setItem('auth_token', data.token);
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update app state through callback
      if (onAuthentication) {
        console.log('Calling onAuthentication callback with:', data.user);
        onAuthentication(data.user);
        console.log('onAuthentication callback executed');
      }
      
      // Close the modal
      if (onClose) onClose();
    } catch (error) {
      console.error('Login failed:', error);
      setErrors({
        submit: error.message || 'An unexpected error occurred. Please try again later.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log In</h2>
          <button className="close-btn" onClick={handleClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {errors.submit && (
            <div className="form-error" role="alert">
              {errors.submit}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
            />
            {errors.email && (
              <div id="email-error" className="form-error">
                {errors.email}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-container">
              <input
                type={formData.showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                required
              />
              <button
                type="button"
                className="button button-icon"
                onClick={() => setFormData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                aria-label={formData.showPassword ? "Hide password" : "Show password"}
              >
                {formData.showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <div id="password-error" className="form-error">
                {errors.password}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" aria-hidden="true"></span>
                <span className="sr-only">Logging in...</span>
              </>
            ) : 'Log In'}
          </button>

          <div className="forgot-password-container">
            <Link to="/forgot-password" className="forgot-password-link" onClick={handleClose}>
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;