import { useState } from 'react';
import { FileEdit, BookOpen, Heart, HelpCircle, FileText, FolderOpen } from 'lucide-react';
import HandbookTab from '@/components/cms/HandbookTab';
import BenefitsTab from '@/components/cms/BenefitsTab';
import FAQsTab from '@/components/cms/FAQsTab';
import FormsTab from '@/components/cms/FormsTab';
import DocumentsTab from '@/components/cms/DocumentsTab';

const tabs = [
  { key: 'handbook', label: 'Handbook', icon: BookOpen },
  { key: 'benefits', label: 'Benefits Guide', icon: Heart },
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
  { key: 'forms', label: 'Forms', icon: FileText },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('handbook');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <FileEdit className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage Employee Portal resources — handbook, benefits, FAQs, forms, and employee documents</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'handbook' && <HandbookTab />}
        {activeTab === 'benefits' && <BenefitsTab />}
        {activeTab === 'faqs' && <FAQsTab />}
        {activeTab === 'forms' && <FormsTab />}
        {activeTab === 'documents' && <DocumentsTab />}
      </div>
    </div>
  );
}
