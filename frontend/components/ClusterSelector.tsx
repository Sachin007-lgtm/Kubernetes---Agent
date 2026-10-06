'use client';

import React, { useState, useEffect } from 'react';
import { fetchClusters, switchCluster } from '@/services/api';
import { ClusterInfo } from '@/types';

interface ClusterSelectorProps {
  selectedCluster: string;
  onClusterChange: (clusterName: string) => void;
}

export default function ClusterSelector({
  selectedCluster,
  onClusterChange,
}: ClusterSelectorProps) {
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [switching, setSwitching] = useState<boolean>(false);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      setLoading(true);
      const data = await fetchClusters();
      setClusters(data.clusters || []);
      if (!selectedCluster && data.current_context) {
        onClusterChange(data.current_context);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (cluster: ClusterInfo) => {
    setIsOpen(false);
    if (cluster.name === selectedCluster) return;

    try {
      setSwitching(true);
      await switchCluster(cluster.name);
      onClusterChange(cluster.name);
    } catch (err) {
      console.error('Failed to switch cluster context:', err);
      // Still update UI context for targeted inspection
      onClusterChange(cluster.name);
    } finally {
      setSwitching(false);
    }
  };

  const current = clusters.find((c) => c.name === selectedCluster) || clusters[0];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching || loading}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-all shadow-sm cursor-pointer"
        id="cluster-selector-btn"
        title="Switch active Kubernetes cluster context"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              current?.reachable
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-zinc-400 dark:text-zinc-500 text-[11px] uppercase tracking-wider">
            Cluster:
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {current ? current.name : loading ? 'Detecting clusters...' : 'Select Cluster'}
          </span>
        </span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50 p-2 space-y-1">
            <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Discovered in ~/.kube/config
              </p>
            </div>

            {clusters.map((cluster) => {
              const isSelected = cluster.name === (current?.name || selectedCluster);
              return (
                <button
                  key={cluster.name}
                  onClick={() => handleSelect(cluster)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cluster.reachable ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                      <span>{cluster.name}</span>
                      {cluster.is_mock && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          Preset
                        </span>
                      )}
                    </div>
                    {cluster.info && (
                      <span className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                        {cluster.info}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}

            <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 px-2 py-1">
              <button
                onClick={loadClusters}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                ↻ Refresh clusters from kubeconfig
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
