"use client";

import { usePathname } from "next/navigation";
import { HamburgerIcon } from "./Icons";
import { useSidebar } from "@/context/SidebarContext";

export default function Navbar() {
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-700 shadow-lg z-40 h-16">
      <div className="px-3 sm:px-4 py-4 flex items-center space-x-2 sm:space-x-4 h-full">
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
    </nav>
  );
}
