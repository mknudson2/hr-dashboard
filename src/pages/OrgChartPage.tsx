import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Building2,
  Search,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface OrgNode {
  employee_id: string;
  name: string;
  position: string | null;
  title: string;
  department: string | null;
  team: string | null;
  title_level: string | null;
  children: OrgNode[];
}

interface OrgChartData {
  tree: OrgNode[];
  total_employees: number;
}

// =============================================================================
// COLORS BY TITLE LEVEL
// =============================================================================

const LEVEL_STYLES: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
  president: {
    bg: 'bg-[#2ABFBF]/10 dark:bg-[#2ABFBF]/15',
    border: 'border-[#2ABFBF]/40',
    badge: 'bg-[#2ABFBF]/20',
    badgeText: 'text-[#2ABFBF]',
  },
  svp: {
    bg: 'bg-[#E8B84B]/10 dark:bg-[#E8B84B]/15',
    border: 'border-[#E8B84B]/40',
    badge: 'bg-[#E8B84B]/20',
    badgeText: 'text-[#E8B84B]',
  },
  vp: {
    bg: 'bg-[#6C3FA0]/10 dark:bg-[#6C3FA0]/15',
    border: 'border-[#6C3FA0]/40',
    badge: 'bg-[#6C3FA0]/20',
    badgeText: 'text-[#6C3FA0]',
  },
  director: {
    bg: 'bg-blue-50 dark:bg-blue-900/15',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
  },
  default: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    badge: 'bg-gray-100 dark:bg-gray-700',
    badgeText: 'text-gray-600 dark:text-gray-400',
  },
};

function getStyle(level: string | null) {
  return LEVEL_STYLES[level || ''] || LEVEL_STYLES.default;
}

function getLevelLabel(level: string | null): string | null {
  const labels: Record<string, string> = {
    president: 'President',
    ceo: 'CEO',
    svp: 'SVP',
    vp: 'VP',
    director: 'Director',
    senior_director: 'Sr. Director',
  };
  return level ? labels[level] || null : null;
}

// =============================================================================
// ORG NODE COMPONENT
// =============================================================================

function OrgNodeCard({
  node,
  depth,
  searchQuery,
  expandAll,
}: {
  node: OrgNode;
  depth: number;
  searchQuery: string;
  expandAll: boolean;
}) {
  const [manualToggle, setManualToggle] = useState<boolean | null>(null);
  // Reset manual toggle when expandAll changes
  useEffect(() => {
    setManualToggle(null);
  }, [expandAll]);

  // Determine expanded state: manual toggle overrides, else expandAll or default (depth < 2)
  const expanded = manualToggle !== null ? manualToggle : (expandAll || depth < 2);
  const hasChildren = node.children.length > 0;
  const style = getStyle(node.title_level);
  const levelLabel = getLevelLabel(node.title_level);

  // Check if this node or any descendant matches search
  const matchesSearch = (n: OrgNode): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (n.name.toLowerCase().includes(q)) return true;
    if (n.position?.toLowerCase().includes(q)) return true;
    if (n.department?.toLowerCase().includes(q)) return true;
    return n.children.some(matchesSearch);
  };

  const isMatch = matchesSearch(node);
  if (!isMatch && searchQuery) return null;

  const directMatch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false
    : false;

  // Auto-expand if search matches a descendant
  const effectiveExpanded = searchQuery ? isMatch : expanded;

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}>
      <div
        className={`${style.bg} border ${style.border} rounded-lg p-3 mb-2 transition-all ${
          directMatch ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <button
              onClick={() => setManualToggle(expanded ? false : true)}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              {effectiveExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <User className="w-4 h-4 text-gray-400 ml-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {node.name}
              </span>
              {levelLabel && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.badge} ${style.badgeText}`}>
                  {levelLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{node.title}</span>
              {node.department && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">&middot;</span>
                  <span>{node.department}</span>
                </>
              )}
              {node.team && node.team !== node.department && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">&middot;</span>
                  <span>{node.team}</span>
                </>
              )}
            </div>
          </div>
          {hasChildren && (
            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {node.children.length}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {effectiveExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map((child) => (
              <OrgNodeCard
                key={child.employee_id}
                node={child}
                depth={depth + 1}
                searchQuery={searchQuery}
                expandAll={expandAll}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function OrgChartPage() {
  const [data, setData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(false);

  const loadOrgChart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/employees/org-chart/tree', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load org chart');
      const result = await res.json();
      setData(result);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgChart();
  }, [loadOrgChart]);

  // Count total nodes in tree
  const countNodes = (nodes: OrgNode[]): number => {
    return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error || 'Failed to load org chart'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Network className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization Chart</h1>
            <p className="text-sm text-gray-500">{data.total_employees} employees</p>
          </div>
        </div>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {expandAll ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          {expandAll ? 'Collapse' : 'Expand All'}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, position, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {[
          { label: 'President', level: 'president' },
          { label: 'SVP', level: 'svp' },
          { label: 'VP', level: 'vp' },
          { label: 'Director', level: 'director' },
        ].map(({ label, level }) => {
          const s = getStyle(level);
          return (
            <div key={level} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${s.bg} border ${s.border}`} />
              <span className="text-gray-600 dark:text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Tree */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        {data.tree.map((root) => (
          <OrgNodeCard
            key={root.employee_id}
            node={root}
            depth={0}
            searchQuery={searchQuery}
            expandAll={expandAll}
          />
        ))}
      </div>
    </div>
  );
}
