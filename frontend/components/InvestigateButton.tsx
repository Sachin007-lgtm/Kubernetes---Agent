'use client';

import React, { useState, useEffect } from 'react';
import { runInvestigation } from '@/services/api';
import { InvestigationResult, DiagnosisResult, InvestigationRecord } from '@/types';
import InvestigationResults from './InvestigationResults';
import DiagnosisCard from './DiagnosisCard';

type Phase =
  | 'idle'
  | 'checking_pods'
  | 'collecting_logs'
  | 'analyzing_events'
  | 'inspecting_deployments'
  | 'checking_network'
  | 'ai_reasoning'
  | 'root_cause_found'
  | 'done'
  | 'error';

const PROGRESS_STEPS: { phase: Phase; label: string }[] = [
  { phase: 'checking_pods',          label: 'Checking Pods' },
  { phase: 'collecting_logs',        label: 'Reading Logs' },
  { phase: 'analyzing_events',       label: 'Analyzing Events' },
  { phase: 'inspecting_deployments', label: 'Inspecting Deployments' },
  { phase: 'checking_network',       label: 'Checking Networking' },
  { phase: 'ai_reasoning',           label: 'AI Reasoning' },
  { phase: 'root_cause_found',       label: 'Root Cause Found' },
];

const STEP_DELAY_MS = 1100;

