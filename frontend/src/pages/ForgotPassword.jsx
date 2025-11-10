import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        })
      });
      
      if (response.ok) {
        // Clear, specific success message
        setSuccessMessage('✓ Reset email sent! Check your inbox for instructions to reset your password.');
        
        // Clear form
        setFormData({ email: '' });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send password reset email');
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

  return (
    <div className="page-container flex items-center justify-center min-h-screen bg-[var(--true-black)] p-4">
      <div className="card max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[var(--off-white)] mb-2">
            Reset Password
          </h1>
          <p className="text-[var(--light-gray)]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        {successMessage && (
          <div className="form-success p-4 bg-[var(--success-green)] bg-opacity-20 border border-[var(--success-green)] border-opacity-30 rounded-lg text-[var(--success-green)] mb-4" role="alert">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span className="font-semibold">{successMessage}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
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
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'border-[var(--danger-red)]' : ''}`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
              placeholder="Enter your email"
            />
            {errors.email && (
              <div id="email-error" className="form-error text-[var(--danger-red)] text-sm mt-1">
                {errors.email}
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
                <span className="sr-only">Sending reset link...</span>
              </>
            ) : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[var(--light-gray)]">
            Remember your password?{' '}
            <Link to="/login" className="text-[var(--orange-primary)] hover:text-[var(--off-white)] transition-colors">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;