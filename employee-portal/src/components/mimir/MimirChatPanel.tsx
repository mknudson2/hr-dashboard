import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import MimirLogo from '../bifrost/MimirLogo';
import { useMimir, type MimirMessage } from './MimirContext';

function MessageBubble({ message }: { message: MimirMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-2 mt-1">
          <div className="w-6 h-6 rounded-full bg-mimir-blue/10 flex items-center justify-center">
            <MimirLogo size={14} />
          </div>
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-bifrost-violet text-white rounded-2xl rounded-br-md'
              : 'bg-frost dark:bg-gray-700 text-deep-night dark:text-gray-200 rounded-2xl rounded-bl-md'
          }`}
        >
          <MessageContent content={message.content} />
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 px-1">
            {message.sources.map((source, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px] text-mimir-blue/70 italic">
                <FileText size={10} className="flex-shrink-0" />
                <span>
                  {source.document}, {source.section}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering: **bold** and line breaks
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Handle newlines
        const lines = part.split('\n');
        return lines.map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="flex-shrink-0 mr-2 mt-1">
        <div className="w-6 h-6 rounded-full bg-mimir-blue/10 flex items-center justify-center">
          <MimirLogo size={14} />
        </div>
      </div>
      <div className="bg-frost dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-mimir-blue/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-mimir-blue/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-mimir-blue/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function MimirChatPanel() {
  const { messages, isTyping, closeMimir, sendMessage, clearMessages } = useMimir();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute bottom-[68px] right-0 w-[340px] h-[450px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-mimir-blue/20 dark:shadow-none border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-mimir-blue px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="text-white">
            <MimirLogo size={22} />
          </div>
          <div>
            <h3 className="text-white font-display font-semibold text-sm tracking-wide">
              Mímir
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-white/60 text-[10px]">HR Knowledge Assistant</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="p-1.5 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-lg transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={closeMimir}
            className="p-1.5 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Mímir a question..."
            className="flex-1 bg-realm-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-4 py-2 text-sm text-deep-night dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-mimir-blue/30 focus:border-mimir-blue/40 transition-colors"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-mimir-blue text-white flex items-center justify-center hover:bg-mimir-blue-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Mímir uses company documents to answer your questions
        </p>
      </div>
    </motion.div>
  );
}
