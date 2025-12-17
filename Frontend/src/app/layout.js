'use client';

import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
// import { GoogleOAuthProvider } from '@react-oauth/google'; // TODO: Enable Google Sign-In later

export default function RootLayout({ children }) {
  // const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {/* <GoogleOAuthProvider clientId={googleClientId}> */}
          <AuthProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </AuthProvider>
        {/* </GoogleOAuthProvider> */}
      </body>
    </html>
  );
}