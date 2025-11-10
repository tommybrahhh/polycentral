import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';

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

const ResetPasswordForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Extract token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setFormData(prev => ({ ...prev, token }));
    } else {
      setErrors({
        submit: 'Invalid or missing reset token. Please check your reset link.'
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear submit error when user types
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.token) {
      newErrors.submit = 'Reset token is required';
      return false;
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else {
      const requirements = {
        length: formData.newPassword.length >= 8,
        lowercase: /[a-z]/.test(formData.newPassword),
        uppercase: /[A-Z]/.test(formData.newPassword),
        number: /\d/.test(formData.newPassword),
        special: /[@$!%*?&]/.test(formData.newPassword)
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
        
        newErrors.newPassword = `Password must contain ${missingText}`;
      }
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
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
      const data = await resetPassword(formData.token, formData.newPassword);
      setSuccessMessage(data.message || 'Password reset successfully!');
      
      // Clear form
      setFormData({
        token: '',
        newPassword: '',
        confirmPassword: '',
        showNewPassword: false,
        showConfirmPassword: false
      });
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
        if (onClose) onClose();
      }, 3000);
    } catch (error) {
      console.error('Password reset failed:', error);
      
      // Handle specific error messages
      let errorMessage = error.message || 'An unexpected error occurred. Please try again later.';
      if (error.message.includes('Invalid or expired')) {
        errorMessage = 'Invalid or expired reset link. Please request a new password reset.';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'User not found for this reset token';
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div>
        
        {successMessage && (
          <div className="form-success" role="alert">
            {successMessage}
            <p>Redirecting to login page...</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="form">
          {errors.submit && (
            <div className="form-error" role="alert">
              {errors.submit}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <div className="password-input-container">
              <input
                type={formData.showNewPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                aria-invalid={!!errors.newPassword}
                aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
                required
              />
              <button
                type="button"
                className="button button-icon"
                onClick={() => setFormData(prev => ({ ...prev, showNewPassword: !prev.showNewPassword }))}
                aria-label={formData.showNewPassword ? "Hide new password" : "Show new password"}
              >
                {formData.showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.newPassword && (
              <div id="newPassword-error" className="form-error">
                {errors.newPassword}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <div className="password-input-container">
              <input
                type={formData.showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                required
              />
              <button
                type="button"
                className="button button-icon"
                onClick={() => setFormData(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                aria-label={formData.showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {formData.showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
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
                <span className="sr-only">Resetting password...</span>
              </>
            ) : 'Reset Password'}
          </button>
        </form>
    </div>
  );
};

export default ResetPasswordForm;