function ProgressStep({ label, status }: { label: string; status: 'pending' | 'active' | 'done' }) {
  return (
    <div className="flex items-center gap-3">
      {status === 'done' && (
        <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs shrink-0 shadow-sm">
          ✓
        </span>
      )}
      {status === 'active' && (
        <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
      )}
      {status === 'pending' && (
        <span className="w-5 h-5 rounded-full border-2 border-zinc-250 dark:border-zinc-750 shrink-0" />
      )}
      <span
        className={`text-sm font-medium ${
          status === 'done'
            ? 'text-emerald-600 dark:text-emerald-400'
            : status === 'active'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-zinc-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

interface InvestigateButtonProps {
  selectedCluster: string;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
  externalInvestigation?: InvestigationRecord | null;
  onInvestigationFinished?: () => void;
}

export default function InvestigateButton({
  selectedCluster,
  isAuthenticated,
  onOpenLogin,
  externalInvestigation,
  onInvestigationFinished,
}: InvestigateButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [aiError, setAiError] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [namespace, setNamespace] = useState<string>('--all-namespaces');

  // Load external investigation record when clicked from history
  useEffect(() => {
    if (externalInvestigation) {
      if (externalInvestigation.investigation) {
        setInvestigation(externalInvestigation.investigation);
      }
      if (externalInvestigation.diagnosis) {
        setDiagnosis(externalInvestigation.diagnosis);
      } else {
        setDiagnosis(null);
      }
      setAiError(externalInvestigation.ai_error || '');
      setErrorMessage('');
      setPhase('done');
    }
  }, [externalInvestigation]);

  const handleClick = async () => {
    if (!isAuthenticated) {
      onOpenLogin();
      return;
    }

    if (phase !== 'idle' && phase !== 'done' && phase !== 'error') return;

    // Reset
    setInvestigation(null);
    setDiagnosis(null);
    setAiError('');
    setErrorMessage('');
    setActiveStepIndex(0);
    setPhase('checking_pods');

    // Fire API call immediately targeting the selected cluster
    const apiPromise = runInvestigation(namespace, false, selectedCluster);

    // Animate progress steps while waiting
    for (let i = 0; i < PROGRESS_STEPS.length - 1; i++) {
      setPhase(PROGRESS_STEPS[i].phase);
      setActiveStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
    }

    try {
      const response = await apiPromise;
      setActiveStepIndex(PROGRESS_STEPS.length - 1);
      setPhase('root_cause_found');
      await new Promise((resolve) => setTimeout(resolve, 800));

      setInvestigation(response.investigation);
      if (response.diagnosis) {
        setDiagnosis(response.diagnosis as DiagnosisResult);
      }
      if (response.ai_error) {
        setAiError(response.ai_error);
      }
      setPhase('done');
      if (onInvestigationFinished) {
        onInvestigationFinished();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to connect to Kubernetes cluster or backend.';
      setErrorMessage(msg);
      setPhase('error');
    }
    setActiveStepIndex(-1);
  };

  const isRunning = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  // Check if cluster is completely healthy
  const isHealthyCluster =
    phase === 'done' &&
    investigation &&
    investigation.pods?.healthy &&
    (investigation.pods?.problematic_pods?.length ?? 0) === 0 &&
    (investigation.events?.warning_count ?? 0) === 0 &&
    (investigation.deployments?.unhealthy_count ?? 0) === 0;

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Controls: Target Namespace & Action Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs">
          <span className="text-zinc-400">Namespace:</span>
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            disabled={isRunning}
            className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="--all-namespaces">All Namespaces (-A)</option>
            <option value="default">default</option>
            <option value="kube-system">kube-system</option>
            <option value="production">production</option>
            <option value="auth">auth</option>
            <option value="analytics">analytics</option>
          </select>
        </div>

        {/* Main CTA */}
        <button
          onClick={handleClick}
          disabled={isRunning}
          className={`px-8 py-3.5 rounded-xl font-semibold text-base shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer
            ${
              isRunning
                ? 'bg-blue-800 text-blue-200 opacity-70 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
            }`}
          id="investigate-cluster-btn"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {isRunning
            ? 'Investigating Kubernetes Cluster...'
            : phase === 'done'
            ? 'Re-investigate Cluster'
            : 'Investigate Cluster'}
        </button>
      </div>

      {/* Auth Banner if not authenticated */}
      {!isAuthenticated && (
        <div className="text-xs text-zinc-500 flex items-center gap-1.5">
          <span>🔒 Sign in to trigger investigations on</span>
          <strong className="text-zinc-700 dark:text-zinc-300">{selectedCluster || 'cluster'}</strong>
          <span>—</span>
          <button
            onClick={onOpenLogin}
            className="text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer"
          >
            Sign in now
          </button>
        </div>
      )}

      {/* Progress Steps (Prompt 04 Requirements) */}
      {(isRunning || phase === 'done') && (
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 space-y-3 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Investigation Progress
          </p>
          {PROGRESS_STEPS.map((step, i) => {
            let status: 'pending' | 'active' | 'done' = 'pending';
            if (phase === 'done') {
              status = 'done';
            } else if (i < activeStepIndex) {
              status = 'done';
            } else if (i === activeStepIndex) {
              status = 'active';
            }
            return <ProgressStep key={step.phase} label={step.label} status={status} />;
          })}
          {phase === 'done' && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <ProgressStep label="Investigation Complete" status="done" />
            </div>
          )}
        </div>
      )}

      {/* Connection Error / Beginner-Friendly Error Guidance (Prompt 05) */}
      {phase === 'error' && (
        <div className="w-full max-w-2xl rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <span className="text-lg">⚠️</span>
            <p className="font-bold text-base">Unable to connect to Kubernetes cluster</p>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300 font-mono bg-red-100/60 dark:bg-red-950/40 p-2.5 rounded-lg">
            {errorMessage}
          </p>
          <div className="pt-2 border-t border-red-200 dark:border-red-800/40 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Please verify:
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 space-y-1.5 list-disc list-inside">
              <li><strong>kubeconfig path</strong>: Ensure <code className="bg-red-100 dark:bg-red-900/40 px-1 py-0.5 rounded">~/.kube/config</code> exists on your machine</li>
              <li><strong>cluster access</strong>: Run <code className="bg-red-100 dark:bg-red-900/40 px-1 py-0.5 rounded">kubectl cluster-info</code> in PowerShell/Terminal to verify cluster reachability</li>
              <li><strong>kubectl permissions</strong>: Ensure your context has read access to pods, events, and deployments</li>
              <li><strong>backend running</strong>: Verify FastAPI server is running on port 8000</li>
            </ul>
          </div>
        </div>
      )}

      {/* Results Display */}
      {phase === 'done' && (
        <div className="w-full max-w-4xl space-y-6">
          {/* AI Diagnosis Card — shown when diagnosis exists */}
          {diagnosis && <DiagnosisCard diagnosis={diagnosis} />}

          {/* Empty / Healthy State (Prompt 05) */}
          {isHealthyCluster && !diagnosis && (
            <div className="w-full rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 text-2xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                No critical Kubernetes issues detected. Cluster appears healthy.
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 max-w-lg mx-auto">
                All inspected pods are Running or Completed. Zero rollout bottlenecks or warning events detected in the namespace.
              </p>
            </div>
          )}

          {/* AI Error Warning (Partial Result) */}
          {aiError && !diagnosis && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-5 py-4">
              <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1 text-sm">
                ⚠ AI Reasoning Layer Note
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">{aiError}</p>
              <p className="mt-2 text-[11px] text-amber-500">
                Add your OPENROUTER_API_KEY in backend/.env to generate AI diagnoses. Investigation evidence is displayed below.
              </p>
            </div>
          )}

          {/* Kubernetes Evidence Collection Details */}
          {investigation && (
            <>
              <div className="flex items-center justify-between pt-2">
                <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                  <span>📊</span>
                  <span>Investigation Evidence</span>
                </h2>
                <span className="text-xs text-zinc-400 font-mono">
                  Target: {selectedCluster} / {namespace}
                </span>
              </div>
              <InvestigationResults data={investigation} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
