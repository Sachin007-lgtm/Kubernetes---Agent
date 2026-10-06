'use client';

import React, { useState, useEffect } from 'react';
import { fetchHistory, resetHistory } from '@/services/api';
import { InvestigationRecord } from '@/types';

interface InvestigationHistoryProps {
  onSelectInvestigation: (record: InvestigationRecord) => void;
  activeInvestigationId?: string;
}

export default function InvestigationHistory({
  onSelectInvestigation,
  activeInvestigationId,
}: InvestigationHistoryProps) {
  const [history, setHistory] = useState<InvestigationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [clearing, setClearing] = useState<boolean>(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchHistory(15);
      setHistory(res.investigations || []);
    } catch (err) {
      console.error('Failed to load investigation history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset history to initial starter incidents?')) return;
    try {
      setClearing(true);
      await resetHistory();
      await loadHistory();
    } catch (err) {
      console.error('Failed to reset history:', err);
    } finally {
      setClearing(false);
    }
  };

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const getBadgeStyle = (rootCause: string) => {
    const text = rootCause.toLowerCase();
    if (text.includes('crashloop')) {
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
    }
    if (text.includes('imagepull')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    if (text.includes('oomkilled')) {
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    }
    if (text.includes('selector') || text.includes('endpoint')) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Recent Investigations
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Refresh history"
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={clearing}
            className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
            title="Reset history"
          >
            Reset
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-96 overflow-y-auto">
        {loading && history.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            No previous investigations found. Run an investigation above to start recording incidents!
          </div>
        ) : (
          history.map((record) => {
            const isSelected = record.id === activeInvestigationId;
            const badgeClass = getBadgeStyle(record.root_cause);
            return (
              <div
                key={record.id}
                onClick={() => onSelectInvestigation(record)}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors cursor-pointer ${
                  isSelected ? 'bg-blue-50/60 dark:bg-blue-950/20 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      {record.root_cause.split('—')[0].trim()}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      ns: <strong className="text-zinc-600 dark:text-zinc-300">{record.namespace}</strong>
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      cluster: <strong className="text-zinc-600 dark:text-zinc-300">{record.cluster}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-1">
                    {record.root_cause}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:self-center">
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {record.confidence}%
                    </div>
                    <div className="text-[10px] text-zinc-400">{formatTime(record.timestamp)}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectInvestigation(record);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    {isSelected ? 'Viewing' : 'View Report'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
