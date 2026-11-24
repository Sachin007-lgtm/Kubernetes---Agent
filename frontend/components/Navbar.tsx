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
    <header className="px-6 sm:px-12 pt-6 pb-0">
      {/* Top row: brand + nav + actions */}
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          {/* Kubernetes wheel icon badge — styled like the video's logo box */}
          <div className="w-7 h-7 rounded-md border border-zinc-900 bg-white flex items-center justify-center shadow-xs">
            <span className="text-zinc-900 text-sm leading-none">☸</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[15px] tracking-tight text-zinc-900 leading-tight">
              AI K8s Agent<sup className="text-[9px] font-normal text-zinc-400 ml-0.5">™</sup>
            </span>
            <span className="text-[10px] font-medium text-zinc-400 tracking-widest uppercase">
              Senior SRE Copilot
            </span>
          </div>
        </div>

        {/* Center cluster picker */}
        <div className="hidden sm:block">
          <ClusterSelector
            selectedCluster={selectedCluster}
            onClusterChange={onClusterChange}
          />
        </div>

        {/* Right: user / auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-zinc-200 shadow-xs"
                />
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-800 leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-400 leading-none">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-zinc-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-medium border border-zinc-800 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <span>Sign In</span>
              <span className="text-sm">→</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-line tagline + hairline divider — matching the video's "DevOps & Cloud Solutions" sub-bar */}
      <div className="border-b border-zinc-200/80 pb-3 flex items-center justify-between">
        <p className="text-[11px] text-zinc-400 font-normal tracking-wide">
          DevOps &amp; Cloud Solutions service provider
        </p>
        <p className="hidden sm:block text-[11px] text-zinc-400">
          ☸ Autonomous AI Kubernetes Agent
        </p>
      </div>
    </header>
  );
}
