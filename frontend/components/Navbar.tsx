'use client';

import React from 'react';
import ClusterSelector from './ClusterSelector';
import { UserProfile } from '@/types';

interface NavbarProps {
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  selectedCluster: string;
  onClusterChange: (clusterName: string) => void;
}

export default function Navbar({
  user,
  onOpenLogin,
  onLogout,
  selectedCluster,
  onClusterChange,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            ☸
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
              AI Kubernetes Agent
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
              Senior SRE Copilot
            </span>
          </div>
        </div>

        {/* Center / Right Toolbar */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cluster Selector */}
          <ClusterSelector
            selectedCluster={selectedCluster}
            onClusterChange={onClusterChange}
          />

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
              />
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-400 leading-none">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors p-1"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
