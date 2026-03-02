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
      className="relative overflow-hidden rounded-xl border border-aurora-teal/20 bg-gradient-to-r from-mimir-blue/5 via-aurora-teal/8 to-bifrost-violet/5 p-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5 rounded-lg bg-aurora-teal/10 p-2.5">
          <MimirLogo size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-semibold text-deep-night tracking-wide">
            {title}
          </h4>
          <p className="mt-1 text-sm text-deep-night/60 leading-relaxed">
            {description}
          </p>
          <button
            type="button"
            onClick={openMimir}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-aurora-teal/10 px-4 py-1.5 text-sm font-medium text-aurora-teal-dark hover:bg-aurora-teal/20 transition-colors"
          >
            <Sparkles size={14} />
            {buttonText}
          </button>
        </div>
      </div>
      {/* Decorative gradient accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-aurora-teal/6 to-transparent rounded-bl-full pointer-events-none" />
    </motion.div>
  );
}
