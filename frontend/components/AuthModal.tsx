'use client';

import React, { useState } from 'react';
import { loginUser } from '@/services/api';
import { UserProfile } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('sre@cloudinfra.io');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginUser(email, password);
      onLoginSuccess(data.user);
      onClose();
    } catch {
      setError('Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loginUser('alex.mercer@cloudinfra.io', 'admin123');
      onLoginSuccess(data.user);
      onClose();
    } catch {
      setError('Demo login failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 flex items-center justify-center rounded-full border border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:border-zinc-300 transition-colors cursor-pointer"
          title="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl border border-zinc-900 flex items-center justify-center text-zinc-900 text-lg font-bold">
            ☸
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
              SRE Console Login
            </h3>
            <p className="text-[11px] text-zinc-400 tracking-wide">
              Authenticate to trigger cluster investigations & AI analysis
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Quick Demo Login */}
        <button
          type="button"
          onClick={handleQuickDemoLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 mb-5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>⚡</span>
          <span>1-Click Sign In as Senior SRE (Demo) →</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-zinc-100" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">or sign in with credentials</span>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-2">
              Email / InsForge ID
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-sm rounded-full border border-zinc-200 bg-[#F8F9FA] text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
              placeholder="sre@cloudinfra.io"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-2">
              Password / Access Token
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-sm rounded-full border border-zinc-200 bg-[#F8F9FA] text-zinc-900 focus:outline-none focus:border-zinc-400 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full border border-zinc-800 text-zinc-900 font-semibold text-sm hover:bg-zinc-900 hover:text-white transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Console →'}
          </button>
        </form>
      </div>
    </div>
  );
}
