"use client";

import { usePathname } from "next/navigation";
import { HamburgerIcon } from "./Icons";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { toggleSidebar } = useSidebar();
  const { logout, admin } = useAuth();
  const pathname = usePathname();

  // Don't show logout button on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-700 shadow-lg z-40 h-16">
      <div className="px-3 sm:px-4 py-4 flex items-center justify-between h-full">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white transition-colors duration-150 rounded-lg hover:bg-slate-800/50"
            aria-label="Toggle sidebar"
          >
            <HamburgerIcon className="w-6 h-6" />
          </button>
          <img
            src="https://media.licdn.com/dms/image/v2/D560BAQE7UBwZTZV82A/company-logo_200_200/company-logo_200_200/0/1735480477565/technexuscommunity_logo?e=2147483647&v=beta&t=OHRrBHpQBysOzUSfADwgY38ndiVw5aS46w62ZuOXepk"
            alt="TechNexus Community Logo"
            className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover flex-shrink-0"
          />
          <h1 className="font-bold text-sm sm:text-base md:text-xl text-white truncate">
            TechNexus Community
          </h1>
        </div>

        {/* Admin Info and Logout */}
        <div className="flex items-center gap-4">
          {admin && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-slate-300">{admin.full_name}</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {admin.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors duration-150"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
