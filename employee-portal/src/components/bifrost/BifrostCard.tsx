import { ReactNode } from 'react';

interface BifrostCardProps {
  accent?: 'violet' | 'teal' | 'gold' | 'none';
  children: ReactNode;
  className?: string;
}

const accentColors = {
  violet: 'border-l-bifrost-violet',
  teal: 'border-l-aurora-teal',
  gold: 'border-l-bridge-gold',
  none: '',
};

export default function BifrostCard({ accent = 'none', children, className = '' }: BifrostCardProps) {
  const borderClass = accent !== 'none' ? `border-l-4 ${accentColors[accent]}` : '';

  return (
    <div
      className={`bg-white rounded-2xl border border-[rgba(108,63,160,0.06)] p-5 transition-all duration-250 hover:shadow-[0_4px_20px_rgba(108,63,160,0.1),0_8px_30px_rgba(26,26,46,0.06)] shadow-[0_1px_3px_rgba(26,26,46,0.04),0_4px_14px_rgba(26,26,46,0.03)] ${borderClass} ${className}`}
    >
      {children}
    </div>
  );
}
