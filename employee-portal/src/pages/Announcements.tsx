import { useState, useMemo } from 'react';
import { Megaphone, Calendar, User, Tag, ChevronRight, Pin, Star, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AnnouncementCategory = 'all' | 'company' | 'hr' | 'benefits' | 'events' | 'policy';
type AnnouncementPriority = 'normal' | 'important' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  authorRole: string;
  publishedAt: Date;
  category: Exclude<AnnouncementCategory, 'all'>;
  priority: AnnouncementPriority;
  pinned: boolean;
  tags: string[];
}

// Mock announcements data
const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Company Holiday Schedule for 2025',
    excerpt: 'Please review the updated holiday schedule for the upcoming year.',
    content: `We are pleased to share the official company holiday schedule for 2025. All offices will be closed on the following dates:

- New Year's Day: January 1
- Martin Luther King Jr. Day: January 20
- Presidents' Day: February 17
- Memorial Day: May 26
- Independence Day: July 4
- Labor Day: September 1
- Thanksgiving: November 27-28
- Winter Holiday: December 24-26
- New Year's Eve: December 31

Please plan your time off accordingly and ensure adequate coverage for your teams during these periods.`,
    author: 'Lisa Thompson',
    authorRole: 'HR Director',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    category: 'hr',
    priority: 'important',
    pinned: true,
    tags: ['holidays', 'time-off', '2025'],
  },
  {
    id: '2',
    title: 'Open Enrollment Period Begins January 15th',
    excerpt: 'Annual benefits enrollment window is approaching. Review your options now.',
    content: `Our annual open enrollment period will begin on January 15th and run through February 15th, 2025.

During this time, you can:
- Make changes to your health insurance plan
- Update dental and vision coverage
- Adjust HSA/FSA contributions
- Review and update life insurance beneficiaries
- Enroll in new voluntary benefits

Information sessions will be held on January 10th and 12th. Watch for calendar invites.

If you have questions, please contact the Benefits team at benefits@company.com.`,
    author: 'Emily Johnson',
    authorRole: 'HR Business Partner',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    category: 'benefits',
    priority: 'urgent',
    pinned: true,
    tags: ['benefits', 'enrollment', 'healthcare'],
  },
  {
    id: '3',
    title: 'New Remote Work Policy Updates',
    excerpt: 'Important changes to our hybrid work arrangements effective February 1st.',
    content: `Effective February 1st, 2025, we are updating our remote work policy to better support our hybrid work model.

Key Changes:
1. Core collaboration hours are now 10 AM - 3 PM local time
2. In-office days reduced from 3 to 2 per week minimum
3. New equipment stipend of $500 for home office setup
4. Expanded list of approved remote work locations

Please review the full policy in the Employee Handbook. Managers should schedule team discussions to determine the best in-office schedule for their groups.`,
    author: 'James Wilson',
    authorRole: 'VP of Engineering',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    category: 'policy',
    priority: 'important',
    pinned: false,
    tags: ['remote-work', 'policy', 'hybrid'],
  },
  {
    id: '4',
    title: 'Q4 All-Hands Meeting Recording Available',
    excerpt: 'Missed the all-hands? Watch the recording and view the slides.',
    content: `The recording from our Q4 2024 All-Hands Meeting is now available.

Topics covered:
- Q4 Financial Results
- 2025 Company Goals and Strategy
- New Product Roadmap Preview
- Employee Recognition Awards
- Q&A Highlights

Watch the recording on the company intranet or access the presentation slides in the shared drive.`,
    author: 'CEO Office',
    authorRole: 'Executive Team',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    category: 'company',
    priority: 'normal',
    pinned: false,
    tags: ['all-hands', 'quarterly', 'strategy'],
  },
  {
    id: '5',
    title: 'Annual Wellness Challenge Kicks Off',
    excerpt: 'Join your colleagues in our company-wide health and wellness initiative.',
    content: `Get ready for the 2025 Wellness Challenge starting January 6th!

This year's challenge includes:
- Step counting competition (individual and team)
- Mindfulness minutes tracking
- Healthy eating goals
- Sleep quality improvement

Prizes include:
- Grand Prize: $500 wellness stipend
- Top Team: Catered healthy lunch
- Participation Award: Company wellness swag

Sign up through the HR portal by January 3rd to participate.`,
    author: 'Wellness Committee',
    authorRole: 'HR Department',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    category: 'events',
    priority: 'normal',
    pinned: false,
    tags: ['wellness', 'challenge', 'health'],
  },
  {
    id: '6',
    title: 'IT Security Training Required by January 31st',
    excerpt: 'Complete your annual cybersecurity awareness training.',
    content: `All employees are required to complete the annual IT Security Awareness training by January 31st, 2025.

The training covers:
- Phishing awareness and prevention
- Password security best practices
- Data handling and classification
- Incident reporting procedures
- Remote work security

The course takes approximately 45 minutes. Access it through the Learning portal.

Employees who do not complete the training by the deadline may have their system access restricted.`,
    author: 'IT Security Team',
    authorRole: 'Information Technology',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
    category: 'company',
    priority: 'important',
    pinned: false,
    tags: ['security', 'training', 'compliance'],
  },
];

