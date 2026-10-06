'use client';

import React from 'react';
import { InvestigationResult } from '@/types';

interface InvestigationResultsProps {
  data: InvestigationResult;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  healthy,
  children,
}: {
  title: string;
  icon: string;
  healthy?: boolean | null;
  children: React.ReactNode;
}) {
  const healthColor =
    healthy === true
      ? 'text-emerald-500'
      : healthy === false
      ? 'text-red-400'
      : 'text-zinc-400';

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 font-semibold text-sm text-zinc-800 dark:text-zinc-100">
          <span>{icon}</span>
          {title}
        </div>
        {healthy !== undefined && (
          <span className={`text-xs font-semibold ${healthColor}`}>
            {healthy === true ? '✓ Healthy' : healthy === false ? '✗ Issues Found' : '— Unknown'}
          </span>
        )}
      </div>
      <div className="px-5 py-4 text-sm text-zinc-700 dark:text-zinc-300">{children}</div>
    </div>
  );
}

function Badge({ label, variant = 'neutral' }: { label: string; variant?: 'ok' | 'warn' | 'error' | 'neutral' }) {
  const colors = {
    ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warn: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[variant]}`}>
      {label}
    </span>
  );
}

// ─── Sub-sections ────────────────────────────────────────────────────────────

function PodsSection({ pods }: { pods: InvestigationResult['pods'] }) {
  if (!pods) return null;
  if (pods.error)
    return (
      <Section title="Pods" icon="🫛" healthy={null}>
        <p className="text-red-400">{pods.error}</p>
      </Section>
    );

  const problematics = pods.problematic_pods ?? [];

  return (
    <Section title="Pods" icon="🫛" healthy={pods.healthy}>
      <p className="text-xs text-zinc-500 mb-3">
        Total pods scanned: <span className="font-semibold">{pods.total_pods ?? 0}</span> •{' '}
        Problematic: <span className="font-semibold">{problematics.length}</span>
      </p>

      {problematics.length === 0 ? (
        <p className="text-emerald-600 dark:text-emerald-400">All pods are running normally.</p>
      ) : (
        <div className="space-y-2">
          {problematics.map((pod, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-2"
            >
              <div>
                <span className="font-mono font-semibold text-red-700 dark:text-red-400">{pod.name}</span>
                <span className="ml-2 text-xs text-zinc-500">ns: {pod.namespace}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={pod.status} variant="error" />
                {(pod.restart_count ?? 0) > 0 && (
                  <Badge label={`↺ ${pod.restart_count}`} variant="warn" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function LogsSection({ logs }: { logs: InvestigationResult['logs'] }) {
  if (!logs) return null;

  const entries = Object.entries(logs);

  // Check for the "no problematic pods" short-circuit message
  if ('message' in logs && typeof (logs as Record<string, unknown>).message === 'string') {
    return (
      <Section title="Logs" icon="📋" healthy={true}>
        <p className="text-emerald-600 dark:text-emerald-400">
          {(logs as Record<string, unknown>).message as string}
        </p>
      </Section>
    );
  }

  if (entries.length === 0) {
    return (
      <Section title="Logs" icon="📋" healthy={true}>
        <p className="text-zinc-400">No log data collected.</p>
      </Section>
    );
  }

  return (
    <Section title="Logs" icon="📋" healthy={entries.every(([, v]) => !v.error)}>
      <div className="space-y-4">
        {entries.map(([key, logData]) => (
          <div key={key}>
            <p className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {key}
            </p>
            {logData.error ? (
              <p className="text-red-400 text-xs">{logData.error}</p>
            ) : logData.relevant_lines && logData.relevant_lines.length > 0 ? (
              <pre className="bg-zinc-950 text-emerald-400 text-xs rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {logData.relevant_lines.join('\n')}
              </pre>
            ) : (
              <div>
                <p className="text-zinc-400 text-xs mb-1">No matching error patterns. Showing last lines:</p>
                <pre className="bg-zinc-950 text-zinc-400 text-xs rounded-lg p-3 overflow-x-auto max-h-32 whitespace-pre-wrap">
                  {logData.raw_tail || 'No output'}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function EventsSection({ events }: { events: InvestigationResult['events'] }) {
  if (!events) return null;
  if (events.error)
    return (
      <Section title="Events" icon="⚡" healthy={null}>
        <p className="text-red-400">{events.error}</p>
      </Section>
    );

  const warnings = events.warning_events ?? [];

  return (
    <Section title="Events" icon="⚡" healthy={(events.warning_count ?? 0) === 0}>
      <p className="text-xs text-zinc-500 mb-3">
        Total events: <span className="font-semibold">{events.total_events ?? 0}</span> •{' '}
        Warnings: <span className="font-semibold">{events.warning_count ?? 0}</span>
      </p>

      {warnings.length === 0 ? (
        <p className="text-emerald-600 dark:text-emerald-400">No warning events found.</p>
      ) : (
        <div className="space-y-2">
          {warnings.slice(0, 10).map((evt, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-2"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Badge label={evt.reason} variant="warn" />
                <span className="font-mono text-xs text-zinc-500">{evt.object}</span>
                <span className="ml-auto text-xs text-zinc-400">{evt.last_seen} · ×{evt.count}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{evt.message}</p>
            </div>
          ))}
          {warnings.length > 10 && (
            <p className="text-xs text-zinc-400">...and {warnings.length - 10} more warnings</p>
          )}
        </div>
      )}
    </Section>
  );
}

function DeploymentsSection({ deployments }: { deployments: InvestigationResult['deployments'] }) {
  if (!deployments) return null;
  if (deployments.error)
    return (
      <Section title="Deployments" icon="🚀" healthy={null}>
        <p className="text-red-400">{deployments.error}</p>
      </Section>
    );

  const unhealthy = deployments.unhealthy_deployments ?? [];

  return (
    <Section title="Deployments" icon="🚀" healthy={deployments.healthy}>
      <p className="text-xs text-zinc-500 mb-3">
        Total: <span className="font-semibold">{deployments.total_deployments ?? 0}</span> •{' '}
        Unhealthy: <span className="font-semibold">{deployments.unhealthy_count ?? 0}</span>
      </p>

      {unhealthy.length === 0 ? (
        <p className="text-emerald-600 dark:text-emerald-400">All deployments are healthy.</p>
      ) : (
        <div className="space-y-2">
          {unhealthy.map((dep, i) => (
            <div
              key={i}
              className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-red-700 dark:text-red-400">{dep.name}</span>
                <Badge label={`${dep.ready}/${dep.desired} ready`} variant="error" />
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">namespace: {dep.namespace}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function NetworkSection({ network }: { network: InvestigationResult['network'] }) {
  if (!network) return null;
  if (network.error)
    return (
      <Section title="Network" icon="🌐" healthy={null}>
        <p className="text-red-400">{network.error}</p>
      </Section>
    );

  const issues = network.issues ?? [];

  return (
    <Section
      title="Network"
      icon="🌐"
      healthy={(network.issue_count ?? 0) === 0 && network.dns_healthy !== false}
    >
      <p className="text-xs text-zinc-500 mb-3">
        Services: <span className="font-semibold">{network.total_services ?? 0}</span> •{' '}
        Issues: <span className="font-semibold">{network.issue_count ?? 0}</span> •{' '}
        DNS:{' '}
        <span
          className={
            network.dns_healthy ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-400 font-semibold'
          }
        >
          {network.dns_status ?? 'unknown'}
        </span>
      </p>

      {issues.length === 0 ? (
        <p className="text-emerald-600 dark:text-emerald-400">No networking issues detected.</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-2"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Badge
                  label={issue.severity}
                  variant={issue.severity === 'critical' ? 'error' : 'warn'}
                />
                <span className="font-mono text-xs font-semibold">{issue.service}</span>
                <span className="text-xs text-zinc-400">ns: {issue.namespace}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{issue.issue}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InvestigationResults({ data }: InvestigationResultsProps) {
  return (
    <div className="w-full space-y-4">
      <PodsSection pods={data.pods} />
      <LogsSection logs={data.logs} />
      <EventsSection events={data.events} />
      <DeploymentsSection deployments={data.deployments} />
      <NetworkSection network={data.network} />
    </div>
  );
}
