import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface AuroraHeroProps {
  actionItemCount?: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

export default function AuroraHero({ actionItemCount = 0 }: AuroraHeroProps) {
  const { user } = useAuth();
  const greeting = getGreeting();
  const firstName = user?.full_name ? getFirstName(user.full_name) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bifrost-aurora bifrost-aurora-overlay relative rounded-[20px] px-10 py-9 text-white overflow-hidden mb-7"
    >
      {/* Decorative circle */}
      <div
        className="absolute -top-10 -right-10 w-[280px] h-[280px] rounded-full border-2 border-white/[0.04] pointer-events-none"
        aria-hidden="true"
      />

      {/* Bridge silhouette decoration */}
      <svg
        className="absolute right-10 bottom-5 opacity-[0.06] pointer-events-none"
        width="200"
        height="100"
        viewBox="0 0 200 100"
        aria-hidden="true"
      >
        <path d="M 10 80 Q 100 0 190 80" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M 25 80 Q 100 12 175 80" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 40 80 Q 100 24 160 80" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* Content */}
      <div className="relative z-10">
        <p className="text-[13px] text-white/60 mb-1.5">
          {greeting}
        </p>
        <h1 className="font-display text-[30px] font-medium tracking-tight mb-1">
          {greeting}, <strong className="font-bold">{firstName}</strong>
        </h1>
        <p className="text-[15px] text-white/65 font-light">
          {actionItemCount > 0
            ? `You have ${actionItemCount} item${actionItemCount !== 1 ? 's' : ''} that need${actionItemCount === 1 ? 's' : ''} your attention`
            : "You're all caught up — no action items right now"
          }
        </p>
      </div>

      {/* Bottom accent gradient strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[20px] opacity-60"
        style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }}
        aria-hidden="true"
      />
    </motion.div>
  );
}
