'use client';

import React from 'react';
import { DiagnosisResult } from '@/types';

interface DiagnosisCardProps {
  diagnosis: DiagnosisResult;
}

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const color =
    label === 'High'
      ? 'bg-emerald-500'
      : label === 'Medium'
      ? 'bg-amber-400'
      : 'bg-red-400';
  const textColor =
    label === 'High'
      ? 'text-emerald-600 dark:text-emerald-400'
      : label === 'Medium'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-500 dark:text-red-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Confidence</span>
        <span className={`text-sm font-bold ${textColor}`}>
          {score}% — {label}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <div
        className={`text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed ${
          mono ? 'font-mono' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function DiagnosisCard({ diagnosis }: DiagnosisCardProps) {
  return (
    <div className="w-full rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 bg-blue-600 dark:bg-blue-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-white text-base">AI Diagnosis</span>
          <span className="text-xs text-blue-200 ml-1">Senior Kubernetes SRE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white font-medium">OpenRouter</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Confidence bar */}
        <ConfidenceBar score={diagnosis.confidence} label={diagnosis.confidence_label} />

        {/* Root Cause — highlighted */}
        <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
            Root Cause
          </p>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 leading-snug">
            {diagnosis.root_cause}
          </p>
        </div>

        {/* Explanation */}
        <Field label="Explanation">{diagnosis.explanation}</Field>

        {/* Suggested Fix */}
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
            Suggested Fix
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap">
            {diagnosis.fix}
          </p>
        </div>

        {/* kubectl Command */}
        {diagnosis.kubectl_command && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              kubectl Command
            </p>
            <div className="relative group">
              <pre className="bg-zinc-950 text-emerald-400 text-sm rounded-lg px-4 py-3 overflow-x-auto font-mono">
                {diagnosis.kubectl_command}
              </pre>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(diagnosis.kubectl_command!)
                }
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity
                           px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Prevention */}
        {diagnosis.prevention && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
              Prevention
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">{diagnosis.prevention}</p>
          </div>
        )}

        {/* Confidence Reasoning */}
        {diagnosis.confidence_reasoning && diagnosis.confidence_reasoning.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Evidence Used
            </p>
            <ul className="space-y-1">
              {diagnosis.confidence_reasoning.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="text-blue-400 mt-0.5 shrink-0">▸</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
