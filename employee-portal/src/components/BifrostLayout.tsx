import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import ShimmerBar from './bifrost/ShimmerBar';
import BifrostTopNav from './layout/BifrostTopNav';
import MobileNav from './layout/MobileNav';
import { MimirProvider } from './mimir/MimirContext';
import MimirWidget from './mimir/MimirWidget';

/**
 * BifrostLayout — Nordic Modern Fusion layout.
 * Mirrors ModernLayout.tsx structure with Bifröst branding:
 * - Fixed ShimmerBar at top-0
 * - BifrostTopNav fixed at top-[3px] (below shimmer)
 * - Centered max-w-6xl content area
 * - realm-white background
 * - .bifrost-theme wrapper for CSS cascade overrides
 */
export default function BifrostLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <MimirProvider>
      <div className="min-h-screen bg-realm-white bifrost-theme">
        {/* Shimmer bar — fixed at very top */}
        <ShimmerBar />

        {/* Top navigation — offset below shimmer */}
        <BifrostTopNav
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          mobileMenuOpen={mobileMenuOpen}
        />

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          )}
        </AnimatePresence>

        {/* Main content — centered with max width, same as Modern */}
        <main className="pt-[67px]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>

        {/* Mímir floating assistant widget */}
        <MimirWidget />
      </div>
    </MimirProvider>
  );
}
