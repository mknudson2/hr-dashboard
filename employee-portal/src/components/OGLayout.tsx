import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './layout/Sidebar';
import TopBar from './layout/TopBar';
import MobileNav from './layout/MobileNav';

/**
 * OGLayout - Original "Classic" layout with sidebar navigation
 * This is the traditional HR portal layout with a fixed left sidebar.
 */
export default function OGLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <TopBar
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-gray-300 dark:border-gray-700">
          <Sidebar />
        </aside>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
