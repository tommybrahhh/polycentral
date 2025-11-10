import React from 'react';
import ResetPasswordPageForm from '../components/ResetPasswordPageForm';

const ResetPassword = () => {
  return (
    <div className="page-container flex items-center justify-center min-h-screen bg-[var(--true-black)] p-4">
      <div className="card max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[var(--off-white)] mb-2">
            Reset Your Password
          </h1>
          <p className="text-[var(--light-gray)]">
            Enter your new password below to complete the reset process.
          </p>
        </div>
        
        <ResetPasswordPageForm />
        
        <div className="mt-6 text-center">
          <p className="text-[var(--light-gray)]">
            Remember your password?{' '}
            <a href="/login" className="text-[var(--orange-primary)] hover:text-[var(--off-white)] transition-colors">
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;