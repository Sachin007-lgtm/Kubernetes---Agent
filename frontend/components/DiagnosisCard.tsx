'use client';

import React from 'react';
import { DiagnosisResult } from '@/types';

interface DiagnosisCardProps {
  diagnosis: DiagnosisResult;
}

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const barColor =
    label === 'High'   ? 'bg-emerald-500'
    : label === 'Medium' ? 'bg-amber-400'
    : 'bg-red-400';
  const textColor =
    label === 'High'   ? 'text-emerald-600'
    : label === 'Medium' ? 'text-amber-600'
    : 'text-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">Confidence</span>
        <span className={`text-sm font-bold ${textColor}`}>
          {score}% — {label}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
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
    <div className="space-y-1.5 pt-4 border-t border-zinc-100">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <div className={`text-sm text-zinc-800 leading-relaxed ${mono ? 'font-mono' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function DiagnosisCard({ diagnosis }: DiagnosisCardProps) {
  return (
    <div className="w-full rounded-3xl border border-zinc-200/80 bg-[#F8F9FA] overflow-hidden shadow-xs">
      {/* ── Header ── */}
      <div className="px-6 py-4 bg-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🧠</span>
          <span className="font-bold text-white text-sm">AI Diagnosis</span>
          <span className="text-xs text-zinc-400 ml-1 font-normal">Senior Kubernetes SRE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white font-medium">
            {diagnosis.provider || 'Groq LPU'}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-6 space-y-0">
        {/* Confidence bar */}
        <ConfidenceBar score={diagnosis.confidence} label={diagnosis.confidence_label} />

        {/* Root Cause */}
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400 mb-1.5">
            Root Cause
          </p>
          <p className="text-sm font-semibold text-red-900 leading-snug">
            {diagnosis.root_cause}
          </p>
        </div>

        {/* Explanation */}
        <Field label="Explanation">{diagnosis.explanation}</Field>

        {/* Suggested Fix */}
        <div className="mt-0 space-y-1.5 pt-4 border-t border-zinc-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Suggested Fix
          </p>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">
              {diagnosis.fix}
            </p>
          </div>
        </div>

        {/* kubectl Command */}
        {diagnosis.kubectl_command && (
          <div className="space-y-1.5 pt-4 border-t border-zinc-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              kubectl Command
            </p>
            <div className="relative group rounded-2xl overflow-hidden">
              <pre className="bg-zinc-950 text-emerald-400 text-sm px-5 py-4 overflow-x-auto font-mono leading-relaxed">
                {diagnosis.kubectl_command}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(diagnosis.kubectl_command!)}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Prevention */}
        {diagnosis.prevention && (
          <div className="space-y-1.5 pt-4 border-t border-zinc-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Prevention
            </p>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-sm text-amber-900 leading-relaxed">{diagnosis.prevention}</p>
            </div>
          </div>
        )}

        {/* Evidence */}
        {diagnosis.confidence_reasoning && diagnosis.confidence_reasoning.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-zinc-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Evidence Used
            </p>
            <ul className="space-y-1.5">
              {diagnosis.confidence_reasoning.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                  <span className="text-indigo-400 mt-0.5 shrink-0">▸</span>
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
