import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

const ResetPasswordPageForm = () => {
  const [formData, setFormData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  // Function to validate token by making a lightweight API call
  const validateToken = async (token) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      
      // Use a lightweight validation approach - we'll make a HEAD request
      // to the reset endpoint to check if the token exists and is valid
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
          'X-Token-Validation': token
        }
      });
      
      if (response.ok) {
        setTokenValid(true);
        setErrors({});
      } else {
        throw new Error('Token validation failed');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setErrors({
        submit: '❌ Invalid or expired reset link. Please request a new password reset email.'
      });
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  useEffect(() => {
    // Extract token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setFormData(prev => ({ ...prev, token }));
      // Validate token immediately
      validateToken(token);
    } else {
      setErrors({
        submit: '❌ Invalid or expired reset link. Please request a new password reset email.'
      });
      setValidatingToken(false);
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: formData.token,
          newPassword: formData.newPassword
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Clear, specific success message
        setSuccessMessage('✓ Password updated successfully! You can now log in with your new password.');
        
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
        }, 3000);
      } else {
        const errorData = await response.json();
        
        if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid or expired reset link. Please request a new password reset.');
        } else if (response.status === 404) {
          throw new Error('User not found for this reset token');
        } else {
          throw new Error(errorData.error || 'Failed to reset password');
        }
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      setErrors({
        submit: error.message || 'An unexpected error occurred. Please try again later.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {successMessage && (
        <div className="form-success p-4 bg-[var(--success-green)] bg-opacity-20 border border-[var(--success-green)] border-opacity-30 rounded-lg text-[var(--success-green)] mb-4" role="alert">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span className="font-semibold">{successMessage}</span>
          </div>
          <p className="mt-2 text-sm">Redirecting to login page...</p>
        </div>
      )}
      
      {validatingToken && (
        <div className="form-loading p-4 bg-[var(--info-blue)] bg-opacity-20 border border-[var(--info-blue)] border-opacity-30 rounded-lg text-[var(--info-blue)] mb-4" role="alert">
          <div className="flex items-center gap-2">
            <span className="loading-spinner" aria-hidden="true"></span>
            <span className="font-semibold">Validating reset link...</span>
          </div>
        </div>
      )}
      
      {!validatingToken && errors.submit && (
        <div className="form-error p-4 bg-[var(--danger-red)] bg-opacity-20 border border-[var(--danger-red)] border-opacity-30 rounded-lg text-[var(--danger-red)] mb-4" role="alert">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="font-semibold">{errors.submit}</span>
          </div>
        </div>
      )}
      
      {!validatingToken && tokenValid && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <div className="password-input-container flex items-center relative">
              <input
                type={formData.showNewPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`form-input flex-1 ${errors.newPassword ? 'border-[var(--danger-red)]' : ''}`}
                aria-invalid={!!errors.newPassword}
                aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
                required
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="button button-icon absolute right-2"
                onClick={() => setFormData(prev => ({ ...prev, showNewPassword: !prev.showNewPassword }))}
                aria-label={formData.showNewPassword ? "Hide new password" : "Show new password"}
              >
                {formData.showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.newPassword && (
              <div id="newPassword-error" className="form-error text-[var(--danger-red)] text-sm mt-1">
                {errors.newPassword}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <div className="password-input-container flex items-center relative">
              <input
                type={formData.showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input flex-1 ${errors.confirmPassword ? 'border-[var(--danger-red)]' : ''}`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                required
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                className="button button-icon absolute right-2"
                onClick={() => setFormData(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                aria-label={formData.showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {formData.showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div id="confirmPassword-error" className="form-error text-[var(--danger-red)] text-sm mt-1">
                {errors.confirmPassword}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="btn btn-primary w-full"
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
      )}
    </div>
  );
};

export default ResetPasswordPageForm;