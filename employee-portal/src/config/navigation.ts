import {
  Home,
  User,
  DollarSign,
  Heart,
  Calendar,
  FileText,
  Briefcase,
  Banknote,
  Clock,
  PlusCircle,
  BookOpen,
  Shield,
  HelpCircle,
  Download,
  Users,
  CheckSquare,
  TrendingUp,
  Target,
  AlertTriangle,
  FileEdit,
  BarChart,
  History,
  Send,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureFlags } from '@/contexts/EmployeeFeaturesContext';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Feature flag key or function to determine if this item should be shown */
  requiresFeature?: keyof FeatureFlags | ((flags: FeatureFlags) => boolean);
}

export interface NavSection {
  label: string;
  items: NavItem[];
  requiresEmployee?: boolean;
  requiresSupervisor?: boolean;
  /** Filter function for the entire section based on feature flags */
  sectionFilter?: (flags: FeatureFlags) => boolean;
}

export interface NavigationConfig {
  main: NavItem[];
  sections: NavSection[];
}

/**
 * Navigation configuration for the Employee HR Portal
 *
 * This configuration defines all navigation items and their visibility rules.
 * - requiresEmployee: Only shown to users with an employee record
 * - requiresSupervisor: Only shown to users with supervisor role (manager/admin)
 * - requiresFeature: Only shown when specific feature flag is true
 * - sectionFilter: Custom function to filter entire section based on flags
 */
export const navigationConfig: NavigationConfig = {
  main: [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
  ],

  sections: [
    {
      label: 'My HR',
      requiresEmployee: true,
      items: [
        { label: 'Profile', path: '/my-hr/profile', icon: User },
        { label: 'Compensation', path: '/my-hr/compensation', icon: DollarSign },
        { label: 'Benefits', path: '/my-hr/benefits', icon: Heart },
        { label: 'Time Off Balances', path: '/my-hr/time-off', icon: Calendar },
        { label: 'Documents', path: '/my-hr/documents', icon: FileText },
        { label: 'My Performance', path: '/my-hr/performance', icon: TrendingUp },
      ],
    },
    {
      label: 'FMLA',
      requiresEmployee: true,
      // Show FMLA section if employee has cases OR is eligible
      sectionFilter: (flags) => flags.has_any_fmla_cases || flags.is_fmla_eligible,
      items: [
        {
          label: 'My FMLA Cases',
          path: '/requests/fmla',
          icon: Briefcase,
          // Only show if employee has any FMLA cases
          requiresFeature: 'has_any_fmla_cases',
        },
        {
          label: 'Log FMLA Time',
          path: '/requests/fmla/submit-time',
          icon: Clock,
          // Only show if employee has active FMLA cases
          requiresFeature: 'has_active_fmla_cases',
        },
        {
          label: 'Request FMLA Leave',
          path: '/requests/fmla/new',
          icon: Send,
          // Show if employee is eligible for FMLA
          requiresFeature: 'is_fmla_eligible',
        },
        {
          label: 'FMLA Time History',
          path: '/requests/fmla/submissions',
          icon: History,
          // Only show if employee has any FMLA cases
          requiresFeature: 'has_any_fmla_cases',
        },
      ],
    },
    {
      label: 'Garnishments',
      requiresEmployee: true,
      // Only show section if employee has garnishments
      sectionFilter: (flags) => flags.has_any_garnishments,
      items: [
        {
          label: 'My Garnishments',
          path: '/requests/garnishments',
          icon: Banknote,
        },
      ],
    },
    {
      label: 'Requests',
      requiresEmployee: true,
      items: [
        { label: 'Request Time Off', path: '/requests/pto', icon: Clock },
        { label: 'New Request', path: '/requests/new', icon: PlusCircle },
      ],
    },
    {
      label: 'Resources',
      items: [
        { label: 'Employee Handbook', path: '/resources/handbook', icon: BookOpen },
        { label: 'Benefits Guide', path: '/resources/benefits', icon: Shield },
        { label: 'FAQs', path: '/resources/faqs', icon: HelpCircle },
        { label: 'Forms', path: '/resources/forms', icon: Download },
      ],
    },
    {
      label: 'Team',
      requiresSupervisor: true,
      items: [
        { label: 'Team Dashboard', path: '/team', icon: Users },
        { label: 'Direct Reports', path: '/team/reports', icon: Users },
        { label: 'Pending Approvals', path: '/team/approvals', icon: CheckSquare },
        { label: 'Team Performance', path: '/team/performance', icon: TrendingUp },
        { label: 'Goals', path: '/team/goals', icon: Target },
        { label: 'PIPs', path: '/team/pips', icon: AlertTriangle },
        { label: 'HR Change Requests', path: '/team/hr-changes', icon: FileEdit },
        { label: 'Team Reports', path: '/team/analytics', icon: BarChart },
        {
          label: 'Hiring',
          path: '/hiring/my-requisitions',
          icon: UserPlus,
          requiresFeature: 'is_hiring_manager',
        },
      ],
    },
  ],
};

