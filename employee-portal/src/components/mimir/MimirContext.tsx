import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { apiPost } from '@/utils/api';

export interface MimirMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MimirSource[];
  timestamp: Date;
}

export interface MimirSource {
  document: string;
  section: string;
}

interface MimirContextValue {
  isOpen: boolean;
  messages: MimirMessage[];
  isTyping: boolean;
  openMimir: () => void;
  closeMimir: () => void;
  toggleMimir: () => void;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

const MimirContext = createContext<MimirContextValue | null>(null);

// --- Backend API response type ---
interface ChatApiResponse {
  message: string;
  sources: MimirSource[];
  conversation_id: number;
}

// --- Placeholder responses (fallback when backend is unavailable) ---
const PLACEHOLDER_RESPONSES: Array<{
  keywords: string[];
  content: string;
  sources: MimirSource[];
}> = [
  {
    keywords: ['pto', 'time off', 'vacation', 'days off', 'leave', 'accrual'],
    content:
      'Full-time employees accrue **15 days** (120 hours) of PTO per year, accrued at **5 hours per bi-weekly pay period**. Your accrual rate increases to 20 days after 5 years of service and 25 days after 10 years.\n\nYou can check your current balance anytime in the portal under My HR \u2192 Time Off.',
    sources: [{ document: 'Employee Handbook', section: 'Section 4.2 \u2014 Paid Time Off' }],
  },
  {
    keywords: ['rollover', 'carry over', 'unused'],
    content:
      'Yes \u2014 you can carry over up to **40 hours** (5 days) of unused PTO into the next calendar year. Any hours beyond 40 will be forfeited on December 31st. There\u2019s no payout for forfeited hours, so I\u2019d recommend planning to use your time!',
    sources: [{ document: 'Employee Handbook', section: 'Section 4.2.3 \u2014 PTO Rollover Policy' }],
  },
  {
    keywords: ['benefit', 'medical', 'dental', 'vision', 'health', 'insurance', 'coverage', 'plan'],
    content:
      'NBS offers comprehensive benefits including **medical, dental, and vision** coverage. Open enrollment runs annually in November. You can view your current enrollment details under My HR \u2192 Benefits.\n\nWould you like to know about a specific plan or coverage details?',
    sources: [{ document: 'Benefits Guide', section: 'Overview \u2014 2026 Benefits Summary' }],
  },
  {
    keywords: ['401k', 'retirement', 'match', 'contribution'],
    content:
      'NBS offers a **401(k) plan** with employer matching up to **4%** of your salary. You\u2019re eligible to enroll after 90 days of employment. Vesting for the employer match follows a 3-year graded schedule.\n\nYou can adjust your contribution at any time through the benefits portal.',
    sources: [{ document: 'Benefits Guide', section: 'Section 6 \u2014 Retirement Plans' }],
  },
  {
    keywords: ['fmla', 'family leave', 'medical leave'],
    content:
      'Eligible employees can take up to **12 weeks** of unpaid, job-protected leave under FMLA per 12-month period. To be eligible, you must have worked at NBS for at least **12 months** and at least **1,250 hours** in the past year.\n\nTo initiate FMLA, submit a request through Requests \u2192 New Request, and HR will guide you through the certification process.',
    sources: [{ document: 'Employee Handbook', section: 'Section 4.5 \u2014 Family and Medical Leave' }],
  },
  {
    keywords: ['pay', 'payroll', 'paycheck', 'direct deposit', 'salary', 'pay date'],
    content:
      'NBS processes payroll on a **bi-weekly** schedule (every other Friday). Direct deposit typically arrives by **8:00 AM** on payday. You can view your pay stubs and update your direct deposit information under My HR \u2192 Compensation.\n\nYour next pay date is shown on the dashboard.',
    sources: [{ document: 'Employee Handbook', section: 'Section 3.1 \u2014 Payroll Schedule' }],
  },
  {
    keywords: ['handbook', 'policy', 'policies', 'dress code', 'remote', 'work from home'],
    content:
      'You can access the full Employee Handbook under Resources \u2192 Handbook. It covers all company policies including dress code, remote work guidelines, and workplace conduct.\n\nIs there a specific policy you\u2019d like to know about?',
    sources: [{ document: 'Employee Handbook', section: 'Table of Contents' }],
  },
  {
    keywords: ['form', 'document', 'w-2', 'tax'],
    content:
      'You can find commonly used forms and documents under My HR \u2192 Documents. W-2 forms are typically available by **January 31st** each year. If you need a specific form that\u2019s not listed there, reach out to HR at hr@nbs.com.',
    sources: [{ document: 'Employee Handbook', section: 'Section 3.4 \u2014 Tax Documents' }],
  },
];

const DEFAULT_RESPONSE = {
  content:
    "I don't have that specific information in my knowledge base yet. I'd recommend reaching out to HR directly at **hr@nbs.com** or submitting a question through the portal's Requests \u2192 New Request form.\n\nI can help with topics like PTO, benefits, payroll, FMLA, company policies, and forms. What would you like to know?",
  sources: [] as MimirSource[],
};

function findPlaceholderResponse(text: string): { content: string; sources: MimirSource[] } {
  const lower = text.toLowerCase();
  for (const entry of PLACEHOLDER_RESPONSES) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { content: entry.content, sources: entry.sources };
    }
  }
  return DEFAULT_RESPONSE;
}

let messageIdCounter = 0;
function generateId() {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

const WELCOME_MESSAGE: MimirMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm **Mímir**, your HR Knowledge Assistant. I can help you with questions about benefits, time off, payroll, FMLA, company policies, and more.\n\nWhat can I help you with today?",
  timestamp: new Date(),
};

export function MimirProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MimirMessage[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const conversationIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const openMimir = useCallback(() => setIsOpen(true), []);
  const closeMimir = useCallback(() => setIsOpen(false), []);
  const toggleMimir = useCallback(() => setIsOpen((prev) => !prev), []);

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    conversationIdRef.current = null;
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();

    // Add user message
    const userMsg: MimirMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Try backend API, fall back to placeholder
    const controller = new AbortController();
    abortRef.current = controller;

    apiPost<ChatApiResponse>('/mimir/chat', {
      message: trimmed,
      conversation_id: conversationIdRef.current,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        conversationIdRef.current = data.conversation_id;
        const assistantMsg: MimirMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          sources: data.sources.length > 0 ? data.sources : undefined,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        // Fallback to placeholder responses
        console.warn('Mímir backend unavailable, using placeholder:', err.message);
        const response = findPlaceholderResponse(trimmed);
        const assistantMsg: MimirMessage = {
          id: generateId(),
          role: 'assistant',
          content: response.content,
          sources: response.sources.length > 0 ? response.sources : undefined,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
      });
  }, []);

  return (
    <MimirContext.Provider
      value={{ isOpen, messages, isTyping, openMimir, closeMimir, toggleMimir, sendMessage, clearMessages }}
    >
      {children}
    </MimirContext.Provider>
  );
}

export function useMimir(): MimirContextValue {
  const ctx = useContext(MimirContext);
  if (!ctx) throw new Error('useMimir must be used within a MimirProvider');
  return ctx;
}
