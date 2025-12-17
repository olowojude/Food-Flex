'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function GoogleSignInButton() {
  const { googleLogin } = useAuth();
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse) => {
    setError('');
    const result = await googleLogin(credentialResponse.credential);
    
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        theme="outline"
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}