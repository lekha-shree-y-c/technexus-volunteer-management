'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function AuthLoadingScreen({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const pathname = usePathname();

  // Don't show loading screen on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Loading Content */}
        <div className="relative text-center">
          <div className="inline-flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="w-16 h-16 border-4 border-slate-600/30 border-t-blue-500 rounded-full animate-spin"></div>
            
            {/* Loading Text */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-1">
                Loading Dashboard
              </h2>
              <p className="text-slate-400 text-sm">
                Please wait while we verify your session...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
