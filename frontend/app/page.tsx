'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import InvestigateButton from '@/components/InvestigateButton';
import InvestigationHistory from '@/components/InvestigationHistory';
import StatusBadge from '@/components/StatusBadge';
import AuthModal from '@/components/AuthModal';
import { UserProfile, InvestigationRecord } from '@/types';
import { fetchCurrentUser, logoutUser } from '@/services/api';

export default function Home() {
  const [selectedCluster, setSelectedCluster] = useState<string>('docker-desktop');
  const [user, setUser]                         = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen]   = useState<boolean>(false);
  const [activeInvestigation, setActiveInvestigation] = useState<InvestigationRecord | null>(null);
  const [historyKey, setHistoryKey]             = useState<number>(0);

  // Load existing session on mount
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const stored = localStorage.getItem('sre_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        const res = await fetchCurrentUser();
        if (res.authenticated && res.user) {
          setUser(res.user);
          localStorage.setItem('sre_user', JSON.stringify(res.user));
          if (res.user.token) {
            localStorage.setItem('sre_token', res.user.token);
          }
        }
      }
    } catch {
      setUser({
        id: 'usr-sre-01',
        name: 'Alex Mercer',
        email: 'alex.mercer@cloudinfra.io',
        role: 'Senior Kubernetes SRE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      });
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleSelectInvestigation = (record: InvestigationRecord) => {
    setActiveInvestigation(record);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  return (
    /*
      ── Outer wrapper: lavender/lilac gradient comes from body via globals.css.
         The product lives inside a white rounded-[36px] card, exactly like
         the video's "browser chrome" presentation.
    */
    <div className="min-h-screen py-4 sm:py-8 px-2 sm:px-6 flex flex-col items-center justify-start">
      {/* ── White rounded product card ──────────────────────────────────────── */}
      <div className="w-full max-w-[1280px] bg-white rounded-[28px] sm:rounded-[40px] shadow-2xl shadow-indigo-950/10 border border-white/70 overflow-hidden flex flex-col">

        {/* ── Navigation bar ──────────────────────────────────────────────── */}
        <Navbar
          user={user}
          onOpenLogin={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          selectedCluster={selectedCluster}
          onClusterChange={(cluster) => setSelectedCluster(cluster)}
        />

        {/* ── Hero / Header Banner ─────────────────────────────────────────── */}
        <div className="px-6 sm:px-12 pt-10 sm:pt-14 pb-8 sm:pb-10 border-b border-zinc-100">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Title + sub-label */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-zinc-400 uppercase">
                INNOVATION AT EVERY TURN
              </p>
              <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-zinc-900 leading-[1.1]">
                AI Kubernetes Agent
              </h1>
              <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
                Correlate Pod Failures, Container Logs, and Kubernetes Events with AI reasoning to pinpoint root causes and recommend actionable kubectl fixes.
              </p>
            </div>

            {/* Right: Status badges */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 bg-zinc-50 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-zinc-400">Target:</span>
                <strong className="text-zinc-800">{selectedCluster}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main product content ─────────────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-10">

          {/* Investigation trigger + real-time progress + results + diagnosis */}
          <InvestigateButton
            selectedCluster={selectedCluster}
            isAuthenticated={!!user}
            onOpenLogin={() => setIsAuthModalOpen(true)}
            externalInvestigation={activeInvestigation}
            onInvestigationFinished={() => setHistoryKey((k) => k + 1)}
          />

          {/* Past investigations sidebar-style panel */}
          <InvestigationHistory
            key={historyKey}
            onSelectInvestigation={handleSelectInvestigation}
            activeInvestigationId={activeInvestigation?.id}
          />
        </main>

        {/* ── Footer strip ─────────────────────────────────────────────────── */}
        <footer className="px-6 sm:px-12 py-5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
          <span>AI Kubernetes Agent • Senior SRE Copilot</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Powered by Groq LPU &amp; OpenRouter</span>
          </div>
        </footer>
      </div>

      {/* ── Auth Modal ───────────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u: UserProfile) => setUser(u)}
      />
    </div>
  );
}
