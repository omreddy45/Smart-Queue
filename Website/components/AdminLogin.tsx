import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/mockBackend';
import { Canteen } from '../types';
import { Card } from './ui/Card';
import { LogIn, Lock, Building2, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (canteen: Canteen) => void;
  onBack?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load all available canteens
    const allCanteens = BackendService.getAllCanteens();
    setCanteens(allCanteens);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCanteen) {
      setError('Please select a canteen');
      return;
    }

    if (!password) {
      setError('Please enter password');
      return;
    }

    setError(null);
    setLoading(true);

    // Simulate password check (in production, this would be a real verification)
    // For demo: password is the canteen ID
    setTimeout(() => {
      if (password === selectedCanteen.id || password === 'admin123') {
        // Store login info in session storage
        sessionStorage.setItem('adminCanteenId', selectedCanteen.id);
        sessionStorage.setItem('adminCanteenName', selectedCanteen.name);
        onLogin(selectedCanteen);
      } else {
        setError('Invalid password. Use canteen ID or admin123');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-gray-500">Login to manage your canteen</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Login Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Canteen Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Building2 className="w-4 h-4 inline mr-2" />
              Select Your Canteen
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {canteens.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No canteens found. Register a canteen first.
                </p>
              ) : (
                canteens.map(canteen => (
                  <button
                    key={canteen.id}
                    type="button"
                    onClick={() => {
                      setSelectedCanteen(canteen);
                      setError(null);
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedCanteen?.id === canteen.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{canteen.name}</h3>
                      <p className="text-sm text-gray-500">{canteen.campus}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Password Input */}
          {selectedCanteen && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Demo: Use canteen ID or 'admin123'
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={!selectedCanteen || !password || loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Demo Credentials:</strong><br />
            Select any canteen and use the canteen ID or 'admin123' as password.
          </p>
        </div>

        {/* Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-6 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}
      </Card>
    </div>
  );
};
