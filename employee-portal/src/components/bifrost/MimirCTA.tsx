import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import MimirLogo from './MimirLogo';
import { useMimir } from '../mimir/MimirContext';

interface MimirCTAProps {
  title: string;
  description: string;
  buttonText?: string;
}

export default function MimirCTA({ title, description, buttonText = 'Ask Mímir' }: MimirCTAProps) {
  const { openMimir } = useMimir();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bifrost-aurora bifrost-aurora-overlay relative overflow-hidden rounded-xl p-5 text-white"
    >
      <div className="relative z-10 flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5 rounded-lg bg-white/10 p-2.5">
          <MimirLogo size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-semibold tracking-wide">
            {title}
          </h4>
          <p className="mt-1 text-sm text-white/60 leading-relaxed">
            {description}
          </p>
          <button
            type="button"
            onClick={openMimir}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            <Sparkles size={14} />
            {buttonText}
          </button>
        </div>
      </div>

      {/* Tri-color bottom strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] opacity-60"
        style={{ background: 'linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B)' }}
        aria-hidden="true"
      />
    </motion.div>
  );
}
