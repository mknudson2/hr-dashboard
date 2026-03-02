import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface AuroraPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  rightContent?: React.ReactNode;
}

export default function AuroraPageHeader({ title, subtitle, icon: Icon, rightContent }: AuroraPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bifrost-aurora bifrost-aurora-overlay relative rounded-[16px] px-7 py-5 text-white overflow-hidden"
    >
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={22} className="text-white/80" />}
          <div>
            <h1 className="font-display text-[22px] font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-[13px] text-white/60 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
      </div>

      {/* Tri-color bottom strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[16px] opacity-60"
        style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }}
        aria-hidden="true"
      />
    </motion.div>
  );
}
