'use client';

import React from 'react';
import { useHealth } from '@/hooks/useHealth';

export default function StatusBadge() {
  const { data, isLoading, isError } = useHealth();

  let statusText = 'Backend Ready';
  let dotColor   = 'bg-emerald-500';
  let textColor  = 'text-emerald-600';
  let borderColor = 'border-emerald-200';
  let bgColor    = 'bg-emerald-50';

  if (isLoading) {
    statusText  = 'Checking...';
    dotColor    = 'bg-amber-400';
    textColor   = 'text-amber-600';
    borderColor = 'border-amber-200';
    bgColor     = 'bg-amber-50';
  } else if (isError) {
    statusText  = 'Backend Offline';
    dotColor    = 'bg-zinc-400';
    textColor   = 'text-zinc-500';
    borderColor = 'border-zinc-200';
    bgColor     = 'bg-zinc-50';
  } else if (data?.status === 'healthy') {
    statusText = 'Backend Ready';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border ${bgColor} ${borderColor} ${textColor} shadow-xs`}>
      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      <span>{statusText}</span>
    </div>
  );
}
