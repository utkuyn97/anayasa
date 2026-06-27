/**
 * ModuleShell — Wrapper layout for authenticated pages.
 * Provides Header + BottomNav + content area with proper spacing.
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import BottomNav from './BottomNav';
import MoreSheet from './MoreSheet';

export default function ModuleShell() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav onMoreClick={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}
