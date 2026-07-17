/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppUser, SystemSettings } from '../types';
import { Key, User, ArrowRight, Lock, Sparkles, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { FullLogo } from './Logo';

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean | Promise<boolean>;
  settings?: SystemSettings;
}

export default function LoginPage({ onLogin, settings }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }

    setIsSubmitting(true);
    const success = await onLogin(username.trim().toLowerCase(), password.trim());
    setIsSubmitting(false);
    if (!success) {
      setError('Username atau password yang Anda masukkan salah.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Animated Accent / Logo Icon */}
        <div className="flex justify-center mb-1">
          <FullLogo size={140} logoUrl={settings?.companyLogoUrl} companyName={settings?.companyName} />
        </div>
        <p className="mt-3.5 text-xs font-bold text-indigo-600 uppercase tracking-widest">
          Sistem Penjualan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200/80 rounded-3xl shadow-sm sm:px-10">
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-slate-500 mb-1.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                Username
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-3.5 pr-10 py-2.5 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm font-bold font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-650 transition cursor-pointer border-none bg-transparent"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-bold">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-sm shadow-indigo-100 border-none"
              >
                {isSubmitting ? 'Memproses...' : 'Masuk ke Sistem'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>



        </div>
      </div>

    </div>
  );
}
