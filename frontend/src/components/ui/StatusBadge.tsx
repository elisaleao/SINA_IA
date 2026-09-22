import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'idle';

export interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
  className?: string;
}

const config: Record<
  StatusVariant,
  { icon: string; bg: string; text: string; border: string }
> = {
  success: {
    icon: '✓',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  warning: {
    icon: '⚠',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
  },
  error: {
    icon: '✕',
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-300',
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-300',
  },
  idle: {
    icon: '○',
    bg: 'bg-stone-50',
    text: 'text-stone-700',
    border: 'border-stone-300',
  },
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const current = config[status] || config.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      <span aria-hidden="true" className="text-sm font-black">
        {current.icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

export default StatusBadge;

