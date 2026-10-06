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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activeInvestigation, setActiveInvestigation] = useState<InvestigationRecord | null>(null);
  const [historyKey, setHistoryKey] = useState<number>(0);

  // Load existing session or default SRE profile on mount
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const stored = localStorage.getItem('sre_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        // Fetch current user from backend (returns demo profile)
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
      // Default fallback
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
    // Smooth scroll to investigation results
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Navbar with Cluster Selector & User Info */}
      <Navbar
        user={user}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        selectedCluster={selectedCluster}
        onClusterChange={(cluster) => setSelectedCluster(cluster)}
      />

      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-4xl flex flex-col items-center gap-8">
          {/* Header Tag & Subtitle */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 shadow-sm">
            <span>☸</span>
            <span>Intelligent SRE Incident Response</span>
          </div>

          <div className="space-y-3 text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              AI Kubernetes Agent
            </h1>
            <p className="text-lg sm:text-xl font-normal text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Correlate Pod Failures, Container Logs, and Kubernetes Events with AI reasoning to pinpoint root causes and recommend actionable kubectl fixes.
            </p>
          </div>

          {/* Cluster & Backend Status Badges */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <StatusBadge />
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-zinc-400">Target:</span>
              <strong className="text-zinc-800 dark:text-zinc-200">{selectedCluster}</strong>
            </div>
          </div>

          {/* Main Investigation CTA & Progress & AI Diagnosis */}
          <div className="w-full flex flex-col items-center gap-6 pt-2">
            <InvestigateButton
              selectedCluster={selectedCluster}
              isAuthenticated={!!user}
              onOpenLogin={() => setIsAuthModalOpen(true)}
              externalInvestigation={activeInvestigation}
              onInvestigationFinished={() => setHistoryKey((k) => k + 1)}
            />
          </div>

          {/* Investigation History Panel (Prompt 04 Requirements) */}
          <div className="w-full pt-4">
            <InvestigationHistory
              key={historyKey}
              onSelectInvestigation={handleSelectInvestigation}
              activeInvestigationId={activeInvestigation?.id}
            />
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 bg-white/50 dark:bg-zinc-900/50">
        AI DevOps Kubernetes Agent • Production-grade Automated Troubleshooting Engine
      </footer>
    </div>
  );
}
