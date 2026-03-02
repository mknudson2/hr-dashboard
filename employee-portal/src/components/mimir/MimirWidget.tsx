import { AnimatePresence, motion } from 'framer-motion';
import MimirLogo from '../bifrost/MimirLogo';
import MimirChatPanel from './MimirChatPanel';
import { useMimir } from './MimirContext';

export default function MimirWidget() {
  const { isOpen, toggleMimir, messages } = useMimir();

  // Count unread assistant messages (when panel is closed)
  // We skip the welcome message (id='welcome') for unread count
  const unreadCount = isOpen
    ? 0
    : messages.filter((m) => m.role === 'assistant' && m.id !== 'welcome').length;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && <MimirChatPanel />}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={toggleMimir}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-[50px] h-[50px] rounded-full bg-mimir-blue text-white flex items-center justify-center shadow-lg hover:bg-mimir-blue-light transition-colors"
        style={{
          boxShadow: '0 4px 18px rgba(27, 58, 92, 0.35)',
        }}
        aria-label={isOpen ? 'Close Mímir assistant' : 'Open Mímir assistant'}
      >
        <MimirLogo size={24} />

        {/* Pulse animation ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full border-2 border-aurora-teal/40 animate-ping pointer-events-none" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-aurora-teal text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
