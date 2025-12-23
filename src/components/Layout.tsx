import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar - hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <Navbar />
      </div>
      
      {/* Mobile header - simple logo on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-center h-14 px-4">
          <span className="text-xl font-heading font-bold text-black">
            Sam<span className="text-cf-red">Fit</span>
          </span>
        </div>
      </div>
      
      <main className="flex-grow pt-14 md:pt-20 pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Footer - hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Bottom navigation - shown on mobile, hidden on desktop */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

