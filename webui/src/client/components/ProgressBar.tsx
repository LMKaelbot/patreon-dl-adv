import React from 'react';

interface Props {
  value: number; // 0-100
  className?: string;
  color?: 'brand' | 'green' | 'red' | 'yellow';
}

const colorMap = {
  brand: 'bg-brand-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
};

export default function ProgressBar({ value, className = '', color = 'brand' }: Props) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorMap[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
