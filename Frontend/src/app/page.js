'use client';

import Link from 'next/link';
import { ShoppingCart, CreditCard, Users, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 via-white to-secondary-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-primary-600">FoodFlex</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Shop now, pay later. Get ₦50,000 credit instantly and buy groceries on your terms.
          </p>
          
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/register"
              className="btn-primary px-8 py-3 text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="btn-secondary px-8 py-3 text-lg"
            >
              Login
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">₦50,000 Credit</h3>
              <p className="text-sm text-gray-600">
                Instant credit for all new users
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Shop Freely</h3>
              <p className="text-sm text-gray-600">
                Browse thousands of products
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">QR Pickup</h3>
              <p className="text-sm text-gray-600">
                Secure order verification
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Flexible Repayment</h3>
              <p className="text-sm text-gray-600">
                Pay back at your convenience
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary-600">₦50k</p>
              <p className="text-gray-600 mt-2">Initial Credit</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-green-600">1000+</p>
              <p className="text-gray-600 mt-2">Products</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-purple-600">100%</p>
              <p className="text-gray-600 mt-2">Secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}