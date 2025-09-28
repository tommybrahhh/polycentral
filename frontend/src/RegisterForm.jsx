import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegisterForm = ({ onClose }) => {
  const [showModal, setShowModal] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear password error when user types
    if (name === 'password' && errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const requirements = {
        length: formData.password.length >= 8,
        lowercase: /[a-z]/.test(formData.password),
        uppercase: /[A-Z]/.test(formData.password),
        number: /\d/.test(formData.password),
        special: /[@$!%*?&]/.test(formData.password)
      };
      
      const missing = Object.entries(requirements)
        .filter(([key, met]) => !met)
        .map(([key]) => key);
        
      if (missing.length > 0) {
        const missingText = missing.map(req => {
          switch (req) {
            case 'length': return 'at least 8 characters';
            case 'lowercase': return 'a lowercase letter';
            case 'uppercase': return 'an uppercase letter';
            case 'number': return 'a number';
            case 'special': return 'a special character (@, $, !, %, *, ?, &)';
            default: return req;
          }
        }).join(', ');
        
        newErrors.password = `Password must contain ${missingText}`;
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      // Use Vite environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Registration successful', data);
        // Store the auth token in localStorage
        localStorage.setItem('auth_token', data.token);
        
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update app state to reflect logged-in user
        // The App component will handle this via context or state
        navigate('/events');
      } else {
        const errorData = await response.json();
        
        // Production-friendly error messages
        let errorMessage = 'Registration failed. Please try again.';
        if (errorData.message) {
          if (errorData.message.includes('already exists')) {
            errorMessage = 'Email already registered. Please use a different email.';
          } else if (errorData.message.includes('password')) {
            errorMessage = errorData.message;
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setErrors({
        submit: error.message || 'An unexpected error occurred. Please try again later.'
      });
      
      // Fallback: Clear form on network errors
      if (error.message.includes('Failed to fetch')) {
        setTimeout(() => {
          setErrors({});
          setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
          });
        }, 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Account</h2>
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
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`form-input ${errors.username ? 'error' : ''}`}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              required
            />
            {errors.username && (
              <div id="username-error" className="form-error">
                {errors.username}
              </div>
            )}
          </div>
          
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
                {formData.showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && (
              <div id="password-error" className="form-error">
                {errors.password}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              required
            />
            {errors.confirmPassword && (
              <div id="confirmPassword-error" className="form-error">
                {errors.confirmPassword}
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
                <span className="sr-only">Registering...</span>
              </>
            ) : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;