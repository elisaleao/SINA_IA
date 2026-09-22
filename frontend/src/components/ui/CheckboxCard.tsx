'use client';

import React from 'react';

export interface CheckboxCardProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}

export function CheckboxCard({
  id,
  name,
  checked,
  onChange,
  title,
  description,
  disabled = false,
}: CheckboxCardProps) {
  return (
    <label
      htmlFor={id}
      className={`relative flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
        disabled
          ? 'cursor-not-allowed opacity-50 bg-stone-100 border-stone-200'
          : checked
            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600'
            : 'border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50'
      }`}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded text-blue-600 border-stone-300 focus:ring-blue-600 focus:ring-offset-2 cursor-pointer"
      />
      <div className="flex flex-col">
        <span className="text-base font-bold text-stone-900 leading-snug">
          {title}
        </span>
        {description && (
          <span className="mt-1 text-sm text-stone-600 leading-relaxed">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}

export default CheckboxCard;

