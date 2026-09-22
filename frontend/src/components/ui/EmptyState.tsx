import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = '📂',
  title,
  description,
  actionText,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/50 ${className}`}
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm border border-stone-200 text-3xl mb-4"
      >
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">
        {title}
      </h3>
      <p className="max-w-md text-sm text-stone-600 leading-relaxed mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;

