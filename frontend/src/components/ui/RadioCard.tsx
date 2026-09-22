'use client';

import React from 'react';

export interface RadioCardProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}

export function RadioCard({
  id,
  name,
  value,
  checked,
  onChange,
  title,
  description,
  disabled = false,
}: RadioCardProps) {
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
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 h-5 w-5 shrink-0 text-blue-600 border-stone-300 focus:ring-blue-600 focus:ring-offset-2 cursor-pointer"
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

export default RadioCard;

