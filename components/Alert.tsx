"use client";

import React from 'react';

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

const typeClasses = {
  error: 'bg-red-900 border-red-700 text-red-100',
  success: 'bg-green-900 border-green-700 text-green-100',
  warning: 'bg-yellow-900 border-yellow-700 text-yellow-100',
  info: 'bg-blue-900 border-blue-700 text-blue-100',
};

const typeEmojis = {
  error: '❌',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
};

export function Alert({ type, message, onClose }: AlertProps) {
  return (
    <div className={`border p-4 rounded-lg flex items-start gap-3 ${typeClasses[type]}`}>
      <span className="text-lg flex-shrink-0">{typeEmojis[type]}</span>
      <p className="flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-lg flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}