const categoryLabels: Record<AnnouncementCategory, string> = {
  all: 'All Announcements',
  company: 'Company News',
  hr: 'HR Updates',
  benefits: 'Benefits',
  events: 'Events',
  policy: 'Policy Changes',
};

const categoryColors: Record<Exclude<AnnouncementCategory, 'all'>, string> = {
  company: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  hr: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  benefits: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  events: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  policy: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export default function Announcements() {
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredAnnouncements = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? mockAnnouncements
      : mockAnnouncements.filter(a => a.category === selectedCategory);

    // Sort: pinned first, then by date
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });
  }, [selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<AnnouncementCategory, number> = {
      all: mockAnnouncements.length,
      company: 0,
      hr: 0,
      benefits: 0,
      events: 0,
      policy: 0,
    };
    mockAnnouncements.forEach(a => {
      counts[a.category]++;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Megaphone className="text-blue-600 dark:text-blue-400" />
          Company Announcements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Stay informed about company news, policies, and events
        </p>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4 lg:mb-0">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              <Filter size={16} />
              {categoryLabels[selectedCategory]}
            </button>
          </div>
          <div className="hidden lg:flex flex-wrap gap-2">
            {(Object.keys(categoryLabels) as AnnouncementCategory[]).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {categoryLabels[category]}
                <span className="ml-2 text-xs opacity-75">({categoryCounts[category]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {(Object.keys(categoryLabels) as AnnouncementCategory[]).map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowFilters(false);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {categoryLabels[category]} ({categoryCounts[category]})
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border border-gray-300 dark:border-gray-700 p-12 text-center">
            <Megaphone className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No announcements</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              There are no announcements in this category.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-md shadow-gray-200/60 dark:shadow-none border overflow-hidden transition-colors ${
                announcement.priority === 'urgent'
                  ? 'border-red-300 dark:border-red-800'
                  : announcement.priority === 'important'
                    ? 'border-yellow-300 dark:border-yellow-800'
                    : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              {/* Priority Banner */}
              {announcement.priority === 'urgent' && (
                <div className="bg-red-500 text-white text-xs font-semibold px-4 py-1">
                  URGENT
                </div>
              )}

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {announcement.pinned && (
                        <Pin className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={16} />
                      )}
                      {announcement.priority === 'important' && (
                        <Star className="text-yellow-500 flex-shrink-0" size={16} />
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[announcement.category]}`}>
                        {categoryLabels[announcement.category]}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                      {announcement.title}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {announcement.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(announcement.publishedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4">
                  {expandedId === announcement.id ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-line text-gray-600 dark:text-gray-400">
                        {announcement.content}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">
                      {announcement.excerpt}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <Tag size={14} className="text-gray-400" />
                  {announcement.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Expand/Collapse */}
                <button
                  onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
                  className="flex items-center gap-1 mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {expandedId === announcement.id ? 'Show less' : 'Read more'}
                  <ChevronRight size={16} className={`transition-transform ${expandedId === announcement.id ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Archive Link */}
      <div className="text-center">
        <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
          View Archived Announcements
        </button>
      </div>
    </div>
  );
}
