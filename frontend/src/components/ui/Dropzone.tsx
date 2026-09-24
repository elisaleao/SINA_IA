'use client';

import React, { useRef, useState } from 'react';

export interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  acceptedFormatsText?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  id?: string;
}

export function Dropzone({
  onFilesSelected,
  acceptedFormatsText = 'Formatos aceitos: PDF, DOCX, TXT, PNG, JPG e WEBP (máx. 20 MB por arquivo)',
  accept = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.webp',
  multiple = true,
  disabled = false,
  id = 'accessible-dropzone',
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleButtonClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all text-center ${
        disabled
          ? 'cursor-not-allowed opacity-60 bg-stone-100 border-stone-300'
          : isDragOver
            ? 'border-blue-600 bg-blue-50/70 ring-4 ring-blue-100'
            : 'border-stone-300 bg-white hover:border-blue-500 hover:bg-stone-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        id={id}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        aria-describedby={`${id}-formats`}
        className="sr-only"
        tabIndex={-1}
      />

      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-2xl mb-3 shadow-inner"
      >
        📄
      </div>

      <p className="text-base font-bold text-stone-900 mb-1">
        Arraste e solte seus arquivos aqui
      </p>

      <p className="text-sm text-stone-600 mb-4">
        ou use o botão abaixo para escolher do seu dispositivo
      </p>

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        aria-describedby={`${id}-formats`}
        className="min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors cursor-pointer disabled:opacity-50"
      >
        Escolher arquivos
      </button>

      <span
        id={`${id}-formats`}
        className="mt-4 text-xs text-stone-500"
      >
        {acceptedFormatsText}
      </span>
    </div>
  );
}

export default Dropzone;

