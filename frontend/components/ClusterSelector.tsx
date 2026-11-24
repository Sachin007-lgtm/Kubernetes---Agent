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
        className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-all shadow-sm cursor-pointer"
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
          <span className="text-zinc-400 text-[11px] uppercase tracking-wider">
            Cluster:
          </span>
          <span className="font-semibold text-zinc-900">
            {current ? current.name : loading ? 'Detecting...' : 'Select Cluster'}
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
          <div className="absolute left-0 mt-2 w-72 rounded-3xl border border-zinc-200/80 bg-white shadow-xl z-50 p-2 space-y-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100 mb-1">
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
                  className={`w-full text-left px-3 py-2 rounded-2xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-100 text-zinc-900 font-semibold'
                      : 'hover:bg-zinc-50 text-zinc-700'
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
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
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
                    <svg className="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}

            <div className="pt-1.5 border-t border-zinc-100 px-3 py-1.5">
              <button
                onClick={loadClusters}
                className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer transition-colors"
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