/**
 * Filter a single navigation item based on feature flags
 */
function shouldShowItem(item: NavItem, features: FeatureFlags | null): boolean {
  if (!item.requiresFeature) return true;
  if (!features) return false;

  if (typeof item.requiresFeature === 'function') {
    return item.requiresFeature(features);
  }

  return !!features[item.requiresFeature];
}

/**
 * Filter a section based on its sectionFilter and item requirements
 */
function filterSection(
  section: NavSection,
  features: FeatureFlags | null
): NavSection | null {
  // Check section-level filter first
  if (section.sectionFilter && features) {
    if (!section.sectionFilter(features)) {
      return null;
    }
  }

  // Filter items within the section
  const filteredItems = section.items.filter((item) => shouldShowItem(item, features));

  // If no items remain, hide the section
  if (filteredItems.length === 0) {
    return null;
  }

  return {
    ...section,
    items: filteredItems,
  };
}

/**
 * Filter navigation based on user permissions and feature flags
 */
export function getFilteredNavigation(
  isEmployee: boolean,
  isSupervisor: boolean,
  features: FeatureFlags | null = null
): NavigationConfig {
  const filteredSections = navigationConfig.sections
    .filter((section) => {
      // Role-based filtering
      if (section.requiresEmployee && !isEmployee) return false;
      if (section.requiresSupervisor && !isSupervisor) return false;
      return true;
    })
    .map((section) => filterSection(section, features))
    .filter((section): section is NavSection => section !== null);

  return {
    main: navigationConfig.main,
    sections: filteredSections,
  };
}

/**
 * Get navigation for Modern layout (grouped into dropdown menus)
 */
export interface NavDropdown {
  label: string;
  items: NavItem[];
}

export function getModernNavigation(
  isEmployee: boolean,
  isSupervisor: boolean,
  features: FeatureFlags | null = null
): NavDropdown[] {
  const filtered = getFilteredNavigation(isEmployee, isSupervisor, features);

  // Group sections into dropdowns for modern layout
  const dropdowns: NavDropdown[] = [];

  // My HR dropdown
  const myHr = filtered.sections.find((s) => s.label === 'My HR');
  if (myHr) {
    dropdowns.push({ label: 'My HR', items: myHr.items });
  }

  // Requests dropdown - combine FMLA, Garnishments, and Requests
  const fmla = filtered.sections.find((s) => s.label === 'FMLA');
  const garnishments = filtered.sections.find((s) => s.label === 'Garnishments');
  const requests = filtered.sections.find((s) => s.label === 'Requests');
  const requestItems = [
    ...(fmla?.items || []),
    ...(garnishments?.items || []),
    ...(requests?.items || []),
  ];
  if (requestItems.length > 0) {
    dropdowns.push({ label: 'Requests', items: requestItems });
  }

  // Resources dropdown
  const resources = filtered.sections.find((s) => s.label === 'Resources');
  if (resources) {
    dropdowns.push({ label: 'Resources', items: resources.items });
  }

  // Team dropdown (supervisor only)
  const team = filtered.sections.find((s) => s.label === 'Team');
  if (team) {
    dropdowns.push({ label: 'Team', items: team.items });
  }

  return dropdowns;
}
