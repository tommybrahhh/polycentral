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
        navigate('/login');
      } else {
        const errorData = await response.json();
        
        // Production-friendly error messages
        let errorMessage = 'Registration failed. Please try again.';
        if (errorData.message) {
          if (errorData.message.includes('already exists')) {
            errorMessage = 'Email already registered. Please use a different email.';
          } else if (errorData.message.includes('password')) {
            errorMessage = 'Invalid password. ' + errorData.message;
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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Account</h2>
          <button className="close-btn" onClick={handleClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="register-form">
          {errors.submit && <div className="error-message">{errors.submit}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              aria-invalid={!!errors.username}
              aria-describedby="username-error"
            />
            {errors.username && <div id="username-error" className="error">{errors.username}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              aria-invalid={!!errors.email}
              aria-describedby="email-error"
            />
            {errors.email && <div id="email-error" className="error">{errors.email}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={formData.showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={!!errors.password}
                aria-describedby="password-error"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setFormData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                aria-label={formData.showPassword ? "Hide password" : "Show password"}
              >
                {formData.showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && <div id="password-error" className="error">{errors.password}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby="confirmPassword-error"
            />
            {errors.confirmPassword && (
              <div id="confirmPassword-error" className="error">{errors.confirmPassword}</div>
            )}
          </div>
          
          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;