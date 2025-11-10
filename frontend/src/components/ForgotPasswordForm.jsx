import React, { useState } from 'react';
import { forgotPassword } from '../../services/authService';

const ForgotPasswordForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    email: ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      await forgotPassword(formData.email);
      
      // Always show success message regardless of whether email exists (security best practice)
      setSuccessMessage('If an account with that email exists, a password reset link has been sent.');
      
      // Clear form
      setFormData({ email: '' });
      
      // Auto-close after success if onClose is provided
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Password reset request failed:', error);
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
          <h2>Reset Password</h2>
          <button className="close-btn" onClick={handleClose} aria-label="Close modal">
            ×
          </button>
        </div>
        
        {successMessage && (
          <div className="form-success" role="alert">
            {successMessage}
          </div>
        )}
        
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
          
          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" aria-hidden="true"></span>
                <span className="sr-only">Sending reset link...</span>
              </>
            ) : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;