import type { LucideIcon } from 'lucide-react';

interface AuroraSectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  rightContent?: React.ReactNode;
}

export default function AuroraSectionHeader({ title, icon: Icon, rightContent }: AuroraSectionHeaderProps) {
  return (
    <div className="bifrost-aurora relative rounded-[10px] px-4 py-2.5 text-white overflow-hidden">
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-white/80" />}
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        </div>
        {rightContent && <div>{rightContent}</div>}
      </div>

      {/* Tri-color bottom strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-[10px] opacity-60"
        style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }}
        aria-hidden="true"
      />
    </div>
  );
}
