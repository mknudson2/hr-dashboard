import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import ModernTopNav from './layout/ModernTopNav';
import MobileNav from './layout/MobileNav';

/**
 * ModernLayout - Ultra-modern layout with glassmorphism and top navigation
 *
 * Design characteristics:
 * - No sidebar - clean top navigation with dropdown menus
 * - Glassmorphism - frosted glass effect on nav
 * - Maximum whitespace - generous padding, breathing room
 * - Subtle gradients - blue-to-indigo for accents
 * - Soft shadows - for depth without harshness
 */
export default function ModernLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Top navigation with glassmorphism */}
      <ModernTopNav
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        )}
      </AnimatePresence>

      {/* Main content - centered with max width */}
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
