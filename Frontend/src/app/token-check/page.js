'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Key, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function SimpleTokenChecker() {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [userCookie, setUserCookie] = useState(null);

  useEffect(() => {
    checkTokens();
  }, []);

  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return { error: error.message };
    }
  };

  const checkTokens = () => {
    const accessToken = Cookies.get('access_token');
    const refreshToken = Cookies.get('refresh_token');
    const userStr = Cookies.get('user');

    let userObj = null;
    if (userStr) {
      try {
        userObj = JSON.parse(userStr);
      } catch (e) {
        userObj = { error: 'Failed to parse user cookie' };
      }
    }

    const decoded = accessToken ? decodeJWT(accessToken) : null;

    setTokenInfo({
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUserCookie: !!userStr,
      accessToken: accessToken ? `${accessToken.substring(0, 30)}...` : null,
      decoded: decoded,
      tokenIsExpired: decoded?.exp ? Date.now() >= decoded.exp * 1000 : null
    });

    setUserCookie(userObj);
  };

  const handleClearCookies = () => {
    if (confirm('This will logout. Are you sure?')) {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      Cookies.remove('user');
      alert('Cookies cleared! Now login again.');
      window.location.href = '/login';
    }
  };

  const handleForceLogin = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Token & Cookie Checker
          </h1>
          <p className="text-gray-600">
            Check your authentication tokens without redirects
          </p>
        </div>

        {/* Token Status */}
        <div className={`rounded-lg border-2 p-6 mb-6 ${
          tokenInfo?.hasAccessToken && !tokenInfo?.tokenIsExpired
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start gap-4">
            {tokenInfo?.hasAccessToken && !tokenInfo?.tokenIsExpired ? (
              <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-8 h-8 text-yellow-600 shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-bold mb-2">
                {tokenInfo?.hasAccessToken 
                  ? tokenInfo.tokenIsExpired ? '⚠️ Token Expired' : '✓ Token Found'
                  : '✗ No Token Found'}
              </h2>
              <p className="text-sm">
                {tokenInfo?.hasAccessToken 
                  ? tokenInfo.tokenIsExpired 
                    ? 'Your token has expired. You need to login again.'
                    : 'You have a valid token in cookies.'
                  : 'You are not logged in. No access token found.'}
              </p>
            </div>
          </div>
        </div>

        {/* Cookies Present */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cookies Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium text-gray-700">Access Token:</span>
              <span className={`font-bold ${tokenInfo?.hasAccessToken ? 'text-green-600' : 'text-red-600'}`}>
                {tokenInfo?.hasAccessToken ? 'Present ✓' : 'Missing ✗'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium text-gray-700">Refresh Token:</span>
              <span className={`font-bold ${tokenInfo?.hasRefreshToken ? 'text-green-600' : 'text-red-600'}`}>
                {tokenInfo?.hasRefreshToken ? 'Present ✓' : 'Missing ✗'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium text-gray-700">User Cookie:</span>
              <span className={`font-bold ${tokenInfo?.hasUserCookie ? 'text-green-600' : 'text-red-600'}`}>
                {tokenInfo?.hasUserCookie ? 'Present ✓' : 'Missing ✗'}
              </span>
            </div>
          </div>
        </div>

        {/* User Cookie Data */}
        {userCookie && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Cookie Data</h2>
            {userCookie.error ? (
              <p className="text-red-600">{userCookie.error}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="text-gray-900">{userCookie.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">Role (Cookie):</span>
                  <span className={`font-bold ${
                    userCookie.role === 'SELLER' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {userCookie.role}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium text-gray-700">First Name:</span>
                  <span className="text-gray-900">{userCookie.first_name || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium text-gray-700">ID:</span>
                  <span className="text-gray-900">{userCookie.id}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Decoded JWT Token */}
        {tokenInfo?.decoded && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Decoded JWT Token
            </h2>
            {tokenInfo.decoded.error ? (
              <p className="text-red-600">{tokenInfo.decoded.error}</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">User ID:</span>
                    <span className="text-gray-900">{tokenInfo.decoded.user_id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">{tokenInfo.decoded.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">Role (JWT):</span>
                    <span className={`font-bold text-lg ${
                      tokenInfo.decoded.role === 'SELLER' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {tokenInfo.decoded.role}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">Issued At:</span>
                    <span className="text-gray-900">
                      {new Date(tokenInfo.decoded.iat * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">Expires At:</span>
                    <span className={`font-bold ${
                      tokenInfo.tokenIsExpired ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {new Date(tokenInfo.decoded.exp * 1000).toLocaleString()}
                      {tokenInfo.tokenIsExpired && ' (EXPIRED)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-gray-700">Time Remaining:</span>
                    <span className="text-gray-900">
                      {tokenInfo.tokenIsExpired 
                        ? 'Expired'
                        : `${Math.floor((tokenInfo.decoded.exp * 1000 - Date.now()) / 60000)} minutes`
                      }
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded border p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Full Token Payload:</h3>
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(tokenInfo.decoded, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diagnosis */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">🔍 Diagnosis</h2>
          
          {!tokenInfo?.hasAccessToken ? (
            <div className="space-y-3">
              <p className="text-blue-800">
                <strong>Problem:</strong> No access token found. You need to login.
              </p>
              <button
                onClick={handleForceLogin}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Go to Login →
              </button>
            </div>
          ) : tokenInfo.tokenIsExpired ? (
            <div className="space-y-3">
              <p className="text-blue-800">
                <strong>Problem:</strong> Your token has expired. Login again to get a fresh token.
              </p>
              <button
                onClick={handleForceLogin}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Login Again →
              </button>
            </div>
          ) : tokenInfo.decoded?.role !== 'SELLER' ? (
            <div className="space-y-3">
              <p className="text-red-800">
                <strong>⚠️ FOUND THE PROBLEM!</strong>
              </p>
              <p className="text-red-700">
                Your JWT token has <code className="bg-red-200 px-2 py-1 rounded">role = "{tokenInfo.decoded?.role}"</code> instead of <code className="bg-green-200 px-2 py-1 rounded">role = "SELLER"</code>
              </p>
              <p className="text-red-700">
                This token was issued when you were a {tokenInfo.decoded?.role}. Even if your database role was changed to SELLER, you need to <strong>logout and login again</strong> to get a new token with the updated role.
              </p>
              <div className="bg-red-100 rounded border border-red-300 p-4 mt-4">
                <h3 className="font-semibold text-red-900 mb-2">✅ Solution:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-red-800">
                  <li>Click the button below to logout</li>
                  <li>Login again with your credentials</li>
                  <li>Your new token will have role = "SELLER"</li>
                  <li>Product creation will work!</li>
                </ol>
              </div>
              <button
                onClick={handleClearCookies}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                🔄 Logout and Login Again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-green-800">
                <strong>✓ Your token looks good!</strong>
              </p>
              <p className="text-green-700">
                Your JWT token has <code className="bg-green-200 px-2 py-1 rounded">role = "SELLER"</code> ✓
              </p>
              <p className="text-green-700">
                If you're still getting 403 errors, the issue might be in the backend permissions check. Please share the <code>accounts/permissions.py</code> file.
              </p>
              <Link href="/inventory/new">
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
                  Try Creating Product →
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={checkTokens}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
          >
            🔄 Refresh Check
          </button>
          <button
            onClick={handleClearCookies}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
          >
            🗑️ Clear All Cookies
          </button>
        </div>
      </div>
    </div>
  );
}