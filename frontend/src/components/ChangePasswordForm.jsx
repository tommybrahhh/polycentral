import React, { useState } from 'react';

const ChangePasswordForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
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
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
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
        
        newErrors.newPassword = `New password must contain ${missingText}`;
      }
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Check if new password is same as current
    if (formData.currentPassword && formData.newPassword && 
        formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
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

      const response = await fetch(`${apiBaseUrl}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.message || 'Password changed successfully!');
        
        // Clear form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          showCurrentPassword: false,
          showNewPassword: false,
          showConfirmPassword: false
        });
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-close after success if onClose is provided
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        
        if (response.status === 401) {
          throw new Error('Current password is incorrect');
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request');
        } else {
          throw new Error(errorData.error || 'Failed to change password');
        }
      }
    } catch (error) {
      console.error('Password change failed:', error);
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
          <h2>Change Password</h2>
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
                {formData.showNewPassword ? "🙈" : "👁️"}
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
                {formData.showConfirmPassword ? "🙈" : "👁️"}
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
                <span className="sr-only">Changing password...</span>
              </>
            ) : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordForm;