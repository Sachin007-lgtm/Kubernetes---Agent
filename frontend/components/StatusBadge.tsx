'use client';

import React from 'react';
import { useHealth } from '@/hooks/useHealth';

export default function StatusBadge() {
  const { data, isLoading, isError } = useHealth();

  let statusText = "System Status: Ready";
  let badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  let dotColor = "bg-emerald-500";

  if (isLoading) {
    statusText = "System Status: Checking...";
    badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    dotColor = "bg-amber-500";
  } else if (isError) {
    statusText = "System Status: Backend Offline (Ready)";
    badgeColor = "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    dotColor = "bg-zinc-400";
  } else if (data?.status === 'healthy') {
    statusText = "System Status: Ready";
  }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${badgeColor}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      <span>{statusText}</span>
    </div>
  );
}
