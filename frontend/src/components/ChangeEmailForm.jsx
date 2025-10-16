import React, { useState } from 'react';

const ChangeEmailForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    newEmail: '',
    currentPassword: '',
    showCurrentPassword: false
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
    
    if (!formData.newEmail) {
      newErrors.newEmail = 'New email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
    }
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch(`${apiBaseUrl}/api/user/request-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: formData.newEmail,
          currentPassword: formData.currentPassword
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'Verification email sent! Please check your new email address for the verification link.');
        
        // Clear form
        setFormData({
          newEmail: '',
          currentPassword: '',
          showCurrentPassword: false
        });
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-close after success if onClose is provided
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 5000); // Give user time to read the message
        }
      } else {
        const errorData = await response.json();
        
        if (response.status === 401) {
          throw new Error('Current password is incorrect');
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request');
        } else if (response.status === 409) {
          throw new Error(errorData.error || 'Email already in use');
        } else {
          throw new Error(errorData.error || 'Failed to initiate email change');
        }
      }
    } catch (error) {
      console.error('Email change request failed:', error);
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
          <h2>Change Email Address</h2>
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
            <label htmlFor="newEmail" className="form-label">
              New Email Address
            </label>
            <input
              type="email"
              id="newEmail"
              name="newEmail"
              value={formData.newEmail}
              onChange={handleChange}
              className={`form-input ${errors.newEmail ? 'error' : ''}`}
              aria-invalid={!!errors.newEmail}
              aria-describedby={errors.newEmail ? "newEmail-error" : undefined}
              required
              placeholder="Enter your new email address"
            />
            {errors.newEmail && (
              <div id="newEmail-error" className="form-error">
                {errors.newEmail}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="currentPassword" className="form-label">
              Current Password
            </label>
            <div className="password-input-container">
              <input
                type={formData.showCurrentPassword ? "text" : "password"}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                aria-invalid={!!errors.currentPassword}
                aria-describedby={errors.currentPassword ? "currentPassword-error" : undefined}
                required
                placeholder="Enter your current password"
              />
              <button
                type="button"
                className="button button-icon"
                onClick={() => setFormData(prev => ({ ...prev, showCurrentPassword: !prev.showCurrentPassword }))}
                aria-label={formData.showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                {formData.showCurrentPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.currentPassword && (
              <div id="currentPassword-error" className="form-error">
                {errors.currentPassword}
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
                <span className="sr-only">Sending verification email...</span>
              </>
            ) : 'Send Verification Email'}
          </button>
        </form>
        
        <div className="form-note">
          <p><strong>Note:</strong> A verification link will be sent to your new email address. 
          You must click the link to complete the email change process.</p>
        </div>
      </div>
    </div>
  );
};

export default ChangeEmailForm;