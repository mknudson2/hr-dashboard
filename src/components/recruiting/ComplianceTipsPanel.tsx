import { useState, useEffect } from 'react';
import { Shield, ChevronDown, ChevronUp, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ComplianceTip {
  id: number;
  category: string;
  title: string;
  content: string;
  severity: string;
  order_index: number;
}

interface ComplianceTipsPanelProps {
  collapsed?: boolean;
}

const severityConfig: Record<string, { icon: typeof Info; color: string; bgColor: string }> = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  },
};

const categoryLabels: Record<string, string> = {
  legal: 'Legal',
  behavioral: 'Behavioral',
  bias: 'Bias Awareness',
  documentation: 'Documentation',
  general: 'General',
};

export default function ComplianceTipsPanel({ collapsed: initialCollapsed = true }: ComplianceTipsPanelProps) {
  const [tips, setTips] = useState<Record<string, ComplianceTip[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const res = await fetch('/recruiting/compliance-tips', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTips(data.tips);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const categories = Object.keys(tips);
  if (categories.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Interview Compliance Tips
        </span>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-2">
          {categories.map(category => (
            <div key={category}>
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <span>{categoryLabels[category] || category} ({tips[category].length})</span>
                {expandedCategory === category ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {expandedCategory === category && (
                <div className="space-y-2 ml-2 mb-2">
                  {tips[category].map(tip => {
                    const config = severityConfig[tip.severity] || severityConfig.info;
                    const Icon = config.icon;
                    return (
                      <div key={tip.id} className={`border rounded-lg p-3 ${config.bgColor}`}>
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                          <div>
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{tip.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{tip.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
