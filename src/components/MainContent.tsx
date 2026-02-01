"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useEffect, useState } from "react";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const marginLeft = isMobile ? 0 : isOpen ? 256 : 96;

  return (
    <main
      className="transition-all duration-300 px-3 sm:px-4 py-4 sm:py-6"
      style={{
        marginLeft: `${marginLeft}px`,
        paddingTop: "80px",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
